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

import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
  DRIVE_FILE_SCOPE,
  getGoogleSession,
  getValidGoogleSession,
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

// =============================================================
// Workspace folder persistence (Postgres via Prisma)
// =============================================================

const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";
const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";

const WORKSPACE_FOLDERS_KEY = "google_drive_workspace_folders";

/**
 * Persisted shape for the Drive folder tree. Keys under `children` are
 * the slash-joined path-from-root (`"Properties"`, `"Properties/322 Osborne Rd"`,
 * etc.) so lookups are O(1) and lossless when new properties are added.
 */
export type WorkspaceFolderMap = {
  /** Drive file id of the root workspace folder. */
  rootId: string;
  /** Drive web URL of the root folder. May be empty if unavailable. */
  rootWebUrl: string;
  /** path-from-root (slash-joined) → Drive file id. */
  children: Record<string, string>;
  /** ISO timestamp of the most recent successful create/verify. */
  lastVerifiedAt: string;
};

export type WorkspaceFolderRecord = {
  map: WorkspaceFolderMap;
  updatedAt: Date;
};

/**
 * Read the persisted folder map. Returns null when nothing has been
 * stored yet, or when the row exists but doesn't match the expected
 * shape (corrupt — caller should treat as "not created yet").
 */
export async function getStoredWorkspaceFolders(): Promise<WorkspaceFolderRecord | null> {
  let row: { valueJson: unknown; updatedAt: Date } | null = null;
  try {
    row = await prisma.workspaceSetting.findUnique({
      where: { key: WORKSPACE_FOLDERS_KEY },
    });
  } catch {
    // Database unreachable. Treat as "no record yet" so the UI shows
    // the un-created state rather than crashing the page. The user can
    // still trigger creation; that path will surface the underlying
    // error via the server action's catch.
    return null;
  }
  if (!row) return null;
  const parsed = parseFolderMap(row.valueJson);
  if (!parsed) return null;
  return { map: parsed, updatedAt: row.updatedAt };
}

function parseFolderMap(value: unknown): WorkspaceFolderMap | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Partial<WorkspaceFolderMap> & Record<string, unknown>;
  if (typeof v.rootId !== "string" || v.rootId.length === 0) return null;
  const rootWebUrl = typeof v.rootWebUrl === "string" ? v.rootWebUrl : "";
  const children =
    v.children && typeof v.children === "object"
      ? (v.children as Record<string, unknown>)
      : {};
  const cleanChildren: Record<string, string> = {};
  for (const [k, val] of Object.entries(children)) {
    if (typeof val === "string" && val.length > 0) cleanChildren[k] = val;
  }
  const lastVerifiedAt =
    typeof v.lastVerifiedAt === "string"
      ? v.lastVerifiedAt
      : new Date(0).toISOString();
  return {
    rootId: v.rootId,
    rootWebUrl,
    children: cleanChildren,
    lastVerifiedAt,
  };
}

async function writeWorkspaceFolders(map: WorkspaceFolderMap): Promise<void> {
  // Cast through `unknown` because Prisma's Json input type doesn't
  // accept arbitrary structured objects without a satisfies-style cast.
  const value = map as unknown as Parameters<
    typeof prisma.workspaceSetting.upsert
  >[0]["create"]["valueJson"];
  await prisma.workspaceSetting.upsert({
    where: { key: WORKSPACE_FOLDERS_KEY },
    update: { valueJson: value },
    create: { key: WORKSPACE_FOLDERS_KEY, valueJson: value },
  });
}

// =============================================================
// Drive REST helpers
// =============================================================

type DriveFileResource = {
  id: string;
  name?: string;
  trashed?: boolean;
  webViewLink?: string;
};

/**
 * Verify a Drive file id still exists and is not trashed. Returns the
 * lightweight resource (incl. webViewLink) on success, null when the
 * file is gone/trashed, and throws on transport errors so the caller
 * can decide whether to retry. Only fields we display are requested.
 */
