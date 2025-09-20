import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/common/EmptyState";
import type { Product } from "@/types/product";
import type { Policy } from "@/types/contract";
import { fetchProducts } from "@/api/product";
import { createPolicy } from "@/api/contract"; // ✅ implement if not existing
import { createEscrow } from "@/api/xrpl"; // ✅ implement if not existing
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();

  const [products, setProducts] = useState<Product[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetchProducts(); // no single API → find in list
        if (!mounted) return;
        setProducts(res ?? []);
      } catch (e: any) {
        setErr(e?.response?.data?.error ?? "Failed to load product.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const product = useMemo(
    () => products?.find((p) => String(p.id) === String(id)) ?? null,
    [products, id]
  );

  const onConfirmJoin = useCallback(async () => {
    if (!product) return;
    try {
      setSubmitting(true);
      const escrow = await createEscrow(product.premiumDrops);
      const _policy: Policy = await createPolicy(product.id, escrow.escrow_id);
      // navigate to contract list after joining
      nav("/dashboard/contracts", { replace: true });
    } catch (e: any) {
      alert(e?.response?.data?.error ?? "Failed to join the product.");
    } finally {
      setSubmitting(false);
      setConfirmOpen(false);
    }
  }, [product, nav]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-5 w-28 rounded bg-muted animate-pulse" />
        <div className="h-[120px] rounded-lg bg-muted animate-pulse" />
        <div className="h-[160px] rounded-lg bg-muted animate-pulse" />
        <div className="h-[120px] rounded-lg bg-muted animate-pulse" />
      </div>
    );
  }

  if (err) return <EmptyState title="Error" desc={err} />;
  if (!product) return <EmptyState title="Product not found" />;

  return (
    <div className="px-5 pt-16 space-y-6">
      <div className="space-y-1">
        <Badge>{product.category}</Badge>
        <h1 className="text-xl font-semibold">{product.name}</h1>
        <p className="text-xs text-gray-400">{product.coverageSummary}</p>
      </div>

      <div className="flex flex-col gap-4 border border-gray-200 rounded-md p-4 ">
        <span className="text-sm text-black">{product.shortDescription}</span>

        <Separator />

        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-bold">Premium Drops</span>
            <span className=" text-sm">{product.premiumDrops} KRW</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-bold">Payout Drops</span>
            <span className=" text-sm">{product.payoutDrops} KRW</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-bold">Validity Days</span>
            <span className=" text-sm">{product.validityDays} days</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-bold">Description</span>
            {product.features.map((item, index) => (
              <span key={index} className="text-sm">
                {index + 1}. {item.body}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="pt-2">
        <Button
          className="w-full h-12"
          onClick={() => setConfirmOpen(true)}
          disabled={submitting}
        >
          {submitting ? "Processing..." : "Join Insurance"}
        </Button>
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Confirm Insurance Enrollment"
        description={`Do you want to enroll in "${product.name}"?`}
        onConfirm={onConfirmJoin}
        disabled={submitting}
      />
    </div>
  );
}
