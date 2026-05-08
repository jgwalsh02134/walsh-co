/**
 * Pure builder that turns a serialized PropertyCardData payload into
 * a PropertyNoteInput suitable for the AI server actions.
 *
 * Lives next to the route so both the per-property card and the
 * Property-Research mode of the main AI panel can use it without
 * duplicating the formatting logic.
 *
 * No "use server", no I/O — safe for client and server import.
 */

import type {
  PropertyCardData,
  PropertyComp,
} from "./components/property-card";
import type { PropertyNoteInput } from "./market-note-actions";

const dash = "—";

export function buildPropertyNoteInput(
  data: PropertyCardData
): PropertyNoteInput {
  const { property, house, rent, trend, attomFacts, attentionItems } = data;

  const valueRange =
    house.rangeLow != null && house.rangeHigh != null
      ? `${formatCurrency(house.rangeLow)} – ${formatCurrency(house.rangeHigh)}`
      : "no range";
  const rentRange =
    rent.rangeLow != null && rent.rangeHigh != null
      ? `${formatCurrency(rent.rangeLow)}/mo – ${formatCurrency(rent.rangeHigh)}/mo`
      : "no range";

  return {
    property: {
      address: property.address,
      city: property.city,
      zip: property.zip,
      role: property.role,
      isPrivate: property.isPrivate,
    },
    houseValue: {
      value: formatCurrency(house.value),
      source: house.source,
      range: valueRange,
      confidence:
        house.confidence != null ? `${Math.round(house.confidence)}/100` : dash,
      asOf: house.asOfDate ? formatDate(house.asOfDate) : dash,
    },
    marketRent: {
      rent: formatRent(rent.rent),
      source: rent.source,
      range: rentRange,
      asOf: rent.asOfDate ? formatDate(rent.asOfDate) : dash,
    },
    yieldPct: formatPctValue(data.yieldPct, 2),
    verification: data.verification.verifiedByAttom
      ? "ATTOM verified"
      : property.factsNeedVerification || property.zipNeedsVerification
      ? "Records pending"
      : "Manual notes",
    zipTrend: {
      zip: trend.zip,
      latest: formatCurrency(trend.latestValue),
      change1Y: formatPctChange(trend.yoyChange),
      change3Y: formatPctChange(trend.threeYearChange),
      change5Y: formatPctChange(trend.fiveYearChange),
      asOf: trend.latestDate ? formatDate(trend.latestDate) : dash,
    },
    attomFacts: {
      apn: attomFacts?.apn ?? dash,
      yearBuilt:
        attomFacts?.yearBuilt != null ? String(attomFacts.yearBuilt) : dash,
      sqft:
        attomFacts?.buildingSize != null
          ? `${attomFacts.buildingSize.toLocaleString()} sqft`
          : dash,
      assessed:
        attomFacts?.assessedValue != null
          ? formatCurrency(attomFacts.assessedValue)
          : dash,
      annualTaxes:
        attomFacts?.annualTaxes != null
          ? formatCurrency(attomFacts.annualTaxes)
          : dash,
      lastSale:
        attomFacts?.lastSalePrice != null
          ? `${formatCurrency(attomFacts.lastSalePrice)} on ${
              attomFacts.lastSaleDate ? formatDate(attomFacts.lastSaleDate) : dash
            }`
          : dash,
    },
    comps: {
      saleCount: data.saleComps.length,
      rentalCount: data.rentalComps.length,
      saleSummary: summarizeComps(data.saleComps, "sale"),
      rentalSummary: summarizeComps(data.rentalComps, "rent"),
    },
    attentionItems,
  };
}

function summarizeComps(comps: PropertyComp[], kind: "sale" | "rent"): string[] {
  return comps.slice(0, 5).map((c) => {
    const amount =
      c.amount != null
        ? kind === "sale"
          ? formatCurrency(c.amount)
          : `${formatCurrency(c.amount)}/mo`
        : kind === "sale"
        ? "no price"
        : "rent not returned";
    const meta = [
      c.beds != null ? `${c.beds}bd` : null,
      c.baths != null ? `${c.baths}ba` : null,
      c.sqft != null ? `${c.sqft.toLocaleString()} sqft` : null,
      c.distanceMiles != null ? `${c.distanceMiles.toFixed(1)} mi` : null,
    ]
      .filter(Boolean)
      .join(" · ");
    return `${c.address ?? dash} · ${amount}${meta ? ` · ${meta}` : ""}`;
  });
}

function formatCurrency(v: number | null | undefined): string {
  if (v == null) return dash;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);
}

function formatRent(v: number | null | undefined): string {
  if (v == null) return dash;
  return `${formatCurrency(v)}/mo`;
}

function formatDate(v: string | null | undefined): string {
  if (!v) return dash;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return dash;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatPctChange(v: number | null | undefined): string {
  if (v == null) return dash;
  const pct = v * 100;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

function formatPctValue(v: number | null | undefined, fractionDigits = 2): string {
  if (v == null) return dash;
  return `${v.toFixed(fractionDigits)}%`;
}
