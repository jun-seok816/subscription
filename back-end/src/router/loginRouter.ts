import axios from "axios";
import express, { Request, Response } from "express";
import { OkPacket, RowDataPacket } from "mysql2/promise";
const router = express.Router();

/**
 * POST /loginEmailCheck
 * @body { email: string }
 * @returns { exists: boolean }
 */
 router.post("/loginEmailCheck", async (req: Request, res: Response) => {
    try {
      const email: string | undefined = req.body?.email ?? req.body?.data?.email;
      if (!email) {
        res.status(400).json({ err: true, msg: "email is required" });
        return 
      }
  
      // 새 테이블은 email 컬럼만 확인하면 됨
      const [rows] = await process._myApp.db
        .promise()
        .query<RowDataPacket[]>(
          "SELECT 1 FROM users WHERE email = ? LIMIT 1",
          [email],
        );
  
      res.json({ exists: rows.length > 0 });
    } catch (err) {
      console.error(err);
      res.status(500).json({ err: true });
    }
  });

/**
 * POST /save_data_google
 * @body { access_token: string; expires_in?: number } 
 */
 router.post("/save_data_google", async (req: Request, res: Response) => {
    try {
      const { access_token } = req.body;
  
      /* ① Google OAuth 토큰 확인 → email 획득 */
      let email: string;
      try {
        const { data } = await axios.get<{ email: string }>(
          `https://www.googleapis.com/oauth2/v1/userinfo?access_token=${access_token}`,
        );
        email = data.email;
      } catch {
        res.status(400).json({ err: true, msg: "invalid token" });
        return 
      }
  
      /* ② users 테이블 조회 */
      const [rows] = await process._myApp.db
        .promise()
        .query<RowDataPacket[]>("SELECT id FROM users WHERE email = ? LIMIT 1", [
          email,
        ]);
  
      if (rows.length === 0) {
        /* ─── 첫 방문: 회원가입 ─── */
        const [result] = await process._myApp.db
          .promise()
          .query<OkPacket>(
            "INSERT INTO users (email) VALUES (?)",
            [email],
          );
  
        // 세션 초기화
        req.session.userId = Number(result.insertId);
        req.session.email = email;
  
        res.json({ err: false, msg: "sign_up" });
        return 
      }
  
      /* ─── 이미 회원: 로그인 ─── */
      req.session.userId = rows[0].id;
      req.session.email = email;
  
      res.json({ err: false, msg: "login" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ err: true });
    }
  });

/**
 * POST /sign_up
 * @body { email: string } 
 */
router.post("/sign_up", async (req: Request, res: Response) => {
  try {
    const email: string | undefined = req.body?.email ?? req.body?.data?.email;
    if (!email) {
      res.status(400).json({ err: true, msg: "email is required" });
      return 
    }

    /* 중복 체크 */
    const [dup] = await process._myApp.db
      .promise()
      .query<RowDataPacket[]>("SELECT 1 FROM users WHERE email = ? LIMIT 1", [
        email,
      ]);
    if (dup.length) {
      res.status(409).json({ err: true, msg: "email already exists" });
      return 
    }

    /* 회원 등록 */
    const [result] = await process._myApp.db
      .promise()
      .query<OkPacket>("INSERT INTO users (email) VALUES (?)", [email]);

    req.session.userId = Number(result.insertId);
    req.session.email = email;

    res.json({ err: false, msg: "sign_up" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ err: true });
  }
});
