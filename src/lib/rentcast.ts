/**
 * RentCast — server-only client for property valuation and long-term
 * rent estimates.
 *
 * Endpoints:
 *   GET https://api.rentcast.io/v1/avm/value
 *   GET https://api.rentcast.io/v1/avm/rent/long-term
 *
 * Auth via X-Api-Key header. Address passed as a query param.
 *
 * IMPORTANT: This module reads process.env.RENTCAST_API_KEY and must
 * never be imported by a client component. The runtime guard below
 * throws if the module ends up in a browser bundle.
 */

if (typeof window !== "undefined") {
  throw new Error(
    "src/lib/rentcast.ts is server-only and must not be imported on the client."
  );
}

const VALUE_URL = "https://api.rentcast.io/v1/avm/value";
const RENT_URL = "https://api.rentcast.io/v1/avm/rent/long-term";

// ---------- Types ----------

export type RentCastFetchStatus = "SUCCESS" | "NO_DATA" | "ERROR" | "MISSING_KEY";

/**
 * Normalized snapshot we save to MarketSourceSnapshot. All money fields
 * are nullable so partial responses still get persisted.
 */
export type RentCastSnapshot = {
  status: RentCastFetchStatus;
  errorMessage: string | null;
  estimatedValue: number | null;
  estimatedRent: number | null;
  valueLow: number | null;
  valueHigh: number | null;
  rentLow: number | null;
  rentHigh: number | null;
  compsCount: number | null;
  asOfDate: Date | null;
  fetchedAt: Date;
  raw: unknown;
};

type RentCastResponse = {
  price?: number;
  rent?: number;
  priceRangeLow?: number;
  priceRangeHigh?: number;
  rentRangeLow?: number;
  rentRangeHigh?: number;
  comparables?: unknown[];
  // RentCast occasionally includes a `lastUpdatedDate` or similar field;
  // we look for a few common shapes and fall back to fetchedAt.
  lastUpdatedDate?: string;
  asOfDate?: string;
};

// ---------- Public guards ----------

export function hasRentCastKey(): boolean {
  return Boolean(process.env.RENTCAST_API_KEY?.trim());
}

// ---------- Internal fetch helpers ----------

async function fetchAvm(
  url: string,
  address: string
): Promise<{ ok: true; data: RentCastResponse } | { ok: false; error: string; status: number | null }> {
  const apiKey = process.env.RENTCAST_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, error: "RENTCAST_API_KEY missing", status: null };
  }

  const u = new URL(url);
  u.searchParams.set("address", address);

  let res: Response;
  try {
    res = await fetch(u.toString(), {
      method: "GET",
      headers: {
        "X-Api-Key": apiKey,
        Accept: "application/json",
      },
      // Always go to the network — never cache provider data per request.
      cache: "no-store",
    });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error",
      status: null,
    };
  }

  if (!res.ok) {
    let detail = "";
    try {
      detail = (await res.text()).slice(0, 300);
    } catch {
      /* ignore body read errors */
    }
    return {
      ok: false,
      error: `HTTP ${res.status}${detail ? ` — ${detail}` : ""}`,
      status: res.status,
    };
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Invalid JSON",
      status: res.status,
    };
  }

  return { ok: true, data: json as RentCastResponse };
}

function parseDate(raw: string | undefined): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function asNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

// ---------- Public API ----------

/** Just the value-AVM endpoint. Returns a partial snapshot. */
export async function getRentCastValueEstimate(
  address: string
): Promise<RentCastSnapshot> {
  const fetchedAt = new Date();
  if (!hasRentCastKey()) {
    return emptySnapshot("MISSING_KEY", "RENTCAST_API_KEY missing", fetchedAt);
  }
  const result = await fetchAvm(VALUE_URL, address);
  if (!result.ok) {
    return emptySnapshot("ERROR", result.error, fetchedAt);
  }
  const data = result.data;
  const price = asNumber(data.price);
  return {
    status: price != null ? "SUCCESS" : "NO_DATA",
    errorMessage: null,
    estimatedValue: price,
    estimatedRent: null,
    valueLow: asNumber(data.priceRangeLow),
    valueHigh: asNumber(data.priceRangeHigh),
    rentLow: null,
    rentHigh: null,
    compsCount: Array.isArray(data.comparables)
      ? data.comparables.length
      : null,
    asOfDate: parseDate(data.lastUpdatedDate ?? data.asOfDate) ?? fetchedAt,
    fetchedAt,
    raw: data,
  };
}

