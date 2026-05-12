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
import {
  createDriveWorkspaceFolders,
  uploadWorkspaceDocument,
  UPLOAD_ALLOWED_MIME_TYPES,
  UPLOAD_MAX_SIZE_BYTES,
  type CreateFoldersResult,
  type UploadAllowedMimeType,
  type UploadDocumentResult,
} from "@/lib/google-drive";
import { trackedProperties } from "@/lib/market-data";

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
