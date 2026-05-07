import Link from "next/link";
import type {
  MarketManualEntry,
  MarketSourceSnapshot,
} from "@prisma/client";
import type { ReactNode } from "react";
import {
  type AttomAvmHistoryPoint,
  type AttomAvmValue,
  type AttomFacts,
  hasAttomKey,
} from "@/lib/attom";
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
import {
  type RentCastComp,
  type RentCastListing,
  extractRentCastComps,
  hasRentCastKey,
} from "@/lib/rentcast";
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
import { AIMarketNotePanel } from "./ai-market-note-panel";
import { AttomAvmRefreshButton } from "./attom-avm-refresh-button";
import { AttomRefreshButton } from "./attom-refresh-button";
import {
  PropertyValuationChart,
  type ValuationPoint,
} from "./components/property-valuation-chart";
import { FredRefreshButton } from "./fred-refresh-button";
import type { MarketNoteInput } from "./market-note-actions";
import { RentCastListingsRefreshButton } from "./rentcast-listings-refresh-button";
import { RentCastRefreshButton } from "./rentcast-refresh-button";
import { ZillowRefreshButton } from "./zillow-refresh-button";

export const dynamic = "force-dynamic";

// =============================================================
// Snapshot accessors
// =============================================================

function getAttomFacts(snap: MarketSourceSnapshot | null): AttomFacts | null {
  if (!snap || snap.status !== "SUCCESS") return null;
  const raw = snap.raw as { facts?: unknown } | null;
  return (raw?.facts as AttomFacts | undefined) ?? null;
}

/**
 * Accessor for the ATTOM AVM_VALUE snapshot's normalized payload.
 * `raw` written by attom-avm-actions.ts as
 * `{ sourceName, avm, unavailableForPlan, response }`.
 * Returns the avm sub-object only on SUCCESS; null otherwise.
 */
function getAttomAvm(snap: MarketSourceSnapshot | null): AttomAvmValue | null {
  if (!snap || snap.status !== "SUCCESS") return null;
  const raw = snap.raw as { avm?: unknown } | null;
  return (raw?.avm as AttomAvmValue | undefined) ?? null;
}

/**
 * Whether the latest ATTOM AVM snapshot indicates the endpoint is
 * forbidden by the current plan/key — used to surface a clear notice
 * instead of treating it as a transient error.
 */
function isAvmUnavailableForPlan(snap: MarketSourceSnapshot | null): boolean {
  if (!snap || snap.status !== "ERROR") return false;
  const raw = snap.raw as { unavailableForPlan?: unknown } | null;
  return raw?.unavailableForPlan === true;
}

function getAttomAvmHistory(
  snap: MarketSourceSnapshot | null
): AttomAvmHistoryPoint[] | null {
  if (!snap || snap.status !== "SUCCESS") return null;
  const raw = snap.raw as { history?: unknown } | null;
  const arr = raw?.history;
  if (!Array.isArray(arr)) return null;
  return arr as AttomAvmHistoryPoint[];
}

