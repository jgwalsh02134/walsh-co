"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { buildEntryPayload } from "@/lib/market-manual";
import { prisma } from "@/lib/prisma";

export type ManualSaveState = {
  status: "idle" | "saved" | "error";
  message?: string;
  propertyId?: string;
};

/**
 * Upsert the manual market entry for a single property. There is at most
 * one current entry per property (propertyId is @unique), so re-saving
 * rewrites the same row instead of accumulating duplicates.
 *
 * Money/date validation lives in market-manual.ts; bad input throws and
 * is surfaced as a form error instead of crashing.
 */
export async function saveManualEntry(
  _prev: ManualSaveState | null,
  formData: FormData
): Promise<ManualSaveState> {
  let payload;
  try {
    payload = buildEntryPayload(formData);
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "Could not save entry.",
    };
  }

  try {
    await prisma.marketManualEntry.upsert({
      where: { propertyId: payload.propertyId },
      create: payload,
      update: {
        propertyLabel: payload.propertyLabel,
        estimatedValue: payload.estimatedValue,
        estimatedRent: payload.estimatedRent,
        assessedValue: payload.assessedValue,
        annualTaxes: payload.annualTaxes,
        purchaseBasis: payload.purchaseBasis,
        renovationBudget: payload.renovationBudget,
        targetRent: payload.targetRent,
        sourceName: payload.sourceName,
        sourceNote: payload.sourceNote,
        asOfDate: payload.asOfDate,
        confidence: payload.confidence,
        isPrivateReference: payload.isPrivateReference,
      },
    });
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "Database error.",
      propertyId: payload.propertyId,
    };
  }

  revalidatePath("/market");
  revalidatePath("/market/manual");
  redirect(`/market/manual?propertyId=${payload.propertyId}&saved=1`);
}
