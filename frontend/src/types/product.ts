// 서버 JSON에서 BigInt는 string으로 내려오므로 string으로 고정
export type FeatureItem = { title: string; body: string };

// Prisma enum과 맞춤
export type ProductCategory =
  | "HEALTH"
  | "TRAVEL"
  | "DEVICE"
  | "PET"
  | "GIG"
  | "ESCROW"
  | "EVENT"
  | "WARRANTY"
  | "TELEMED"
  | "TRANSIT"
  | "OTHER";

export type Product = {
  id: string;
  name: string;
  premiumDrops: string; // BigInt → string
  payoutDrops: string;
  coverageSummary: string; // Prisma: String (non-null)
  shortDescription: string; // Prisma: String (non-null)
  descriptionMd: string; // Prisma: String (non-null)
  features: FeatureItem[]; // Prisma: Json (non-null) → 클라에선 배열로 사용
  active: boolean;
  createdAt: string; // ISO string
  category: ProductCategory;
  validityDays: number; // Prisma: Int (non-null)
};

// 정책 응답에 포함되는 요약 형태 (백엔드 DTO와 동일)
export type ProductBrief = Pick<
  Product,
  | "id"
  | "name"
  | "premiumDrops"
  | "payoutDrops"
  | "coverageSummary"
  | "shortDescription"
  | "descriptionMd"
  | "active"
  | "createdAt"
  | "category"
  | "validityDays"
  | "features"
>;
