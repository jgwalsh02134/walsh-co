import { statusTokens } from "@/lib/status";

type Severity = "high" | "medium" | "low";

const severityMeta: Record<Severity, { label: string; tone: keyof typeof statusTokens }> = {
  high: { label: "High risk", tone: "error" },
  medium: { label: "Medium risk", tone: "warning" },
  low: { label: "Low risk", tone: "neutral" },
};

export function RiskBadge({ severity }: { severity: Severity }) {
  const meta = severityMeta[severity];
  const tone = statusTokens[meta.tone];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide"
      style={{ background: tone.background, color: tone.text }}
    >
      <svg
        className="h-3 w-3"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      </svg>
      {meta.label}
    </span>
  );
}
