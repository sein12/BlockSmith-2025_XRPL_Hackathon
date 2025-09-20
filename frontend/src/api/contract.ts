import { api } from "./axios";
import type { Policy, PolicyDetail } from "@/types/contract";

export async function fetchMyPolicies(): Promise<Policy[]> {
  // 일반적으로 GET /policies 가 자신의 폴리시를 반환(인증 필요)
  const res = await api.get("/policies");
  return Array.isArray(res.data) ? res.data : res.data.items ?? [];
}

export async function createPolicy(
  productId: string,
  escrowId: string
): Promise<Policy> {
  const { data } = await api.post("/policies", { productId, escrowId });
  return data.policy as Policy;
}

export async function fetchPolicyById(id: string): Promise<Policy> {
  const { data } = await api.get(`/policies/${id}`);
  return data;
}

export async function getPolicyDetail(id: string): Promise<PolicyDetail> {
  const { data } = await api.get<PolicyDetail>(`/policies/${id}`);
  return data;
}
