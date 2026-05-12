"use server";

/**
 * Server actions for Google Drive workspace setup.
 *
 * Drafts/folders are created only when the user clicks the button —
 * there is no automatic invocation, no scheduled job, and no API call
 * during page render. Tokens stay in the encrypted httpOnly session
 * cookie; this action returns only the resulting folder map (id +
 * webViewLink), never the token.
 */

import { revalidatePath } from "next/cache";
import { extractTextFromPdf, hasAdobePdfServices } from "@/lib/adobe-pdf";
import {
  defaultAiReviewProvider,
  isAiReviewProviderConfigured,
  reviewExtractedText,
  type AiReviewProvider,
} from "@/lib/ai-document-review";
import {
  createDriveWorkspaceFolders,
  downloadDriveFileBytes,
  uploadWorkspaceDocument,
  UPLOAD_ALLOWED_MIME_TYPES,
  UPLOAD_MAX_SIZE_BYTES,
  type CreateFoldersResult,
  type UploadAllowedMimeType,
  type UploadDocumentResult,
} from "@/lib/google-drive";
import { trackedProperties } from "@/lib/market-data";
import { prisma } from "@/lib/prisma";

export type CreateDriveWorkspaceState = CreateFoldersResult | null;

/**
 * Wraps `createDriveWorkspaceFolders` for use as a React `useActionState`
 * target. Always passes the current tracked-property addresses so the
 * per-property subfolders match the workspace.
 */
export async function createDriveWorkspaceFoldersAction(
  _prev: CreateDriveWorkspaceState,
  _formData: FormData
): Promise<CreateFoldersResult> {
  const propertyAddresses = trackedProperties.map((p) => p.address);
  const result = await createDriveWorkspaceFolders({ propertyAddresses });
  if (result.ok) {
    revalidatePath("/documents");
    revalidatePath("/settings");
  }
  return result;
}

// =============================================================
// Document upload action
// =============================================================

/**
 * Allowlisted document categories accepted by the upload form. Mirrors
 * `DocumentCategory` in `src/lib/mock-data.ts`. Kept here as a literal
 * union so the server action can validate without importing the mock
 * data file at action time.
 */
const ALLOWED_CATEGORIES = [
  "inspection",
  "contractor_bid",
  "survey",
  "deed_title",
  "tax_assessment",
  "permit",
  "insurance",
  "lease_rental",
  "receipt_invoice",
  "photo_media",
  "other",
] as const;

type AllowedCategory = (typeof ALLOWED_CATEGORIES)[number];

function isAllowedCategory(value: string): value is AllowedCategory {
  return (ALLOWED_CATEGORIES as readonly string[]).includes(value);
}

function isAllowedMimeType(value: string): value is UploadAllowedMimeType {
  return (UPLOAD_ALLOWED_MIME_TYPES as readonly string[]).includes(value);
}

export type UploadDriveDocumentState = UploadDocumentResult | null;

/**
 * Server action that uploads a single file to the workspace Drive
 * folder structure and records its metadata. User-click only — invoked
 * via `useActionState` from the upload form.
 *
 * No Adobe extraction is performed; the recorded `extractionStatus`
 * stays "not_started" until a future explicit action.
 */
