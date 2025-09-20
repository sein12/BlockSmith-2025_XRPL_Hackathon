import { useEffect, useRef, useState } from "react";
import type { Policy } from "@/types/contract";
import EmptyState from "@/components/common/EmptyState";
import PolicyCarouselCard from "./PolicyCarouselCard";

export default function PolicyCarousel({
  policies,
  loading,
  error,
  insuredName,
}: {
  policies: Policy[];
  loading: boolean;
  error?: string;
  insuredName?: string | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => {
      const itemW = 335 + 12; // 카드 너비 + gap
      setActive(Math.round(el.scrollLeft / itemW));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex gap-3 overflow-x-auto no-scrollbar">
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <Dots count={2} active={0} />
      </div>
    );
  }

  if (error) return <EmptyState title="Error" desc={error} />;

  if (!policies.length) {
    return (
      <EmptyState
        title="No policies yet"
        desc="Join a product to get covered."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div
        ref={ref}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory no-scrollbar"
      >
        {policies.map((p) => (
          <PolicyCarouselCard
            key={p.id}
            policy={p}
            link={`/dashboard/contracts/${p.id}`}
          />
        ))}
      </div>
      <Dots count={policies.length} active={active} />
    </div>
  );
}

function Dots({ count, active }: { count: number; active: number }) {
  if (count <= 1) return null;
  return (
    <div className="flex items-center gap-2 justify-center">
      {Array.from({ length: count }).map((_, i) =>
        i === active ? (
          <div key={i} className="w-3 h-1.5 rounded-full bg-[#0F172A]" />
        ) : (
          <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#D9D9D9]" />
        )
      )}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="w-[335px] h-[121px] rounded-lg bg-muted animate-pulse" />
  );
}
