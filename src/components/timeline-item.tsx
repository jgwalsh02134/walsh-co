import { statusTokens, type StatusTone } from "@/lib/status";

type TimelineItemProps = {
  label: string;
  context: string;
  timestamp: string;
  tone: StatusTone;
};

export function TimelineItem({ label, context, timestamp, tone }: TimelineItemProps) {
  const dot = statusTokens[tone];
  return (
    <li className="flex gap-3 py-3">
      <span
        className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
        style={{ background: dot.text }}
        aria-hidden
      />
      <div className="flex flex-1 flex-col gap-0.5">
        <span className="text-sm font-medium text-[var(--color-text)]">{label}</span>
        <span className="text-xs text-[var(--color-text-muted)]">{context}</span>
      </div>
      <span className="shrink-0 text-xs text-[var(--color-text-faint)]">{timestamp}</span>
    </li>
  );
}

export function Timeline({ children }: { children: React.ReactNode }) {
  return (
    <ul className="divide-y divide-[var(--color-border)]">{children}</ul>
  );
}
