/**
 * Server-only Google OAuth + Gmail helper.
 *
 * Scope: a single delegated scope `gmail.compose`. No `gmail.send`, no
 * read scopes. The helper creates Gmail DRAFTS only — there is no
 * sendMail call anywhere in this module by design.
 *
 * Token storage: encrypted httpOnly cookie. We intentionally do NOT
 * persist Google tokens to the Postgres database in this first pass to
 * avoid a schema change. Tradeoffs of the cookie approach:
 *
 *   - Simple, no migration, no token table to secure separately.
 *   - Single-browser / single-device. Connecting Google in one browser
 *     does not connect it in another. Acceptable for a small private
 *     workspace.
 *   - Cookie is encrypted with AES-256-GCM using a key derived from
 *     `GOOGLE_CLIENT_SECRET` via SHA-256, so rotating the OAuth client
 *     secret invalidates all existing sessions (which is the desired
 *     behaviour after a credential rotation).
 *   - `httpOnly: true`, `secure: true`, `sameSite: "lax"`. The cookie
 *     is never read by client JS; only server-side helpers in this
 *     file decrypt it.
 *
 * Existing Cloudflare Access / Microsoft Entra login is unchanged —
 * this module sits on top of that perimeter SSO and does not replace
 * it.
 */

import crypto from "node:crypto";
import { cookies } from "next/headers";

if (typeof window !== "undefined") {
  throw new Error(
    "src/lib/google-gmail.ts is server-only and must not be imported on the client."
  );
}

// =============================================================
// Configuration
// =============================================================

const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1";
const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_OAUTH_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

/** Single delegated scope. Drafts only. */
export const GMAIL_COMPOSE_SCOPE =
  "https://www.googleapis.com/auth/gmail.compose";

const SESSION_COOKIE = "gw_google_session";
const STATE_COOKIE = "gw_google_oauth_state";
const RETURN_TO_COOKIE = "gw_google_oauth_return_to";

const STATE_COOKIE_MAX_AGE = 60 * 10; // 10 minutes
const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 90; // 90 days

// =============================================================
// Public types
// =============================================================

export type GoogleTokenSession = {
  accessToken: string;
  /** Refresh token may be absent if the user previously consented and
   *  Google declined to re-issue. We force prompt=consent on the auth
   *  URL to maximize the chance of receiving one. */
  refreshToken: string | null;
  /** UNIX seconds when the access token expires. */
  expiresAt: number;
  /** Email of the connected Google account, when available. */
  email: string | null;
};

export type GmailDraftInput = {
  /** Optional recipient address. Drafts may be saved with no recipient. */
  to?: string | null;
  subject: string;
  body: string;
};

export type GmailDraftResult =
  | {
      ok: true;
      /** Gmail draft id. */
      draftId: string;
      /** Web URL to open the draft in Gmail. */
      webUrl: string;
    }
  | {
      ok: false;
      message: string;
      /** Set when the failure is "Google not connected" so the UI can
       *  show a Connect-Google CTA instead of a generic error. */
      needsConnect?: boolean;
      /** Set when the failure is a missing scope (e.g. user revoked
       *  gmail.compose between sessions). */
      needsScope?: boolean;
    };

// =============================================================
// Configuration accessors
// =============================================================

export function hasGoogleClient(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() &&
      process.env.GOOGLE_CLIENT_SECRET?.trim()
  );
}

export function isGmailDraftsEnabled(): boolean {
  if (!hasGoogleClient()) return false;
  return process.env.GOOGLE_GMAIL_DRAFTS_ENABLED?.trim() === "true";
}

function getClientId(): string {
  const v = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!v) throw new Error("GOOGLE_CLIENT_ID is not configured.");
  return v;
}

function getClientSecret(): string {
  const v = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!v) throw new Error("GOOGLE_CLIENT_SECRET is not configured.");
  return v;
}

/**
 * Compute the absolute redirect URI to send to Google.
 *
 * Google requires the value at consent and the value at token exchange
 * to match EXACTLY one of the redirect URIs registered on the OAuth
 * client. The inbound request origin is unreliable on Railway because
 * the container is reached over `localhost:<PORT>` (typically 8080)
 * even though Cloudflare Access proxies the public `app.walshco.ltd`
 * traffic to it — so deriving from `request.nextUrl.origin` produced
 * `https://localhost:8080/api/auth/google/callback` and Google
 * rejected it with `redirect_uri_mismatch`.
 *
 * Resolution order:
 *   1. `GOOGLE_OAUTH_REDIRECT_URI` (preferred, set on Railway).
 *      Used verbatim — no normalization, no path mutation.
 *   2. Derived from `origin` — kept for local development where the
 *      browser-visible origin matches the server's bound origin.
 *   3. `http://localhost:3000/api/auth/google/callback` — last-resort
 *      default for `next dev` when nothing else is available.
 *
 * Both the OAuth start route and the callback route call this helper
 * so the value at consent and the value at token exchange are
 * guaranteed to be identical.
 */
