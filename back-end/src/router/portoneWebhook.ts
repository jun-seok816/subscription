import express from "express";
import bodyParser from "body-parser";
import { Webhook, PaymentClient } from "@portone/server-sdk";
import { RowDataPacket } from "mysql2";
import { PoolConnection } from "mysql2/promise";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { PlanName, PLAN_ITEMS, SubscriptionRow } from "../all_Types";
import { computeNextAt, formatDateTime } from "../all_Store";

const router = express.Router();
router.use("/portone", bodyParser.text({ type: "application/json" }));

router.post("/portone", async (req, res) => {
  try {
    const evt = await Webhook.verify(
      process.env.PORTONE_WEBHOOK_SECRET!,
      req.body,
      req.headers
    );

    // 미지원/알 수 없는 스키마면 무시
    if (Webhook.isUnrecognizedWebhook(evt)) return void res.sendStatus(200);

    if (
      evt.type === "Transaction.Paid" ||
      evt.type === "Transaction.Failed" ||
      evt.type === "Transaction.PayPending"
    ) {
      const { paymentId } = evt.data;

      // 권장: 결제단건 재조회로 최종확인
      const payment = await PaymentClient({
        secret: process.env.PORTONE_API_SECRET!,
      }).getPayment({ paymentId });

      const conn = await process._myApp.db.promise().getConnection();
      try {
        await conn.beginTransaction();

        if (payment.status === "PAID") {
          await commitCycleAndGrantTokens(conn, paymentId);
        } else {
          // FAILED / CANCELLED / 기타
          await onScheduleFailed(conn, paymentId);
        }

        await conn.commit();
        return void res.sendStatus(200);
      } catch (e) {
        await conn.rollback();
        console.error(e);
        return void res.sendStatus(500);
      } finally {
        conn.release();
      }
    }

    // 그 외 이벤트는 사용 안 함
    return void res.sendStatus(200);
  } catch (e) {
    // 서명 검증 실패 등
    if (e instanceof Webhook.WebhookVerificationError) {
      return void res.sendStatus(400);
    }
    console.error(e);
    return void res.sendStatus(500);
  }
});

export async function onScheduleFailed(
  conn: PoolConnection,
  paymentId: string,
) {
  // 1) 스케줄 조회(+잠금) → 금액/상품명/구독ID 확보
  const [sRows] = await conn.query<RowDataPacket[]>(
    `SELECT subscription_id, amount_krw, product_name, status
       FROM subscription_schedules
      WHERE payment_id = ?
      FOR UPDATE`,
    [paymentId]
  );
  if (sRows.length === 0) {
    // 알 수 없는 paymentId면 그냥 종료(로그만)
    return;
  }
  const sch = sRows[0] as {
    subscription_id: number;
    amount_krw: number;
    product_name: string;
    status: "SCHEDULED" | "EXECUTED" | "CANCELLED";
  };

  // 2) 구독 → user_id 확보
  const [subRows] = await conn.query<RowDataPacket[]>(
    `SELECT id, user_id FROM subscriptions WHERE id = ?`,
    [sch.subscription_id]
  );

  const { id: subscriptionId, user_id: userId } = subRows[0] as {
    id: number;
    user_id: number;
  };

  // 3) 스케줄 상태 업데이트(멱등)
  if (sch.status === "SCHEDULED") {
    await conn.query(
      `UPDATE subscription_schedules
          SET status='CANCELLED', cancelled_at=NOW()
        WHERE payment_id=? AND status='SCHEDULED'`,
      [paymentId]
    );
  }

  // 4) payments 실패 기록(멱등: payment_id UNIQUE)  
  const paidAt = formatDateTime(new Date());
  const orderName = "정기결제(실패)";
  await conn.query(
    `INSERT INTO payments
       (user_id, subscription_id, payment_id, portone_tx_id, order_name,
        amount_krw, currency, is_success, paid_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'KRW', 0, ?, NOW())`,
    [
      userId,
      subscriptionId,
      paymentId,
      null,
      orderName,
      sch.amount_krw,
      paidAt,
    ]
  );  
}

