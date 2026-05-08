/**
 * Server-only Microsoft Graph helper.
 *
 * Status: foundation only. The app currently sits behind Cloudflare
 * Access (network-perimeter SSO via Entra) but has no app-native MSAL
 * flow, so the workspace does not yet hold a Microsoft Graph access
 * token of its own. Until that token source exists, this module reads
 * `MS_GRAPH_ACCESS_TOKEN` from the environment as a documented bridge.
 *
 * To enable in production:
 *   1. Add a Microsoft Entra app registration with a redirect URI for
 *      this app's domain.
 *   2. Wire MSAL (or another OAuth2 client) into the app to acquire a
 *      delegated user token at sign-in, with offline_access for refresh.
 *   3. Replace `getGraphToken` with the per-user token from that flow.
 *
 * Required Microsoft Graph delegated permissions for the wider workspace:
 *   - User.Read              (sign-in identity)
 *   - Mail.ReadWrite         (create / read / update Outlook drafts)
 *   - Calendars.ReadWrite    (future: workspace calendar)
 *   - Files.ReadWrite        (future: OneDrive document upload)
 *   - offline_access         (refresh tokens)
 *
 * This first pass uses ONLY Mail.ReadWrite. Drafts are created with the
 * `POST /me/messages` endpoint, which produces a draft (not sent). No
 * sendMail call exists in this module.
 */

if (typeof window !== "undefined") {
  throw new Error(
    "src/lib/microsoft-graph.ts is server-only and must not be imported on the client."
  );
}

const GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0";

export type GraphTokenResult =
  | { ok: true; token: string }
  | { ok: false; reason: "missing"; permissionScope: GraphScope };

export type GraphScope =
  | "User.Read"
  | "Mail.ReadWrite"
  | "Calendars.ReadWrite"
  | "Files.ReadWrite"
  | "offline_access";

export type DraftEmailInput = {
  /** Optional recipient address. Drafts can be saved with no recipient
   *  (the user fills it in Outlook). */
  to?: string | null;
  subject: string;
  body: string;
  /** Optional content type. Defaults to "Text" so the body is rendered
   *  literally — no HTML injection from upstream input. */
  contentType?: "Text" | "HTML";
};

export type DraftEmailResult =
  | {
      ok: true;
      /** Microsoft Graph message id (`message.id`). */
      messageId: string;
      /** Outlook web URL for opening the draft directly. */
      webLink: string;
    }
  | {
      ok: false;
      /** Friendly, non-secret error message safe to show to the user. */
      message: string;
      /** Optional Graph permission scope to request when this is a 403/auth
       *  failure. The UI surfaces this as "Microsoft Graph permission
       *  needed: <scope>." */
      permissionScope?: GraphScope;
    };

/**
 * True only when a Microsoft Graph token is currently available to the
 * server. The UI uses this to decide whether to show "Draft email" as
 * an active button or as a permissions-needed hint.
 */
export function hasGraphToken(): boolean {
  return Boolean(process.env.MS_GRAPH_ACCESS_TOKEN?.trim());
}

/**
 * Read the Graph access token from the environment. In a future pass
 * this will be replaced with an MSAL-acquired per-user token tied to
 * the signed-in Entra identity. Returns a tagged union so callers can
 * surface the missing-permission state without throwing.
 */
function getGraphToken(): GraphTokenResult {
  const token = process.env.MS_GRAPH_ACCESS_TOKEN?.trim();
  if (!token) {
    return { ok: false, reason: "missing", permissionScope: "Mail.ReadWrite" };
  }
  return { ok: true, token };
}

/**
 * Create an Outlook draft message under the signed-in user's mailbox.
 * Uses `POST /me/messages`, which produces a draft (NOT sent). There is
 * no companion send action in this module — by design — so a wiring
 * regression cannot accidentally send mail.
 */
export async function createOutlookDraftMessage(
  input: DraftEmailInput
): Promise<DraftEmailResult> {
  const tokenResult = getGraphToken();
  if (!tokenResult.ok) {
    return {
      ok: false,
      message:
        "Microsoft Graph permission needed: Mail.ReadWrite. Sign-in token is not yet available to the workspace — see README §Auth.",
      permissionScope: tokenResult.permissionScope,
    };
  }

  const subject = input.subject.trim();
  if (!subject) {
    return {
      ok: false,
      message: "Draft subject is required.",
    };
  }

  const payload = {
    subject,
    body: {
      contentType: input.contentType ?? "Text",
      content: input.body,
    },
    toRecipients:
      input.to && input.to.trim().length > 0
        ? [{ emailAddress: { address: input.to.trim() } }]
        : [],
  };

  let response: Response;
  try {
    response = await fetch(`${GRAPH_BASE_URL}/me/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenResult.token}`,
        "Content-Type": "application/json",
        Prefer: 'IdType="ImmutableId"',
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? `Network error reaching Microsoft Graph: ${error.message.slice(0, 180)}`
          : "Network error reaching Microsoft Graph.",
    };
  }

  if (response.status === 401 || response.status === 403) {
    return {
      ok: false,
      message:
        "Microsoft Graph permission needed: Mail.ReadWrite. The configured token does not have permission to create Outlook drafts.",
      permissionScope: "Mail.ReadWrite",
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      message: `Microsoft Graph returned HTTP ${response.status}.`,
    };
  }

  const raw = (await response.json().catch(() => null)) as
    | { id?: string; webLink?: string }
    | null;
  if (!raw?.id) {
    return {
      ok: false,
      message: "Graph response did not include a message id.",
    };
  }

  return {
    ok: true,
    messageId: raw.id,
    webLink:
      raw.webLink ??
      `https://outlook.office.com/mail/drafts/id/${encodeURIComponent(raw.id)}`,
  };
}
