import { Client, Wallet, Transaction } from "xrpl";
import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: path.join(process.cwd(), ".env") });

const toHex = (s: string) => Buffer.from(s, "utf8").toString("hex");

export type AcceptCredentialInput = {
  userSeed: string; // 프론트에서 받은 사용자 Seed (Subject)
  type?: string; // 기본 "KYC"
  wsUrl?: string; // 선택 XRPL WS
};

export async function acceptCredential({
  userSeed,
  type = "KYC",
  wsUrl,
}: AcceptCredentialInput): Promise<any> {
  const client = new Client(
    wsUrl ?? process.env.XRPL_WS ?? "wss://s.devnet.rippletest.net:51233"
  );
  await client.connect();

  const ADMIN_SEED = process.env.ADMIN_SEED;
  if (!ADMIN_SEED) throw new Error("Missing env: ADMIN_SEED");
  if (!userSeed) throw new Error("Missing param: userSeed");

  const issuer = Wallet.fromSeed(ADMIN_SEED); // 발급자
  const subject = Wallet.fromSeed(userSeed); // ✅ 피발급자(서명자)

  try {
    const tx: Transaction = {
      TransactionType: "CredentialAccept",
      Account: subject.address, // ✅ 피발급자 서명/전송
      Issuer: issuer.address,
      CredentialType: toHex(type), // createCredential와 동일 타입
    };

    const prepared = await client.autofill(tx);
    const signed = subject.sign(prepared);
    const result = await client.submitAndWait(signed.tx_blob);
    return result;
  } finally {
    await client.disconnect();
  }
}
