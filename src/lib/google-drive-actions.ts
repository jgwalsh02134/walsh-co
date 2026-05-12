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
  type CreateFoldersResult,
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
