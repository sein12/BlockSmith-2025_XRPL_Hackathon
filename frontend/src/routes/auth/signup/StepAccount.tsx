import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useSignup } from "@/contexts/SignupContext";

export default function StepAccount() {
  const nav = useNavigate();
  const { state, set } = useSignup();
  const [err, setErr] = useState("");

  const onNext = async () => {
    setErr("");
    if (state.password !== state.passwordConfirm) {
      setErr("비밀번호가 일치하지 않습니다.");
      return;
    }
    nav("/signup/wallet");
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="username">ID</Label>
        <Input
          id="username"
          placeholder="ID"
          value={state.username}
          onChange={(e) => set("username", e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="Password"
          value={state.password}
          onChange={(e) => set("password", e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password2">Confirm Password</Label>
        <Input
          id="password2"
          type="password"
          placeholder="Rewrite password"
          value={state.passwordConfirm}
          onChange={(e) => set("passwordConfirm", e.target.value)}
        />
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}
      <Button className="w-full" onClick={onNext}>
        Next
      </Button>
    </div>
  );
}