function getRentCastListings(
  snap: MarketSourceSnapshot | null
): RentCastListing[] | null {
  if (!snap || snap.status !== "SUCCESS") return null;
  const raw = snap.raw as { listings?: unknown } | null;
  return Array.isArray(raw?.listings)
    ? (raw!.listings as RentCastListing[])
    : null;
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

// =============================================================
// Format helpers
// =============================================================

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
// Pipelines
// =============================================================

/**
 * Pipeline A — Current House Market Value.
 * Order of preference:
 *   1. ATTOM AVM (market value from the assessment block)
 *   2. RentCast /avm/value
 *   3. Manual underwriting value (MarketManualEntry.estimatedValue)
 *   4. em-dash
 *
 * House value is NEVER derived from rent. Rent is a separate pipeline.
 */
type HouseValue = {
  value: number | null;
  source: "ATTOM AVM" | "RentCast" | "Manual" | "None";
  asOfDate: Date | null;
  rangeLow: number | null;
  rangeHigh: number | null;
  /** 0–100 confidence when the source provides one. */
  confidence: number | null;
};

function resolveHouseValue(
  attomAvm: MarketSourceSnapshot | null,
  attomFacts: MarketSourceSnapshot | null,
  rentCast: MarketSourceSnapshot | null,
  manual: MarketManualEntry | null
): HouseValue {
  // 1. ATTOM dedicated AVM endpoint (most authoritative when available).
  const avm = getAttomAvm(attomAvm);
  if (avm?.estimatedValue != null) {
    return {
      value: avm.estimatedValue,
      source: "ATTOM AVM",
      asOfDate: avm.asOfDate ?? attomAvm?.fetchedAt ?? null,
      rangeLow: avm.valueLow,
      rangeHigh: avm.valueHigh,
      confidence: avm.confidence,
    };
  }
  // 2. ATTOM expandedprofile market value (legacy property-record source).
  const facts = getAttomFacts(attomFacts);
  if (facts?.marketValue != null) {
    return {
      value: facts.marketValue,
      source: "ATTOM AVM",
      asOfDate: attomFacts?.asOfDate ?? attomFacts?.fetchedAt ?? null,
      rangeLow: null,
      rangeHigh: null,
      confidence: null,
    };
  }
  const rc = rentCast?.status === "SUCCESS" ? rentCast : null;
  const rcValue = rc ? decimalToNumber(rc.estimatedValue) : null;
  if (rcValue != null) {
    return {
      value: rcValue,
      source: "RentCast",
      asOfDate: rc?.asOfDate ?? rc?.fetchedAt ?? null,
      rangeLow: rc ? decimalToNumber(rc.valueLow) : null,
      rangeHigh: rc ? decimalToNumber(rc.valueHigh) : null,
      confidence: null,
    };
  }
  const manualValue = manual ? decimalToNumber(manual.estimatedValue) : null;
  if (manualValue != null) {
    return {
      value: manualValue,
      source: "Manual",
      asOfDate: manual?.asOfDate ?? null,
      rangeLow: null,
      rangeHigh: null,
      confidence: null,
    };
  }
  return {
    value: null,
    source: "None",
    asOfDate: null,
    rangeLow: null,
    rangeHigh: null,
    confidence: null,
  };
}

/**
 * Pipeline B — Current Market Rent.
 * Order of preference:
 *   1. RentCast /avm/rent/long-term
 *   2. Manual target rent (MarketManualEntry.targetRent)
 *   3. em-dash
 */
type MarketRent = {
  rent: number | null;
  source: "RentCast" | "Manual target" | "None";
  asOfDate: Date | null;
  rangeLow: number | null;
  rangeHigh: number | null;
};

function resolveMarketRent(
  rentCast: MarketSourceSnapshot | null,
  manual: MarketManualEntry | null
): MarketRent {
  const rc = rentCast?.status === "SUCCESS" ? rentCast : null;
  const rcRent = rc ? decimalToNumber(rc.estimatedRent) : null;
  if (rcRent != null) {
    return {
      rent: rcRent,
      source: "RentCast",
      asOfDate: rc?.asOfDate ?? rc?.fetchedAt ?? null,
      rangeLow: rc ? decimalToNumber(rc.rentLow) : null,
      rangeHigh: rc ? decimalToNumber(rc.rentHigh) : null,
    };
  }
  const manualTarget = manual ? decimalToNumber(manual.targetRent) : null;
  if (manualTarget != null) {
    return {
      rent: manualTarget,
      source: "Manual target",
      asOfDate: manual?.asOfDate ?? null,
      rangeLow: null,
      rangeHigh: null,
    };
  }
  return {
    rent: null,
    source: "None",
    asOfDate: null,
    rangeLow: null,
    rangeHigh: null,
  };
}

/**
 * Pipeline C — Historical House Value Trend (ZIP-level).
 * Currently sourced exclusively from Zillow ZHVI ZIP. FHFA HPI / Redfin
 * remain unwired.
 *
 * Returns the same ZhviSeries shape from the Zillow client, plus a
 * derived annualized growth rate that's used by the projection pipeline.
 */
type ValueTrend = {
  zhvi: ZhviSeries | null;
  /** Annualized growth rate, decimal (0.05 = +5%/yr). null if unknown. */
  annualizedRate: number | null;
};

function resolveValueTrend(
  property: TrackedProperty,
  zhvi: Record<ZillowTargetZip, ZhviSeries | null> | null
): ValueTrend {
  const zip = property.zip as ZillowTargetZip | null | undefined;
  const series = zip && zhvi ? zhvi[zip] ?? null : null;
  if (!series) return { zhvi: null, annualizedRate: null };

  // Prefer 1Y for annualized rate. Fall back to (1+3y)^(1/3)-1 then
  // (1+5y)^(1/5)-1 when shorter horizons are missing.
  let rate: number | null = null;
  if (series.yoyChange != null) {
    rate = series.yoyChange;
  } else if (series.threeYearChange != null) {
    rate = Math.pow(1 + series.threeYearChange, 1 / 3) - 1;
  } else if (series.fiveYearChange != null) {
    rate = Math.pow(1 + series.fiveYearChange, 1 / 5) - 1;
  }
  return { zhvi: series, annualizedRate: rate };
}

/**
 * Pipeline E — Internal value projection.
 * No provider forecast is wired today, so we synthesize a simple
 * compounded projection from the current house market value plus the
 * annualized ZIP value trend. Only emits values when BOTH inputs exist.
 *
 * formula: value × (1 + annualRate)^(monthsAhead / 12)
 *
 * The label on the page is explicit: "Internal projection — based on
 * current AVM + ZIP trend". Never presented as a guaranteed forecast.
 */
type ValueProjection = {
  m12: number | null;
  m24: number | null;
  m36: number | null;
  /** Source of the growth rate used; null when no projection. */
  rateSource: "Zillow ZHVI 1Y" | "Zillow ZHVI 3Y annualized" | "Zillow ZHVI 5Y annualized" | null;
  rate: number | null;
};

function resolveValueProjection(
  currentValue: number | null,
  zhvi: ZhviSeries | null
): ValueProjection {
  if (currentValue == null || zhvi == null) {
    return { m12: null, m24: null, m36: null, rateSource: null, rate: null };
  }
  let rate: number | null = null;
  let rateSource: ValueProjection["rateSource"] = null;
  if (zhvi.yoyChange != null) {
    rate = zhvi.yoyChange;
    rateSource = "Zillow ZHVI 1Y";
  } else if (zhvi.threeYearChange != null) {
    rate = Math.pow(1 + zhvi.threeYearChange, 1 / 3) - 1;
    rateSource = "Zillow ZHVI 3Y annualized";
  } else if (zhvi.fiveYearChange != null) {
    rate = Math.pow(1 + zhvi.fiveYearChange, 1 / 5) - 1;
    rateSource = "Zillow ZHVI 5Y annualized";
  }
  if (rate == null) {
    return { m12: null, m24: null, m36: null, rateSource: null, rate: null };
  }
  const project = (months: number): number =>
    currentValue * Math.pow(1 + rate!, months / 12);
  return {
    m12: project(12),
    m24: project(24),
    m36: project(36),
    rateSource,
    rate,
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
      className="inline-flex items-center border px-1.5 py-0.5 text-[11px] font-semibold leading-none"
      style={{ background: t.background, color: t.text, borderColor: t.border }}
    >
      {label}
    </span>
  );
}

function SourceStatusTag({ status }: { status: SourceStatus }) {
  return <ToneTag label={status} tone={statusTone(status)} />;
}

function MetricStripItem({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: ReactNode;
  sublabel?: string;
}) {
  return (
    <div className="min-w-[150px] border-r border-[var(--market-border)] px-3 py-2 last:border-r-0">
      <span className="block text-[11px] text-[var(--market-text-muted)]">
        {label}
      </span>
      <span className="mt-1 block font-data text-xl font-semibold leading-none tabular-nums text-[var(--market-text)]">
        {value}
      </span>
      {sublabel ? (
        <span className="mt-1 block text-[11px] leading-tight text-[var(--market-text-muted)]">
          {sublabel}
        </span>
      ) : null}
    </div>
  );
}

function BoardCell({
  label,
  value,
  sub,
  valueColor,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  valueColor?: string;
}) {
  return (
    <div className="min-w-0">
      <span className="block text-[11px] text-[var(--market-text-muted)]">
        {label}
      </span>
      <span
        className="mt-1 block truncate font-data text-sm tabular-nums"
        style={{ color: valueColor ?? "var(--market-text)" }}
      >
        {value}
      </span>
      {sub != null ? (
        <span className="mt-0.5 block truncate text-[11px] text-[var(--market-text-muted)]">
          {sub}
        </span>
      ) : null}
    </div>
  );
}

function DetailCell({
  label,
  value,
  sub,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <div className="min-w-0 border border-[var(--market-border)] bg-[var(--market-surface-raised)] px-3 py-2">
      <span className="block text-[11px] text-[var(--market-text-muted)]">
        {label}
      </span>
      <span className="mt-0.5 block break-words font-data text-sm tabular-nums text-[var(--market-text)]">
        {value}
      </span>
      {sub != null ? (
        <span className="mt-0.5 block text-[11px] text-[var(--market-text-muted)]">
          {sub}
        </span>
      ) : null}
    </div>
  );
}

function TerminalSection({
  title,
  meta,
  children,
}: {
  title: string;
  meta?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="border border-[var(--market-border)] bg-[var(--market-surface)]">
      <header className="flex min-h-[42px] flex-wrap items-center justify-between gap-2 border-b border-[var(--market-border)] px-3 py-2">
        <h2 className="font-display text-sm font-semibold tracking-wide text-[var(--market-text)]">
          {title}
        </h2>
        {meta ? (
          <div className="text-xs text-[var(--market-text-muted)]">{meta}</div>
        ) : null}
      </header>
      {children}
    </section>
  );
}

function TerminalDisclosure({
  title,
  meta,
  children,
}: {
  title: string;
  meta?: ReactNode;
  children: ReactNode;
}) {
  return (
    <details className="border border-[var(--market-border)] bg-[var(--market-surface)]">
      <summary className="flex min-h-[44px] cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm text-[var(--market-text)] [&::-webkit-details-marker]:hidden">
        <span className="font-display font-semibold">{title}</span>
        {meta ? (
          <span className="text-xs text-[var(--market-text-muted)]">{meta}</span>
        ) : null}
      </summary>
      <div className="border-t border-[var(--market-border)]">{children}</div>
    </details>
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
  const _staticCounts = countConnected();
  void _staticCounts;

  // ----- Load every data source in parallel -----
  let manualEntries = new Map<string, MarketManualEntry>();
  let rentCastByProperty = new Map<string, MarketSourceSnapshot>();
  let attomByProperty = new Map<string, MarketSourceSnapshot>();
  let attomAvmByProperty = new Map<string, MarketSourceSnapshot>();
  let attomAvmHistoryByProperty = new Map<string, MarketSourceSnapshot>();
  let listingsByZipSale = new Map<string, MarketSourceSnapshot>();
  let listingsByZipRental = new Map<string, MarketSourceSnapshot>();
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
      attomAvmSnapshots,
      attomAvmHistorySnapshots,
      listingsSnapshots,
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
        where: { provider: "ATTOM", sourceType: "PROPERTY_RECORD" },
        orderBy: { fetchedAt: "desc" },
        take: 100,
      }),
      prisma.marketSourceSnapshot.findMany({
        where: { provider: "ATTOM", sourceType: "AVM_VALUE" },
        orderBy: { fetchedAt: "desc" },
        take: 100,
      }),
      prisma.marketSourceSnapshot.findMany({
        where: { provider: "ATTOM", sourceType: "AVM_HISTORY" },
        orderBy: { fetchedAt: "desc" },
        take: 100,
      }),
      prisma.marketSourceSnapshot.findMany({
        where: {
          provider: "RentCast",
          sourceType: { in: ["SALE_LISTINGS", "RENTAL_LISTINGS"] },
        },
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
      if (snap.status === "SUCCESS")
        rentCastByProperty.set(snap.propertyId, snap);
    }
    for (const snap of attomSnapshots) {
      if (attomByProperty.has(snap.propertyId)) continue;
      if (snap.status === "SUCCESS") attomByProperty.set(snap.propertyId, snap);
    }
    // ATTOM AVM: keep the latest row per property regardless of status
    // so the UI can show "unavailable for plan" when applicable.
    for (const snap of attomAvmSnapshots) {
      if (!attomAvmByProperty.has(snap.propertyId)) {
        attomAvmByProperty.set(snap.propertyId, snap);
      }
    }
    for (const snap of attomAvmHistorySnapshots) {
      if (!attomAvmHistoryByProperty.has(snap.propertyId)) {
        attomAvmHistoryByProperty.set(snap.propertyId, snap);
      }
    }
    // Listings keyed by `zip:<zip>` propertyId. Latest SUCCESS per (zip, type).
    for (const snap of listingsSnapshots) {
      if (snap.status !== "SUCCESS") continue;
      const map =
        snap.sourceType === "SALE_LISTINGS"
          ? listingsByZipSale
          : listingsByZipRental;
      if (!map.has(snap.propertyId)) map.set(snap.propertyId, snap);
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
  const attomAvmFor = (id: string): MarketSourceSnapshot | null =>
    attomAvmByProperty.get(id) ?? null;
  const attomAvmHistoryFor = (id: string): MarketSourceSnapshot | null =>
    attomAvmHistoryByProperty.get(id) ?? null;

  // ----- Provider key/URL state + dynamic registry -----
  const keyConfigured = hasRentCastKey();
  const attomKeyConfigured = hasAttomKey();
  const fredKeyConfigured = hasFredKey();
  const zillowUrlConfigured = hasZillowZhviUrl();
  const fredObservations = getFredObservations(latestFredSnapshot);
  const zhviSeries = getZhviSeries(latestZillowSnapshot);

  const rentCastLatestFetchedAt =
    allRecentSnapshots.length > 0 ? allRecentSnapshots[0].fetchedAt : null;
  const attomLatestFetchedAt =
    allAttomSnapshots.length > 0 ? allAttomSnapshots[0].fetchedAt : null;
  const fredLatestFetchedAt = latestFredSnapshot?.fetchedAt ?? null;
  const zillowLatestFetchedAt = latestZillowSnapshot?.fetchedAt ?? null;

  const rentCastSnapshotsExist = rentCastByProperty.size > 0;
  const attomSnapshotsExist = attomByProperty.size > 0;
  const fredSnapshotExists =
    !!latestFredSnapshot && latestFredSnapshot.status === "SUCCESS";
  const zillowSnapshotExists =
    !!latestZillowSnapshot && latestZillowSnapshot.status === "SUCCESS";
  const dynamicSources: typeof marketSources = marketSources.map((s) => {
    if (s.id === "rentcast")
      return {
        ...s,
        status: rentCastSnapshotsExist
          ? "Connected"
          : keyConfigured
          ? "Planned"
          : "Not connected",
      };
    if (s.id === "attom")
      return {
        ...s,
        status: attomSnapshotsExist
          ? "Connected"
          : attomKeyConfigured
          ? "Planned"
          : "Not connected",
      };
    if (s.id === "fred")
      return {
        ...s,
        status: fredSnapshotExists
          ? "Connected"
          : fredKeyConfigured
          ? "Planned"
          : "Not connected",
      };
    if (s.id === "zillow-research")
      return {
        ...s,
        status: zillowSnapshotExists
          ? "Connected"
          : zillowUrlConfigured
          ? "Planned"
          : "Not connected",
      };
    return s;
  });
  const dynamicCounts = {
    connected: dynamicSources.filter((s) => s.status === "Connected").length,
    manual: dynamicSources.filter((s) => s.status === "Manual").length,
    total: dynamicSources.length,
  };

  // ----- Per-property pipelines -----
  type PropertyAnalysis = {
    property: TrackedProperty;
    house: HouseValue;
    rent: MarketRent;
    trend: ValueTrend;
    projection: ValueProjection;
    verifiedByAttom: boolean;
    attomFacts: AttomFacts | null;
    rentCastLastFetched: Date | null;
    attomLastFetched: Date | null;
    /** Comparables extracted from RentCast AVM responses. */
    saleComps: RentCastComp[];
    rentalComps: RentCastComp[];
    /** ATTOM AVM history points (oldest → newest). null when unavailable. */
    avmHistory: AttomAvmHistoryPoint[] | null;
    /** True when the latest ATTOM AVM snapshot was refused by plan/key. */
    avmUnavailableForPlan: boolean;
    yieldPct: number | null;
    /** 7-point series for the property valuation chart. Empty when the
     *  inputs (current AVM + ZIP trend) aren't available; the chart's
     *  built-in empty state handles that. */
    valuationSeries: ValuationPoint[];
  };

  /**
   * Build the property valuation chart series from existing pipeline
   * outputs. We don't have full historical AVM history yet, so:
   *   - Historical points (1y / 3y / 5y back) are derived by reversing
   *     the Zillow ZHVI ZIP growth rate from the current AVM. They're
   *     anchored on real provider data but are MODELED — not actual
   *     past appraisals. The card UI calls this out explicitly.
   *   - Current point uses the resolved house value + AVM range.
   *   - Historical and projection band points are trend-context-derived from
   *     that current AVM range, not provider appraisals.
   *   - Projection points use the existing internal projection (12 / 24 /
   *     36 month outputs, compounded at the ZIP annualized rate).
   *   - Benchmark line uses Zillow ZHVI: latest at current; reversed to
   *     each historical bucket using the same per-period growth rates.
   *   - ATTOM `lastSaleDate` becomes an "Acquisition" event marker on
   *     the nearest point when it falls inside the chart range.
   */
  function buildValuationSeries(
    house: HouseValue,
    trend: ValueTrend,
    projection: ValueProjection,
    facts: AttomFacts | null
  ): ValuationPoint[] {
    if (house.value == null || trend.zhvi == null) return [];

    const now = new Date();
    const yearsAgo = (n: number): Date => {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() - n);
      return d;
    };
    const monthsAhead = (n: number): Date => {
      const d = new Date(now);
      d.setMonth(d.getMonth() + n);
      return d;
    };
    const reverseGrowth = (
      current: number | null,
      change: number | null
    ): number | null => {
      if (current == null || change == null) return null;
      const denom = 1 + change;
      if (denom <= 0) return null;
      return current / denom;
    };

    const yoy = trend.zhvi.yoyChange ?? null;
    const y3 = trend.zhvi.threeYearChange ?? null;
    const y5 = trend.zhvi.fiveYearChange ?? null;
    const benchLatest = trend.zhvi.latestValue ?? null;
    const hasRange =
      house.value > 0 &&
      house.rangeLow != null &&
      house.rangeHigh != null &&
      house.rangeLow <= house.rangeHigh;
    const rangeFor = (
      value: number | null
    ): Pick<ValuationPoint, "lowerBound" | "upperBound"> => {
      if (!hasRange || value == null) return {};
      return {
        lowerBound: value * (house.rangeLow! / house.value!),
        upperBound: value * (house.rangeHigh! / house.value!),
      };
    };

    const points: ValuationPoint[] = [];

    const v5y = reverseGrowth(house.value, y5);
    const b5y = reverseGrowth(benchLatest, y5);
    if (v5y != null) {
      points.push({
        date: yearsAgo(5),
        propertyValue: v5y,
        ...rangeFor(v5y),
        benchmarkValue: b5y,
        isProjection: false,
      });
    }
    const v3y = reverseGrowth(house.value, y3);
    const b3y = reverseGrowth(benchLatest, y3);
    if (v3y != null) {
      points.push({
        date: yearsAgo(3),
        propertyValue: v3y,
        ...rangeFor(v3y),
        benchmarkValue: b3y,
        isProjection: false,
      });
    }
    const v1y = reverseGrowth(house.value, yoy);
    const b1y = reverseGrowth(benchLatest, yoy);
    if (v1y != null) {
      points.push({
        date: yearsAgo(1),
        propertyValue: v1y,
        ...rangeFor(v1y),
        benchmarkValue: b1y,
        isProjection: false,
      });
    }

    // Current — only point with a real RentCast valuation range.
    points.push({
      date: now,
      propertyValue: house.value,
      lowerBound: house.rangeLow,
      upperBound: house.rangeHigh,
      benchmarkValue: benchLatest,
      isProjection: false,
    });

    if (projection.m12 != null) {
      points.push({
        date: monthsAhead(12),
        propertyValue: projection.m12,
        ...rangeFor(projection.m12),
        isProjection: true,
      });
    }
    if (projection.m24 != null) {
      points.push({
        date: monthsAhead(24),
        propertyValue: projection.m24,
        ...rangeFor(projection.m24),
        isProjection: true,
      });
    }
    if (projection.m36 != null) {
      points.push({
        date: monthsAhead(36),
        propertyValue: projection.m36,
        ...rangeFor(projection.m36),
        isProjection: true,
      });
    }

    // Acquisition event — tag the nearest existing point.
    const acqRaw = facts?.lastSaleDate;
    if (acqRaw && points.length > 0) {
      const acq = new Date(acqRaw);
      if (!Number.isNaN(acq.getTime())) {
        const acqTs = acq.getTime();
        const firstTs = (points[0].date as Date).getTime();
        const lastTs = (points[points.length - 1].date as Date).getTime();
        if (acqTs >= firstTs && acqTs <= lastTs) {
          let nearestIdx = 0;
          let bestDelta = Number.POSITIVE_INFINITY;
          for (let i = 0; i < points.length; i++) {
            const t = (points[i].date as Date).getTime();
            const delta = Math.abs(t - acqTs);
            if (delta < bestDelta) {
              bestDelta = delta;
              nearestIdx = i;
            }
          }
          points[nearestIdx] = {
            ...points[nearestIdx],
            event: "Acquisition",
          };
        }
      }
    }

    return points;
  }

  function analyze(property: TrackedProperty): PropertyAnalysis {
    const m = entryFor(property.id);
    const rc = rentCastFor(property.id);
    const a = attomFor(property.id);
    const aAvm = attomAvmFor(property.id);
    const aAvmHistory = attomAvmHistoryFor(property.id);
    const facts = getAttomFacts(a);
    const house = resolveHouseValue(aAvm, a, rc, m);
    const rent = resolveMarketRent(rc, m);
    const trend = resolveValueTrend(property, zhviSeries);
    const projection = resolveValueProjection(house.value, trend.zhvi);
    const annualRent = rent.rent != null ? rent.rent * 12 : null;
    const yieldPct =
      house.value != null && annualRent != null && house.value > 0
        ? (annualRent / house.value) * 100
        : null;
    const { saleComps, rentalComps } = rc?.status === "SUCCESS"
      ? extractRentCastComps(rc.raw)
      : { saleComps: [], rentalComps: [] };
    return {
      property,
      house,
      rent,
      trend,
      projection,
      verifiedByAttom: !!facts,
      attomFacts: facts,
      rentCastLastFetched: rc?.fetchedAt ?? null,
      attomLastFetched: a?.fetchedAt ?? null,
      saleComps,
      rentalComps,
      avmHistory: getAttomAvmHistory(aAvmHistory),
      avmUnavailableForPlan: isAvmUnavailableForPlan(aAvm),
      yieldPct,
      valuationSeries: buildValuationSeries(house, trend, projection, facts),
    };
  }
  const businessAnalyses = businessProperties.map(analyze);
  const privateAnalysis = privateProperty ? analyze(privateProperty) : null;

  // ----- Tax resolver (ATTOM-first, manual fallback) -----
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

  // ----- KPIs (business-only; 14 MacAffer excluded) -----
  const valuedCount = businessAnalyses.filter(
    (a) => a.house.value != null
  ).length;
  const rentedCount = businessAnalyses.filter(
    (a) => a.rent.rent != null
  ).length;
  const portfolioValue = businessAnalyses.reduce<number | null>((acc, a) => {
    if (a.house.value == null) return acc;
    return (acc ?? 0) + a.house.value;
  }, null);
  const portfolioMonthlyRent = businessAnalyses.reduce<number | null>(
    (acc, a) => {
      if (a.rent.rent == null) return acc;
      return (acc ?? 0) + a.rent.rent;
    },
    null
  );
  const grossRentYield =
    portfolioValue != null &&
    portfolioMonthlyRent != null &&
    valuedCount === businessProperties.length &&
    rentedCount === businessProperties.length &&
    portfolioValue > 0
      ? (portfolioMonthlyRent * 12) / portfolioValue
      : null;

  const newestSourceTimestamp = [
    rentCastLatestFetchedAt,
    attomLatestFetchedAt,
    fredLatestFetchedAt,
    zillowLatestFetchedAt,
  ]
    .filter((d): d is Date => d != null)
    .sort((a, b) => a.getTime() - b.getTime())
    .pop();

  const FIELDS_PER_ASSET = 4;
  const totalCells = businessProperties.length * FIELDS_PER_ASSET;
  const populatedCells = businessAnalyses.reduce((acc, a) => {
    const t = resolveTax(a.property.id);
    let n = 0;
    if (a.house.value != null) n++;
    if (a.rent.rent != null) n++;
    if (t.assessedValue != null) n++;
    if (t.annualTaxes != null) n++;
    return acc + n;
  }, 0);
  const dataCompletenessPct =
    totalCells === 0 ? 0 : Math.round((populatedCells / totalCells) * 100);

  // ----- Needs-attention flags -----
  type Flag = { property: string; text: string };
  const flags: Flag[] = [];
  for (const a of businessAnalyses) {
    const m = entryFor(a.property.id);
    const t = resolveTax(a.property.id);
    if (
      !a.verifiedByAttom &&
      (a.property.factsNeedVerification || a.property.zipNeedsVerification)
    ) {
      flags.push({
        property: a.property.address,
        text: "Official records pending verification",
      });
    }
    if (a.house.value == null) {
      flags.push({
        property: a.property.address,
        text: "No house value available",
      });
    }
    if (a.rent.rent == null) {
      flags.push({
        property: a.property.address,
        text: "No rent estimate available",
      });
    }
    if (m == null || decimalToNumber(m.purchaseBasis) == null) {
      flags.push({
        property: a.property.address,
        text: "Acquisition basis not captured",
      });
    }
    if (a.rentCastLastFetched && isStale(a.rentCastLastFetched, 30)) {
      flags.push({
        property: a.property.address,
        text: `RentCast data stale (last refreshed ${relativeAge(
          a.rentCastLastFetched
        )})`,
      });
    }
    if (t.source === "None") {
      flags.push({
        property: a.property.address,
        text: "Tax / assessment data missing",
      });
    }
  }

  const businessTaxRows = businessProperties.map((p) => ({
    property: p,
    tax: resolveTax(p.id),
  }));
  const hasAnyTaxData = businessTaxRows.some((r) => r.tax.source !== "None");
  const marketNoteInput: MarketNoteInput = {
    portfolio: {
      businessAssets: businessProperties.length,
      houseValue: formatCurrency(portfolioValue),
      marketRent: formatRent(portfolioMonthlyRent),
      grossRentYield:
        grossRentYield != null
          ? `${(grossRentYield * 100).toFixed(2)}%`
          : dash,
      completeness:
        dataCompletenessPct === 0 ? "Not started" : formatPct(dataCompletenessPct),
    },
    properties: businessAnalyses.map((a) => ({
      address: a.property.address,
      city: a.property.city,
      zip: a.property.zip,
      houseValue: formatCurrency(a.house.value),
      houseSource: a.house.source,
      rent: formatRent(a.rent.rent),
      rentSource: a.rent.source,
      yieldPct: a.yieldPct != null ? `${a.yieldPct.toFixed(2)}%` : dash,
      refreshed: a.rentCastLastFetched
        ? relativeAge(a.rentCastLastFetched)
        : a.attomLastFetched
        ? relativeAge(a.attomLastFetched)
        : dash,
      verification: a.verifiedByAttom ? "ATTOM verified" : "Records pending",
    })),
    attentionItems: flags.map((f) => `${f.property}: ${f.text}`),
  };

  return (
    <div className="market-shell -mx-4 -my-6 flex flex-col gap-4 px-3 py-4 sm:-mx-6 sm:-my-8 sm:px-5 sm:py-5 lg:-mx-8 lg:-my-10 lg:px-6 lg:py-6">
      <header className="border border-[var(--market-border)] bg-[var(--market-surface)]">
        <div className="flex flex-col gap-3 border-b border-[var(--market-border)] px-3 py-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold leading-tight text-[var(--market-text)]">
              Market Intelligence
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-[var(--market-text-secondary)]">
              Real estate valuation monitor for current house value, market rent,
              evidence, trend context, and attention items.
            </p>
          </div>
          <details className="border border-[var(--market-border)] bg-[var(--market-bg)]">
            <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-4 px-3 py-2 text-sm text-[var(--market-text)] [&::-webkit-details-marker]:hidden">
              <span className="font-display font-semibold">Refresh controls</span>
              <span className="text-xs text-[var(--market-text-muted)]">
                Manual refresh only · external provider calls
              </span>
            </summary>
            <div className="flex max-w-4xl flex-wrap items-start gap-2 border-t border-[var(--market-border)] p-3">
              <RentCastRefreshButton keyConfigured={keyConfigured} />
              <RentCastListingsRefreshButton keyConfigured={keyConfigured} />
              <AttomRefreshButton keyConfigured={attomKeyConfigured} />
              <AttomAvmRefreshButton keyConfigured={attomKeyConfigured} />
              <FredRefreshButton keyConfigured={fredKeyConfigured} />
              <ZillowRefreshButton urlConfigured={zillowUrlConfigured} />
              <Link
                href="/market/manual"
                className="inline-flex min-h-[40px] items-center justify-center border border-[var(--market-border)] bg-transparent px-3 py-2 text-sm font-medium text-[var(--market-text)] hover:border-[var(--market-border-strong)]"
              >
                {manualEntries.size > 0 ? "Edit manual data" : "Add manual data"}
              </Link>
            </div>
          </details>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-3 py-2 text-xs text-[var(--market-text-muted)]">
          <FreshnessChip label="RentCast" ts={rentCastLatestFetchedAt} keyOk={keyConfigured} />
          <FreshnessChip label="ATTOM" ts={attomLatestFetchedAt} keyOk={attomKeyConfigured} />
          <FreshnessChip label="FRED" ts={fredLatestFetchedAt} keyOk={fredKeyConfigured} />
          <FreshnessChip label="Zillow ZHVI" ts={zillowLatestFetchedAt} keyOk={zillowUrlConfigured} />
          {!dbAvailable ? <ToneTag label="Error: database unavailable" tone="error" /> : null}
        </div>
      </header>

      <section className="overflow-x-auto border border-[var(--market-border)] bg-[var(--market-surface)]">
        <div className="grid min-w-[720px] grid-cols-5">
          <MetricStripItem
            label="Business assets"
            value={businessProperties.length}
            sublabel="Private reference excluded"
          />
          <MetricStripItem
            label="House market value"
            value={formatCurrency(portfolioValue)}
            sublabel={`${valuedCount}/${businessProperties.length} valued`}
          />
          <MetricStripItem
            label="Market rent"
            value={formatRent(portfolioMonthlyRent)}
            sublabel={`${rentedCount}/${businessProperties.length} rents`}
          />
          <MetricStripItem
            label="Gross rent yield"
            value={
              grossRentYield != null
                ? `${(grossRentYield * 100).toFixed(2)}%`
                : dash
            }
            sublabel="Annualized rent / value"
          />
          <MetricStripItem
            label="Freshness / completeness"
            value={
              dataCompletenessPct === 0 ? "NA" : formatPct(dataCompletenessPct)
            }
            sublabel={
              newestSourceTimestamp
                ? `Latest ${relativeAge(newestSourceTimestamp)}`
                : "Awaiting refresh"
            }
          />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-4">
          <TerminalSection
            title="Property valuation board"
            meta="House value and market rent are separate pipelines"
          >
            <div className="hidden grid-cols-[minmax(180px,1.35fr)_1fr_1fr_0.75fr_0.95fr_0.95fr_0.9fr_auto] border-b border-[var(--market-border)] px-3 py-2 text-[11px] text-[var(--market-text-muted)] xl:grid">
              <span>Property</span>
              <span>House value</span>
              <span>Market rent</span>
              <span>Yield</span>
              <span>Value source</span>
              <span>Rent source</span>
              <span>Fresh / verify</span>
              <span className="text-right">Analysis</span>
            </div>
            <div className="divide-y divide-[var(--market-border)]">
              {businessAnalyses.map((a) => (
                <PropertyValuationCard
                  key={a.property.id}
                  analysis={a}
                  isPrivate={false}
                />
              ))}
            </div>
          </TerminalSection>

          {privateAnalysis ? (
            <TerminalSection
              title="Private / Reference Only"
              meta={<ToneTag label="Private" tone="warning" />}
            >
              <div className="divide-y divide-[var(--market-border)]">
                <PropertyValuationCard analysis={privateAnalysis} isPrivate />
              </div>
              <p className="border-t border-[var(--market-border)] px-3 py-2 text-xs text-[var(--market-text-muted)]">
                14 MacAffer Dr is excluded from business KPIs. Values display
                only as private reference context.
              </p>
            </TerminalSection>
          ) : null}
        </div>

        <aside className="flex flex-col gap-4">
          <TerminalSection
            title="Attention tape"
            meta={flags.length === 0 ? "Clear" : `${flags.length} items`}
          >
            {flags.length === 0 ? (
              <p className="px-3 py-3 text-sm text-[var(--market-text-secondary)]">
                No critical market-data flags.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--market-border)]">
                {flags.map((f, i) => (
                  <li key={`${f.property}-${i}`} className="px-3 py-2">
                    <span className="block text-sm font-semibold text-[var(--market-text)]">
                      {f.property}
                    </span>
                    <span className="mt-0.5 block text-xs text-[var(--market-text-secondary)]">
                      {f.text}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </TerminalSection>
          <AIMarketNotePanel input={marketNoteInput} />
        </aside>
      </div>

      {/* ============================================================
           Area listings (collapsed; hidden when nothing is wired)
         ============================================================ */}
      {listingsByZipSale.size > 0 || listingsByZipRental.size > 0 ? (
        <details className="group rounded-[var(--radius-md)] border border-[var(--market-border)] bg-[var(--market-surface)]">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-[var(--market-text)] [&::-webkit-details-marker]:hidden">
            <span>
              Area listings{" "}
              <span className="text-[11px] font-normal text-[var(--market-text-muted)]">
                · RentCast · sale + rental, by ZIP
              </span>
            </span>
            <span aria-hidden className="text-[var(--market-text-muted)]">
              ▾
            </span>
          </summary>
          <div className="grid grid-cols-1 gap-3 border-t border-[var(--market-border)] p-4 lg:grid-cols-2">
            {Array.from(
              new Set([
                ...Array.from(listingsByZipSale.keys()),
                ...Array.from(listingsByZipRental.keys()),
              ])
            ).map((key) => {
              const sale = listingsByZipSale.get(key) ?? null;
              const rental = listingsByZipRental.get(key) ?? null;
              const saleListings = getRentCastListings(sale);
              const rentalListings = getRentCastListings(rental);
              const zip = key.replace(/^zip:/, "");
              return (
                <div
                  key={key}
                  className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--market-border)] p-3"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold text-[var(--market-text)]">
                      ZIP {zip}
                    </span>
                    <span className="text-[10px] text-[var(--market-text-muted)]">
                      Sale: {saleListings?.length ?? 0} · Rental:{" "}
                      {rentalListings?.length ?? 0}
                      {sale ? ` · sale ${relativeAge(sale.fetchedAt)}` : ""}
                      {rental ? ` · rental ${relativeAge(rental.fetchedAt)}` : ""}
                    </span>
                  </div>
                  <ListingPreview
                    title="Sale"
                    kind="sale"
                    listings={saleListings ?? []}
                  />
                  <ListingPreview
                    title="Rental"
                    kind="rent"
                    listings={rentalListings ?? []}
                  />
                </div>
              );
            })}
          </div>
          <p className="border-t border-[var(--market-border)] px-4 py-2.5 text-[11px] text-[var(--market-text-muted)]">
            Listings are area-wide context (per-ZIP). Use Refresh data → Refresh
            RentCast listings to fetch.
          </p>
        </details>
      ) : null}

      {/* ============================================================
           Macro & Rate Context (collapsed by default)
         ============================================================ */}
      <details className="group rounded-[var(--radius-md)] border border-[var(--market-border)] bg-[var(--market-surface)]">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-[var(--market-text)] [&::-webkit-details-marker]:hidden">
          <span>
            Macro & rate context{" "}
            <span className="text-[11px] font-normal text-[var(--market-text-muted)]">
              · FRED ·{" "}
              {fredLatestFetchedAt ? relativeAge(fredLatestFetchedAt) : "no data"}
            </span>
          </span>
          <span aria-hidden className="text-[var(--market-text-muted)]">
            ▾
          </span>
        </summary>
        <div className="border-t border-[var(--market-border)] p-4">
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
        </div>
      </details>

      {/* ============================================================
           ZIP value trend (collapsed by default; hidden if no data)
         ============================================================ */}
      {zhviSeries ? (
        <details className="group rounded-[var(--radius-md)] border border-[var(--market-border)] bg-[var(--market-surface)]">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-[var(--market-text)] [&::-webkit-details-marker]:hidden">
            <span>
              ZIP value trend{" "}
              <span className="text-[11px] font-normal text-[var(--market-text-muted)]">
                · Zillow ZHVI ·{" "}
                {zillowLatestFetchedAt
                  ? relativeAge(zillowLatestFetchedAt)
                  : "no data"}
              </span>
            </span>
            <span aria-hidden className="text-[var(--market-text-muted)]">
              ▾
            </span>
          </summary>
          <div className="grid grid-cols-1 gap-3 border-t border-[var(--market-border)] p-4 sm:grid-cols-2">
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
                      {properties.length > 0 ? properties.join(", ") : ""}
                    </span>
                  </div>
                  <span className="font-mono text-xl font-semibold tabular-nums text-[var(--market-text)]">
                    {formatCurrency(s?.latestValue ?? null)}
                  </span>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                    <span style={{ color: pctChangeColor(s?.yoyChange ?? null) }}>
                      1y {formatPctChange(s?.yoyChange ?? null)}
                    </span>
                    <span
                      style={{
                        color: pctChangeColor(s?.threeYearChange ?? null),
                      }}
                    >
                      3y {formatPctChange(s?.threeYearChange ?? null)}
                    </span>
                    <span
                      style={{
                        color: pctChangeColor(s?.fiveYearChange ?? null),
                      }}
                    >
                      5y {formatPctChange(s?.fiveYearChange ?? null)}
                    </span>
                  </div>
                  <span className="text-[10px] text-[var(--market-text-muted)]">
                    as of {s?.latestDate ? formatDate(s.latestDate) : dash} ·
                    Trend context only — not a property estimate.
                  </span>
                </div>
              );
            })}
          </div>
        </details>
      ) : null}

      {/* ============================================================
           Tax & Assessment (collapsed; hidden if no data)
         ============================================================ */}
      {hasAnyTaxData ? (
        <details className="group rounded-[var(--radius-md)] border border-[var(--market-border)] bg-[var(--market-surface)]">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-[var(--market-text)] [&::-webkit-details-marker]:hidden">
            <span>
              Tax & assessment{" "}
              <span className="text-[11px] font-normal text-[var(--market-text-muted)]">
                · ATTOM-first · manual fallback
              </span>
            </span>
            <span aria-hidden className="text-[var(--market-text-muted)]">
              ▾
            </span>
          </summary>
          <ul className="divide-y divide-[var(--market-border)] border-t border-[var(--market-border)]">
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
        </details>
      ) : null}

      {/* ============================================================
           Source diagnostics (collapsed)
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
          Comparables, neighborhood signals, and risk indicators remain
          deferred until additional data sources are connected.
        </p>
      </details>
    </div>
  );
}

// =============================================================
// Property valuation card
// =============================================================

type PropertyAnalysis = {
  property: TrackedProperty;
  house: HouseValue;
  rent: MarketRent;
  trend: ValueTrend;
  projection: ValueProjection;
  verifiedByAttom: boolean;
  attomFacts: AttomFacts | null;
  rentCastLastFetched: Date | null;
  attomLastFetched: Date | null;
  saleComps: RentCastComp[];
  rentalComps: RentCastComp[];
  avmHistory: AttomAvmHistoryPoint[] | null;
  avmUnavailableForPlan: boolean;
  yieldPct: number | null;
  valuationSeries: ValuationPoint[];
};

function PropertyValuationCard({
  analysis,
  isPrivate,
}: {
  analysis: PropertyAnalysis;
  isPrivate: boolean;
}) {
  const { property, house, rent, verifiedByAttom } = analysis;
  const lastRefreshed =
    [
      house.asOfDate,
      rent.asOfDate,
      analysis.rentCastLastFetched,
      analysis.attomLastFetched,
    ]
      .filter((d): d is Date => d instanceof Date)
      .sort((a, b) => a.getTime() - b.getTime())
      .pop() ?? null;
  const verificationLabel = verifiedByAttom
    ? "ATTOM verified"
    : property.factsNeedVerification || property.zipNeedsVerification
    ? "Records pending"
    : "Manual notes";
  const verificationTone: keyof typeof statusTokens = verifiedByAttom
    ? "success"
    : property.factsNeedVerification || property.zipNeedsVerification
    ? "warning"
    : "neutral";
  const valueRange =
    house.rangeLow != null && house.rangeHigh != null
      ? `${formatCurrency(house.rangeLow)}-${formatCurrency(house.rangeHigh)}`
      : dash;
  const rentRange =
    rent.rangeLow != null && rent.rangeHigh != null
      ? `${formatCurrency(rent.rangeLow)}-${formatCurrency(rent.rangeHigh)}/mo`
      : dash;
  const stale = lastRefreshed != null ? isStale(lastRefreshed, 30) : false;

  return (
    <article
      className={`border-b border-[var(--market-border)] last:border-b-0 ${
        isPrivate
          ? "border border-dashed border-[var(--market-amber)] bg-transparent"
          : "bg-[var(--market-surface)]"
      }`}
    >
      <div className="grid grid-cols-1 gap-3 px-3 py-3 xl:grid-cols-[minmax(190px,1.35fr)_minmax(120px,0.95fr)_minmax(120px,0.95fr)_minmax(90px,0.65fr)_minmax(105px,0.75fr)_minmax(105px,0.75fr)_minmax(110px,0.8fr)_auto] xl:items-center">
        <div className="min-w-0">
          <h3 className="truncate font-display text-sm font-semibold text-[var(--market-text)]">
            {property.address}
          </h3>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--market-text-muted)]">
            <span>
              {property.city}
              {property.zip ? ` / ZIP ${property.zip}` : ""}
            </span>
            {property.workspaceHref ? (
              <Link
                href={property.workspaceHref}
                className="text-[var(--market-cyan)] hover:underline"
              >
                workspace
              </Link>
            ) : null}
          </div>
          {isPrivate ? (
            <p className="mt-1 text-[11px] text-[var(--market-amber)]">
              Private / Reference Only · excluded from business KPIs
            </p>
          ) : null}
        </div>

        <BoardCell
          label="House market value"
          value={
            <span className="font-semibold">{formatCurrency(house.value)}</span>
          }
          sub={valueRange !== dash ? `Range ${valueRange}` : "Range unavailable"}
        />
        <BoardCell
          label="Market rent"
          value={
            <span className="font-semibold">{formatRent(rent.rent)}</span>
          }
          sub={rentRange !== dash ? `Range ${rentRange}` : "Range unavailable"}
        />
        <BoardCell
          label="Gross rent yield"
          value={
            <span>
              {analysis.yieldPct != null
                ? `${analysis.yieldPct.toFixed(2)}%`
                : dash}
            </span>
          }
          sub="Annualized rent ÷ value"
        />
        <BoardCell label="Value source" value={house.source} />
        <BoardCell label="Rent source" value={rent.source} />
        <BoardCell
          label="Last update"
          value={lastRefreshed ? relativeAge(lastRefreshed) : dash}
          sub={
            lastRefreshed ? formatDate(lastRefreshed.toISOString()) : "No snapshot"
          }
        />
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-[11px] text-[var(--market-text-muted)]">
            Verification
          </span>
          <div className="flex flex-wrap gap-1.5">
            <ToneTag label={verificationLabel} tone={verificationTone} />
            {stale ? <ToneTag label="Stale" tone="warning" /> : null}
            {isPrivate ? <ToneTag label="Private" tone="warning" /> : null}
          </div>
          {analysis.avmUnavailableForPlan ? (
            <span className="text-[11px] text-[var(--market-text-muted)]">
              ATTOM AVM plan/key limit
            </span>
          ) : null}
        </div>

        <details className="group xl:col-span-8">
          <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-center border border-[var(--market-border)] px-3 py-2 text-sm font-semibold text-[var(--market-text)] transition hover:border-[var(--market-cyan)] focus:outline-none focus:ring-2 focus:ring-[var(--market-cyan)] xl:ml-auto xl:w-fit [&::-webkit-details-marker]:hidden">
            Analysis
          </summary>
          <div className="mt-3 border border-[var(--market-border)] bg-[var(--market-surface)]">
            <PropertyAnalysisDetails
              analysis={analysis}
              valueRange={valueRange}
              rentRange={rentRange}
            />
          </div>
        </details>
      </div>
    </article>
  );
}

function PropertyAnalysisDetails({
  analysis,
  valueRange,
  rentRange,
}: {
  analysis: PropertyAnalysis;
  valueRange: string;
  rentRange: string;
}) {
  const { property, trend, projection } = analysis;

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <DetailCell label="Value range" value={valueRange} sub="AVM range" />
        <DetailCell label="Rent range" value={rentRange} sub="RentCast range" />
        <DetailCell
          label="Sale comps"
          value={analysis.saleComps.length}
          sub="Top evidence below"
        />
        <DetailCell
          label="Rental comps"
          value={analysis.rentalComps.length}
          sub="Top evidence below"
        />
      </div>

      <TerminalDisclosure
        title="Valuation chart"
        meta={`${analysis.valuationSeries.length} points · ZIP trend context`}
      >
        <div className="p-3">
          <PropertyValuationChart
            propertyName={property.address}
            zip={property.zip ?? undefined}
            data={analysis.valuationSeries}
            height={260}
          />
          <p className="mt-2 text-[11px] text-[var(--market-text-muted)]">
            Chart uses current AVM plus ZIP ZHVI trend context and internal
            projections. Not an appraisal. Historical points and non-current
            range bands are trend-context-derived, not actual historical
            appraisals.
          </p>
        </div>
      </TerminalDisclosure>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <TerminalDisclosure
          title="Comps"
          meta={`${analysis.saleComps.length} sale · ${analysis.rentalComps.length} rental`}
        >
          <div className="grid grid-cols-1 gap-3 p-3">
            {analysis.saleComps.length > 0 ? (
              <CompsList
                title="Sale comps"
                kind="sale"
                comps={analysis.saleComps}
              />
            ) : (
              <p className="text-sm text-[var(--market-text-muted)]">
                No sale comps returned.
              </p>
            )}
            {analysis.rentalComps.length > 0 ? (
              <CompsList
                title="Rental comps"
                kind="rent"
                comps={analysis.rentalComps}
              />
            ) : (
              <p className="text-sm text-[var(--market-text-muted)]">
                No rental comps returned.
              </p>
            )}
          </div>
        </TerminalDisclosure>

        <TerminalDisclosure
          title="Records"
          meta={analysis.verifiedByAttom ? "ATTOM returned" : "Manual fallback"}
        >
          <div className="p-3">
            <RecordFacts facts={analysis.attomFacts} fallback={property.notes} />
          </div>
        </TerminalDisclosure>
      </div>

      <TerminalDisclosure
        title="Trend / projection"
        meta="Internal projection · not provider forecast"
      >
        <div className="grid grid-cols-1 gap-3 p-3 lg:grid-cols-2">
          <div className="border border-[var(--market-border)] bg-[var(--market-surface-raised)] p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-sm font-semibold text-[var(--market-text)]">
                ZIP value trend{property.zip ? ` · ZIP ${property.zip}` : ""}
              </span>
              <span className="font-data text-[11px] text-[var(--market-text-muted)]">
                {trend.zhvi?.latestDate
                  ? formatDate(trend.zhvi.latestDate)
                  : "No ZHVI data"}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <DetailCell
                label="1Y"
                value={formatPctChange(trend.zhvi?.yoyChange ?? null)}
              />
              <DetailCell
                label="3Y"
                value={formatPctChange(trend.zhvi?.threeYearChange ?? null)}
              />
              <DetailCell
                label="5Y"
                value={formatPctChange(trend.zhvi?.fiveYearChange ?? null)}
              />
              <DetailCell
                label="ZHVI"
                value={formatCurrency(trend.zhvi?.latestValue ?? null)}
              />
            </div>
            <p className="mt-2 text-[11px] text-[var(--market-text-muted)]">
              ZIP-level home value index. Trend context only, not a property
              estimate.
            </p>
          </div>

          <div className="border border-[var(--market-border)] bg-[var(--market-surface-raised)] p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-sm font-semibold text-[var(--market-text)]">
                Internal projection
              </span>
              <span className="font-data text-[11px] text-[var(--market-text-muted)]">
                {projection.rateSource
                  ? `${formatPctChange(projection.rate)}/yr · ${projection.rateSource}`
                  : "Not calculable"}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <BoardCell label="12 mo" value={formatCurrency(projection.m12)} />
              <BoardCell label="24 mo" value={formatCurrency(projection.m24)} />
              <BoardCell label="36 mo" value={formatCurrency(projection.m36)} />
            </div>
            <p className="mt-2 text-[11px] text-[var(--market-text-muted)]">
              Internal projection · based on current AVM + ZIP trend. Not a
              provider forecast.
            </p>
          </div>
        </div>
      </TerminalDisclosure>

      <TerminalDisclosure title="Source details" meta="Pipeline boundaries">
        <div className="flex flex-col gap-3 p-3">
          {analysis.avmHistory && analysis.avmHistory.length > 0 ? (
            <div>
              <h4 className="text-sm font-semibold text-[var(--market-text)]">
                ATTOM AVM history
              </h4>
              <div className="mt-2">
                <AvmHistoryList points={analysis.avmHistory} />
              </div>
            </div>
          ) : analysis.avmUnavailableForPlan ? (
            <p className="text-sm text-[var(--market-text-muted)]">
              ATTOM AVM history unavailable for current plan/key.
            </p>
          ) : null}
          <p className="text-[11px] text-[var(--market-text-muted)]">
            House value and rent use separate pipelines. House value is never
            calculated from rent. Rent forecasts are not invented from
            home-value trend. Zillow ZHVI and FRED are context only.
          </p>
        </div>
      </TerminalDisclosure>
    </div>
  );
}

function RecordFacts({
  facts,
  fallback,
}: {
  facts: AttomFacts | null;
  fallback?: string | null;
}) {
  if (!facts) {
    return (
      <p className="text-sm text-[var(--market-text-secondary)]">
        {fallback ?? "Manual notes are the fallback record context."}
      </p>
    );
  }

  type RecordFactItem = {
    label: string;
    value: ReactNode;
    sub?: ReactNode;
  };
  const visibleFactCandidates: Array<RecordFactItem | null> = [
    facts.apn ? { label: "APN", value: facts.apn } : null,
    facts.yearBuilt != null
      ? { label: "Year built", value: facts.yearBuilt }
      : null,
    facts.buildingSize != null
      ? {
          label: "Building size",
          value: `${facts.buildingSize.toLocaleString()} sqft`,
        }
      : null,
    facts.assessedValue != null
      ? { label: "Assessed value", value: formatCurrency(facts.assessedValue) }
      : null,
    facts.annualTaxes != null
      ? { label: "Annual taxes", value: formatCurrency(facts.annualTaxes) }
      : null,
    facts.lastSalePrice != null
      ? {
          label: "Last sale",
          value: formatCurrency(facts.lastSalePrice),
          sub: facts.lastSaleDate ? formatDate(facts.lastSaleDate) : undefined,
        }
      : null,
    facts.propertyClass
      ? { label: "Class", value: facts.propertyClass }
      : null,
  ];
  const visibleFacts = visibleFactCandidates.filter(
    (item): item is RecordFactItem => item != null
  );

  const allFacts = [
    { label: "ATTOM ID", value: facts.attomId ?? dash },
    { label: "APN", value: facts.apn ?? dash },
    { label: "FIPS", value: facts.fips ?? dash },
    { label: "Address", value: facts.addressOneLine ?? dash },
    { label: "Year built", value: facts.yearBuilt ?? dash },
    {
      label: "Building size",
      value:
        facts.buildingSize != null
          ? `${facts.buildingSize.toLocaleString()} sqft`
          : dash,
    },
    { label: "Assessed value", value: formatCurrency(facts.assessedValue) },
    { label: "Market value", value: formatCurrency(facts.marketValue) },
    { label: "Annual taxes", value: formatCurrency(facts.annualTaxes) },
    { label: "Last sale", value: formatCurrency(facts.lastSalePrice) },
    {
      label: "Last sale date",
      value: facts.lastSaleDate ? formatDate(facts.lastSaleDate) : dash,
    },
    { label: "Class", value: facts.propertyClass ?? dash },
  ];

  return (
    <div className="flex flex-col gap-3">
      {visibleFacts.length > 0 ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {visibleFacts.map((fact) => (
            <DetailCell
              key={fact.label}
              label={fact.label}
              value={fact.value}
              sub={fact.sub}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-[var(--market-text-muted)]">
          ATTOM record returned, but year built / size / tax fields were not
          included.
        </p>
      )}
      <details>
        <summary className="min-h-[44px] cursor-pointer list-none text-sm font-semibold text-[var(--market-cyan)] [&::-webkit-details-marker]:hidden">
          All record fields
        </summary>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {allFacts.map((fact) => (
            <DetailCell key={fact.label} label={fact.label} value={fact.value} />
          ))}
        </div>
      </details>
    </div>
  );
}

// =============================================================
// Local sub-components
// =============================================================

function CompsList({
  title,
  kind,
  comps,
}: {
  title: string;
  kind: "sale" | "rent";
  comps: RentCastComp[];
}) {
  const slice = comps.slice(0, 5);
  const remaining = comps.slice(5);
  const renderAmount = (amount: number | null) => {
    if (amount == null) return kind === "rent" ? "rent not returned" : dash;
    return kind === "sale"
      ? formatCurrency(amount)
      : `${formatCurrency(amount)}/mo`;
  };
  const renderRows = (rows: RentCastComp[]) =>
    rows.map((c, i) => (
      <tr
        key={`${c.address}-${i}`}
        className="border-t border-[var(--market-border)]"
      >
        <td className="max-w-[220px] truncate py-2 pr-3 text-[var(--market-text)]">
          {c.address ?? dash}
        </td>
        <td className="py-2 pr-3 font-data tabular-nums text-[var(--market-text)]">
          {renderAmount(c.amount)}
        </td>
        <td className="py-2 pr-3 text-[var(--market-text-muted)]">
          {[
            c.beds != null ? `${c.beds}bd` : null,
            c.baths != null ? `${c.baths}ba` : null,
          ]
            .filter(Boolean)
            .join(" / ") || dash}
        </td>
        <td className="py-2 pr-3 font-data tabular-nums text-[var(--market-text-muted)]">
          {c.sqft != null ? `${c.sqft.toLocaleString()} sqft` : dash}
        </td>
        <td className="py-2 pr-3 font-data tabular-nums text-[var(--market-text-muted)]">
          {c.distanceMiles != null ? `${c.distanceMiles.toFixed(1)} mi` : dash}
        </td>
        <td className="py-2 font-data tabular-nums text-[var(--market-text-muted)]">
          {c.date ? formatDate(c.date) : c.status ?? dash}
        </td>
      </tr>
    ));

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[10px] uppercase tracking-wide text-[var(--market-text-muted)]">
        {title}
      </span>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] border-collapse text-left text-[11px]">
          <thead>
            <tr className="text-[10px] text-[var(--market-text-muted)]">
              <th className="pb-1 pr-3 font-normal">Address</th>
              <th className="pb-1 pr-3 font-normal">
                {kind === "sale" ? "Price" : "Rent"}
              </th>
              <th className="pb-1 pr-3 font-normal">Beds/Baths</th>
              <th className="pb-1 pr-3 font-normal">Sqft</th>
              <th className="pb-1 pr-3 font-normal">Distance</th>
              <th className="pb-1 font-normal">Date/Status</th>
            </tr>
          </thead>
          <tbody>{renderRows(slice)}</tbody>
        </table>
      </div>
      {remaining.length > 0 ? (
        <details>
          <summary className="min-h-[44px] cursor-pointer list-none text-[11px] font-semibold text-[var(--market-cyan)] [&::-webkit-details-marker]:hidden">
            Show all comps ({remaining.length} more)
          </summary>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse text-left text-[11px]">
              <tbody>{renderRows(remaining)}</tbody>
            </table>
          </div>
        </details>
      ) : null}
    </div>
  );
}

function AvmHistoryList({ points }: { points: AttomAvmHistoryPoint[] }) {
  // Show a compact table of the most recent 8 points (newest first).
  const ordered = [...points].sort((a, b) => {
    const ad = a.date ? new Date(a.date).getTime() : 0;
    const bd = b.date ? new Date(b.date).getTime() : 0;
    return bd - ad;
  });
  const slice = ordered.slice(0, 8);
  return (
    <ul className="flex flex-col divide-y divide-[var(--market-border)]">
      {slice.map((p, i) => (
        <li
          key={`${p.date ?? i}`}
          className="grid grid-cols-1 gap-x-3 py-1.5 text-[11px] sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-baseline"
        >
          <span className="text-[var(--market-text)]">
            {p.date ? formatDate(p.date) : dash}
          </span>
          <span className="font-mono tabular-nums text-[var(--market-text)] sm:text-right">
            {formatCurrency(p.estimatedValue)}
          </span>
          <span className="text-[var(--market-text-muted)] sm:text-right">
            {p.valueLow != null && p.valueHigh != null
              ? `${formatCurrency(p.valueLow)}–${formatCurrency(p.valueHigh)}`
              : dash}
          </span>
          <span className="text-[var(--market-text-muted)] sm:text-right">
            {p.confidence != null ? `conf ${p.confidence}` : dash}
          </span>
        </li>
      ))}
    </ul>
  );
}

function ListingPreview({
  title,
  kind,
  listings,
}: {
  title: string;
  kind: "sale" | "rent";
  listings: RentCastListing[];
}) {
  const slice = listings.slice(0, 5);
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wide text-[var(--market-text-muted)]">
        {title}
      </span>
      {slice.length === 0 ? (
        <span className="text-[11px] text-[var(--market-text-muted)]">
          No {title.toLowerCase()} listings yet.
        </span>
      ) : (
        <ul className="flex flex-col divide-y divide-[var(--market-border)]">
          {slice.map((l, i) => (
            <li
              key={`${l.id ?? l.formattedAddress ?? i}`}
              className="grid grid-cols-1 gap-x-3 py-1.5 text-[11px] sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-baseline"
            >
              <span className="truncate text-[var(--market-text)]">
                {l.formattedAddress ?? dash}
              </span>
              <span className="font-mono tabular-nums text-[var(--market-text)] sm:text-right">
                {l.amount != null
                  ? kind === "sale"
                    ? formatCurrency(l.amount)
                    : `${formatCurrency(l.amount)}/mo`
                  : dash}
              </span>
              <span className="text-[var(--market-text-muted)] sm:text-right">
                {[
                  l.beds != null ? `${l.beds}bd` : null,
                  l.baths != null ? `${l.baths}ba` : null,
                  l.sqft != null ? `${l.sqft.toLocaleString()} sqft` : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || dash}
              </span>
              <span className="text-[var(--market-text-muted)] sm:text-right">
                {l.daysOnMarket != null
                  ? `${l.daysOnMarket}d on market`
                  : l.date
                  ? formatDate(l.date)
                  : (l.status ?? dash)}
              </span>
            </li>
          ))}
        </ul>
      )}
      {listings.length > slice.length ? (
        <span className="text-[10px] text-[var(--market-text-muted)]">
          + {listings.length - slice.length} more in raw response
        </span>
      ) : null}
    </div>
  );
}

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
