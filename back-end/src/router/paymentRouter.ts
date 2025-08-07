import axios from "axios";
import express, { Request, Response } from "express";
import dotenv from 'dotenv';
const router = express.Router();

const CHANNEL_KEY_SECRET = process.env.CHANNEL_KEY; // .env 파일에 SECRET_CHANNEL_KEY 값 설정
dotenv.config();

router.post("/complete", async (req, res) => {
  const { paymentId } = req.body;
  if (!paymentId) {
    res
      .status(400)
      .json({ err: true, msg: "paymentId가 필요합니다." });
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
  } catch (error:any) {    
    console.error("결제 검증 에러:", error.response?.data || error.message);
    res
      .status(500)
      .json({ err: true, msg: "결제 검증 중 오류가 발생했습니다." });
    return;
  }
});

export default router;
