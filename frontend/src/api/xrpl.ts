// src/api/xrpl.ts
import type { ClaimResponseData } from "@/types/claim";
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

/** 5) Escrow */
export async function createEscrow(amount_krw: string) {
  const { data } = await ext.post<{ escrow_id: string; message: string }>(
    "/escrow/create",
    null,
    { params: { amount_krw } }
  );
  return data;
}

export async function finishEscrow(escrow_id: string) {
  const { data } = await ext.post<{
    escrow_id: string;
    finished: boolean;
    tx_hash?: string;
    message?: string;
  }>("/escrow/finish", { escrow_id });
  return data;
}

export async function cancelEscrow(escrow_id: string) {
  const { data } = await ext.post<{
    escrow_id: string;
    canceled: boolean;
    tx_hash?: string;
    message?: string;
  }>("/escrow/cancel", { escrow_id });
  return data;
}

/** 6) Agent (multipart) */
export async function agentTransactionRequest(params: {
  user_transaction_description: string;
  image?: File | null;
  knowledge_markdown?: string;
  agent1_max_new_tokens?: number;
  agent2_max_new_tokens?: number;
  temperature?: number;
  agent1_system_prompt?: string;
  agent2_system_prompt?: string;
}) {
  const fd = new FormData();
  fd.append(
    "user_transaction_description",
    params.user_transaction_description
  );
  if (params.image) fd.append("image", params.image);
  if (params.knowledge_markdown)
    fd.append("knowledge_markdown", params.knowledge_markdown);
  if (params.agent1_max_new_tokens != null)
    fd.append("agent1_max_new_tokens", String(params.agent1_max_new_tokens));
  if (params.agent2_max_new_tokens != null)
    fd.append("agent2_max_new_tokens", String(params.agent2_max_new_tokens));
  if (params.temperature != null)
    fd.append("temperature", String(params.temperature));
  if (params.agent1_system_prompt)
    fd.append("agent1_system_prompt", params.agent1_system_prompt);
  if (params.agent2_system_prompt)
    fd.append("agent2_system_prompt", params.agent2_system_prompt);

  const { data } = await ext.post<{ results: ClaimResponseData }>(
    "/agent_transaction_request",
    fd,
    {
      headers: { "Content-Type": "multipart/form-data" },
    }
  );
  return data;
}
