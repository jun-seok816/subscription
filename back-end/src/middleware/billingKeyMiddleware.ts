import { Request, Response, NextFunction } from "express";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { PlanName, PLAN_ITEMS } from "../all_Types";

type PlanChangeType = "UPGRADE" | "DOWNGRADE" | "SAME";

/**결제 AND 기록 */
export async function payNowAndRecord(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const flags: PlanChangeType | undefined = res.locals.planChange;
    const newPlan: PlanName | undefined = res.locals.newPlan;
    const newPlanPrice: number | undefined = res.locals.newPlanPrice;
    const newPlanGrant: number | undefined = res.locals.newPlanGrant;
    if (!flags) return next(new Error("planChange 플래그 누락"));
    if (flags === "UPGRADE" && !newPlan) {
      return next(new Error("신규 플랜 정보 누락"));
    }
    if (flags === "DOWNGRADE") {
      next();
      return;
    }

    const subscriptionId: number | null =
      Number(res.locals.subscription?.id) || null;
    if (!subscriptionId) return next(new Error("subscriptionId 필요"));

    const billingKey: string = res.locals.user?.portone_billing_key;

    const amount =
      flags === "UPGRADE"
        ? newPlanPrice ?? (newPlan ? PLAN_ITEMS[newPlan].price : null)
        : Number(res.locals.subscription?.price_cents);
    const currency = "KRW".toUpperCase();
    const orderName =
      `${res.locals.subscription_schedules.length + 1} 회차 결제` || "즉시결제";

    if (!billingKey) throw new Error("billingKey 필요");
    if (!Number.isFinite(amount) || amount === null|| amount <= 0)
      throw new Error("amount(결제 금액) 필요");

    const paymentId = encodeURIComponent(`pay_${uuidv4()}`);

    // PortOne 결제 요청
    const url = `https://api.portone.io/payments/${paymentId}/billing-key`;
    const headers = {
      Authorization: `PortOne ${process.env.PORTONE_API_SECRET}`,
      "Content-Type": "application/json",
    };
    const payload = {
      billingKey,
      orderName,
      amount: { total: amount },
      currency,
    };

    const { data, status } = await axios.post(url, payload, { headers });

    // PortOne 응답에서 식별자/영수증 URL 추출(필드명 변동 대비 안전하게)
    const portoneTxId = data.payment.pgTxId;

    // user_id 확보
    let userId: number | null =
      Number(res.locals.subscription?.user_id) || null;

    if (status < 200 || status >= 300) {
      // 실패 결제 히스토리 저장 (idempotent)
      await process._myApp.db.promise().query(
        `INSERT INTO payments
           (user_id, subscription_id, payment_id, is_success, order_name, amount_krw, currency,  paid_at, created_at)
         VALUES
           (?,       ?,               ?,          ?,             ?,          ?,          ?,         NOW(),  NOW())`,
           [userId,  subscriptionId,  paymentId,   0,            orderName,  amount,     currency]
      );
      throw new Error(`PortOne 결제 실패 status=${status}`);
    }

    if (!userId && subscriptionId) {
      const [[row]]: any = await process._myApp.db
        .promise()
        .query(`SELECT user_id FROM subscriptions WHERE id = ? LIMIT 1`, [
          subscriptionId,
        ]);
      userId = row?.user_id ? Number(row.user_id) : null;
    }
    if (!userId) throw new Error("user_id 확인 실패");

    // 성공 결제 기록 및 구독 업그레이드 적용을 같은 트랜잭션에서 처리
    const conn = await process._myApp.db.promise().getConnection();
    try {
      await conn.beginTransaction();

      await conn.query(
        `INSERT INTO payments
             (user_id, subscription_id, payment_id, portone_tx_id, order_name, amount_krw, currency,  paid_at, created_at)
           VALUES
             (?,       ?,               ?,          ?,             ?,          ?,          ?,         NOW(),  NOW())
           ON DUPLICATE KEY UPDATE
             portone_tx_id = VALUES(portone_tx_id)`,
        [
          userId,
          subscriptionId,
          paymentId,
          portoneTxId,
          orderName,
          amount,
          currency,
        ]
      );

      if (flags === "UPGRADE") {
        const targetPlan = newPlan as PlanName;
        const price = newPlanPrice ?? PLAN_ITEMS[targetPlan].price;
        const grant = newPlanGrant ?? PLAN_ITEMS[targetPlan].token_grant;

        await conn.query(
          `UPDATE subscriptions
              SET plan_name         = ?,
                  billing_cycle     = 'MONTHLY',
                  price_cents       = ?,
                  token_grant       = ?,
                  current_period_end = DATE_ADD(NOW(), INTERVAL 1 MONTH),
                  pending_plan_name     = NULL,
                  pending_billing_cycle = NULL,
                  cancel_at_period_end  = 0,
                  updated_at            = NOW()
            WHERE id = ?`,
          [targetPlan, price, grant, subscriptionId]
        );

        if (grant > 0) {
          await conn.query(
            `UPDATE users SET token_balance = token_balance + ? WHERE id = ?`,
            [grant, userId]
          );
        }

        // 최신 상태를 다음 미들웨어에서 쓰도록 로드
        const [[updatedSub]]: any = await conn.query(
          `SELECT * FROM subscriptions WHERE id = ? LIMIT 1`,
          [subscriptionId]
        );
        const [[updatedUser]]: any = await conn.query(
          `SELECT * FROM users WHERE id = ? LIMIT 1`,
          [userId]
        );
        res.locals.subscription = updatedSub;
        res.locals.user = updatedUser;
      }

      await conn.commit();
    } catch (dbErr) {
      await conn.rollback();
      throw dbErr;
    } finally {
      conn.release();
    }

    // 다음 미들웨어에서 쓰도록 결과 공유
    res.locals.payment = {
      paymentId,
      portoneTxId,
      amount,
      currency,
      userId,
      subscriptionId,
    };

    next();
  } catch (err) {
    next(err);
  }
}

