"use server";

import { revalidatePath } from "next/cache";
import {
  geocodePortfolioProperties,
  hasGoogleMapsServerKey,
} from "@/lib/google-maps";
import { prisma } from "@/lib/prisma";

export type GoogleMapsRefreshResult = {
  status: "ok" | "missing-key" | "error";
  message?: string;
  successCount: number;
  totalCount: number;
};

/**
 * Refresh Google Maps geocode context for tracked properties. Persists
 * one MarketSourceSnapshot row per property with provider="GOOGLE_MAPS"
 * and sourceType="GEOCODE". Context only — no valuation fields are
 * populated. Lat/lng + formatted address live on `raw`.
 */
export async function refreshGoogleMapsContext(
  _prev: GoogleMapsRefreshResult | null,
  _formData?: FormData
): Promise<GoogleMapsRefreshResult> {
  if (!hasGoogleMapsServerKey()) {
    return {
      status: "missing-key",
      message:
        "GOOGLE_MAPS_SERVER_API_KEY is not configured on this server. Set it in the Railway service environment.",
      successCount: 0,
      totalCount: 0,
    };
  }

  const results = await geocodePortfolioProperties();
  const successCount = results.filter((r) => r.status === "SUCCESS").length;

  try {
    const fetchedAt = new Date();
    await prisma.$transaction(
      results.map((r) =>
        prisma.marketSourceSnapshot.create({
          data: {
            propertyId: r.propertyId,
            propertyLabel: r.propertyLabel,
            provider: "GOOGLE_MAPS",
            sourceType: "GEOCODE",
            estimatedValue: null,
            estimatedRent: null,
            valueLow: null,
            valueHigh: null,
            rentLow: null,
            rentHigh: null,
            compsCount: null,
            confidence: null,
            raw: {
              sourceName: "Google Maps Geocoding",
              normalized: r.normalized,
              api: (r.raw as object | null) ?? null,
            },
            status: r.status === "SUCCESS" ? "SUCCESS" : r.status === "NO_DATA" ? "NO_DATA" : "ERROR",
            errorMessage: r.errorMessage,
            fetchedAt,
            asOfDate: null,
            isPrivateReference: r.isPrivateReference,
          },
        })
      )
    );
  } catch (err) {
    return {
      status: "error",
      message:
        err instanceof Error
          ? err.message
          : "Failed to write Google Maps snapshots.",
      successCount,
      totalCount: results.length,
    };
  }

  revalidatePath("/market");
  return {
    status: successCount === 0 && results.length > 0 ? "error" : "ok",
    message:
      successCount === 0 && results.length > 0
        ? "No properties were geocoded successfully."
        : undefined,
    successCount,
    totalCount: results.length,
  };
}
