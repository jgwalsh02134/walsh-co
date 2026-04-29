import { statusLabels, statusTokens, type StatusKey } from "@/lib/status";

export function StatusBadge({ status }: { status: StatusKey }) {
  const meta = statusLabels[status];
  const tone = statusTokens[meta.tone];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ background: tone.background, color: tone.text }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: tone.text }}
        aria-hidden
      />
      {meta.label}
    </span>
  );
}