async function getDriveFile(
  accessToken: string,
  id: string
): Promise<DriveFileResource | null> {
  const url = new URL(`${DRIVE_API_BASE}/files/${encodeURIComponent(id)}`);
  url.searchParams.set("fields", "id,name,trashed,webViewLink");
  url.searchParams.set("supportsAllDrives", "true");
  const response = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Drive files.get failed (HTTP ${response.status}).`);
  }
  const body = (await response.json()) as DriveFileResource;
  if (body.trashed) return null;
  return body;
}

async function createDriveFolder(
  accessToken: string,
  input: { name: string; parentId: string | null }
): Promise<DriveFileResource> {
  const url = new URL(`${DRIVE_API_BASE}/files`);
  url.searchParams.set("fields", "id,name,webViewLink");
  url.searchParams.set("supportsAllDrives", "true");
  const body = JSON.stringify({
    name: input.name,
    mimeType: FOLDER_MIME_TYPE,
    ...(input.parentId ? { parents: [input.parentId] } : {}),
  });
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body,
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Drive files.create failed (HTTP ${response.status}).`);
  }
  return (await response.json()) as DriveFileResource;
}

// =============================================================
// Workspace folder creation (idempotent, user-click only)
// =============================================================

export type CreateFoldersInput = {
  /** Property addresses to create per-property subfolders for. */
  propertyAddresses: string[];
};

export type CreateFoldersResult =
  | {
      ok: true;
      map: WorkspaceFolderMap;
      /** Counts so the UI can show "created N · reused M". */
      summary: { created: number; reused: number };
    }
  | {
      ok: false;
      message: string;
      needsConnect?: boolean;
      needsScope?: boolean;
    };

/**
 * Create the J.G. Walsh & Co. Workspace folder tree in Drive. Idempotent:
 * each folder's id is persisted in `WorkspaceSetting` and verified via
 * `files.get` before re-use; a verified-missing id triggers a fresh
 * create. Runs only on user click (never auto-invoked).
 *
 * Safety:
 *   - Never deletes a Drive folder.
 *   - Never uploads a file.
 *   - Uses `drive.file` scope only — cannot see or modify any folder it
 *     did not itself create via this OAuth client.
 *   - Returns the resulting map (no token) so the caller can show
 *     "Created" status and an Open Drive link.
 */
