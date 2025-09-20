import { Client, Wallet, CredentialCreate } from "xrpl";
import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: path.join(process.cwd(), ".env") });

const toHexUtf8 = (s: string) => Buffer.from(s, "utf8").toString("hex");
const nowSec = () => Math.floor(Date.now() / 1000);

// 문자열이 이미 hex 형식(또는 0x 접두)인지 판단 후 인코딩
const asHex = (s: string) =>
  /^([0-9a-fA-F]+)$/.test(s) ? s : toHexUtf8(s.replace(/^0x/i, ""));

type CreateCredentialInput = {
  subjectSeed: string; // 프론트에서 받은 사용자 Seed (피발급자)
  type?: string; // 기본 "KYC"
  expirationSec?: number; // 기본 3600 (지금부터 +초)
  uri?: string; // 기본 예시 URI
  wsUrl?: string; // XRPL WS (옵션)
};

/** 데모/수탁용: 프론트에서 받은 subjectSeed로 피발급자 지정 후 발급자(ADMIN_SEED) 서명/전송 */
export async function createCredential({
  subjectSeed,
  type = "KYC",
  expirationSec = 3600,
  uri = "https://example.com/credentials/kyc/user",
  wsUrl,
}: CreateCredentialInput): Promise<any> {
  const client = new Client(
    wsUrl ?? process.env.XRPL_WS ?? "wss://s.devnet.rippletest.net:51233"
  );
  await client.connect();

  const ADMIN_SEED = process.env.ADMIN_SEED;
  if (!ADMIN_SEED) throw new Error("Missing env: ADMIN_SEED");
  if (!subjectSeed) throw new Error("Missing param: subjectSeed");

  try {
    const issuer = Wallet.fromSeed(ADMIN_SEED); // 발급자(서명자)
    const subject = Wallet.fromSeed(subjectSeed); // 피발급자(프론트 제공)

    const tx: CredentialCreate = {
      TransactionType: "CredentialCreate",
      Account: issuer.address, // 발급자
      Subject: subject.address, // 피발급자
      CredentialType: asHex(type), // "KYC" → hex
      Expiration: nowSec() + expirationSec, // 상대 만료 (초)
      URI: asHex(uri), // URI → hex
    };

    const prepared = await client.autofill(tx);
    const signed = issuer.sign(prepared);
    const res = await client.submitAndWait(signed.tx_blob);

    return res.result; // 반환 타입 단순화를 위해 any 사용
  } finally {
    await client.disconnect();
  }
}
