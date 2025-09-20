// src/routes/policies.routes.ts
import { Router } from "express";
import { prisma } from "../repositories/prisma";
import { authGuard, AuthedRequest } from "../middlewares/authGuard";
import type { Prisma, PolicyStatus } from "@prisma/client";

export const policyRouter = Router();
policyRouter.use(authGuard);

/** ===== DTOs ===== */
type FeatureItem = { title: string; body: string };

function toFeatureItems(v: Prisma.JsonValue): FeatureItem[] | null {
  if (!v) return null;
  if (Array.isArray(v)) {
    const arr = v as unknown[];
    const safe = arr
      .filter(
        (it): it is { title: unknown; body: unknown } =>
          !!it &&
          typeof it === "object" &&
          "title" in (it as any) &&
          "body" in (it as any)
      )
      .map((it) => ({
        title: String((it as any).title),
        body: String((it as any).body),
      }));
    return safe.length ? safe : null;
  }
  return null;
}

type ProductBriefDTO = {
  id: string;
  name: string;
  payoutDrops: string;
  premiumDrops: string;
  coverageSummary: string;
  shortDescription: string;
  descriptionMd: string;
  category: string;
  features: FeatureItem[] | null;
  validityDays: number;
  active: boolean;
  createdAt: Date;
};

type UserBriefDTO = { id: string; name: string };

type PolicyDTO = {
  id: string;
  userId: string;
  productId: string;
  status: PolicyStatus;
  startAt: Date;
  expireAt: Date;
  createdAt: Date;
  updatedAt: Date;
  escrowId: string | null; // ← 추가
  product: ProductBriefDTO;
  user: UserBriefDTO;
};

/** ===== Prisma row types (include relations) ===== */
type PolicyRow = Prisma.PolicyGetPayload<{
  include: { product: true; user: { select: { id: true; name: true } } };
}>;

/** ===== Mappers ===== */
function toProductBriefDTO(p: PolicyRow["product"]): ProductBriefDTO {
  return {
    id: p.id,
    name: p.name,
    premiumDrops: p.premiumDrops.toString(),
    payoutDrops: p.payoutDrops.toString(),
    coverageSummary: p.coverageSummary,
    descriptionMd: p.descriptionMd,
    // escrowId: p.escrowId,   // ❌ 제거 (Product에는 없음)
    shortDescription: p.shortDescription,
    category: p.category,
    validityDays: p.validityDays,
    active: p.active,
    createdAt: p.createdAt,
    features: toFeatureItems(p.features),
  };
}

function toPolicyDTO(row: PolicyRow): PolicyDTO {
  return {
    id: row.id,
    userId: row.userId,
    productId: row.productId,
    status: row.status,
    startAt: row.startAt,
    expireAt: row.expireAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    escrowId: row.escrowId ?? null, // ✅ 추가
    product: toProductBriefDTO(row.product),
    user: { id: row.user.id, name: row.user.name },
  };
}

/** ===== Helpers ===== */
const MS_PER_DAY = 24 * 60 * 60 * 1000;
function addDays(base: Date, days: number) {
  return new Date(base.getTime() + days * MS_PER_DAY);
}

/** ===== Routes ===== */

// 생성: startAt(옵션) 입력 가능, expireAt은 product.validityDays 기준 자동 계산
// 생성
policyRouter.post("/", async (req: AuthedRequest, res, next) => {
  try {
    const sub = req.user!.sub;
    const {
      productId,
      startAt: startAtRaw,
      escrowId,
    } = req.body as {
      productId?: string;
      startAt?: string | number | Date;
      escrowId?: string; // ✅ 추가
    };
    if (!productId)
      return res.status(400).json({ error: "productId required" });

    // ✅ User 존재 확인 (sub가 User.id가 맞는지 반드시 확인)
    const user = await prisma.user.findUnique({ where: { id: sub } });
    if (!user) {
      // 토큰의 sub가 username/email이라면 여기서 매핑해야 합니다.
      // 예: const user = await prisma.user.findUnique({ where: { username: sub }});
      return res.status(401).json({ error: "User not found for token" });
    }

    // ✅ Product 확인(활성/기간)
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) return res.status(404).json({ error: "Product not found" });
    if (!product.active) {
      return res.status(400).json({ error: "Product is inactive" });
    }

    // startAt 결정 & 검증
    const startAt = startAtRaw != null ? new Date(startAtRaw) : new Date();
    if (isNaN(startAt.getTime())) {
      return res.status(400).json({ error: "Invalid startAt" });
    }

    // expireAt = startAt + validityDays
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const expireAt = new Date(
      startAt.getTime() + product.validityDays * MS_PER_DAY
    );

    // ✅ connect로 생성 (외래키 참조 안전)
    const created = await prisma.policy.create({
      data: {
        startAt,
        expireAt,
        user: { connect: { id: user.id } },
        product: { connect: { id: product.id } },
        escrowId: escrowId ?? null, // ✅ 여기 추가
      },
      include: {
        product: true,
        user: { select: { id: true, name: true } },
      },
    });

    return res.status(201).json(toPolicyDTO(created));
  } catch (e) {
    next(e);
  }
});

// 리스트
policyRouter.get("/", async (req: AuthedRequest, res, next) => {
  try {
    const userId = req.user!.sub;

    const statusParam = (req.query.status as string | undefined)?.trim();
    const statuses = statusParam
      ? (statusParam
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean) as PolicyStatus[])
      : undefined;

    const take = Math.min(
      Math.max(parseInt(String(req.query.take ?? "20"), 10) || 20, 1),
      100
    );
    const skip = Math.max(parseInt(String(req.query.skip ?? "0"), 10) || 0, 0);

    const rows: PolicyRow[] = await prisma.policy.findMany({
      where: { userId, ...(statuses ? { status: { in: statuses } } : {}) },
      orderBy: { createdAt: "desc" },
      take,
      skip,
      include: {
        product: true,
        user: { select: { id: true, name: true } },
      },
    });

    const safe = rows.map(toPolicyDTO);
    res.json(safe);
  } catch (e) {
    next(e);
  }
});

// 단건
policyRouter.get("/:id", async (req: AuthedRequest, res, next) => {
  try {
    const userId = req.user!.sub;
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "id required" });

    const row = await prisma.policy.findUnique({
      where: { id },
      include: {
        product: true,
        user: { select: { id: true, name: true } },
      },
    });

    if (!row || row.userId !== userId)
      return res.status(404).json({ error: "Not found" });

    res.json(toPolicyDTO(row));
  } catch (e) {
    next(e);
  }
});
