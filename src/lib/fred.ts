/**
 * FRED — server-only client for macro/rate series.
 *
 * Endpoint:
 *   GET https://api.stlouisfed.org/fred/series/observations
 *
 * Auth via `api_key` query param. We always pass `file_type=json`
 * and `sort_order=desc&limit=1` to get the latest non-missing
 * observation for each series.
 *
 * IMPORTANT: This module reads process.env.FRED_API_KEY and must never
 * be imported by a client component. The runtime guard below throws if
 * the module ends up in a browser bundle.
 */

if (typeof window !== "undefined") {
  throw new Error(
    "src/lib/fred.ts is server-only and must not be imported on the client."
  );
}

const FRED_OBSERVATIONS =
  "https://api.stlouisfed.org/fred/series/observations";

// ---------- Series catalog ----------

export const FRED_SERIES = [
  "MORTGAGE30US",
  "DGS10",
  "FEDFUNDS",
  "CPIAUCSL",
  "UNRATE",
  "HOUST",
] as const;

export type FredSeriesId = (typeof FRED_SERIES)[number];

export const FRED_SERIES_LABELS: Record<FredSeriesId, string> = {
  MORTGAGE30US: "30-year mortgage rate",
  DGS10: "10-year Treasury",
  FEDFUNDS: "Effective federal funds rate",
  CPIAUCSL: "CPI (all urban consumers)",
  UNRATE: "Unemployment rate",
  HOUST: "Housing starts",
};

/** Display unit hint per series — used by the formatter on the page. */
export type FredUnit = "PERCENT" | "INDEX" | "THOUSANDS_SAAR";

export const FRED_SERIES_UNIT: Record<FredSeriesId, FredUnit> = {
  MORTGAGE30US: "PERCENT",
  DGS10: "PERCENT",
  FEDFUNDS: "PERCENT",
  CPIAUCSL: "INDEX",
  UNRATE: "PERCENT",
  HOUST: "THOUSANDS_SAAR",
};

// ---------- Types ----------

export type FredFetchStatus = "SUCCESS" | "NO_DATA" | "ERROR" | "MISSING_KEY";

export type FredObservation = {
  seriesId: FredSeriesId;
  /** Numeric observation. null if FRED returned "." (missing). */
  value: number | null;
  /** YYYY-MM-DD ISO date string from FRED. */
  date: string | null;
  unit: FredUnit;
  label: string;
};

export type FredSnapshot = {
  status: FredFetchStatus;
  errorMessage: string | null;
  observations: Record<FredSeriesId, FredObservation | null>;
  errors: { seriesId: FredSeriesId; reason: string }[];
  fetchedAt: Date;
  asOfDate: Date | null;
};

// ---------- Public guards ----------

export function hasFredKey(): boolean {
  return Boolean(process.env.FRED_API_KEY?.trim());
}

// ---------- Internal fetch helpers ----------

function asNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const t = v.trim();
    if (t === "" || t === ".") return null;
    const n = parseFloat(t);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

type FredObservationResponse = {
  observations?: Array<{ date?: string; value?: string }>;
};

async function fetchSeries(
  seriesId: FredSeriesId
): Promise<
  | { ok: true; observation: FredObservation }
  | { ok: false; reason: string; isNoData?: boolean }
