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
};

export const statusTokens: Record<StatusTone, StatusToken> = {
  success: { text: "var(--status-success-text)", background: "var(--status-success-bg)" },
  warning: { text: "var(--status-warning-text)", background: "var(--status-warning-bg)" },
  review: { text: "var(--status-review-text)", background: "var(--status-review-bg)" },
  info: { text: "var(--status-info-text)", background: "var(--status-info-bg)" },
  error: { text: "var(--status-error-text)", background: "var(--status-error-bg)" },
  neutral: { text: "var(--status-neutral-text)", background: "var(--status-neutral-bg)" },
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
  | "bid_requested"
  | "bid_received"
  | "shortlisted"
  | "awarded"
  | "preferred"
  | "backup"
  | "do_not_use";

export const contractorStatusLabels: Record<
  ContractorStatus,
  { label: string; tone: StatusTone }
> = {
  prospect: { label: "Prospect", tone: "neutral" },
  prequalification_needed: { label: "Prequalification needed", tone: "warning" },
  bid_requested: { label: "Bid requested", tone: "info" },
  bid_received: { label: "Bid received", tone: "review" },
  shortlisted: { label: "Shortlisted", tone: "review" },
  awarded: { label: "Awarded", tone: "success" },
  preferred: { label: "Preferred", tone: "success" },
  backup: { label: "Backup", tone: "neutral" },
  do_not_use: { label: "Do not use", tone: "error" },
};
