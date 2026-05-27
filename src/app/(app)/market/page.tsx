/**
 * Market Tracker — main route.
 *
 * Server component. Loads every snapshot in parallel, runs per-property
 * pipelines (house value, market rent, ZIP trend, projection, comps,
 * records), and renders the workspace. Provider/data logic is unchanged
 * from the previous revision; only the UI structure has been replaced.
 *
 * Layout zones (desktop):
 *   1. Top header (title, freshness chips, flat refresh row)
 *   2. Portfolio snapshot (5 metric cards)
 *   3. Two-column main:
 *      Left  — property cards (business + private/reference)
 *      Right — AI analysis + needs attention
 *   4. Source diagnostics (bottom)
 *
 * Tablet (md+): single main column; AI / attention move below the snapshot.
 * Mobile (<md): single column; refresh row stacks; tabs scroll horizontally.
 */

import type {
  MarketManualEntry,
  MarketSourceSnapshot,
} from "@prisma/client";
import {
  type AttomAvmHistoryPoint,
  type AttomAvmValue,
  type AttomFacts,
  hasAttomKey,
} from "@/lib/attom";
import {
  type CensusAcsNormalized,
  hasCensusKey,
} from "@/lib/census";
import {
  type GoogleGeocodeNormalized,
  hasGoogleMapsServerKey,
} from "@/lib/google-maps";
import { hasXaiKey } from "@/lib/xai";
import { getAiProvider } from "@/lib/ai";
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
  formatRent,
  getTrackedProperties,
  type TrackedProperty,
} from "@/lib/market-data";
import {
  decimalToNumber,
  getManualEntryMap,
} from "@/lib/market-manual";
import { prisma } from "@/lib/prisma";
import {
  type RentCastComp,
  extractRentCastComps,
  hasRentCastKey,
} from "@/lib/rentcast";
import { marketSources } from "@/lib/market-sources";
import {
  type ZhviSeries,
  type ZillowTargetZip,
  hasZillowZhviUrl,
} from "@/lib/zillow-research";
import { AiMarketAnalysisPanel } from "./components/ai-market-analysis-panel";
import {
  type CoverageRow,
  type RoadmapRow,
} from "./components/data-coverage-panel";
import { MarketTrackerSettings } from "./components/market-tracker-settings";
import {
  SourceStatusRow,
  type SourceStatus,
} from "./components/source-status-row";
import {
  LocationDemographicsPanel,
  type CensusRow,
  type GeocodeRow,
} from "./components/location-demographics-panel";
import {
  MacroContextPanel,
  type MacroSeriesObservation,
} from "./components/macro-context-panel";
import { MarketHeader } from "./components/market-header";
import { MarketCommandTrigger } from "./components/market-command-trigger";
import {
  NeedsAttentionPanel,
  type NeedsAttentionGroup,
} from "./components/needs-attention-panel";
import { PortfolioSnapshot } from "./components/portfolio-snapshot";
import {
  PropertyCard,
  type PropertyCardData,
  type PropertyComp,
  type SerializableValuationPoint,
} from "./components/property-card";
import { type ValuationPoint } from "./components/property-valuation-chart";
import { type SourceDiagnosticsRow } from "./components/source-diagnostics-panel";
import type { MarketNoteInput } from "./market-note-actions";

export const dynamic = "force-dynamic";

// =============================================================
// Snapshot accessors
// =============================================================

function getAttomFacts(snap: MarketSourceSnapshot | null): AttomFacts | null {
  if (!snap || snap.status !== "SUCCESS") return null;
  const raw = snap.raw as { facts?: unknown } | null;
  return (raw?.facts as AttomFacts | undefined) ?? null;
}

function getAttomAvm(snap: MarketSourceSnapshot | null): AttomAvmValue | null {
  if (!snap || snap.status !== "SUCCESS") return null;
  const raw = snap.raw as { avm?: unknown } | null;
  return (raw?.avm as AttomAvmValue | undefined) ?? null;
}

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

