"use server";

/**
 * Server actions for creating Outlook drafts via Microsoft Graph.
 *
 * Drafts only — there is no `sendMail` companion action and the helper
 * does not implement send. The action is callable from contact, bid,
 * and task UI entry points; each passes a `context` label that gets
 * surfaced in the draft body so the recipient can see which workspace
 * item the message is about.
 */

import {
  createOutlookDraftMessage,
  type DraftEmailResult,
} from "@/lib/microsoft-graph";

export type DraftEmailContext =
  | { kind: "contact"; label: string }
  | { kind: "bid"; label: string; propertyAddress?: string | null }
  | { kind: "task"; label: string };

export type DraftEmailActionInput = {
  to?: string | null;
  subject: string;
  body: string;
  context?: DraftEmailContext;
};

export type DraftEmailActionResult = DraftEmailResult;

/**
 * Create an Outlook draft email under the signed-in user's mailbox.
 *
 * The draft is NOT sent. If a Microsoft Graph token is not available
 * to the server, the action returns a friendly permission-required
 * state which the UI surfaces as an inline hint.
 */
export async function createOutlookDraftEmail(
  _prev: DraftEmailActionResult | null,
  formData: FormData
): Promise<DraftEmailActionResult> {
  const to = stringOrNull(formData.get("to"));
  const subject = stringOrEmpty(formData.get("subject"));
  const body = stringOrEmpty(formData.get("body"));
  const contextLabel = stringOrNull(formData.get("contextLabel"));
  const contextKind = stringOrNull(formData.get("contextKind"));

  if (!subject || !body) {
    return {
      ok: false,
      message: "Subject and body are required to create a draft.",
    };
  }

  // Append a small workspace-context footer to the body so the draft is
  // self-explanatory when the user opens it in Outlook. Plain text only.
  const contextFooter =
    contextKind && contextLabel
      ? `\n\n— Workspace context: ${contextKind} · ${contextLabel}`
      : "";

  return createOutlookDraftMessage({
    to,
    subject,
    body: `${body}${contextFooter}`,
    contentType: "Text",
  });
}

function stringOrNull(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function stringOrEmpty(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}
