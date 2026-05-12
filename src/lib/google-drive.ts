/**
 * Server-only Google Drive helper — foundation pass.
 *
 * This module exposes the status surface and folder-structure constants
 * the Documents workspace needs to render a coherent "Drive storage"
 * card. It deliberately does NOT perform any Drive API calls in this
 * pass — no folder creation, no file upload, no listing. Adding the
 * helper now lets the UI render configured/connected/needs-scope/not-
 * configured states without changing the OAuth perimeter again later.
 *
 * Scope policy:
 *   - We use `drive.file` only. This scope allows the workspace to
 *     create and manage files/folders it itself creates via this OAuth
 *     client; it cannot read or modify any pre-existing Drive content.
 *   - We never request the broader `drive` scope.
 *
 * Token handling:
 *   - Tokens live in the existing encrypted httpOnly session cookie
 *     (`gw_google_session`). This module only reads scope membership
 *     via `sessionHasScope` and never logs or returns the token.
 */

import {
  DRIVE_FILE_SCOPE,
  getGoogleSession,
  hasGoogleClient,
  isDriveStorageEnabled,
  sessionHasScope,
} from "@/lib/google-gmail";

if (typeof window !== "undefined") {
  throw new Error(
    "src/lib/google-drive.ts is server-only and must not be imported on the client."
  );
}

export { DRIVE_FILE_SCOPE };

// =============================================================
// Status
// =============================================================

export type DriveStatus =
  | "not_configured" // Google client missing, or Drive feature flag off
  | "needs_connect" // Drive enabled, but no Google session cookie
  | "needs_scope" // Connected, but session was granted gmail-only
  | "configured"; // Connected with drive.file granted

export type DriveStatusSummary = {
  status: DriveStatus;
  /** True only when `GOOGLE_DRIVE_STORAGE_ENABLED=true` AND
   *  `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` are set. */
  enabled: boolean;
  /** True when a Google session cookie was successfully decoded. */
  googleConnected: boolean;
  /** True when the session was granted `drive.file`. */
  driveScopeGranted: boolean;
  /** Email of the connected Google account, when available. */
  connectedEmail: string | null;
};

/**
 * Compute the Drive status without calling Drive. Only inspects:
 *   - env vars (client config + feature flag)
 *   - the encrypted session cookie (granted scopes)
 *
 * Safe to call from server components.
 */
export async function getDriveStatus(): Promise<DriveStatusSummary> {
  if (!hasGoogleClient() || !isDriveStorageEnabled()) {
    return {
      status: "not_configured",
      enabled: false,
      googleConnected: false,
      driveScopeGranted: false,
      connectedEmail: null,
    };
  }

  const session = await getGoogleSession();
  if (!session) {
    return {
      status: "needs_connect",
      enabled: true,
      googleConnected: false,
      driveScopeGranted: false,
      connectedEmail: null,
    };
  }

  const driveScopeGranted = sessionHasScope(session, DRIVE_FILE_SCOPE);
  return {
    status: driveScopeGranted ? "configured" : "needs_scope",
    enabled: true,
    googleConnected: true,
    driveScopeGranted,
    connectedEmail: session.email,
  };
}

// =============================================================
// Folder structure (proposed, not created)
// =============================================================

/**
 * The Drive folder layout the workspace will create *when an action is
 * triggered by the user*. Nothing here writes to Drive — these are the
 * names the future "Create workspace folder" / "Create property folder"
 * actions will use.
 */
export const WORKSPACE_DRIVE_ROOT_NAME = "J.G. Walsh & Co. Workspace";

export const WORKSPACE_DRIVE_TOP_LEVEL = [
  "Properties",
  "Bids",
  "Permits",
  "Reports",
  "Invoices",
  "Photos",
] as const;

export type WorkspaceDriveTopLevel = (typeof WORKSPACE_DRIVE_TOP_LEVEL)[number];

export type WorkspaceDriveFolder = {
  /** Display name for this folder in Drive. */
  name: string;
  /** Path components from the workspace root (excluding root). */
  pathFromRoot: string[];
  /** UI description for the actions list. */
  description: string;
};

/**
 * Build the suggested folder list for a set of property addresses. The
 * caller passes property names (typically the address) so we don't
 * couple this module to the tracked-property list.
 *
 * NOTE: This is plan data. No Drive API call happens here.
 */
export function suggestedWorkspaceFolders(
  propertyNames: string[]
): WorkspaceDriveFolder[] {
  const topLevel: WorkspaceDriveFolder[] = WORKSPACE_DRIVE_TOP_LEVEL.map(
    (name) => ({
      name,
      pathFromRoot: [name],
      description:
        name === "Properties"
          ? "Container for per-property subfolders."
          : `Workspace-wide ${name.toLowerCase()} folder.`,
    })
  );

  const properties: WorkspaceDriveFolder[] = propertyNames.map((address) => ({
    name: address,
    pathFromRoot: ["Properties", address],
    description: `Per-property folder for ${address}.`,
  }));

  return [...topLevel, ...properties];
}
