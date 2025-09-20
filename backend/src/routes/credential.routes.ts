import { Router, Request, Response, NextFunction } from "express";
import { createCredential } from "../services/Credential/createCredential";
import { acceptCredential } from "../services/Credential/acceptCredential";
import { checkCredential } from "../services/Credential/checkCredential";
import { deleteCredential } from "../services/Credential/deleteCredential";

export const credentialRouter = Router();

/** 공통 async 핸들러 */
const ah =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res, next).catch(next);

/** XRPL tx 결과에서 데모에 유용한 필드만 요약 */
function summarizeTx(result: any) {
  const r = result?.result ?? result;
  return {
    engine_result: r?.engine_result ?? r?.meta?.TransactionResult,
    hash: r?.tx_json?.hash || r?.hash,
    validated: r?.validated ?? r?.validated_ledger_index !== undefined,
    ledger_index: r?.ledger_index ?? r?.validated_ledger_index,
    tx_type: r?.tx_json?.TransactionType,
    account: r?.tx_json?.Account,
  };
}

/**
 * POST /api/credentials/create
 * - 현재 서비스 함수는 ADMIN_SEED/USER_SEED/타입/만료/URI가 고정값
 */
credentialRouter.post(
  "/create",
  ah(async (req, res) => {
    const { userSeed, type, expirationSec, uri } = req.body ?? {};
    if (!userSeed) {
      return res.status(400).json({ ok: false, error: "userSeed is required" });
    }

    // 데모 주의사항 로그(실서비스 금지)
    console.warn(
      "[DEMO ONLY] Receiving userSeed from client. Do NOT do this in production."
    );

    const result = await createCredential({
      subjectSeed: userSeed,
      type,
      expirationSec,
      uri,
    });

    res.json({
      ok: true,
      summary: summarizeTx(result),
      raw: result,
    });
  })
);

/**
 * POST /api/credentials/accept
 */
credentialRouter.post(
  "/accept",
  ah(async (req, res) => {
    const { userSeed, type } = req.body ?? {};
    if (!userSeed)
      return res.status(400).json({ ok: false, error: "userSeed is required" });
    console.warn("[DEMO ONLY] Receiving userSeed from client.");
    const result = await acceptCredential({ userSeed, type });
    res.json({ ok: true, summary: summarizeTx(result), raw: result });
  })
);

/**
 * GET /api/credentials
 * - Subject(=USER_SEED 지갑)의 Credential 객체 목록
 */
credentialRouter.post(
  "/check",
  ah(async (req, res) => {
    const { userSeed } = req.body ?? {};
    if (!userSeed)
      return res.status(400).json({ ok: false, error: "userSeed is required" });
    console.warn("[DEMO ONLY] Receiving userSeed from client.");
    const list = await checkCredential({ userSeed });
    res.json({ ok: true, count: list.length, items: list });
  })
);

/**
 * DELETE /api/credentials
 * - 현재 데모용: 고정된 타입/지갑으로 CredentialDelete 전송
 */
credentialRouter.delete(
  "/",
  ah(async (_req, res) => {
    const result = await deleteCredential();
    res.json({
      ok: true,
      summary: summarizeTx(result),
      raw: result,
    });
  })
);
