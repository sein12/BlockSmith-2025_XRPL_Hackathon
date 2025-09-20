import { useEffect, useState } from "react";
import { loginFaucet, getInsurerBalance, getClientBalance } from "@/api/xrpl";
import { api, fetchClaims, type ClaimListResponse } from "@/api/axios";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import ClaimList from "@/components/claims/ClaimList";

export default function MainPage() {
  const [claims, setClaims] = useState<ClaimListResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const [insurerBalance, setInsurerBalance] = useState(0);
  const [clientBalance, setClientBalance] = useState(0);

  const handleInsurerBalance = async () => {
    const res = await getInsurerBalance();
    setInsurerBalance(res.insurer_balance_xrp);
  };
  const handleClientBalance = async () => {
    const res = await getClientBalance();
    setClientBalance(res.client_balance_xrp);
  };

  const handleFetchClaims = async () => {
    try {
      setLoading(true);
      const res = await fetchClaims();
      setClaims(res);
    } catch (e) {
      console.error(e);
      alert("Failed to fetch claims: please check login or token.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    const res = await api.post("/auth/login", {
      username: "test",
      password: "chltpdls",
    });
    const at = res.data.accessToken ?? res.data.token;
    if (!at) throw new Error("No access token in response");
    localStorage.setItem("accessToken", at);
    localStorage.setItem("refreshToken", res.data.refreshToken ?? "");
    localStorage.setItem("authUser", JSON.stringify(res.data.user ?? null));
    alert("Login successful, you can fetch claims now.");
    handleFetchClaims();
  };

  useEffect(() => {
    loginFaucet().catch(console.error); // XRPL faucet session (separate from JWT)
    handleInsurerBalance();
    handleClientBalance();
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-col gap-2 items-start">
          <h1 className="text-2xl font-semibold">Claim Management Page</h1>
          <p className="text-sm text-muted-foreground">
            View and manage your insurance claims.
          </p>
        </div>
        <div className="flex gap-8 items-center ">
          <div>
            <span className="text-sm text-muted-foreground">
              Insurer Balance: {insurerBalance.toFixed(6)} XRP
            </span>
            <br />
            <span className="text-sm text-muted-foreground">
              Client Balance: {clientBalance.toFixed(6)} XRP
            </span>
          </div>
          <Button variant="secondary" onClick={handleLogin}>
            JWT Login
          </Button>
        </div>
      </div>

      <Separator />

      <ClaimList items={claims?.items ?? []} />
    </div>
  );
}