export function computeRedirectUri(origin?: string): string {
  const fromEnv = process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim();
  if (fromEnv) return fromEnv;
  if (origin) return new URL("/api/auth/google/callback", origin).toString();
  return "http://localhost:3000/api/auth/google/callback";
}

// =============================================================
// Token cookie encryption (AES-256-GCM)
// =============================================================

function deriveCookieKey(): Buffer {
  // Key is deterministic for a given GOOGLE_CLIENT_SECRET. Rotating
  // the OAuth client secret therefore invalidates every existing
  // Google session, which is the right behaviour after a rotation.
  return crypto.createHash("sha256").update(getClientSecret()).digest();
}

function encryptSession(session: GoogleTokenSession): string {
  const iv = crypto.randomBytes(12);
  const key = deriveCookieKey();
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(session), "utf-8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Stored format: base64url( iv | authTag | ciphertext )
  const blob = Buffer.concat([iv, authTag, encrypted]);
  return blob.toString("base64url");
}

function decryptSession(token: string): GoogleTokenSession | null {
  try {
    const blob = Buffer.from(token, "base64url");
    if (blob.length < 12 + 16 + 1) return null;
    const iv = blob.subarray(0, 12);
    const authTag = blob.subarray(12, 28);
    const ciphertext = blob.subarray(28);
    const key = deriveCookieKey();
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);
    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf-8");
    const parsed = JSON.parse(plaintext) as GoogleTokenSession;
    if (typeof parsed?.accessToken !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

// =============================================================
// Session helpers
// =============================================================

export async function getGoogleSession(): Promise<GoogleTokenSession | null> {
  if (!hasGoogleClient()) return null;
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return decryptSession(token);
}

export async function setGoogleSession(
  session: GoogleTokenSession
): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, encryptSession(session), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_COOKIE_MAX_AGE,
  });
}

export async function clearGoogleSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

/** Convenience boolean for UI gating. */
export async function isGoogleConnected(): Promise<boolean> {
  if (!hasGoogleClient()) return false;
  const session = await getGoogleSession();
  return Boolean(session?.accessToken);
}

// =============================================================
// OAuth start + state helpers
// =============================================================

export async function setOAuthState(state: string, returnTo: string): Promise<void> {
  const jar = await cookies();
  jar.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: STATE_COOKIE_MAX_AGE,
  });
  jar.set(RETURN_TO_COOKIE, returnTo, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: STATE_COOKIE_MAX_AGE,
  });
}

export async function consumeOAuthState(): Promise<{
  state: string | null;
  returnTo: string;
}> {
  const jar = await cookies();
  const state = jar.get(STATE_COOKIE)?.value ?? null;
  const returnTo = jar.get(RETURN_TO_COOKIE)?.value ?? "/";
  jar.delete(STATE_COOKIE);
  jar.delete(RETURN_TO_COOKIE);
  return { state, returnTo };
}

/** Build the Google OAuth consent URL. Includes prompt=consent so we
 *  reliably receive a refresh token on first connect. */
export function buildGoogleAuthUrl(input: {
  redirectUri: string;
  state: string;
}): string {
  const url = new URL(GOOGLE_OAUTH_AUTH_URL);
  url.searchParams.set("client_id", getClientId());
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GMAIL_COMPOSE_SCOPE);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", input.state);
  return url.toString();
}

export function generateOAuthState(): string {
  return crypto.randomBytes(32).toString("base64url");
}

// =============================================================
// Token exchange + refresh
// =============================================================

type GoogleTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
  id_token?: string;
};

/**
 * Exchange the authorization code received on the callback for a
 * token set. Returns a structured session ready to encrypt and store.
 */
export async function exchangeAuthorizationCode(input: {
  code: string;
  redirectUri: string;
}): Promise<{ ok: true; session: GoogleTokenSession } | { ok: false; message: string }> {
  let response: Response;
  try {
    response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: input.code,
        client_id: getClientId(),
        client_secret: getClientSecret(),
        redirect_uri: input.redirectUri,
        grant_type: "authorization_code",
      }),
      cache: "no-store",
    });
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? `Network error reaching Google: ${error.message.slice(0, 180)}`
          : "Network error reaching Google.",
    };
  }

  const body = (await response.json().catch(() => null)) as
    | (GoogleTokenResponse & { error?: string })
    | null;
  if (!response.ok || !body?.access_token) {
    return {
      ok: false,
      message: `Google token exchange failed (HTTP ${response.status}).`,
    };
  }

  const expiresAt = Math.floor(Date.now() / 1000) + (body.expires_in ?? 3600);
  const email = parseEmailFromIdToken(body.id_token);
  return {
    ok: true,
    session: {
      accessToken: body.access_token,
      refreshToken: body.refresh_token ?? null,
      expiresAt,
      email,
    },
  };
}

/**
 * Refresh the access token if it is within 60 seconds of expiry. Falls
 * back to returning the existing session unchanged when no refresh
 * token is available.
 */
