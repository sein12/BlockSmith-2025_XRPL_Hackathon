// src/routes/signup/StepWallet.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useSignup } from "@/contexts/SignupContext";
import {
  issueCredential,
  acceptIssuedCredentialBySeed,
} from "@/api/credential";

export default function StepWallet() {
  const nav = useNavigate();

  const { signup } = useAuth();
  const { state, set, reset } = useSignup();

  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  // Issuance / acceptance state
  const [open, setOpen] = useState(false); // accept modal
  const [issuedHash, setIssuedHash] = useState<string | undefined>(undefined);
  const [issued, setIssued] = useState(false);
  const [accepted, setAccepted] = useState(false);

  // 1) Issue credential (Create)
  const onIssue = async () => {
    setErr("");
    if (!state.userSeed) {
      setErr("Please enter your Seed. (Devnet / demo only)");
      return;
    }
    setBusy(true);
    try {
      const res = await issueCredential({
        userSeed: state.userSeed,
        type: "KYC",
        expirationSec: 60 * 60, // 1 hour
      });
      setIssuedHash(res?.summary?.hash);
      setIssued(true);
      setOpen(true); // open accept modal after successful issuance
    } catch (e: any) {
      setErr(e?.response?.data?.error ?? "Failed to issue credential.");
    } finally {
      setBusy(false);
    }
  };

  // 2) Accept the issued credential
  const onAccept = async () => {
    setBusy(true);
    try {
      await acceptIssuedCredentialBySeed(state.userSeed, "KYC");
      setAccepted(true);
      setOpen(false);
    } catch (e: any) {
      setErr(e?.response?.data?.error ?? "Failed to accept credential.");
    } finally {
      setBusy(false);
    }
  };

  // 3) Complete signup
  const onComplete = async () => {
    setErr("");
    if (state.password !== state.passwordConfirm) {
      setErr("Passwords do not match.");
      return;
    }
    // (Optional) enforce acceptance before signup
    if (!accepted) {
      setErr("Please complete credential acceptance.");
      return;
    }

    setBusy(true);
    try {
      await signup({
        name: state.name,
        email: state.email,
        username: state.username,
        password: state.password,
        passwordConfirm: state.passwordConfirm,
        walletAddr: state.walletAddr || null,
      });
      reset(); // reset signup form state
      nav("/signup/complete");
    } catch (e: any) {
      setErr(e?.response?.data?.error ?? "Failed to sign up.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Wallet address */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="wallet">Wallet Address</Label>
        <Input
          id="wallet"
          placeholder="r..."
          value={state.walletAddr}
          onChange={(e) => set("walletAddr", e.target.value)}
        />
      </div>

      {/* Optional: connect wallet button */}
      {/* <Button variant="secondary" className="w-full" type="button">
        Connect to Xaman
      </Button> */}

      {/* Seed input (demo use only) */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="seed">User Seed (Devnet / Demo)</Label>
        <Input
          id="seed"
          type="password"
          placeholder="sn************************"
          value={state.userSeed}
          onChange={(e) => set("userSeed", e.target.value)}
        />
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onIssue}
            disabled={busy}
          >
            Issue Credential
          </Button>
          {issued && (
            <span className="text-xs text-muted-foreground">
              Issued
              {issuedHash ? ` • ${issuedHash.slice(0, 8)}…` : ""}
            </span>
          )}
        </div>
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}

      <Button
        className="w-full"
        onClick={onComplete}
        disabled={busy || !accepted}
      >
        Complete
      </Button>

      {/* Acceptance confirmation modal */}
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Accept this credential?</AlertDialogTitle>
            <AlertDialogDescription>
              The issuance transaction has been submitted to the ledger.
              {issuedHash ? (
                <>
                  <br />
                  TX Hash:{" "}
                  <span className="font-mono break-all">{issuedHash}</span>
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onAccept} disabled={busy}>
              Accept
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
