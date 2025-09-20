// src/routes/dashboard/claim/ClaimStepLayout.tsx
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export default function ClaimStepLayout({
  primaryLabel,
  onPrimary,
  disabled,
  onBack, // ← 추가: 이전 단계로
  children,
}: {
  primaryLabel: string;
  onPrimary: () => void;
  disabled?: boolean;
  onBack?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="px-5 pt-16 space-y-6">
      <header className="w-full max-w-[420px] flex items-center gap-2">
        <Button
          size="icon"
          variant="ghost"
          onClick={onBack}
          aria-label="goBack"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>

        <h1 className="text-xl font-semibold">Claim Insurance</h1>
      </header>

      {/* 본문 */}
      <div className="grid gap-4">{children}</div>

      <Button
        className="w-full h-12"
        size="lg"
        onClick={onPrimary}
        disabled={disabled}
      >
        {primaryLabel}
      </Button>
    </div>
  );
}
