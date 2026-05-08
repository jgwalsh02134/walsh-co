/**
 * Market Tracker page header.
 *
 * Title, subtitle, source-freshness chips, and grouped refresh-button
 * rows. Buttons are grouped by purpose (Valuation & rent, Records,
 * Macro/trends, Context) so the row no longer reads as a long
 * undifferentiated list. The refresh-button components themselves are
 * client components that own their own pending state — this file only
 * arranges them and renders the freshness chips.
 */

import Link from "next/link";
import type { ReactNode } from "react";
import { AttomAvmRefreshButton } from "../attom-avm-refresh-button";
import { AttomRefreshButton } from "../attom-refresh-button";
import { CensusRefreshButton } from "../census-refresh-button";
import { FredRefreshButton } from "../fred-refresh-button";
import { GoogleMapsRefreshButton } from "../google-maps-refresh-button";
import { RentCastListingsRefreshButton } from "../rentcast-listings-refresh-button";
import { RentCastRefreshButton } from "../rentcast-refresh-button";
import { ZillowRefreshButton } from "../zillow-refresh-button";

export type MarketHeaderProps = {
  rentCastFreshness: FreshnessProps;
  attomFreshness: FreshnessProps;
  fredFreshness: FreshnessProps;
  zillowFreshness: FreshnessProps;
  googleMapsFreshness: FreshnessProps;
  censusFreshness: FreshnessProps;
  hasManualEntries: boolean;
  databaseAvailable: boolean;
};

export type FreshnessProps = {
  label: string;
  configured: boolean;
  /** Pre-formatted relative age string (e.g. "3 days ago"). */
  relative: string | null;
};

export function MarketHeader({
  rentCastFreshness,
  attomFreshness,
  fredFreshness,
  zillowFreshness,
  googleMapsFreshness,
  censusFreshness,
  hasManualEntries,
  databaseAvailable,
}: MarketHeaderProps) {
  return (
    <header className="flex flex-col gap-4 border border-[var(--market-border)] bg-[var(--market-surface)] p-4 sm:p-5">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-semibold leading-tight text-[var(--market-text)] sm:text-3xl">
          Market Intelligence
        </h1>
        <p className="max-w-3xl text-sm text-[var(--market-text-secondary)]">
          House value, market rent, comps, trends, and AI analysis.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--market-text-muted)]">
        <FreshnessChip {...rentCastFreshness} />
        <Dot />
        <FreshnessChip {...attomFreshness} />
        <Dot />
        <FreshnessChip {...fredFreshness} />
        <Dot />
        <FreshnessChip {...zillowFreshness} />
        <Dot />
        <FreshnessChip {...googleMapsFreshness} />
        <Dot />
        <FreshnessChip {...censusFreshness} />
        {!databaseAvailable ? (
          <span className="border border-[var(--semantic-error-border)] bg-[var(--semantic-error-bg)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--semantic-error)]">
            Database unavailable
          </span>
        ) : null}
      </div>

      <div className="flex flex-col gap-3">
        <RefreshGroup label="Valuation & rent">
          <RentCastRefreshButton keyConfigured={rentCastFreshness.configured} />
          <RentCastListingsRefreshButton
            keyConfigured={rentCastFreshness.configured}
          />
          <AttomAvmRefreshButton keyConfigured={attomFreshness.configured} />
        </RefreshGroup>
        <RefreshGroup label="Records">
          <AttomRefreshButton keyConfigured={attomFreshness.configured} />
          <Link
            href="/market/manual"
            className="inline-flex min-h-[40px] items-center justify-center border border-[var(--market-border-strong)] bg-transparent px-3 py-2 text-sm font-medium text-[var(--market-text)] transition hover:border-[var(--market-cyan)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--market-cyan)]"
          >
            {hasManualEntries ? "Edit manual data" : "Add manual data"}
          </Link>
        </RefreshGroup>
        <RefreshGroup label="Macro / trends">
          <FredRefreshButton keyConfigured={fredFreshness.configured} />
          <ZillowRefreshButton urlConfigured={zillowFreshness.configured} />
        </RefreshGroup>
        <RefreshGroup label="Context">
          <GoogleMapsRefreshButton
            keyConfigured={googleMapsFreshness.configured}
          />
          <CensusRefreshButton keyConfigured={censusFreshness.configured} />
        </RefreshGroup>
        <p className="text-[11px] text-[var(--market-text-muted)]">
          Manual refresh only · provider/API calls may consume usage.
        </p>
      </div>
    </header>
  );
}

function RefreshGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--market-text-muted)]">
        {label}
      </span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function FreshnessChip({ label, configured, relative }: FreshnessProps) {
  let dotColor = "var(--market-text-muted)";
  let text: ReactNode;
  if (!configured) {
    text = (
      <>
        <span className="text-[var(--market-text-secondary)]">{label}</span>{" "}
        <span className="text-[var(--market-text-muted)]">not configured</span>
      </>
    );
  } else if (relative) {
    dotColor = "var(--semantic-success)";
    text = (
      <>
        <span className="text-[var(--market-text-secondary)]">{label}</span>{" "}
        <span className="font-data tabular-nums text-[var(--market-text)]">
          {relative}
        </span>
      </>
    );
  } else {
    dotColor = "var(--semantic-warning)";
    text = (
      <>
        <span className="text-[var(--market-text-secondary)]">{label}</span>{" "}
        <span className="text-[var(--market-text-muted)]">no snapshot</span>
      </>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ background: dotColor }}
      />
      {text}
    </span>
  );
}

function Dot() {
  return (
    <span aria-hidden className="text-[var(--market-text-muted)]">
      ·
    </span>
  );
}
