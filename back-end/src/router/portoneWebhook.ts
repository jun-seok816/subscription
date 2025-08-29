import express from "express";
import bodyParser from "body-parser";
import { Webhook, PaymentClient } from "@portone/server-sdk";
import { RowDataPacket } from "mysql2";
import { PoolConnection } from "mysql2/promise";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import { PlanName, PLAN_ITEMS, SubscriptionRow } from "../all_Types";
import { computeNextAt, formatDateTime, toMySQLDateTimeUTC } from "../all_Store";

const router = express.Router();

/** ──────────────── 공통 유틸 ──────────────── **/
const redactObj = (obj: any) => {
  const clone: any = {};
  for (const k of Object.keys(obj || {})) {
    if (/authorization|cookie|token|secret|password/i.test(k)) {
      clone[k] = "[REDACTED]";
    } else {
      clone[k] = obj[k];
    }
  }
  return clone;
};

const hexHash = (s: string) =>
  crypto.createHash("sha256").update(s, "utf8").digest("hex");

const nowISO = () => new Date().toISOString();

/** 요청 스코프 로깅 미들웨어 (요청ID/타이밍) */
router.use("/portone", (req: any, _res, next) => {
  req._rid = req.headers["x-request-id"] || uuidv4();
  req._t0 = Date.now();
  const rid = req._rid;

  console.log(
    `[portone][${rid}] ⇢ incoming ${req.method} ${req.originalUrl} @ ${nowISO()}`
  );
  console.log(
    `[portone][${rid}] ⇢ ip=${req.ip} content-type=${req.headers["content-type"]} content-length=${req.headers["content-length"]}`
  );
  console.log(
    `[portone][${rid}] ⇢ headers=`,
    redactObj(req.headers)
  );

  next();
});

// /** 이 경로만 원본 바디 문자열로 받기 (전역 json보다 "먼저" 적용돼야 함) */
// router.use("/portone", bodyParser.text({ type: "application/json" }));

router.post("/portone", bodyParser.text({ type: "*/*" }), async (req: any, res) => {
  const rid = req._rid || "no-rid";
  const t0 = req._t0 || Date.now();

  try {
    // payload 확보(반드시 string)
    const isBuf = Buffer.isBuffer(req.body);
    const isStr = typeof req.body === "string";
    const payload = isBuf
      ? (req.body as Buffer).toString("utf8")
      : isStr
        ? (req.body as string)
        : "";

    console.log(
      `[portone][${rid}] body typeof=${typeof req.body} isBuffer=${isBuf} len=${isStr ? (payload as string).length : (isBuf ? (req.body as Buffer).length : 0)} sha256=${isStr || isBuf ? hexHash(payload) : "NA"}`
    );

    if (!isStr && !isBuf) {
      console.warn(
        `[portone][${rid}] WARN: body가 string/buffer가 아님 → verify 실패 가능`
      );
    }

    console.log(`[portone][${rid}] verify start`);
    const evt = await Webhook.verify(
      process.env.PORTONE_WEBHOOK_SECRET!,
      payload,
      req.headers
    );
    console.log(
      `[portone][${rid}] verify ok type=${String(evt.type)} keys=${Object.keys(evt || {}).join(",")}`
    );

    //미지원/알 수 없는 스키마면 무시
    if (Webhook.isUnrecognizedWebhook(evt)) {
      console.log(`[portone][${rid}] unrecognized event → 200`);
      return void res.sendStatus(200);
    }

    // 관심 이벤트만 처리
    if (
      evt.type === "Transaction.Paid" ||
      evt.type === "Transaction.Failed" ||
      evt.type === "Transaction.PayPending"
    ) {
      const { paymentId } = evt.data as any;
      console.log(`[portone][${rid}] event.type=${evt.type} paymentId=${paymentId}`);

      // 결제 단건 재조회
      console.log(`[portone][${rid}] getPayment start`);
      const payment = await PaymentClient({
        secret: process.env.PORTONE_API_SECRET!,
      }).getPayment({ paymentId });
      console.log(
        `[portone][${rid}] getPayment ok status=${payment.status.toString()} amount=${(payment as any)?.amount?.total ?? "NA"} method=${(payment as any)?.method?.type ?? "NA"}`
      );

      const conn = await process._myApp.db.promise().getConnection();
      console.log(`[portone][${rid}] db connection acquired`);

      try {
        await conn.beginTransaction();
        console.log(`[portone][${rid}] tx begin`);

        if (payment.status === "PAID") {
          await onPaymentSucceeded(conn, paymentId, {
            portoneTxId: payment.id,   // 필드명 다르면 null로 둬도 됨            
            rid
          });
          console.log(`[portone][${rid}] commitCycleAndGrantTokens start`);
          await commitCycleAndGrantTokens(conn, paymentId, rid);
          console.log(`[portone][${rid}] commitCycleAndGrantTokens ok`);
        } else {
          console.log(`[portone][${rid}] onScheduleFailed start (status=${payment.status.toString()})`);
          await onScheduleFailed(conn, paymentId, rid);
          console.log(`[portone][${rid}] onScheduleFailed ok`);
        }

        await conn.commit();
        console.log(`[portone][${rid}] tx commit`);
        const ms = Date.now() - t0;
        console.log(`[portone][${rid}] ✓ 200 (${ms}ms)`);
        return void res.sendStatus(200);
      } catch (e: any) {
        await conn.rollback();
        console.error(`[portone][${rid}] tx rollback due to error:`, e?.message);
        console.error(e?.stack || e);
        if (axios.isAxiosError(e)) {
          console.error(`[portone][${rid}] axios error status=`, e.response?.status);
          console.error(`[portone][${rid}] axios error data=`, e.response?.data);
        } else {
          console.error(`[portone][${rid}] unknown error`, e);
        }        
        return void res.sendStatus(500);
      } finally {
        conn.release();
        console.log(`[portone][${rid}] db connection released`);
      }
    }

    console.log(`[portone][${rid}] ignored event type=${(evt as any)?.type}`);
    const ms = Date.now() - t0;
    console.log(`[portone][${rid}] ✓ 200 (${ms}ms)`);
    return void res.sendStatus(200);
  } catch (e: any) {
    if (e instanceof Webhook.WebhookVerificationError) {
      console.warn(`[portone][${rid}] verify error → 400:`, e.message);
      return void res.sendStatus(400);
    }
    console.error(`[portone][${rid}] 500 error:`, e?.message);
    console.error(e?.stack || e);
    return void res.sendStatus(500);
  }
});