/** Just the long-term-rent AVM endpoint. Returns a partial snapshot. */
export async function getRentCastRentEstimate(
  address: string
): Promise<RentCastSnapshot> {
  const fetchedAt = new Date();
  if (!hasRentCastKey()) {
    return emptySnapshot("MISSING_KEY", "RENTCAST_API_KEY missing", fetchedAt);
  }
  const result = await fetchAvm(RENT_URL, address);
  if (!result.ok) {
    return emptySnapshot("ERROR", result.error, fetchedAt);
  }
  const data = result.data;
  const rent = asNumber(data.rent);
  return {
    status: rent != null ? "SUCCESS" : "NO_DATA",
    errorMessage: null,
    estimatedValue: null,
    estimatedRent: rent,
    valueLow: null,
    valueHigh: null,
    rentLow: asNumber(data.rentRangeLow),
    rentHigh: asNumber(data.rentRangeHigh),
    compsCount: Array.isArray(data.comparables)
      ? data.comparables.length
      : null,
    asOfDate: parseDate(data.lastUpdatedDate ?? data.asOfDate) ?? fetchedAt,
    fetchedAt,
    raw: data,
  };
}

/**
 * Combined value+rent fetch for a single property. Returns a single
 * normalized snapshot suitable for the MarketSourceSnapshot row. Both
 * sub-calls are issued concurrently; partial failures are tolerated —
 * if one endpoint succeeds and the other errors, the SUCCESS data is
 * preserved and the error message is stored.
 */
export async function fetchRentCastSnapshotForProperty(property: {
  id: string;
  address: string;
  city: string;
  state: string;
  zip: string | null;
}): Promise<RentCastSnapshot> {
  const fetchedAt = new Date();

  if (!hasRentCastKey()) {
    return emptySnapshot("MISSING_KEY", "RENTCAST_API_KEY missing", fetchedAt);
  }

  const fullAddress = formatAddress(property);

  const [valueRes, rentRes] = await Promise.all([
    getRentCastValueEstimate(fullAddress),
    getRentCastRentEstimate(fullAddress),
  ]);

  const errors = [valueRes, rentRes]
    .filter((r) => r.status === "ERROR")
    .map((r) => r.errorMessage)
    .filter((m): m is string => Boolean(m));

  const status: RentCastFetchStatus =
    valueRes.estimatedValue != null || rentRes.estimatedRent != null
      ? "SUCCESS"
      : errors.length > 0
      ? "ERROR"
      : "NO_DATA";

  const compsCount =
    (valueRes.compsCount ?? 0) + (rentRes.compsCount ?? 0) || null;

  // Prefer the freshest provider asOfDate across the two sub-calls.
  const asOf =
    [valueRes.asOfDate, rentRes.asOfDate]
      .filter((d): d is Date => d instanceof Date)
      .sort((a, b) => a.getTime() - b.getTime())
      .pop() ?? fetchedAt;

  return {
    status,
    errorMessage: errors.length > 0 ? errors.join(" | ") : null,
    estimatedValue: valueRes.estimatedValue,
    estimatedRent: rentRes.estimatedRent,
    valueLow: valueRes.valueLow,
    valueHigh: valueRes.valueHigh,
    rentLow: rentRes.rentLow,
    rentHigh: rentRes.rentHigh,
    compsCount,
    asOfDate: asOf,
    fetchedAt,
    raw: {
      sourceName: "RentCast",
      value: valueRes.raw,
      rent: rentRes.raw,
    },
  };
}

function formatAddress(p: {
  address: string;
  city: string;
  state: string;
  zip: string | null;
}): string {
  const parts = [p.address, `${p.city}, ${p.state}${p.zip ? ` ${p.zip}` : ""}`];
  return parts.filter(Boolean).join(", ");
}

function emptySnapshot(
  status: RentCastFetchStatus,
  errorMessage: string | null,
  fetchedAt: Date
): RentCastSnapshot {
  return {
    status,
    errorMessage,
    estimatedValue: null,
    estimatedRent: null,
    valueLow: null,
    valueHigh: null,
    rentLow: null,
    rentHigh: null,
    compsCount: null,
    asOfDate: null,
    fetchedAt,
    raw: null,
  };
}
