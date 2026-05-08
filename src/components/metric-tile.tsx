import type { ReactNode } from "react";

type MetricTileProps = {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "default" | "muted";
  /** Render value with tabular-nums + monospace voice. Default true. */
  numeric?: boolean;
};

/**
 * Compact KPI/metric tile used inside SectionPanels (budget, tasks,
 * portfolio summaries). Promoted from inline copies. Uses a softer
 * surface (`--color-surface-soft`) so a row of tiles reads as a
 * grouped block rather than a row of disconnected cards.
 */
export function MetricTile({
  label,
  value,
  hint,
  tone = "default",
  numeric = true,
}: MetricTileProps) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-[var(--radius-md)] bg-[var(--color-surface-soft)] p-3 shadow-[var(--shadow-card-ring)]">
      <span className="truncate text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--workspace-text-secondary)]">
        {label}
      </span>
      <span
        className={`leading-tight [overflow-wrap:anywhere] ${
          numeric ? "font-data tabular-nums" : ""
        } ${
          tone === "muted"
            ? "text-base font-medium text-[var(--workspace-text-secondary)]"
            : "text-lg font-semibold text-[var(--workspace-text)] sm:text-xl"
        }`}
      >
        {value}
      </span>
      {hint ? (
        <span className="truncate text-[11px] text-[var(--workspace-text-secondary)]">
          {hint}
        </span>
      ) : null}
    </div>
  );
}
