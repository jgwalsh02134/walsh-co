import { trackedProperties } from "./market-data";

if (typeof window !== "undefined") {
  throw new Error(
    "src/lib/google-maps.ts is server-only and must not be imported on the client."
  );
}

const GEOCODE_ENDPOINT = "https://maps.googleapis.com/maps/api/geocode/json";

export type GoogleGeocodeStatus =
  | "SUCCESS"
  | "NO_DATA"
  | "ERROR"
  | "MISSING_KEY";

export type GoogleGeocodeNormalized = {
  formattedAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  placeId: string | null;
  locationType: string | null;
};

export type GoogleGeocodeResult = {
  status: GoogleGeocodeStatus;
  normalized: GoogleGeocodeNormalized | null;
  raw: unknown;
  errorMessage: string | null;
};

export type PortfolioGeocodeResult = GoogleGeocodeResult & {
  propertyId: string;
  propertyLabel: string;
  isPrivateReference: boolean;
};

export function hasGoogleMapsServerKey(): boolean {
  return Boolean(process.env.GOOGLE_MAPS_SERVER_API_KEY?.trim());
}

export async function geocodeAddress(
  address: string
): Promise<GoogleGeocodeResult> {
  const key = process.env.GOOGLE_MAPS_SERVER_API_KEY?.trim();
  if (!key) {
    return {
      status: "MISSING_KEY",
      normalized: null,
      raw: null,
      errorMessage: "GOOGLE_MAPS_SERVER_API_KEY is not configured.",
    };
  }

  try {
    const url = new URL(GEOCODE_ENDPOINT);
    url.searchParams.set("address", address);
    url.searchParams.set("key", key);

    const response = await fetch(url, { cache: "no-store" });
    const raw = (await response.json().catch(() => null)) as GoogleGeocodeApiResponse | null;

    if (!response.ok) {
      return {
        status: "ERROR",
        normalized: null,
        raw,
        errorMessage: `Google Geocoding request failed with HTTP ${response.status}.`,
      };
    }

    if (!raw || raw.status === "ZERO_RESULTS") {
      return {
        status: "NO_DATA",
        normalized: null,
        raw,
        errorMessage: raw?.error_message ?? null,
      };
    }

    if (raw.status !== "OK") {
      return {
        status: "ERROR",
        normalized: null,
        raw,
        errorMessage:
          raw.error_message ?? `Google Geocoding returned ${raw.status}.`,
      };
    }

    const first = raw.results?.[0];
    if (!first?.geometry?.location) {
      return {
        status: "NO_DATA",
        normalized: null,
        raw,
        errorMessage: "Google Geocoding returned no usable location.",
      };
    }

    return {
      status: "SUCCESS",
      normalized: {
        formattedAddress: first.formatted_address ?? null,
        latitude: finiteNumber(first.geometry.location.lat),
        longitude: finiteNumber(first.geometry.location.lng),
        placeId: first.place_id ?? null,
        locationType: first.geometry.location_type ?? null,
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
        error instanceof Error ? error.message : "Google Geocoding failed.",
    };
  }
}

export async function geocodePortfolioProperties(): Promise<
  PortfolioGeocodeResult[]
> {
  const results: PortfolioGeocodeResult[] = [];
  for (const property of trackedProperties) {
    const query = [
      property.address,
      property.city,
      property.state,
      property.zip,
    ]
      .filter(Boolean)
      .join(", ");
    const result = await geocodeAddress(query);
    results.push({
      ...result,
      propertyId: property.id,
      propertyLabel: property.address,
      isPrivateReference: property.kind === "private",
    });
  }
  return results;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

type GoogleGeocodeApiResponse = {
  status: string;
  error_message?: string;
  results?: Array<{
    formatted_address?: string;
    place_id?: string;
    geometry?: {
      location?: {
        lat?: number;
        lng?: number;
      };
      location_type?: string;
    };
  }>;
};
