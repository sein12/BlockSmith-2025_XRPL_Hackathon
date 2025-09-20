import { Outlet, useLocation } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import MobileShell from "@/components/layout/MobileShell";

const steps = [
  "/signup",
  "/signup/account",
  "/signup/wallet",
  "/signup/complete",
];

export default function SignupLayout() {
  const loc = useLocation();
  const idx = Math.max(0, steps.indexOf(loc.pathname));
  const percent = ((idx + 1) / steps.length) * 100;

  return (
    <MobileShell showHeader={true} title="Sign Up">
      <div className="flex flex-col gap-4 min-h-screen">
        <div className="w-full pt-4 px-4">
          <Progress className="h-1" value={percent} />
        </div>

        <div className="w-full max-w-[420px] max p-4">
          <Outlet />
        </div>
      </div>
    </MobileShell>
  );
}
