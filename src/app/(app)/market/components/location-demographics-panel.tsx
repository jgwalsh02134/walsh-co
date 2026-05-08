/**
 * Compact "Location & Demographics Context" panel.
 *
 * Surfaces the latest Google Maps geocode result per tracked property
 * and the latest Census ACS demographic snapshot per ZCTA. This panel
 * is **context only** — it does not feed into valuation or rent
 * resolution and does not auto-refresh.
 */

import type { ReactNode } from "react";
import { CensusRefreshButton } from "../census-refresh-button";
import { GoogleMapsRefreshButton } from "../google-maps-refresh-button";

export type GeocodeStatus =
  | "SUCCESS"
  | "NO_DATA"
  | "ERROR"
  | "MISSING_KEY"
  | "PENDING";

export type GeocodeRow = {
  propertyId: string;
  propertyLabel: string;
  status: GeocodeStatus;
  formattedAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  locationType: string | null;
  fetchedAt: string | null;
  errorMessage: string | null;
  isPrivateReference: boolean;
};

export type CensusRow = {
  zip: string;
  status: GeocodeStatus;
  name: string | null;
  year: string | null;
  totalPopulation: number | null;
  medianHouseholdIncome: number | null;
  medianGrossRent: number | null;
  medianHomeValue: number | null;
  ownerOccupiedPct: number | null;
  renterOccupiedPct: number | null;
  vacancyPct: number | null;
  fetchedAt: string | null;
  errorMessage: string | null;
};

export type LocationDemographicsPanelProps = {
  geocodes: GeocodeRow[];
  censusRows: CensusRow[];
  googleKeyConfigured: boolean;
  censusKeyConfigured: boolean;
  geocodeFetchedAt: string | null;
  censusFetchedAt: string | null;
};

