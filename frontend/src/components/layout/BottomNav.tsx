// BottomNav.tsx
import { NavLink } from "react-router-dom";
import { Home, Package, FileText, User, ClipboardPen } from "lucide-react";

interface Item {
  to: string;
  icon: React.ReactNode;
  label: string;
  end?: boolean;
}

const items: Item[] = [
  { to: "/dashboard", icon: <Home size={24} />, label: "Home", end: true }, // ✅ end
  { to: "/dashboard/products", icon: <Package size={24} />, label: "Products" },
  {
    to: "/dashboard/claims/list",
    icon: <ClipboardPen size={24} />,
    label: "Claims",
  },
  {
    to: "/dashboard/contracts",
    icon: <FileText size={24} />,
    label: "Contracts",
  },
  { to: "/dashboard/profile", icon: <User size={24} />, label: "Profile" },
];

export default function BottomNav() {
  return (
    <nav className="flex justify-between items-center border-t-2 rounded-t-md bg-white px-10 py-3">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            `flex flex-col items-center gap-1.5 text-xs font-medium transition-colors ${
              isActive
                ? "text-blue-600 font-bold"
                : "text-gray-500 hover:text-gray-700"
            }`
          }
        >
          {item.icon}
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
