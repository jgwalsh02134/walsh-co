/**
 * Market Tracker Settings.
 *
 * Collapsed by default — opens to a single section that hosts all of
 * the developer / admin surfaces that previously cluttered the main
 * page:
 *
 *   • Grouped per-provider refresh buttons
 *   • Data Coverage table
 *   • Next Data Integrations roadmap
 *   • Source Diagnostics table
 *
 * Implemented as a native <details> so it works without JS and survives
 * navigation. The `id` is the anchor target for the "Data source
 * settings" button in the page header.
 */

import type { ReactNode } from "react";

import { AttomAvmRefreshButton } from "../attom-avm-refresh-button";
import { AttomRefreshButton } from "../attom-refresh-button";
import { CensusRefreshButton } from "../census-refresh-button";
import { FredRefreshButton } from "../fred-refresh-button";
import { GoogleMapsRefreshButton } from "../google-maps-refresh-button";
import { RentCastListingsRefreshButton } from "../rentcast-listings-refresh-button";
import { RentCastRefreshButton } from "../rentcast-refresh-button";
import { ZillowRefreshButton } from "../zillow-refresh-button";
import {
  DataCoveragePanel,
  type CoverageRow,
  type RoadmapRow,
} from "./data-coverage-panel";
import { OpenOnHash } from "./open-on-hash";
import {
  SourceDiagnosticsPanel,
  type SourceDiagnosticsRow,
} from "./source-diagnostics-panel";

export type MarketTrackerSettingsProps = {
  rentCastConfigured: boolean;
  attomConfigured: boolean;
  fredConfigured: boolean;
  zillowConfigured: boolean;
  googleMapsConfigured: boolean;
  censusConfigured: boolean;
  coverageRows: CoverageRow[];
  roadmapRows: RoadmapRow[];
  diagnosticsSources: SourceDiagnosticsRow[];
  diagnosticsCounts: { connected: number; manual: number; total: number };
};

export function MarketTrackerSettings(props: MarketTrackerSettingsProps) {
  return (
    <>
      <OpenOnHash targetId="market-tracker-settings" />
      <details
        id="market-tracker-settings"
        className="group border border-[var(--market-border)] bg-[var(--market-surface)] [&[open]>summary>span.icon]:rotate-180 [&[open]>summary>span.show-label]:hidden [&:not([open])>summary>span.hide-label]:hidden"
      >
        <summary
          className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 transition hover:bg-[var(--market-surface-raised)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--market-cyan)] sm:px-5"
          aria-controls="market-tracker-settings"
        >
          <div className="flex flex-col gap-0.5">
            <span className="font-display text-base font-semibold text-[var(--market-text)]">
              Market Tracker Settings
            </span>
            <span className="text-[12px] text-[var(--market-text-muted)]">
              Per-provider refresh controls, data coverage, and source
              diagnostics. Manual refresh only — nothing here runs on its own.
            </span>
          </div>
          <span className="flex shrink-0 items-center gap-2 text-[12px] font-semibold text-[var(--market-text-secondary)]">
            <span className="show-label">Show settings</span>
            <span className="hide-label">Hide settings</span>
            <span
              className="icon select-none text-[var(--market-text-muted)] transition-transform"
              aria-hidden
            >
              ▾
            </span>
          </span>
        </summary>

      <div className="flex flex-col gap-5 border-t border-[var(--market-border)] px-4 py-4 sm:px-5 sm:py-5">
        <section className="flex flex-col gap-3">
          <SectionHeader
            title="Refresh providers"
            subtitle="Each button calls one provider. Provider/API calls may consume usage."
          />
          <RefreshGroup label="Valuation & rent">
            <RentCastRefreshButton keyConfigured={props.rentCastConfigured} />
            <RentCastListingsRefreshButton
              keyConfigured={props.rentCastConfigured}
            />
            <AttomAvmRefreshButton keyConfigured={props.attomConfigured} />
          </RefreshGroup>
          <RefreshGroup label="Records">
            <AttomRefreshButton keyConfigured={props.attomConfigured} />
          </RefreshGroup>
          <RefreshGroup label="Macro / trends">
            <FredRefreshButton keyConfigured={props.fredConfigured} />
            <ZillowRefreshButton urlConfigured={props.zillowConfigured} />
          </RefreshGroup>
          <RefreshGroup label="Context">
            <GoogleMapsRefreshButton
              keyConfigured={props.googleMapsConfigured}
            />
            <CensusRefreshButton keyConfigured={props.censusConfigured} />
          </RefreshGroup>
        </section>

        <DataCoveragePanel
          rows={props.coverageRows}
          roadmap={props.roadmapRows}
        />

        <SourceDiagnosticsPanel
          sources={props.diagnosticsSources}
          counts={props.diagnosticsCounts}
        />
      </div>
      </details>
    </>
  );
}

function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <h2 className="font-display text-base font-semibold text-[var(--market-text)]">
        {title}
      </h2>
      {subtitle ? (
        <p className="text-[12px] text-[var(--market-text-muted)]">
          {subtitle}
        </p>
      ) : null}
    </div>
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
