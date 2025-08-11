import axios from "axios";
import express, { Request, Response } from "express";
import dotenv from "dotenv";
const router = express.Router();

const CHANNEL_KEY_SECRET = process.env.CHANNEL_KEY; // .env 파일에 SECRET_CHANNEL_KEY 값 설정
dotenv.config();

router.post("/complete", async (req, res) => {
  const { paymentId } = req.body;
  if (!paymentId) {
    res.status(400).json({ err: true, msg: "paymentId가 필요합니다." });
    return;
  }

  try {
    // PortOne 결제검증 API 호출
    const response = await axios.get(
      `https://api.portone.io/v2/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${CHANNEL_KEY_SECRET}`,
        },
      }
    );

    const data = response.data;
    if (data.status === "paid") {
      // TODO: 결제 내역 DB 저장 및 후속 처리
      res.json({ err: false, data });
      return;
    }

    res.json({
      err: true,
      msg: "결제가 완료되지 않은 상태입니다.",
      data,
    });
  } catch (error: any) {
    console.error("결제 검증 에러:", error.response?.data || error.message);
    res
      .status(500)
      .json({ err: true, msg: "결제 검증 중 오류가 발생했습니다." });
    return;
  }
});

router.post("/billing", process._myApp.checkSession, async (req, res) => {
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
        headers: { Authorization: `PortOne ${process.env.CHANNEL_KEY}` },
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
    res.json({
      err: false,
      msg: "빌링키 등록이 완료되었습니다.",
      data: {
        status: parsed.status, // 'ISSUED'
        provider: parsed.provider, // 예: 'KAKAOPAY'
        methodType: parsed.methodType, 
        cardBrand: parsed.cardBrand, // 카드형일 때만 값
        cardLast4: parsed.cardLast4, // 카드형일 때만 값
      },
    });
  } catch (error: any) {
    console.error(
      "빌링키 검증/저장 에러:",
      error.response?.data || error.message
    );
    res
      .status(500)
      .json({ err: true, msg: "빌링키 처리 중 오류가 발생했습니다." });
  } finally {
    conn.release();
  }
});

router.delete(
  '/billing',
  process._myApp.checkSession,
  async (req, res) => {
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
        throw new Error('user not found');
      }
      const { id: userId, portone_billing_key: billingKey } = rows[0];

      if (!billingKey) {
        await conn.rollback();
        res.status(400).json({
          err: true,
          msg: '삭제할 빌링키가 없습니다.',
        });
        return;
      }

      // 1) 포트원 측 빌링키 삭제 (idempotent 처리: 404면 이미 삭제된 것으로 간주)
      try {
        await axios.delete(
          `https://api.portone.io/billing-keys/${encodeURIComponent(billingKey)}`,
          {
            headers: { Authorization: `PortOne ${process.env.CHANNEL_KEY}` },
            timeout: 8000,
          }
        );
      } catch (e: any) {
        const status = e.response?.status;
        if (status !== 404) {
          console.error('PortOne delete failed:', e.response?.data || e.message);
          await conn.rollback();
          res.status(502).json({
            err: true,
            msg: '포트원 빌링키 삭제에 실패했습니다.',
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
                billing_key_updated_at= NOW(),
                current_period_end   = NULL ,
                cancel_at_period_end = 0, 
                pending_billing_cycle= NULL,
                pending_plan_name    = NULL,
                token_grant          = 0,
                price_cents          = 0,
                billing_cycle        = 'MONTHLY',
                plan_name            = 'FREE'
          WHERE id = ?`,
        [userId]
      );

      await conn.commit();

      // 3) 성공 응답
      res.json({
        err: false,
        msg: '빌링키 삭제(결제정보 초기화)가 완료되었습니다.',
        data: {
          status: 'REVOKED',
        },
      });
    } catch (error: any) {
      console.error('빌링키 삭제 에러:', error.response?.data || error.message);
      try { await conn.rollback(); } catch {}
      res.status(500).json({
        err: true,
        msg: '빌링키 삭제 중 오류가 발생했습니다.',
      });
    } finally {
      conn.release();
    }
  }
);

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

export default router;
