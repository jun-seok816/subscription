import { loadSubscription } from "../middleware/subscriptionMiddleware";
import express, { Request, Response } from "express";
import {
  cancelPortoneSchedules,
  createBillingKey,
  deleteBillingKey,
} from "../middleware/billingKeyMiddleware";
const router = express.Router();

router.post(
  "/billing",
  process._myApp.checkSession,
  createBillingKey,
  (req, res) => {
    res.send({});
  }
);

router.delete(
  "/billing",
  process._myApp.checkSession,
  loadSubscription,
  cancelPortoneSchedules,
  deleteBillingKey,
  (req, res) => {
    res.send({});
  }
);

export default router;
