import Link from "next/link";
import type {
  MarketManualEntry,
  MarketSourceSnapshot,
} from "@prisma/client";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { SectionPanel } from "@/components/section-panel";
import { type AttomFacts, hasAttomKey } from "@/lib/attom";
import {
  FRED_SERIES,
  FRED_SERIES_LABELS,
  type FredObservation,
  type FredSeriesId,
  hasFredKey,
} from "@/lib/fred";
import {
  dash,
  formatCurrency,
  formatDate,
  formatPct,
  formatRent,
  trackedProperties,
  type TrackedProperty,
} from "@/lib/market-data";
import {
  decimalToNumber,
  getManualEntryMap,
} from "@/lib/market-manual";
import { prisma } from "@/lib/prisma";
import { hasRentCastKey } from "@/lib/rentcast";
import {
  countConnected,
  marketSources,
  type SourceStatus,
} from "@/lib/market-sources";
import { statusTokens } from "@/lib/status";
import {
  type ZhviSeries,
  type ZillowTargetZip,
  ZILLOW_TARGET_ZIPS,
  hasZillowZhviUrl,
} from "@/lib/zillow-research";
import { AttomRefreshButton } from "./attom-refresh-button";
import { FredRefreshButton } from "./fred-refresh-button";
import { RentCastRefreshButton } from "./rentcast-refresh-button";
import { ZillowRefreshButton } from "./zillow-refresh-button";

export const dynamic = "force-dynamic";

// =============================================================
// Helpers
// =============================================================

function getAttomFacts(snap: MarketSourceSnapshot | null): AttomFacts | null {
  if (!snap || snap.status !== "SUCCESS") return null;
  const raw = snap.raw as { facts?: unknown } | null;
  return (raw?.facts as AttomFacts | undefined) ?? null;
}

function getFredObservations(
  snap: MarketSourceSnapshot | null
): Record<FredSeriesId, FredObservation | null> | null {
  if (!snap || snap.status !== "SUCCESS") return null;
  const raw = snap.raw as { observations?: unknown } | null;
  return (
    (raw?.observations as
      | Record<FredSeriesId, FredObservation | null>
      | undefined) ?? null
  );
}

function getZhviSeries(
  snap: MarketSourceSnapshot | null
): Record<ZillowTargetZip, ZhviSeries | null> | null {
  if (!snap || snap.status !== "SUCCESS") return null;
  const raw = snap.raw as { series?: unknown } | null;
  return (
    (raw?.series as Record<ZillowTargetZip, ZhviSeries | null> | undefined) ??
    null
  );
}

