/**
 * Zillow Research — server-only client for the ZHVI (Zillow Home Value
 * Index) by ZIP CSV file.
 *
 * Source URL is configured via env var ZILLOW_ZHVI_ZIP_CSV_URL. The CSV
 * is fetched directly (Zillow publishes the file at a stable bucket URL)
 * and parsed without any external dependency.
 *
 * Used as TREND CONTEXT only — never as a per-property AVM. RentCast
 * remains the value source for individual properties.
 *
 * IMPORTANT: This module reads process.env.ZILLOW_ZHVI_ZIP_CSV_URL and
 * must never be imported by a client component. The runtime guard below
 * throws if the module ends up in a browser bundle.
 */

if (typeof window !== "undefined") {
  throw new Error(
    "src/lib/zillow-research.ts is server-only and must not be imported on the client."
  );
}

// ---------- Types ----------

export type ZillowFetchStatus = "SUCCESS" | "NO_DATA" | "ERROR" | "MISSING_URL";

/** ZIP codes we care about for the current portfolio. */
export const ZILLOW_TARGET_ZIPS = ["12211", "12204"] as const;
export type ZillowTargetZip = (typeof ZILLOW_TARGET_ZIPS)[number];

export type ZhviSeries = {
  zip: ZillowTargetZip;
  /** Display name from CSV `RegionName` column. */
  regionName: string;
  /** State code (e.g. "NY"). */
  state: string | null;
  /** Metro / city when present in the CSV. */
  metro: string | null;
  /** Latest non-empty observation. */
  latestValue: number | null;
  latestDate: string | null;
  /** Year-over-year change as a decimal (0.052 = +5.2%). */
  yoyChange: number | null;
  /** 3-year change as a decimal. */
  threeYearChange: number | null;
  /** 5-year change as a decimal. */
  fiveYearChange: number | null;
};

export type ZhviSnapshot = {
  status: ZillowFetchStatus;
  errorMessage: string | null;
  series: Record<ZillowTargetZip, ZhviSeries | null>;
  fetchedAt: Date;
  asOfDate: Date | null;
};

// ---------- Public guards ----------

export function hasZillowZhviUrl(): boolean {
  return Boolean(process.env.ZILLOW_ZHVI_ZIP_CSV_URL?.trim());
}

// ---------- CSV parser ----------

/**
 * Tiny RFC 4180-ish CSV parser. Handles quoted fields, escaped quotes,
 * and CRLF/LF line endings. Doesn't try to be smart about anything else.
 * Sufficient for the ZHVI CSV which uses simple numeric values.
 */
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  const flushField = () => {
    current.push(field);
    field = "";
  };
  const flushRow = () => {
    flushField();
    rows.push(current);
    current = [];
  };

  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ",") {
      flushField();
      i++;
      continue;
    }
    if (ch === "\n") {
      flushRow();
      i++;
      continue;
    }
    if (ch === "\r") {
      if (text[i + 1] === "\n") i++;
      flushRow();
      i++;
      continue;
    }
    field += ch;
    i++;
  }
  if (field.length > 0 || current.length > 0) flushRow();

  return rows.filter((r) => r.some((c) => c.trim().length > 0));
}

// ---------- ZHVI extraction ----------

