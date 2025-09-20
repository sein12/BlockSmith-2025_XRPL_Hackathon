// src/routes/dashboard/claim/ClaimFormPage.tsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ClaimStepLayout from "@/routes/dashboard/claim/ClaimStepLayout";
import ClaimInfoFields from "@/routes/dashboard/claim/ClaimInfoFields";
import ClaimFileField from "@/routes/dashboard/claim/ClaimFileField";
import EmptyState from "@/components/common/EmptyState";
import { getPolicyDetail } from "@/api/contract";
import { createClaim } from "@/api/claim";
import type { PolicyDetail } from "@/types/contract";
import type { ClaimInfoFormData, ClaimResponseData } from "@/types/claim";
import { Progress } from "@/components/ui/progress";
import { agentTransactionRequest } from "@/api/xrpl";

export default function ClaimFormPage() {
  const { policyId } = useParams<{ policyId: string }>();
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [policy, setPolicy] = useState<PolicyDetail | null>(null);

  const [step, setStep] = useState<0 | 1>(0);
  const [info, setInfo] = useState<ClaimInfoFormData>({
    incidentDate: "",
    details: "",
  });

  const [file, setFile] = useState<File | null>(null);

  // Upload state
  const [submitting, setSubmitting] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);

  useEffect(() => {
    let mounted = true;
    if (!policyId) {
      setErr("Invalid policy id");
      setLoading(false);
      return;
    }
    (async () => {
      try {
        setLoading(true);
        const data = await getPolicyDetail(policyId);
        if (!mounted) return;
        setPolicy(data);
      } catch (e: any) {
        setErr(e?.response?.data?.error ?? "Failed to load policy.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [policyId]);

  if (loading)
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Loading...
      </div>
    );
  if (err || !policy)
    return (
      <EmptyState
        title="Unable to start claim"
        desc={err || "Policy not found."}
      />
    );

  const canNext = !!info.incidentDate && !!info.details.trim();

  const onPrimary = async () => {
    if (step === 0) {
      if (!canNext) return;
      setStep(1);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // step === 1 (submit)
    if (!file) {
      alert("Please attach a file.");
      return;
    }
    try {
      setSubmitting(true);
      setUploadPct(0);

      const sendAiRes = await agentTransactionRequest({
        user_transaction_description: info.details,
        knowledge_markdown: policy.product.descriptionMd,
        image: file,
      });

      const response = sendAiRes.results;

      const created = await createClaim(
        {
          policyId: policy.id,
          incidentDate: info.incidentDate, // "yyyy-MM-dd"
          details: info.details,
          file: file,
          rejectedReason: response.Reason,
          aiDecision: response.decision,
        },
        {
          onUploadProgress: (e) => {
            const pct =
              e.progress != null
                ? Math.round(e.progress * 100)
                : e.total
                ? Math.round((e.loaded / e.total) * 100)
                : 0;
            setUploadPct(pct);
          },
        }
      );
      nav(`/dashboard/claims/new/${created.claimId}/completed`, {
        replace: true,
      });
    } catch (e: any) {
      alert(e?.response?.data?.error ?? "Failed to submit claim");
    } finally {
      setSubmitting(false);
    }
  };

  const onBack = () => {
    if (step === 1) {
      setStep(0);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      nav(-1);
    }
  };

  return (
    <ClaimStepLayout
      primaryLabel={
        step === 0 ? "Next" : submitting ? "Uploading…" : "Complete"
      }
      onPrimary={onPrimary}
      disabled={step === 0 ? !canNext : submitting}
      onBack={onBack}
    >
      {step === 0 ? (
        <ClaimInfoFields value={info} onChange={setInfo} />
      ) : (
        <>
          <ClaimFileField file={file} onChange={setFile} />
          {submitting && (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                Upload progress: {uploadPct}%
              </div>
              <Progress value={uploadPct} />
            </div>
          )}
        </>
      )}
    </ClaimStepLayout>
  );
}
