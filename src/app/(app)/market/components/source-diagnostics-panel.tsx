/**
 * Source diagnostics — bottom-of-page registry view.
 *
 * Compact and low-priority. No <details> dropdown; just a normal
 * section with a single source-per-row table-like grid.
 */

import type { MarketSource, SourceStatus } from "@/lib/market-sources";
import { StatusBadge, type StatusKind } from "@/components/status-badge";
import {
  CANONICAL_LABEL,
  fromRegistryStatus,
} from "./source-status-display";

export type SourceDiagnosticsRow = MarketSource & {
  lastRefreshed: string | null;
};

export function SourceDiagnosticsPanel({
  sources,
  counts,
}: {
  sources: SourceDiagnosticsRow[];
  counts: { connected: number; manual: number; total: number };
}) {
  return (
    <section
      aria-labelledby="source-diagnostics-heading"
      className="flex flex-col border border-[var(--market-border)] bg-[var(--market-surface)]"
    >
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--market-border)] px-4 py-3">
        <h2
          id="source-diagnostics-heading"
          className="font-display text-base font-semibold text-[var(--market-text)]"
        >
          Source Diagnostics
        </h2>
        <div className="font-data text-[11px] tabular-nums text-[var(--market-text-muted)]">
          {counts.connected} connected · {counts.manual} manual · {counts.total} total
        </div>
      </header>

      <ul className="flex flex-col divide-y divide-[var(--market-border)]">
        {sources.map((s) => (
          <li
            key={s.id}
            className="grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center sm:gap-4"
          >
            <div className="min-w-0">
              <div className="font-display text-sm font-semibold text-[var(--market-text)]">
                {s.name}
              </div>
              <div className="mt-0.5 truncate text-[11px] text-[var(--market-text-secondary)]">
                {s.intendedUse}
              </div>
            </div>
            <div className="text-[11px] text-[var(--market-text-muted)]">
              <span className="text-[var(--market-text-secondary)]">
                {s.category}
              </span>
            </div>
            <div className="font-data text-[11px] tabular-nums text-[var(--market-text-muted)]">
              {s.lastRefreshed ?? "no snapshot"}
            </div>
            <StatusPill status={s.status} />
          </li>
        ))}
      </ul>

      <p className="border-t border-[var(--market-border)] px-4 py-2.5 text-[11px] text-[var(--market-text-muted)]">
        Comparables, neighborhood signals, and risk indicators remain
        deferred until additional data sources are connected.
      </p>
    </section>
  );
}

function StatusPill({ status }: { status: SourceStatus }) {
  const state = fromRegistryStatus(status);
  const label = CANONICAL_LABEL[state];

  return (
    <StatusBadge
      kind={state as StatusKind}
      label={label}
      showIcon
      compact
    />
  );
}
