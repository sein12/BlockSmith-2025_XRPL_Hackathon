import { Link } from "react-router-dom";
import type { Policy } from "@/types/contract";
import { Badge } from "../ui/badge";

export default function PolicyCarouselCard({
  policy,
  link,
}: {
  policy: Policy;
  link: string;
}) {
  const expiredDate = new Date(policy.expireAt).toISOString().slice(0, 10);

  return (
    <Link to={link} className="snap-center shrink-0 w-[335px]">
      <div className="border border-gray-300 shadow-md rounded-md bg-white p-4">
        <div className="flex items-center justify-between">
          <div className="text-[16px] font-semibold tracking-[-0.25px]">
            {policy.product?.name}
          </div>
          <Badge className="bg-green-600/60 text-white"> {policy.status}</Badge>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-y-1.5 text-sm">
          <div className="text-neutral-300">Insured</div>
          <div className="text-black">{policy.user?.name}</div>

          <div className="text-neutral-300">Premium</div>
          <div className="text-black">
            {policy.product?.premiumDrops || 0} KRW
          </div>

          <div className="text-neutral-300">Expiration Date</div>
          <div className="text-black">{expiredDate}</div>
        </div>
      </div>
    </Link>
  );
}
