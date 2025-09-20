import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Claim } from "@/api/axios";
import { cancelEscrow, finishEscrow } from "@/api/xrpl";

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? String(iso) : d.toLocaleString();
}

const statusStyle: Record<Claim["status"], string> = {
  SUBMITTED: "border-slate-200 bg-slate-50 text-slate-700",
  APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  REJECTED: "border-red-200 bg-red-50 text-red-700",
  PAID: "border-emerald-200 bg-emerald-50 text-emerald-700",
  MANUAL: "border-amber-200 bg-amber-50 text-amber-700",
};

type Props = { claim: Claim };

export default function ClaimCard({ claim }: Props) {
  const canAct = useMemo(() => {
    return (
      claim.status !== "PAID" &&
      (claim.aiDecision === "Declined" ||
        claim.aiDecision === "Unknown" ||
        claim.aiDecision === "Escalate to human")
    );
  }, [claim.status, claim.aiDecision]);

  const onAccept = async () => {
    await finishEscrow(claim.policyEscrowId);
  };
  const onDecline = async () => {
    await cancelEscrow(claim.policyEscrowId);
  };

  return (
    <div className="flex flex-col gap-6 border-foreground rounded-md p-5 shadow-md ">
      {/* Header: 왼쪽 제품/클레임 요약, 오른쪽 상태 배지(줄바꿈 없이) */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5 items-start min-w-0">
          <div className="text-base font-semibold truncate">
            {claim.productName}
          </div>
          <div className="text-xs text-muted-foreground">{claim.id}</div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Badge
            variant="outline"
            className={`h-6 ${statusStyle[claim.status]}`}
          >
            {claim.status}
          </Badge>
        </div>
      </div>

      <div className="flex flex-col gap-2 text-xs">
        <div className="flex justify-between">
          <div className="text-muted-foreground">Incident</div>
          <div className="truncate">{fmtDate(claim.incidentDate)}</div>
        </div>

        <div className="flex justify-between">
          <div className="text-muted-foreground">Payout</div>
          <div>{claim.payoutDropsSnapshot} KRW</div>
        </div>

        <div className="flex justify-between">
          <div className="text-muted-foreground">AI Decision</div>
          <div className="truncate">{claim.aiDecision ?? "—"}</div>
        </div>

        <div className="flex justify-between">
          <div className="text-muted-foreground">Details</div>
          <div className="max-h-10 overflow-hidden text-ellipsis whitespace-pre-wrap">
            {claim.details || "—"}
          </div>
        </div>

        {canAct && (
          <div className="pt-1 flex justify-end gap-1">
            <Button
              size="sm"
              onClick={onAccept}
              className="bg-green-600 hover:bg-green-600/90"
            >
              Accept
            </Button>
            <Button
              size="sm"
              onClick={onDecline}
              className="bg-red-600 hover:bg-red-600/90"
            >
              Decline
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