function formatFredObsDate(value: string | null | undefined): string {
  if (!value) return dash;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return dash;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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

function toDateOrNull(value: unknown): Date | null {
  if (value == null) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function toIsoStringOrNull(value: unknown): string | null {
  return toDateOrNull(value)?.toISOString() ?? null;
}

function toDateLabel(value: unknown): string {
  const d = toDateOrNull(value);
  if (!d) return dash;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function relativeAge(value: unknown): string {
  const d = toDateOrNull(value);
  if (!d) return dash;
  const ms = Date.now() - d.getTime();
  if (Number.isNaN(ms)) return dash;
  const days = Math.floor(ms / 86_400_000);
  if (days < 0) return toDateLabel(d);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function censusOrMapsCoverageStatus(
  hasSuccess: boolean,
  keyConfigured: boolean
): "Connected" | "Planned" | "Missing" {
  if (hasSuccess) return "Connected";
  if (keyConfigured) return "Planned";
  return "Missing";
}

function isStale(value: unknown, daysThreshold: number): boolean {
  const d = toDateOrNull(value);
  if (!d) return false;
  const ms = Date.now() - d.getTime();
  if (Number.isNaN(ms)) return false;
  return ms / 86_400_000 > daysThreshold;
}

// =============================================================
// Pipelines
// =============================================================

type HouseValue = {
  value: number | null;
  source: "ATTOM AVM" | "RentCast" | "Manual" | "None";
  asOfDate: Date | null;
  rangeLow: number | null;
  rangeHigh: number | null;
  confidence: number | null;
};

function resolveHouseValue(
  attomAvm: MarketSourceSnapshot | null,
  attomFacts: MarketSourceSnapshot | null,
  rentCast: MarketSourceSnapshot | null,
  manual: MarketManualEntry | null
): HouseValue {
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

type ValueTrend = {
  zhvi: ZhviSeries | null;
  annualizedRate: number | null;
};

function resolveValueTrend(
  property: TrackedProperty,
  zhvi: Record<ZillowTargetZip, ZhviSeries | null> | null
): ValueTrend {
  const zip = property.zip as ZillowTargetZip | null | undefined;
  const series = zip && zhvi ? zhvi[zip] ?? null : null;
  if (!series) return { zhvi: null, annualizedRate: null };
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

type ValueProjection = {
  m12: number | null;
  m24: number | null;
  m36: number | null;
  rateSource:
    | "Zillow ZHVI 1Y"
    | "Zillow ZHVI 3Y annualized"
    | "Zillow ZHVI 5Y annualized"
    | null;
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

/**
 * Build the property valuation chart series from existing pipeline outputs.
 *
 * We don't have full historical AVM history yet, so:
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

// =============================================================
// Page
// =============================================================

export default async function MarketPage() {
  const allProperties = await getTrackedProperties();
  const businessProperties = allProperties.filter((p) => p.kind === "business");
  const privateProperty = allProperties.find((p) => p.kind === "private");

  // ---------- Load every data source in parallel ----------
  let manualEntries = new Map<string, MarketManualEntry>();
  const rentCastByProperty = new Map<string, MarketSourceSnapshot>();
  const attomByProperty = new Map<string, MarketSourceSnapshot>();
  const attomAvmByProperty = new Map<string, MarketSourceSnapshot>();
  const attomAvmHistoryByProperty = new Map<string, MarketSourceSnapshot>();
  let allRecentSnapshots: MarketSourceSnapshot[] = [];
  let allAttomSnapshots: MarketSourceSnapshot[] = [];
  let latestFredSnapshot: MarketSourceSnapshot | null = null;
  let latestZillowSnapshot: MarketSourceSnapshot | null = null;
  let googleMapsSnapshots: MarketSourceSnapshot[] = [];
  let censusSnapshots: MarketSourceSnapshot[] = [];
  let dbAvailable = true;
  try {
    const [
      manualMap,
      recentSnapshots,
      attomSnapshots,
      attomAvmSnapshots,
      attomAvmHistorySnapshots,
      fredLatest,
      zillowLatest,
      googleMapsLatest,
      censusLatest,
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
      prisma.marketSourceSnapshot.findFirst({
        where: { provider: "FRED" },
        orderBy: { fetchedAt: "desc" },
      }),
      prisma.marketSourceSnapshot.findFirst({
        where: { provider: "ZILLOW_RESEARCH" },
        orderBy: { fetchedAt: "desc" },
      }),
      prisma.marketSourceSnapshot.findMany({
        where: { provider: "GOOGLE_MAPS", sourceType: "GEOCODE" },
        orderBy: { fetchedAt: "desc" },
        take: 100,
      }),
      prisma.marketSourceSnapshot.findMany({
        where: { provider: "CENSUS_ACS", sourceType: "DEMOGRAPHICS" },
        orderBy: { fetchedAt: "desc" },
        take: 100,
      }),
    ]);
    manualEntries = manualMap;
    allRecentSnapshots = recentSnapshots;
    allAttomSnapshots = attomSnapshots;
    latestFredSnapshot = fredLatest;
    latestZillowSnapshot = zillowLatest;
    googleMapsSnapshots = googleMapsLatest;
    censusSnapshots = censusLatest;
    for (const snap of recentSnapshots) {
      if (rentCastByProperty.has(snap.propertyId)) continue;
      if (snap.status === "SUCCESS")
        rentCastByProperty.set(snap.propertyId, snap);
    }
    for (const snap of attomSnapshots) {
      if (attomByProperty.has(snap.propertyId)) continue;
      if (snap.status === "SUCCESS") attomByProperty.set(snap.propertyId, snap);
    }
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
  } catch (err) {
    dbAvailable = false;
    console.error("[/market] data unavailable:", err);
  }

  const entryFor = (id: string) => manualEntries.get(id) ?? null;
  const rentCastFor = (id: string) => rentCastByProperty.get(id) ?? null;
  const attomFor = (id: string) => attomByProperty.get(id) ?? null;
  const attomAvmFor = (id: string) => attomAvmByProperty.get(id) ?? null;
  const attomAvmHistoryFor = (id: string) =>
    attomAvmHistoryByProperty.get(id) ?? null;

  // ---------- Provider state + dynamic registry ----------
  const keyConfigured = hasRentCastKey();
  const attomKeyConfigured = hasAttomKey();
  const fredKeyConfigured = hasFredKey();
  const zillowUrlConfigured = hasZillowZhviUrl();
  const googleMapsKeyConfigured = hasGoogleMapsServerKey();
  const censusKeyConfigured = hasCensusKey();
  const xaiKeyConfigured = hasXaiKey();
  const zhviSeries = getZhviSeries(latestZillowSnapshot);
  const fredObservations = getFredObservations(latestFredSnapshot);
  const macroObservations: MacroSeriesObservation[] = fredObservations
    ? FRED_SERIES.map((id) => {
        const obs = fredObservations[id];
        return {
          id,
          label: FRED_SERIES_LABELS[id],
          value: formatFredValue(obs),
          asOf: formatFredObsDate(obs?.date),
        };
      })
    : [];

  const rentCastLatestFetchedAt =
    allRecentSnapshots.length > 0 ? allRecentSnapshots[0].fetchedAt : null;
  const attomLatestFetchedAt =
    allAttomSnapshots.length > 0 ? allAttomSnapshots[0].fetchedAt : null;
  const fredLatestFetchedAt = latestFredSnapshot?.fetchedAt ?? null;
  const zillowLatestFetchedAt = latestZillowSnapshot?.fetchedAt ?? null;
  const googleMapsLatestFetchedAt =
    googleMapsSnapshots.length > 0 ? googleMapsSnapshots[0].fetchedAt : null;
  const censusLatestFetchedAt =
    censusSnapshots.length > 0 ? censusSnapshots[0].fetchedAt : null;

  const latestGeocodeByProperty = new Map<string, MarketSourceSnapshot>();
  for (const snap of googleMapsSnapshots) {
    if (!latestGeocodeByProperty.has(snap.propertyId)) {
      latestGeocodeByProperty.set(snap.propertyId, snap);
    }
  }
  const latestCensusByZip = new Map<string, MarketSourceSnapshot>();
  for (const snap of censusSnapshots) {
    const raw = snap.raw as { zcta?: string } | null;
    const zip = raw?.zcta;
    if (typeof zip === "string" && !latestCensusByZip.has(zip)) {
      latestCensusByZip.set(zip, snap);
    }
  }

  const geocodeRows: GeocodeRow[] = allProperties.map((p) => {
    const snap = latestGeocodeByProperty.get(p.id) ?? null;
    const raw = snap?.raw as
      | { normalized?: GoogleGeocodeNormalized | null }
      | null;
    const normalized = raw?.normalized ?? null;
    return {
      propertyId: p.id,
      propertyLabel: p.address,
      status: snap
        ? (snap.status as GeocodeRow["status"])
        : googleMapsKeyConfigured
        ? "PENDING"
        : "MISSING_KEY",
      formattedAddress: normalized?.formattedAddress ?? null,
      latitude: normalized?.latitude ?? null,
      longitude: normalized?.longitude ?? null,
      locationType: normalized?.locationType ?? null,
      fetchedAt: snap ? snap.fetchedAt.toISOString() : null,
      errorMessage: snap?.errorMessage ?? null,
      isPrivateReference: p.kind === "private",
    };
  });

  const trackedZips = Array.from(
    new Set(
      allProperties
        .map((p) => p.zip)
        .filter((z): z is string => typeof z === "string" && z.length > 0)
    )
  );
  const censusRows: CensusRow[] = trackedZips.map((zip) => {
    const snap = latestCensusByZip.get(zip) ?? null;
    const raw = snap?.raw as
      | { normalized?: CensusAcsNormalized | null }
      | null;
    const normalized = raw?.normalized ?? null;
    return {
      zip,
      status: snap
        ? (snap.status as CensusRow["status"])
        : censusKeyConfigured
        ? "PENDING"
        : "MISSING_KEY",
      name: normalized?.name ?? null,
      year: normalized?.year ?? null,
      totalPopulation: normalized?.totalPopulation ?? null,
      medianHouseholdIncome: normalized?.medianHouseholdIncome ?? null,
      medianGrossRent: normalized?.medianGrossRent ?? null,
      medianHomeValue: normalized?.medianHomeValue ?? null,
      ownerOccupiedPct: normalized?.ownerOccupiedPct ?? null,
      renterOccupiedPct: normalized?.renterOccupiedPct ?? null,
      vacancyPct: normalized?.vacancyPct ?? null,
      fetchedAt: snap ? snap.fetchedAt.toISOString() : null,
      errorMessage: snap?.errorMessage ?? null,
    };
  });

  const googleMapsHasSuccess = googleMapsSnapshots.some(
    (s) => s.status === "SUCCESS"
  );
  const censusHasSuccess = censusSnapshots.some((s) => s.status === "SUCCESS");

  const statusKind = (
    hasSuccess: boolean,
    keyConf: boolean
  ): SourceStatus["kind"] =>
    hasSuccess ? "connected" : keyConf ? "configured" : "missing";

  const rentCastSnapshotsExist = rentCastByProperty.size > 0;
  const attomSnapshotsExist = attomByProperty.size > 0;
  const fredSnapshotExists =
    !!latestFredSnapshot && latestFredSnapshot.status === "SUCCESS";
  const zillowSnapshotExists =
    !!latestZillowSnapshot && latestZillowSnapshot.status === "SUCCESS";

  const dynamicSources: SourceDiagnosticsRow[] = marketSources.map((s) => {
    let status = s.status;
    let lastRefreshed: string | null = null;
    if (s.id === "rentcast") {
      status = rentCastSnapshotsExist
        ? "Connected"
        : keyConfigured
        ? "Planned"
        : "Not connected";
      lastRefreshed = rentCastLatestFetchedAt
        ? relativeAge(rentCastLatestFetchedAt)
        : null;
    } else if (s.id === "attom") {
      status = attomSnapshotsExist
        ? "Connected"
        : attomKeyConfigured
        ? "Planned"
        : "Not connected";
      lastRefreshed = attomLatestFetchedAt
        ? relativeAge(attomLatestFetchedAt)
        : null;
    } else if (s.id === "fred") {
      status = fredSnapshotExists
        ? "Connected"
        : fredKeyConfigured
        ? "Planned"
        : "Not connected";
      lastRefreshed = fredLatestFetchedAt
        ? relativeAge(fredLatestFetchedAt)
        : null;
    } else if (s.id === "zillow-research") {
      status = zillowSnapshotExists
        ? "Connected"
        : zillowUrlConfigured
        ? "Planned"
        : "Not connected";
      lastRefreshed = zillowLatestFetchedAt
        ? relativeAge(zillowLatestFetchedAt)
        : null;
    } else if (s.id === "google-maps") {
      status = googleMapsHasSuccess
        ? "Connected"
        : googleMapsKeyConfigured
        ? "Planned"
        : "Not connected";
      lastRefreshed = googleMapsLatestFetchedAt
        ? relativeAge(googleMapsLatestFetchedAt)
        : null;
    } else if (s.id === "census-acs") {
      status = censusHasSuccess
        ? "Connected"
        : censusKeyConfigured
        ? "Planned"
        : "Not connected";
      lastRefreshed = censusLatestFetchedAt
        ? relativeAge(censusLatestFetchedAt)
        : null;
    }
    return { ...s, status, lastRefreshed };
  });
  const counts = {
    connected: dynamicSources.filter((s) => s.status === "Connected").length,
    manual: dynamicSources.filter((s) => s.status === "Manual").length,
    total: dynamicSources.length,
  };

  const sourceStatuses: SourceStatus[] = [
    {
      label: "RentCast",
      kind: statusKind(rentCastSnapshotsExist, keyConfigured),
    },
    { label: "ATTOM", kind: statusKind(attomSnapshotsExist, attomKeyConfigured) },
    { label: "Zillow", kind: statusKind(zillowSnapshotExists, zillowUrlConfigured) },
    { label: "FRED", kind: statusKind(fredSnapshotExists, fredKeyConfigured) },
    {
      label: "Google Maps",
      kind: statusKind(googleMapsHasSuccess, googleMapsKeyConfigured),
    },
    {
      label: "Census",
      kind: statusKind(censusHasSuccess, censusKeyConfigured),
    },
  ];

  // ---------- Per-property analysis (server-side build) ----------
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
    /** Issues this property has, used for both card alerts and the
     *  grouped "Needs Attention" panel. */
    issues: PropertyIssue[];
  };

  type PropertyIssue =
    | "records_pending"
    | "no_house_value"
    | "no_rent"
    | "missing_acquisition_basis"
    | "stale_rentcast"
    | "missing_tax_data"
    | "avm_unavailable_for_plan"
    | "missing_sale_comps"
    | "missing_rental_comps";

  const ISSUE_LABEL: Record<PropertyIssue, string> = {
    records_pending: "Records pending",
    no_house_value: "No house value",
    no_rent: "No rent estimate",
    missing_acquisition_basis: "Acquisition basis missing",
    stale_rentcast: "Stale RentCast data",
    missing_tax_data: "Tax/assessment missing",
    avm_unavailable_for_plan: "ATTOM AVM unavailable for plan",
    missing_sale_comps: "Sale comps missing",
    missing_rental_comps: "Rental comps missing",
  };

  const ISSUE_DETAIL: Record<PropertyIssue, string> = {
    records_pending: "Official records have not been verified.",
    no_house_value: "No ATTOM AVM, RentCast value, or manual underwriting yet.",
    no_rent: "No RentCast or manual long-term rent estimate yet.",
    missing_acquisition_basis: "Recorded purchase basis not captured.",
    stale_rentcast: "Last RentCast snapshot is more than 30 days old.",
    missing_tax_data: "No ATTOM or manual assessed-value / tax data.",
    avm_unavailable_for_plan: "Current ATTOM plan/key disallows the AVM endpoint.",
    missing_sale_comps: "No sale comparables were returned in the latest data.",
    missing_rental_comps: "No rental comparables were returned in the latest data.",
  };

  const ISSUE_SEVERITY: Record<
    PropertyIssue,
    "info" | "warning" | "error"
  > = {
    records_pending: "warning",
    no_house_value: "error",
    no_rent: "error",
    missing_acquisition_basis: "warning",
    stale_rentcast: "warning",
    missing_tax_data: "warning",
    avm_unavailable_for_plan: "info",
    missing_sale_comps: "info",
    missing_rental_comps: "info",
  };

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
    const { saleComps, rentalComps } =
      rc?.status === "SUCCESS"
        ? extractRentCastComps(rc.raw)
        : { saleComps: [], rentalComps: [] };

    const verifiedByAttom = !!facts;
    const avmUnavailableForPlan = isAvmUnavailableForPlan(aAvm);
    const taxResolved =
      facts?.assessedValue != null ||
      facts?.annualTaxes != null ||
      (m && (decimalToNumber(m.assessedValue) != null ||
        decimalToNumber(m.annualTaxes) != null));

    const issues: PropertyIssue[] = [];
    if (
      !verifiedByAttom &&
      (property.factsNeedVerification || property.zipNeedsVerification)
    ) {
      issues.push("records_pending");
    }
    if (house.value == null) issues.push("no_house_value");
    if (rent.rent == null) issues.push("no_rent");
    if (m == null || decimalToNumber(m.purchaseBasis) == null) {
      issues.push("missing_acquisition_basis");
    }
    if (rc?.fetchedAt && isStale(rc.fetchedAt, 30)) {
      issues.push("stale_rentcast");
    }
    if (!taxResolved) issues.push("missing_tax_data");
    if (avmUnavailableForPlan) issues.push("avm_unavailable_for_plan");
    if (saleComps.length === 0) issues.push("missing_sale_comps");
    if (rentalComps.length === 0) issues.push("missing_rental_comps");

    return {
      property,
      house,
      rent,
      trend,
      projection,
      verifiedByAttom,
      attomFacts: facts,
      rentCastLastFetched: rc?.fetchedAt ?? null,
      attomLastFetched: a?.fetchedAt ?? null,
      saleComps,
      rentalComps,
      avmHistory: getAttomAvmHistory(aAvmHistory),
      avmUnavailableForPlan,
      yieldPct,
      valuationSeries: buildValuationSeries(house, trend, projection, facts),
      issues,
    };
  }

  const businessAnalyses = businessProperties.map(analyze);
  const privateAnalysis = privateProperty ? analyze(privateProperty) : null;

  // ---------- Serialize for client cards ----------
  const toCardData = (a: PropertyAnalysis, isPrivate: boolean): PropertyCardData => {
    const manualEntry = manualEntries.get(a.property.id);
    return {
    property: {
      id: a.property.id,
      address: a.property.address,
      city: a.property.city,
      state: a.property.state,
      zip: a.property.zip,
      role: a.property.assetRole,
      isPrivate,
      factsNeedVerification: a.property.factsNeedVerification,
      zipNeedsVerification: a.property.zipNeedsVerification,
      workspaceHref: a.property.workspaceHref ?? null,
      notes: a.property.notes ?? null,
    },
    house: {
      value: a.house.value,
      source: a.house.source,
      asOfDate: toIsoStringOrNull(a.house.asOfDate),
      rangeLow: a.house.rangeLow,
      rangeHigh: a.house.rangeHigh,
      confidence: a.house.confidence,
    },
    rent: {
      rent: a.rent.rent,
      source: a.rent.source,
      asOfDate: toIsoStringOrNull(a.rent.asOfDate),
      rangeLow: a.rent.rangeLow,
      rangeHigh: a.rent.rangeHigh,
    },
    trend: {
      zip: a.property.zip,
      latestValue: a.trend.zhvi?.latestValue ?? null,
      latestDate: a.trend.zhvi?.latestDate ?? null,
      yoyChange: a.trend.zhvi?.yoyChange ?? null,
      threeYearChange: a.trend.zhvi?.threeYearChange ?? null,
      fiveYearChange: a.trend.zhvi?.fiveYearChange ?? null,
    },
    projection: {
      m12: a.projection.m12,
      m24: a.projection.m24,
      m36: a.projection.m36,
      rateSource: a.projection.rateSource,
      rate: a.projection.rate,
    },
    yieldPct: a.yieldPct,
    verification: {
      verifiedByAttom: a.verifiedByAttom,
      avmUnavailableForPlan: a.avmUnavailableForPlan,
    },
    attomFacts: a.attomFacts
      ? {
          attomId: a.attomFacts.attomId,
          apn: a.attomFacts.apn,
          fips: a.attomFacts.fips,
          addressOneLine: a.attomFacts.addressOneLine,
          yearBuilt: a.attomFacts.yearBuilt,
          buildingSize: a.attomFacts.buildingSize,
          assessedValue: a.attomFacts.assessedValue,
          marketValue: a.attomFacts.marketValue,
          annualTaxes: a.attomFacts.annualTaxes,
          lastSalePrice: a.attomFacts.lastSalePrice,
          lastSaleDate: a.attomFacts.lastSaleDate,
          propertyClass: a.attomFacts.propertyClass,
        }
      : null,
    saleComps: a.saleComps as PropertyComp[],
    rentalComps: a.rentalComps as PropertyComp[],
    rentCastLastFetched: toIsoStringOrNull(a.rentCastLastFetched),
    attomLastFetched: toIsoStringOrNull(a.attomLastFetched),
    valuationSeries: a.valuationSeries
      .map((p): SerializableValuationPoint | null => {
        const date = toIsoStringOrNull(p.date);
        return date ? { ...p, date } : null;
      })
      .filter((p): p is SerializableValuationPoint => p != null),
    attentionItems: a.issues.map((id) => ISSUE_LABEL[id]),
    purchaseBasis: manualEntry ? decimalToNumber(manualEntry.purchaseBasis) : null,
    assessedValue: a.attomFacts?.assessedValue ?? (manualEntry ? decimalToNumber(manualEntry.assessedValue) : null),
    annualTaxes: a.attomFacts?.annualTaxes ?? (manualEntry ? decimalToNumber(manualEntry.annualTaxes) : null),
  };
};

  const businessCards = businessAnalyses.map((a) => toCardData(a, false));
  const privateCard = privateAnalysis
    ? toCardData(privateAnalysis, true)
    : null;
  const attomAvmAvailable = [...attomAvmByProperty.values()].some(
    (snap) => getAttomAvm(snap)?.estimatedValue != null
  );
  const attomAvmUnavailable = [...attomAvmByProperty.values()].some((snap) =>
    isAvmUnavailableForPlan(snap)
  );

  // ---------- KPIs (business-only; 14 MacAffer excluded) ----------
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
    .map(toDateOrNull)
    .filter((d): d is Date => d != null)
    .sort((a, b) => a.getTime() - b.getTime())
    .pop();

  // ---------- Grouped attention items ----------
  const attentionGroupsMap = new Map<PropertyIssue, NeedsAttentionGroup>();
  for (const a of businessAnalyses) {
    for (const issue of a.issues) {
      const existing = attentionGroupsMap.get(issue);
      if (existing) {
        existing.properties.push(a.property.address);
      } else {
        attentionGroupsMap.set(issue, {
          issue: ISSUE_LABEL[issue],
          detail: ISSUE_DETAIL[issue],
          properties: [a.property.address],
          severity: ISSUE_SEVERITY[issue],
        });
      }
    }
  }
  // Sort: errors first, then warnings, then info; within tier, more
  // affected properties first.
  const tierRank = { error: 0, warning: 1, info: 2 } as const;
  const attentionGroups: NeedsAttentionGroup[] = [...attentionGroupsMap.values()]
    .sort((a, b) => {
      const t = tierRank[a.severity] - tierRank[b.severity];
      if (t !== 0) return t;
      return b.properties.length - a.properties.length;
    });

  // ---------- Automatic AI Research for missing critical data ----------
  // Runs in the background during page render for missing_acquisition_basis and missing_tax_data
  const aiProvider = getAiProvider("openai"); // Prefer OpenAI for research quality

  for (const group of attentionGroups) {
    if (group.issue === "Acquisition basis missing" || group.issue === "Tax/assessment missing") {
      const researchPromises = group.properties.map(async (address) => {
        const prompt =
          group.issue === "Acquisition basis missing"
            ? `Find the most recent known purchase price, acquisition cost, or sale price for the property at "${address}, Loudonville or Menands, NY". Look for public deed records, property transfer history, or real estate archives. Return the price and year if found.`
            : `Find the most recent assessed value and annual property tax amount for the property at "${address}" in Loudonville or Menands, NY. Check public tax assessor records or similar sources. Return the numbers and year if available.`;

        try {
          const result = await aiProvider.generateWithWebSearch({
            prompt,
            instructions:
              "You are a research assistant for a real estate investor. Be precise. Only report information you can source from public records. If nothing reliable is found, say so clearly.",
          });

          return {
            property: address,
            suggestion: result.outputText,
            source: result.sources?.[0] || "Web research",
          };
        } catch (e) {
          return {
            property: address,
            suggestion: "AI research failed. Try manual lookup or the global AI assistant.",
            source: "Error",
          };
        }
      });

      const suggestions = await Promise.all(researchPromises);
      group.aiSuggestions = suggestions;
    }
  }

  // ---------- AI portfolio note input ----------
  const marketNoteInput: MarketNoteInput = {
    portfolio: {
      businessAssets: businessProperties.length,
      houseValue: formatCurrency(portfolioValue),
      marketRent: formatRent(portfolioMonthlyRent),
      grossRentYield:
        grossRentYield != null
          ? `${(grossRentYield * 100).toFixed(2)}%`
          : dash,
      completeness: newestSourceTimestamp
        ? `latest ${relativeAge(newestSourceTimestamp)}`
        : "no snapshots",
    },
    properties: businessAnalyses.map((a) => ({
      address: a.property.address,
      city: a.property.city,
      zip: a.property.zip,
      houseValue: formatCurrency(a.house.value),
      houseSource: a.house.source,
      houseRange:
        a.house.rangeLow != null && a.house.rangeHigh != null
          ? `${formatCurrency(a.house.rangeLow)} – ${formatCurrency(a.house.rangeHigh)}`
          : dash,
      rent: formatRent(a.rent.rent),
      rentSource: a.rent.source,
      rentRange:
        a.rent.rangeLow != null && a.rent.rangeHigh != null
          ? `${formatRent(a.rent.rangeLow)} – ${formatRent(a.rent.rangeHigh)}`
          : dash,
      yieldPct: a.yieldPct != null ? `${a.yieldPct.toFixed(2)}%` : dash,
      refreshed: a.rentCastLastFetched
        ? relativeAge(a.rentCastLastFetched)
        : a.attomLastFetched
        ? relativeAge(a.attomLastFetched)
        : dash,
      verification: a.verifiedByAttom ? "ATTOM verified" : "Records pending",
      zillowTrend: {
        latest: formatCurrency(a.trend.zhvi?.latestValue ?? null),
        change1Y:
          a.trend.zhvi?.yoyChange != null
            ? `${(a.trend.zhvi.yoyChange * 100).toFixed(1)}%`
            : dash,
        change3Y:
          a.trend.zhvi?.threeYearChange != null
            ? `${(a.trend.zhvi.threeYearChange * 100).toFixed(1)}%`
            : dash,
        change5Y:
          a.trend.zhvi?.fiveYearChange != null
            ? `${(a.trend.zhvi.fiveYearChange * 100).toFixed(1)}%`
            : dash,
        asOf: a.trend.zhvi?.latestDate
          ? formatFredObsDate(a.trend.zhvi.latestDate)
          : dash,
      },
      comps: {
        saleCount: a.saleComps.length,
        rentalCount: a.rentalComps.length,
      },
    })),
    attentionItems: attentionGroups.map(
      (g) => `${g.issue} — ${g.properties.join(", ")}`
    ),
  };

  const dataCoverageRows: CoverageRow[] = [
    {
      name: "RentCast",
      status: rentCastSnapshotsExist ? "Connected" : "Missing",
      detail: "House AVM value, market rent, sale/rental comps",
    },
    {
      name: "ATTOM records",
      status: attomSnapshotsExist ? "Connected" : "Missing",
      detail: "Record verification, APN, facts, tax/assessment",
    },
    {
      name: "FRED",
      status: fredSnapshotExists ? "Connected" : "Missing",
      detail: "Macro/rate context only",
    },
    {
      name: "Zillow ZHVI ZIP",
      status: zillowSnapshotExists ? "Connected" : "Missing",
      detail: "ZIP-level trend context only",
    },
    {
      name: "ATTOM AVM",
      status: attomAvmAvailable ? "Connected" : attomAvmUnavailable ? "Missing" : "Planned",
      detail: attomAvmAvailable
        ? "Available in existing snapshots"
        : attomAvmUnavailable
        ? "Unavailable for current plan/key"
        : "Pending successful AVM snapshot",
    },
    {
      name: "HouseCanary AVM",
      status: "Planned",
      detail: "Second valuation source; not connected",
    },
    {
      name: "FHFA HPI",
      status: "Planned",
      detail: "Official single-family price trends; not connected",
    },
    {
      name: "Redfin Data Center",
      status: "Planned",
      detail: "Sale/inventory/DOM/price-drop pulse; not connected",
    },
    {
      name: "Google Maps",
      status: censusOrMapsCoverageStatus(
        googleMapsHasSuccess,
        googleMapsKeyConfigured
      ),
      detail:
        "Geocode + lat/lng context (server-only). Context only — not a valuation source.",
    },
    {
      name: "Census ACS",
      status: censusOrMapsCoverageStatus(
        censusHasSuccess,
        censusKeyConfigured
      ),
      detail:
        "ZCTA demographics: population, income, rent, owner/renter mix. Context only — not a valuation source.",
    },
    {
      name: "Climate risk",
      status: "Optional",
      detail: "Later risk context; not connected",
    },
  ];

  const roadmapRows: RoadmapRow[] = [
    {
      priority: 1,
      name: "Confirm/use ATTOM AVM availability",
      detail: "Use current ATTOM access when the AVM endpoint returns usable data.",
    },
    {
      priority: 2,
      name: "HouseCanary AVM",
      detail: "Add a second property-level valuation source for comparison.",
    },
    {
      priority: 3,
      name: "FHFA HPI",
      detail: "Use official single-family price trends for market context.",
    },
    {
      priority: 4,
      name: "Redfin Data Center",
      detail: "Track sale volume, inventory, DOM, and price-drop pulse.",
    },
    {
      priority: 5,
      name: "Census ACS",
      detail: "Add demographic and housing fundamentals context.",
    },
    {
      priority: 6,
      name: "Climate risk",
      detail: "Evaluate later as a risk context layer.",
    },
  ];

  // ---------- Render ----------
  return (
    <div className="flex flex-col gap-2 px-3 py-2 sm:px-4 sm:py-3 lg:px-8 lg:py-5">
      <MarketHeader
        hasManualEntries={manualEntries.size > 0}
        databaseAvailable={dbAvailable}
      />

      <PortfolioSnapshot
        businessAssets={businessProperties.length}
        houseValue={formatCurrency(portfolioValue)}
        houseValueSub={`${valuedCount} of ${businessProperties.length} valued`}
        marketRent={formatRent(portfolioMonthlyRent)}
        marketRentSub={`${rentedCount} of ${businessProperties.length} rents`}
        grossYield={
          grossRentYield != null
            ? `${(grossRentYield * 100).toFixed(2)}%`
            : dash
        }
        grossYieldSub="Annual rent ÷ portfolio value"
        freshness={
          newestSourceTimestamp
            ? relativeAge(newestSourceTimestamp)
            : "no snapshots"
        }
        freshnessSub="Latest provider snapshot"
      />

      <NeedsAttentionPanel groups={attentionGroups} />

      <SourceStatusRow sources={sourceStatuses} />

      <section className="flex flex-col gap-2">
        <div>
          <h2 className="font-display text-sm font-semibold text-[var(--market-text)]">
            Property comparison
          </h2>
          <p className="text-[10px] text-[var(--market-text-secondary)]">
            Market value, rent, trends &amp; verification
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {businessCards.map((d) => (
            <PropertyCard key={d.property.id} data={d} xaiAvailable={xaiKeyConfigured} />
          ))}
        </div>

        {privateCard ? (
          <div className="flex flex-col gap-2 pt-2">
            <div className="flex flex-col gap-1">
              <h2 className="font-display text-lg font-semibold text-[var(--market-text)]">
                Private / Reference Only
              </h2>
              <p className="text-xs text-[var(--market-text-secondary)]">
                Held outside the business structure. Excluded from portfolio
                KPIs and AI portfolio analysis. Shown as reference context only.
              </p>
            </div>
            <PropertyCard data={privateCard} xaiAvailable={xaiKeyConfigured} />
          </div>
        ) : null}
      </section>

      <AiMarketAnalysisPanel
        marketInput={marketNoteInput}
        xaiAvailable={xaiKeyConfigured}
      />

      <LocationDemographicsPanel
        geocodes={geocodeRows}
        censusRows={censusRows}
        googleKeyConfigured={googleMapsKeyConfigured}
        censusKeyConfigured={censusKeyConfigured}
        geocodeFetchedAt={
          googleMapsLatestFetchedAt
            ? relativeAge(googleMapsLatestFetchedAt)
            : null
        }
        censusFetchedAt={
          censusLatestFetchedAt ? relativeAge(censusLatestFetchedAt) : null
        }
      />

      <MacroContextPanel
        observations={macroObservations}
        asOf={
          fredLatestFetchedAt ? relativeAge(fredLatestFetchedAt) : null
        }
        empty={
          fredKeyConfigured
            ? undefined
            : "FRED key not configured. Set FRED_API_KEY to enable."
        }
      />

      <MarketTrackerSettings
        rentCastConfigured={keyConfigured}
        attomConfigured={attomKeyConfigured}
        fredConfigured={fredKeyConfigured}
        zillowConfigured={zillowUrlConfigured}
        googleMapsConfigured={googleMapsKeyConfigured}
        censusConfigured={censusKeyConfigured}
        coverageRows={dataCoverageRows}
        roadmapRows={roadmapRows}
        diagnosticsSources={dynamicSources}
        diagnosticsCounts={counts}
      />

      <MarketCommandTrigger />
    </div>
  );
}
