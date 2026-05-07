/**
 * ATTOM Data — server-only client for property records (characteristics,
 * tax/assessment, sales history, ownership). Used as the official-record
 * source — NOT as the primary AVM. RentCast remains primary for value
 * and rent estimates; this client is for verification + tax data.
 *
 * Endpoint:
 *   GET https://api.gateway.attomdata.com/propertyapi/v1.0.0/property/expandedprofile
 *
 * Auth via `apikey` header. Address split into address1 (street) and
 * address2 (city, state ZIP).
 *
 * IMPORTANT: This module reads process.env.ATTOM_API_KEY and must never
 * be imported by a client component. The runtime guard below throws if
 * the module ends up in a browser bundle.
 */

if (typeof window !== "undefined") {
  throw new Error(
    "src/lib/attom.ts is server-only and must not be imported on the client."
  );
}

const PROPERTY_ENDPOINT =
  "https://api.gateway.attomdata.com/propertyapi/v1.0.0/property/expandedprofile";

// ---------- Types ----------

export type AttomFetchStatus = "SUCCESS" | "NO_DATA" | "ERROR" | "MISSING_KEY";

/**
 * Small, safe extract of the ATTOM expandedprofile response. The full
 * JSON is preserved in `raw` for traceability; only stable, easy-to-read
 * fields are surfaced to the UI.
 */
export type AttomFacts = {
  attomId: string | null;
  apn: string | null;
  fips: string | null;
  addressOneLine: string | null;
  yearBuilt: number | null;
  buildingSize: number | null;
  assessedValue: number | null;
  marketValue: number | null;
  annualTaxes: number | null;
  lastSalePrice: number | null;
  lastSaleDate: string | null; // ISO-ish date string from ATTOM
  propertyClass: string | null;
};

export type AttomSnapshot = {
  status: AttomFetchStatus;
  errorMessage: string | null;
  facts: AttomFacts | null;
  raw: unknown;
  fetchedAt: Date;
  asOfDate: Date | null;
};

// ---------- Public guards ----------

export function hasAttomKey(): boolean {
  return Boolean(process.env.ATTOM_API_KEY?.trim());
}

// ---------- Internal helpers ----------

function asNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function asString(v: unknown): string | null {
  if (typeof v === "string" && v.trim()) return v.trim();
  if (typeof v === "number") return String(v);
  return null;
}

function parseSaleDate(raw: string | null): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

// ATTOM responses have a deeply-nested shape we don't want to type
// rigidly. We narrow at extraction time.
type AttomProperty = {
  identifier?: { attomId?: unknown; apn?: unknown; fips?: unknown };
  address?: { oneLine?: unknown };
  summary?: { yearbuilt?: unknown; propclass?: unknown };
  building?: { size?: { universalsize?: unknown } };
  assessment?: {
    assessed?: { assdttlvalue?: unknown };
    market?: { mktttlvalue?: unknown };
    tax?: { taxamt?: unknown };
  };
  sale?: {
    amount?: { saleamt?: unknown };
    salesearchdate?: unknown;
  };
};

type AttomEnvelope = {
  status?: { code?: number; msg?: string };
  property?: AttomProperty[];
};

function extractAttomFacts(json: unknown): AttomFacts | null {
  const env = json as AttomEnvelope | null;
  const property = env?.property?.[0];
  if (!property) return null;

  return {
    attomId: asString(property.identifier?.attomId),
    apn: asString(property.identifier?.apn),
    fips: asString(property.identifier?.fips),
    addressOneLine: asString(property.address?.oneLine),
    yearBuilt: asNumber(property.summary?.yearbuilt),
    buildingSize: asNumber(property.building?.size?.universalsize),
    assessedValue: asNumber(property.assessment?.assessed?.assdttlvalue),
    marketValue: asNumber(property.assessment?.market?.mktttlvalue),
    annualTaxes: asNumber(property.assessment?.tax?.taxamt),
    lastSalePrice: asNumber(property.sale?.amount?.saleamt),
    lastSaleDate: asString(property.sale?.salesearchdate),
    propertyClass: asString(property.summary?.propclass),
  };
}

