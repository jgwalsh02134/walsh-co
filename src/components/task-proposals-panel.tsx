"use client";

/**
 * Renders editable AI task proposals derived from an AI document
 * review. UI-only in this pass — there is no Task persistence yet
 * (tasks live in `src/lib/mock-data.ts`), so the "Create task" button
 * is intentionally disabled. Real persistence will replace that
 * affordance later.
 *
 * What this component does NOT do:
 *   - It does not call any AI provider. The proposals are derived
 *     server-side from the persisted `aiReviewJson` before being
 *     handed to this component.
 *   - It does not write tasks. "Copy task text" and the optional
 *     Gmail draft action are the only working buttons.
 */

import { useState } from "react";
import { CreateTaskFromProposalButton } from "@/components/create-task-from-proposal-button";
import { GmailDraftButton } from "@/components/gmail-draft-button";

export type TaskProposal = {
  /** Stable id for React keys (derived from index + a hash of the title). */
  id: string;
  /** Source document id — needed for the create-task server action. */
  documentId: string;
  /** Index into the AI review's suggestedTasks array. */
  proposalIndex: number;
  title: string;
  propertyContext: string | null;
  prioritySuggestion: "urgent" | "high" | "medium" | "low";
  categoryHint: string | null;
  sourceDocumentName: string;
  sourceDocumentUrl: string;
  reason: string;
  /** True when a persisted draft task already exists for this
   *  (document, proposalIndex). Controls whether the create button or
   *  a static "Draft task created" pill is rendered. */
  alreadyDrafted: boolean;
};

export type TaskProposalsPanelProps = {
  proposals: TaskProposal[];
  /** Gmail readiness, passed through to the per-proposal Gmail button. */
  gmail: {
    enabled: boolean;
    connected: boolean;
  };
};

const PRIORITY_TONE: Record<
  TaskProposal["prioritySuggestion"],
  { bg: string; text: string; border: string; label: string }
> = {
  urgent: {
    label: "Urgent priority",
    bg: "var(--status-warning-bg)",
    text: "var(--status-warning-text)",
    border: "var(--status-warning-border)",
  },
  high: {
    label: "High priority",
    bg: "var(--status-warning-bg)",
    text: "var(--status-warning-text)",
    border: "var(--status-warning-border)",
  },
  medium: {
    label: "Medium priority",
    bg: "var(--status-neutral-bg)",
    text: "var(--status-neutral-text)",
    border: "var(--status-neutral-border)",
  },
  low: {
    label: "Low priority",
    bg: "var(--status-neutral-bg)",
    text: "var(--status-neutral-text)",
    border: "var(--status-neutral-border)",
  },
};

export function TaskProposalsPanel({
  proposals,
  gmail,
}: TaskProposalsPanelProps) {
  const [open, setOpen] = useState(false);
  if (proposals.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex min-h-[28px] items-center gap-1.5 self-start rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--workspace-text)] transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)]"
      >
        {open
          ? `Hide ${proposals.length} task proposal${
              proposals.length === 1 ? "" : "s"
            }`
          : `Create ${proposals.length} task proposal${
              proposals.length === 1 ? "" : "s"
            }`}
      </button>

      {open ? (
        <div className="flex flex-col gap-3 rounded-[var(--radius-md)] bg-[var(--color-surface-soft)] p-3 shadow-[var(--shadow-card-ring)]">
          <p className="text-[11px] text-[var(--workspace-text-muted)]">
            Task proposals are AI-drafted. Review before adding to the task
            board. Nothing is written until you say so.
          </p>
          <ul className="flex flex-col gap-2">
            {proposals.map((p) => (
              <ProposalCard key={p.id} proposal={p} gmail={gmail} />
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function ProposalCard({
  proposal,
  gmail,
}: {
  proposal: TaskProposal;
  gmail: TaskProposalsPanelProps["gmail"];
}) {
  const tone = PRIORITY_TONE[proposal.prioritySuggestion];
  const draftBody = buildDraftEmailBody(proposal);

  return (
    <li className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-[12.5px] font-semibold text-[var(--workspace-text)] [overflow-wrap:anywhere]">
            {proposal.title}
          </span>
          <span
            className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold"
            style={{
              background: tone.bg,
              color: tone.text,
              borderColor: tone.border,
            }}
          >
            {tone.label}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--workspace-text-secondary)]">
          {proposal.propertyContext ? (
            <span className="inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-soft)] px-2 py-0.5 font-medium">
              {proposal.propertyContext}
            </span>
          ) : null}
          {proposal.categoryHint ? (
            <span className="inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-soft)] px-2 py-0.5 font-medium">
              {proposal.categoryHint}
            </span>
          ) : null}
          <span>
            Source:{" "}
            <a
              href={proposal.sourceDocumentUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[var(--color-link)] hover:underline"
            >
              {proposal.sourceDocumentName}
            </a>
          </span>
        </div>

        <p className="text-[11px] italic text-[var(--workspace-text-muted)]">
          {proposal.reason}
        </p>

        <div className="mt-1 flex flex-wrap items-center gap-2">
          <CopyTextButton text={proposal.title} />
          <GmailDraftButton
            enabled={gmail.enabled}
            connected={gmail.connected}
            to={null}
            subject={`Follow-up: ${proposal.title}`}
            body={draftBody}
            context={{ kind: "task", label: proposal.title }}
            compact
            label="Draft Gmail follow-up"
            returnTo="/documents"
          />
          <CreateTaskFromProposalButton
            documentId={proposal.documentId}
            proposalIndex={proposal.proposalIndex}
            alreadyDrafted={proposal.alreadyDrafted}
          />
        </div>
      </div>
    </li>
  );
}

function CopyTextButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // Clipboard write can fail when the page is not focused or
          // permission is denied. Surface a transient muted state and
          // move on — the text remains visible in the card itself.
          setCopied(false);
        }
      }}
      className="inline-flex min-h-[28px] items-center gap-1.5 rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--workspace-text)] transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)]"
    >
      {copied ? "Copied" : "Copy task text"}
    </button>
  );
}

function buildDraftEmailBody(p: TaskProposal): string {
  const lines: string[] = [
    "Hi,",
    "",
    `Following up on the proposed task "${p.title}".`,
    "",
    "Quick reference:",
    `  • Task: ${p.title}`,
    `  • Priority (suggested): ${p.prioritySuggestion}`,
  ];
  if (p.propertyContext) lines.push(`  • Property: ${p.propertyContext}`);
  if (p.categoryHint) lines.push(`  • Category: ${p.categoryHint}`);
  lines.push(`  • Source: ${p.sourceDocumentName}`);
  lines.push("");
  lines.push(
    "Could you confirm the next step on this and let me know what you need from me?"
  );
  lines.push("");
  lines.push("Thanks,");
  return lines.join("\n");
}
