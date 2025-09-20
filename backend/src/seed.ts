// scripts/seed_products.ts (예시)
// 프로젝트 구조에 맞게 경로만 조정하세요.
import { prisma } from "./repositories/prisma";
import { Prisma, ProductCategory } from "@prisma/client";

type Feature = { title: string; body: string };

async function main() {
  // 필요 시 초기화
  // await prisma.product.deleteMany();

  const products: Array<{
    name: string;
    premiumDrops: number;
    payoutDrops: number;
    coverageSummary: string;
    shortDescription: string;
    features: Feature[];
    descriptionMd: string;
    category: ProductCategory;
    validityDays: number;
  }> = [
    {
      name: "p.name,",
      premiumDrops: 1000,
      payoutDrops: 1000,
      coverageSummary: "p.coverageSummary",
      shortDescription: "p.shortDescription",
      descriptionMd: "p.descriptionMd",
      features: [
        { title: "Feature 1", body: "Description of feature 1" },
        { title: "Feature 2", body: "Description of feature 2" },
      ],
      category: "DEVICE",
      validityDays: 30,
    },
  ];

  for (const p of products) {
    await prisma.product.create({
      data: {
        name: p.name,
        premiumDrops: p.premiumDrops,
        payoutDrops: p.payoutDrops,
        coverageSummary: p.coverageSummary,
        shortDescription: p.shortDescription,
        descriptionMd: p.descriptionMd,
        features: p.features as unknown as Prisma.JsonArray,
        category: p.category,
        validityDays: p.validityDays,
        active: true,
      },
    });
  }

  console.log(`✅ Seeded ${products.length} products`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
