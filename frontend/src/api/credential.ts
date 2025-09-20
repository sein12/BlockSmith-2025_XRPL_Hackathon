// src/api/credential.ts
import { api } from "./axios";

/* ====== Types ====== */

export type CredentialTxSummary = {
  engine_result?: string;
  hash?: string;
  validated?: boolean;
  ledger_index?: number;
  tx_type?: string;
  account?: string;
};

export interface CredentialTxResponse {
  ok: boolean;
  summary: CredentialTxSummary;
  raw: unknown; // 백엔드에서 그대로 전달(디버깅/확인용)
}

export interface CredentialObject {
  LedgerEntryType: "Credential";
  Issuer: string;
  Subject: string;
  CredentialType: string; // hex 문자열(KYC 등)
  Expiration?: number; // unix seconds
  URI?: string; // hex 문자열(옵션)
  index?: string;
  Flags?: number;
  [k: string]: unknown;
}

export interface CredentialListResponse {
  ok: boolean;
  count: number;
  items: CredentialObject[];
}

/* ====== Payloads ====== */

export interface IssueCredentialBody {
  /** ⚠️ 데모/수탁 한정: 프론트에서 사용자 Seed를 직접 보냄 */
  userSeed: string;
  type?: string; // 기본 "KYC"
  expirationSec?: number; // 기본 3600
  uri?: string; // 기본 example URI
}

/* ====== API functions ====== */

/**
 * 발급(Create)
 * - POST /api/credentials/create
 * - body: { userSeed, type?, expirationSec?, uri? }
 */
export async function issueCredential(
  body: IssueCredentialBody
): Promise<CredentialTxResponse> {
  const { data } = await api.post<CredentialTxResponse>(
    "/api/credentials/create",
    body
  );
  return data;
}

/**
 * 수락(Accept)
 * - POST /api/credentials/accept
 * - (현재 백엔드: 고정값/서버 보관 Seed 사용)
 */
export const acceptIssuedCredentialBySeed = (userSeed: string, type?: string) =>
  api.post("/api/credentials/accept", { userSeed, type }).then((r) => r.data);

/**
 * 조회(Check)
 * - GET /api/credentials
 * - Subject(=USER_SEED) 계정의 Credential 레저 객체 목록
 */
export const fetchMyCredentialsBySeed = (userSeed: string) =>
  api.post("/api/credentials/check", { userSeed }).then((r) => r.data);

/**
 * 삭제(Delete)
 * - DELETE /api/credentials
 * - 현재 데모: 고정 타입/지갑 기준으로 CredentialDelete 전송
 */
// export async function deleteMyCredential(): Promise<CredentialTxResponse> {
//   const { data } = await api.delete<CredentialTxResponse>("/api/credentials");
//   return data;
// }
