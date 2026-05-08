import { NextResponse, type NextRequest } from "next/server";
import {
  computeRedirectUri,
  consumeOAuthState,
  exchangeAuthorizationCode,
  hasGoogleClient,
  setGoogleSession,
} from "@/lib/google-gmail";

/**
 * Google OAuth callback. Validates the one-time state cookie, exchanges
 * the auth code for tokens, encrypts and stores them in an httpOnly
 * cookie, then redirects back to the page the user came from. Node
 * runtime is required for `node:crypto` cookie encryption.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!hasGoogleClient()) {
    return NextResponse.json(
      { ok: false, message: "Google client is not configured." },
      { status: 503 }
    );
  }

  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const incomingState = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  // Always consume the state cookie so it cannot be replayed.
  const { state: storedState, returnTo } = await consumeOAuthState();
  const safeReturnTo = returnTo.startsWith("/") ? returnTo : "/";

  if (oauthError) {
    return NextResponse.redirect(
      buildReturnUrl(url.origin, safeReturnTo, {
        google_error: oauthError,
      })
    );
  }
  if (!code) {
    return NextResponse.redirect(
      buildReturnUrl(url.origin, safeReturnTo, { google_error: "missing_code" })
    );
  }
  if (!storedState || !incomingState || storedState !== incomingState) {
    return NextResponse.redirect(
      buildReturnUrl(url.origin, safeReturnTo, {
        google_error: "state_mismatch",
      })
    );
  }

  const redirectUri = computeRedirectUri(url.origin);
  const result = await exchangeAuthorizationCode({ code, redirectUri });
  if (!result.ok) {
    return NextResponse.redirect(
      buildReturnUrl(url.origin, safeReturnTo, {
        google_error: "token_exchange_failed",
      })
    );
  }

  await setGoogleSession(result.session);
  return NextResponse.redirect(
    buildReturnUrl(url.origin, safeReturnTo, { google_connected: "1" })
  );
}

function buildReturnUrl(
  origin: string,
  returnPath: string,
  params: Record<string, string>
): string {
  const u = new URL(returnPath, origin);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  return u.toString();
}
