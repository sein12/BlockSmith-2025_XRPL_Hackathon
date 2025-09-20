// src/services/ai.service.ts
import fetch from "node-fetch";
import { ENV } from "../env";

export type AiDecision = "approve" | "reject" | "manual";

export async function evaluateOCR(req: {
  claimId: string;
  imageUrl: string;
}): Promise<{
  fields: any;
  score: number;
  decision: AiDecision;
}> {
  const r = await fetch(`${ENV.PARTNER_API_URL}/v1/ocr/evaluate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(req),
    timeout: 20000 as any,
  });
  if (!r.ok) throw new Error(`AI service error: ${r.status}`);
  return r.json() as any;
}
