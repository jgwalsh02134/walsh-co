"use client";

/**
 * Per-document button that triggers Adobe PDF Extract via the
 * `extractDrivePdfFactsAction` server action. Visual states:
 *   - idle / pending / success / failed
 *
 * Disabled non-interactive variants are rendered by the parent when:
 *   - the document is not a PDF (parent renders a static
 *     "PDF extraction unavailable" pill instead of this component)
 *   - Adobe is not configured (parent passes `disabledReason`)
 *
 * Tokens never reach this component. Adobe credentials and Google
 * tokens stay server-side; this component only receives the document
 * id and a few booleans.
 */
import { useActionState } from "react";
import {
  extractDrivePdfFactsAction,
  type ExtractDrivePdfFactsState,
} from "@/lib/google-drive-actions";

export type PdfExtractButtonProps = {
  documentId: string;
  /** True when Adobe credentials are present AND Google is connected
   *  with the drive.file scope. */
  ready: boolean;
  /** Copy shown when `ready` is false. */
  disabledReason: string;
  /** Drives label between first run and re-run. */
  alreadyExtracted: boolean;
};

export function PdfExtractButton({
  documentId,
  ready,
  disabledReason,
  alreadyExtracted,
}: PdfExtractButtonProps) {
  const [state, action, pending] = useActionState<
    ExtractDrivePdfFactsState,
    FormData
  >(extractDrivePdfFactsAction, null);

  if (!ready) {
    return (
      <span
        aria-disabled
        title={disabledReason}
        className="inline-flex min-h-[28px] cursor-not-allowed items-center gap-1.5 rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--workspace-text-muted)]"
      >
        <AdobeIcon />
        Extract PDF facts
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
        <AdobeIcon />
        {pending
          ? "Extracting…"
          : alreadyExtracted
          ? "Re-run extraction"
          : "Extract PDF facts"}
      </button>
      {state && !state.ok ? (
        <span className="inline-flex items-center rounded-md border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-2 py-0.5 text-[11px] font-semibold text-[var(--status-warning)]">
          {state.message}
        </span>
      ) : null}
    </form>
  );
}

function AdobeIcon() {
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src="/icons/workspace/adobe-acrobat-reader.svg"
      alt=""
      aria-hidden
      width={12}
      height={12}
      className="inline-block shrink-0"
    />
  );
}
