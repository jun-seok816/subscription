import { RequestHandler, ErrorRequestHandler } from "express";
import { RowDataPacket } from "mysql2"; // RowDataPacket 타입 추가
import { verifyWebhookSignature } from "../utils/iamportUtil";
import { PlanName, PLAN_ITEMS, PLAN_RANK, SubscriptionRow } from "../all_Types";

// ---------------------------------------------------------------------------
// loadSubscription  ─ 현재 구독 정보 로드 & res.locals 에 저장
//     SubscriptionRow 를 RowDataPacket 과 교차 타입으로 사용하여 제네릭 제약 해결
// ---------------------------------------------------------------------------
export const loadSubscription: RequestHandler = async (req, res, next) => {
  const userId = req.session.userId;

  try {
    const [rows] = await process._myApp.db
      .promise()
      .query<(SubscriptionRow & RowDataPacket)[]>(
        "SELECT * FROM subscriptions WHERE user_id = ?",
        [userId]
      );
    res.locals.subscription = rows[0] ?? null;
    next();
  } catch (err) {
    console.log(err);
    next(err);
  }
};

// ---------------------------------------------------------------------------
// validatePlanChange  ─ 플랜 변경 정책 검사(월 1회 제한, 업/다운 규칙 등)
// ---------------------------------------------------------------------------
export const validatePlanChange: RequestHandler = (req, res, next) => {
  const { subscription } = res.locals;
  const { plan_name, billing_cycle } = req.body;

  if (!plan_name) {
    res.status(400).json({ message: "plan_name 파라미터가 필요합니다." });
    return;
  }

  // 월 1회 변경 제한 예시
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  if (subscription && subscription.updated_at > oneMonthAgo) {
    res.status(400).json({ message: "플랜 변경은 월 1회만 가능합니다." });
    return;
  }

  // 업그레이드 / 다운그레이드 정책 간단 예시 (가격 비교)
  res.locals.planChange = { plan_name, billing_cycle };
  next();
};

// ---------------------------------------------------------------------------
// applyPlanChange  ─ 트랜잭션으로 구독 업데이트 & 토큰 증감
// ---------------------------------------------------------------------------
export const applyPlanChange: RequestHandler = async (req, res, next) => {
  const planIdx = Number(req.body.plan_name);
  const user_id = req.session.userId;

  // ─── 1) 파라미터·세션 유효성 ─────────────────────────
  if (Number.isNaN(planIdx) || !user_id) {
    res.status(400).json({ err: true, msg: "잘못된 요청입니다." });
    return;
  }

  const newPlan = Object.keys(PLAN_ITEMS)[planIdx] as PlanName;
  if (!newPlan) {
    res.status(400).json({ err: true, msg: "존재하지 않는 플랜입니다." });
    return;
  }

  const conn = await process._myApp.db.promise().getConnection();
  try {
    await conn.beginTransaction();

    // ─── 2) 현재 구독 행 잠금 조회 ─────────────────────
    const [[sub]] = await conn.query<RowDataPacket[]>(
      `SELECT plan_name, pending_plan_name
         FROM subscriptions
        WHERE user_id = ?
        FOR UPDATE`,
      [user_id]
    );

    if (!sub) {
      await conn.rollback();
      res.status(404).json({ err: true, msg: "구독 정보를 찾을 수 없습니다." });
      return;
    }

    // ─── 3) 이미 동일 플랜이면 충돌 ─────────────────────
    const isSameAsCurrent =
      sub.plan_name === newPlan &&
      (!sub.pending_plan_name || sub.pending_plan_name === newPlan);

    if (isSameAsCurrent) {
      await conn.rollback();
      res
        .status(409)
        .json({ err: true, msg: "이미 사용 중(예약)인 플랜입니다." });
      return;
    }

    const isUpgrade = PLAN_RANK[newPlan] > PLAN_RANK[sub.plan_name as PlanName];

    // ─── 4) 업그레이드 경로 ────────────────────────────
    if (isUpgrade) {
      await conn.query(
        `UPDATE subscriptions
            SET plan_name         = ?,
                billing_cycle     = 'MONTHLY',
                price_cents = ?,
                current_period_end = DATE_ADD(NOW(), INTERVAL 1 MONTH),
                pending_plan_name     = NULL,
                pending_billing_cycle = NULL,
                cancel_at_period_end  = 0,
                updated_at            = NOW()
          WHERE user_id = ?`,
        [newPlan, PLAN_ITEMS[newPlan].price, user_id]
      );

      // 즉시 토큰 지급 예시
      const addToken = PLAN_ITEMS[newPlan].token_grant;
      if (addToken > 0) {
        await conn.query(
          `UPDATE users SET token_balance = token_balance + ? WHERE id = ?`,
          [addToken, user_id]
        );
      }
    }
    // ─── 5) 다운그레이드(예약) 경로 ────────────────────
    else {
      if (sub.pending_plan_name === newPlan) {
        await conn.rollback();
        res.status(409).json({
          err: true,
          msg: "이미 다음 주기에 동일 플랜이 예약되어 있습니다.",
        });
        return;
      }

      await conn.query(
        `UPDATE subscriptions
            SET pending_plan_name     = ?,
                price_cents = ?,
                pending_billing_cycle = 'MONTHLY',
                cancel_at_period_end  = 0,
                updated_at            = NOW()
          WHERE user_id = ?`,
        [newPlan, PLAN_ITEMS[newPlan].price, user_id]
      );
    }

    await conn.commit();
    next();
  } catch (err) {
    await conn.rollback();
    console.log(err);
    next(err);
  } finally {
    conn.release();
  }
};