export function LocationDemographicsPanel({
  geocodes,
  censusRows,
  googleKeyConfigured,
  censusKeyConfigured,
  geocodeFetchedAt,
  censusFetchedAt,
}: LocationDemographicsPanelProps) {
  return (
    <section className="border border-[var(--market-border)] bg-[var(--market-surface)]">
      <header className="border-b border-[var(--market-border)] px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="font-display text-base font-semibold text-[var(--market-text)]">
            Location &amp; Demographics Context
          </h2>
          <p className="text-[11px] text-[var(--market-text-muted)]">
            Context only — not a valuation source.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-0 divide-y divide-[var(--market-border)] lg:grid-cols-2 lg:divide-x lg:divide-y-0">
        <div className="flex flex-col gap-3 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <h3 className="font-display text-sm font-semibold text-[var(--market-text)]">
                Google Maps geocode
              </h3>
              <p className="text-[11px] text-[var(--market-text-muted)]">
                {geocodeFetchedAt
                  ? `Latest snapshot ${geocodeFetchedAt}.`
                  : "No snapshots yet."}
              </p>
            </div>
            <GoogleMapsRefreshButton keyConfigured={googleKeyConfigured} />
          </div>
          <ul className="flex flex-col divide-y divide-[var(--market-border)]">
            {geocodes.map((row) => (
              <li
                key={row.propertyId}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 py-2 first:pt-0 last:pb-0"
              >
                <div className="min-w-0 flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-display text-sm font-semibold text-[var(--market-text)]">
                      {row.propertyLabel}
                    </span>
                    {row.isPrivateReference ? (
                      <span className="shrink-0 border border-[var(--market-border)] bg-[var(--market-surface-raised)] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--market-text-muted)]">
                        Reference
                      </span>
                    ) : null}
                  </div>
                  <span className="truncate text-[11px] text-[var(--market-text-secondary)]">
                    {row.formattedAddress ?? "—"}
                  </span>
                  <span className="font-data text-[11px] text-[var(--market-text-muted)]">
                    {row.latitude != null && row.longitude != null
                      ? `${row.latitude.toFixed(6)}, ${row.longitude.toFixed(6)}`
                      : "lat/lng —"}
                    {row.locationType ? (
                      <span className="ml-2 uppercase tracking-wide">
                        {row.locationType.toLowerCase()}
                      </span>
                    ) : null}
                  </span>
                  {row.status !== "SUCCESS" && row.errorMessage ? (
                    <span className="text-[11px] text-[var(--semantic-error)]">
                      {row.errorMessage}
                    </span>
                  ) : null}
                </div>
                <StatusBadge status={row.status} />
              </li>
            ))}
            {geocodes.length === 0 ? <EmptyRow label="No properties." /> : null}
          </ul>
        </div>

        <div className="flex flex-col gap-3 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <h3 className="font-display text-sm font-semibold text-[var(--market-text)]">
                Census ACS (ZCTA)
              </h3>
              <p className="text-[11px] text-[var(--market-text-muted)]">
                {censusFetchedAt
                  ? `Latest snapshot ${censusFetchedAt}.`
                  : "No snapshots yet."}
              </p>
            </div>
            <CensusRefreshButton keyConfigured={censusKeyConfigured} />
          </div>
          <ul className="flex flex-col divide-y divide-[var(--market-border)]">
            {censusRows.map((row) => (
              <li
                key={row.zip}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 py-2 first:pt-0 last:pb-0"
              >
                <div className="min-w-0 flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-display text-sm font-semibold text-[var(--market-text)]">
                      ZCTA {row.zip}
                    </span>
                    {row.year ? (
                      <span className="shrink-0 font-data text-[11px] text-[var(--market-text-muted)]">
                        ACS5 {row.year}
                      </span>
                    ) : null}
                  </div>
                  {row.status === "SUCCESS" ? (
                    <dl className="mt-0.5 grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-[11px]">
                      <Stat label="Population" value={formatInt(row.totalPopulation)} />
                      <Stat
                        label="Median income"
                        value={formatCurrency(row.medianHouseholdIncome)}
                      />
                      <Stat
                        label="Median rent"
                        value={formatCurrency(row.medianGrossRent)}
                      />
                      <Stat
                        label="Median home value"
                        value={formatCurrency(row.medianHomeValue)}
                      />
                      <Stat
                        label="Owner-occupied"
                        value={formatPct(row.ownerOccupiedPct)}
                      />
                      <Stat
                        label="Renter-occupied"
                        value={formatPct(row.renterOccupiedPct)}
                      />
                      <Stat label="Vacancy" value={formatPct(row.vacancyPct)} />
                    </dl>
                  ) : (
                    <span className="text-[11px] text-[var(--semantic-error)]">
                      {row.errorMessage ?? "No data."}
                    </span>
                  )}
                </div>
                <StatusBadge status={row.status} />
              </li>
            ))}
            {censusRows.length === 0 ? <EmptyRow label="No ZCTAs tracked." /> : null}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <>
      <dt className="min-w-0 truncate text-[var(--market-text-muted)]">
        {label}
      </dt>
      <dd className="min-w-0 text-right font-data tabular-nums text-[var(--market-text)] [overflow-wrap:anywhere]">
        {value}
      </dd>
    </>
  );
}

function StatusBadge({ status }: { status: GeocodeStatus }) {
  const color =
    status === "SUCCESS"
      ? "var(--semantic-success)"
      : status === "PENDING"
      ? "var(--market-text-muted)"
      : status === "MISSING_KEY"
      ? "var(--semantic-warning)"
      : status === "NO_DATA"
      ? "var(--market-amber)"
      : "var(--semantic-error)";
  const label =
    status === "SUCCESS"
      ? "OK"
      : status === "PENDING"
      ? "Pending"
      : status === "MISSING_KEY"
      ? "No key"
      : status === "NO_DATA"
      ? "No data"
      : "Error";
  return (
    <span
      className="shrink-0 border px-1.5 py-0.5 text-[11px] font-semibold"
      style={{
        color,
        borderColor: "var(--market-border)",
        background: "var(--market-surface-raised)",
      }}
    >
      {label}
    </span>
  );
}

function EmptyRow({ label }: { label: string }) {
  return (
    <li className="py-2 text-[11px] text-[var(--market-text-muted)]">
      {label}
    </li>
  );
}

function formatInt(value: number | null): string {
  if (value == null) return "—";
  return value.toLocaleString("en-US");
}

function formatCurrency(value: number | null): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPct(value: number | null): string {
  if (value == null) return "—";
  return `${(value * 100).toFixed(1)}%`;
}
