/**
 * Server-only Adobe PDF Services helper.
 *
 * Flow for `extractTextFromPdf`:
 *   1. Get an Adobe access token using the OAuth client-credentials
 *      grant (POST /token with client_id + client_secret).
 *   2. Create an asset slot (POST /assets) → { uploadUri, assetID }.
 *   3. PUT the PDF bytes to the upload URI.
 *   4. Kick off the Extract job (POST /operation/extractpdf).
 *   5. Poll the job-status URL returned in the `Location` header.
 *   6. Download the result ZIP from `content.downloadUri`.
 *   7. Pull `structuredData.json` out of the ZIP using a tiny inline
 *      parser (no JSZip dependency).
 *
 * Safety:
 *   - All credentials live in env vars and are only ever sent to
 *     `pdf-services.adobe.io`. We never log token values.
 *   - The caller runs this only from a server action triggered by a
 *     user click; nothing here schedules background work.
 *   - The token cache is process-local and re-fetched when expired.
 */

import zlib from "node:zlib";

if (typeof window !== "undefined") {
  throw new Error(
    "src/lib/adobe-pdf.ts is server-only and must not be imported on the client."
  );
}

const TOKEN_URL = "https://pdf-services.adobe.io/token";
const ASSETS_URL = "https://pdf-services.adobe.io/assets";
const EXTRACT_URL = "https://pdf-services.adobe.io/operation/extractpdf";

// Adobe extract jobs typically finish in 5–20s for a typical real-
// estate PDF. We cap the total wait so a hung job can't pin the
// action indefinitely.
const POLL_INTERVAL_MS = 1500;
const POLL_MAX_TOTAL_MS = 90_000;

let cachedToken: { token: string; expiresAt: number } | null = null;

export function hasAdobePdfServices(): boolean {
  return (
    Boolean(process.env.ADOBE_PDF_SERVICES_CLIENT_ID?.trim()) &&
    Boolean(process.env.ADOBE_PDF_SERVICES_CLIENT_SECRET?.trim())
  );
}

function getClientId(): string {
  const v = process.env.ADOBE_PDF_SERVICES_CLIENT_ID?.trim();
  if (!v) throw new Error("ADOBE_PDF_SERVICES_CLIENT_ID is not configured.");
  return v;
}

function getClientSecret(): string {
  const v = process.env.ADOBE_PDF_SERVICES_CLIENT_SECRET?.trim();
  if (!v)
    throw new Error("ADOBE_PDF_SERVICES_CLIENT_SECRET is not configured.");
  return v;
}

/**
 * Get a fresh Adobe access token, caching it process-locally until
 * 60s before its declared expiry. The token is sent as a Bearer in the
 * `Authorization` header on subsequent calls.
 */
async function getAdobeAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt - now > 60) return cachedToken.token;

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: getClientId(),
      client_secret: getClientSecret(),
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Adobe token request failed (HTTP ${response.status}).`);
  }
  const body = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!body.access_token) {
    throw new Error("Adobe token response did not include an access_token.");
  }
  cachedToken = {
    token: body.access_token,
    expiresAt: now + (body.expires_in ?? 3600),
  };
  return cachedToken.token;
}

function buildAdobeHeaders(accessToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
    "x-api-key": getClientId(),
    "Content-Type": "application/json",
  };
}

type AssetCreateResponse = { uploadUri: string; assetID: string };

async function createAdobeAsset(accessToken: string): Promise<AssetCreateResponse> {
  const response = await fetch(ASSETS_URL, {
    method: "POST",
    headers: buildAdobeHeaders(accessToken),
    body: JSON.stringify({ mediaType: "application/pdf" }),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Adobe asset create failed (HTTP ${response.status}).`);
  }
  const body = (await response.json()) as Partial<AssetCreateResponse>;
  if (!body.uploadUri || !body.assetID) {
    throw new Error("Adobe asset response missing uploadUri/assetID.");
  }
  return { uploadUri: body.uploadUri, assetID: body.assetID };
}

