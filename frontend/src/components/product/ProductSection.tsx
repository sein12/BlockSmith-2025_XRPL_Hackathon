import { cn } from "@/lib/utils"; // shadcn 템플릿 기준, 없으면 className join 유틸 직접 구현
import React from "react";

/** 상세 페이지 카드형 섹션 (시안 톤: 연한 테두리 + 약한 섀도 + 둥근 8px) */
export default function ProductSection({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-lg border border-[rgba(198,198,198,0.98)]",
        "shadow-[0_0_4px_rgba(0,0,0,0.25)] bg-white"
      )}
    >
      <div className="px-4 pt-3 pb-2 text-[14px] font-semibold tracking-[-0.25px]">
        {title}
      </div>
      <div className="px-4 pb-4 text-sm">{children}</div>
    </section>
  );
}
