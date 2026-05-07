import Link from "next/link";
import type {
  MarketManualEntry,
  MarketSourceSnapshot,
} from "@prisma/client";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { SectionPanel } from "@/components/section-panel";
import {
  dash,
  forecastHorizons,
  formatCurrency,
  formatDate,
  formatPct,
  formatRent,
  neighborhoodSignalCategories,
  riskCategories,
  trackedProperties,
  type TrackedProperty,
} from "@/lib/market-data";
import {
  confidenceLabel,
  decimalToNumber,
  formatDecimalCurrency,
  formatDecimalRent,
  getManualEntryMap,
} from "@/lib/market-manual";
import { type AttomFacts, hasAttomKey } from "@/lib/attom";
import {
  FRED_SERIES,
  FRED_SERIES_LABELS,
  type FredObservation,
  type FredSeriesId,
  hasFredKey,
} from "@/lib/fred";
import { prisma } from "@/lib/prisma";
import { hasRentCastKey } from "@/lib/rentcast";
import {
  type MarketSection,
  type MarketSource,
  type SourceStatus,
  countConnected,
  getSectionSources,
  getSectionStatus,
  marketSources,
  NEXT_INTEGRATION,
} from "@/lib/market-sources";
import { statusTokens } from "@/lib/status";
import { AttomRefreshButton } from "./attom-refresh-button";
import { FredRefreshButton } from "./fred-refresh-button";
import { RentCastRefreshButton } from "./rentcast-refresh-button";

export const dynamic = "force-dynamic";

/**
 * Read the safe extracted ATTOM facts off a stored snapshot's `raw`
 * column. `raw` is JSON; we wrote it as `{ sourceName, facts, response }`
 * in attom-actions.ts.
 */
function getAttomFacts(snap: MarketSourceSnapshot | null): AttomFacts | null {
  if (!snap || snap.status !== "SUCCESS") return null;
  const raw = snap.raw as { facts?: unknown } | null;
  return (raw?.facts as AttomFacts | undefined) ?? null;
}

/**
 * Read FRED observations off a stored snapshot's `raw` column. We wrote
 * `{ sourceName, observations, errors }` in fred-actions.ts.
 */
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

/** Display formatter that respects the per-series unit hint. */
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
      // FRED reports housing starts in thousands of units, SAAR.
      return `${obs.value.toLocaleString("en-US", {
        maximumFractionDigits: 0,
      })}K`;
  }
}

/**
 * Resolved per-property estimate. Consumers read this without caring
 * which provider produced the data — `source` makes the provenance
 * explicit so the UI can label it.
 */
type Resolved = {
  estimatedValue: number | null;
  estimatedRent: number | null;
  /** "RentCast" | "Manual Internal" | "None" */
  source: "RentCast" | "Manual Internal" | "None";
  asOfDate: Date | null;
  /** RentCast value range high - low when available. */
  valueLow: number | null;
  valueHigh: number | null;
  rentLow: number | null;
  rentHigh: number | null;
  compsCount: number | null;
};

/**
 * Resolve display-priority order for a single property:
 *   1. Latest successful RentCast snapshot
 *   2. Manual Internal entry
 *   3. em-dash (None)
 * Each field is resolved independently so a property with a successful
 * RentCast value but no rent will fall back to manual rent.
 */
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
        <span className="text-xs text-[var(--market-text-muted)]">
          {sublabel}
        </span>
      ) : null}
    </div>
  );
}

/** 0-100 confidence bar. Renders empty when value is null. */
function ConfidenceBar({ value }: { value: number | null }) {
  const safe = value == null ? 0 : Math.max(0, Math.min(100, value));
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--market-border)]"
      role="progressbar"
      aria-valuenow={safe}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Confidence"
    >
      <div
        className="h-full rounded-full"
        style={{
          width: `${safe}%`,
          background: "var(--market-focus)",
        }}
      />
    </div>
  );
}

function DataPlaceholder({ children }: { children?: ReactNode }) {
  return (
    <p className="text-sm text-[var(--market-text-muted)]">
      {children ??
        "No data yet. This section will populate once a data source is connected."}
    </p>
  );
}

/**
 * Convert a saved confidence enum to the 0-100 range used by the existing
 * dark-mode confidence bar component. Tightly coupled to the manual-form
 * dropdown values (UNKNOWN/LOW/MEDIUM/HIGH).
 */
function confidenceToPct(c: string | null | undefined): number | null {
  if (c === "HIGH") return 90;
  if (c === "MEDIUM") return 60;
  if (c === "LOW") return 30;
  return null;
}

