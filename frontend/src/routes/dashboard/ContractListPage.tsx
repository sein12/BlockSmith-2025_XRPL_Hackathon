import { useEffect, useState } from "react";
import type { Policy } from "@/types/contract";
import { fetchMyPolicies } from "@/api/contract";
import EmptyState from "@/components/common/EmptyState";
import PolicyCarouselCard from "@/components/contract/PolicyCarouselCard";
import { useAuth } from "@/contexts/AuthContext";

export default function ContractListPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const list = await fetchMyPolicies(); // GET /policies
        if (mounted) setPolicies(list ?? []);
      } catch (e: any) {
        if (mounted)
          setErr(e?.response?.data?.error ?? "Failed to load contracts.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (err) return <EmptyState title="Error" desc={err} />;

  if (!policies.length) {
    return (
      <EmptyState
        title="No contracts yet"
        desc="Browse products and enroll to get covered."
      />
    );
  }

  return (
    <div className="px-5 pt-16 space-y-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">My Contracts</h1>
        <span className="text-gray-400">Browse your insurance contracts.</span>
      </div>
      <div className="flex flex-col gap-2">
        {policies.map((p) => (
          <div key={p.id}>
            <PolicyCarouselCard
              policy={p}
              link={`/dashboard/contracts/${p.id}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="mx-auto h-[121px] w-[335px] rounded-lg bg-muted animate-pulse" />
  );
}
