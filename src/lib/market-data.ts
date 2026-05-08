/**
 * Market Tracker placeholder data.
 *
 * Centralized so the market page renders without ad-hoc inline content.
 * No external API calls, no fake live values — every numeric figure is null
 * until a real data source is wired in. The UI shows em-dashes when null.
 */

export type AssetKind = "business" | "private";

export type AssetRole =
  | "Active Rental"
  | "Active Renovation Project"
  | "Private / Reference Only";

export type TrackedProperty = {
  id: string;
  /**
   * URL-safe slug used for /properties/[slug] routing. Distinct from `id`
   * — the id retains the legacy "<short-name>-<number>" form used as a
   * snapshot key, while the slug is the human-readable URL form
   * "<number>-<short-name>" requested for the property detail pages.
   */
  slug: string;
  address: string;
  city: string;
  state: string;
  zip: string | null; // null when zip needs verification
  zipNeedsVerification: boolean;
  /**
   * General "displayed facts are unverified / reference-only" flag.
   * Distinct from `zipNeedsVerification`, which is specific to the ZIP field.
   * Used for assets where address, ZIP, ownership, or other metadata
   * should be treated as working notes until separately confirmed.
   */
  factsNeedVerification: boolean;
  assetRole: AssetRole;
  kind: AssetKind;
  /** Optional in-app workspace link, e.g. /renovation. */
  workspaceHref?: string;
  notes?: string;
};

export const trackedProperties: TrackedProperty[] = [
  {
    id: "loudonwood-51",
    slug: "51-loudonwood",
    address: "51 Loudonwood E",
    city: "Loudonville",
    state: "NY",
    zip: "12211",
    zipNeedsVerification: false,
    factsNeedVerification: false,
    assetRole: "Active Rental",
    kind: "business",
    notes: "Active rental asset.",
  },
  {
    id: "momrow-16",
    slug: "16-momrow",
    address: "16 Momrow Ct",
    city: "Menands",
    state: "NY",
    zip: "12204",
    zipNeedsVerification: false,
    factsNeedVerification: false,
    assetRole: "Active Rental",
    kind: "business",
    notes: "Active rental asset.",
  },
  {
    id: "osborne-322",
    slug: "322-osborne",
    address: "322 Osborne Rd",
    city: "Loudonville",
    state: "NY",
    zip: "12211",
    zipNeedsVerification: false,
    factsNeedVerification: true,
    assetRole: "Active Renovation Project",
    kind: "business",
    workspaceHref: "/renovation",
    notes:
      "Renovation in bidding & procurement. Address records pending official-source verification.",
  },
  {
    id: "macaffer-14",
    slug: "14-macaffer",
    address: "14 MacAffer Dr",
    city: "Menands",
    state: "NY",
    zip: "12204",
    zipNeedsVerification: false,
    factsNeedVerification: true,
    assetRole: "Private / Reference Only",
    kind: "private",
    notes:
      "Held outside the business structure. Excluded from business portfolio KPIs. Displayed facts are reference-only until separately confirmed.",
  },
];

/** Lookup by URL slug for the property detail route. */
export function getPropertyBySlug(slug: string): TrackedProperty | null {
  return trackedProperties.find((p) => p.slug === slug) ?? null;
}

/** Confidence on a 0-100 scale, or null if unknown. */
export type ConfidencePct = number | null;

export type PropertyMarketSnapshot = {
  propertyId: string;
  estimatedValue: number | null;
  estimatedRent: number | null;
  valueConfidence: ConfidencePct;
  rentConfidence: ConfidencePct;
  lastUpdated: string | null; // ISO date or null
  /** "Not connected" until a real source is configured. */
  sourceStatus: "Not connected" | "Pending" | "Live";
};

export const propertySnapshots: PropertyMarketSnapshot[] =
  trackedProperties.map((p) => ({
    propertyId: p.id,
    estimatedValue: null,
    estimatedRent: null,
    valueConfidence: null,
    rentConfidence: null,
    lastUpdated: null,
    sourceStatus: "Not connected",
  }));

/**
 * Legacy "data source" list. Kept only as a derived view of the canonical
 * registry in src/lib/market-sources.ts so existing KPI counts continue
 * to work without a refactor of computeKpis().
 *
 * New code should consume `marketSources` from src/lib/market-sources.ts
 * directly.
 *
 * @deprecated Use marketSources from src/lib/market-sources.ts.
 */