async function refreshIfNeeded(
  session: GoogleTokenSession
): Promise<GoogleTokenSession | null> {
  const now = Math.floor(Date.now() / 1000);
  if (session.expiresAt - now > 60) return session;
  if (!session.refreshToken) return session;

  let response: Response;
  try {
    response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: getClientId(),
        client_secret: getClientSecret(),
        refresh_token: session.refreshToken,
        grant_type: "refresh_token",
      }),
      cache: "no-store",
    });
  } catch {
    return session; // Network error — keep the old token; the API call will fail and be reported.
  }

  if (!response.ok) return null; // Refresh failed (revoked / scope change). Caller should clear session.
  const body = (await response.json().catch(() => null)) as
    | GoogleTokenResponse
    | null;
  if (!body?.access_token) return null;
  const next: GoogleTokenSession = {
    accessToken: body.access_token,
    refreshToken: body.refresh_token ?? session.refreshToken,
    expiresAt: Math.floor(Date.now() / 1000) + (body.expires_in ?? 3600),
    email: session.email,
  };
  await setGoogleSession(next);
  return next;
}

function parseEmailFromIdToken(idToken: string | undefined): string | null {
  if (!idToken) return null;
  try {
    const parts = idToken.split(".");
    if (parts.length < 2) return null;
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf-8")
    );
    return typeof payload.email === "string" ? payload.email : null;
  } catch {
    return null;
  }
}

// =============================================================
// Gmail draft
// =============================================================

export async function createGmailDraft(
  input: GmailDraftInput
): Promise<GmailDraftResult> {
  if (!hasGoogleClient()) {
    return {
      ok: false,
      message:
        "Google client is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET on the server.",
    };
  }
  if (!isGmailDraftsEnabled()) {
    return {
      ok: false,
      message:
        "Gmail drafts are disabled in this environment. Set GOOGLE_GMAIL_DRAFTS_ENABLED=true to enable.",
    };
  }

  const stored = await getGoogleSession();
  if (!stored) {
    return {
      ok: false,
      message: "Connect Google to create Gmail drafts.",
      needsConnect: true,
    };
  }

  const session = await refreshIfNeeded(stored);
  if (!session) {
    await clearGoogleSession();
    return {
      ok: false,
      message:
        "Google session expired. Reconnect Google to create Gmail drafts.",
      needsConnect: true,
    };
  }

  const subject = input.subject.trim();
  if (!subject) {
    return { ok: false, message: "Draft subject is required." };
  }

  const mime = buildMimeMessage({
    to: input.to ?? null,
    subject,
    body: input.body,
  });

  let response: Response;
  try {
    response = await fetch(`${GMAIL_API_BASE}/users/me/drafts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: { raw: mime } }),
      cache: "no-store",
    });
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? `Network error reaching Gmail: ${error.message.slice(0, 180)}`
          : "Network error reaching Gmail.",
    };
  }

  if (response.status === 401) {
    return {
      ok: false,
      message: "Google session was rejected. Reconnect Google.",
      needsConnect: true,
    };
  }
  if (response.status === 403) {
    return {
      ok: false,
      message:
        "Google permission needed: Gmail compose. Reconnect Google to grant the gmail.compose scope.",
      needsScope: true,
    };
  }
  if (!response.ok) {
    return {
      ok: false,
      message: `Gmail returned HTTP ${response.status}.`,
    };
  }

  const raw = (await response.json().catch(() => null)) as
    | { id?: string }
    | null;
  if (!raw?.id) {
    return { ok: false, message: "Gmail response did not include a draft id." };
  }
  return {
    ok: true,
    draftId: raw.id,
    webUrl: "https://mail.google.com/mail/u/0/#drafts",
  };
}

/**
 * Build a minimal RFC 2822 MIME message and base64url-encode it for
 * Gmail's `users.drafts.create` payload. Plain text by design — no HTML
 * injection from upstream input.
 */
function buildMimeMessage(input: {
  to: string | null;
  subject: string;
  body: string;
}): string {
  const headerLines: string[] = [
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 7bit",
    `Subject: ${encodeHeaderValue(input.subject)}`,
  ];
  if (input.to && input.to.trim().length > 0) {
    headerLines.push(`To: ${encodeHeaderValue(input.to.trim())}`);
  }
  const message = `${headerLines.join("\r\n")}\r\n\r\n${input.body}`;
  return Buffer.from(message, "utf-8").toString("base64url");
}

/**
 * RFC 2047 encoded-word for header values that contain non-ASCII bytes.
 * Headers in the workspace are typically ASCII, but addresses and
 * subjects may contain Unicode (e.g. an em-dash) which would corrupt
 * the message if sent raw.
 */
function encodeHeaderValue(value: string): string {
  // eslint-disable-next-line no-control-regex
  if (/^[\x00-\x7F]*$/.test(value)) return value;
  const b64 = Buffer.from(value, "utf-8").toString("base64");
  return `=?UTF-8?B?${b64}?=`;
}
