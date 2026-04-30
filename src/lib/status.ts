export type StatusTone =
  | "success"
  | "warning"
  | "review"
  | "info"
  | "error"
  | "neutral";

export type StatusToken = {
  text: string;
  background: string;
  border: string;
};

export const statusTokens: Record<StatusTone, StatusToken> = {
  success: {
    text: "var(--status-success-text)",
    background: "var(--status-success-bg)",
    border: "var(--status-success-border)",
  },
  warning: {
    text: "var(--status-warning-text)",
    background: "var(--status-warning-bg)",
    border: "var(--status-warning-border)",
  },
  review: {
    text: "var(--status-review-text)",
    background: "var(--status-review-bg)",
    border: "var(--status-review-border)",
  },
  info: {
    text: "var(--status-info-text)",
    background: "var(--status-info-bg)",
    border: "var(--status-info-border)",
  },
  error: {
    text: "var(--status-error-text)",
    background: "var(--status-error-bg)",
    border: "var(--status-error-border)",
  },
  neutral: {
    text: "var(--status-neutral-text)",
    background: "var(--status-neutral-bg)",
    border: "var(--status-neutral-border)",
  },
};

export type StatusKey =
  | "active"
  | "in_progress"
  | "planning"
  | "review"
  | "complete"
  | "on_hold"
  | "risk"
  | "needs_verification"
  | "verified"
  | "new";

export const statusLabels: Record<StatusKey, { label: string; tone: StatusTone }> = {
  active: { label: "Active", tone: "success" },
  in_progress: { label: "In progress", tone: "info" },
  planning: { label: "Planning", tone: "neutral" },
  review: { label: "In review", tone: "review" },
  complete: { label: "Complete", tone: "success" },
  on_hold: { label: "On hold", tone: "warning" },
  risk: { label: "At risk", tone: "error" },
  needs_verification: { label: "Needs verification", tone: "warning" },
  verified: { label: "Verified", tone: "success" },
  new: { label: "New", tone: "neutral" },
};

export type Priority = "high" | "medium" | "low";

export const priorityLabels: Record<Priority, { label: string; tone: StatusTone }> = {
  high: { label: "High", tone: "error" },
  medium: { label: "Medium", tone: "info" },
  low: { label: "Low", tone: "neutral" },
};

export type ContractorStatus =
  | "prospect"
  | "prequalification_needed"
  | "qualified"
  | "preferred"
  | "backup"
  | "do_not_use";

export const contractorStatusLabels: Record<
  ContractorStatus,
  { label: string; tone: StatusTone }
> = {
  prospect: { label: "Prospect", tone: "neutral" },
  prequalification_needed: { label: "Prequalification needed", tone: "warning" },
  qualified: { label: "Qualified", tone: "info" },
  preferred: { label: "Preferred", tone: "success" },
  backup: { label: "Backup", tone: "neutral" },
  do_not_use: { label: "Do not use", tone: "error" },
};

export type BidStatus =
  | "none"
  | "requested"
  | "received"
  | "shortlisted"
  | "awarded"
  | "declined";

export const bidStatusLabels: Record<BidStatus, { label: string; tone: StatusTone }> = {
  none: { label: "No bid", tone: "neutral" },
  requested: { label: "Requested", tone: "info" },
  received: { label: "Received", tone: "review" },
  shortlisted: { label: "Shortlisted", tone: "review" },
  awarded: { label: "Awarded", tone: "success" },
  declined: { label: "Declined", tone: "error" },
};

export type InsuranceStatus = "verified" | "missing" | "expired";

export const insuranceStatusLabels: Record<
  InsuranceStatus,
  { label: string; tone: StatusTone }
> = {
  verified: { label: "Insurance verified", tone: "success" },
  missing: { label: "Insurance missing", tone: "warning" },
  expired: { label: "Insurance expired", tone: "error" },
};

export type RiskLevel = "low" | "medium" | "high";

export const riskLabels: Record<RiskLevel, { label: string; tone: StatusTone }> = {
  low: { label: "Low risk", tone: "success" },
  medium: { label: "Medium risk", tone: "warning" },
  high: { label: "High risk", tone: "error" },
};
