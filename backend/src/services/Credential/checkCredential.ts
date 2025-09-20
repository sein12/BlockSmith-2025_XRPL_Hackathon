import { Client, Wallet } from "xrpl";
import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: path.join(process.cwd(), ".env") });

export type CheckCredentialInput = {
  userSeed: string; // 프론트에서 받은 사용자 Seed
  wsUrl?: string;
};

export async function checkCredential({
  userSeed,
  wsUrl,
}: CheckCredentialInput): Promise<any[]> {
  const client = new Client(
    wsUrl ?? process.env.XRPL_WS ?? "wss://s.devnet.rippletest.net:51233"
  );
  await client.connect();

  if (!userSeed) throw new Error("Missing param: userSeed");

  try {
    const subject = Wallet.fromSeed(userSeed);
    const all: any[] = [];
    let marker: any = undefined;

    do {
      const r: any = await client.request({
        command: "account_objects",
        account: subject.address,
        limit: 400,
        ...(marker ? { marker } : {}),
      });
      const creds = (r.result.account_objects || []).filter(
        (o: any) => o.LedgerEntryType === "Credential"
      );
      all.push(...creds);
      marker = r.result.marker;
    } while (marker);

    return all;
  } finally {
    await client.disconnect();
  }
}
