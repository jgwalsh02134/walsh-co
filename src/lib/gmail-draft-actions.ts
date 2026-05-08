"use server";

/**
 * Server actions for creating Gmail drafts via the Google Gmail API.
 *
 * Drafts only — there is no `send` action and the underlying helper
 * does not implement send. The action is callable from contact, bid,
 * and task UI entry points; each passes a `context` label that gets
 * appended to the draft body so the recipient can see which workspace
 * item the message is about.
 */

import { revalidatePath } from "next/cache";
import {
  clearGoogleSession,
  createGmailDraft,
  type GmailDraftResult,
} from "@/lib/google-gmail";

export type GmailDraftActionResult = GmailDraftResult;

export type GmailDraftContextKind = "contact" | "bid" | "task";

export async function createGmailDraftEmail(
  _prev: GmailDraftActionResult | null,
  formData: FormData
): Promise<GmailDraftActionResult> {
  const to = stringOrNull(formData.get("to"));
  const subject = stringOrEmpty(formData.get("subject"));
  const body = stringOrEmpty(formData.get("body"));
  const contextKind = stringOrNull(formData.get("contextKind"));
  const contextLabel = stringOrNull(formData.get("contextLabel"));

  if (!subject || !body) {
    return {
      ok: false,
      message: "Subject and body are required to create a draft.",
    };
  }

  const contextFooter =
    contextKind && contextLabel
      ? `\n\n— Workspace context: ${contextKind} · ${contextLabel}`
      : "";

  return createGmailDraft({
    to,
    subject,
    body: `${body}${contextFooter}`,
  });
}

/**
 * Disconnect Google by clearing the session cookie. The token itself
 * is not revoked at Google — the user can do that from their Google
 * account if they want to. This is an explicit user action; never
 * called automatically.
 */
export async function disconnectGoogle(): Promise<{ ok: true }> {
  await clearGoogleSession();
  revalidatePath("/settings");
  return { ok: true };
}

function stringOrNull(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function stringOrEmpty(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}