function PropertyMarketCard({
  property,
  resolved,
  manual,
  rentCast,
  attom,
}: {
  property: TrackedProperty;
  resolved: Resolved;
  manual: MarketManualEntry | null;
  rentCast: MarketSourceSnapshot | null;
  attom: MarketSourceSnapshot | null;
}) {
  const isPrivate = property.kind === "private";
  const attomFacts = getAttomFacts(attom);
  const verifiedByAttom = Boolean(attomFacts);
  const recordsPending =
    !verifiedByAttom &&
    (property.zipNeedsVerification || property.factsNeedVerification);
  // Confidence: prefer manual confidence when manual is the chosen source;
  // RentCast snapshots don't carry an explicit 0-100 confidence so the
  // bar sits at 0 (empty) when RentCast is the source. Visual range shown
  // below as low/high if RentCast returned them.
  const confidencePct =
    resolved.source === "Manual Internal"
      ? confidenceToPct(manual?.confidence)
      : null;
  const sourceTone =
    resolved.source === "RentCast"
      ? "success"
      : resolved.source === "Manual Internal"
      ? "info"
      : "neutral";
  const sourceLabel =
    resolved.source === "None" ? "Not connected" : resolved.source;

  return (
    <article
      className={`flex flex-col gap-3 rounded-[var(--radius-md)] p-4 ${
        isPrivate
          ? "border border-dashed border-[var(--market-border)] bg-transparent"
          : "market-card"
      }`}
    >
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex flex-col">
          <h3 className="text-base font-semibold text-[var(--market-text)]">
            {property.address}
          </h3>
          <span className="text-xs text-[var(--market-text-muted)]">
            {property.city}, {property.state}{" "}
            {property.zip ?? <span className="italic">ZIP {dash}</span>}
          </span>
          {verifiedByAttom ? (
            <span className="text-[10px] text-[var(--market-text-muted)]">
              Record source: ATTOM
              {attomFacts?.apn ? (
                <>
                  {" "}
                  · APN{" "}
                  <code className="font-mono text-[var(--market-text-secondary)]">
                    {attomFacts.apn}
                  </code>
                </>
              ) : null}
              {attomFacts?.yearBuilt ? (
                <> · Built {attomFacts.yearBuilt}</>
              ) : null}
              {attomFacts?.buildingSize ? (
                <>
                  {" "}
                  ·{" "}
                  <span className="font-mono tabular-nums">
                    {attomFacts.buildingSize.toLocaleString()}
                  </span>{" "}
                  sqft
                </>
              ) : null}
            </span>
          ) : null}
        </div>
        <ToneTag
          label={property.assetRole}
          tone={isPrivate ? "neutral" : "info"}
        />
      </header>

      <dl className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <dt className="text-[11px] uppercase tracking-wide text-[var(--market-text-muted)]">
            {resolved.source === "RentCast"
              ? "RentCast AVM estimate"
              : "Est. value"}
          </dt>
          <dd className="font-mono text-base font-semibold tabular-nums text-[var(--market-text)]">
            {formatCurrency(resolved.estimatedValue)}
          </dd>
          <ConfidenceBar value={confidencePct} />
          <span className="text-[11px] text-[var(--market-text-muted)]">
            {resolved.source === "RentCast" &&
            resolved.valueLow != null &&
            resolved.valueHigh != null
              ? `Range ${formatCurrency(resolved.valueLow)} – ${formatCurrency(
                  resolved.valueHigh
                )}`
              : `Confidence ${confidenceLabel(manual?.confidence)}`}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-[11px] uppercase tracking-wide text-[var(--market-text-muted)]">
            {resolved.source === "RentCast"
              ? "RentCast long-term rent estimate"
              : "Est. rent"}
          </dt>
          <dd className="font-mono text-base font-semibold tabular-nums text-[var(--market-text)]">
            {formatRent(resolved.estimatedRent)}
          </dd>
          <ConfidenceBar value={confidencePct} />
          <span className="text-[11px] text-[var(--market-text-muted)]">
            {resolved.source === "RentCast" &&
            resolved.rentLow != null &&
            resolved.rentHigh != null
              ? `Range ${formatCurrency(resolved.rentLow)} – ${formatCurrency(
                  resolved.rentHigh
                )}/mo`
              : `Confidence ${confidenceLabel(manual?.confidence)}`}
          </span>
        </div>
      </dl>

      {isPrivate ? (
        <div
          className="flex flex-col gap-0.5 rounded-[var(--radius-md)] border px-3 py-2 text-[11px]"
          style={{
            background: "var(--semantic-warning-bg)",
            borderColor: "var(--semantic-warning-border)",
            color: "var(--semantic-warning)",
          }}
        >
          <span className="font-semibold uppercase tracking-wide">
            Private / Reference Only
          </span>
          <span className="text-[var(--market-text-secondary)]">
            Excluded from business KPIs. Values shown for reference only.
          </span>
        </div>
      ) : null}

      {resolved.source === "RentCast" ? (
        <p className="text-[10px] leading-snug text-[var(--market-text-muted)]">
          Not verified against official records. Not investment advice.
        </p>
      ) : null}

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--market-border)] pt-3 text-[11px]">
        <span className="text-[var(--market-text-muted)]">
          As of{" "}
          {formatDate(
            resolved.asOfDate
              ? new Date(resolved.asOfDate).toISOString()
              : null
          )}
          {rentCast?.compsCount ? (
            <>
              {" "}
              ·{" "}
              <span
                className="text-[var(--market-text-secondary)]"
                title="Number of comparable properties returned by the RentCast AVM"
              >
                {rentCast.compsCount} comps returned
              </span>
            </>
          ) : null}
        </span>
        <div className="flex items-center gap-2">
          {verifiedByAttom ? (
            <ToneTag label="Verified by ATTOM" tone="success" />
          ) : recordsPending ? (
            <ToneTag label="Official records pending" tone="warning" />
          ) : null}
          <ToneTag label={sourceLabel} tone={sourceTone} />
          <Link
            href={`/market/manual?propertyId=${property.id}`}
            className="font-semibold text-[var(--market-cyan)] hover:underline"
          >
            {manual ? "Edit" : "Add"} manual
          </Link>
          {property.workspaceHref ? (
            <Link
              href={property.workspaceHref}
              className="font-semibold text-[var(--market-focus)] hover:underline"
            >
              Open workspace
            </Link>
          ) : null}
        </div>
      </footer>
    </article>
  );
}

