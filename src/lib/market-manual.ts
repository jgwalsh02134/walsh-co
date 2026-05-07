/**
 * Manual Market Tracker entry helpers.
 *
 * Pure data + helpers for the "Manual Internal" source. No fetch, no
 * external calls, no env-var reads. All values come from the database
 * via the MarketManualEntry table; rendering is wired in
 * src/app/(app)/market/page.tsx and src/app/(app)/market/manual/.
 */

import type { MarketManualEntry, Prisma } from "@prisma/client";
import { Prisma as PrismaNS } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { trackedProperties } from "@/lib/market-data";

// ---------- Confidence ----------

export const CONFIDENCE_LEVELS = ["UNKNOWN", "LOW", "MEDIUM", "HIGH"] as const;
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];

export function isConfidenceLevel(v: unknown): v is ConfidenceLevel {
  return (
    typeof v === "string" &&
    (CONFIDENCE_LEVELS as readonly string[]).includes(v)
  );
}

const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  UNKNOWN: "Unknown",
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};

export function confidenceLabel(v: string | null | undefined): string {
  return isConfidenceLevel(v) ? CONFIDENCE_LABELS[v] : "Unknown";
}

// ---------- Money parsing ----------

/**
 * Parse user input as money. Accepts:
 *   - bare numbers: 250000, 250000.50
 *   - formatted strings: "$250,000", "250,000.00", "$ 1,234"
 *   - null / "" / whitespace → null (cleared field)
 * Throws when the input is non-empty but cannot be interpreted as a
 * number — server actions catch the error and surface a clear message.
 */
export function parseMoneyInput(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Strip currency symbols, spaces, and thousands separators.
  const cleaned = trimmed.replace(/[$,\s]/g, "");
  if (!/^-?\d+(\.\d{1,4})?$/.test(cleaned)) {
    throw new Error(`Invalid money value: "${raw}"`);
  }
  return cleaned;
}

export function parseDateInput(raw: string | null | undefined): Date | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid date: "${raw}"`);
  }
  return d;
}

export function parseConfidence(
  raw: string | null | undefined
): ConfidenceLevel | null {
  if (raw == null) return null;
  const v = raw.trim();
  if (!v) return null;
  return isConfidenceLevel(v) ? v : null;
}

// ---------- Format helpers (Decimal → display) ----------

const dash = "—";

/**
 * Convert a Prisma Decimal (or null) to a number suitable for the existing
 * formatCurrency / formatRent helpers in market-data.ts. Returns null if
 * the value is null OR cannot be represented as a finite number.
 */
export function decimalToNumber(
  value: PrismaNS.Decimal | string | number | null | undefined
): number | null {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : null;
  }
  // Prisma Decimal exposes .toNumber()
  if (typeof (value as PrismaNS.Decimal).toNumber === "function") {
    const n = (value as PrismaNS.Decimal).toNumber();
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function formatDecimalCurrency(
  value: PrismaNS.Decimal | string | number | null | undefined
): string {
  const n = decimalToNumber(value);
  if (n == null) return dash;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatDecimalRent(
  value: PrismaNS.Decimal | string | number | null | undefined
): string {
  const n = decimalToNumber(value);
  if (n == null) return dash;
  return `${formatDecimalCurrency(n)}/mo`;
}

// ---------- Property metadata ----------

export type ManualProperty = {
  propertyId: string;
  propertyLabel: string;
  isPrivateReference: boolean;
};

/**
 * Editable list of properties on /market/manual. Reuses trackedProperties
 * from market-data.ts so the registry stays in one place.
 */
export const manualProperties: ManualProperty[] = trackedProperties.map((p) => ({
  propertyId: p.id,
  propertyLabel: `${p.address}, ${p.city}${p.zip ? ` ${p.zip}` : ""}`,
  isPrivateReference: p.kind === "private",
}));

export function getManualProperty(
  propertyId: string
): ManualProperty | undefined {
  return manualProperties.find((p) => p.propertyId === propertyId);
}

// ---------- DB fetchers ----------

export async function getManualEntry(
  propertyId: string
): Promise<MarketManualEntry | null> {
  return prisma.marketManualEntry.findUnique({ where: { propertyId } });
}

/**
 * One-shot fetcher: returns a Map<propertyId, entry> for every business +
 * private tracked property. Used by /market to wire manual values into
 * KPIs, property cards, estimates, and tax/assessment rows.
 */
export async function getManualEntryMap(): Promise<Map<string, MarketManualEntry>> {
  const rows = await prisma.marketManualEntry.findMany();
  const map = new Map<string, MarketManualEntry>();
  for (const r of rows) map.set(r.propertyId, r);
  return map;
}

// ---------- Server-action payload builder ----------

/**
 * Build a Prisma upsert payload from a FormData. Throws on bad money/date
 * input; the server action surfaces those as inline form errors.
 */
export function buildEntryPayload(
  formData: FormData
): Prisma.MarketManualEntryUncheckedCreateInput {
  const propertyId = String(formData.get("propertyId") ?? "").trim();
  if (!propertyId) throw new Error("Property is required.");
  const property = getManualProperty(propertyId);
  if (!property) throw new Error(`Unknown property: ${propertyId}`);

  const note = formData.get("sourceNote");
  const sourceNote =
    typeof note === "string" && note.trim() ? note.trim() : null;

  const sourceName = formData.get("sourceName");
  const sourceNameClean =
    typeof sourceName === "string" && sourceName.trim()
      ? sourceName.trim()
      : "Manual Internal";

  return {
    propertyId,
    propertyLabel: property.propertyLabel,
    estimatedValue: parseMoneyInput(stringField(formData, "estimatedValue")),
    estimatedRent: parseMoneyInput(stringField(formData, "estimatedRent")),
    assessedValue: parseMoneyInput(stringField(formData, "assessedValue")),
    annualTaxes: parseMoneyInput(stringField(formData, "annualTaxes")),
    purchaseBasis: parseMoneyInput(stringField(formData, "purchaseBasis")),
    renovationBudget: parseMoneyInput(stringField(formData, "renovationBudget")),
    targetRent: parseMoneyInput(stringField(formData, "targetRent")),
    sourceName: sourceNameClean,
    sourceNote,
    asOfDate: parseDateInput(stringField(formData, "asOfDate")),
    confidence: parseConfidence(stringField(formData, "confidence")),
    isPrivateReference: property.isPrivateReference,
  };
}

function stringField(form: FormData, key: string): string | null {
  const v = form.get(key);
  return typeof v === "string" ? v : null;
}
