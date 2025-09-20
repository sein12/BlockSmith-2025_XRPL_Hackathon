import ClaimCard from "./ClaimCard";
import type { Claim } from "@/api/axios";

type Props = { items: Claim[] };

export default function ClaimList({ items }: Props) {
  if (!items.length) {
    return (
      <div className="text-sm text-muted-foreground border rounded-md p-6 border-dashed">
        데이터가 없습니다. 로그인 후 “Fetch Claims”를 눌러 불러오세요.
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((c) => (
        <ClaimCard key={c.id} claim={c} />
      ))}
    </div>
  );
}