// ▸ 다음 주기로 이동 미들웨어 ---------------------------------------------
export const rollToNextPeriod: RequestHandler = async (req, res, next) => {
  const user_id = req.session.userId;
  if (!user_id) {
    res.status(401).json({ err: true, msg: "로그인이 필요합니다." });
    return;
  }

  const conn = await process._myApp.db.promise().getConnection();
  try {
    await conn.beginTransaction();

    // 1) 현재 구독 행 잠금
    const [[sub]] = await conn.query<RowDataPacket[]>(
      `SELECT *
         FROM subscriptions
        WHERE user_id = ?
        FOR UPDATE`,
      [user_id]
    );

    if (!sub) {
      await conn.rollback();
      res.status(404).json({ err: true, msg: "구독 정보를 찾을 수 없습니다." });
      return;
    }

    // 2) 아직 기간이 끝나지 않았는데 force 옵션이 없으면 막기
    if (sub.current_period_end > new Date() && !req.body.force) {
      await conn.rollback();
      res.status(400).json({
        err: true,
        msg: "아직 구독 기간이 끝나지 않았습니다.",
      });
      return;
    }

    /* ────────────────────────────────────────────────────────────── */
    const nextPlan: PlanName = sub.pending_plan_name || sub.plan_name;
    /* 3) 해지 예약인 경우 → 행 FREE 전환 */
    if (sub.cancel_at_period_end || nextPlan === "FREE") {
      await conn.query(
        `UPDATE subscriptions
            SET plan_name            = 'FREE',
                billing_cycle        = 'MONTHLY',      
                price_cents          = 0,
                token_grant          = 0,
                pending_plan_name    = NULL,
                pending_billing_cycle= NULL,
                cancel_at_period_end = 0,              -- 플래그 해제
                current_period_end   = NULL            -- 무료라서 기간 무의미
          WHERE user_id = ?`,
        [user_id]
      );

      await conn.commit();
      next();
      return;
    }

    /* 4) 다음 주기 플랜·주기 결정 */

    const nextCycle: "MONTHLY" | "YEARLY" =
      sub.pending_billing_cycle || sub.billing_cycle;

    const price = PLAN_ITEMS[nextPlan].price;
    const grant = PLAN_ITEMS[nextPlan].token_grant;

    /* 5) 롤오버 + 예약 해제 */
    await conn.query(
      `UPDATE subscriptions
      SET
        plan_name            = ?,     
        billing_cycle        = ?,     
        price_cents          = ?,     
        token_grant          = ?,     
        current_period_end   = CASE
                                 WHEN ? = 'MONTHLY'            
                                 THEN DATE_ADD(current_period_end, INTERVAL 1 MONTH)
                                 ELSE DATE_ADD(current_period_end, INTERVAL 1 YEAR)
                               END,
        pending_plan_name    = NULL,
        pending_billing_cycle= NULL,
        updated_at           = NOW()
      WHERE user_id = ?`,
      [nextPlan, nextCycle, price, grant, nextCycle, user_id]
    );

    /* 6) 주기당 토큰 지급 */
    if (grant > 0) {
      await conn.query(
        `UPDATE users SET token_balance = token_balance + ? WHERE id = ?`,
        [grant, user_id]
      );
    }

    await conn.commit();
    next();
  } catch (err) {
    await conn.rollback();
    next(err); // 전역 핸들러가 { err:true, msg } 포맷으로 변환
  } finally {
    conn.release();
  }
};

// ---------------------------------------------------------------------------
// 6) verifyIamportWebhook  ─ 아임포트 Webhook 서명 검증 & 중복 처리 방지
// ---------------------------------------------------------------------------
export const verifyIamportWebhook: RequestHandler = (req, res, next) => {
  if (!verifyWebhookSignature(req)) {
    res.status(401).json({ err: true, msg: "잘못된 Webhook 서명입니다." });
    return;
  }
  next();
};

// ---------------------------------------------------------------------------
// 7) grantTokensOnRenewal  ─ (Cron 또는 수동 호출) 구독 갱신 시 토큰 지급
// ---------------------------------------------------------------------------
export const grantTokensOnRenewal: RequestHandler = async (req, res, next) => {
  try {
    await process._myApp.db.promise().query(
      `UPDATE users u
       JOIN subscriptions s ON u.id = s.user_id
       SET u.token_balance = u.token_balance + s.token_grant,
           s.current_period_end = DATE_ADD(s.current_period_end, INTERVAL 1 MONTH)
       WHERE s.current_period_end <= NOW()`
    );
    res.locals.result = { renewed: true };
    next();
  } catch (err) {
    next(err);
  }
};
