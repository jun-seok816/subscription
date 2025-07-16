import { RequestHandler, ErrorRequestHandler } from 'express';
import { Pool } from 'mysql2/promise';
import { RowDataPacket } from 'mysql2';        // RowDataPacket 타입 추가
import { verifyWebhookSignature } from '../utils/iamportUtil';
import { SubscriptionRow } from '../all_Types';

// ---------------------------------------------------------------------------
// 1) withDb  ─ 모든 요청에 DB 풀 주입
// ---------------------------------------------------------------------------
export const withDb = (pool: Pool): RequestHandler => {
  return (req, res, next) => {
    res.locals.db = pool;               // 이후 미들웨어에서 res.locals.db 로 접근
    next();
  };
};

// ---------------------------------------------------------------------------
// 2) authenticate  ─ 세션 또는 JWT 에서 userId 주입
//    데모에서는 req.header('x-demo-user') 로 간소화 가능
// ---------------------------------------------------------------------------
export const authenticate: RequestHandler = (req, res, next) => {
  const id = Number(req.header('x-demo-user'));
  if (!id) {
    res.status(401).json({ message: '로그인이 필요합니다.' });
    return;
  }
  res.locals.userId = id;
  next();
};

// ---------------------------------------------------------------------------
// 3) loadSubscription  ─ 현재 구독 정보 로드 & res.locals 에 저장
//     SubscriptionRow 를 RowDataPacket 과 교차 타입으로 사용하여 제네릭 제약 해결
// ---------------------------------------------------------------------------
export const loadSubscription: RequestHandler = async (req, res, next) => {
  const { userId } = res.locals;
  try {
    const [rows] = await process._myApp.db.promise().query<(SubscriptionRow & RowDataPacket)[]>(
      'SELECT * FROM subscriptions WHERE user_id = ?',
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
// 4) validatePlanChange  ─ 플랜 변경 정책 검사(월 1회 제한, 업/다운 규칙 등)
// ---------------------------------------------------------------------------
export const validatePlanChange: RequestHandler = (req, res, next) => {
  const { subscription } = res.locals;
  const { plan_name, billing_cycle } = req.body;

  if (!plan_name) {
    res.status(400).json({ message: 'plan_name 파라미터가 필요합니다.' });
    return;
  }

  // 월 1회 변경 제한 예시
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  if (subscription && subscription.updated_at > oneMonthAgo) {
    res.status(400).json({ message: '플랜 변경은 월 1회만 가능합니다.' });
    return;
  }

  // 업그레이드 / 다운그레이드 정책 간단 예시 (가격 비교)
  res.locals.planChange = { plan_name, billing_cycle };
  next();
};

// ---------------------------------------------------------------------------
// 5) applyPlanChange  ─ 트랜잭션으로 구독 업데이트 & 토큰 증감
// ---------------------------------------------------------------------------
export const applyPlanChange: RequestHandler = async (req, res, next) => {
  const { userId, planChange, subscription } = res.locals;
  if (!planChange) {
    res.status(400).json({ message: '검증되지 않은 변경입니다.' });
    return;
  }

  const conn = await process._myApp.db.promise().getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(
      `UPDATE subscriptions
       SET plan_name = ?, billing_cycle = ?, updated_at = NOW()
       WHERE user_id = ?`,
      [planChange.plan_name, planChange.billing_cycle, userId]
    );

    // 업그레이드 즉시 토큰 지급 예시
    if (subscription) {
      const diffToken = (planChange.plan_name === 'PRO' ? 200 : 100) - subscription.token_grant;
      if (diffToken > 0) {
        await conn.query(
          'UPDATE users SET token_balance = token_balance + ? WHERE id = ?',
          [diffToken, userId]
        );
      }
    }

    await conn.commit();
    res.locals.result = { success: true };
    next();
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

// ---------------------------------------------------------------------------
// 6) verifyIamportWebhook  ─ 아임포트 Webhook 서명 검증 & 중복 처리 방지
// ---------------------------------------------------------------------------
export const verifyIamportWebhook: RequestHandler = (req, res, next) => {
  if (!verifyWebhookSignature(req)) {
    res.status(401).json({ message: '잘못된 Webhook 서명입니다.' });
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

// ---------------------------------------------------------------------------
// 8) errorHandler  ─ 공통 에러 처리 (마지막에 app.use 로 연결)
// ---------------------------------------------------------------------------
export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: '서버 오류', detail: err instanceof Error ? err.message : String(err) });
};
