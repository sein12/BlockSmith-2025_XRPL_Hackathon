import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchClaims } from "@/api/claim";
import type { Claim, ClaimListResponse } from "@/api/claim";
import { Button } from "@/components/ui/button";
import ClaimListSkeleton from "@/components/claim/ClaimListSkeleton";
import ClaimCard from "@/components/claim/ClaimCard";

export default function ClaimListPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");
  const [items, setItems] = useState<Claim[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const data: ClaimListResponse = await fetchClaims();
        if (!mounted) return;
        setItems(data.items ?? []);
      } catch (e: any) {
        setErr(e?.response?.data?.error ?? "Failed to load claims.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return <ClaimListSkeleton />;

  if (err) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center space-y-4">
        <p className="text-sm text-red-500">{err}</p>
        <Button asChild variant="outline">
          <Link to="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center space-y-3">
        <h2 className="text-xl font-semibold">No claims submitted</h2>
        <p className="text-sm text-muted-foreground">
          To start a claim, go to a policy detail page and click “Start Claim”.
        </p>
        <Button asChild className="mt-2">
          <Link to="/dashboard/contracts">View My Policies</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="px-5 pt-16 space-y-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">My Claims</h1>
        <span className="text-gray-400">Browse your insurance claims.</span>
      </div>

      <div className="flex flex-col gap-2">
        {items.map((c) => (
          <ClaimCard key={c.id} claim={c} />
        ))}
      </div>
    </div>
  );
}
