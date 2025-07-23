import { loadSubscription } from "../middleware/subscriptionMiddleware";
import express from "express";
import { SubscriptionRow, UserRow } from "@jsLib/all_Types";
import { RowDataPacket } from "mysql2/promise";
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

    const [rows] = await process._myApp.db.promise().query<RowDataPacket[]>(
      `SELECT id, email, token_balance, created_at
               FROM users
              WHERE id = ?
              LIMIT 1`,
      [userId]
    );

    if (rows.length === 0) {
      res.status(404).json({ err: true, msg: "user not found" });
      return;
    }

    const lv_data: UserRow = {
      id: rows[0].id,
      email: rows[0].email,
      token_balance: rows[0].token_balance,
      created_at: rows[0].created_at,
    };

    res.json(lv_data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ err: true });
  }
});

export default router;
