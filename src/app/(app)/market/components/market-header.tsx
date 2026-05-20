/**
 * Compact Market Tracker page header.
 *
 * Investor-facing surface — title, one-line subtitle, and exactly two
 * visible buttons:
 *
 *   • Add / edit manual data (primary contextual action; manual data is
 *     the only fully-trusted internal source)
 *   • Data source settings (anchor link to the Settings disclosure that
 *     contains all of the per-provider refresh buttons + diagnostics)
 *
 * Per-provider refresh controls + the freshness pills moved into that
 * disclosure / the SourceStatusRow component, so this header no longer
 * duplicates source-health information.
 */

import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";

export type MarketHeaderProps = {
  hasManualEntries: boolean;
  databaseAvailable: boolean;
  /** Anchor target for the Data source settings disclosure. */
  settingsHref?: string;
};

export function MarketHeader({
  hasManualEntries,
  databaseAvailable,
  settingsHref = "#market-tracker-settings",
}: MarketHeaderProps) {
  return (
    <header className="flex flex-col gap-3 border border-[var(--market-border)] bg-[var(--market-surface)] p-4 sm:p-5">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-semibold leading-tight text-[var(--market-text)] sm:text-3xl">
          Market Intelligence
        </h1>
        <p className="max-w-3xl text-sm text-[var(--market-text-secondary)]">
          House value, market rent, area trends, and AI research.
        </p>
        {!databaseAvailable ? (
          <StatusBadge kind="error" label="Database unavailable" compact />
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/market/manual"
          className="inline-flex min-h-[40px] items-center justify-center rounded-md border border-[var(--market-cyan)] bg-[var(--market-blue)] px-3.5 py-2 text-sm font-semibold text-[var(--market-text)] transition hover:bg-[var(--market-cyan)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--market-cyan)]"
        >
          {hasManualEntries ? "Edit manual data" : "Add manual data"}
        </Link>
        <Link
          href={settingsHref}
          title="Opens Data Source Settings where each provider has its own refresh button."
          className="inline-flex min-h-[40px] items-center justify-center rounded-md border border-[var(--market-border-strong)] bg-transparent px-3.5 py-2 text-sm font-medium text-[var(--market-text)] transition hover:border-[var(--market-cyan)] hover:bg-[var(--market-surface-raised)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--market-cyan)]"
        >
          Refresh market data
        </Link>
        <Link
          href={settingsHref}
          className="inline-flex min-h-[40px] items-center justify-center rounded-md border border-[var(--market-border-strong)] bg-transparent px-3.5 py-2 text-sm font-medium text-[var(--market-text)] transition hover:border-[var(--market-cyan)] hover:bg-[var(--market-surface-raised)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--market-cyan)]"
        >
          Data source settings
        </Link>
      </div>
    </header>
  );
}