export async function uploadDriveDocumentAction(
  _prev: UploadDriveDocumentState,
  formData: FormData
): Promise<UploadDocumentResult> {
  const file = formData.get("file");
  const categoryRaw = formData.get("category");
  const propertySlugRaw = formData.get("propertySlug");

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Pick a file to upload." };
  }
  if (file.size > UPLOAD_MAX_SIZE_BYTES) {
    return {
      ok: false,
      message: `File is too large. Max ${(UPLOAD_MAX_SIZE_BYTES / (1024 * 1024)).toFixed(0)} MB.`,
    };
  }
  if (typeof categoryRaw !== "string" || !isAllowedCategory(categoryRaw)) {
    return { ok: false, message: "Pick a document category." };
  }
  if (!isAllowedMimeType(file.type)) {
    return {
      ok: false,
      message:
        "Unsupported file type. Allowed: PDF, JPG/PNG/GIF/WEBP, Word, Excel.",
    };
  }

  const propertySlug =
    typeof propertySlugRaw === "string" && propertySlugRaw.trim().length > 0
      ? propertySlugRaw.trim()
      : null;
  const propertyAddress = propertySlug
    ? trackedProperties.find((p) => p.slug === propertySlug)?.address ?? null
    : null;
  if (propertySlug && !propertyAddress) {
    return { ok: false, message: "Selected property not recognized." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const result = await uploadWorkspaceDocument({
    fileName: file.name,
    mimeType: file.type,
    buffer,
    category: categoryRaw,
    propertySlug,
    propertyAddress,
  });

  if (result.ok) {
    revalidatePath("/documents");
  }
  return result;
}

// =============================================================
// Adobe PDF extraction action
// =============================================================

export type ExtractDrivePdfFactsResult =
  | {
      ok: true;
      documentId: string;
      extractedAt: string;
      previewText: string;
      previewTruncated: boolean;
    }
  | {
      ok: false;
      message: string;
      /** Set when the failure is a Google auth issue (we surface the
       *  reconnect CTA in the UI). */
      needsConnect?: boolean;
      needsScope?: boolean;
    };

export type ExtractDrivePdfFactsState = ExtractDrivePdfFactsResult | null;

/**
 * User-triggered server action that runs Adobe PDF Extract on a single
 * uploaded PDF and stores the result. Flow:
 *   1. Look up the DriveDocument row.
 *   2. Validate MIME type is application/pdf.
 *   3. Validate Adobe credentials are configured.
 *   4. Mark extractionStatus = "extracting" (in case of mid-flight crash).
 *   5. Download the PDF bytes from Google Drive (drive.file scope).
 *   6. Hand off to `extractTextFromPdf` (Adobe end-to-end).
 *   7. Persist either { extractedJson, extractedText, extractedAt,
 *      extractionStatus: "draft_ready", extractionError: null } OR
 *      { extractionStatus: "failed", extractionError: <msg> }.
 *   8. revalidatePath("/documents").
 *
 * Adobe extraction is the only work that runs here, and only when this
 * action is invoked from a user click. No background polling, no
 * automatic post-upload trigger.
 */
export async function extractDrivePdfFactsAction(
  _prev: ExtractDrivePdfFactsState,
  formData: FormData
): Promise<ExtractDrivePdfFactsResult> {
  const documentIdRaw = formData.get("documentId");
  if (typeof documentIdRaw !== "string" || documentIdRaw.trim().length === 0) {
    return { ok: false, message: "Missing document id." };
  }
  const documentId = documentIdRaw.trim();

  if (!hasAdobePdfServices()) {
    return {
      ok: false,
      message:
        "Adobe PDF Services is not configured. Set ADOBE_PDF_SERVICES_CLIENT_ID and ADOBE_PDF_SERVICES_CLIENT_SECRET on the server.",
    };
  }

  const doc = await prisma.driveDocument.findUnique({
    where: { id: documentId },
  });
  if (!doc) return { ok: false, message: "Document not found." };
  if (doc.mimeType !== "application/pdf") {
    return {
      ok: false,
      message: "PDF extraction only runs on application/pdf files.",
    };
  }
  if (!doc.driveFileId) {
    return { ok: false, message: "Document has no Drive file id on file." };
  }

  // Mark in-flight so a refresh during the long-running call shows the
  // intermediate state honestly. Clearing extractionError now so a
  // prior failure doesn't linger if this run succeeds.
  await prisma.driveDocument.update({
    where: { id: documentId },
    data: { extractionStatus: "extracting", extractionError: null },
  });

  const download = await downloadDriveFileBytes(doc.driveFileId);
  if (!download.ok) {
    await prisma.driveDocument.update({
      where: { id: documentId },
      data: {
        extractionStatus: "failed",
        extractionError: download.message,
      },
    });
    revalidatePath("/documents");
    return {
      ok: false,
      message: download.message,
      needsConnect: download.needsConnect,
      needsScope: download.needsScope,
    };
  }

  const extract = await extractTextFromPdf(download.buffer);
  if (!extract.ok) {
    await prisma.driveDocument.update({
      where: { id: documentId },
      data: {
        extractionStatus: "failed",
        extractionError: extract.message,
      },
    });
    revalidatePath("/documents");
    return { ok: false, message: extract.message };
  }

  const extractedAt = new Date();
  await prisma.driveDocument.update({
    where: { id: documentId },
    data: {
      extractionStatus: "draft_ready",
      extractedJson: extract.structuredData as object,
      extractedText: extract.previewText,
      extractedAt,
      extractionError: null,
    },
  });
  revalidatePath("/documents");

  return {
    ok: true,
    documentId,
    extractedAt: extractedAt.toISOString(),
    previewText: extract.previewText,
    previewTruncated: extract.previewText.includes("(truncated"),
  };
}

// =============================================================
// AI document review action
// =============================================================

const ALLOWED_REVIEW_PROVIDERS: AiReviewProvider[] = ["openai", "xai"];

export type ReviewExtractedDocumentResult =
  | {
      ok: true;
      documentId: string;
      provider: AiReviewProvider;
      reviewedAt: string;
    }
  | {
      ok: false;
      message: string;
    };

export type ReviewExtractedDocumentState =
  | ReviewExtractedDocumentResult
  | null;

/**
 * User-triggered AI review of a document's Adobe-extracted text. Only
 * runs when extraction has produced text (`extractionStatus ===
 * "draft_ready"` AND `extractedText` non-empty).
 *
 * The review is structured JSON (see AiDocumentReview); it is persisted
 * to DriveDocument.aiReviewJson. Nothing else is written — no Task or
 * BudgetCategory row is created from suggestedTasks or
 * budgetImplications. Those are recommendations only.
 *
 * Tokens for the AI provider are read from env vars on the server. The
 * action returns only metadata (provider name, timestamp) — never an
 * API key or raw token.
 */
export async function reviewExtractedDocumentWithAiAction(
  _prev: ReviewExtractedDocumentState,
  formData: FormData
): Promise<ReviewExtractedDocumentResult> {
  const documentIdRaw = formData.get("documentId");
  const providerRaw = formData.get("provider");

  if (typeof documentIdRaw !== "string" || documentIdRaw.trim().length === 0) {
    return { ok: false, message: "Missing document id." };
  }
  const documentId = documentIdRaw.trim();

  const requestedProvider =
    typeof providerRaw === "string" &&
    (ALLOWED_REVIEW_PROVIDERS as readonly string[]).includes(providerRaw)
      ? (providerRaw as AiReviewProvider)
      : null;
  const provider = requestedProvider ?? defaultAiReviewProvider();
  if (!provider) {
    return {
      ok: false,
      message:
        "No AI provider is configured. Set OPENAI_API_KEY (preferred) or XAI_API_KEY on the server.",
    };
  }
  if (!isAiReviewProviderConfigured(provider)) {
    return {
      ok: false,
      message: `Selected AI provider "${provider}" is not configured.`,
    };
  }

  const doc = await prisma.driveDocument.findUnique({
    where: { id: documentId },
  });
  if (!doc) return { ok: false, message: "Document not found." };
  if (doc.extractionStatus !== "draft_ready") {
    return {
      ok: false,
      message: "Run Adobe PDF extraction first — no extracted text available.",
    };
  }
  const extractedText = doc.extractedText?.trim() ?? "";
  if (extractedText.length === 0) {
    return {
      ok: false,
      message: "Document has no extracted text to review.",
    };
  }

  const linkedAddress = doc.linkedPropertySlug
    ? trackedProperties.find((p) => p.slug === doc.linkedPropertySlug)
        ?.address ?? null
    : null;

  // Mark in-flight so a refresh during the request shows the spinner
  // state honestly. Clearing prior error now so a successful run cleans
  // the slate.
  await prisma.driveDocument.update({
    where: { id: documentId },
    data: { aiReviewStatus: "reviewing", aiReviewError: null },
  });

  const result = await reviewExtractedText({
    documentName: doc.name,
    category: doc.category,
    linkedPropertyAddress: linkedAddress,
    extractedText,
    provider,
  });

  if (!result.ok) {
    await prisma.driveDocument.update({
      where: { id: documentId },
      data: {
        aiReviewStatus: "failed",
        aiReviewError: result.message,
      },
    });
    revalidatePath("/documents");
    return { ok: false, message: result.message };
  }

  const reviewedAt = new Date();
  await prisma.driveDocument.update({
    where: { id: documentId },
    data: {
      aiReviewStatus: "draft_ready",
      aiReviewJson: result.review as unknown as object,
      aiReviewProvider: result.provider,
      aiReviewedAt: reviewedAt,
      aiReviewError: null,
    },
  });
  revalidatePath("/documents");

  return {
    ok: true,
    documentId,
    provider: result.provider,
    reviewedAt: reviewedAt.toISOString(),
  };
}