/** 빌링키 등록(생성) */
export async function createBillingKey(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { billingKey, userEmail, customerId } = req.body;

  if (!billingKey || !userEmail) {
    res
      .status(400)
      .json({ err: true, msg: "billingKey와 userEmail이 필요합니다." });
    return;
  }
  const conn = await process._myApp.db.promise().getConnection();
  try {
    const response = await axios.get(
      `https://api.portone.io/billing-keys/${encodeURIComponent(billingKey)}`,
      {
        headers: { Authorization: `PortOne ${process.env.PORTONE_API_SECRET}` },
        timeout: 8000,
      }
    );

    const info = response.data; // 상태/수단 정보 등
    if (info.status !== "ISSUED") {
      res.status(400).json({
        err: true,
        msg: "빌링키가 유효하지 않거나 삭제된 상태입니다.",
        data: info,
      });
      return;
    }

    const parsed = parseBillingKeyInfo(info);

    // 2) DB 업데이트 (users.email 기준)

    await conn.beginTransaction();

    const [rows] = await conn.execute<any[]>(
      `SELECT id, portone_customer_id
           FROM subscription.users
          WHERE id = ? FOR UPDATE`,
      [req.session.userId]
    );
    if (rows.length === 0) {
      throw new Error("user not found");
    }
    const user = rows[0];

    const resolvedCustomerId =
      user.portone_customer_id ?? customerId ?? parsed.customerId ?? null;

    await conn.execute(
      `UPDATE subscription.users
            SET portone_customer_id = COALESCE(?, portone_customer_id),
                portone_billing_key = ?,
                billing_key_status = 'ACTIVE',
                card_brand = ?,
                card_last4 = ?,
                easy_pay_provider = ?,
                billing_key_created_at = IFNULL(billing_key_created_at, NOW()),
                billing_key_updated_at = NOW()
          WHERE id = ?`,
      [
        resolvedCustomerId,
        parsed.billingKey, 
        parsed.cardBrand,
        parsed.cardLast4,
        parsed.easyPayProvider ?? parsed.provider ?? null,
        user.id,
      ]
    );

    await conn.commit();
    
    res.locals.billingCreate = {
      userId: user.id,
      billingKey: parsed.billingKey,
      customerId: resolvedCustomerId,
      cardBrand: parsed.cardBrand,
      cardLast4: parsed.cardLast4,
      provider: parsed.provider,
    };
    return next();
  } catch (error: any) {
    conn.rollback();
    return next(error);
  } finally {
    conn.release();
  }
}

