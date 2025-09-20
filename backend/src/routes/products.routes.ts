import { Router } from "express";
import { prisma } from "../repositories/prisma";
import { authGuard } from "../middlewares/authGuard";
import type { Product as ProductModel } from "@prisma/client";

export const productRouter = Router();
productRouter.use(authGuard);

// BigInt → string으로 바꿔서 내보내는 DTO
type ProductDTO = Omit<ProductModel, "premiumDrops" | "payoutDrops"> & {
  premiumDrops: string;
  payoutDrops: string;
};

function toProductDTO(p: ProductModel): ProductDTO {
  return {
    ...p,
    premiumDrops: p.premiumDrops.toString(),
    payoutDrops: p.payoutDrops.toString(),
  };
}

productRouter.get("/", async (_req, res, next) => {
  try {
    const list = await prisma.product.findMany({
      where: { active: true },
      orderBy: { createdAt: "desc" },
    });
    const safe = list.map(toProductDTO);
    res.json(safe);
  } catch (e) {
    next(e);
  }
});

productRouter.get("/:id", async (req, res, next) => {
  try {
    const p = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!p) return res.status(404).json({ error: "Not found" });
    res.json(toProductDTO(p));
  } catch (e) {
    next(e);
  }
});
