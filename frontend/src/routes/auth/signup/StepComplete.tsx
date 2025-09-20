import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CircleCheck } from "lucide-react";

export default function StepComplete() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6">
      <CircleCheck size={72} />
      <div className="flex flex-col gap-2 text-center">
        <h2 className="text-xl font-semibold">Sign-up Complete!</h2>
        <p className="text-muted-foreground">
          You can now start using the service.
        </p>
      </div>
      <Button asChild className="w-full">
        <Link to="/">Go to Login</Link>
      </Button>
    </div>
  );
}