async function uploadPdfToAdobe(uploadUri: string, buffer: Buffer): Promise<void> {
  const response = await fetch(uploadUri, {
    method: "PUT",
    headers: { "Content-Type": "application/pdf" },
    // Buffer types in @types/node currently widen the underlying ArrayBuffer
    // generic in ways that don't satisfy DOM's `BodyInit` union. Cast keeps
    // the upload bytes-accurate without introducing a memcopy via Blob.
    body: buffer as unknown as BodyInit,
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Adobe asset upload failed (HTTP ${response.status}).`);
  }
}

type ExtractJobResult = {
  status: "done" | "failed" | "in progress";
  content?: { downloadUri?: string };
  error?: { code?: string; message?: string };
};

async function startExtractJob(
  accessToken: string,
  assetID: string
): Promise<string> {
  const response = await fetch(EXTRACT_URL, {
    method: "POST",
    headers: buildAdobeHeaders(accessToken),
    body: JSON.stringify({
      assetID,
      elementsToExtract: ["text"],
    }),
    cache: "no-store",
  });
  if (!response.ok && response.status !== 201) {
    throw new Error(`Adobe extract create failed (HTTP ${response.status}).`);
  }
  const location = response.headers.get("location");
  if (!location) {
    throw new Error("Adobe extract response missing Location header.");
  }
  return location;
}

async function pollExtractJob(
  accessToken: string,
  statusUrl: string
): Promise<ExtractJobResult> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < POLL_MAX_TOTAL_MS) {
    const response = await fetch(statusUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "x-api-key": getClientId(),
      },
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`Adobe extract status failed (HTTP ${response.status}).`);
    }
    const body = (await response.json()) as ExtractJobResult;
    if (body.status === "done" || body.status === "failed") return body;
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw new Error(
    `Adobe extract timed out after ${Math.round(POLL_MAX_TOTAL_MS / 1000)}s.`
  );
}

type DownloadExtractResult =
  | {
      ok: true;
      kind: "zip" | "json";
      buffer: Buffer;
      contentType: string | null;
      contentLength: number | null;
      status: number;
    }
  | {
      ok: false;
      message: string;
    };

/**
 * Download the Adobe Extract result and validate it before returning.
 *
 * The body is read once. We surface enough diagnostics — HTTP status,
 * content-type, first non-printable-stripped 1000 chars — to debug a
 * response that isn't actually a ZIP (Adobe sometimes hands back a
 * presigned-S3 XML error or a JSON error blob when the result URL is
 * stale or the job result is missing). No tokens, no secrets, and no
 * user document text leave this function.
 */
async function downloadExtractResult(
  downloadUri: string
): Promise<DownloadExtractResult> {
  let response: Response;
  try {
    response = await fetch(downloadUri, { method: "GET", cache: "no-store" });
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? `Adobe result download network error: ${error.message.slice(0, 180)}`
          : "Adobe result download network error.",
    };
  }

  const status = response.status;
  const contentType = response.headers.get("content-type");
  const contentLengthHeader = response.headers.get("content-length");
  const contentLength = contentLengthHeader
    ? Number.parseInt(contentLengthHeader, 10)
    : null;

  const ab = await response.arrayBuffer();
  const buffer = Buffer.from(ab);

  if (status < 200 || status >= 300) {
    return {
      ok: false,
      message: `Adobe result download failed. Status: ${status}. Content-Type: ${
        contentType ?? "unknown"
      }. Preview: ${previewBytes(buffer)}`,
    };
  }

  // Adobe's extract API can return either a ZIP (older behavior) or the
  // structured-data JSON directly (current behavior on this account).
  // We accept both: prefer the ZIP magic + central-directory parse when
  // present, otherwise fall through to JSON detection. JSON detection
  // also covers the case where Adobe omits or sends a generic
  // Content-Type by sniffing the first non-whitespace byte.
  if (looksLikeZip(buffer)) {
    return {
      ok: true,
      kind: "zip",
      buffer,
      contentType,
      contentLength: Number.isFinite(contentLength)
        ? (contentLength as number)
        : null,
      status,
    };
  }
  if (looksLikeJson(buffer, contentType)) {
    return {
      ok: true,
      kind: "json",
      buffer,
      contentType,
      contentLength: Number.isFinite(contentLength)
        ? (contentLength as number)
        : null,
      status,
    };
  }
  return {
    ok: false,
    message: `Adobe result was not ZIP or JSON. Status: ${status}. Content-Type: ${
      contentType ?? "unknown"
    }. Preview: ${previewBytes(buffer)}`,
  };
}

/**
 * ZIP magic bytes:
 *   - 0x50 0x4B 0x03 0x04 — local file header (regular ZIP)
 *   - 0x50 0x4B 0x05 0x06 — empty-archive EOCD
 *   - 0x50 0x4B 0x07 0x08 — data descriptor / spanned-archive marker
 */
function looksLikeZip(buf: Buffer): boolean {
  if (buf.length < 4) return false;
  if (buf[0] !== 0x50 || buf[1] !== 0x4b) return false;
  const b2 = buf[2];
  const b3 = buf[3];
  return (
    (b2 === 0x03 && b3 === 0x04) ||
    (b2 === 0x05 && b3 === 0x06) ||
    (b2 === 0x07 && b3 === 0x08)
  );
}

/**
 * Best-effort JSON detection. Either the server told us via Content-Type
 * (preferred), or the first non-whitespace byte is `{` or `[`. Falling
 * back to a byte sniff keeps us correct when the upstream sends a
 * generic application/octet-stream.
 */
function looksLikeJson(buf: Buffer, contentType: string | null): boolean {
  if (contentType && contentType.toLowerCase().includes("application/json")) {
    return true;
  }
  // Skip ASCII whitespace at the start (space, tab, CR, LF).
  let i = 0;
  while (i < buf.length) {
    const b = buf[i];
    if (b !== 0x20 && b !== 0x09 && b !== 0x0a && b !== 0x0d) break;
    i++;
  }
  if (i >= buf.length) return false;
  return buf[i] === 0x7b || buf[i] === 0x5b; // "{" or "["
}

/**
 * Decode at most the first 1000 bytes as UTF-8, strip control
 * characters (keep tab/newline as space), collapse whitespace, and cap
 * the result. Designed for inclusion in user-facing error messages —
 * the response body might be an XML/JSON/HTML error from S3 or Adobe,
 * which is safe to surface; user document text never lands here
 * because this is the download response, not the PDF upload payload.
 */
function previewBytes(buf: Buffer): string {
  if (buf.length === 0) return "(empty body)";
  const slice = buf.subarray(0, Math.min(buf.length, 1000));
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: false }).decode(slice);
  } catch {
    return "(unreadable bytes)";
  }
  // Strip control chars except tab/newline/CR; replace those with space.
  // eslint-disable-next-line no-control-regex
  const stripped = text.replace(/[ -]/g, " ").replace(/\s+/g, " ").trim();
  const MAX = 400;
  if (stripped.length === 0) return "(non-text bytes)";
  return stripped.length > MAX ? `${stripped.slice(0, MAX)}…` : stripped;
}

function sanitizeAdobeErrorMessage(message: string): string {
  // Adobe error messages are usually short; clip defensively to keep
  // them out of any future log indexing limits and to drop control
  // characters that could break terminal output.
  // eslint-disable-next-line no-control-regex
  const stripped = message.replace(/[ -]/g, " ").trim();
  const MAX = 280;
  return stripped.length > MAX ? `${stripped.slice(0, MAX)}…` : stripped;
}

// =============================================================
// Minimal ZIP enumerator — handles stored + deflate entries.
// Avoids adding `jszip` as a dependency. Designed for Adobe Extract
// result ZIPs (typically <500 KB). Two-stage so callers can list the
// entry names for diagnostics when the expected file is missing.
//
// Important: sizes are read from the CENTRAL DIRECTORY (offset +20/+24
// from the central directory entry), not from the local file header.
// Streaming-mode ZIPs set general-purpose bit 3 and zero out the local
// header sizes; the central directory is the authoritative source.
// =============================================================

type ZipEntry = {
  name: string;
  method: number;
  compressedSize: number;
  uncompressedSize: number;
  /** Offset of this entry's record within the central directory. */
  cdOffset: number;
};

function listZipEntries(zip: Buffer): ZipEntry[] | null {
  if (zip.length < 22) return null;

  // Locate End-of-Central-Directory record (signature 0x06054b50)
  // within the last 64 KB.
  let eocdOffset = -1;
  const searchStart = Math.max(0, zip.length - 65557);
  for (let i = zip.length - 22; i >= searchStart; i--) {
    if (zip.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) return null;

  const centralDirSize = zip.readUInt32LE(eocdOffset + 12);
  const centralDirOffset = zip.readUInt32LE(eocdOffset + 16);
  const cdEnd = centralDirOffset + centralDirSize;
  if (cdEnd > zip.length) return null;

  const entries: ZipEntry[] = [];
  let cdPos = centralDirOffset;
  while (cdPos + 46 <= cdEnd) {
    if (zip.readUInt32LE(cdPos) !== 0x02014b50) return null;
    const method = zip.readUInt16LE(cdPos + 10);
    const compressedSize = zip.readUInt32LE(cdPos + 20);
    const uncompressedSize = zip.readUInt32LE(cdPos + 24);
    const fileNameLen = zip.readUInt16LE(cdPos + 28);
    const extraLen = zip.readUInt16LE(cdPos + 30);
    const commentLen = zip.readUInt16LE(cdPos + 32);
    const name = zip
      .subarray(cdPos + 46, cdPos + 46 + fileNameLen)
      .toString("utf-8");

    entries.push({
      name,
      method,
      compressedSize,
      uncompressedSize,
      cdOffset: cdPos,
    });
    cdPos += 46 + fileNameLen + extraLen + commentLen;
  }
  return entries;
}

function readZipEntry(zip: Buffer, entry: ZipEntry): Buffer | null {
  const localHeaderOffset = zip.readUInt32LE(entry.cdOffset + 42);
  if (
    localHeaderOffset + 30 > zip.length ||
    zip.readUInt32LE(localHeaderOffset) !== 0x04034b50
  ) {
    return null;
  }
  const localFileNameLen = zip.readUInt16LE(localHeaderOffset + 26);
  const localExtraLen = zip.readUInt16LE(localHeaderOffset + 28);
  const dataStart =
    localHeaderOffset + 30 + localFileNameLen + localExtraLen;
  if (dataStart + entry.compressedSize > zip.length) return null;
  const compressed = zip.subarray(dataStart, dataStart + entry.compressedSize);

  if (entry.method === 0) return Buffer.from(compressed);
  if (entry.method === 8) return zlib.inflateRawSync(compressed);
  return null;
}

function findStructuredDataEntry(entries: ZipEntry[]): ZipEntry | null {
  // Accept the file at the root or nested under any subfolder, so the
  // parser keeps working if Adobe ever wraps the result in a folder.
  // Case-insensitive on the final segment for resilience.
  for (const e of entries) {
    if (e.name.endsWith("/")) continue; // directory entry
    const lower = e.name.toLowerCase();
    if (lower === "structureddata.json" || lower.endsWith("/structureddata.json")) {
      return e;
    }
  }
  return null;
}

/**
 * Render the entry name list as a single capped diagnostic string for
 * use inside an error message. Names are filenames from the Adobe
 * service, not user document content, so it is safe to surface them
 * to the user.
 */
function summarizeEntryNames(entries: ZipEntry[]): string {
  const names = entries
    .map((e) => e.name)
    .filter((n) => !n.endsWith("/"));
  if (names.length === 0) return "(no files)";
  const MAX = 12;
  const head = names.slice(0, MAX).join(", ");
  return names.length > MAX
    ? `${head} (+${names.length - MAX} more)`
    : head;
}

// =============================================================
// Public API
// =============================================================

export type PdfExtractResult = {
  ok: true;
  structuredData: unknown;
  previewText: string;
};

export type PdfExtractError = { ok: false; message: string };

/**
 * Run Adobe PDF Extract end-to-end on a PDF buffer and return parsed
 * structured data plus a plain-text preview assembled from extracted
 * elements. Throws-as-result: never raises to the caller; converts
 * errors into `{ ok: false, message }` so the server action can
 * persist a clean failure state.
 */
export async function extractTextFromPdf(
  pdfBuffer: Buffer
): Promise<PdfExtractResult | PdfExtractError> {
  if (!hasAdobePdfServices()) {
    return { ok: false, message: "Adobe PDF Services is not configured." };
  }

  try {
    const token = await getAdobeAccessToken();
    const asset = await createAdobeAsset(token);
    await uploadPdfToAdobe(asset.uploadUri, pdfBuffer);
    const statusUrl = await startExtractJob(token, asset.assetID);
    const job = await pollExtractJob(token, statusUrl);

    if (job.status === "failed") {
      const raw =
        job.error?.message ?? job.error?.code ?? "unknown error";
      return {
        ok: false,
        message: `Adobe extract failed: ${sanitizeAdobeErrorMessage(raw)}`,
      };
    }
    if (!job.content?.downloadUri) {
      return {
        ok: false,
        message: "Adobe extract finished without a download URI.",
      };
    }

    const download = await downloadExtractResult(job.content.downloadUri);
    if (!download.ok) {
      return { ok: false, message: download.message };
    }

    let structured: unknown;
    if (download.kind === "json") {
      // Adobe handed us the structuredData JSON directly. Treat the
      // entire response body as `structuredData`.
      try {
        structured = JSON.parse(download.buffer.toString("utf-8"));
      } catch {
        return {
          ok: false,
          message: "Adobe returned JSON but it could not be parsed.",
        };
      }
    } else {
      // ZIP path: find and decompress structuredData.json inside the
      // archive. Identical to the original behavior so older API
      // responses keep working.
      const entries = listZipEntries(download.buffer);
      if (!entries) {
        return {
          ok: false,
          message: `Adobe extract ZIP could not be parsed (no central directory). Content-Type: ${
            download.contentType ?? "unknown"
          }. Preview: ${previewBytes(download.buffer)}`,
        };
      }
      const target = findStructuredDataEntry(entries);
      if (!target) {
        return {
          ok: false,
          message: `structuredData.json not found. ZIP entries found: ${summarizeEntryNames(
            entries
          )}`,
        };
      }
      const structuredBuffer = readZipEntry(download.buffer, target);
      if (!structuredBuffer) {
        return {
          ok: false,
          message: `Could not read ${target.name} from Adobe extract ZIP (compression method ${target.method}).`,
        };
      }
      try {
        structured = JSON.parse(structuredBuffer.toString("utf-8"));
      } catch {
        return {
          ok: false,
          message: `${target.name} was not valid JSON.`,
        };
      }
    }

    const previewText = buildPreviewText(structured);
    return { ok: true, structuredData: structured, previewText };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? `Adobe extract error: ${error.message.slice(0, 200)}`
          : "Adobe extract error.",
    };
  }
}

/**
 * Walk the Adobe `structuredData.json` shape and concatenate text
 * found on each element. Adobe uses an `elements` array; each element
 * may have a `Text` field plus other structural fields. We pull just
 * the user-readable text into a single preview string.
 */
function buildPreviewText(structured: unknown): string {
  if (!structured || typeof structured !== "object") return "";
  const root = structured as { elements?: unknown };
  if (!Array.isArray(root.elements)) return "";

  const lines: string[] = [];
  for (const el of root.elements) {
    if (!el || typeof el !== "object") continue;
    const text = (el as { Text?: unknown }).Text;
    if (typeof text === "string" && text.trim().length > 0) {
      lines.push(text);
    }
  }
  // Trim to a reasonable preview size — the UI is for review, not full
  // archive. Larger documents still have their full structuredData.json
  // persisted in `extractedJson` for downstream use.
  const joined = lines.join("\n");
  const MAX = 8000;
  if (joined.length <= MAX) return joined;
  return `${joined.slice(0, MAX)}\n\n…(truncated · full text retained server-side)`;
}