export type DataSource = {
  name: string;
  purpose: string;
  status: "Not connected" | "Pending" | "Connected";
};

import { marketSources } from "./market-sources";

export const dataSources: DataSource[] = marketSources.map((s) => ({
  name: s.name,
  purpose: s.intendedUse,
  // Map registry status into the legacy 3-value shape used by computeKpis.
  // "Manual" and "Planned" both surface as "Pending" for back-compat.
  status:
    s.status === "Connected"
      ? "Connected"
      : s.status === "Not connected"
      ? "Not connected"
      : "Pending",
}));

export type NeighborhoodSignal = {
  category: string;
  description: string;
};

export const neighborhoodSignalCategories: NeighborhoodSignal[] = [
  {
    category: "Demand",
    description: "Buyer activity, days-on-market, list-to-sale ratios.",
  },
  {
    category: "Schools",
    description: "District ratings and school catchment changes.",
  },
  {
    category: "Walkability",
    description: "Walk, transit, and bike scores.",
  },
  {
    category: "Demographics",
    description: "Population, income, and household trends.",
  },
];

export type ForecastHorizon = {
  label: string;
  description: string;
};

export const forecastHorizons: ForecastHorizon[] = [
  { label: "12 months", description: "Short-term value and rent direction." },
  { label: "3 years", description: "Medium-term hold scenario." },
  { label: "5 years", description: "Refinance or exit horizon." },
];

export type RiskCategory = {
  category: string;
  description: string;
};

export const riskCategories: RiskCategory[] = [
  {
    category: "Climate",
    description: "Flood, wildfire, and storm exposure.",
  },
  {
    category: "Regulatory",
    description: "Rent control, zoning, and permitting changes.",
  },
  {
    category: "Market",
    description: "Local price and rent volatility.",
  },
  {
    category: "Concentration",
    description: "Submarket concentration across the portfolio.",
  },
];

/**
 * Aggregate KPI inputs across BUSINESS portfolio assets only.
 * 14 MacAffer Dr is intentionally excluded.
 */
export type PortfolioKpis = {
  trackedAssets: number;
  estimatedPortfolioValue: number | null;
  estimatedMonthlyRent: number | null;
  /** 0-100, share of fields populated across business assets. */
  dataCompletenessPct: number;
  lastUpdated: string | null;
  connectedSources: number;
  totalSources: number;
};

export function computeKpis(): PortfolioKpis {
  const business = trackedProperties.filter((p) => p.kind === "business");
  const businessIds = new Set(business.map((p) => p.id));
  const snaps = propertySnapshots.filter((s) => businessIds.has(s.propertyId));

  const fieldsPerAsset = 4; // value, rent, valueConfidence, rentConfidence
  const totalFields = snaps.length * fieldsPerAsset;
  const populated = snaps.reduce((acc, s) => {
    let n = 0;
    if (s.estimatedValue != null) n++;
    if (s.estimatedRent != null) n++;
    if (s.valueConfidence != null) n++;
    if (s.rentConfidence != null) n++;
    return acc + n;
  }, 0);

  const dataCompletenessPct =
    totalFields === 0 ? 0 : Math.round((populated / totalFields) * 100);

  const lastUpdated = snaps
    .map((s) => s.lastUpdated)
    .filter((d): d is string => Boolean(d))
    .sort()
    .pop() ?? null;

  return {
    trackedAssets: business.length,
    estimatedPortfolioValue: null,
    estimatedMonthlyRent: null,
    dataCompletenessPct,
    lastUpdated,
    connectedSources: dataSources.filter((d) => d.status === "Connected").length,
    totalSources: dataSources.length,
  };
}

/**
 * Format helpers — return em-dash when value is null so the UI never
 * has to do "?? '—'" inline.
 */
export const dash = "—";

export function formatCurrency(value: number | null): string {
  if (value == null) return dash;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatRent(value: number | null): string {
  if (value == null) return dash;
  return `${formatCurrency(value)}/mo`;
}

export function formatPct(value: number | null): string {
  if (value == null) return dash;
  return `${Math.round(value)}%`;
}

export function formatDate(value: string | null): string {
  if (!value) return dash;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return dash;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
