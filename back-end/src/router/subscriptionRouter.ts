import {
  applyPlanChange,
  loadSubscription,
  rollToNextPeriod,
} from "../middleware/subscriptionMiddleware";
import express from "express";
import { SubscriptionRow, UserRow } from "../all_Types";
import { RowDataPacket } from "mysql2/promise";
import { scheduleNext } from "../middleware/scheduleMiddleware";
const router = express.Router();

router.post(
  "/load",
  process._myApp.checkSession,
  loadSubscription,
  (req, res) => {
    const lv_data: SubscriptionRow = res.locals.subscription;
    res.send(lv_data);
  }
);

router.post("/me", process._myApp.checkSession, async (req, res) => {
  try {
    const userId = Number(req.session.userId);

    const [rows] = await process._myApp.db.promise().query<UserRow & RowDataPacket[]>(
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
  "/planChange",
  process._myApp.checkSession,
  applyPlanChange,
  loadSubscription,
  scheduleNext,
  (req, res) => {
    const lv_data: SubscriptionRow = res.locals.subscription;
    res.send(lv_data);
  }
);

router.post(
  "/nextPeriod",
  process._myApp.checkSession,
  rollToNextPeriod,
  loadSubscription,
  scheduleNext,
  (req, res) => {
    const lv_data: SubscriptionRow = res.locals.subscription;
    res.send(lv_data);
  }
);

export default router;
