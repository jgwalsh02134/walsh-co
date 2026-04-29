type StatCardProps = {
  label: string;
  value: string;
  delta?: string;
  emphasis?: boolean;
};

export function StatCard({ label, value, delta, emphasis = false }: StatCardProps) {
  return (
    <div
      className={`flex flex-col gap-1 rounded-[var(--radius-lg)] border p-[21px] shadow-[var(--shadow-card)] ${
        emphasis
          ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]"
          : "border-[var(--color-border)] bg-[var(--color-surface-white)]"
      }`}
    >
      <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
        {label}
      </span>
      <span className="text-3xl font-semibold text-[var(--color-text)]">
        {value}
      </span>
      {delta ? (
        <span className="text-xs text-[var(--color-text-muted)]">{delta}</span>
      ) : null}
    </div>
  );
}