function EstimateRow({
  property,
  resolved,
  manual,
  kind,
}: {
  property: TrackedProperty;
  resolved: Resolved;
  manual: MarketManualEntry | null;
  kind: "value" | "rent";
}) {
  const amount =
    kind === "value"
      ? formatCurrency(resolved.estimatedValue)
      : formatRent(resolved.estimatedRent);
  const confidencePct =
    resolved.source === "Manual Internal"
      ? confidenceToPct(manual?.confidence)
      : null;
  const meta =
    resolved.source === "RentCast"
      ? "RentCast"
      : resolved.source === "Manual Internal"
      ? `Manual · ${confidenceLabel(manual?.confidence)}`
      : dash;
  return (
    <div className="grid grid-cols-1 items-center gap-2 border-b border-[var(--market-border)] py-3 last:border-b-0 sm:grid-cols-[2fr_1fr_2fr_1fr] sm:gap-4">
      <span className="text-sm font-medium text-[var(--market-text)]">
        {property.address}
      </span>
      <span className="font-mono text-sm font-semibold tabular-nums text-[var(--market-text)] sm:text-right">
        {amount}
      </span>
      <ConfidenceBar value={confidencePct} />
      <span className="text-xs text-[var(--market-text-muted)] sm:text-right">
        {meta}
      </span>
    </div>
  );
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

function SourceStatusTag({ status }: { status: SourceStatus }) {
  return <ToneTag label={status} tone={statusTone(status)} />;
}

/**
 * Compact in-panel badge row: shows the section's effective status plus
 * each intended source name. Designed to sit under a section description
 * without dominating the panel header.
 */
function SourceBadges({
  section,
  sources,
}: {
  section: MarketSection;
  sources: MarketSource[];
}) {
  const status = getSectionStatus(section);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <SourceStatusTag status={status} />
      <span className="text-[11px] uppercase tracking-wide text-[var(--market-text-muted)]">
        Intended:
      </span>
      {sources.map((s) => (
        <span
          key={s.id}
          className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium"
          style={{
            background: "transparent",
            borderColor: "var(--market-border)",
            color: "var(--market-text-secondary)",
          }}
          title={s.intendedUse}
        >
          {s.name}
        </span>
      ))}
    </div>
  );
}

function PanelSources({ section }: { section: MarketSection }) {
  const sources = getSectionSources(section);
  if (sources.length === 0) return null;
  return (
    <div className="mb-3 -mt-1">
      <SourceBadges section={section} sources={sources} />
    </div>
  );
}