export async function createDriveWorkspaceFolders(
  input: CreateFoldersInput
): Promise<CreateFoldersResult> {
  if (!isDriveStorageEnabled()) {
    return {
      ok: false,
      message:
        "Google Drive storage is not enabled. Set GOOGLE_DRIVE_STORAGE_ENABLED=true on the server.",
    };
  }

  const auth = await getValidGoogleSession({ requireScope: DRIVE_FILE_SCOPE });
  if (!auth.ok) {
    return {
      ok: false,
      message: auth.message,
      needsConnect: auth.needsConnect,
      needsScope: auth.needsScope,
    };
  }
  const accessToken = auth.session.accessToken;

  const existing = (await getStoredWorkspaceFolders())?.map ?? null;
  let map: WorkspaceFolderMap = existing ?? {
    rootId: "",
    rootWebUrl: "",
    children: {},
    lastVerifiedAt: new Date(0).toISOString(),
  };

  let created = 0;
  let reused = 0;

  try {
    // ---- Root ----
    if (map.rootId) {
      const verified = await getDriveFile(accessToken, map.rootId);
      if (verified) {
        reused++;
        if (verified.webViewLink) map.rootWebUrl = verified.webViewLink;
      } else {
        const root = await createDriveFolder(accessToken, {
          name: WORKSPACE_DRIVE_ROOT_NAME,
          parentId: null,
        });
        map = {
          rootId: root.id,
          rootWebUrl: root.webViewLink ?? "",
          children: {}, // root recreated → previous children references are dead
          lastVerifiedAt: new Date().toISOString(),
        };
        created++;
        await writeWorkspaceFolders(map);
      }
    } else {
      const root = await createDriveFolder(accessToken, {
        name: WORKSPACE_DRIVE_ROOT_NAME,
        parentId: null,
      });
      map = {
        rootId: root.id,
        rootWebUrl: root.webViewLink ?? "",
        children: {},
        lastVerifiedAt: new Date().toISOString(),
      };
      created++;
      await writeWorkspaceFolders(map);
    }

    // ---- Top-level folders + per-property folders, in path order ----
    const planned = suggestedWorkspaceFolders(input.propertyAddresses);
    for (const folder of planned) {
      const key = folder.pathFromRoot.join("/");
      const parentKey = folder.pathFromRoot.slice(0, -1).join("/");
      const parentId = parentKey === "" ? map.rootId : map.children[parentKey];
      if (!parentId) {
        // Parent missing — skip; will be picked up on a follow-up run
        // once the parent is created. Defensive only; the planned order
        // means we always create parents first.
        continue;
      }

      const existingId = map.children[key];
      if (existingId) {
        const verified = await getDriveFile(accessToken, existingId);
        if (verified) {
          reused++;
          continue;
        }
        // Verified missing — fall through to create
      }

      const file = await createDriveFolder(accessToken, {
        name: folder.name,
        parentId,
      });
      map = {
        ...map,
        children: { ...map.children, [key]: file.id },
        lastVerifiedAt: new Date().toISOString(),
      };
      created++;
      await writeWorkspaceFolders(map);
    }

    map = { ...map, lastVerifiedAt: new Date().toISOString() };
    await writeWorkspaceFolders(map);

    return { ok: true, map, summary: { created, reused } };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? `Drive error: ${error.message.slice(0, 180)}`
          : "Unknown Drive error.",
    };
  }
}

// =============================================================
// Status surface (extended)
// =============================================================

/**
 * Lightweight read for UI — returns the stored map without touching
 * Drive. Used by /documents and /settings to show "Created" status and
 * the Open Drive folder link.
 */
export async function getStoredWorkspaceFoldersForUi(): Promise<{
  rootId: string | null;
  rootWebUrl: string | null;
  childCount: number;
  lastVerifiedAt: string | null;
} | null> {
  const record = await getStoredWorkspaceFolders();
  if (!record) return null;
  return {
    rootId: record.map.rootId || null,
    rootWebUrl: record.map.rootWebUrl || null,
    childCount: Object.keys(record.map.children).length,
    lastVerifiedAt: record.map.lastVerifiedAt,
  };
}

// =============================================================
// Document upload
// =============================================================

const DRIVE_UPLOAD_BASE = "https://www.googleapis.com/upload/drive/v3";

/**
 * Map a document category to the top-level workspace folder name. Used
 * to choose a target folder when the user does not link the upload to a
 * specific property. Unknown categories fall through to the root.
 */
const CATEGORY_TO_FOLDER: Record<string, string> = {
  contractor_bid: "Bids",
  permit: "Permits",
  inspection: "Reports",
  survey: "Reports",
  tax_assessment: "Reports",
  receipt_invoice: "Invoices",
  photo_media: "Photos",
  insurance: "Reports",
  deed_title: "Reports",
  lease_rental: "Reports",
  other: "",
};

export type UploadAllowedMimeType =
  | "application/pdf"
  | "image/jpeg"
  | "image/png"
  | "image/gif"
  | "image/webp"
  | "application/msword"
  | "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  | "application/vnd.ms-excel"
  | "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export const UPLOAD_ALLOWED_MIME_TYPES: UploadAllowedMimeType[] = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

export const UPLOAD_MAX_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

export type ResolveTargetFolderInput = {
  propertyAddress: string | null;
  category: string;
};

