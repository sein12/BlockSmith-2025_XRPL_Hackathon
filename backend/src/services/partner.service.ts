// src/services/partner.service.ts
import fetch from "node-fetch";
import { ENV } from "../env";

/**
 * 파트너(AI & XRPL) 서비스 호출 래퍼
 * - payout: 조건 승인 후 XRP 지급
 * - 필요시 다른 API도 여기에 추가
 */
export const partnerService = {
  /**
   * XRP 지급을 요청합니다.
   * @param input toAddress: 지급 지갑 주소, amountXrp: 송금할 금액(XRP 단위), claimId: 참조용 청구 ID
   */
  async payout(input: {
    toAddress: string;
    amountXrp: string;
    claimId: string;
  }) {
    const res = await fetch(`${ENV.PARTNER_API_URL}/xrpl/payout`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(ENV.PARTNER_API_KEY
          ? { authorization: `Bearer ${ENV.PARTNER_API_KEY}` }
          : {}),
      },
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Partner payout failed (${res.status}): ${text}`);
    }

    return (await res.json()) as { txHash: string; [key: string]: any };
  },
};
