"use client";

/**
 * Per-document button that triggers AI review of Adobe-extracted text.
 *
 * Disabled state is rendered when:
 *   - extraction has not produced a draft yet (`extractionReady === false`)
 *   - no AI provider is configured server-side (`reviewReady === false`)
 *
 * The parent owns the readiness flags so this component does no env
 * inspection itself. Tokens stay server-side; this component only
 * receives the document id and a few booleans.
 */
import { useActionState } from "react";
import {
  reviewExtractedDocumentWithAiAction,
  type ReviewExtractedDocumentState,
} from "@/lib/google-drive-actions";

export type AiDocumentReviewButtonProps = {
  documentId: string;
  /** True when the document has extracted text ready for review. */
  extractionReady: boolean;
  /** True when an AI provider (OpenAI default, xAI fallback) is configured. */
  reviewReady: boolean;
  /** Short copy explaining why the button is disabled. */
  disabledReason: string;
  /** Drives label between first run and re-run. */
  alreadyReviewed: boolean;
};

export function AiDocumentReviewButton({
  documentId,
  extractionReady,
  reviewReady,
  disabledReason,
  alreadyReviewed,
}: AiDocumentReviewButtonProps) {
  const [state, action, pending] = useActionState<
    ReviewExtractedDocumentState,
    FormData
  >(reviewExtractedDocumentWithAiAction, null);

  if (!extractionReady || !reviewReady) {
    return (
      <span
        aria-disabled
        title={disabledReason}
        className="inline-flex min-h-[28px] cursor-not-allowed items-center gap-1.5 rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--workspace-text-muted)]"
      >
        <AiIcon />
        Review extracted text with AI
      </span>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-1">
      <input type="hidden" name="documentId" value={documentId} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-[28px] items-center gap-1.5 rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--workspace-text)] transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)] disabled:cursor-progress disabled:opacity-60"
      >
        <AiIcon />
        {pending
          ? "Reviewing…"
          : alreadyReviewed
          ? "Re-run AI review"
          : "Review extracted text with AI"}
      </button>
      {state && !state.ok ? (
        <span className="inline-flex items-center rounded-md border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-2 py-0.5 text-[11px] font-semibold text-[var(--status-warning)]">
          {state.message}
        </span>
      ) : null}
    </form>
  );
}

function AiIcon() {
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src="/icons/workspace/openai-icon-black.svg"
      alt=""
      aria-hidden
      width={12}
      height={12}
      className="inline-block shrink-0"
    />
  );
}