export type ResolveTargetFolderResult =
  | { ok: true; folderId: string; targetLabel: string }
  | { ok: false; message: string };

/**
 * Resolve which Drive folder a new upload should land in.
 *   - Property selected → `Properties/{address}`
 *   - Category mapped → matching top-level folder
 *   - Otherwise → workspace root
 *
 * Reads the persisted folder map only — no Drive API call.
 */
export async function resolveTargetFolder(
  input: ResolveTargetFolderInput
): Promise<ResolveTargetFolderResult> {
  const stored = await getStoredWorkspaceFolders();
  if (!stored || !stored.map.rootId) {
    return {
      ok: false,
      message: "Create Drive workspace folder first.",
    };
  }
  const { map } = stored;

  if (input.propertyAddress) {
    const key = `Properties/${input.propertyAddress}`;
    const id = map.children[key];
    if (id) return { ok: true, folderId: id, targetLabel: key };
  }

  const folderName = CATEGORY_TO_FOLDER[input.category];
  if (folderName) {
    const id = map.children[folderName];
    if (id) return { ok: true, folderId: id, targetLabel: folderName };
  }

  return {
    ok: true,
    folderId: map.rootId,
    targetLabel: WORKSPACE_DRIVE_ROOT_NAME,
  };
}

export type DriveUploadInput = {
  accessToken: string;
  parentId: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
};

export type DriveUploadResult = {
  id: string;
  name: string;
  webViewLink: string;
  mimeType: string;
  size: number;
};

/**
 * Upload a single file to Drive using the multipart upload endpoint.
 * One HTTP request, no resumable session needed at this scale. Tokens
 * never leave this function — the caller passes the resolved access
 * token from `getValidGoogleSession`.
 *
 * Safety:
 *   - No overwrite. `files.create` only creates new files; an existing
 *     file with the same name would receive a parallel id rather than
 *     be modified, so re-uploading is non-destructive.
 *   - No `files.update` / `files.delete` call exists in this helper.
 */
