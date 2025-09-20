import { Link } from "react-router-dom";
import type { Product } from "@/types/product";

export default function ProductListItem({ product }: { product: Product }) {
  return (
    <Link
      to={`/dashboard/products/${product.id}`}
      className="w-full rounded-md border border-gray-300 shadow-sm px-4 py-3"
    >
      <div className="flex flex-col gap-1 ">
        <div className="text-xs text-gray-400">{product.category}</div>
        <div className="flex justify-between items-center">
          <div className="flex flex-col gap-1">
            <div className="text-sm text-black">{product.name}</div>
            <div className="w-64 text-xs leading-4 text-gray-400 truncate">
              {product.coverageSummary}
            </div>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <div className="text-sm">{product.premiumDrops}</div>
            <div className="text-xs text-gray-400">
              {product.validityDays} days
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