export default async function MarketPage() {
  const businessProperties = trackedProperties.filter(
    (p) => p.kind === "business"
  );
  const privateProperty = trackedProperties.find((p) => p.kind === "private");
  // `counts` from the static registry is shadowed by the dynamic count
  // computed below; we still call countConnected() so the import stays
  // referenced and the static side stays exposed for tests/scripts.
  const _staticCounts = countConnected();
  void _staticCounts;

  // ---- Load every data source in parallel ----
  let manualEntries = new Map<string, MarketManualEntry>();
  let rentCastByProperty = new Map<string, MarketSourceSnapshot>();
  let attomByProperty = new Map<string, MarketSourceSnapshot>();
  let allRecentSnapshots: MarketSourceSnapshot[] = [];
  let allAttomSnapshots: MarketSourceSnapshot[] = [];
  let latestFredSnapshot: MarketSourceSnapshot | null = null;
  let dbAvailable = true;
  try {
    const [manualMap, recentSnapshots, attomSnapshots, fredLatest] =
      await Promise.all([
      getManualEntryMap(),
      // Recent RentCast snapshots; dedupe to the latest SUCCESS per
      // property in JS (small N, simple query).
      prisma.marketSourceSnapshot.findMany({
        where: { provider: "RentCast" },
        orderBy: { fetchedAt: "desc" },
        take: 100,
      }),
      // ATTOM snapshots — same pattern, separate query so the two
      // providers can be deduped and aggregated independently.
      prisma.marketSourceSnapshot.findMany({
        where: { provider: "ATTOM" },
        orderBy: { fetchedAt: "desc" },
        take: 100,
      }),
      // FRED is portfolio-wide and stored as a single row per refresh,
      // so we only need the most recent one.
      prisma.marketSourceSnapshot.findFirst({
        where: { provider: "FRED" },
        orderBy: { fetchedAt: "desc" },
      }),
    ]);
    manualEntries = manualMap;
    allRecentSnapshots = recentSnapshots;
    allAttomSnapshots = attomSnapshots;
    latestFredSnapshot = fredLatest;
    for (const snap of recentSnapshots) {
      if (rentCastByProperty.has(snap.propertyId)) continue;
      if (snap.status === "SUCCESS") {
        rentCastByProperty.set(snap.propertyId, snap);
      }
    }
    for (const snap of attomSnapshots) {
      if (attomByProperty.has(snap.propertyId)) continue;
      if (snap.status === "SUCCESS") {
        attomByProperty.set(snap.propertyId, snap);
      }
    }
  } catch (err) {
    dbAvailable = false;
    console.error("[/market] data unavailable:", err);
  }

  // ---- RentCast snapshot history aggregates ----
  // The "latest refresh" is the largest fetchedAt across ALL RentCast rows
  // (including ERROR rows so users can see when something was last
  // attempted, not just when it succeeded). The success/error counts are
  // computed against that batch — i.e. snapshots taken within ±60s of the
  // latest fetchedAt — so a single refresh shows up as one row.
  const rentCastLatestFetchedAt =
    allRecentSnapshots.length > 0
      ? allRecentSnapshots[0].fetchedAt
      : null;
  const latestBatchSnapshots = (() => {
    if (!rentCastLatestFetchedAt) return [] as MarketSourceSnapshot[];
    const cutoff = rentCastLatestFetchedAt.getTime() - 60_000;
    return allRecentSnapshots.filter(
      (s) => s.fetchedAt.getTime() >= cutoff
    );
  })();
  const rentCastBatchSuccess = latestBatchSnapshots.filter(
    (s) => s.status === "SUCCESS"
  ).length;
  const rentCastBatchErrors = latestBatchSnapshots.filter(
    (s) => s.status === "ERROR"
  ).length;
  const rentCastBatchNoData = latestBatchSnapshots.filter(
    (s) => s.status === "NO_DATA"
  ).length;
  const rentCastTotalComps = Array.from(rentCastByProperty.values()).reduce(
    (acc, s) => acc + (s.compsCount ?? 0),
    0
  );
  const manualEntriesExist = manualEntries.size > 0;

  // ---- ATTOM snapshot-history aggregates ----
  const attomLatestFetchedAt =
    allAttomSnapshots.length > 0 ? allAttomSnapshots[0].fetchedAt : null;
  const attomLatestBatch = (() => {
    if (!attomLatestFetchedAt) return [] as MarketSourceSnapshot[];
    const cutoff = attomLatestFetchedAt.getTime() - 60_000;
    return allAttomSnapshots.filter(
      (s) => s.fetchedAt.getTime() >= cutoff
    );
  })();
  const attomBatchSuccess = attomLatestBatch.filter(
    (s) => s.status === "SUCCESS"
  ).length;
  const attomBatchErrors = attomLatestBatch.filter(
    (s) => s.status === "ERROR"
  ).length;
  const attomBatchNoData = attomLatestBatch.filter(
    (s) => s.status === "NO_DATA"
  ).length;

  /**
   * Resolve assessed value + annual taxes per property with ATTOM-first
   * priority and manual fallback. RentCast doesn't provide these fields
   * so it isn't part of this chain.
   */
  type TaxResolved = {
    assessedValue: number | null;
    annualTaxes: number | null;
    source: "ATTOM" | "Manual Internal" | "None";
    asOfDate: Date | null;
  };
  function resolveTax(propertyId: string): TaxResolved {
    const attom = attomFor(propertyId);
    const manual = entryFor(propertyId);
    const facts = getAttomFacts(attom);
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
    const asOfDate =
      attom?.asOfDate ?? attom?.fetchedAt ?? manual?.asOfDate ?? null;
    return { assessedValue, annualTaxes, source, asOfDate };
  }
  const entryFor = (propertyId: string): MarketManualEntry | null =>
    manualEntries.get(propertyId) ?? null;
  const rentCastFor = (propertyId: string): MarketSourceSnapshot | null =>
    rentCastByProperty.get(propertyId) ?? null;
  const attomFor = (propertyId: string): MarketSourceSnapshot | null =>
    attomByProperty.get(propertyId) ?? null;
  const resolvedFor = (propertyId: string): Resolved =>
    resolveEstimate(rentCastFor(propertyId), entryFor(propertyId));

  const keyConfigured = hasRentCastKey();
  const attomKeyConfigured = hasAttomKey();
  const fredKeyConfigured = hasFredKey();
  const rentCastSnapshotsExist = rentCastByProperty.size > 0;
  const attomSnapshotsExist = attomByProperty.size > 0;
  const fredSnapshotExists =
    !!latestFredSnapshot && latestFredSnapshot.status === "SUCCESS";
  const fredObservations = getFredObservations(latestFredSnapshot);
  // Dynamic source-registry statuses — no key reads on the client.
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
    return s;
  });
  const dynamicCounts = {
    connected: dynamicSources.filter((s) => s.status === "Connected").length,
    manual: dynamicSources.filter((s) => s.status === "Manual").length,
    total: dynamicSources.length,
  };

  // ---- KPIs (business-only, RentCast-first then manual fallback) ----
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

  // Data completeness — split into two clear sub-metrics:
  //   - Estimate cells: value + rent (RentCast or manual fallback)
  //   - Tax / assessment cells: assessedValue + annualTaxes (manual only;
  //     RentCast does not provide these)
  const businessAssetCount = businessProperties.length;
  const estimateCellsTotal = businessAssetCount * 2;
  const taxCellsTotal = businessAssetCount * 2;
  const totalCells = estimateCellsTotal + taxCellsTotal;
  const estimateCellsPopulated = businessProperties.reduce((acc, p) => {
    const r = resolvedFor(p.id);
    let n = 0;
    if (r.estimatedValue != null) n++;
    if (r.estimatedRent != null) n++;
    return acc + n;
  }, 0);
  const taxCellsPopulated = businessProperties.reduce((acc, p) => {
    const t = resolveTax(p.id);
    let n = 0;
    if (t.assessedValue != null) n++;
    if (t.annualTaxes != null) n++;
    return acc + n;
  }, 0);
  const populatedCells = estimateCellsPopulated + taxCellsPopulated;
  const dataCompletenessPct =
    totalCells === 0 ? 0 : Math.round((populatedCells / totalCells) * 100);
  const estimateCompletenessPct =
    estimateCellsTotal === 0
      ? 0
      : Math.round((estimateCellsPopulated / estimateCellsTotal) * 100);
  const taxCompletenessPct =
    taxCellsTotal === 0
      ? 0
      : Math.round((taxCellsPopulated / taxCellsTotal) * 100);

  // Latest asOfDate across resolved entries (RentCast or manual).
  const lastUpdatedISO = businessResolved
    .map((r) => (r.asOfDate ? new Date(r.asOfDate).toISOString() : null))
    .filter((d): d is string => Boolean(d))
    .sort()
    .pop() ?? null;

  const partialValueLabel =
    portfolioValue != null && valuedCount < businessProperties.length
      ? `${valuedCount} of ${businessProperties.length} valued`
      : valuedCount === businessProperties.length && businessProperties.length > 0
      ? "Sum of latest estimates"
      : "Sum of estimates";
  const partialRentLabel =
    portfolioMonthlyRent != null && rentedCount < businessProperties.length
      ? `${rentedCount} of ${businessProperties.length} rent estimates`
      : rentedCount === businessProperties.length && businessProperties.length > 0
      ? "Sum of latest estimates"
      : "Potential, not actual";

  return (
    <div className="market-shell -mx-4 -my-6 flex flex-col gap-8 px-4 py-6 sm:-mx-6 sm:-my-8 sm:px-6 sm:py-8 lg:-mx-8 lg:-my-10 lg:px-8 lg:py-10">
      <div className="flex flex-col gap-4">
        <PageHeader
          eyebrow="Market Tracker"
          title="Market intelligence"
          description="Track values, rents, comps, and market signals across J.G. Walsh & Co. assets."
          primaryAction={
            <div className="flex flex-col items-end gap-2">
              <RentCastRefreshButton keyConfigured={keyConfigured} />
              <AttomRefreshButton keyConfigured={attomKeyConfigured} />
              <FredRefreshButton keyConfigured={fredKeyConfigured} />
              <span className="text-[11px] text-[var(--market-text-muted)]">
                Each refresh issues live API calls. Click only when needed.
              </span>
              <Link
                href="/market/manual"
                className="inline-flex min-h-[40px] items-center justify-center rounded-[var(--radius-md)] border border-[var(--market-border)] bg-transparent px-3 py-2 text-sm font-medium text-[var(--market-text)] hover:border-[var(--market-border-strong)]"
              >
                {manualEntries.size > 0 ? "Edit manual data" : "Add manual data"}
              </Link>
            </div>
          }
        />
        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--market-text-muted)]">
          {!dbAvailable ? (
            <span
              className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-medium"
              style={{
                background: "var(--semantic-error-bg)",
                borderColor: "var(--semantic-error-border)",
                color: "var(--semantic-error)",
              }}
            >
              Manual entries database not reachable
            </span>
          ) : null}
          {rentCastSnapshotsExist ? (
            <span
              className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-medium"
              style={{
                background: "var(--semantic-success-bg)",
                borderColor: "var(--semantic-success-border)",
                color: "var(--semantic-success)",
              }}
            >
              <span
                aria-hidden
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: "var(--semantic-success)" }}
              />
              Source snapshot · RentCast{" "}
              {rentCastLatestFetchedAt
                ? `· last refreshed ${formatDate(
                    rentCastLatestFetchedAt.toISOString()
                  )}`
                : ""}
              {" · "}
              {rentCastByProperty.size} of {trackedProperties.length} properties
              {rentCastTotalComps > 0
                ? ` · ${rentCastTotalComps} comps returned`
                : ""}
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-medium"
              style={{
                background: "var(--semantic-warning-bg)",
                borderColor: "var(--semantic-warning-border)",
                color: "var(--semantic-warning)",
              }}
            >
              <span
                aria-hidden
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: "var(--semantic-warning)" }}
              />
              No RentCast snapshots yet — refresh to fetch
            </span>
          )}
          {attomSnapshotsExist ? (
            <span
              className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-medium"
              style={{
                background: "var(--semantic-success-bg)",
                borderColor: "var(--semantic-success-border)",
                color: "var(--semantic-success)",
              }}
            >
              <span
                aria-hidden
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: "var(--semantic-success)" }}
              />
              ATTOM records · {attomByProperty.size} of {trackedProperties.length}{" "}
              properties
              {attomLatestFetchedAt
                ? ` · ${formatDate(attomLatestFetchedAt.toISOString())}`
                : ""}
            </span>
          ) : null}
          {manualEntriesExist ? (
            <span
              className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-medium"
              style={{
                background: "var(--semantic-info-bg)",
                borderColor: "var(--semantic-info-border)",
                color: "var(--semantic-info)",
              }}
            >
              Manual Internal fallback available
            </span>
          ) : null}
          <span>
            Estimates are not verified against official records. Not investment
            advice.
          </span>
        </div>
      </div>

      <SectionPanel
        title="Market Overview"
        description="Business portfolio summary. 14 MacAffer Dr is excluded."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <KpiTile
            label="Tracked assets"
            value={businessProperties.length}
            sublabel="Business portfolio"
          />
          <KpiTile
            label="Est. portfolio value"
            value={formatCurrency(portfolioValue)}
            sublabel={`${partialValueLabel} · RentCast + manual fallback`}
          />
          <KpiTile
            label="Est. monthly rent"
            value={formatRent(portfolioMonthlyRent)}
            sublabel={`${partialRentLabel} · RentCast + manual fallback`}
          />
          <KpiTile
            label="Data completeness"
            value={
              dataCompletenessPct === 0
                ? "Not started"
                : formatPct(dataCompletenessPct)
            }
            sublabel={
              dataCompletenessPct === 0
                ? "Add manual data or refresh RentCast"
                : `Estimates ${formatPct(estimateCompletenessPct)} · Tax ${formatPct(taxCompletenessPct)}`
            }
          />
          <KpiTile
            label="Last updated"
            value={formatDate(lastUpdatedISO)}
            sublabel={
              rentCastLatestFetchedAt
                ? "RentCast or manual"
                : "Manual entries only"
            }
          />
          <KpiTile
            label="Connected sources"
            value={`${dynamicCounts.connected} / ${dynamicCounts.total}`}
            sublabel={`${dynamicCounts.manual} manual`}
          />
        </div>
      </SectionPanel>

      <SectionPanel
        title="Macro & Rate Context"
        description={
          latestFredSnapshot
            ? `FRED · last refreshed ${formatDate(
                latestFredSnapshot.fetchedAt.toISOString()
              )}`
            : "FRED is the source for portfolio-wide macro and rate context."
        }
      >
        {fredObservations ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {FRED_SERIES.map((id) => {
              const obs = fredObservations[id];
              return (
                <div
                  key={id}
                  className="market-card flex flex-col gap-1 rounded-[var(--radius-md)] p-3"
                >
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--market-text-muted)]">
                    {FRED_SERIES_LABELS[id]}
                  </span>
                  <span className="font-mono text-xl font-semibold tabular-nums text-[var(--market-text)]">
                    {formatFredValue(obs)}
                  </span>
                  <span className="text-[11px] text-[var(--market-text-muted)]">
                    <code className="font-mono text-[var(--market-text-secondary)]">
                      {id}
                    </code>
                    {obs?.date ? (
                      <>
                        {" · as of "}
                        {formatDate(obs.date)}
                      </>
                    ) : null}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-[var(--market-text-muted)]">
            {fredKeyConfigured
              ? "Click Refresh FRED macro data in the page header to fetch the first snapshot."
              : "FRED key not configured. Set FRED_API_KEY in the Railway service environment."}
          </p>
        )}
        <p className="mt-3 text-[11px] text-[var(--market-text-muted)]">
          Source: Federal Reserve Economic Data (FRED). Refreshes are manual
          only.
        </p>
      </SectionPanel>

      <SectionPanel
        title="Property Market Cards"
        description="Per-property snapshot of value, rent, and source status."
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {businessProperties.map((p) => (
            <PropertyMarketCard
              key={p.id}
              property={p}
              resolved={resolvedFor(p.id)}
              manual={entryFor(p.id)}
              rentCast={rentCastFor(p.id)}
              attom={attomFor(p.id)}
            />
          ))}
        </div>
        {privateProperty ? (
          <div className="mt-5 flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--market-text-muted)]">
                Private / Reference Only
              </span>
              <ToneTag label="Excluded from KPIs" tone="neutral" />
              <ToneTag label="Reference only" tone="warning" />
            </div>
            <p className="text-[11px] text-[var(--market-text-muted)]">
              14 MacAffer Dr is held outside the J.G. Walsh & Co. business
              structure. Estimates below — including any RentCast values —
              are shown for reference only and do not contribute to portfolio
              KPIs.
            </p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              <PropertyMarketCard
                property={privateProperty}
                resolved={resolvedFor(privateProperty.id)}
                manual={entryFor(privateProperty.id)}
                rentCast={rentCastFor(privateProperty.id)}
                attom={attomFor(privateProperty.id)}
              />
            </div>
          </div>
        ) : null}
      </SectionPanel>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SectionPanel
          title="Property Value Estimates"
          description="Automated valuations vs. acquisition basis. Placeholder until a source is connected."
        >
          <PanelSources section="propertyValueEstimates" />
          <div className="flex flex-col">
            {businessProperties.map((p) => (
              <EstimateRow
                key={p.id}
                property={p}
                resolved={resolvedFor(p.id)}
                manual={entryFor(p.id)}
                kind="value"
              />
            ))}
          </div>
        </SectionPanel>

        <SectionPanel
          title="Rent Estimates"
          description="Rent ranges and current rent vs. market. Placeholder until a source is connected."
        >
          <PanelSources section="rentEstimates" />
          <div className="flex flex-col">
            {businessProperties.map((p) => (
              <EstimateRow
                key={p.id}
                property={p}
                resolved={resolvedFor(p.id)}
                manual={entryFor(p.id)}
                kind="rent"
              />
            ))}
          </div>
        </SectionPanel>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SectionPanel
          title="Sales Comparables"
          description="Recent sold properties relevant to portfolio assets."
        >
          <PanelSources section="salesComparables" />
          <DataPlaceholder>
            Comp sets will appear here once a sales-data source (e.g. ATTOM) is
            connected.
          </DataPlaceholder>
        </SectionPanel>

        <SectionPanel
          title="Rental Comparables"
          description="Active and recently leased rentals in the same submarkets."
        >
          <PanelSources section="rentalComparables" />
          <DataPlaceholder>
            Rental comps will appear here once a rental-data source (e.g.
            RentCast) is connected.
          </DataPlaceholder>
        </SectionPanel>
      </div>

      <SectionPanel
        title="Neighborhood Signals"
        description="Demand, schools, walkability, and other locality factors."
      >
        <PanelSources section="neighborhoodSignals" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {neighborhoodSignalCategories.map((s) => (
            <div
              key={s.category}
              className="market-card flex flex-col gap-1 rounded-[var(--radius-md)] p-3"
            >
              <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--market-text-muted)]">
                {s.category}
              </span>
              <span className="text-xs text-[var(--market-text-muted)]">
                {s.description}
              </span>
              <span className="mt-1 font-mono text-sm tabular-nums text-[var(--market-text)]">
                {dash}
              </span>
            </div>
          ))}
        </div>
      </SectionPanel>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SectionPanel
          title="Forecasts"
          description="Forward-looking value and rent projections."
        >
          <PanelSources section="forecasts" />
          <div className="flex flex-col">
            {forecastHorizons.map((h) => (
              <div
                key={h.label}
                className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-[var(--market-border)] py-2.5 last:border-b-0"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-[var(--market-text)]">
                    {h.label}
                  </span>
                  <span className="text-xs text-[var(--market-text-muted)]">
                    {h.description}
                  </span>
                </div>
                <span className="font-mono text-sm tabular-nums text-[var(--market-text-muted)]">
                  {dash}
                </span>
              </div>
            ))}
          </div>
        </SectionPanel>

        <SectionPanel
          title="Tax / Assessment Watch"
          description="Assessed values, tax bills, and reassessment history to monitor."
        >
          <PanelSources section="taxAssessment" />
          <div className="flex flex-col">
            {trackedProperties
              .filter((p) => p.kind === "business")
              .map((p) => {
                const t = resolveTax(p.id);
                return (
                  <div
                    key={p.id}
                    className="grid grid-cols-[2fr_1fr_1fr_auto] items-center gap-3 border-b border-[var(--market-border)] py-2.5 last:border-b-0 text-sm"
                  >
                    <span className="text-[var(--market-text)]">
                      {p.address}
                    </span>
                    <span className="text-right font-mono tabular-nums text-[var(--market-text)]">
                      <span className="mr-1 text-[10px] uppercase tracking-wide text-[var(--market-text-muted)]">
                        Assessed
                      </span>
                      {formatCurrency(t.assessedValue)}
                    </span>
                    <span className="text-right font-mono tabular-nums text-[var(--market-text)]">
                      <span className="mr-1 text-[10px] uppercase tracking-wide text-[var(--market-text-muted)]">
                        Annual taxes
                      </span>
                      {formatCurrency(t.annualTaxes)}
                    </span>
                    <ToneTag
                      label={
                        t.source === "ATTOM"
                          ? "ATTOM"
                          : t.source === "Manual Internal"
                          ? "Manual"
                          : "—"
                      }
                      tone={
                        t.source === "ATTOM"
                          ? "success"
                          : t.source === "Manual Internal"
                          ? "info"
                          : "neutral"
                      }
                    />
                  </div>
                );
              })}
          </div>
        </SectionPanel>
      </div>

      <SectionPanel
        title="Risk Indicators"
        description="Climate, regulatory, and market-level risks that could affect value or rentability."
      >
        <PanelSources section="riskIndicators" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {riskCategories.map((r) => (
            <div
              key={r.category}
              className="market-card flex flex-col gap-1 rounded-[var(--radius-md)] p-3"
            >
              <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--market-text-muted)]">
                {r.category}
              </span>
              <span className="text-xs text-[var(--market-text-muted)]">
                {r.description}
              </span>
              <span className="mt-1">
                <ToneTag label="Not assessed" tone="neutral" />
              </span>
            </div>
          ))}
        </div>
      </SectionPanel>

      <SectionPanel
        title="Data Sources"
        description={`${dynamicCounts.connected} connected · ${dynamicCounts.manual} manual · ${dynamicCounts.total} total`}
      >
        <ul className="flex flex-col divide-y divide-[var(--market-border)]">
          {dynamicSources.map((s) => (
            <li
              key={s.id}
              className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
            >
              <div className="flex flex-col gap-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-[var(--market-text)]">
                    {s.name}
                  </span>
                  <span className="text-[11px] uppercase tracking-wide text-[var(--market-text-muted)]">
                    {s.category}
                  </span>
                </div>
                <span className="text-xs text-[var(--market-text-muted)]">
                  {s.intendedUse}
                </span>
                {s.envVarName ? (
                  <span className="text-[11px] text-[var(--market-text-muted)]">
                    Env:{" "}
                    <code className="font-mono text-[var(--market-text-secondary)]">
                      {s.envVarName}
                    </code>{" "}
                    {s.requiresApiKey ? "(required)" : "(optional)"}
                  </span>
                ) : (
                  <span className="text-[11px] text-[var(--market-text-muted)]">
                    No API key required.
                  </span>
                )}
                {s.notes ? (
                  <span className="text-[11px] italic text-[var(--market-text-muted)]">
                    {s.notes}
                  </span>
                ) : null}
              </div>
              <SourceStatusTag status={s.status} />
            </li>
          ))}
        </ul>
      </SectionPanel>

      <SectionPanel
        title="Source snapshot history"
        description={
          rentCastLatestFetchedAt ||
          attomLatestFetchedAt ||
          latestFredSnapshot
            ? "Latest refresh per provider. Refreshes are manual only."
            : "No provider has been refreshed yet."
        }
      >
        {latestFredSnapshot ? (
          <div className="mb-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div className="flex flex-col">
              <span className="text-[11px] uppercase tracking-wide text-[var(--market-text-muted)]">
                Provider
              </span>
              <span className="font-medium text-[var(--market-text)]">
                FRED
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] uppercase tracking-wide text-[var(--market-text-muted)]">
                Last refreshed
              </span>
              <span className="text-[var(--market-text)]">
                {formatDate(latestFredSnapshot.fetchedAt.toISOString())}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] uppercase tracking-wide text-[var(--market-text-muted)]">
                Series fetched
              </span>
              <span className="font-mono tabular-nums text-[var(--market-text)]">
                {fredObservations
                  ? Object.values(fredObservations).filter((o) => o != null)
                      .length
                  : 0}{" "}
                / {FRED_SERIES.length}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] uppercase tracking-wide text-[var(--market-text-muted)]">
                Data as of
              </span>
              <span className="text-[var(--market-text)]">
                {latestFredSnapshot.asOfDate
                  ? formatDate(
                      new Date(latestFredSnapshot.asOfDate).toISOString()
                    )
                  : dash}
              </span>
            </div>
          </div>
        ) : null}
        {attomLatestFetchedAt ? (
          <div className="mb-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div className="flex flex-col">
              <span className="text-[11px] uppercase tracking-wide text-[var(--market-text-muted)]">
                Provider
              </span>
              <span className="font-medium text-[var(--market-text)]">
                ATTOM
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] uppercase tracking-wide text-[var(--market-text-muted)]">
                Last refreshed
              </span>
              <span className="text-[var(--market-text)]">
                {formatDate(attomLatestFetchedAt.toISOString())}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] uppercase tracking-wide text-[var(--market-text-muted)]">
                Successful records
              </span>
              <span className="font-mono tabular-nums text-[var(--market-text)]">
                {attomBatchSuccess} / {attomLatestBatch.length}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] uppercase tracking-wide text-[var(--market-text-muted)]">
                Errors
              </span>
              <span
                className="font-mono tabular-nums"
                style={{
                  color:
                    attomBatchErrors > 0
                      ? "var(--semantic-error)"
                      : "var(--market-text-muted)",
                }}
              >
                {attomBatchErrors}
                {attomBatchNoData > 0
                  ? ` · ${attomBatchNoData} no-data`
                  : ""}
              </span>
            </div>
          </div>
        ) : null}
        {rentCastLatestFetchedAt ? (
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div className="flex flex-col">
              <span className="text-[11px] uppercase tracking-wide text-[var(--market-text-muted)]">
                Provider
              </span>
              <span className="font-medium text-[var(--market-text)]">
                RentCast
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] uppercase tracking-wide text-[var(--market-text-muted)]">
                Successful snapshots
              </span>
              <span className="font-mono tabular-nums text-[var(--market-text)]">
                {rentCastBatchSuccess} / {latestBatchSnapshots.length}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] uppercase tracking-wide text-[var(--market-text-muted)]">
                Errors
              </span>
              <span
                className="font-mono tabular-nums"
                style={{
                  color:
                    rentCastBatchErrors > 0
                      ? "var(--semantic-error)"
                      : "var(--market-text-muted)",
                }}
              >
                {rentCastBatchErrors}
                {rentCastBatchNoData > 0
                  ? ` · ${rentCastBatchNoData} no-data`
                  : ""}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] uppercase tracking-wide text-[var(--market-text-muted)]">
                Comps returned (latest set)
              </span>
              <span className="font-mono tabular-nums text-[var(--market-text)]">
                {rentCastTotalComps > 0 ? rentCastTotalComps : dash}
              </span>
            </div>
          </div>
        ) : !attomLatestFetchedAt && !latestFredSnapshot ? (
          <p className="text-sm text-[var(--market-text-muted)]">
            Click any refresh button in the page header — <strong>RentCast</strong>,{" "}
            <strong>ATTOM</strong>, or <strong>FRED</strong> — to fetch the
            first snapshot.
          </p>
        ) : null}
        <p className="mt-3 text-[11px] text-[var(--market-text-muted)]">
          Refreshes are manual only. No automatic background fetches.
        </p>
      </SectionPanel>

      <SectionPanel
        title="Next integration"
        description={`Recommended: ${NEXT_INTEGRATION.recommendedFirstLiveSource}`}
      >
        <p className="text-sm text-[var(--market-text-secondary)]">
          {NEXT_INTEGRATION.reason}
        </p>
        <p className="mt-3 text-xs text-[var(--market-text-muted)]">
          RentCast, ATTOM, and FRED are wired and live. Census ACS,
          ClimateCheck, and Mapbox remain unconnected.
        </p>
      </SectionPanel>
    </div>
  );
}