async function uploadFileToDrive(
  input: DriveUploadInput
): Promise<DriveUploadResult> {
  const boundary = `wco_${crypto.randomBytes(16).toString("hex")}`;

  const metadata = JSON.stringify({
    name: input.fileName,
    mimeType: input.mimeType,
    parents: [input.parentId],
  });

  const head = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: ${input.mimeType}\r\n\r\n`;
  const tail = `\r\n--${boundary}--`;
  const body = Buffer.concat([
    Buffer.from(head, "utf-8"),
    input.buffer,
    Buffer.from(tail, "utf-8"),
  ]);

  const url = new URL(`${DRIVE_UPLOAD_BASE}/files`);
  url.searchParams.set("uploadType", "multipart");
  url.searchParams.set("fields", "id,name,webViewLink,mimeType,size");
  url.searchParams.set("supportsAllDrives", "true");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
      "Content-Length": String(body.length),
    },
    body,
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(
      `Drive files.create (multipart) failed (HTTP ${response.status}).`
    );
  }
  const json = (await response.json()) as {
    id: string;
    name: string;
    webViewLink?: string;
    mimeType?: string;
    size?: string;
  };
  return {
    id: json.id,
    name: json.name,
    webViewLink: json.webViewLink ?? "",
    mimeType: json.mimeType ?? input.mimeType,
    size: typeof json.size === "string" ? Number.parseInt(json.size, 10) : input.buffer.length,
  };
}

export type UploadDocumentInput = {
  fileName: string;
  mimeType: string;
  /** File contents. Caller is responsible for size enforcement. */
  buffer: Buffer;
  /** App-level category — must match an allowlisted DocumentCategory. */
  category: string;
  /** Optional property linkage by slug. */
  propertySlug: string | null;
  /** Property address for folder resolution (resolved by caller from slug). */
  propertyAddress: string | null;
};

export type UploadDocumentResult =
  | {
      ok: true;
      record: {
        id: string;
        name: string;
        category: string;
        linkedPropertySlug: string | null;
        driveFileId: string;
        driveWebUrl: string;
        mimeType: string;
        sizeBytes: number;
        extractionStatus: string;
        uploadedAt: Date;
      };
      targetLabel: string;
    }
  | {
      ok: false;
      message: string;
      needsConnect?: boolean;
      needsScope?: boolean;
    };

/**
 * Upload a document to Drive and persist its metadata. Called by the
 * server action and runs only on user click. Steps:
 *   1. Refresh the access token + check drive.file scope.
 *   2. Resolve the target folder (property/category/root).
 *   3. Multipart upload to Drive.
 *   4. Insert one row in `DriveDocument`.
 *
 * Adobe extraction is intentionally NOT run here. The record is created
 * with `extractionStatus: "not_started"`.
 */
export async function uploadWorkspaceDocument(
  input: UploadDocumentInput
): Promise<UploadDocumentResult> {
  if (!isDriveStorageEnabled()) {
    return {
      ok: false,
      message:
        "Google Drive storage is not enabled on the server.",
    };
  }

  const auth = await getValidGoogleSession({ requireScope: DRIVE_FILE_SCOPE });
  if (!auth.ok) {
    return {
      ok: false,
      message: auth.message,
      needsConnect: auth.needsConnect,
      needsScope: auth.needsScope,
    };
  }

  const target = await resolveTargetFolder({
    propertyAddress: input.propertyAddress,
    category: input.category,
  });
  if (!target.ok) {
    return { ok: false, message: target.message };
  }

  let uploaded: DriveUploadResult;
  try {
    uploaded = await uploadFileToDrive({
      accessToken: auth.session.accessToken,
      parentId: target.folderId,
      fileName: input.fileName,
      mimeType: input.mimeType,
      buffer: input.buffer,
    });
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? `Drive upload failed: ${error.message.slice(0, 180)}`
          : "Drive upload failed.",
    };
  }

  const record = await prisma.driveDocument.create({
    data: {
      name: uploaded.name,
      category: input.category,
      linkedPropertySlug: input.propertySlug,
      driveFileId: uploaded.id,
      driveWebUrl: uploaded.webViewLink,
      mimeType: uploaded.mimeType,
      sizeBytes: uploaded.size,
    },
  });

  return {
    ok: true,
    record: {
      id: record.id,
      name: record.name,
      category: record.category,
      linkedPropertySlug: record.linkedPropertySlug,
      driveFileId: record.driveFileId,
      driveWebUrl: record.driveWebUrl,
      mimeType: record.mimeType,
      sizeBytes: record.sizeBytes,
      extractionStatus: record.extractionStatus,
      uploadedAt: record.uploadedAt,
    },
    targetLabel: target.targetLabel,
  };
}

// =============================================================
// List uploaded documents (page render)
// =============================================================

export type DriveDocumentSummary = {
  id: string;
  name: string;
  category: string;
  linkedPropertySlug: string | null;
  driveWebUrl: string;
  mimeType: string;
  sizeBytes: number;
  extractionStatus: string;
  uploadedAt: Date;
};

/**
 * Return uploaded documents for display on /documents. Safe to call on
 * page render — only reads Postgres, never touches Drive. Returns an
 * empty array when the database is unreachable so the page still loads.
 */
export async function listDriveDocuments(): Promise<DriveDocumentSummary[]> {
  try {
    const rows = await prisma.driveDocument.findMany({
      orderBy: { uploadedAt: "desc" },
      take: 200,
    });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      linkedPropertySlug: r.linkedPropertySlug,
      driveWebUrl: r.driveWebUrl,
      mimeType: r.mimeType,
      sizeBytes: r.sizeBytes,
      extractionStatus: r.extractionStatus,
      uploadedAt: r.uploadedAt,
    }));
  } catch {
    return [];
  }
}
