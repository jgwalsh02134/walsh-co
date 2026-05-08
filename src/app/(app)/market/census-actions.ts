"use server";

import { revalidatePath } from "next/cache";
import { fetchCensusAcsForZcta, hasCensusKey } from "@/lib/census";
import { trackedProperties } from "@/lib/market-data";
import { prisma } from "@/lib/prisma";

export type CensusAcsRefreshResult = {
  status: "ok" | "missing-key" | "error";
  message?: string;
  successCount: number;
  totalCount: number;
  zips: string[];
};

/**
 * Refresh Census ACS demographics for the ZCTAs covering tracked
 * properties. Persists one MarketSourceSnapshot per ZCTA with
 * provider="CENSUS_ACS", sourceType="DEMOGRAPHICS", and a synthetic
 * propertyId="zcta-<zip>" — Census ACS is per-ZIP context, not
 * per-property. Demographic values live on `raw`.
 */
export async function refreshCensusAcsContext(
  _prev: CensusAcsRefreshResult | null,
  _formData?: FormData
): Promise<CensusAcsRefreshResult> {
  const zips = Array.from(
    new Set(
      trackedProperties
        .map((p) => p.zip)
        .filter((z): z is string => typeof z === "string" && z.length > 0)
    )
  );

  if (!hasCensusKey()) {
    return {
      status: "missing-key",
      message:
        "CENSUS_API_KEY is not configured on this server. Set it in the Railway service environment.",
      successCount: 0,
      totalCount: zips.length,
      zips,
    };
  }

  const results = await Promise.all(
    zips.map(async (zip) => ({ zip, result: await fetchCensusAcsForZcta(zip) }))
  );
  const successCount = results.filter(
    (r) => r.result.status === "SUCCESS"
  ).length;

  try {
    const fetchedAt = new Date();
    await prisma.$transaction(
      results.map(({ zip, result }) =>
        prisma.marketSourceSnapshot.create({
          data: {
            propertyId: `zcta-${zip}`,
            propertyLabel: `ZCTA ${zip}`,
            provider: "CENSUS_ACS",
            sourceType: "DEMOGRAPHICS",
            estimatedValue: null,
            estimatedRent: null,
            valueLow: null,
            valueHigh: null,
            rentLow: null,
            rentHigh: null,
            compsCount: null,
            confidence: null,
            raw: {
              sourceName: "U.S. Census ACS 5-year",
              zcta: zip,
              normalized: result.normalized,
              api: (result.raw as object | null) ?? null,
            },
            status:
              result.status === "SUCCESS"
                ? "SUCCESS"
                : result.status === "NO_DATA"
                ? "NO_DATA"
                : "ERROR",
            errorMessage: result.errorMessage,
            fetchedAt,
            asOfDate: null,
            isPrivateReference: false,
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
          : "Failed to write Census ACS snapshots.",
      successCount,
      totalCount: zips.length,
      zips,
    };
  }

  revalidatePath("/market");
  return {
    status: successCount === 0 && zips.length > 0 ? "error" : "ok",
    message:
      successCount === 0 && zips.length > 0
        ? "No Census ACS data resolved."
        : undefined,
    successCount,
    totalCount: zips.length,
    zips,
  };
}
