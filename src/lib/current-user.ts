if (typeof window !== "undefined") {
  throw new Error(
    "src/lib/current-user.ts is server-only and must not be imported on the client."
  );
}

/**
 * Resolves the workspace's current authenticated user from the request
 * headers placed by Cloudflare Access + Microsoft Entra in front of the
 * app, and ensures a corresponding `User` row exists in Postgres.
 *
 * Header sources, in priority order:
 *   1. cf-access-authenticated-user-email   — set by Cloudflare Access
 *      after Entra completes SSO. Authoritative when present.
 *   2. x-forwarded-user                     — proxy fallback some Access
 *      configurations forward in addition to the email header.
 *   3. cf-access-jwt-assertion              — opaque JWT issued by
 *      Access. We intentionally do NOT verify or decode it here (no
 *      JWKS dependency in this pass); its presence is recorded only as
 *      a signal that Access ran. The token value never leaves the
 *      request — it is not logged, persisted, or echoed back.
 *
 * Local dev:
 *   - When none of the headers above are populated (typical for
 *     `next dev` outside the Cloudflare tunnel), `getCurrentUser`
 *     returns `null` and pages render in "anonymous" mode rather than
 *     failing.
 *   - You can simulate a user with `LOCAL_DEV_USER_EMAIL` /
 *     `LOCAL_DEV_USER_NAME` in `.env`. The env var is read only when
 *     `NODE_ENV !== "production"` so a misconfigured production
 *     deploy cannot impersonate users.
 *
 * Safety:
 *   - This module is server-only (guarded by a `window`-check at the
 *     top); importing it from a client component throws so the headers
 *     can never leak to the browser bundle.
 *   - The upsert is wrapped in try/catch so a missing/offline database
 *     does not break server components — pages still render with
 *     `null` and a "User identity unavailable" hint.
 *   - No tokens are persisted: only the email + (best-effort) display
 *     name derived from the email local-part.
 */

import { headers } from "next/headers";
import type { User } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type CurrentUser = User;

type IdentityHeaders = {
  email: string | null;
  displayName: string | null;
  /** True when an Access JWT was present on the request. Recorded for
   *  diagnostic copy only — the token value itself is never returned. */
  accessAssertionSeen: boolean;
};

function readIdentityHeaders(h: Headers): IdentityHeaders {
  const email =
    sanitizeEmail(h.get("cf-access-authenticated-user-email")) ??
    sanitizeEmail(h.get("x-forwarded-user")) ??
    (process.env.NODE_ENV !== "production"
      ? sanitizeEmail(process.env.LOCAL_DEV_USER_EMAIL ?? null)
      : null);

  const headerName = sanitizeName(h.get("cf-access-authenticated-user-name"));
  const envName =
    process.env.NODE_ENV !== "production"
      ? sanitizeName(process.env.LOCAL_DEV_USER_NAME ?? null)
      : null;

  return {
    email,
    displayName: headerName ?? envName ?? null,
    accessAssertionSeen: Boolean(h.get("cf-access-jwt-assertion")),
  };
}

function sanitizeEmail(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().toLowerCase();
  if (trimmed.length === 0 || trimmed.length > 320) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? trimmed : null;
}

function sanitizeName(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().slice(0, 120);
  return trimmed.length > 0 ? trimmed : null;
}

function fallbackNameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? email;
  return local
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Returns the upserted current `User` row, or `null` when the request
 * has no identity headers (local dev, mistakenly-public route, etc.).
 *
 * Safe to call from server components and server actions; each call is
 * a single upsert keyed on `email`. Errors (e.g. DB unreachable) are
 * swallowed and surfaced as `null` so a transient outage downgrades to
 * "anonymous" rendering rather than a 500.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const h = await headers();
  const identity = readIdentityHeaders(h);
  if (!identity.email) return null;

  const displayName =
    identity.displayName ?? fallbackNameFromEmail(identity.email);

  try {
    return await prisma.user.upsert({
      where: { email: identity.email },
      update: {
        // Only update the display name when we have a non-empty one;
        // never overwrite a human-edited name with a derived fallback.
        ...(identity.displayName ? { name: identity.displayName } : {}),
        lastSeenAt: new Date(),
      },
      create: {
        email: identity.email,
        name: displayName,
        lastSeenAt: new Date(),
      },
    });
  } catch {
    return null;
  }
}

/**
 * Lightweight, read-only variant for surfaces that only need to display
 * the signed-in identity (e.g. the Settings page header) without
 * touching the database. Returns the raw header view, including a
 * `present` flag the UI uses to render the "unavailable in local dev"
 * hint when both header sources are empty.
 */
export async function readIdentityFromHeaders(): Promise<{
  present: boolean;
  email: string | null;
  displayName: string | null;
  accessAssertionSeen: boolean;
}> {
  const h = await headers();
  const identity = readIdentityHeaders(h);
  return {
    present: Boolean(identity.email),
    email: identity.email,
    displayName:
      identity.displayName ??
      (identity.email ? fallbackNameFromEmail(identity.email) : null),
    accessAssertionSeen: identity.accessAssertionSeen,
  };
}