/** 실패 플로우 */
export async function onScheduleFailed(
  conn: PoolConnection,
  paymentId: string,
  rid?: string
) {
  console.log(`[portone][${rid}] onScheduleFailed paymentId=${paymentId}`);

  const [sRows] = await conn.query<RowDataPacket[]>(
    `SELECT subscription_id, amount_krw, product_name, status
       FROM subscription_schedules
      WHERE payment_id = ?
      FOR UPDATE`,
    [paymentId]
  );
  console.log(`[portone][${rid}] schedules rows=${sRows.length}`);

  if (sRows.length === 0) {
    console.warn(`[portone][${rid}] unknown paymentId → skip`);
    return;
  }
  const sch = sRows[0] as {
    subscription_id: number;
    amount_krw: number;
    product_name: string;
    status: "SCHEDULED" | "EXECUTED" | "CANCELLED";
  };

  const [subRows] = await conn.query<RowDataPacket[]>(
    `SELECT id, user_id FROM subscriptions WHERE id = ?`,
    [sch.subscription_id]
  );
  console.log(`[portone][${rid}] subscription rows=${subRows.length}`);

  const { id: subscriptionId, user_id: userId } = subRows[0] as {
    id: number;
    user_id: number;
  };

  if (sch.status === "SCHEDULED") {
    const [r] = await conn.query(
      `UPDATE subscription_schedules
          SET status='CANCELLED', cancelled_at=NOW()
        WHERE payment_id=? AND status='SCHEDULED'`,
      [paymentId]
    );
    console.log(`[portone][${rid}] schedules CANCELLED result=`, r);
  }

  const paidAt = formatDateTime(new Date());
  const orderName = "정기결제(실패)";
  const [ins] = await conn.query(
    `INSERT INTO payments
       (user_id, subscription_id, payment_id, portone_tx_id, order_name,
        amount_krw, currency, is_success, paid_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'KRW', 0, ?, NOW())`,
    [userId, subscriptionId, paymentId, null, orderName, sch.amount_krw, paidAt]
  );
  console.log(`[portone][${rid}] payments INSERT result=`, ins);
}