function formatPctChange(v: number | null): string {
  if (v == null) return dash;
  const pct = v * 100;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

function pctChangeColor(v: number | null): string {
  if (v == null || v === 0) return "var(--market-text-muted)";
  return v > 0 ? "var(--market-positive)" : "var(--market-negative)";
}

function formatFredValue(obs: FredObservation | null): string {
  if (!obs || obs.value == null) return dash;
  switch (obs.unit) {
    case "PERCENT":
      return `${obs.value.toFixed(2)}%`;
    case "INDEX":
      return obs.value.toLocaleString("en-US", {
        maximumFractionDigits: 2,
      });
    case "THOUSANDS_SAAR":
      return `${obs.value.toLocaleString("en-US", {
        maximumFractionDigits: 0,
      })}K`;
  }
}

function confidenceToPct(c: string | null | undefined): number | null {
  if (c === "HIGH") return 90;
  if (c === "MEDIUM") return 60;
  if (c === "LOW") return 30;
  return null;
}

function statusTone(status: SourceStatus): keyof typeof statusTokens {
  switch (status) {
    case "Connected":
      return "success";
    case "Manual":
      return "info";
    case "Planned":
      return "warning";
    case "Not connected":
    default:
      return "neutral";
  }
}

/** "X days ago" / "today" / em-dash. Used in the freshness header line. */
function relativeAge(d: Date | null | undefined): string {
  if (!d) return dash;
  const ms = Date.now() - new Date(d).getTime();
  if (Number.isNaN(ms)) return dash;
  const days = Math.floor(ms / 86_400_000);
  if (days < 0) return formatDate(new Date(d).toISOString());
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

function isStale(d: Date | null | undefined, daysThreshold: number): boolean {
  if (!d) return false;
  const ms = Date.now() - new Date(d).getTime();
  if (Number.isNaN(ms)) return false;
  return ms / 86_400_000 > daysThreshold;
}

// =============================================================
// Resolution helpers
// =============================================================

type Resolved = {
  estimatedValue: number | null;
  estimatedRent: number | null;
  source: "RentCast" | "Manual Internal" | "None";
  asOfDate: Date | null;
  valueLow: number | null;
  valueHigh: number | null;
  rentLow: number | null;
  rentHigh: number | null;
  compsCount: number | null;
};

function resolveEstimate(
  rentCast: MarketSourceSnapshot | null,
  manual: MarketManualEntry | null
): Resolved {
  const rc = rentCast?.status === "SUCCESS" ? rentCast : null;
  const rcValue = rc ? decimalToNumber(rc.estimatedValue) : null;
  const rcRent = rc ? decimalToNumber(rc.estimatedRent) : null;
  const mValue = manual ? decimalToNumber(manual.estimatedValue) : null;
  const mRent = manual ? decimalToNumber(manual.estimatedRent) : null;

  const estimatedValue = rcValue ?? mValue;
  const estimatedRent = rcRent ?? mRent;

  const source: Resolved["source"] =
    rcValue != null || rcRent != null
      ? "RentCast"
      : mValue != null || mRent != null
      ? "Manual Internal"
      : "None";

  const asOfDate = rc?.asOfDate ?? rc?.fetchedAt ?? manual?.asOfDate ?? null;

  return {
    estimatedValue,
    estimatedRent,
    source,
    asOfDate,
    valueLow: rc ? decimalToNumber(rc.valueLow) : null,
    valueHigh: rc ? decimalToNumber(rc.valueHigh) : null,
    rentLow: rc ? decimalToNumber(rc.rentLow) : null,
    rentHigh: rc ? decimalToNumber(rc.rentHigh) : null,
    compsCount: rc?.compsCount ?? null,
  };
}

// =============================================================
// Small UI atoms
// =============================================================

function ToneTag({
  label,
  tone,
}: {
  label: string;
  tone: keyof typeof statusTokens;
}) {
  const t = statusTokens[tone];
  return (
    <span
      className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium"
      style={{ background: t.background, color: t.text, borderColor: t.border }}
    >
      {label}
    </span>
  );
}

function SourceStatusTag({ status }: { status: SourceStatus }) {
  return <ToneTag label={status} tone={statusTone(status)} />;
}

function KpiTile({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: ReactNode;
  sublabel?: string;
}) {
  return (
    <div className="market-card flex flex-col gap-1.5 rounded-[var(--radius-md)] p-4">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--market-text-muted)]">
        {label}
      </span>
      <span className="font-mono text-2xl font-semibold tabular-nums text-[var(--market-text)]">
        {value}
      </span>
      {sublabel ? (
        <span className="text-[11px] text-[var(--market-text-muted)]">
          {sublabel}
        </span>
      ) : null}
    </div>
  );
}

// =============================================================
// Page
// =============================================================

