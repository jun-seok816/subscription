import {
  applyPlanChange,
  loadSubscription,
  rollToNextPeriod,
} from "../middleware/subscriptionMiddleware";
import express from "express";
import { SubscriptionRow, UserRow } from "../all_Types";
import { RowDataPacket } from "mysql2/promise";
import {
  scheduleNext,
  cancelPortoneSchedules,
} from "../middleware/scheduleMiddleware";
import { payNowAndRecord } from "../middleware/billingKeyMiddleware";
import { nextTick } from "process";
const router = express.Router();

router.post(
  "/load",
  process._myApp.checkSession,
  loadSubscription,
  (req, res) => {
    const lv_data: SubscriptionRow = res.locals.subscription;
    const lv_subscription_schedules = res.locals.subscription_schedules;
    const lv_payments = res.locals.payments;
    res.send({
      sub: lv_data,
      schedules: lv_subscription_schedules,
      payments: lv_payments,
    });
  }
);

router.post("/me", process._myApp.checkSession, async (req, res) => {
  try {
    const userId = Number(req.session.userId);

    const [rows] = await process._myApp.db
      .promise()
      .query<UserRow & RowDataPacket[]>(
        `SELECT *
               FROM users
              WHERE id = ?
              LIMIT 1`,
        [userId]
      );

    if (rows.length === 0) {
      res.status(404).json({ err: true, msg: "user not found" });
      return;
    }
    const { id, portone_billing_key, portone_customer_id, ...rest } = rows[0]; // id만 제거
    const lv_data = rest;
    res.json(lv_data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ err: true, msg: "네트워크 오류" });
  }
});

router.post(
  "/planChange", //플랜 변경 시 호출
  process._myApp.checkSession, //로그인 세션 확인
  applyPlanChange, // 플랜 변경 로직
  loadSubscription, // 사용자 구독 정보 로드
  payNowAndRecord, // 결제 & 결제내역 저장
  cancelPortoneSchedules, // 포트원 예약 삭제
  scheduleNext, // 포트원 예약
  (req, res) => {
    const lv_data: SubscriptionRow = res.locals.subscription;
    res.send(lv_data);
  }
);

router.post(
  "/periodChange", //플랜 변경 시 호출
  process._myApp.checkSession, //로그인 세션 확인
  async (req, res, next) => {
    try {
      const changeDate: string = req.body.changeDateTime;
      await process._myApp.db.promise().query(
        `UPDATE subscriptions
        SET current_period_end = CONVERT_TZ(
          STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s.%fZ'),
          '+00:00', '+09:00'
        )
        WHERE user_id = ?;`,
        [changeDate, req.session.userId]
      );
      next();
    } catch (err) {
      next(err);
    }
  },
  loadSubscription, // 사용자 구독 정보 로드
  cancelPortoneSchedules, // 포트원 예약 삭제
  scheduleNext, // 포트원 예약
  (req, res) => {
    const lv_data: SubscriptionRow = res.locals.subscription;
    res.send(lv_data);
  }
);

// /**디버깅 용 */
// router.post(
//   "/nextPeriod",
//   process._myApp.checkSession,
//   rollToNextPeriod,
//   loadSubscription,
//   cancelPortoneSchedules,
//   scheduleNext,
//   (req, res) => {
//     const lv_data: SubscriptionRow = res.locals.subscription;
//     res.send(lv_data);
//   }
// );

export default router;
