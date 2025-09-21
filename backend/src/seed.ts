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
      name: "Airplain Delay Insurance",
      premiumDrops: 1000,
      payoutDrops: 1000,
      coverageSummary: "Coverage summary for Airplain Delay Insurance",
      shortDescription: "Short description for Airplain Delay Insurance",
      descriptionMd: "#Detailed description for Airplain Delay Insurance",
      features: [
        { title: "Feature 1", body: "Description of feature 1" },
        { title: "Feature 2", body: "Description of feature 2" },
      ],
      category: "DEVICE",
      validityDays: 30,
    },
    {
      name: "Right Ankle Micro-Fracture Plan",
      premiumDrops: 2000,
      payoutDrops: 1500,
      coverageSummary:
        "Pays a fixed benefit only for a medically confirmed non-displaced fracture of the RIGHT lateral malleolus (ICD-10 S82.6). Optional right ankle sprain (S93.4). Imaging within 72h.",
      shortDescription: `Ultra-specific micro-coverage for a commuter-type ankle injury. 
Trigger: non-displaced fracture of the RIGHT lateral malleolus (ICD-10 S82.6); optional associated right ankle sprain (S93.4).
Verification: radiology (X-ray; CT if required) within 72 hours, outpatient/ED visit acceptable.
Exact-match rules speed adjudication; if side/site/timing/diagnosis deviate, no benefit is payable. Includes lump-sum fracture benefit with add-ons for immobilization, outpatient visits (30 days), and diagnostic imaging (within 72h).`,
      descriptionMd: `# “Right Lateral Malleolus Only” Micro-Injury Plan
*A narrowly scoped personal accident policy that pays **only** for the injury profile in the example certificate.*

## Product Snapshot
- **Coverage Trigger:** A medically confirmed **non-displaced fracture of the right lateral malleolus** (ICD-10 **S82.6**, right), optionally accompanied by a **right lateral ankle sprain** (ICD-10 **S93.4**).
- **Cause of Loss:** **Slip-and-fall** leading to ankle inversion (non-occupational).
- **Verification Window:** Imaging (X-ray; CT if required) performed **within 72 hours** of the incident.
- **Visit Type:** Emergency or outpatient; inpatient **not required**.
- **Territory:** Claims arising within the policy territory (TBD in contract).
- **Audience:** Commuters and everyday walkers seeking ultra-specific, low-premium coverage.

—

## What’s Covered (and nothing else)
1. **Primary Diagnosis Match (mandatory)**
   - **Non-displaced fracture** of the **right** lateral malleolus of the fibula
   - ICD-10: **S82.6** (right-side specification must be evident in the record)
2. **Associated Diagnosis (optional)**
   - Right ankle sprain involving the lateral ligament complex
   - ICD-10: **S93.4** (if present)
3. **Clinical Evidence**
   - Physician exam notes aligning with inversion injury (tenderness/swelling over lateral malleolus; intact neurovascular status)
   - **Radiology report** confirming non-displaced fracture (follow-up film acceptable)
4. **Treatment Evidence**
   - Acute immobilization (posterior splint → below-knee cast or functional brace), cryotherapy/elevation, analgesics as indicated

> If **any** element deviates (e.g., left ankle, displaced fracture, tibial involvement, high-energy trauma, occupational injury, or no imaging confirmation within 72h), **no benefit is payable**.

—

## Benefit Schedule (example amounts)
> Actual limits/deductibles may be customized by the insurer; values below illustrate the intended structure.

| Benefit | Trigger | Limit |
|—|—|—|
| **Lump-Sum Fracture Benefit** | Verified **non-displaced right lateral malleolus fracture (S82.6)** | **KRW 500,000** (once per policy term) |
| **Casting/Immobilization Add-On** | Application of splint/cast/functional brace documented | **KRW 100,000** |
| **Outpatient Care Reimbursement** | ED/clinic visits related to the covered injury within **30 days** of incident | Up to **KRW 150,000** in aggregate |
| **Diagnostic Imaging Reimbursement** | Radiology (X-ray; CT if clinically required) performed within **72h** | Up to **KRW 100,000** |
| **Incapacity Daily Stipend (optional rider)** | Physician-certified **total incapacity** for up to **14 days** | **KRW 20,000/day** (cap: 14 days) |

—

## Exact Match Criteria (all must be satisfied)
1. **Event**: Non-occupational slip-and-fall with ankle inversion.
2. **Timing**: Injury date/time documented; imaging completed within **72h**.
3. **Side & Site**: **Right** lateral malleolus (fibula); **non-displaced**.
4. **Documentation**:
   - **Injury Diagnosis Certificate** (the provided template), listing:
     - Primary Dx: *Nondisplaced fracture of lateral malleolus (right)*
     - ICD-10: **S82.6** (right)
     - Secondary Dx (if applicable): *Right ankle sprain*, ICD-10 **S93.4**
   - **Radiology report** confirming non-displaced fracture
   - **Treatment record** (splint/cast/brace)
   - **Receipts**: itemized medical bill + detailed statement
5. **Exclusions Check**: None of the exclusions below apply.

—

## Key Exclusions (non-exhaustive)
- Left ankle injuries; medial malleolus, bimalleolar, trimalleolar, tibial plafond, talar, calcaneal, or midfoot fractures
- **Displaced** fractures; growth-plate injuries; stress fractures
- Ligament tears requiring surgical repair; tendon ruptures; chronic or degenerative conditions
- Motor-vehicle collisions, sports competitions requiring separate cover, assault, or high-energy mechanisms
- **Work-related** injuries, professional sports, military duty
- Intoxication, illegal acts, self-harm, fraud
- Care outside the territory or beyond the defined time windows

—

## Claim Documents (required)
1. **Injury Diagnosis Certificate (for Insurance Claim)** — using the exact template/example
2. **Radiology report** (X-ray; CT if applicable)
3. **Itemized receipt & detailed statement** (treatment codes, materials, medications)
4. **Treatment notes** (splint/cast/brace application)
5. **Identity & policy proof**; **personal-data consent** (insurer form)

—

## How to Claim
1. **Within 7 days** of the incident, notify the insurer and schedule imaging (if not already done).
2. Obtain the **Injury Diagnosis Certificate** and required supporting documents.
3. Submit via portal/app or branch. Keep originals for **90 days** after settlement.
4. Insurer validates **exact-match criteria** → adjudication → benefit payout.

—

## Policy Mechanics
- **Term:** 1 year (claims for events occurring during the active term only)
- **Waiting Period:** None (accidental injury)
- **Renewability:** Annually renewable at insurer’s discretion
- **Benefit Frequency:** Once per policy term per insured (unless otherwise endorsed)
- **Coordination:** No coordination of benefits for the lump-sum; reimbursements are excess of other collectible insurance (if any)

—

## Definitions (plain language)
- **Non-displaced fracture:** Bone crack/break without loss of normal alignment.
- **Lateral malleolus:** Bony prominence on the **outer** side of the ankle (distal fibula).
- **Inversion injury:** Foot turns inward, stressing the lateral structures.
- **Total incapacity (for stipend):** Physician-certified inability to perform usual work/activities.

—

## Why This Exists
A **micro-coverage** design keeps premiums low by paying **only** when the clinical picture precisely matches the defined, common commuter injury—speeding up adjudication and reducing disputes.

> **Important:** This is a product description, not a policy. Contract wording, endorsements, limits, and exclusions in the issued policy **govern**.
`,
      features: [
        {
          title: "Exact Trigger Only",
          body: "Pays only for a non-displaced fracture of the RIGHT lateral malleolus (ICD-10 S82.6); optional right ankle sprain (S93.4).",
        },
        {
          title: "72-Hour Imaging Window",
          body: "Radiology (X-ray; CT if clinically required) must be performed within 72 hours of the incident for eligibility.",
        },
        {
          title: "Simple Proof of Treatment",
          body: "Splint/cast/functional brace, plus standard acute care (RICE/analgesics) accepted as treatment evidence.",
        },
        {
          title: "Fast Adjudication",
          body: "Exact-match criteria minimize disputes and accelerate payout decisions.",
        },
        {
          title: "Clear Benefits",
          body: "Lump-sum fracture benefit, immobilization add-on, outpatient reimbursement (30 days), and imaging reimbursement (within 72h).",
        },
        {
          title: "Key Exclusions",
          body: "Left ankle, displaced fractures, tibial or other ankle/foot fractures, high-energy/occupational injuries, or timing/documentation gaps.",
        },
        {
          title: "Simple Claim Steps",
          body: "Notify within 7 days, obtain Injury Diagnosis Certificate + radiology report + receipts, submit via portal/app.",
        },
      ],
      category: "HEALTH" as const, // ProductCategory.HEALTH
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