/** 성공 플로우 */
export async function commitCycleAndGrantTokens(
  conn: PoolConnection,
  paymentId: string,
  rid?: string
) {
  console.log(`[portone][${rid}] commitCycle paymentId=${paymentId}`);

  const [subID] = await conn.query<RowDataPacket[]>(
    `SELECT subscription_id FROM subscription_schedules WHERE payment_id = ?`,
    [paymentId]
  );
  console.log(`[portone][${rid}] schedule→sub rows=${subID.length}`);
  if (subID.length === 0) throw new Error("SUB_SCHEDULE_NOT_FOUND");

  const subscriptionId = Number(subID[0].subscription_id);

  const [rows] = await conn.query<RowDataPacket[]>(
    `SELECT id, user_id, plan_name, billing_cycle, current_period_end,
            pending_plan_name, pending_billing_cycle, cancel_at_period_end
       FROM subscriptions
      WHERE id = ?
      FOR UPDATE`,
    [subscriptionId]
  );
  console.log(`[portone][${rid}] sub lock rows=${rows.length}`);
  if (rows.length === 0) throw new Error("SUB_NOT_FOUND");

  let sub = rows[0] as SubscriptionRow;

  const nextPlan: PlanName = (sub.pending_plan_name ?? sub.plan_name) as PlanName;
  const nextCycle: "MONTHLY" | "YEARLY" = (sub.pending_billing_cycle ?? sub.billing_cycle) as
    | "MONTHLY"
    | "YEARLY";
  const { price, token_grant: grant } = PLAN_ITEMS[nextPlan];
  console.log(
    `[portone][${rid}] next plan=${nextPlan} cycle=${nextCycle} price=${price} grant=${grant} cancelAtEnd=${sub.cancel_at_period_end}`
  );

  if (sub.cancel_at_period_end === 1 || nextPlan === "FREE") {
    const [upd] = await conn.query(
      `UPDATE subscriptions
            SET plan_name='FREE', billing_cycle='MONTHLY', price_cents=0, token_grant=0,
                pending_plan_name=NULL, pending_billing_cycle=NULL, cancel_at_period_end=0,
                current_period_end=NULL, updated_at=NOW()
          WHERE id = ?`,
      [sub.id]
    );
    console.log(`[portone][${rid}] sub -> FREE result=`, upd);
    return;
  }

  const [upd2] = await conn.query(
    `UPDATE subscriptions
          SET plan_name=?, billing_cycle=?, price_cents=?, token_grant=?,
              current_period_end = CASE WHEN ?='MONTHLY'
                                        THEN DATE_ADD(IFNULL(current_period_end, NOW()), INTERVAL 1 MONTH)
                                        ELSE DATE_ADD(IFNULL(current_period_end, NOW()), INTERVAL 1 YEAR)
                                   END,
              pending_plan_name=NULL, pending_billing_cycle=NULL, updated_at=NOW()
        WHERE id = ?`,
    [nextPlan, nextCycle, price, grant, nextCycle, sub.id]
  );
  console.log(`[portone][${rid}] sub rollover result=`, upd2);

  if (grant > 0) {
    const [upd3] = await conn.query(
      `UPDATE users SET token_balance = token_balance + ? WHERE id = ?`,
      [grant, sub.user_id]
    );
    console.log(`[portone][${rid}] token grant result=`, upd3);
  }

  const [after] = await conn.query<RowDataPacket[]>(
    `SELECT current_period_end FROM subscriptions WHERE id = ?`,
    [sub.id]
  );
  const nextEnd: Date | null = (after[0] as any)?.current_period_end ?? null;
  console.log(`[portone][${rid}] current_period_end=`, nextEnd);

  if (price <= 0 || !nextEnd) {
    console.log(`[portone][${rid}] skip schedule (price<=0 or nextEnd null)`);
    return;
  }

  const [uRows] = await conn.query<RowDataPacket[]>(
    `SELECT portone_customer_id, billing_key_status, portone_billing_key
       FROM users WHERE id = ?`,
    [sub.user_id]
  );
  console.log(`[portone][${rid}] user rows=${uRows.length}`);
  if (uRows.length === 0) return;
  const user = uRows[0] as {
    portone_customer_id: string | null;
    billing_key_status: "ACTIVE" | "INACTIVE" | "REVOKED";
    portone_billing_key: string | null;
  };
  console.log(
    `[portone][${rid}] user billing status=${user.billing_key_status} hasKey=${!!user.portone_billing_key}`
  );
  if (!user.portone_customer_id || user.billing_key_status !== "ACTIVE" || !user.portone_billing_key) {
    console.log(`[portone][${rid}] skip schedule (no active billing key)`);
    return;
  }

  const [sc_rows] = await conn.query<any[]>(
    `SELECT * FROM subscription_schedules WHERE subscription_id = ?`,
    [subscriptionId]
  );
  const [update_sub] = await conn.query<RowDataPacket[]>(
    `SELECT id, user_id, plan_name, billing_cycle, current_period_end,
            pending_plan_name, pending_billing_cycle, cancel_at_period_end
       FROM subscriptions
      WHERE id = ?`,
    [subscriptionId]
  );

  sub = update_sub[0] as SubscriptionRow;

  const PAYMENT_ID_NEXT = encodeURIComponent(`order_${uuidv4()}`);
  const url = `https://api.portone.io/payments/${PAYMENT_ID_NEXT}/schedule`;
  const headers = {
    Authorization: `PortOne ${process.env.PORTONE_API_SECRET}`,
    "Content-Type": "application/json",
  };
  const TIME_TO_PAY = computeNextAt(
    sub.current_period_end ? new Date(sub.current_period_end) : null
  );
  const body = {
    payment: {
      billingKey: user.portone_billing_key,
      orderName: `정기결제 ${sc_rows.length + 1}회차`,
      amount: { total: price },
      currency: "KRW",
    },
    timeToPay: TIME_TO_PAY,
  };

  console.log(`[portone][${rid}] schedule request url=${url}`);
  console.log(`[portone][${rid}] schedule headers=`, redactObj(headers));
  console.log(`[portone][${rid}] schedule body=`, body);

  const { data: schRes } = await axios.post(url, body, { headers });
  console.log(`[portone][${rid}] schedule response=`, schRes);

  if (schRes.status >= 400) {
    throw new Error(`PortOne schedule error ${schRes.status}: ${JSON.stringify(schRes.data)}`);
  }

  const [ins] = await conn.query(
    `INSERT INTO subscription_schedules
        (payment_id, subscription_id, schedule_at, amount_krw, status, product_name)
     VALUES (?, ?, ?, ?, 'SCHEDULED', ?)
     ON DUPLICATE KEY UPDATE
        schedule_at=VALUES(schedule_at),
        amount_krw=VALUES(amount_krw),
        product_name=VALUES(product_name)`,
    [PAYMENT_ID_NEXT, subscriptionId, formatDateTime(nextEnd), price, nextPlan]
  );
  console.log(`[portone][${rid}] schedule INSERT result=`, ins);
}


