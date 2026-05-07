"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  fetchRentCastRentalListings,
  fetchRentCastSaleListings,
  hasRentCastKey,
} from "@/lib/rentcast";
import { trackedProperties } from "@/lib/market-data";

export type RentCastListingsRefreshResult = {
  status: "ok" | "missing-key" | "error";
  message?: string;
  saleSuccess: number;
  saleEmpty: number;
  saleErrors: number;
  rentSuccess: number;
  rentEmpty: number;
  rentErrors: number;
  totalZips: number;
  failures: { zip: string; type: "sale" | "rental"; reason: string }[];
};

/**
 * Refresh sale + rental listings for every ZIP that contains a tracked
 * property. Persists snapshots:
 *   provider="RentCast" sourceType="SALE_LISTINGS"  propertyId="zip:<zip>"
 *   provider="RentCast" sourceType="RENTAL_LISTINGS" propertyId="zip:<zip>"
 *
 * Listings are area-wide (per-ZIP); they don't belong to a single
 * property record. Synthetic propertyIds keep the schema unchanged
 * while still letting us look them up cleanly.
 */
export async function refreshRentCastListings(
  _prev: RentCastListingsRefreshResult | null,
  _formData?: FormData
): Promise<RentCastListingsRefreshResult> {
  if (!hasRentCastKey()) {
    return {
      status: "missing-key",
      message:
        "RENTCAST_API_KEY is not configured on this server. Set it in the Railway service environment.",
      saleSuccess: 0,
      saleEmpty: 0,
      saleErrors: 0,
      rentSuccess: 0,
      rentEmpty: 0,
      rentErrors: 0,
      totalZips: 0,
      failures: [],
    };
  }

  // Unique ZIPs across tracked properties (skip null ZIPs).
  const zips = Array.from(
    new Set(
      trackedProperties
        .map((p) => p.zip)
        .filter((z): z is string => Boolean(z))
    )
  );

  // For each ZIP we also pass city/state for nicer provider matching.
  const zipMeta: Record<string, { city: string; state: string }> = {};
  for (const p of trackedProperties) {
    if (!p.zip) continue;
    if (!zipMeta[p.zip]) zipMeta[p.zip] = { city: p.city, state: p.state };
  }

  const result: RentCastListingsRefreshResult = {
    status: "ok",
    saleSuccess: 0,
    saleEmpty: 0,
    saleErrors: 0,
    rentSuccess: 0,
    rentEmpty: 0,
    rentErrors: 0,
    totalZips: zips.length,
    failures: [],
  };

  for (const zip of zips) {
    const meta = zipMeta[zip];
    const propertyLabel = `ZIP ${zip} · ${meta?.city ?? ""}, ${meta?.state ?? "NY"}`;
    const propertyId = `zip:${zip}`;

    // Sale listings
    let sale;
    try {
      sale = await fetchRentCastSaleListings({
        zipCode: zip,
        city: meta?.city,
        state: meta?.state,
      });
    } catch (err) {
      result.saleErrors++;
      result.failures.push({
        zip,
        type: "sale",
        reason: err instanceof Error ? err.message : "Sale fetch failed",
      });
      sale = null;
    }
    if (sale) {
      if (sale.status === "SUCCESS") result.saleSuccess++;
      else if (sale.status === "NO_DATA") result.saleEmpty++;
      else {
        result.saleErrors++;
        result.failures.push({
          zip,
          type: "sale",
          reason: sale.errorMessage ?? "Unknown error",
        });
      }
      try {
        await prisma.marketSourceSnapshot.create({
          data: {
            propertyId,
            propertyLabel,
            provider: "RentCast",
            sourceType: "SALE_LISTINGS",
            estimatedValue: null,
            estimatedRent: null,
            valueLow: null,
            valueHigh: null,
            rentLow: null,
            rentHigh: null,
            compsCount: sale.listings.length || null,
            confidence: null,
            raw: {
              sourceName: "RentCast — sale listings",
              zip,
              city: meta?.city ?? null,
              state: meta?.state ?? null,
              listings: sale.listings,
              response: sale.raw ?? null,
            },
            status:
              sale.status === "MISSING_KEY" ? "ERROR" : sale.status,
            errorMessage: sale.errorMessage,
            fetchedAt: sale.fetchedAt,
            asOfDate: sale.asOfDate,
            isPrivateReference: false,
          },
        });
      } catch (err) {
        result.saleErrors++;
        result.failures.push({
          zip,
          type: "sale",
          reason:
            err instanceof Error
              ? `Sale DB write: ${err.message}`
              : "Sale DB write failed",
        });
      }
    }

    // Rental listings
    let rent;
    try {
      rent = await fetchRentCastRentalListings({
        zipCode: zip,
        city: meta?.city,
        state: meta?.state,
      });
    } catch (err) {
      result.rentErrors++;
      result.failures.push({
        zip,
        type: "rental",
        reason: err instanceof Error ? err.message : "Rental fetch failed",
      });
      rent = null;
    }
    if (rent) {
      if (rent.status === "SUCCESS") result.rentSuccess++;
      else if (rent.status === "NO_DATA") result.rentEmpty++;
      else {
        result.rentErrors++;
        result.failures.push({
          zip,
          type: "rental",
          reason: rent.errorMessage ?? "Unknown error",
        });
      }
      try {
        await prisma.marketSourceSnapshot.create({
          data: {
            propertyId,
            propertyLabel,
            provider: "RentCast",
            sourceType: "RENTAL_LISTINGS",
            estimatedValue: null,
            estimatedRent: null,
            valueLow: null,
            valueHigh: null,
            rentLow: null,
            rentHigh: null,
            compsCount: rent.listings.length || null,
            confidence: null,
            raw: {
              sourceName: "RentCast — rental listings",
              zip,
              city: meta?.city ?? null,
              state: meta?.state ?? null,
              listings: rent.listings,
              response: rent.raw ?? null,
            },
            status:
              rent.status === "MISSING_KEY" ? "ERROR" : rent.status,
            errorMessage: rent.errorMessage,
            fetchedAt: rent.fetchedAt,
            asOfDate: rent.asOfDate,
            isPrivateReference: false,
          },
        });
      } catch (err) {
        result.rentErrors++;
        result.failures.push({
          zip,
          type: "rental",
          reason:
            err instanceof Error
              ? `Rental DB write: ${err.message}`
              : "Rental DB write failed",
        });
      }
    }
  }

  if (
    result.saleErrors > 0 &&
    result.rentErrors > 0 &&
    result.saleSuccess === 0 &&
    result.rentSuccess === 0
  ) {
    result.status = "error";
    result.message = "Listings refresh failed for all ZIPs.";
  }

  revalidatePath("/market");
  return result;
}
