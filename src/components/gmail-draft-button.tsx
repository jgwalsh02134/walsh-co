"use client";

/**
 * Inline button that creates a Gmail draft via the gmail-draft-actions
 * server action. Visual states:
 *
 *   1. Not configured — Gmail integration is gated off (no env vars).
 *   2. Not connected   — env vars present but no Google session cookie.
 *      Renders a "Connect Google" link to the OAuth start route.
 *   3. Connected       — primary "Draft email" button.
 *   4. Pending         — "Drafting…" label.
 *   5. Success         — green "Draft saved · open in Gmail" link.
 *   6. Error           — amber inline message; if `needsConnect` or
 *      `needsScope` is set, the message is shown alongside a
 *      "Connect Google" / "Reconnect Google" CTA.
 *
 * Tokens never reach the client. The caller passes only booleans
 * (`enabled`, `connected`) computed server-side.
 */

import { useActionState } from "react";
import {
  createGmailDraftEmail,
  type GmailDraftActionResult,
  type GmailDraftContextKind,
} from "@/lib/gmail-draft-actions";

export type GmailDraftButtonProps = {
  /** True when GOOGLE_CLIENT_ID/SECRET are configured AND
   *  GOOGLE_GMAIL_DRAFTS_ENABLED is true. */
  enabled: boolean;
  /** True when there is a valid Google session cookie. */
  connected: boolean;
  to?: string | null;
  subject: string;
  body: string;
  context?: { kind: GmailDraftContextKind; label: string };
  /** Path to return to after OAuth, encoded into the start URL. */
  returnTo?: string;
  /** Compact inline pill style for use inside row layouts. */
  compact?: boolean;
  /** Override the default button label. */
  label?: string;
};

export function GmailDraftButton({
  enabled,
  connected,
  to,
  subject,
  body,
  context,
  returnTo = "/",
  compact = false,
  label = "Draft email",
}: GmailDraftButtonProps) {
  const [state, action, pending] = useActionState<
    GmailDraftActionResult | null,
    FormData
  >(createGmailDraftEmail, null);

  if (!enabled) {
    return (
      <span
        title="Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_GMAIL_DRAFTS_ENABLED on the server to enable Gmail drafts."
        className={pillClass(compact, "muted")}
      >
        <GmailIcon />
        Gmail drafts not configured
      </span>
    );
  }

  if (!connected) {
    return <ConnectGoogleLink returnTo={returnTo} compact={compact} />;
  }

  return (
    <form action={action} className="contents">
      {to ? <input type="hidden" name="to" value={to} /> : null}
      <input type="hidden" name="subject" value={subject} />
      <input type="hidden" name="body" value={body} />
      {context ? (
        <>
          <input type="hidden" name="contextKind" value={context.kind} />
          <input type="hidden" name="contextLabel" value={context.label} />
        </>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className={pillClass(compact, "active")}
      >
        <GmailIcon />
        {pending ? "Drafting…" : label}
      </button>
      {state ? (
        <DraftStatus state={state} compact={compact} returnTo={returnTo} />
      ) : null}
    </form>
  );
}

// =============================================================
// Connect / status / Gmail icon helpers
// =============================================================

function ConnectGoogleLink({
  returnTo,
  compact,
}: {
  returnTo: string;
  compact: boolean;
}) {
  const href = `/api/auth/google/start?returnTo=${encodeURIComponent(returnTo)}`;
  return (
    <a href={href} className={pillClass(compact, "active")}>
      <GmailIcon />
      Connect Google to draft email
    </a>
  );
}

function DraftStatus({
  state,
  compact,
  returnTo,
}: {
  state: GmailDraftActionResult;
  compact: boolean;
  returnTo: string;
}) {
  if (state.ok) {
    return (
      <a
        href={state.webUrl}
        target="_blank"
        rel="noreferrer"
        className={
          compact
            ? "ml-1 inline-flex items-center gap-1.5 rounded-full border border-[var(--status-success-border)] bg-[var(--status-success-bg)] px-2 py-0.5 text-[11px] font-semibold text-[var(--status-success)] hover:underline"
            : "ml-1 inline-flex items-center gap-1.5 rounded-md border border-[var(--status-success-border)] bg-[var(--status-success-bg)] px-2 py-1 text-xs font-semibold text-[var(--status-success)] hover:underline"
        }
      >
        <GmailIcon />
        Saved as Gmail draft · open
      </a>
    );
  }

  // Failure paths
  if (state.needsConnect || state.needsScope) {
    return (
      <span className="ml-1 inline-flex items-center gap-2 text-[11px]">
        <span
          className={
            compact
              ? "rounded-full border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-2 py-0.5 font-semibold text-[var(--status-warning)]"
              : "rounded-md border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-2 py-1 font-semibold text-[var(--status-warning)]"
          }
        >
          {state.needsScope
            ? "Google permission needed: Gmail compose."
            : state.message}
        </span>
        <ConnectGoogleLink returnTo={returnTo} compact={compact} />
      </span>
    );
  }

  return (
    <span
      className={
        compact
          ? "ml-1 inline-flex items-center rounded-full border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-2 py-0.5 text-[11px] font-semibold text-[var(--status-warning)]"
          : "ml-1 inline-flex items-center rounded-md border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-2 py-1 text-xs font-semibold text-[var(--status-warning)]"
      }
    >
      {state.message}
    </span>
  );
}

function GmailIcon() {
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src="/icons/workspace/gmail-icon.svg"
      alt=""
      aria-hidden
      width={16}
      height={16}
      className="inline-block shrink-0"
    />
  );
}

function pillClass(compact: boolean, variant: "active" | "muted"): string {
  if (variant === "muted") {
    return compact
      ? "inline-flex min-h-[28px] cursor-not-allowed items-center gap-1.5 rounded-full border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--workspace-text-muted)]"
      : "inline-flex min-h-[36px] cursor-not-allowed items-center gap-1.5 rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-surface-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--workspace-text-muted)]";
  }
  return compact
    ? "inline-flex min-h-[28px] items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--workspace-text-secondary)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] disabled:cursor-progress disabled:opacity-60"
    : "inline-flex min-h-[36px] items-center gap-1.5 rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--workspace-text)] transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] disabled:cursor-progress disabled:opacity-60";
}
