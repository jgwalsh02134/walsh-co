"use server";

import { revalidatePath } from "next/cache";
import {
  refreshAttomAvm,
  type AttomAvmRefreshResult,
} from "./attom-avm-actions";
import {
  refreshAttomPropertyRecords,
  type AttomRefreshResult,
} from "./attom-actions";
import {
  refreshCensusAcsContext,
  type CensusAcsRefreshResult,
} from "./census-actions";
import {
  refreshFredMacro,
  type FredRefreshResult,
} from "./fred-actions";
import {
  refreshGoogleMapsContext,
  type GoogleMapsRefreshResult,
} from "./google-maps-actions";
import {
  refreshRentCastEstimates,
  type RentCastRefreshResult,
} from "./rentcast-actions";
import {
  refreshRentCastListings,
  type RentCastListingsRefreshResult,
} from "./rentcast-listings-actions";
import {
  refreshZillowZhviZipData,
  type ZillowZhviRefreshResult,
} from "./zillow-actions";

export type RefreshAllResult = {
  status: "ok" | "partial" | "error";
  message: string;
  totalSuccess: number;
  totalNoData: number;
  totalErrors: number;
  details: Array<{
    provider: string;
    success: number;
    noData: number;
    errors: number;
  }>;
};

export async function refreshAllMarketData(): Promise<RefreshAllResult> {
  const results = await Promise.allSettled([
    refreshRentCastEstimates(null),
    refreshRentCastListings(null),
    refreshAttomAvm(null),
    refreshAttomPropertyRecords(null),
    refreshZillowZhviZipData(null),
    refreshFredMacro(null),
    refreshCensusAcsContext(null),
    refreshGoogleMapsContext(null),
  ]);

  let totalSuccess = 0;
  let totalNoData = 0;
  let totalErrors = 0;
  const details: RefreshAllResult["details"] = [];

  const providers = [
    "RentCast (estimates)",
    "RentCast (listings)",
    "ATTOM AVM",
    "ATTOM Records",
    "Zillow ZHVI",
    "FRED",
    "Census ACS",
    "Google Maps",
  ];

  results.forEach((result, index) => {
    const provider = providers[index];

    if (result.status === "fulfilled") {
      const r = result.value as
        | RentCastRefreshResult
        | RentCastListingsRefreshResult
        | AttomAvmRefreshResult
        | AttomRefreshResult
        | ZillowZhviRefreshResult
        | FredRefreshResult
        | CensusAcsRefreshResult
        | GoogleMapsRefreshResult;

      const success = (r as any).success ?? 0;
      const noData = (r as any).noData ?? 0;
      const errors = (r as any).errors ?? 0;

      totalSuccess += success;
      totalNoData += noData;
      totalErrors += errors;

      details.push({
        provider,
        success,
        noData,
        errors,
      });
    } else {
      totalErrors += 1;
      details.push({
        provider,
        success: 0,
        noData: 0,
        errors: 1,
      });
    }
  });

  const status =
    totalErrors === 0
      ? "ok"
      : totalSuccess > 0
        ? "partial"
        : "error";

  const message =
    totalErrors === 0
      ? `${totalSuccess} sources refreshed successfully.`
      : `${totalSuccess} succeeded · ${totalNoData} no data · ${totalErrors} errored.`;

  // Revalidate the market page so fresh snapshots are shown
  revalidatePath("/market");

  return {
    status,
    message,
    totalSuccess,
    totalNoData,
    totalErrors,
    details,
  };
}
