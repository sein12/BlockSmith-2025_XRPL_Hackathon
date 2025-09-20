// src/api/xrpl.ts
import { ext, setSessionToken } from "./ext";

export type AgentsDecision =
  | "Accepted"
  | "Declined"
  | "Escalate to human"
  | "Unknown";

/** 1) Health */
export async function getHealth() {
  const { data } = await ext.get<{
    status: string;
    device: string;
    model: string;
  }>("/health");
  return data;
}

/** 2) Faucet Login */
export type FaucetLoginOut = {
  session_token: string;
  address: string;
  seed: string; // TESTNET ONLY
  public_key: string;
};

export async function loginFaucet() {
  const { data } = await ext.post<FaucetLoginOut>("/auth/login_faucet");
  setSessionToken(data.session_token);
  return data;
}

/** 3) Balances */
export async function getInsurerBalance() {
  const { data } = await ext.get<{
    insurer_address: string;
    insurer_balance_xrp: number;
  }>("/balances/insurer");
  return data;
}

export async function getClientBalance() {
  const { data } = await ext.get<{
    client_address: string;
    client_balance_xrp: number;
  }>("/balances/client");
  return data;
}

export async function finishEscrow(escrow_id: string) {
  const { data } = await ext.post<{
    escrow_id: string;
    finished?: boolean;
    tx_hash?: string;
    message?: string;
  }>("/escrow/finish", { escrow_id });
  return data;
}

export async function cancelEscrow(escrow_id: string) {
  try {
    const { data } = await ext.post<{
      escrow_id: string;
      canceled: boolean;
      tx_hash?: string;
      message?: string;
    }>("/escrow/cancel", { escrow_id });
    return data;
  } catch (e) {
    console.error(e);
  }
}
