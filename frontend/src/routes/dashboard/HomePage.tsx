import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { fetchProducts } from "@/api/product";
import { fetchMyPolicies } from "@/api/contract";
import type { Product } from "@/types/product";
import type { Policy } from "@/types/contract";
import QuickTile from "@/components/common/QuickTile";
import PolicyCarousel from "@/components/contract/PolicyCarousel";
import { FileText, ClipboardPen } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import ProductListItem from "@/components/product/ProductListItem";

export default function HomePage() {
  const nav = useNavigate();
  const { user } = useAuth();

  const [products, setProducts] = useState<Product[] | null>(null);
  const [policies, setPolicies] = useState<Policy[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const [pRes, cRes] = await Promise.all([
          fetchProducts(),
          fetchMyPolicies(),
        ]);
        if (!mounted) return;
        setProducts(pRes);
        setPolicies(cRes);
      } catch (e: any) {
        setErr(e?.response?.data?.error ?? "데이터를 불러오지 못했습니다.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const policyCount = policies?.length ?? 0;

  return (
    <div className="space-y-4">
      <div className="space-y-4 px-6 pt-12 pb-6 bg-gray-300">
        {/* 상단 인사 */}
        <section>
          <h2 className="text-xl font-semibold">{user?.name}</h2>
          <p className="text-lg">
            <span className="font-semibold text-sky-600 underline-offset-4">
              {policyCount}
            </span>{" "}
            active policy{policyCount === 1 ? "" : "ies"} found.
          </p>
        </section>

        {/* 계약 캐러셀 */}
        <section>
          <PolicyCarousel
            policies={policies ?? []}
            loading={loading}
            error={err}
            insuredName={user?.username}
          />
        </section>
      </div>

      <div className="space-y-6 px-4">
        {/* 자주 쓰는 메뉴 */}
        <section className="space-y-3">
          <h3 className="text-lg">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <QuickTile
              label="Claim Insurance"
              icon={<ClipboardPen className="w-5 h-5" />}
              onClick={() => nav("/dashboard/claims")}
            />
            <QuickTile
              label="View Contracts"
              icon={<FileText className="w-5 h-5" />}
              onClick={() => nav("/dashboard/contracts")}
            />
          </div>
        </section>

        {/* 추천 상품 */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg">Products</h3>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-0 text-gray-500"
            >
              <Link to="/dashboard/products">View All</Link>
            </Button>
          </div>

          {loading ? (
            <div className="grid gap-3">
              <SkeletonBox />
              <SkeletonBox />
              <SkeletonBox />
            </div>
          ) : products && products.length > 0 ? (
            <div className="grid gap-2">
              {products.slice(0, 3).map((p) => (
                <ProductListItem key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-6 text-center text-sm text-muted-foreground">
                No products to display.
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}

function SkeletonBox() {
  return <div className="h-[66px] w-full rounded-lg bg-muted animate-pulse" />;
}
