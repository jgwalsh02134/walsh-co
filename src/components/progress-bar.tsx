type ProgressBarProps = {
  value: number;
  label?: string;
  showValue?: boolean;
  tone?: "primary" | "neutral";
};

export function ProgressBar({
  value,
  label,
  showValue = true,
  tone = "primary",
}: ProgressBarProps) {
  const safe = Math.max(0, Math.min(100, value));
  const fill = tone === "primary" ? "var(--color-primary)" : "var(--color-text-muted)";
  return (
    <div className="flex flex-col gap-1.5">
      {label || showValue ? (
        <div className="flex items-baseline justify-between text-xs">
          {label ? (
            <span className="font-medium text-[var(--color-text-muted)]">{label}</span>
          ) : (
            <span />
          )}
          {showValue ? (
            <span className="font-semibold text-[var(--color-text)]">{safe}%</span>
          ) : null}
        </div>
      ) : null}
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-surface-soft)]"
        role="progressbar"
        aria-valuenow={safe}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{ width: `${safe}%`, background: fill }}
        />
      </div>
    </div>
  );
}