export default async function MarketPage() {
  // ----- Static data -----
  const businessProperties = trackedProperties.filter(
    (p) => p.kind === "business"
  );
  const privateProperty = trackedProperties.find((p) => p.kind === "private");
  // Keep static count helpers exposed for tests / scripts.
  const _staticCounts = countConnected();
  void _staticCounts;

  // ----- Load every data source in parallel -----
  let manualEntries = new Map<string, MarketManualEntry>();
  let rentCastByProperty = new Map<string, MarketSourceSnapshot>();
  let attomByProperty = new Map<string, MarketSourceSnapshot>();
  let allRecentSnapshots: MarketSourceSnapshot[] = [];
  let allAttomSnapshots: MarketSourceSnapshot[] = [];
  let latestFredSnapshot: MarketSourceSnapshot | null = null;
  let latestZillowSnapshot: MarketSourceSnapshot | null = null;
  let dbAvailable = true;
  try {
    const [
      manualMap,
      recentSnapshots,
      attomSnapshots,
      fredLatest,
      zillowLatest,
    ] = await Promise.all([
      getManualEntryMap(),
      prisma.marketSourceSnapshot.findMany({
        where: { provider: "RentCast" },
        orderBy: { fetchedAt: "desc" },
        take: 100,
      }),
      prisma.marketSourceSnapshot.findMany({
        where: { provider: "ATTOM" },
        orderBy: { fetchedAt: "desc" },
        take: 100,
      }),
      prisma.marketSourceSnapshot.findFirst({
        where: { provider: "FRED" },
        orderBy: { fetchedAt: "desc" },
      }),
      prisma.marketSourceSnapshot.findFirst({
        where: { provider: "ZILLOW_RESEARCH" },
        orderBy: { fetchedAt: "desc" },
      }),
    ]);
    manualEntries = manualMap;
    allRecentSnapshots = recentSnapshots;
    allAttomSnapshots = attomSnapshots;
    latestFredSnapshot = fredLatest;
    latestZillowSnapshot = zillowLatest;
    for (const snap of recentSnapshots) {
      if (rentCastByProperty.has(snap.propertyId)) continue;
      if (snap.status === "SUCCESS") rentCastByProperty.set(snap.propertyId, snap);
    }
    for (const snap of attomSnapshots) {
      if (attomByProperty.has(snap.propertyId)) continue;
      if (snap.status === "SUCCESS") attomByProperty.set(snap.propertyId, snap);
    }
  } catch (err) {
    dbAvailable = false;
    console.error("[/market] data unavailable:", err);
  }

  const entryFor = (id: string): MarketManualEntry | null =>
    manualEntries.get(id) ?? null;
  const rentCastFor = (id: string): MarketSourceSnapshot | null =>
    rentCastByProperty.get(id) ?? null;
  const attomFor = (id: string): MarketSourceSnapshot | null =>
    attomByProperty.get(id) ?? null;
  const resolvedFor = (id: string): Resolved =>
    resolveEstimate(rentCastFor(id), entryFor(id));

  // ----- Provider key/URL state -----
  const keyConfigured = hasRentCastKey();
  const attomKeyConfigured = hasAttomKey();
  const fredKeyConfigured = hasFredKey();
  const zillowUrlConfigured = hasZillowZhviUrl();
  const fredObservations = getFredObservations(latestFredSnapshot);
  const zhviSeries = getZhviSeries(latestZillowSnapshot);

  // ----- Per-source latest fetched timestamps -----
  const rentCastLatestFetchedAt =
    allRecentSnapshots.length > 0 ? allRecentSnapshots[0].fetchedAt : null;
  const attomLatestFetchedAt =
    allAttomSnapshots.length > 0 ? allAttomSnapshots[0].fetchedAt : null;
  const fredLatestFetchedAt = latestFredSnapshot?.fetchedAt ?? null;
  const zillowLatestFetchedAt = latestZillowSnapshot?.fetchedAt ?? null;

  // ----- Tax resolver: ATTOM first, manual fallback -----
  type TaxResolved = {
    assessedValue: number | null;
    annualTaxes: number | null;
    source: "ATTOM" | "Manual Internal" | "None";
  };
  function resolveTax(propertyId: string): TaxResolved {
    const facts = getAttomFacts(attomFor(propertyId));
    const manual = entryFor(propertyId);
    const aAssessed = facts?.assessedValue ?? null;
    const aTaxes = facts?.annualTaxes ?? null;
    const mAssessed = manual ? decimalToNumber(manual.assessedValue) : null;
    const mTaxes = manual ? decimalToNumber(manual.annualTaxes) : null;
    const assessedValue = aAssessed ?? mAssessed;
    const annualTaxes = aTaxes ?? mTaxes;
    const source: TaxResolved["source"] =
      aAssessed != null || aTaxes != null
        ? "ATTOM"
        : mAssessed != null || mTaxes != null
        ? "Manual Internal"
        : "None";
    return { assessedValue, annualTaxes, source };
  }

  // ----- Dynamic source registry -----
  const rentCastSnapshotsExist = rentCastByProperty.size > 0;
  const attomSnapshotsExist = attomByProperty.size > 0;
  const fredSnapshotExists =
    !!latestFredSnapshot && latestFredSnapshot.status === "SUCCESS";
  const zillowSnapshotExists =
    !!latestZillowSnapshot && latestZillowSnapshot.status === "SUCCESS";
  const dynamicSources: typeof marketSources = marketSources.map((s) => {
    if (s.id === "rentcast") {
      return {
        ...s,
        status: rentCastSnapshotsExist
          ? "Connected"
          : keyConfigured
          ? "Planned"
          : "Not connected",
      };
    }
    if (s.id === "attom") {
      return {
        ...s,
        status: attomSnapshotsExist
          ? "Connected"
          : attomKeyConfigured
          ? "Planned"
          : "Not connected",
      };
    }
    if (s.id === "fred") {
      return {
        ...s,
        status: fredSnapshotExists
          ? "Connected"
          : fredKeyConfigured
          ? "Planned"
          : "Not connected",
      };
    }
    if (s.id === "zillow-research") {
      return {
        ...s,
        status: zillowSnapshotExists
          ? "Connected"
          : zillowUrlConfigured
          ? "Planned"
          : "Not connected",
      };
    }
    return s;
  });
  const dynamicCounts = {
    connected: dynamicSources.filter((s) => s.status === "Connected").length,
    manual: dynamicSources.filter((s) => s.status === "Manual").length,
    total: dynamicSources.length,
  };

  // ----- KPIs (business-only; 14 MacAffer excluded) -----
  const businessResolved = businessProperties.map((p) => resolvedFor(p.id));
  const valuedCount = businessResolved.filter(
    (r) => r.estimatedValue != null
  ).length;
  const rentedCount = businessResolved.filter(
    (r) => r.estimatedRent != null
  ).length;
  const portfolioValue = businessResolved.reduce<number | null>((acc, r) => {
    if (r.estimatedValue == null) return acc;
    return (acc ?? 0) + r.estimatedValue;
  }, null);
  const portfolioMonthlyRent = businessResolved.reduce<number | null>(
    (acc, r) => {
      if (r.estimatedRent == null) return acc;
      return (acc ?? 0) + r.estimatedRent;
    },
    null
  );
  // Gross rent yield: only meaningful when both portfolio totals exist
  // AND every business asset has both values (otherwise the ratio is
  // misleading). Formula: annualized rent / value.
  const grossRentYield =
    portfolioValue != null &&
    portfolioMonthlyRent != null &&
    valuedCount === businessProperties.length &&
    rentedCount === businessProperties.length &&
    portfolioValue > 0
      ? (portfolioMonthlyRent * 12) / portfolioValue
      : null;

  // Data freshness (a single human-readable label for the KPI strip):
  // pick the most recent provider snapshot timestamp.
  const newestSourceTimestamp = [
    rentCastLatestFetchedAt,
    attomLatestFetchedAt,
    fredLatestFetchedAt,
    zillowLatestFetchedAt,
  ]
    .filter((d): d is Date => d != null)
    .sort((a, b) => a.getTime() - b.getTime())
    .pop();

  // Data completeness — same model as before but compressed to a single
  // headline metric for the KPI strip.
  const FIELDS_PER_ASSET = 4;
  const totalCells = businessProperties.length * FIELDS_PER_ASSET;
  const populatedCells = businessProperties.reduce((acc, p) => {
    const r = resolvedFor(p.id);
    const t = resolveTax(p.id);
    let n = 0;
    if (r.estimatedValue != null) n++;
    if (r.estimatedRent != null) n++;
    if (t.assessedValue != null) n++;
    if (t.annualTaxes != null) n++;
    return acc + n;
  }, 0);
  const dataCompletenessPct =
    totalCells === 0 ? 0 : Math.round((populatedCells / totalCells) * 100);

  // ----- Needs-attention flags -----
  type Flag = { property: string; level: "warning" | "error"; text: string };
  const flags: Flag[] = [];
  for (const p of businessProperties) {
    const r = resolvedFor(p.id);
    const m = entryFor(p.id);
    const a = attomFor(p.id);
    const rc = rentCastFor(p.id);
    const t = resolveTax(p.id);
    const verifiedByAttom = !!getAttomFacts(a);
    if (
      !verifiedByAttom &&
      (p.factsNeedVerification || p.zipNeedsVerification)
    ) {
      flags.push({
        property: p.address,
        level: "warning",
        text: "Official records pending verification",
      });
    }
    if (r.estimatedValue == null) {
      flags.push({
        property: p.address,
        level: "warning",
        text: "No value estimate available",
      });
    }
    if (r.estimatedRent == null) {
      flags.push({
        property: p.address,
        level: "warning",
        text: "No rent estimate available",
      });
    }
    if (m == null || decimalToNumber(m.purchaseBasis) == null) {
      flags.push({
        property: p.address,
        level: "warning",
        text: "Acquisition basis not captured",
      });
    }
    if (rc && isStale(rc.fetchedAt, 30)) {
      flags.push({
        property: p.address,
        level: "warning",
        text: `RentCast data stale (last refreshed ${relativeAge(
          rc.fetchedAt
        )})`,
      });
    }
    if (t.source === "None") {
      flags.push({
        property: p.address,
        level: "warning",
        text: "Tax / assessment data missing",
      });
    }
  }

  // ----- Tax / assessment availability gate -----
  const businessTaxRows = businessProperties.map((p) => ({
    property: p,
    tax: resolveTax(p.id),
  }));
  const hasAnyTaxData = businessTaxRows.some(
    (r) => r.tax.source !== "None"
  );

  // ----- Property comparison rows (private last, separated below) -----
  const businessRows = businessProperties.map((p) => {
    const r = resolvedFor(p.id);
    const a = attomFor(p.id);
    const rc = rentCastFor(p.id);
    const verified = !!getAttomFacts(a);
    const annualRent =
      r.estimatedRent != null ? r.estimatedRent * 12 : null;
    const yieldPct =
      r.estimatedValue != null && annualRent != null && r.estimatedValue > 0
        ? (annualRent / r.estimatedValue) * 100
        : null;
    return {
      property: p,
      resolved: r,
      attom: a,
      rentCast: rc,
      verified,
      yieldPct,
    };
  });

  return (
    <div className="market-shell -mx-4 -my-6 flex flex-col gap-6 px-4 py-6 sm:-mx-6 sm:-my-8 sm:px-6 sm:py-8 lg:-mx-8 lg:-my-10 lg:px-8 lg:py-10">
      {/* ============================================================
           1. Header
         ============================================================ */}
      <div className="flex flex-col gap-3">
        <PageHeader
          eyebrow="Market Tracker"
          title="Market intelligence"
          description="Values, rents, and macro context across J.G. Walsh & Co. assets. Not investment advice."
        />

        {/* Freshness line — compact source health */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[var(--market-text-muted)]">
          <FreshnessChip
            label="RentCast"
            ts={rentCastLatestFetchedAt}
            keyOk={keyConfigured}
          />
          <FreshnessChip
            label="ATTOM"
            ts={attomLatestFetchedAt}
            keyOk={attomKeyConfigured}
          />
          <FreshnessChip
            label="FRED"
            ts={fredLatestFetchedAt}
            keyOk={fredKeyConfigured}
          />
          <FreshnessChip
            label="Zillow ZHVI"
            ts={zillowLatestFetchedAt}
            keyOk={zillowUrlConfigured}
          />
          {!dbAvailable ? (
            <span
              className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium"
              style={{
                background: "var(--semantic-error-bg)",
                borderColor: "var(--semantic-error-border)",
                color: "var(--semantic-error)",
              }}
            >
              Database unavailable
            </span>
          ) : null}
        </div>

        {/* Refresh menu — collapsed by default to avoid the tall stack. */}
        <details className="group flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--market-border)] bg-[var(--market-surface)]">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-2.5 text-sm font-semibold text-[var(--market-text)] [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2">
              Refresh data
              <span className="text-[11px] font-normal text-[var(--market-text-muted)]">
                Manual only · external API calls
              </span>
            </span>
            <span aria-hidden className="text-[var(--market-text-muted)]">
              ▾
            </span>
          </summary>
          <div className="flex flex-wrap items-start gap-2 border-t border-[var(--market-border)] px-4 py-3">
            <RentCastRefreshButton keyConfigured={keyConfigured} />
            <AttomRefreshButton keyConfigured={attomKeyConfigured} />
            <FredRefreshButton keyConfigured={fredKeyConfigured} />
            <ZillowRefreshButton urlConfigured={zillowUrlConfigured} />
            <Link
              href="/market/manual"
              className="inline-flex min-h-[40px] items-center justify-center rounded-[var(--radius-md)] border border-[var(--market-border)] bg-transparent px-3 py-2 text-sm font-medium text-[var(--market-text)] hover:border-[var(--market-border-strong)]"
            >
              {manualEntries.size > 0 ? "Edit manual data" : "Add manual data"}
            </Link>
          </div>
          <p className="px-4 pb-3 text-[11px] text-[var(--market-text-muted)]">
            Refreshes use external provider calls. Use only when needed.
          </p>
        </details>
      </div>

      {/* ============================================================
           2. Portfolio Summary
         ============================================================ */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KpiTile
          label="Business assets"
          value={businessProperties.length}
          sublabel="Private reference asset excluded"
        />
        <KpiTile
          label="Est. portfolio value"
          value={formatCurrency(portfolioValue)}
          sublabel={
            valuedCount === businessProperties.length
              ? "RentCast estimate + manual fallback"
              : `${valuedCount} of ${businessProperties.length} valued`
          }
        />
        <KpiTile
          label="Est. monthly rent"
          value={formatRent(portfolioMonthlyRent)}
          sublabel={
            rentedCount === businessProperties.length
              ? "RentCast estimate + manual fallback"
              : `${rentedCount} of ${businessProperties.length} rent estimates`
          }
        />
        <KpiTile
          label="Gross rent yield"
          value={
            grossRentYield != null
              ? `${(grossRentYield * 100).toFixed(2)}%`
              : dash
          }
          sublabel="Annualized rent ÷ value"
        />
        <KpiTile
          label="Data freshness"
          value={
            dataCompletenessPct === 0
              ? "Not started"
              : formatPct(dataCompletenessPct)
          }
          sublabel={
            newestSourceTimestamp
              ? `Latest source ${relativeAge(newestSourceTimestamp)}`
              : "Awaiting first refresh"
          }
        />
      </div>

      {/* ============================================================
           3. Property comparison
         ============================================================ */}
      <SectionPanel
        title="Business properties"
        description="Per-property estimates, verification, and yield."
        padded={false}
      >
        {/* Header row — md+ only */}
        <div className="hidden border-b border-[var(--market-border)] px-5 py-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--market-text-muted)] md:grid md:grid-cols-[2fr_1.2fr_1.2fr_0.9fr_1fr_1fr] md:gap-4">
          <span>Property</span>
          <span className="text-right">Est. value</span>
          <span className="text-right">Est. rent</span>
          <span className="text-right">Yield</span>
          <span>Verified</span>
          <span className="text-right">Source · Updated</span>
        </div>
        <ul className="divide-y divide-[var(--market-border)]">
          {businessRows.map(
            ({ property, resolved, verified, rentCast, yieldPct }) => (
              <li
                key={property.id}
                className="grid grid-cols-1 gap-2 px-5 py-3 md:grid-cols-[2fr_1.2fr_1.2fr_0.9fr_1fr_1fr] md:items-center md:gap-4"
              >
                {/* Property */}
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-[var(--market-text)]">
                    {property.address}
                  </span>
                  <span className="text-[11px] text-[var(--market-text-muted)]">
                    {property.city}
                    {property.zip ? ` · ${property.zip}` : ""}
                    {property.workspaceHref ? (
                      <>
                        {" · "}
                        <Link
                          href={property.workspaceHref}
                          className="text-[var(--market-cyan)] hover:underline"
                        >
                          workspace
                        </Link>
                      </>
                    ) : null}
                  </span>
                </div>

                {/* Est. value */}
                <div className="flex flex-col text-right">
                  <span className="font-mono text-sm font-semibold tabular-nums text-[var(--market-text)]">
                    {formatCurrency(resolved.estimatedValue)}
                  </span>
                  {resolved.valueLow != null && resolved.valueHigh != null ? (
                    <span className="text-[10px] text-[var(--market-text-muted)]">
                      {formatCurrency(resolved.valueLow)}–
                      {formatCurrency(resolved.valueHigh)}
                    </span>
                  ) : null}
                </div>

                {/* Est. rent */}
                <div className="flex flex-col text-right">
                  <span className="font-mono text-sm font-semibold tabular-nums text-[var(--market-text)]">
                    {formatRent(resolved.estimatedRent)}
                  </span>
                  {resolved.rentLow != null && resolved.rentHigh != null ? (
                    <span className="text-[10px] text-[var(--market-text-muted)]">
                      {formatCurrency(resolved.rentLow)}–
                      {formatCurrency(resolved.rentHigh)}/mo
                    </span>
                  ) : null}
                </div>

                {/* Yield */}
                <span className="font-mono text-sm tabular-nums text-[var(--market-text)] md:text-right">
                  {yieldPct != null ? `${yieldPct.toFixed(2)}%` : dash}
                </span>

                {/* Verified */}
                <span>
                  {verified ? (
                    <ToneTag label="ATTOM" tone="success" />
                  ) : property.factsNeedVerification ||
                    property.zipNeedsVerification ? (
                    <ToneTag label="Pending" tone="warning" />
                  ) : (
                    <ToneTag label="—" tone="neutral" />
                  )}
                </span>

                {/* Source · Updated */}
                <div className="flex flex-col text-[11px] md:text-right">
                  <span className="text-[var(--market-text-muted)]">
                    {resolved.source === "None"
                      ? "Not connected"
                      : resolved.source}
                  </span>
                  <span className="text-[var(--market-text-muted)]">
                    {rentCast
                      ? relativeAge(rentCast.fetchedAt)
                      : resolved.asOfDate
                      ? relativeAge(resolved.asOfDate)
                      : dash}
                  </span>
                </div>
              </li>
            )
          )}
        </ul>
      </SectionPanel>

      {/* ============================================================
           Private / Reference Only
         ============================================================ */}
      {privateProperty
        ? (() => {
            const r = resolvedFor(privateProperty.id);
            const a = attomFor(privateProperty.id);
            const verified = !!getAttomFacts(a);
            return (
              <div
                className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-dashed border-[var(--market-border)] p-4"
                style={{ background: "transparent" }}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-[var(--market-text)]">
                      {privateProperty.address}
                    </span>
                    <span className="text-[11px] text-[var(--market-text-muted)]">
                      {privateProperty.city}
                      {privateProperty.zip ? ` · ${privateProperty.zip}` : ""}{" "}
                      · Held outside the business structure.
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <ToneTag
                      label="Private / Reference Only"
                      tone="neutral"
                    />
                    <ToneTag label="Excluded from KPIs" tone="warning" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:gap-4">
                  <ReferenceCell
                    label="Est. value"
                    value={formatCurrency(r.estimatedValue)}
                  />
                  <ReferenceCell
                    label="Est. rent"
                    value={formatRent(r.estimatedRent)}
                  />
                  <ReferenceCell
                    label="Verified"
                    value={
                      verified ? "ATTOM" : "Reference only"
                    }
                  />
                  <ReferenceCell
                    label="Source"
                    value={
                      r.source === "None" ? "Not connected" : r.source
                    }
                  />
                </div>
                <p className="text-[11px] text-[var(--market-text-muted)]">
                  Values shown for reference only. Not part of business
                  portfolio KPIs.
                </p>
              </div>
            );
          })()
        : null}

      {/* ============================================================
           4. Needs attention
         ============================================================ */}
      <SectionPanel
        title="Needs attention"
        description={
          flags.length === 0
            ? "No critical market-data flags."
            : `${flags.length} item${flags.length === 1 ? "" : "s"} to review.`
        }
        padded={flags.length === 0}
      >
        {flags.length === 0 ? (
          <p className="text-sm text-[var(--market-text-muted)]">
            All business properties have value, rent, tax, and source data
            within tolerance.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-[var(--market-border)]">
            {flags.map((f, i) => (
              <li
                key={`${f.property}-${i}`}
                className="flex flex-col gap-0.5 px-5 py-2.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="text-sm text-[var(--market-text)]">
                  {f.property}
                </span>
                <span className="text-[11px] text-[var(--market-text-muted)]">
                  {f.text}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionPanel>

      {/* ============================================================
           5. Macro & Rate Context (compact)
         ============================================================ */}
      <SectionPanel
        title="Macro & Rate Context"
        description={
          fredLatestFetchedAt
            ? `FRED · ${relativeAge(fredLatestFetchedAt)}`
            : "FRED supplies portfolio-wide macro context."
        }
      >
        {fredObservations ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {FRED_SERIES.map((id) => {
              const obs = fredObservations[id];
              return (
                <div
                  key={id}
                  className="flex flex-col gap-0.5 rounded-[var(--radius-sm)] border border-[var(--market-border)] p-2.5"
                >
                  <span className="text-[10px] uppercase tracking-wide text-[var(--market-text-muted)]">
                    {FRED_SERIES_LABELS[id]}
                  </span>
                  <span className="font-mono text-base font-semibold tabular-nums text-[var(--market-text)]">
                    {formatFredValue(obs)}
                  </span>
                  <span className="text-[10px] text-[var(--market-text-muted)]">
                    {obs?.date ? formatDate(obs.date) : dash}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-[var(--market-text-muted)]">
            {fredKeyConfigured
              ? "Use the Refresh data menu above to fetch the first FRED snapshot."
              : "FRED key not configured."}
          </p>
        )}
      </SectionPanel>

      {/* ============================================================
           6. Zillow ZIP trend context — only when present
         ============================================================ */}
      {zhviSeries ? (
        <SectionPanel
          title="ZIP Home Value Trends"
          description={`Zillow ZHVI · ${relativeAge(
            zillowLatestFetchedAt
          )} · Trend context only — not a property estimate.`}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {ZILLOW_TARGET_ZIPS.map((zip) => {
              const s = zhviSeries[zip];
              const properties = trackedProperties
                .filter((p) => p.zip === zip)
                .map((p) => p.address);
              return (
                <div
                  key={zip}
                  className="flex flex-col gap-1 rounded-[var(--radius-md)] border border-[var(--market-border)] p-3"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold text-[var(--market-text)]">
                      ZIP {zip}
                    </span>
                    <span className="text-[10px] text-[var(--market-text-muted)]">
                      {properties.length > 0
                        ? properties.join(", ")
                        : "No tracked properties"}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    <span className="font-mono text-xl font-semibold tabular-nums text-[var(--market-text)]">
                      {formatCurrency(s?.latestValue ?? null)}
                    </span>
                    <span
                      className="font-mono text-sm tabular-nums"
                      style={{ color: pctChangeColor(s?.yoyChange ?? null) }}
                    >
                      {formatPctChange(s?.yoyChange ?? null)} 1y
                    </span>
                    <span className="text-[10px] text-[var(--market-text-muted)]">
                      as of {s?.latestDate ? formatDate(s.latestDate) : dash}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionPanel>
      ) : null}

      {/* ============================================================
           7. Tax / Assessment — only when present
         ============================================================ */}
      {hasAnyTaxData ? (
        <SectionPanel
          title="Tax & Assessment"
          description="Latest assessed value and annual tax per property."
          padded={false}
        >
          <ul className="divide-y divide-[var(--market-border)]">
            {businessTaxRows.map(({ property, tax }) => (
              <li
                key={property.id}
                className="grid grid-cols-1 gap-1 px-5 py-2.5 text-sm md:grid-cols-[2fr_1fr_1fr_auto] md:items-center md:gap-4"
              >
                <span className="text-[var(--market-text)]">
                  {property.address}
                </span>
                <span className="font-mono tabular-nums text-[var(--market-text)] md:text-right">
                  {formatCurrency(tax.assessedValue)}
                  <span className="ml-1 text-[10px] uppercase tracking-wide text-[var(--market-text-muted)]">
                    assessed
                  </span>
                </span>
                <span className="font-mono tabular-nums text-[var(--market-text)] md:text-right">
                  {formatCurrency(tax.annualTaxes)}
                  <span className="ml-1 text-[10px] uppercase tracking-wide text-[var(--market-text-muted)]">
                    /yr
                  </span>
                </span>
                <ToneTag
                  label={
                    tax.source === "ATTOM"
                      ? "ATTOM"
                      : tax.source === "Manual Internal"
                      ? "Manual"
                      : "—"
                  }
                  tone={
                    tax.source === "ATTOM"
                      ? "success"
                      : tax.source === "Manual Internal"
                      ? "info"
                      : "neutral"
                  }
                />
              </li>
            ))}
          </ul>
        </SectionPanel>
      ) : (
        <p className="text-[11px] text-[var(--market-text-muted)]">
          No tax / assessment data yet. Connect ATTOM or add manual entries.
        </p>
      )}

      {/* ============================================================
           8. Source diagnostics — collapsed
         ============================================================ */}
      <details className="group rounded-[var(--radius-md)] border border-[var(--market-border)] bg-[var(--market-surface)]">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-[var(--market-text)] [&::-webkit-details-marker]:hidden">
          <span>
            Source diagnostics{" "}
            <span className="text-[11px] font-normal text-[var(--market-text-muted)]">
              · {dynamicCounts.connected} connected · {dynamicCounts.manual}{" "}
              manual · {dynamicCounts.total} total
            </span>
          </span>
          <span aria-hidden className="text-[var(--market-text-muted)]">
            ▾
          </span>
        </summary>
        <div className="flex flex-col divide-y divide-[var(--market-border)] border-t border-[var(--market-border)]">
          {dynamicSources.map((s) => (
            <div
              key={s.id}
              className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
            >
              <div className="flex flex-col gap-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-[var(--market-text)]">
                    {s.name}
                  </span>
                  <span className="text-[10px] uppercase tracking-wide text-[var(--market-text-muted)]">
                    {s.category}
                  </span>
                </div>
                <span className="text-[11px] text-[var(--market-text-muted)]">
                  {s.intendedUse}
                </span>
                {s.envVarName ? (
                  <span className="text-[10px] text-[var(--market-text-muted)]">
                    Env:{" "}
                    <code className="font-mono text-[var(--market-text-secondary)]">
                      {s.envVarName}
                    </code>{" "}
                    {s.requiresApiKey ? "(required)" : "(optional)"}
                  </span>
                ) : null}
              </div>
              <SourceStatusTag status={s.status} />
            </div>
          ))}
        </div>
        <p className="border-t border-[var(--market-border)] px-4 py-2.5 text-[11px] text-[var(--market-text-muted)]">
          Comparables, forecasts, neighborhood signals, and risk indicators
          are deferred until additional data sources are connected.
        </p>
      </details>
    </div>
  );
}

// =============================================================
// Local sub-components
// =============================================================

function FreshnessChip({
  label,
  ts,
  keyOk,
}: {
  label: string;
  ts: Date | null | undefined;
  keyOk: boolean;
}) {
  if (!keyOk) {
    return (
      <span className="inline-flex items-center gap-1">
        <span
          aria-hidden
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ background: "var(--market-text-muted)" }}
        />
        {label}: not configured
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1">
      <span
        aria-hidden
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{
          background: ts
            ? "var(--semantic-success)"
            : "var(--semantic-warning)",
        }}
      />
      {label}: {ts ? relativeAge(ts) : "no snapshot"}
    </span>
  );
}

function ReferenceCell({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wide text-[var(--market-text-muted)]">
        {label}
      </span>
      <span className="font-mono text-sm font-semibold tabular-nums text-[var(--market-text)]">
        {value}
      </span>
    </div>
  );
}
