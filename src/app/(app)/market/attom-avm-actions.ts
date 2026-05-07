"use server";

import { revalidatePath } from "next/cache";
import {
  fetchAttomAvm,
  fetchAttomAvmHistory,
  hasAttomKey,
} from "@/lib/attom";
import { trackedProperties } from "@/lib/market-data";
import { prisma } from "@/lib/prisma";

export type AttomAvmRefreshResult = {
  status: "ok" | "missing-key" | "error";
  message?: string;
  avmSuccess: number;
  avmUnavailable: number;
  avmErrors: number;
  historySuccess: number;
  historyUnavailable: number;
  historyErrors: number;
  total: number;
  failures: { propertyId: string; address: string; reason: string }[];
};

/**
 * Refresh ATTOM AVM (current value) and AVM history for every tracked
 * property. Persists separate MarketSourceSnapshot rows per provider
 * resource per property:
 *   provider="ATTOM" sourceType="AVM_VALUE"
 *   provider="ATTOM" sourceType="AVM_HISTORY"
 *
 * Endpoints sometimes refuse based on the plan/key; that case is
 * captured as `unavailableForPlan` and surfaced to the UI as a clear
 * notice (not a generic error).
 */
export async function refreshAttomAvm(
  _prev: AttomAvmRefreshResult | null,
  _formData?: FormData
): Promise<AttomAvmRefreshResult> {
  if (!hasAttomKey()) {
    return {
      status: "missing-key",
      message:
        "ATTOM_API_KEY is not configured on this server. Set it in the Railway service environment.",
      avmSuccess: 0,
      avmUnavailable: 0,
      avmErrors: 0,
      historySuccess: 0,
      historyUnavailable: 0,
      historyErrors: 0,
      total: 0,
      failures: [],
    };
  }

  const result: AttomAvmRefreshResult = {
    status: "ok",
    avmSuccess: 0,
    avmUnavailable: 0,
    avmErrors: 0,
    historySuccess: 0,
    historyUnavailable: 0,
    historyErrors: 0,
    total: trackedProperties.length,
    failures: [],
  };

  for (const property of trackedProperties) {
    const propertyLabel = `${property.address}, ${property.city}${
      property.zip ? ` ${property.zip}` : ""
    }`;

    // ----- AVM (current) -----
    let avmSnap;
    try {
      avmSnap = await fetchAttomAvm(property);
    } catch (err) {
      result.avmErrors++;
      result.failures.push({
        propertyId: property.id,
        address: propertyLabel,
        reason: err instanceof Error ? err.message : "AVM fetch failed",
      });
      avmSnap = null;
    }
    if (avmSnap) {
      if (avmSnap.unavailableForPlan) {
        result.avmUnavailable++;
      } else if (avmSnap.status === "SUCCESS") {
        result.avmSuccess++;
      } else if (avmSnap.status === "NO_DATA") {
        // count as success path; nothing to flag
      } else {
        result.avmErrors++;
        result.failures.push({
          propertyId: property.id,
          address: propertyLabel,
          reason: `AVM: ${avmSnap.errorMessage ?? "Unknown error"}`,
        });
      }
      try {
        await prisma.marketSourceSnapshot.create({
          data: {
            propertyId: property.id,
            propertyLabel,
            provider: "ATTOM",
            sourceType: "AVM_VALUE",
            estimatedValue:
              avmSnap.avm?.estimatedValue != null
                ? avmSnap.avm.estimatedValue.toString()
                : null,
            estimatedRent: null,
            valueLow:
              avmSnap.avm?.valueLow != null
                ? avmSnap.avm.valueLow.toString()
                : null,
            valueHigh:
              avmSnap.avm?.valueHigh != null
                ? avmSnap.avm.valueHigh.toString()
                : null,
            rentLow: null,
            rentHigh: null,
            compsCount: null,
            confidence:
              avmSnap.avm?.confidence != null
                ? String(avmSnap.avm.confidence)
                : null,
            raw: {
              sourceName: "ATTOM AVM",
              avm: avmSnap.avm ?? null,
              unavailableForPlan: avmSnap.unavailableForPlan,
              response: avmSnap.raw ?? null,
            },
            status:
              avmSnap.status === "MISSING_KEY" ? "ERROR" : avmSnap.status,
            errorMessage: avmSnap.unavailableForPlan
              ? "ATTOM AVM unavailable for current plan/key."
              : avmSnap.errorMessage,
            fetchedAt: avmSnap.fetchedAt,
            asOfDate: avmSnap.asOfDate,
            isPrivateReference: property.kind === "private",
          },
        });
      } catch (err) {
        result.avmErrors++;
        result.failures.push({
          propertyId: property.id,
          address: propertyLabel,
          reason:
            err instanceof Error
              ? `AVM DB write: ${err.message}`
              : "AVM DB write failed",
        });
      }
    }

    // ----- AVM history -----
    let historySnap;
    try {
      historySnap = await fetchAttomAvmHistory(property);
    } catch (err) {
      result.historyErrors++;
      result.failures.push({
        propertyId: property.id,
        address: propertyLabel,
        reason:
          err instanceof Error ? err.message : "AVM history fetch failed",
      });
      historySnap = null;
    }
    if (historySnap) {
      if (historySnap.unavailableForPlan) {
        result.historyUnavailable++;
      } else if (historySnap.status === "SUCCESS") {
        result.historySuccess++;
      } else if (historySnap.status === "NO_DATA") {
        // no flag
      } else {
        result.historyErrors++;
        result.failures.push({
          propertyId: property.id,
          address: propertyLabel,
          reason: `History: ${historySnap.errorMessage ?? "Unknown error"}`,
        });
      }
      try {
        await prisma.marketSourceSnapshot.create({
          data: {
            propertyId: property.id,
            propertyLabel,
            provider: "ATTOM",
            sourceType: "AVM_HISTORY",
            estimatedValue: null,
            estimatedRent: null,
            valueLow: null,
            valueHigh: null,
            rentLow: null,
            rentHigh: null,
            compsCount: historySnap.history.length || null,
            confidence: null,
            raw: {
              sourceName: "ATTOM AVM history",
              history: historySnap.history,
              unavailableForPlan: historySnap.unavailableForPlan,
              response: historySnap.raw ?? null,
            },
            status:
              historySnap.status === "MISSING_KEY"
                ? "ERROR"
                : historySnap.status,
            errorMessage: historySnap.unavailableForPlan
              ? "ATTOM AVM history unavailable for current plan/key."
              : historySnap.errorMessage,
            fetchedAt: historySnap.fetchedAt,
            asOfDate: historySnap.asOfDate,
            isPrivateReference: property.kind === "private",
          },
        });
      } catch (err) {
        result.historyErrors++;
        result.failures.push({
          propertyId: property.id,
          address: propertyLabel,
          reason:
            err instanceof Error
              ? `History DB write: ${err.message}`
              : "History DB write failed",
        });
      }
    }
  }

  if (result.avmErrors > 0 && result.avmSuccess === 0 && result.avmUnavailable === 0) {
    result.status = "error";
    result.message = "AVM refresh failed for all properties.";
  }

  revalidatePath("/market");
  return result;
}
