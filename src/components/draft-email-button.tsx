"use client";

/**
 * Small inline button that triggers the createOutlookDraftEmail server
 * action. Shows a calm permission-required hint when Microsoft Graph
 * is not yet wired (no app-side token available), and a "Open draft"
 * link to Outlook when a draft has been created.
 *
 * Drop-in usage:
 *   <DraftEmailButton
 *     graphAvailable={hasGraphToken()}      // computed server-side
 *     to="vendor@example.com"
 *     subject="Bid clarification: 322 Osborne — roofing scope"
 *     body="…"
 *     context={{ kind: "bid", label: "Northline Roofing — 322 Osborne" }}
 *     compact
 *   />
 */

import { useActionState } from "react";
import {
  createOutlookDraftEmail,
  type DraftEmailActionResult,
  type DraftEmailContext,
} from "@/lib/draft-email-actions";

export type DraftEmailButtonProps = {
  graphAvailable: boolean;
  to?: string | null;
  subject: string;
  body: string;
  context?: DraftEmailContext;
  /** Compact inline pill style for use inside row layouts. */
  compact?: boolean;
  /** Override the default button label. */
  label?: string;
};

export function DraftEmailButton({
  graphAvailable,
  to,
  subject,
  body,
  context,
  compact = false,
  label = "Draft email",
}: DraftEmailButtonProps) {
  const [state, action, pending] = useActionState<
    DraftEmailActionResult | null,
    FormData
  >(createOutlookDraftEmail, null);

  if (!graphAvailable) {
    return (
      <span
        title="Microsoft Graph permission needed: Mail.ReadWrite. Sign-in token is not yet available to the workspace."
        className={
          compact
            ? "inline-flex min-h-[28px] cursor-not-allowed items-center rounded-full border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--workspace-text-muted)]"
            : "inline-flex min-h-[36px] cursor-not-allowed items-center rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-surface-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--workspace-text-muted)]"
        }
      >
        Microsoft Graph: permission needed
      </span>
    );
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
        className={
          compact
            ? "inline-flex min-h-[28px] items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--workspace-text-secondary)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] disabled:cursor-progress disabled:opacity-60"
            : "inline-flex min-h-[36px] items-center rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--workspace-text)] transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] disabled:cursor-progress disabled:opacity-60"
        }
      >
        {pending ? "Drafting…" : label}
      </button>
      {state ? <DraftStatusInline state={state} compact={compact} /> : null}
    </form>
  );
}

function DraftStatusInline({
  state,
  compact,
}: {
  state: DraftEmailActionResult;
  compact: boolean;
}) {
  if (state.ok) {
    return (
      <a
        href={state.webLink}
        target="_blank"
        rel="noreferrer"
        className={
          compact
            ? "ml-1 inline-flex items-center rounded-full border border-[var(--status-success-border)] bg-[var(--status-success-bg)] px-2 py-0.5 text-[11px] font-semibold text-[var(--status-success)] hover:underline"
            : "ml-1 inline-flex items-center rounded-md border border-[var(--status-success-border)] bg-[var(--status-success-bg)] px-2 py-1 text-xs font-semibold text-[var(--status-success)] hover:underline"
        }
      >
        Draft saved · open in Outlook
      </a>
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