export async function commitCycleAndGrantTokens(
  conn: PoolConnection,
  paymentId: string
) {
  // 0) paymentId -> subscription_id
  const [subID] = await conn.query<RowDataPacket[]>(
    `SELECT subscription_id
         FROM subscription_schedules
        WHERE payment_id = ?`,
    [paymentId]
  );
  if (subID.length === 0) throw new Error("SUB_SCHEDULE_NOT_FOUND");

  const subscriptionId = Number(subID[0].subscription_id);

  // 1) 구독 잠금
  const [rows] = await conn.query<RowDataPacket[]>(
    `SELECT id, user_id, plan_name, billing_cycle, current_period_end,
              pending_plan_name, pending_billing_cycle, cancel_at_period_end
         FROM subscriptions
        WHERE id = ?
        FOR UPDATE`,
    [subscriptionId]
  );
  if (rows.length === 0) throw new Error("SUB_NOT_FOUND");

  const sub = rows[0] as SubscriptionRow;

  // 2) 다음 플랜/주기 결정
  const nextPlan: PlanName = (sub.pending_plan_name ??
    sub.plan_name) as PlanName;
  const nextCycle: "MONTHLY" | "YEARLY" = (sub.pending_billing_cycle ??
    sub.billing_cycle) as "MONTHLY" | "YEARLY";
  const { price, token_grant: grant } = PLAN_ITEMS[nextPlan];

  // 3) FREE 또는 해지예약 → 무료 전환, 스케줄 생성 안 함
  if (sub.cancel_at_period_end === 1 || nextPlan === "FREE") {
    await conn.query(
      `UPDATE subscriptions
            SET plan_name             = 'FREE',
                billing_cycle         = 'MONTHLY',
                price_cents           = 0,
                token_grant           = 0,
                pending_plan_name     = NULL,
                pending_billing_cycle = NULL,
                cancel_at_period_end  = 0,
                current_period_end    = NULL,
                updated_at            = NOW()
          WHERE id = ?`,
      [sub.id]
    );
    return; // 끝
  }

  // 4) 구독 롤오버 + pending 해제
  await conn.query(
    `UPDATE subscriptions
          SET plan_name             = ?,
              billing_cycle         = ?,
              price_cents           = ?,
              token_grant           = ?,
              current_period_end    = CASE
                                         WHEN ? = 'MONTHLY'
                                           THEN DATE_ADD(IFNULL(current_period_end, NOW()), INTERVAL 1 MONTH)
                                         ELSE DATE_ADD(IFNULL(current_period_end, NOW()), INTERVAL 1 YEAR)
                                       END,
              pending_plan_name     = NULL,
              pending_billing_cycle = NULL,
              updated_at            = NOW()
        WHERE id = ?`,
    [nextPlan, nextCycle, price, grant, nextCycle, sub.id]
  );

  // 5) 토큰 지급
  if (grant > 0) {
    await conn.query(
      `UPDATE users SET token_balance = token_balance + ? WHERE id = ?`,
      [grant, sub.user_id]
    );
  }

  // === 여기부터: 다음 스케줄 생성 ===

  // 6) 갱신된 current_period_end 가져오기 (DB 계산 값 그대로 사용)
  const [after] = await conn.query<RowDataPacket[]>(
    `SELECT current_period_end FROM subscriptions WHERE id = ?`,
    [sub.id]
  );
  const nextEnd: Date | null = after[0]?.current_period_end ?? null;

  // 가격 0원이면 스케줄 안 만든다
  if (price <= 0 || !nextEnd) return;

  // 7) 사용자 빌링키 상태 확인
  const [uRows] = await conn.query<RowDataPacket[]>(
    `SELECT portone_customer_id, billing_key_status, portone_billing_key
         FROM users
        WHERE id = ?`,
    [sub.user_id]
  );
  if (uRows.length === 0) return;
  const user = uRows[0] as {
    portone_customer_id: string | null;
    billing_key_status: "ACTIVE" | "INACTIVE" | "REVOKED";
    portone_billing_key: string | null;
  };
  if (
    !user.portone_customer_id ||
    user.billing_key_status !== "ACTIVE" ||
    !user.portone_billing_key
  ) {
    // 빌링키 없거나 비활성 → 스케줄 생성 스킵
    return;
  }

  // 8) 이미 SCHEDULED 존재하면 중복 생성 방지 (한 건만 유지)
  const [exists] = await conn.query<RowDataPacket[]>(
    `SELECT 1 FROM subscription_schedules
        WHERE subscription_id = ? AND status = 'SCHEDULED'
        LIMIT 1`,
    [subscriptionId]
  );
  const [sc_rows] = await conn.query<any[]>(
    `SELECT * FROM subscription_schedules WHERE subscription_id = ?`,
    [subscriptionId]
  );
  if (exists.length > 0) return;

  // 9) PortOne 스케줄 생성
  const PAYMENT_ID_NEXT = encodeURIComponent(`order_${uuidv4()}`);
  const url = `https://api.portone.io/payments/${PAYMENT_ID_NEXT}/schedule`;
  const headers = {
    Authorization: `PortOne ${process.env.PORTONE_API_SECRET}`,
    "Content-Type": "application/json",
  };

  // PortOne는 RFC3339(ISO8601) 기대. DB에는 MySQL DATETIME으로 별도 저장.
  const TIME_TO_PAY = computeNextAt(
    sub.current_period_end ? new Date(sub.current_period_end) : null
  );

  const body = {
    payment: {
      billingKey: user.portone_billing_key,
      orderName: `정기결제 ${sc_rows.length + 1}회차`,
      amount: { total: price }, // cents가 아니라 KRW 정수라면 price 바로 사용(당신 스키마가 price_cents면 값 맞춰서)
      currency: "KRW",
    },
    timeToPay: TIME_TO_PAY,
  };

  const { data: schRes } = await axios.post(url, body, { headers });
  // 10) 스케줄 기록 저장
  await conn.query(
    `INSERT INTO subscription_schedules
         (payment_id, subscription_id, schedule_at, amount_krw, status, product_name)
       VALUES (?, ?, ?, ?, 'SCHEDULED', ?)
       ON DUPLICATE KEY UPDATE
         schedule_at = VALUES(schedule_at),
         amount_krw  = VALUES(amount_krw),
         product_name= VALUES(product_name)`,
    [PAYMENT_ID_NEXT, subscriptionId, formatDateTime(nextEnd), price, nextPlan]
  );
}
export default router;
