import { Request, Response, NextFunction } from "express";
import axios from "axios";

export async function cancelPortoneSchedules(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const subscriptionId = Number(res.locals.subscription?.id);
    const BILLING_KEY =
      res.locals?.user?.portone_billing_key;

    if (!subscriptionId) throw new Error("subscriptionId 필요");
    if (!BILLING_KEY) throw new Error("billingKey 필요");

    // DB 상태 취소로 마킹
    await process._myApp.db.promise().query(
      `UPDATE subscription_schedules
           SET status = 'CANCELLED'
         WHERE subscription_id = ?`,
      [subscriptionId]
    );

    // PortOne 예약 일괄 취소
    const headers = {
      Authorization: `PortOne ${process.env.PORTONE_API_SECRET}`,
      "Content-Type": "application/json",
    };
    await axios.delete("https://api.portone.io/payment-schedules", {
      headers,
      data: { billingKey: BILLING_KEY },
    });

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

    // 우선순위: 기존 DB값 > req.body.customerId > PortOne 응답 customer.id
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
        parsed.billingKey, // <- 그대로 저장(로그/응답에는 노출 금지 권장)
        parsed.cardBrand,
        parsed.cardLast4,
        parsed.easyPayProvider ?? parsed.provider ?? null,
        user.id,
      ]
    );

    await conn.commit();

    // 3) 성공 응답 (민감정보 최소화)
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

    // 1) 포트원 측 빌링키 삭제 (idempotent 처리: 404면 이미 삭제된 것으로 간주)
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
      // 404: 이미 삭제된 상태 → 로컬만 정리 계속 진행
    }

    // 2) 로컬 DB 정리 (결제정보 초기화 + 상태 REVOKED)
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

  // 있을 때만 카드 정보
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

  // 있을 때만 간편결제 제공사
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
