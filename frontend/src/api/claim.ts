// src/api/claim.ts
import type { AiDecision } from "@/types/claim";
import { api } from "./axios";
import type { AxiosProgressEvent } from "axios";

/** ===== 공통 타입 ===== */
export type ClaimStatus =
  | "SUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "PAID"
  | "MANUAL";

/** 백엔드 DTO(ClaimDTO) 대응 */
export interface Claim {
  id: string;
  policyId: string;
  status: ClaimStatus;

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

  policyEscrowId: string | null;
  productId: string; // 상품 id
  productName: string; // 상품명
  productCategory: string; // enum → string
  productPremiumDrops: string; // BigInt → string (필요하면)
  productPayoutDrops: string; // BigInt → string (필요하면)
  productShortDescription: string;
  productCoverageSummary: string;
}

/** 목록 응답 (백엔드: { items, nextCursor }) */
export interface ClaimListResponse {
  items: Claim[];
  nextCursor: string | null; // 현재 라우트는 항상 null
}

/** 상세 응답: routes는 ClaimDTO만 반환 (policy 포함 X) */
export type ClaimDetail = Claim;

/** 생성 응답: routes에서 { claimId, status, ai } 반환 */
export interface CreateClaimResponse {
  claimId: string;
  status: Exclude<ClaimStatus, "SUBMITTED">;
  ai: {
    decision: AiDecision;
    score: number;
    [k: string]: unknown;
  };
}

/** ===== API ===== */

/** 청구 목록 */
export async function fetchClaims(): Promise<ClaimListResponse> {
  const { data } = await api.get<ClaimListResponse>("/claims");
  return data;
}

/** 청구 상세 */
export async function fetchClaim(id: string): Promise<ClaimDetail> {
  const { data } = await api.get<ClaimDetail>(`/claims/${id}`);
  return data;
}

export async function createClaim(
  params: {
    policyId: string;
    incidentDate: string;
    details: string;
    file: File;
    rejectedReason: string;
    aiDecision: AiDecision;
  },
  opts?: { onUploadProgress?: (p: AxiosProgressEvent) => void }
) {
  const form = new FormData();
  form.append("policyId", params.policyId);
  form.append("incidentDate", params.incidentDate);
  form.append("details", params.details);
  form.append("file", params.file); // 필드명 'file' 중요!
  form.append("rejectedReason", params.rejectedReason);
  form.append("aiDecision", params.aiDecision);

  const { data } = await api.post("/claims", form, {
    // ❗ json 기본 헤더를 덮어쓰기 (또는 아예 헤더를 생략해도 브라우저가 자동 설정)
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: opts?.onUploadProgress,
  });
  return data as {
    claimId: string;
    status: "APPROVED" | "REJECTED" | "MANUAL";
    ai: { decision: "approve" | "reject" | "manual"; score: number };
  };
}

/** 이미 구성된 FormData로 올리고 싶을 때 */
export async function createClaimWithFormData(
  form: FormData,
  opts?: { onUploadProgress?: (p: AxiosProgressEvent) => void }
): Promise<CreateClaimResponse> {
  const { data } = await api.post<CreateClaimResponse>("/claims", form, {
    onUploadProgress: opts?.onUploadProgress,
  });
  return data;
}

export async function updateClaimAi(
  id: string,
  params: { decision?: string; reason?: string; raw?: unknown }
) {
  const { data } = await api.patch(`/claims/${id}/ai`, params);
  return data as Claim; // 서버에서 toClaimDTO 반환
}