// ---------- Public API ----------

/**
 * Fetch ATTOM expandedprofile for a property. Returns a normalized
 * snapshot with the safe extract + the raw response. Tolerates missing
 * keys, network failures, non-200s, and empty result lists.
 */
export async function fetchAttomPropertyRecord(property: {
  address: string;
  city: string;
  state: string;
  zip: string | null;
}): Promise<AttomSnapshot> {
  const fetchedAt = new Date();
  const apiKey = process.env.ATTOM_API_KEY?.trim();

  if (!apiKey) {
    return {
      status: "MISSING_KEY",
      errorMessage: "ATTOM_API_KEY missing",
      facts: null,
      raw: null,
      fetchedAt,
      asOfDate: null,
    };
  }

  const address1 = property.address.trim();
  const address2 = `${property.city}, ${property.state}${
    property.zip ? ` ${property.zip}` : ""
  }`;

  const url = new URL(PROPERTY_ENDPOINT);
  url.searchParams.set("address1", address1);
  url.searchParams.set("address2", address2);

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        apikey: apiKey,
        Accept: "application/json",
      },
      cache: "no-store",
    });
  } catch (err) {
    return {
      status: "ERROR",
      errorMessage: err instanceof Error ? err.message : "Network error",
      facts: null,
      raw: null,
      fetchedAt,
      asOfDate: null,
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
      facts: null,
      raw: null,
      fetchedAt,
      asOfDate: null,
    };
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch (err) {
    return {
      status: "ERROR",
      errorMessage: err instanceof Error ? err.message : "Invalid JSON",
      facts: null,
      raw: null,
      fetchedAt,
      asOfDate: null,
    };
  }

  // ATTOM responses include a top-level status block — anything other
  // than code 0 indicates an issue (lookup failure, throttling, etc.).
  const env = json as AttomEnvelope;
  const code = env?.status?.code;
  const msg = env?.status?.msg;
  if (typeof code === "number" && code !== 0) {
    return {
      status: "ERROR",
      errorMessage: msg
        ? `ATTOM status ${code}: ${msg}`
        : `ATTOM status ${code}`,
      facts: null,
      raw: json,
      fetchedAt,
      asOfDate: null,
    };
  }

  const facts = extractAttomFacts(json);
  if (!facts || !facts.attomId) {
    return {
      status: "NO_DATA",
      errorMessage: null,
      facts,
      raw: json,
      fetchedAt,
      asOfDate: null,
    };
  }

  return {
    status: "SUCCESS",
    errorMessage: null,
    facts,
    raw: json,
    fetchedAt,
    asOfDate: parseSaleDate(facts.lastSaleDate) ?? fetchedAt,
  };
}

// =============================================================
// ATTOM AVM (current value)
// =============================================================

const AVM_DETAIL_ENDPOINT =
  "https://api.gateway.attomdata.com/propertyapi/v1.0.0/attomavm/detail";
const AVM_HISTORY_ENDPOINT =
  "https://api.gateway.attomdata.com/propertyapi/v1.0.0/avmhistory/detail";

export type AttomAvmValue = {
  estimatedValue: number | null;
  valueLow: number | null;
  valueHigh: number | null;
  /** RentCast/ATTOM both expose a confidence score 0–100. */
  confidence: number | null;
  asOfDate: Date | null;
};

export type AttomAvmSnapshot = {
  status: AttomFetchStatus;
  errorMessage: string | null;
  /** UI flag: differentiate "endpoint forbidden by plan" from generic ERROR. */
  unavailableForPlan: boolean;
  avm: AttomAvmValue | null;
  raw: unknown;
  fetchedAt: Date;
  asOfDate: Date | null;
};

export type AttomAvmHistoryPoint = {
  date: string | null;
  estimatedValue: number | null;
  valueLow: number | null;
  valueHigh: number | null;
  confidence: number | null;
};

export type AttomAvmHistorySnapshot = {
  status: AttomFetchStatus;
  errorMessage: string | null;
  unavailableForPlan: boolean;
  history: AttomAvmHistoryPoint[];
  raw: unknown;
  fetchedAt: Date;
  asOfDate: Date | null;
};

