"use server";

import { revalidatePath } from "next/cache";
import { fetchAttomPropertyRecord, hasAttomKey } from "@/lib/attom";
import { trackedProperties } from "@/lib/market-data";
import { prisma } from "@/lib/prisma";

export type AttomRefreshResult = {
  status: "ok" | "missing-key" | "error";
  message?: string;
  success: number;
  noData: number;
  errors: number;
  total: number;
  failures: { propertyId: string; address: string; reason: string }[];
};

/**
 * Refresh ATTOM property records for every tracked property. Persists
 * one MarketSourceSnapshot row per property per refresh with
 * provider="ATTOM" and sourceType="PROPERTY_RECORD". The extracted
 * facts + the raw expandedprofile JSON live on `raw`. Per-property
 * failures are tolerated.
 */
export async function refreshAttomPropertyRecords(
  _prev: AttomRefreshResult | null,
  _formData?: FormData
): Promise<AttomRefreshResult> {
  if (!hasAttomKey()) {
    return {
      status: "missing-key",
      message:
        "ATTOM_API_KEY is not configured on this server. Set it in the Railway service environment.",
      success: 0,
      noData: 0,
      errors: 0,
      total: 0,
      failures: [],
    };
  }

  const result: AttomRefreshResult = {
    status: "ok",
    success: 0,
    noData: 0,
    errors: 0,
    total: trackedProperties.length,
    failures: [],
  };

  for (const property of trackedProperties) {
    const propertyLabel = `${property.address}, ${property.city}${
      property.zip ? ` ${property.zip}` : ""
    }`;

    let snapshot;
    try {
      snapshot = await fetchAttomPropertyRecord(property);
    } catch (err) {
      const reason = err instanceof Error ? err.message : "Unknown error";
      result.errors++;
      result.failures.push({
        propertyId: property.id,
        address: propertyLabel,
        reason,
      });
      continue;
    }

    if (snapshot.status === "SUCCESS") result.success++;
    else if (snapshot.status === "NO_DATA") result.noData++;
    else result.errors++;

    if (snapshot.status === "ERROR" || snapshot.status === "MISSING_KEY") {
      result.failures.push({
        propertyId: property.id,
        address: propertyLabel,
        reason: snapshot.errorMessage ?? "Unknown error",
      });
    }

    try {
      await prisma.marketSourceSnapshot.create({
        data: {
          propertyId: property.id,
          propertyLabel,
          provider: "ATTOM",
          sourceType: "PROPERTY_RECORD",
          // ATTOM is not the AVM. Leave value/rent columns null and
          // store everything in `raw`. Tax/assessment values are
          // surfaced from raw.facts at render time.
          estimatedValue: null,
          estimatedRent: null,
          valueLow: null,
          valueHigh: null,
          rentLow: null,
          rentHigh: null,
          compsCount: null,
          confidence: null,
          raw: {
            sourceName: "ATTOM",
            facts: snapshot.facts ?? null,
            response: snapshot.raw ?? null,
          },
          status:
            snapshot.status === "MISSING_KEY" ? "ERROR" : snapshot.status,
          errorMessage: snapshot.errorMessage,
          fetchedAt: snapshot.fetchedAt,
          asOfDate: snapshot.asOfDate,
          isPrivateReference: property.kind === "private",
        },
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : "DB write failed";
      result.errors++;
      result.failures.push({
        propertyId: property.id,
        address: propertyLabel,
        reason,
      });
    }
  }

  if (result.errors > 0 && result.success === 0) {
    result.status = "error";
    result.message = "Refresh completed with no successful property records.";
  }

  revalidatePath("/market");
  return result;
}