> {
  const apiKey = process.env.FRED_API_KEY?.trim();
  if (!apiKey) return { ok: false, reason: "FRED_API_KEY missing" };

  const url = new URL(FRED_OBSERVATIONS);
  url.searchParams.set("series_id", seriesId);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("file_type", "json");
  url.searchParams.set("sort_order", "desc");
  url.searchParams.set("limit", "1");

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "Network error",
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
      ok: false,
      reason: `HTTP ${res.status}${detail ? ` — ${detail}` : ""}`,
    };
  }

  let json: FredObservationResponse;
  try {
    json = (await res.json()) as FredObservationResponse;
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "Invalid JSON",
    };
  }

  // FRED returns "." for missing observations. The desc+limit=1 above
  // gives the most recent row; if that row is missing we walk a small
  // window backwards to find the most recent non-missing value. Done
  // inline (no extra request) by relaxing the limit when needed.
  const obs = json.observations?.[0];
  const value = asNumber(obs?.value);

  if (!obs || value == null) {
    // Re-fetch with a wider window to backfill across recent missing
    // observations (some series have delayed publishing).
    const widened = await fetchSeriesWidened(seriesId, apiKey);
    if (widened) {
      return { ok: true, observation: widened };
    }
    return {
      ok: false,
      reason: "No recent non-missing observation",
      isNoData: true,
    };
  }

  return {
    ok: true,
    observation: {
      seriesId,
      value,
      date: obs?.date ?? null,
      unit: FRED_SERIES_UNIT[seriesId],
      label: FRED_SERIES_LABELS[seriesId],
    },
  };
}

async function fetchSeriesWidened(
  seriesId: FredSeriesId,
  apiKey: string
): Promise<FredObservation | null> {
  const url = new URL(FRED_OBSERVATIONS);
  url.searchParams.set("series_id", seriesId);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("file_type", "json");
  url.searchParams.set("sort_order", "desc");
  url.searchParams.set("limit", "12");

  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as FredObservationResponse;
    for (const obs of json.observations ?? []) {
      const v = asNumber(obs.value);
      if (v != null) {
        return {
          seriesId,
          value: v,
          date: obs.date ?? null,
          unit: FRED_SERIES_UNIT[seriesId],
          label: FRED_SERIES_LABELS[seriesId],
        };
      }
    }
  } catch {
    /* ignore — caller treats absence as NO_DATA */
  }
  return null;
}

function emptyObservations(): Record<FredSeriesId, FredObservation | null> {
  const map = {} as Record<FredSeriesId, FredObservation | null>;
  for (const id of FRED_SERIES) map[id] = null;
  return map;
}

// ---------- Public API ----------

/**
 * Fetch every series in `FRED_SERIES` concurrently. Tolerates per-series
 * failure: a 4xx on one series doesn't block the others. Status is
 * SUCCESS if at least one observation came back, NO_DATA if all series
 * had no recent value, ERROR if every call failed.
 */
export async function fetchFredMacroSnapshot(): Promise<FredSnapshot> {
  const fetchedAt = new Date();
  if (!hasFredKey()) {
    return {
      status: "MISSING_KEY",
      errorMessage: "FRED_API_KEY missing",
      observations: emptyObservations(),
      errors: [],
      fetchedAt,
      asOfDate: null,
    };
  }

  const results = await Promise.all(
    FRED_SERIES.map(async (id) => ({ id, result: await fetchSeries(id) }))
  );

  const observations = emptyObservations();
  const errors: { seriesId: FredSeriesId; reason: string }[] = [];
  let successCount = 0;
  let noDataCount = 0;

  for (const { id, result } of results) {
    if (result.ok) {
      observations[id] = result.observation;
      successCount++;
    } else {
      errors.push({ seriesId: id, reason: result.reason });
      if (result.isNoData) noDataCount++;
    }
  }

  // asOfDate = max observation date across SUCCESS series.
  const dates: Date[] = [];
  for (const obs of Object.values(observations)) {
    if (obs?.date) {
      const d = new Date(obs.date);
      if (!Number.isNaN(d.getTime())) dates.push(d);
    }
  }
  const asOfDate =
    dates.length > 0
      ? new Date(Math.max(...dates.map((d) => d.getTime())))
      : null;

  let status: FredFetchStatus;
  if (successCount > 0) status = "SUCCESS";
  else if (noDataCount === errors.length && errors.length > 0)
    status = "NO_DATA";
  else status = "ERROR";

  return {
    status,
    errorMessage:
      errors.length > 0
        ? errors.map((e) => `${e.seriesId}: ${e.reason}`).join(" | ")
        : null,
    observations,
    errors,
    fetchedAt,
    asOfDate,
  };
}
