import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useSignup } from "@/contexts/SignupContext";

export default function StepNameEmail() {
  const nav = useNavigate();
  const { state, set } = useSignup();

  const onNext = () => {
    nav("/signup/account");
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          placeholder="Name"
          value={state.name}
          onChange={(e) => set("name", e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          placeholder="Email"
          value={state.email}
          onChange={(e) => set("email", e.target.value)}
        />
      </div>
      <Button className="w-full" onClick={onNext}>
        Next
      </Button>
    </div>
  );
}
