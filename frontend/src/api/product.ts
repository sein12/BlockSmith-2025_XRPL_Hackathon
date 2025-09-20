import { api } from "./axios";
import type { Product } from "@/types/product";

export async function fetchProducts(): Promise<Product[]> {
  // 백엔드가 페이지네이션을 주면 params로 맞춰 쓰면 됩니다.
  const res = await api.get("/products");
  // 예: { items: Product[] } 형태라면 return res.data.items;
  return Array.isArray(res.data) ? res.data : res.data.items ?? [];
}

export async function fetchProductById(id: string): Promise<Product> {
  const res = await api.get(`/products/${id}`);
  return res.data as Product;
}
