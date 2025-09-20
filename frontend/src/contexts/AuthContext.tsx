import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { LoginBody, SignupBody } from "@/api/auth";
import { login as apiLogin, signup as apiSignup } from "@/api/auth";

type User = {
  id: string;
  name: string;
  username: string;
  email?: string | null;
  walletAddr?: string | null;
};

type AuthCtx = {
  user: User | null;
  isAuthed: boolean;
  signup: (body: SignupBody) => Promise<void>;
  login: (body: LoginBody) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("authUser");
    if (raw) setUser(JSON.parse(raw));
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      isAuthed: !!user,
      signup: async (body) => {
        await apiSignup(body);
      },
      login: async (body) => {
        const { token, refreshToken, user } = await apiLogin(body);
        localStorage.setItem("accessToken", token);
        localStorage.setItem("refreshToken", refreshToken);
        localStorage.setItem("authUser", JSON.stringify(user));
        setUser(user);
      },
      logout: () => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("authUser");
        setUser(null);
      },
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