export async function onPaymentSucceeded(
  conn: PoolConnection,
  paymentId: string,
  opts?: {
    portoneTxId?: string | null;  // 포트원 트랜잭션 ID(알면 전달)    
    rid?: string;                 // 로그용 요청 ID
  }
) {
  const rid = opts?.rid ?? "";

  // 1) 스케줄 잠금 조회 → 금액/상품명/구독ID 확보
  const [sRows] = await conn.query<RowDataPacket[]>(
    `SELECT subscription_id, amount_krw, product_name, status
       FROM subscription_schedules
      WHERE payment_id = ?
      FOR UPDATE`,
    [paymentId]
  );
  if (sRows.length === 0) {
    console.warn(`[portone][${rid}] onPaymentSucceeded: unknown paymentId=${paymentId}`);
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
  if (subRows.length === 0) {
    console.warn(`[portone][${rid}] onPaymentSucceeded: subscription not found id=${sch.subscription_id}`);
    return;
  }
  const { id: subscriptionId, user_id: userId } = subRows[0] as {
    id: number;
    user_id: number;
  };

  // 3) 스케줄 상태 업데이트(멱등)
  if (sch.status === "SCHEDULED") {
    await conn.query(
      `UPDATE subscription_schedules
          SET status='EXECUTED', executed_at=NOW()
        WHERE payment_id=? AND status='SCHEDULED'`,
      [paymentId]
    );
  }

  // 4) payments 성공 기록(멱등: payment_id UNIQUE 가정)
  const orderName = sch.product_name || "정기결제(성공)";
  const portoneTxId = opts?.portoneTxId ?? null;

  const [ins_pay] = await conn.query(
    `INSERT INTO payments
       (user_id, subscription_id, payment_id, portone_tx_id, order_name,
        amount_krw, currency, is_success, paid_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'KRW', 1, NOW(), NOW())`,
    [userId, subscriptionId, paymentId, portoneTxId, orderName, sch.amount_krw]
  );

  console.log(`[portone][${rid}] payments INSERT(success) =`, ins_pay);
}

export default router;
