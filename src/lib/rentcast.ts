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

// =============================================================
// Comparables — extraction from RentCast AVM responses
// =============================================================

/**
 * Lightweight, display-safe representation of a single RentCast
 * comparable. We keep only fields the UI can render without inventing
 * data; everything else stays in the snapshot's `raw`.
 */
export type RentCastComp = {
  address: string | null;
  /** Sale price for value comps; rent for rent comps. */
  amount: number | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  /** Distance from the subject in miles, when provider supplies it. */
  distanceMiles: number | null;
  /** Listing or recording date when present. */
  date: string | null;
  /** Listing status (e.g. "Active", "Sold") when present. */
  status: string | null;
};

type ComparableRecord = Record<string, unknown>;

function pickNumber(obj: ComparableRecord, keys: string[]): number | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      const n = parseFloat(v);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

function pickString(obj: ComparableRecord, keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function normalizeComp(
  raw: ComparableRecord,
  kind: "value" | "rent"
): RentCastComp {
  return {
    address: pickString(raw, ["formattedAddress", "address", "addressLine1"]),
    amount:
      kind === "value"
        ? pickNumber(raw, [
            "price",
            "lastSalePrice",
            "salePrice",
            "estimatedValue",
          ])
        : pickNumber(raw, ["rent", "lastSeenRent", "estimatedRent"]),
    beds: pickNumber(raw, ["bedrooms", "beds"]),
    baths: pickNumber(raw, ["bathrooms", "baths"]),
    sqft: pickNumber(raw, ["squareFootage", "sqft", "livingArea"]),
    distanceMiles: pickNumber(raw, ["distance", "distanceMiles"]),
    date: pickString(raw, [
      "lastSaleDate",
      "lastSeenDate",
      "listedDate",
      "listingDate",
      "date",
    ]),
    status: pickString(raw, ["status", "listingType"]),
  };
}

/**
 * Extract sale comps + rental comps from a stored RentCast SUCCESS
 * snapshot's `raw` payload. Returns empty arrays when the response
 * shape isn't recognized — never throws.
 */
export function extractRentCastComps(
  raw: unknown
): { saleComps: RentCastComp[]; rentalComps: RentCastComp[] } {
  const empty = { saleComps: [], rentalComps: [] };
  if (!raw || typeof raw !== "object") return empty;
  const r = raw as { value?: { comparables?: unknown[] }; rent?: { comparables?: unknown[] } };
  const saleSrc = Array.isArray(r.value?.comparables) ? r.value!.comparables : [];
  const rentSrc = Array.isArray(r.rent?.comparables) ? r.rent!.comparables : [];
  return {
    saleComps: saleSrc
      .filter((x): x is ComparableRecord => !!x && typeof x === "object")
      .map((x) => normalizeComp(x, "value")),
    rentalComps: rentSrc
      .filter((x): x is ComparableRecord => !!x && typeof x === "object")
      .map((x) => normalizeComp(x, "rent")),
  };
}

// =============================================================
// Listings — /listings/sale and /listings/rental/long-term
// =============================================================

const LISTINGS_SALE_URL = "https://api.rentcast.io/v1/listings/sale";
const LISTINGS_RENTAL_URL = "https://api.rentcast.io/v1/listings/rental/long-term";

export type RentCastListing = {
  id: string | null;
  formattedAddress: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  /** Sale price OR monthly rent depending on endpoint. */
  amount: number | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  status: string | null;
  date: string | null;
  daysOnMarket: number | null;
};

export type RentCastListingsSnapshot = {
  status: RentCastFetchStatus;
  errorMessage: string | null;
  listings: RentCastListing[];
  fetchedAt: Date;
  /** Latest listing date or fetch date; used as asOfDate. */
  asOfDate: Date | null;
  raw: unknown;
};

function normalizeListing(raw: ComparableRecord): RentCastListing {
  return {
    id: pickString(raw, ["id"]),
    formattedAddress: pickString(raw, [
      "formattedAddress",
      "address",
      "addressLine1",
    ]),
    city: pickString(raw, ["city"]),
    state: pickString(raw, ["state"]),
    zipCode: pickString(raw, ["zipCode", "zip"]),
    amount: pickNumber(raw, ["price", "rent", "lastSalePrice"]),
    beds: pickNumber(raw, ["bedrooms", "beds"]),
    baths: pickNumber(raw, ["bathrooms", "baths"]),
    sqft: pickNumber(raw, ["squareFootage", "sqft", "livingArea"]),
    status: pickString(raw, ["status", "listingType"]),
    date: pickString(raw, [
      "listedDate",
      "listingDate",
      "lastSeenDate",
      "lastSalePrice",
      "lastSaleDate",
    ]),
    daysOnMarket: pickNumber(raw, ["daysOnMarket"]),
  };
}

async function fetchListings(
  url: string,
  params: Record<string, string>
): Promise<RentCastListingsSnapshot> {
  const fetchedAt = new Date();
  const apiKey = process.env.RENTCAST_API_KEY?.trim();
  if (!apiKey) {
    return {
      status: "MISSING_KEY",
      errorMessage: "RENTCAST_API_KEY missing",
      listings: [],
      fetchedAt,
      asOfDate: null,
      raw: null,
    };
  }

  const u = new URL(url);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  // Cap response size — listings endpoints accept `limit`. 25 is plenty
  // for a compact UI preview; full payload still lives in raw.
  if (!u.searchParams.has("limit")) u.searchParams.set("limit", "25");

  let res: Response;
  try {
    res = await fetch(u.toString(), {
      method: "GET",
      headers: { "X-Api-Key": apiKey, Accept: "application/json" },
      cache: "no-store",
    });
  } catch (err) {
    return {
      status: "ERROR",
      errorMessage: err instanceof Error ? err.message : "Network error",
      listings: [],
      fetchedAt,
      asOfDate: null,
      raw: null,
    };
  }

  if (!res.ok) {
    let detail = "";
    try {
      detail = (await res.text()).slice(0, 300);
    } catch {
      /* ignore */
    }
    return {
      status: "ERROR",
      errorMessage: `HTTP ${res.status}${detail ? ` — ${detail}` : ""}`,
      listings: [],
      fetchedAt,
      asOfDate: null,
      raw: null,
    };
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch (err) {
    return {
      status: "ERROR",
      errorMessage: err instanceof Error ? err.message : "Invalid JSON",
      listings: [],
      fetchedAt,
      asOfDate: null,
      raw: null,
    };
  }

  // RentCast listings endpoints typically return an array of listings.
  const arr = Array.isArray(json) ? json : null;
  if (!arr) {
    return {
      status: "NO_DATA",
      errorMessage: "Unexpected response shape",
      listings: [],
      fetchedAt,
      asOfDate: null,
      raw: json,
    };
  }
  const listings: RentCastListing[] = arr
    .filter((x): x is ComparableRecord => !!x && typeof x === "object")
    .map(normalizeListing);
  // asOfDate = latest date among listings, falling back to fetchedAt.
  let latest: Date | null = null;
  for (const l of listings) {
    if (l.date) {
      const d = new Date(l.date);
      if (!Number.isNaN(d.getTime()) && (latest === null || d > latest)) {
        latest = d;
      }
    }
  }
  return {
    status: listings.length > 0 ? "SUCCESS" : "NO_DATA",
    errorMessage: null,
    listings,
    fetchedAt,
    asOfDate: latest ?? fetchedAt,
    raw: json,
  };
}

export async function fetchRentCastSaleListings(params: {
  city?: string;
  state?: string;
  zipCode?: string;
}): Promise<RentCastListingsSnapshot> {
  const q: Record<string, string> = {};
  if (params.city) q.city = params.city;
  if (params.state) q.state = params.state;
  if (params.zipCode) q.zipCode = params.zipCode;
  return fetchListings(LISTINGS_SALE_URL, q);
}

export async function fetchRentCastRentalListings(params: {
  city?: string;
  state?: string;
  zipCode?: string;
}): Promise<RentCastListingsSnapshot> {
  const q: Record<string, string> = {};
  if (params.city) q.city = params.city;
  if (params.state) q.state = params.state;
  if (params.zipCode) q.zipCode = params.zipCode;
  return fetchListings(LISTINGS_RENTAL_URL, q);
}
