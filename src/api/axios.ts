import axios from "axios";

export type ClaimStatus =
  | "SUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "PAID"
  | "MANUAL";

export type AiDecision =
  | "Accepted"
  | "Declined"
  | "Escalate to human"
  | "Unknown";

export interface Claim {
  id: string;
  policyId: string;
  status: ClaimStatus;
  policyEscrowId: string;

  /** 청구 기본 정보 (ISO 문자열) */
  incidentDate: string; // e.g. "2025-09-20T00:00:00.000Z"
  details: string;

  /** 증빙 */
  evidenceUrl: string;

  /** AI 판독 */
  aiDecision?: AiDecision | null;
  aiRaw?: unknown;
  payoutAt?: string | null; // ISO or null
  payoutTxHash?: string | null;
  payoutMeta?: unknown;

  /** 스냅샷 (상품 정보) */
  productDescriptionMd: string;
  payoutDropsSnapshot: string; // BigInt → string 직렬화

  /** 시스템 */
  createdAt: string; // ISO
  updatedAt: string; // ISO

  productId: string; // 상품 id
  productName: string; // 상품명
  productCategory: string; // enum → string
  productPremiumDrops: string; // BigInt → string (필요하면)
  productPayoutDrops: string; // BigInt → string (필요하면)
  productShortDescription: string;
  productCoverageSummary: string;
}

export interface ClaimListResponse {
  items: Claim[];
  nextCursor: string | null; // 현재 라우트는 항상 null
}

export const api = axios.create({
  baseURL: "http://localhost:3000",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token =
    localStorage.getItem("accessToken") || localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("authUser");
      // 필요 시 여기서 라우팅 처리
    }
    return Promise.reject(error);
  }
);

export async function fetchClaim(id: string): Promise<Claim> {
  const { data } = await api.get<Claim>(`/claims/${id}`);
  return data;
}

export async function fetchClaims(): Promise<ClaimListResponse> {
  const { data } = await api.get<ClaimListResponse>("/claims");
  return data;
}
