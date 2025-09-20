// src/routes/MyPage.tsx
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  fetchMyCredentialsBySeed,
  type CredentialObject,
} from "@/api/credential";
import { useSignup } from "@/contexts/SignupContext";
import { getClientBalance } from "@/api/xrpl";
import { Separator } from "@/components/ui/separator";

/** hex → utf8 (safe; no Buffer dependency) */
function hexToUtf8Safe(hex?: string) {
  if (!hex) return "";
  try {
    const clean = hex.replace(/^0x/i, "");
    if (clean.length % 2 !== 0) return hex;
    const bytes = new Uint8Array(clean.length / 2);
    for (let i = 0; i < clean.length; i += 2) {
      bytes[i / 2] = parseInt(clean.slice(i, i + 2), 16);
    }
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  } catch {
    return hex;
  }
}

export default function Profile() {
  const { user } = useSignup();

  const [items, setItems] = useState<CredentialObject[] | null>(null);
  const [credLoading, setCredLoading] = useState(false);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [err, setErr] = useState<string>("");

  const [balance, setBalance] = useState<number>(0);

  const loadBalance = async () => {
    try {
      setBalanceLoading(true);
      const res = await getClientBalance();
      setBalance(res.client_balance_xrp);
    } catch {
      // 잔액 조회 실패는 치명적이지 않으므로 UI만 유지
    } finally {
      setBalanceLoading(false);
    }
  };

  const loadCredentials = async (silent = false) => {
    if (!user) {
      if (!silent) setErr("Login is required.");
      return;
    }
    if (!user.walletAddr || !user.userSeed) {
      if (!silent) setErr("No wallet/seed found in the current demo.");
      return;
    }

    setErr("");
    setItems(null);
    setCredLoading(true);
    try {
      // ⚠️ Demo only: server checks using seed
      const res = await fetchMyCredentialsBySeed(user.userSeed);
      setItems(res.items ?? []);
    } catch (e: any) {
      setErr(e?.response?.data?.error ?? "An error occurred during lookup.");
    } finally {
      setCredLoading(false);
    }
  };

  // 최초 진입 시 자동 조회
  useEffect(() => {
    loadBalance();
  }, []);
  useEffect(() => {
    // user/seed가 준비되면 자동 조회
    if (user?.userSeed) {
      loadCredentials(true);
    }
  }, [user?.userSeed]);

  return (
    <div className="px-5 pt-16 space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">My Profile</h1>
        <p className="text-sm text-muted-foreground">
          Manage your wallet and credentials.
        </p>
      </header>

      {/* Wallet balance */}
      <section className="rounded-md border p-4 bg-card text-card-foreground">
        <div className="flex items-center justify-between">
          <div className="flex flex-col text-sm">
            <span className="text-muted-foreground">Wallet address</span>
            <span className="font-mono">{user?.walletAddr || "—"}</span>
          </div>
        </div>
        <div className="mt-2 text-sm ">
          <span className="text-muted-foreground">Current Balance: </span>
          <span className="font-semibold">
            {balanceLoading ? "—" : balance.toLocaleString()} KRW
          </span>
        </div>
      </section>

      {/* Credential actions */}
      <section className="rounded-md border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">
            <span className="font-medium">Credentials</span>
          </div>
        </div>

        {err && <p className="text-sm text-red-600">{err}</p>}

        {/* Results */}
        {items && (
          <div className="mt-2">
            <div className="mb-2 text-xs text-muted-foreground">
              Total {items.length}
            </div>

            {items.length === 0 ? (
              <p className="text-sm">No credentials found.</p>
            ) : (
              <div className="space-y-3">
                {items.map((it, i) => (
                  <div
                    key={it.index ?? i}
                    className="flex flex-col gap-2 p-3 rounded-md border bg-card text-card-foreground"
                  >
                    <div className="text-xs text-muted-foreground">
                      #{i + 1}
                    </div>
                    <Separator />
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between items-baseline">
                        <span className="text-gray-500">Issuer</span>
                        <span className="text-xs">{it.Issuer}</span>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span className="text-gray-500">Subject</span>
                        <span className="text-xs">{it.Subject}</span>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span className="text-gray-500">Type</span>
                        <span className="text-xs">
                          {hexToUtf8Safe(it.CredentialType)}
                        </span>
                      </div>

                      {typeof it.Expiration === "number" && (
                        <div className="flex justify-between items-baseline">
                          <span className="text-gray-500">Expiration</span>
                          <span className="text-xs">
                            {new Date(it.Expiration * 1000).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Dev helper (optional) */}
      <section>
        <Button
          variant="secondary"
          type="button"
          className="w-full text-xs text-muted-foreground"
          onClick={() => {
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
            localStorage.removeItem("authUser");
          }}
        >
          Dev: Reset Auth (Clear Tokens)
        </Button>
      </section>
    </div>
  );
}
