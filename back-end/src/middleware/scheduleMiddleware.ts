import type { Request, Response, NextFunction, RequestHandler } from "express";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

// ---------------------- 설정 ----------------------
const PORTONE_API_SECRET = process.env.PORTONE_API_SECRET!; // imp_secret

// ---------------------- 공용 유틸 ----------------------
function formatDateTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function computeNextAt(currentPeriodEnd: Date | null): Date {
  if (currentPeriodEnd) return new Date(currentPeriodEnd);
  const d = new Date();
  d.setMinutes(d.getMinutes() + 1);
  return d;
}

// ---------------------- 미들웨어 본체 ----------------------
export const scheduleNext: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const subscriptionId = Number(res.locals.subscription.id);
    if (!subscriptionId) {
      res.status(400).json({ msg: "subscriptionId가 필요합니다." });
      return;
    }

    // 1) 구독 + 유저 조인 조회 (필수 컬럼만)
    const [rows] = await process._myApp.db.promise().query<any[]>(
      `SELECT s.id as sub_id, s.user_id, s.price_cents, s.current_period_end, s.plan_name,
                u.portone_customer_id, u.billing_key_status, u.portone_billing_key
           FROM subscriptions s
           JOIN users u ON u.id = s.user_id
          WHERE s.id = ?
          LIMIT 1`,
      [subscriptionId]
    );    

    const [sc_rows] = await process._myApp.db
      .promise()
      .query<any[]>(
        `SELECT * FROM subscription_schedules WHERE subscription_id = ?`,
        [subscriptionId]
      );
    if (!rows.length) {
      res.status(404).json({ msg: "구독을 찾을 수 없습니다." });
      return;
    }

    const sub = rows[0];
    if (!sub.portone_customer_id || sub.billing_key_status !== "ACTIVE") {
      res.status(409).json({ msg: "빌링키가 활성 상태가 아닙니다." });
      return;
    }

    if(sub.price_cents === 0){
      next();
      return
    }

    const headers = {
      Authorization: `PortOne ${PORTONE_API_SECRET}`,
      "Content-Type": "application/json",
    };

    const BILLING_KEY = sub.portone_billing_key;

    // 2) next schedule_at 계산 및 merchant_uid 생성
    const TIME_TO_PAY = computeNextAt(
      sub.current_period_end ? new Date(sub.current_period_end) : null
    );

    const PAYMENT_ID = encodeURIComponent(`order_${uuidv4()}`);
    

    const url = `https://api.portone.io/payments/${PAYMENT_ID}/schedule`;

    const body = {
      payment: {
        billingKey: BILLING_KEY,
        orderName: `정기결제 ${sc_rows.length + 1}회차`,
        amount: {
          total: sub.price_cents,
        },
        currency: "KRW",
      },
      timeToPay: TIME_TO_PAY,
    };

    const { data, status } = await axios.post(url, body, { headers });
    console.log("[OK]", status, data);

    // 5) DB에 스케줄 저장
    await process._myApp.db.promise().query(
      `INSERT INTO subscription_schedules (payment_id, subscription_id, schedule_at, amount_krw, status ,product_name)
         VALUES (?, ?, ?, ?, 'SCHEDULED',?)
         ON DUPLICATE KEY UPDATE schedule_at = VALUES(schedule_at), amount_krw = VALUES(amount_krw)`,
      [PAYMENT_ID, subscriptionId, formatDateTime(TIME_TO_PAY), sub.price_cents ,sub.plan_name]
    );

    next();
  } catch (err) {
    console.log("[scheduleNext] error:", err);
    next(err);
  }
};