/** 빌링키 삭제 */
export async function deleteBillingKey(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const conn = await process._myApp.db.promise().getConnection();
  try {
    await conn.beginTransaction();

    // 현재 로그인 사용자의 빌링키 조회 (행 잠금)
    const [rows] = await conn.execute<any[]>(
      `SELECT id, portone_billing_key
             FROM subscription.users
            WHERE id = ? FOR UPDATE`,
      [req.session.userId]
    );

    if (rows.length === 0) {
      throw new Error("user not found");
    }
    const { id: userId, portone_billing_key: billingKey } = rows[0];

    if (!billingKey) {
      await conn.rollback();
      res.status(400).json({
        err: true,
        msg: "삭제할 빌링키가 없습니다.",
      });
      return;
    }

    // 1) 포트원 측 빌링키 삭제 
    try {
      await axios.delete(
        `https://api.portone.io/billing-keys/${encodeURIComponent(billingKey)}`,
        {
          headers: {
            Authorization: `PortOne ${process.env.PORTONE_API_SECRET}`,
          },
          timeout: 8000,
        }
      );
    } catch (e: any) {
      const status = e.response?.status;
      if (status !== 404) {
        console.error("PortOne delete failed:", e.response?.data || e.message);
        await conn.rollback();
        res.status(502).json({
          err: true,
          msg: "포트원 빌링키 삭제에 실패했습니다.",
          data: e.response?.data ?? null,
        });
        return;
      }      
    }

    // 2) 로컬 DB 정리 
    await conn.execute(
      `UPDATE subscription.users
              SET portone_billing_key   = NULL,
                  billing_key_status    = 'REVOKED',
                  card_brand            = NULL,
                  card_last4            = NULL,
                  easy_pay_provider     = NULL,
                  billing_key_updated_at= NOW()
            WHERE id = ?`,
      [userId]
    );

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
      [userId]
    );

    await conn.commit();
    res.locals.billingDelete = {
      userId,
      billingKey: billingKey,
    };
    // 3) 성공 응답
    return next();
  } catch (error: any) {
    conn.rollback();
    return next(error);
  } finally {
    conn.release();
  }
}

type BillingKeyResponse = {
  status: string;
  billingKey: string;
  customer?: { id?: string; email?: string };
  methods?: Array<{
    type?: string;
    method?: { type?: string; card?: any; easyPay?: any };
  }>;
  channels?: Array<{ pgProvider?: string; name?: string }>;
};

function parseBillingKeyInfo(info: BillingKeyResponse) {
  const methodEntry = info.methods?.[0];
  const inner = methodEntry?.method;
  const methodType = inner?.type ?? methodEntry?.type ?? null;

  const isEasyPay = methodType?.toUpperCase().includes("EASYPAY") ?? false;
  const isCard = methodType?.toUpperCase().includes("CARD") ?? false;

  const provider =
    info.channels?.[0]?.pgProvider ?? info.channels?.[0]?.name ?? null;

  const cardBrand = isCard
    ? inner?.card?.brand ||
      inner?.card?.issuer ||
      inner?.card?.publisher ||
      null
    : null;
  const cardLast4 = isCard
    ? typeof inner?.card?.number === "string"
      ? inner!.card!.number.slice(-4)
      : inner?.card?.maskedNumber
      ? inner.card.maskedNumber.slice(-4)
      : null
    : null;
  
  const easyPayProvider = isEasyPay
    ? inner?.easyPay?.provider ?? provider ?? null
    : null;

  return {
    status: info.status,
    billingKey: info.billingKey,
    customerId: info.customer?.id ?? null,
    provider, // 예: 'KAKAOPAY'
    methodType,
    cardBrand,
    cardLast4,
    easyPayProvider, // 예: 'KAKAOPAY'
  };
}
