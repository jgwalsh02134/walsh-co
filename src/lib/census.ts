if (typeof window !== "undefined") {
  throw new Error(
    "src/lib/census.ts is server-only and must not be imported on the client."
  );
}

const ACS_YEAR_CANDIDATES = ["2024", "2023"] as const;
const ACS_VARIABLES = [
  "NAME",
  "B01003_001E",
  "B19013_001E",
  "B25064_001E",
  "B25077_001E",
  "B25002_001E",
  "B25002_002E",
  "B25002_003E",
  "B25003_001E",
  "B25003_002E",
  "B25003_003E",
] as const;

export type CensusFetchStatus =
  | "SUCCESS"
  | "NO_DATA"
  | "ERROR"
  | "MISSING_KEY";

export type CensusAcsNormalized = {
  year: string;
  name: string | null;
  zcta: string;
  totalPopulation: number | null;
  medianHouseholdIncome: number | null;
  medianGrossRent: number | null;
  medianHomeValue: number | null;
  totalHousingUnits: number | null;
  occupiedHousingUnits: number | null;
  vacantHousingUnits: number | null;
  ownerOccupiedHousingUnits: number | null;
  renterOccupiedHousingUnits: number | null;
  ownerOccupiedPct: number | null;
  renterOccupiedPct: number | null;
  vacancyPct: number | null;
};

export type CensusAcsResult = {
  status: CensusFetchStatus;
  normalized: CensusAcsNormalized | null;
  raw: unknown;
  errorMessage: string | null;
};

export function hasCensusKey(): boolean {
  return Boolean(process.env.CENSUS_API_KEY?.trim());
}

export async function fetchCensusAcsForZcta(
  zip: string
): Promise<CensusAcsResult> {
  const key = process.env.CENSUS_API_KEY?.trim();
  if (!key) {
    return {
      status: "MISSING_KEY",
      normalized: null,
      raw: null,
      errorMessage: "CENSUS_API_KEY is not configured.",
    };
  }

  let lastError: string | null = null;
  for (const year of ACS_YEAR_CANDIDATES) {
    const result = await fetchCensusAcsForYear(zip, year, key);
    if (result.status === "SUCCESS" || result.status === "NO_DATA") {
      return result;
    }
    lastError = result.errorMessage;
  }

  return {
    status: "ERROR",
    normalized: null,
    raw: null,
    errorMessage: lastError ?? "Census ACS request failed.",
  };
}

async function fetchCensusAcsForYear(
  zip: string,
  year: string,
  key: string
): Promise<CensusAcsResult> {
  try {
    const url = new URL(`https://api.census.gov/data/${year}/acs/acs5`);
    url.searchParams.set("get", ACS_VARIABLES.join(","));
    url.searchParams.set("for", `zip code tabulation area:${zip}`);
    url.searchParams.set("key", key);

    const response = await fetch(url, { cache: "no-store" });
    const raw = (await response.json().catch(() => null)) as unknown;

    if (!response.ok) {
      return {
        status: "ERROR",
        normalized: null,
        raw,
        errorMessage: `Census ACS ${year} request failed with HTTP ${response.status}.`,
      };
    }

    if (!Array.isArray(raw) || raw.length < 2) {
      return {
        status: "NO_DATA",
        normalized: null,
        raw,
        errorMessage: `Census ACS ${year} returned no rows for ZCTA ${zip}.`,
      };
    }

    const headers = raw[0] as string[];
    const row = raw[1] as string[];
    const valueFor = (name: string): string | null => {
      const index = headers.indexOf(name);
      return index >= 0 ? row[index] ?? null : null;
    };

    const totalHousingUnits = censusNumber(valueFor("B25002_001E"));
    const vacantHousingUnits = censusNumber(valueFor("B25002_003E"));
    const occupiedHousingUnits =
      censusNumber(valueFor("B25003_001E")) ??
      censusNumber(valueFor("B25002_002E"));
    const ownerOccupiedHousingUnits = censusNumber(valueFor("B25003_002E"));
    const renterOccupiedHousingUnits = censusNumber(valueFor("B25003_003E"));

    return {
      status: "SUCCESS",
      normalized: {
        year,
        name: valueFor("NAME"),
        zcta: zip,
        totalPopulation: censusNumber(valueFor("B01003_001E")),
        medianHouseholdIncome: censusNumber(valueFor("B19013_001E")),
        medianGrossRent: censusNumber(valueFor("B25064_001E")),
        medianHomeValue: censusNumber(valueFor("B25077_001E")),
        totalHousingUnits,
        occupiedHousingUnits,
        vacantHousingUnits,
        ownerOccupiedHousingUnits,
        renterOccupiedHousingUnits,
        ownerOccupiedPct: pct(ownerOccupiedHousingUnits, occupiedHousingUnits),
        renterOccupiedPct: pct(renterOccupiedHousingUnits, occupiedHousingUnits),
        vacancyPct: pct(vacantHousingUnits, totalHousingUnits),
      },
      raw,
      errorMessage: null,
    };
  } catch (error) {
    return {
      status: "ERROR",
      normalized: null,
      raw: null,
      errorMessage:
        error instanceof Error ? error.message : "Census ACS request failed.",
    };
  }
}

function censusNumber(value: string | null): number | null {
  if (value == null) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (n <= -666_666_666) return null;
  return n;
}

function pct(numerator: number | null, denominator: number | null): number | null {
  if (numerator == null || denominator == null || denominator <= 0) return null;
  return numerator / denominator;
}
