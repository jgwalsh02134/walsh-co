/**
 * Market Source Registry.
 *
 * Single source of truth for the data providers the Market Tracker
 * intends to consume. Status is intentionally declarative — the registry
 * does NOT call any API. Wiring a real provider is a future task.
 *
 * Design goals:
 *   - Every Market Tracker panel can render its intended sources.
 *   - When a real integration is added, only this file changes.
 *   - Environment variable names are *named here only*, never read.
 *
 * No external API calls. No API keys are present in this file.
 */

// ---------- Categories ----------

export const SOURCE_CATEGORIES = [
  "Property Records",
  "Rent Data",
  "Valuation",
  "Macro",
  "Demographics",
  "Climate Risk",
  "Maps",
  "Internal",
] as const;

export type SourceCategory = (typeof SOURCE_CATEGORIES)[number];

// ---------- Status ----------

export const SOURCE_STATUSES = [
  "Not connected",
  "Manual",
  "Planned",
  "Connected",
] as const;

export type SourceStatus = (typeof SOURCE_STATUSES)[number];

// ---------- Source shape ----------

export type MarketSource = {
  id: string;
  name: string;
  category: SourceCategory;
  status: SourceStatus;
  intendedUse: string;
  /** 1 = highest priority, larger = lower. */
  priority: number;
  requiresApiKey: boolean;
  /** Documentation only. Never read at runtime — no provider is wired. */
  envVarName: string | null;
  notes?: string;
};

// ---------- Registry ----------

export const marketSources: MarketSource[] = [
  {
    id: "manual-internal",
    name: "Manual Internal",
    category: "Internal",
    status: "Manual",
    intendedUse:
      "Manually entered snapshot values, working estimates, internal notes, and reference figures recorded by the team.",
    priority: 1,
    requiresApiKey: false,
    envVarName: null,
    notes:
      "Always available. Use as the fallback for any panel until a provider is connected.",
  },
  {
    id: "rentcast",
    name: "RentCast",
    category: "Rent Data",
    status: "Not connected",
    intendedUse:
      "Rent estimates, rental comparables, basic property valuation, and property records.",
    priority: 2,
    requiresApiKey: true,
    envVarName: "RENTCAST_API_KEY",
    notes:
      "Recommended first live source. Covers rent + value + comps with a single integration; aligns with the current rentals + renovation portfolio.",
  },
  {
    id: "attom",
    name: "ATTOM",
    category: "Property Records",
    status: "Not connected",
    intendedUse:
      "Property records, ownership history, sales history, assessed values, tax history.",
    priority: 3,
    requiresApiKey: true,
    envVarName: "ATTOM_API_KEY",
  },
  {
    id: "climatecheck",
    name: "ClimateCheck",
    category: "Climate Risk",
    status: "Not connected",
    intendedUse:
      "Flood, wildfire, heat, and storm risk per property address.",
    priority: 4,
    requiresApiKey: true,
    envVarName: "CLIMATECHECK_API_KEY",
  },
  {
    id: "census-acs",
    name: "Census ACS",
    category: "Demographics",
    status: "Not connected",
    intendedUse:
      "Demographics, household income, population trends, occupancy and tenure data.",
    priority: 5,
    requiresApiKey: false,
    envVarName: "CENSUS_API_KEY",
    notes:
      "Public dataset. API key is optional (raises rate limits) but not required.",
  },
  {
    id: "fred",
    name: "FRED",
    category: "Macro",
    status: "Not connected",
    intendedUse:
      "Macro indicators — interest rates, employment, regional housing indices.",
    priority: 6,
    requiresApiKey: true,
    envVarName: "FRED_API_KEY",
  },
  {
    id: "mapbox",
    name: "Google Maps / Mapbox",
    category: "Maps",
    status: "Not connected",
    intendedUse:
      "Geocoding, walkability context, neighborhood maps and overlays.",
    priority: 7,
    requiresApiKey: true,
    envVarName: "MAPBOX_TOKEN",
    notes:
      "Token is optional for low-volume static maps; required for production.",
  },
  {
    id: "zillow-research",
    name: "Zillow Research — ZHVI",
    category: "Valuation",
    status: "Not connected",
    intendedUse:
      "ZIP-level home-value index trend context (latest, 1y / 3y / 5y change). Trend only — does NOT replace per-property RentCast estimates.",
    priority: 8,
    requiresApiKey: false,
    envVarName: "ZILLOW_ZHVI_ZIP_CSV_URL",
    notes:
      "Public Zillow Research CSV; no API key. URL points to the published ZHVI ZIP file.",
  },
];

// ---------- Section → source mapping ----------

export const MARKET_SECTIONS = [
  "propertyValueEstimates",
  "rentEstimates",
  "salesComparables",
  "rentalComparables",
  "neighborhoodSignals",
  "forecasts",
  "taxAssessment",
  "riskIndicators",
] as const;

export type MarketSection = (typeof MARKET_SECTIONS)[number];

/**
 * Which sources are intended to power each Market Tracker panel.
 * The order matters — primary intended source first.
 */
export const sectionSources: Record<MarketSection, string[]> = {
  propertyValueEstimates: ["rentcast", "attom", "manual-internal"],
  rentEstimates: ["rentcast", "manual-internal"],
  salesComparables: ["attom", "rentcast"],
  rentalComparables: ["rentcast"],
  neighborhoodSignals: ["census-acs", "mapbox", "manual-internal"],
  forecasts: ["rentcast", "manual-internal"],
  taxAssessment: ["attom", "manual-internal"],
  riskIndicators: ["climatecheck", "manual-internal"],
};

// ---------- Helpers ----------

export function getSource(id: string): MarketSource | null {
  return marketSources.find((s) => s.id === id) ?? null;
}

export function getSectionSources(section: MarketSection): MarketSource[] {
  return sectionSources[section]
    .map((id) => getSource(id))
    .filter((s): s is MarketSource => Boolean(s));
}

/**
 * "Effective" status for a panel — the strongest of any source backing it.
 * Useful for the small badge shown next to a panel title.
 */
const STATUS_RANK: Record<SourceStatus, number> = {
  Connected: 4,
  Manual: 3,
  Planned: 2,
  "Not connected": 1,
};

export function getSectionStatus(section: MarketSection): SourceStatus {
  const sources = getSectionSources(section);
  if (sources.length === 0) return "Not connected";
  return sources.reduce<SourceStatus>(
    (best, s) => (STATUS_RANK[s.status] > STATUS_RANK[best] ? s.status : best),
    "Not connected"
  );
}

export function countConnected(): {
  connected: number;
  manual: number;
  total: number;
} {
  return {
    connected: marketSources.filter((s) => s.status === "Connected").length,
    manual: marketSources.filter((s) => s.status === "Manual").length,
    total: marketSources.length,
  };
}

// ---------- Roadmap note ----------

export const NEXT_INTEGRATION = {
  recommendedFirstLiveSource: "RentCast",
  reason:
    "Rent estimates, rental comps, property value estimates, and basic property records are all available from a single RentCast integration. That covers the active rentals (51 Loudonwood E, 16 Momrow Ct) and the in-flight renovation (322 Osborne Rd) without juggling multiple providers up front.",
};