type AttomAvmEnvelope = {
  status?: { code?: number; msg?: string };
  property?: Array<{
    avm?: {
      amount?: {
        value?: unknown;
        high?: unknown;
        low?: unknown;
        confidence?: unknown;
      };
      eventDate?: unknown;
    };
    avmhistory?: Array<{
      eventDate?: unknown;
      amount?: {
        value?: unknown;
        high?: unknown;
        low?: unknown;
        confidence?: unknown;
      };
    }>;
  }>;
};

function isPlanRefusal(httpStatus: number, body: string): boolean {
  if (httpStatus === 401 || httpStatus === 403) return true;
  // ATTOM returns a 200 envelope with status.code 4xx for permission
  // problems on some accounts; the `msg` typically mentions "subscription"
  // or "not authorized".
  return /not\s+authoriz|subscription|forbidden|not\s+permitted/i.test(body);
}

async function attomGet(
  url: string,
  property: { address: string; city: string; state: string; zip: string | null }
): Promise<
  | { ok: true; json: AttomAvmEnvelope; raw: unknown }
  | { ok: false; reason: string; httpStatus: number | null; planRefusal: boolean; raw: unknown }
> {
  const apiKey = process.env.ATTOM_API_KEY?.trim();
  if (!apiKey) {
    return {
      ok: false,
      reason: "ATTOM_API_KEY missing",
      httpStatus: null,
      planRefusal: false,
      raw: null,
    };
  }
  const address1 = property.address.trim();
  const address2 = `${property.city}, ${property.state}${
    property.zip ? ` ${property.zip}` : ""
  }`;
  const u = new URL(url);
  u.searchParams.set("address1", address1);
  u.searchParams.set("address2", address2);

  let res: Response;
  try {
    res = await fetch(u.toString(), {
      method: "GET",
      headers: { apikey: apiKey, Accept: "application/json" },
      cache: "no-store",
    });
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "Network error",
      httpStatus: null,
      planRefusal: false,
      raw: null,
    };
  }

  let bodyText = "";
  try {
    bodyText = await res.text();
  } catch {
    /* ignore */
  }
  let json: unknown = null;
  try {
    json = bodyText ? JSON.parse(bodyText) : null;
  } catch {
    /* leave json null; callers fall back to text */
  }

  if (!res.ok) {
    return {
      ok: false,
      reason: `HTTP ${res.status}${bodyText ? ` — ${bodyText.slice(0, 200)}` : ""}`,
      httpStatus: res.status,
      planRefusal: isPlanRefusal(res.status, bodyText),
      raw: json,
    };
  }

  const env = json as AttomAvmEnvelope | null;
  const code = env?.status?.code;
  const msg = env?.status?.msg ?? "";
  if (typeof code === "number" && code !== 0) {
    return {
      ok: false,
      reason: msg ? `ATTOM status ${code}: ${msg}` : `ATTOM status ${code}`,
      httpStatus: res.status,
      planRefusal: isPlanRefusal(res.status, msg),
      raw: json,
    };
  }
  return { ok: true, json: (env ?? {}) as AttomAvmEnvelope, raw: json };
}

function readAvmAmount(amount: AttomAvmEnvelope["property"] extends Array<infer P>
  ? P extends { avm?: infer A }
    ? A extends { amount?: infer X }
      ? X
      : never
    : never
  : never): {
  value: number | null;
  low: number | null;
  high: number | null;
  confidence: number | null;
} {
  const a = amount as
    | { value?: unknown; low?: unknown; high?: unknown; confidence?: unknown }
    | undefined;
  return {
    value: asNumber(a?.value),
    low: asNumber(a?.low),
    high: asNumber(a?.high),
    confidence: asNumber(a?.confidence),
  };
}

/**
 * Fetch the current ATTOM AVM value for a property. Returns
 * `unavailableForPlan: true` when the endpoint refuses with a 401/403
 * or "not authorized" message — the page surfaces that as a clear
 * "AVM unavailable for current plan/key" notice instead of treating it
 * as a hard error.
 */
