import { NextResponse, type NextRequest } from "next/server";
import {
  buildGoogleAuthUrl,
  computeRedirectUri,
  generateOAuthState,
  hasGoogleClient,
  isGmailDraftsEnabled,
  setOAuthState,
} from "@/lib/google-gmail";

/**
 * Initiates the Google OAuth consent flow for Gmail compose. Sets a
 * one-time state cookie and a return-to cookie, then 302s the browser
 * to Google's consent screen. Node runtime is required because the
 * helper uses `node:crypto` for cookie encryption.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!hasGoogleClient()) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Google client is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET on the server.",
      },
      { status: 503 }
    );
  }
  if (!isGmailDraftsEnabled()) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Gmail drafts are disabled. Set GOOGLE_GMAIL_DRAFTS_ENABLED=true on the server.",
      },
      { status: 503 }
    );
  }

  const returnTo = request.nextUrl.searchParams.get("returnTo") ?? "/";
  // Allow only same-origin return paths to prevent open-redirect.
  const safeReturnTo = returnTo.startsWith("/") ? returnTo : "/";
  const state = generateOAuthState();
  await setOAuthState(state, safeReturnTo);

  const redirectUri = computeRedirectUri(request.nextUrl.origin);
  const authUrl = buildGoogleAuthUrl({ redirectUri, state });
  return NextResponse.redirect(authUrl);
}
