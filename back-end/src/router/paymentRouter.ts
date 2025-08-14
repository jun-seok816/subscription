import express, { Request, Response } from "express";
import { createBillingKey, deleteBillingKey } from "../middleware/billingKeyMiddleware";
const router = express.Router();


router.post("/billing", process._myApp.checkSession, createBillingKey);

router.delete("/billing", process._myApp.checkSession, deleteBillingKey);



export default router;
