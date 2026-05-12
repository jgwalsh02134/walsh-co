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

async function downloadExtractZip(downloadUri: string): Promise<Buffer> {
  const response = await fetch(downloadUri, { method: "GET", cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Adobe extract download failed (HTTP ${response.status}).`);
  }
  const ab = await response.arrayBuffer();
  return Buffer.from(ab);
}

// =============================================================
// Minimal ZIP extractor — single entry, deflate or stored.
// Avoids adding `jszip` as a dependency. The Adobe Extract ZIP is
// small (typically <500 KB) and always contains `structuredData.json`
// at the root.
// =============================================================

function extractFileFromZip(zip: Buffer, fileName: string): Buffer | null {
  if (zip.length < 22) return null;

  // Locate End-of-Central-Directory record (signature 0x06054b50).
  // It sits within the last 64 KB of the file in spec; we search from
  // the end backward.
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

  let cdPos = centralDirOffset;
  while (cdPos < cdEnd) {
    if (zip.readUInt32LE(cdPos) !== 0x02014b50) return null;
    const fileNameLen = zip.readUInt16LE(cdPos + 28);
    const extraLen = zip.readUInt16LE(cdPos + 30);
    const commentLen = zip.readUInt16LE(cdPos + 32);
    const localHeaderOffset = zip.readUInt32LE(cdPos + 42);
    const entryName = zip
      .subarray(cdPos + 46, cdPos + 46 + fileNameLen)
      .toString("utf-8");

    if (entryName === fileName) {
      if (zip.readUInt32LE(localHeaderOffset) !== 0x04034b50) return null;
      const method = zip.readUInt16LE(localHeaderOffset + 8);
      const compressedSize = zip.readUInt32LE(localHeaderOffset + 18);
      const localFileNameLen = zip.readUInt16LE(localHeaderOffset + 26);
      const localExtraLen = zip.readUInt16LE(localHeaderOffset + 28);
      const dataStart =
        localHeaderOffset + 30 + localFileNameLen + localExtraLen;
      const compressed = zip.subarray(dataStart, dataStart + compressedSize);

      if (method === 0) return Buffer.from(compressed);
      if (method === 8) return zlib.inflateRawSync(compressed);
      return null;
    }
    cdPos += 46 + fileNameLen + extraLen + commentLen;
  }
  return null;
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
      return {
        ok: false,
        message: `Adobe extract failed: ${job.error?.message ?? job.error?.code ?? "unknown error"}`,
      };
    }
    if (!job.content?.downloadUri) {
      return {
        ok: false,
        message: "Adobe extract finished without a download URI.",
      };
    }

    const zip = await downloadExtractZip(job.content.downloadUri);
    const structuredBuffer = extractFileFromZip(zip, "structuredData.json");
    if (!structuredBuffer) {
      return {
        ok: false,
        message: "structuredData.json not found in Adobe extract ZIP.",
      };
    }

    let structured: unknown;
    try {
      structured = JSON.parse(structuredBuffer.toString("utf-8"));
    } catch {
      return {
        ok: false,
        message: "structuredData.json was not valid JSON.",
      };
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
