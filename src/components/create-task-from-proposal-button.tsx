"use client";

/**
 * Per-proposal button that turns a single AI-suggested task into a
 * persisted draft task. Wraps `createTaskFromProposalAction`.
 *
 * The parent passes `alreadyDrafted: true` when the current page render
 * already showed a persisted Task for this (document, proposal index)
 * — in that case the button renders a static "Draft task created"
 * pill so a refresh after a successful click reads correctly. The
 * server action is itself idempotent (returns the existing task on a
 * double-click), but the visual swap keeps the UI honest immediately.
 */
import { useActionState } from "react";
import {
  createTaskFromProposalAction,
  type CreateTaskFromProposalState,
} from "@/lib/task-actions";

export type CreateTaskFromProposalButtonProps = {
  documentId: string;
  proposalIndex: number;
  alreadyDrafted: boolean;
};

export function CreateTaskFromProposalButton({
  documentId,
  proposalIndex,
  alreadyDrafted,
}: CreateTaskFromProposalButtonProps) {
  const [state, action, pending] = useActionState<
    CreateTaskFromProposalState,
    FormData
  >(createTaskFromProposalAction, null);

  // Treat the persisted state as the authoritative "already drafted"
  // signal: either the parent told us so via `alreadyDrafted` (from a
  // server render), or this client just successfully created one.
  const draftedNow = state?.ok ?? false;
  const isDrafted = alreadyDrafted || draftedNow;

  if (isDrafted) {
    return (
      <span
        title="A draft task already exists for this proposal."
        className="inline-flex min-h-[28px] items-center gap-1.5 rounded-md border border-[var(--status-success-border)] bg-[var(--status-success-bg)] px-2.5 py-1 text-[11px] font-semibold text-[var(--status-success)]"
      >
        Draft task created
      </span>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-1">
      <input type="hidden" name="documentId" value={documentId} />
      <input
        type="hidden"
        name="proposalIndex"
        value={String(proposalIndex)}
      />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-[28px] items-center gap-1.5 rounded-md border border-[var(--color-primary)] bg-[var(--color-primary)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-text-inverse)] transition-colors hover:bg-[var(--color-primary-hover)] disabled:cursor-progress disabled:opacity-60"
      >
        {pending ? "Creating…" : "Create draft task"}
      </button>
      {state && !state.ok ? (
        <span className="inline-flex items-center rounded-md border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-2 py-0.5 text-[11px] font-semibold text-[var(--status-warning)]">
          {state.message}
        </span>
      ) : null}
    </form>
  );
}
