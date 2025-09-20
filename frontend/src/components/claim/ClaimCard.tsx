import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import type { Claim, ClaimStatus } from "@/api/claim";
import BadgeStatus from "./BadgeStatus";
import { Separator } from "../ui/separator";

export default function ClaimCard({ claim }: { claim: Claim }) {
  const created = safeFormat(claim.createdAt);

  return (
    <Link to={`/dashboard/claims/${claim.id}`}>
      <div className="border rounded-md shadow-md flex flex-col gap-2 p-4">
        <div className="flex items-center justify-between">
          <BadgeStatus status={claim.status as ClaimStatus} />
          <div className="text-sm text-muted-foreground">
            Created: {created}
          </div>
        </div>
        <div className="space-y-2">
          <div>
            <h3 className="text-lg font-semibold">{claim.productName}</h3>
            <p className="text-sm text-muted-foreground">
              {claim.productShortDescription}
            </p>
          </div>

          <Separator />
          <p className="text-sm text-muted-foreground">
            Insurance Payout: {claim.productPayoutDrops} KRW
          </p>
        </div>
      </div>
    </Link>
  );
}

function safeFormat(iso: string | null | undefined) {
  if (!iso) return "-";
  try {
    return format(parseISO(iso), "yyyy-MM-dd HH:mm");
  } catch {
    return iso as string;
  }
}