function asNumber(v: string | undefined | null): number | null {
  if (v == null) return null;
  const t = v.trim();
  if (!t) return null;
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

/**
 * The ZHVI ZIP CSV is wide-format: each row is a ZIP, the first ~6
 * columns are metadata (RegionID, SizeRank, RegionName, RegionType,
 * StateName, State, City, Metro, CountyName), and the remaining columns
 * are per-month observations with ISO-style date headers (e.g. "2024-04-30").
 *
 * We grab the latest non-empty value per ZIP plus 1y/3y/5y trailing
 * comparisons by walking back through the date columns.
 */
function isDateHeader(h: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(h.trim());
}

function findColumn(headers: string[], names: string[]): number {
  for (const name of names) {
    const idx = headers.findIndex((h) => h.trim() === name);
    if (idx !== -1) return idx;
  }
  return -1;
}

function extractZhviForZip(
  rows: string[][],
  zip: string
): ZhviSeries | null {
  if (rows.length < 2) return null;
  const [headers, ...dataRows] = rows;

  const regionNameIdx = findColumn(headers, ["RegionName"]);
  const stateIdx = findColumn(headers, ["State", "StateName"]);
  const metroIdx = findColumn(headers, ["Metro", "MetroName"]);
  if (regionNameIdx === -1) return null;

  // Date columns (assumed sorted ascending in the source CSV — we still
  // sort by header just to be safe).
  const dateColumns = headers
    .map((h, idx) => ({ idx, header: h.trim() }))
    .filter((c) => isDateHeader(c.header))
    .sort((a, b) => a.header.localeCompare(b.header));

  if (dateColumns.length === 0) return null;

  // Find the row where RegionName === zip. RegionName in the ZIP CSV is
  // the ZIP itself; some files store it as a number with leading zeros
  // stripped — pad to 5 chars before comparing.
  const target = zip;
  const row = dataRows.find((r) => {
    const rn = r[regionNameIdx]?.trim() ?? "";
    return rn === target || rn.padStart(5, "0") === target;
  });
  if (!row) return null;

  // Walk backwards from the most recent date and find the first
  // non-empty observation.
  let latestValue: number | null = null;
  let latestDate: string | null = null;
  let latestColIdx = -1;
  for (let k = dateColumns.length - 1; k >= 0; k--) {
    const v = asNumber(row[dateColumns[k].idx]);
    if (v != null) {
      latestValue = v;
      latestDate = dateColumns[k].header;
      latestColIdx = k;
      break;
    }
  }

  if (latestValue == null || latestDate == null) {
    return {
      zip: zip as ZillowTargetZip,
      regionName: row[regionNameIdx]?.trim() ?? zip,
      state: stateIdx !== -1 ? row[stateIdx]?.trim() || null : null,
      metro: metroIdx !== -1 ? row[metroIdx]?.trim() || null : null,
      latestValue: null,
      latestDate: null,
      yoyChange: null,
      threeYearChange: null,
      fiveYearChange: null,
    };
  }

  // ZHVI is monthly; offsets are simple column-index walks.
  const valueAtOffset = (offsetMonths: number): number | null => {
    const idx = latestColIdx - offsetMonths;
    if (idx < 0) return null;
    return asNumber(row[dateColumns[idx].idx]);
  };

  const oneYearAgo = valueAtOffset(12);
  const threeYearAgo = valueAtOffset(36);
  const fiveYearAgo = valueAtOffset(60);

  const pctChange = (older: number | null): number | null =>
    older != null && older !== 0
      ? (latestValue! - older) / older
      : null;

  return {
    zip: zip as ZillowTargetZip,
    regionName: row[regionNameIdx]?.trim() ?? zip,
    state: stateIdx !== -1 ? row[stateIdx]?.trim() || null : null,
    metro: metroIdx !== -1 ? row[metroIdx]?.trim() || null : null,
    latestValue,
    latestDate,
    yoyChange: pctChange(oneYearAgo),
    threeYearChange: pctChange(threeYearAgo),
    fiveYearChange: pctChange(fiveYearAgo),
  };
}

// ---------- Public API ----------

function emptySeries(): Record<ZillowTargetZip, ZhviSeries | null> {
  return ZILLOW_TARGET_ZIPS.reduce(
    (acc, zip) => {
      acc[zip] = null;
      return acc;
    },
    {} as Record<ZillowTargetZip, ZhviSeries | null>
  );
}

export async function fetchZhviZipSnapshot(): Promise<ZhviSnapshot> {
  const fetchedAt = new Date();
  const url = process.env.ZILLOW_ZHVI_ZIP_CSV_URL?.trim();

  if (!url) {
    return {
      status: "MISSING_URL",
      errorMessage: "ZILLOW_ZHVI_ZIP_CSV_URL missing",
      series: emptySeries(),
      fetchedAt,
      asOfDate: null,
    };
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      headers: { Accept: "text/csv" },
      cache: "no-store",
    });
  } catch (err) {
    return {
      status: "ERROR",
      errorMessage: err instanceof Error ? err.message : "Network error",
      series: emptySeries(),
      fetchedAt,
      asOfDate: null,
    };
  }

  if (!res.ok) {
    let detail = "";
    try {
      detail = (await res.text()).slice(0, 200);
    } catch {
      /* ignore */
    }
    return {
      status: "ERROR",
      errorMessage: `HTTP ${res.status}${detail ? ` — ${detail}` : ""}`,
      series: emptySeries(),
      fetchedAt,
      asOfDate: null,
    };
  }

  let text: string;
  try {
    text = await res.text();
  } catch (err) {
    return {
      status: "ERROR",
      errorMessage: err instanceof Error ? err.message : "Could not read body",
      series: emptySeries(),
      fetchedAt,
      asOfDate: null,
    };
  }

  let rows: string[][];
  try {
    rows = parseCSV(text);
  } catch (err) {
    return {
      status: "ERROR",
      errorMessage: err instanceof Error ? err.message : "CSV parse error",
      series: emptySeries(),
      fetchedAt,
      asOfDate: null,
    };
  }

  if (rows.length < 2) {
    return {
      status: "NO_DATA",
      errorMessage: "Empty or header-only CSV",
      series: emptySeries(),
      fetchedAt,
      asOfDate: null,
    };
  }

  const series = emptySeries();
  let foundAny = false;
  let latestDate: Date | null = null;
  for (const zip of ZILLOW_TARGET_ZIPS) {
    const extracted = extractZhviForZip(rows, zip);
    series[zip] = extracted;
    if (extracted?.latestValue != null) foundAny = true;
    if (extracted?.latestDate) {
      const d = new Date(extracted.latestDate);
      if (
        !Number.isNaN(d.getTime()) &&
        (latestDate === null || d > latestDate)
      ) {
        latestDate = d;
      }
    }
  }

  return {
    status: foundAny ? "SUCCESS" : "NO_DATA",
    errorMessage: foundAny ? null : "No matching ZIPs found in CSV",
    series,
    fetchedAt,
    asOfDate: latestDate,
  };
}
