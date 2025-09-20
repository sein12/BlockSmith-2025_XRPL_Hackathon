export type ClaimInfoFormData = {
  incidentDate: string; // "yyyy-MM-dd"
  details: string;
};

export type AiDecision =
  | "Accepted"
  | "Declined"
  | "Escalate to human"
  | "Unknown";

export type ClaimResponseData = {
  decision: AiDecision;
  Reason: string;
};
