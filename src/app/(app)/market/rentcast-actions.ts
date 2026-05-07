"use server";

import { revalidatePath } from "next/cache";
import { trackedProperties } from "@/lib/market-data";
import { prisma } from "@/lib/prisma";
import {
  fetchRentCastSnapshotForProperty,
  hasRentCastKey,
  type RentCastSnapshot,
} from "@/lib/rentcast";

export type RentCastRefreshResult = {
  status: "ok" | "missing-key" | "error";
  message?: string;
  success: number;
  noData: number;
  errors: number;
  total: number;
  failures: { propertyId: string; address: string; reason: string }[];
};

/**
 * Refresh RentCast estimates for every tracked property. One row per
 * property per refresh is inserted into MarketSourceSnapshot — history
 * is preserved; "latest snapshot" is read by fetchedAt desc.
 *
 * Per-property failures are tolerated: a 4xx on one address won't block
 * the others. Counts are returned to the client via useActionState so
 * the UI can show "3 succeeded, 1 errored".
 */
export async function refreshRentCastEstimates(
  _prev: RentCastRefreshResult | null,
  _formData?: FormData
): Promise<RentCastRefreshResult> {
  if (!hasRentCastKey()) {
    return {
      status: "missing-key",
      message:
        "RENTCAST_API_KEY is not configured on this server. Set it in the Railway service environment.",
      success: 0,
      noData: 0,
      errors: 0,
      total: 0,
      failures: [],
    };
  }

  const result: RentCastRefreshResult = {
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
    let snapshot: RentCastSnapshot;
    try {
      snapshot = await fetchRentCastSnapshotForProperty(property);
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

    if (
      snapshot.status === "ERROR" ||
      snapshot.status === "MISSING_KEY"
    ) {
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
          provider: "RentCast",
          sourceType: "SNAPSHOT",
          estimatedValue:
            snapshot.estimatedValue != null
              ? snapshot.estimatedValue.toString()
              : null,
          estimatedRent:
            snapshot.estimatedRent != null
              ? snapshot.estimatedRent.toString()
              : null,
          valueLow:
            snapshot.valueLow != null ? snapshot.valueLow.toString() : null,
          valueHigh:
            snapshot.valueHigh != null
              ? snapshot.valueHigh.toString()
              : null,
          rentLow:
            snapshot.rentLow != null ? snapshot.rentLow.toString() : null,
          rentHigh:
            snapshot.rentHigh != null
              ? snapshot.rentHigh.toString()
              : null,
          compsCount: snapshot.compsCount,
          confidence: null,
          // Prisma Json field accepts plain JS values; null is allowed.
          raw: (snapshot.raw as object | null) ?? undefined,
          status: snapshot.status === "MISSING_KEY" ? "ERROR" : snapshot.status,
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
    result.message = "Refresh completed with no successful estimates.";
  }

  revalidatePath("/market");
  return result;
}
