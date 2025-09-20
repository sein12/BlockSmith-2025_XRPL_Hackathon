import type { ProductBrief } from "./product";

export type PolicyStatus = "ACTIVE" | "EXPIRED" | "CANCELLED";

export type User = {
  id: string;
  name: string;
};

export type Policy = {
  id: string;
  userId: string;
  productId: string;
  status: PolicyStatus;

  // Prisma 기준 필수
  startAt: string; // ISO
  expireAt: string; // ISO

  createdAt: string; // ISO
  updatedAt: string; // ISO

  // 백엔드 라우터가 항상 포함해서 내려줌 (list/detail)
  product: ProductBrief;
  user: User;
};

// (선택) 타입 가드: product가 있는지 판별 (여기선 항상 true지만 유틸로 유지)
export function hasProduct(p: Policy): p is Policy & { product: ProductBrief } {
  return !!p.product;
}

export type PolicyDetail = Policy & {
  user: { id: string; name: string };
};