export async function fetchAttomAvm(property: {
  address: string;
  city: string;
  state: string;
  zip: string | null;
}): Promise<AttomAvmSnapshot> {
  const fetchedAt = new Date();
  if (!hasAttomKey()) {
    return {
      status: "MISSING_KEY",
      errorMessage: "ATTOM_API_KEY missing",
      unavailableForPlan: false,
      avm: null,
      raw: null,
      fetchedAt,
      asOfDate: null,
    };
  }

  const result = await attomGet(AVM_DETAIL_ENDPOINT, property);
  if (!result.ok) {
    return {
      status: "ERROR",
      errorMessage: result.reason,
      unavailableForPlan: result.planRefusal,
      avm: null,
      raw: result.raw,
      fetchedAt,
      asOfDate: null,
    };
  }

  const property0 = result.json.property?.[0];
  const avm = property0?.avm;
  if (!avm) {
    return {
      status: "NO_DATA",
      errorMessage: null,
      unavailableForPlan: false,
      avm: null,
      raw: result.raw,
      fetchedAt,
      asOfDate: null,
    };
  }
  const amounts = readAvmAmount(avm.amount as never);
  const eventDate = parseSaleDate(asString(avm.eventDate));
  const facts: AttomAvmValue = {
    estimatedValue: amounts.value,
    valueLow: amounts.low,
    valueHigh: amounts.high,
    confidence: amounts.confidence,
    asOfDate: eventDate,
  };
  return {
    status: facts.estimatedValue != null ? "SUCCESS" : "NO_DATA",
    errorMessage: null,
    unavailableForPlan: false,
    avm: facts,
    raw: result.raw,
    fetchedAt,
    asOfDate: eventDate ?? fetchedAt,
  };
}

/**
 * Fetch ATTOM AVM history for a property. Same plan-refusal handling
 * as the AVM endpoint. Returns the points sorted oldest → newest.
 */
export async function fetchAttomAvmHistory(property: {
  address: string;
  city: string;
  state: string;
  zip: string | null;
}): Promise<AttomAvmHistorySnapshot> {
  const fetchedAt = new Date();
  if (!hasAttomKey()) {
    return {
      status: "MISSING_KEY",
      errorMessage: "ATTOM_API_KEY missing",
      unavailableForPlan: false,
      history: [],
      raw: null,
      fetchedAt,
      asOfDate: null,
    };
  }

  const result = await attomGet(AVM_HISTORY_ENDPOINT, property);
  if (!result.ok) {
    return {
      status: "ERROR",
      errorMessage: result.reason,
      unavailableForPlan: result.planRefusal,
      history: [],
      raw: result.raw,
      fetchedAt,
      asOfDate: null,
    };
  }

  const property0 = result.json.property?.[0];
  const rawHistory = property0?.avmhistory ?? [];
  if (!Array.isArray(rawHistory) || rawHistory.length === 0) {
    return {
      status: "NO_DATA",
      errorMessage: null,
      unavailableForPlan: false,
      history: [],
      raw: result.raw,
      fetchedAt,
      asOfDate: null,
    };
  }
  const points: AttomAvmHistoryPoint[] = rawHistory.map((h) => {
    const amt = readAvmAmount(h.amount as never);
    return {
      date: asString(h.eventDate),
      estimatedValue: amt.value,
      valueLow: amt.low,
      valueHigh: amt.high,
      confidence: amt.confidence,
    };
  });
  points.sort((a, b) => {
    const ad = a.date ? new Date(a.date).getTime() : 0;
    const bd = b.date ? new Date(b.date).getTime() : 0;
    return ad - bd;
  });
  const newest = points[points.length - 1]?.date
    ? new Date(points[points.length - 1].date as string)
    : null;
  return {
    status: "SUCCESS",
    errorMessage: null,
    unavailableForPlan: false,
    history: points,
    raw: result.raw,
    fetchedAt,
    asOfDate: newest && !Number.isNaN(newest.getTime()) ? newest : fetchedAt,
  };
}
