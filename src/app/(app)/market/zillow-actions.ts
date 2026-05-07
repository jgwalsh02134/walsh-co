"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  fetchZhviZipSnapshot,
  hasZillowZhviUrl,
  ZILLOW_TARGET_ZIPS,
} from "@/lib/zillow-research";

export type ZillowZhviRefreshResult = {
  status: "ok" | "missing-url" | "error";
  message?: string;
  zipsResolved: number;
  totalZips: number;
};

/**
 * Refresh Zillow ZHVI ZIP trend data. Persists ONE MarketSourceSnapshot
 * row per refresh with provider="ZILLOW_RESEARCH",
 * sourceType="HOME_VALUE_INDEX", and propertyId="portfolio" — ZHVI is
 * portfolio-wide trend context, not a per-property AVM.
 *
 * No client-side fetch. The CSV is downloaded and parsed entirely on
 * the server inside fetchZhviZipSnapshot().
 */
export async function refreshZillowZhviZipData(
  _prev: ZillowZhviRefreshResult | null,
  _formData?: FormData
): Promise<ZillowZhviRefreshResult> {
  if (!hasZillowZhviUrl()) {
    return {
      status: "missing-url",
      message:
        "ZILLOW_ZHVI_ZIP_CSV_URL is not configured on this server. Set it in the Railway service environment.",
      zipsResolved: 0,
      totalZips: ZILLOW_TARGET_ZIPS.length,
    };
  }

  const snapshot = await fetchZhviZipSnapshot();
  const zipsResolved = Object.values(snapshot.series).filter(
    (s) => s?.latestValue != null
  ).length;

  try {
    await prisma.marketSourceSnapshot.create({
      data: {
        propertyId: "portfolio",
        propertyLabel: "ZIP Home Value Trends",
        provider: "ZILLOW_RESEARCH",
        sourceType: "HOME_VALUE_INDEX",
        estimatedValue: null,
        estimatedRent: null,
        valueLow: null,
        valueHigh: null,
        rentLow: null,
        rentHigh: null,
        compsCount: null,
        confidence: null,
        raw: {
          sourceName: "Zillow Research — ZHVI",
          targetZips: ZILLOW_TARGET_ZIPS,
          series: snapshot.series,
        },
        status:
          snapshot.status === "MISSING_URL" ? "ERROR" : snapshot.status,
        errorMessage: snapshot.errorMessage,
        fetchedAt: snapshot.fetchedAt,
        asOfDate: snapshot.asOfDate,
        isPrivateReference: false,
      },
    });
  } catch (err) {
    return {
      status: "error",
      message:
        err instanceof Error
          ? err.message
          : "Failed to write Zillow snapshot.",
      zipsResolved,
      totalZips: ZILLOW_TARGET_ZIPS.length,
    };
  }

  revalidatePath("/market");
  return {
    status: snapshot.status === "ERROR" ? "error" : "ok",
    message:
      snapshot.status === "ERROR"
        ? snapshot.errorMessage ?? "Refresh failed."
        : snapshot.status === "NO_DATA"
        ? snapshot.errorMessage ?? "No matching ZIPs found."
        : undefined,
    zipsResolved,
    totalZips: ZILLOW_TARGET_ZIPS.length,
  };
}
