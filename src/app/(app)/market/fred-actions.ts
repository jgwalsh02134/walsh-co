"use server";

import { revalidatePath } from "next/cache";
import { fetchFredMacroSnapshot, hasFredKey } from "@/lib/fred";
import { prisma } from "@/lib/prisma";

export type FredRefreshResult = {
  status: "ok" | "missing-key" | "error";
  message?: string;
  successSeries: number;
  totalSeries: number;
  errors: { seriesId: string; reason: string }[];
};

/**
 * Refresh FRED macro/rate context. Persists ONE MarketSourceSnapshot
 * row per refresh with provider="FRED", sourceType="MACRO_SERIES", and
 * a synthetic propertyId="portfolio" — FRED data is portfolio-wide,
 * not per-property. The full set of observations lives on `raw`.
 */
export async function refreshFredMacro(
  _prev: FredRefreshResult | null,
  _formData?: FormData
): Promise<FredRefreshResult> {
  if (!hasFredKey()) {
    return {
      status: "missing-key",
      message:
        "FRED_API_KEY is not configured on this server. Set it in the Railway service environment.",
      successSeries: 0,
      totalSeries: 0,
      errors: [],
    };
  }

  const snapshot = await fetchFredMacroSnapshot();
  const successSeries = Object.values(snapshot.observations).filter(
    (o) => o != null
  ).length;
  const totalSeries = Object.keys(snapshot.observations).length;

  try {
    await prisma.marketSourceSnapshot.create({
      data: {
        propertyId: "portfolio",
        propertyLabel: "Portfolio / Macro",
        provider: "FRED",
        sourceType: "MACRO_SERIES",
        estimatedValue: null,
        estimatedRent: null,
        valueLow: null,
        valueHigh: null,
        rentLow: null,
        rentHigh: null,
        compsCount: null,
        confidence: null,
        raw: {
          sourceName: "FRED",
          observations: snapshot.observations,
          errors: snapshot.errors,
        },
        status:
          snapshot.status === "MISSING_KEY" ? "ERROR" : snapshot.status,
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
          : "Failed to write FRED snapshot.",
      successSeries,
      totalSeries,
      errors: snapshot.errors,
    };
  }

  revalidatePath("/market");
  return {
    status: snapshot.status === "ERROR" ? "error" : "ok",
    message:
      snapshot.status === "ERROR"
        ? "All series failed."
        : snapshot.status === "NO_DATA"
        ? "No recent observations available."
        : undefined,
    successSeries,
    totalSeries,
    errors: snapshot.errors,
  };
}
