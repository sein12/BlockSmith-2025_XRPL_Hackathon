import { Badge } from "@/components/ui/badge";
import type { ClaimStatus } from "@/api/claim";

export default function BadgeStatus({ status }: { status: ClaimStatus }) {
  const variant =
    status === "APPROVED"
      ? "default"
      : status === "REJECTED"
      ? "destructive"
      : status === "PAID"
      ? "secondary"
      : status === "MANUAL"
      ? "outline"
      : "outline"; // SUBMITTED etc.

  return <Badge variant={variant as any}>{status}</Badge>;
}
