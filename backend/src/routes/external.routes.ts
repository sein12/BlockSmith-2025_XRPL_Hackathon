// src/routes/external.routes.ts (A서버)
import { Router } from "express";
import axios from "axios";
import FormData from "form-data";

export const externalRouter = Router();

// 환경변수: B 서버 베이스 URL
const BASE = process.env.PARTNER_BASE_URL!; // 예: http://192.168.0.23:8080

// 공통: X-Session-Token 전달
function buildHeaders(req: any) {
  const token = req.header("X-Session-Token") || req.session?.extToken;
  return token ? { "X-Session-Token": token } : {};
}

/** 1) Health */
externalRouter.get("/health", async (req, res, next) => {
  try {
    const r = await axios.get(`${BASE}/health`);
    res.status(r.status).json(r.data);
  } catch (e) {
    next(e);
  }
});

/** 2) Faucet Login (세션 토큰 수신 → 서버 세션에 저장해도 되고 프론트에 재전달해도 됨) */
externalRouter.post("/auth/login_faucet", async (req, res, next) => {
  try {
    const r = await axios.post(`${BASE}/auth/login_faucet`, null);
    // 서버 세션에 토큰 저장 (선호): req.session.extToken = r.data.session_token;
    res.status(r.status).json(r.data);
  } catch (e) {
    next(e);
  }
});

/** 3) Balances */
externalRouter.get("/balances/insurer", async (req, res, next) => {
  try {
    const r = await axios.get(`${BASE}/balances/insurer`, {
      headers: buildHeaders(req),
    });
    res.status(r.status).json(r.data);
  } catch (e) {
    next(e);
  }
});

externalRouter.get("/balances/client", async (req, res, next) => {
  try {
    const r = await axios.get(`${BASE}/balances/client`, {
      headers: buildHeaders(req),
    });
    res.status(r.status).json(r.data);
  } catch (e) {
    next(e);
  }
});

/** 4) Addresses */
externalRouter.get("/address/insurer", async (req, res, next) => {
  try {
    const r = await axios.get(`${BASE}/address/insurer`, {
      headers: buildHeaders(req),
    });
    res.status(r.status).json(r.data);
  } catch (e) {
    next(e);
  }
});

externalRouter.get("/address/client", async (req, res, next) => {
  try {
    const r = await axios.get(`${BASE}/address/client`, {
      headers: buildHeaders(req),
    });
    res.status(r.status).json(r.data);
  } catch (e) {
    next(e);
  }
});

/** 5) Escrow */
externalRouter.post("/escrow/create", async (req, res, next) => {
  try {
    const r = await axios.post(`${BASE}/escrow/create`, null, {
      params: { amount_krw: req.query.amount_krw },
      headers: buildHeaders(req),
    });
    res.status(r.status).json(r.data);
  } catch (e) {
    next(e);
  }
});

externalRouter.post("/escrow/finish", async (req, res, next) => {
  try {
    const r = await axios.post(`${BASE}/escrow/finish`, req.body, {
      headers: { "Content-Type": "application/json", ...buildHeaders(req) },
    });
    res.status(r.status).json(r.data);
  } catch (e) {
    next(e);
  }
});

externalRouter.post("/escrow/cancel", async (req, res, next) => {
  try {
    const r = await axios.post(`${BASE}/escrow/cancel`, req.body, {
      headers: { "Content-Type": "application/json", ...buildHeaders(req) },
    });
    res.status(r.status).json(r.data);
  } catch (e) {
    next(e);
  }
});

/** 6) Agent (multipart) */
externalRouter.post(
  "/agent_transaction_request",
  async (req: any, res, next) => {
    try {
      // 프론트에서 multipart로 올렸다면, 여기서 그대로 포워딩
      // 만약 A서버에서 multer/express-fileupload 사용 중이면 그 결과로 FormData 재구성
      const fd = new FormData();
      // text fields
      for (const key of Object.keys(req.body ?? {})) {
        fd.append(key, req.body[key]);
      }
      // file field (express-fileupload 기준)
      const file = req.files?.image;
      if (file) {
        const f = Array.isArray(file) ? file[0] : file;
        fd.append("image", f.data, {
          filename: f.name,
          contentType: f.mimetype,
        });
      }

      const r = await axios.post(`${BASE}/agent_transaction_request`, fd, {
        headers: { ...fd.getHeaders(), ...buildHeaders(req) },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      });
      res.status(r.status).json(r.data);
    } catch (e) {
      next(e);
    }
  }
);

export default externalRouter;
