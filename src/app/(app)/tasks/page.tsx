import Link from "next/link";
import type { Task as PersistedTaskRow } from "@prisma/client";
import { GmailDraftButton } from "@/components/gmail-draft-button";
import { MetricTile } from "@/components/metric-tile";
import { PageHeader } from "@/components/page-header";
import { SectionPanel } from "@/components/section-panel";
import { ToneTag } from "@/components/tone-tag";
import {
  isGmailDraftsEnabled,
  isGoogleConnected,
} from "@/lib/google-gmail";
import { trackedProperties } from "@/lib/market-data";
import {
  bids,
  budgetCategories,
  documents,
  nextDecisions,
  tasks,
  taskExecutionLaneLabels,
  type Bid,
  type BudgetCategory,
  type DocumentRecord,
  type Task,
  type TaskExecutionLane,
} from "@/lib/mock-data";
import { prisma } from "@/lib/prisma";
import { priorityLabels, statusTokens, type StatusTone } from "@/lib/status";
import {
  isTaskPriority,
  isTaskStatus,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/task-proposal";

// Tasks reads the persisted `Task` table; per-request rendering keeps
// the page in sync with the database without relying on
// `revalidatePath` alone after every external write.
export const dynamic = "force-dynamic";

// =============================================================
// Lane derivation
// =============================================================

/**
 * Compute the execution lane for a task. New tasks set `executionLane`
 * directly; older mock rows fall back to a derivation based on the
 * legacy `lane` + `priority` so the new board still has something
 * sensible to render.
 */
function executionLaneFor(task: Task): TaskExecutionLane {
  if (task.executionLane) return task.executionLane;
  if (task.lane === "done") return "done";
  if (task.lane === "waiting") return "waiting_on_vendor";
  return task.priority === "high" ? "needs_decision" : "ready";
}

const LANE_TONE: Record<TaskExecutionLane, StatusTone> = {
  blocked: "error",
  needs_decision: "warning",
  ready: "info",
  in_progress: "review",
  waiting_on_vendor: "neutral",
  done: "success",
};

const LANE_ORDER: TaskExecutionLane[] = [
  "blocked",
  "needs_decision",
  "ready",
  "in_progress",
  "waiting_on_vendor",
  "done",
];

// =============================================================
// Page
// =============================================================

export default async function TasksPage() {
  const gmailEnabled = isGmailDraftsEnabled();
  const gmailConnected = gmailEnabled ? await isGoogleConnected() : false;

  // Persisted tasks: created from AI document proposals (and, in the
  // future, the manual create form). Tolerant of an unreachable DB so
  // the page still renders with mock data when Postgres is offline.
  const persistedTasks = await prisma.task
    .findMany({ orderBy: { createdAt: "desc" }, take: 200 })
    .catch(() => [] as PersistedTaskRow[]);

  // Bucket mock tasks for the legacy sample panels.
  const byLane: Record<TaskExecutionLane, Task[]> = {
    blocked: [],
    needs_decision: [],
    ready: [],
    in_progress: [],
    waiting_on_vendor: [],
    done: [],
  };
  for (const t of tasks) byLane[executionLaneFor(t)].push(t);

  const activeCount =
    byLane.blocked.length +
    byLane.needs_decision.length +
    byLane.ready.length +
    byLane.in_progress.length +
    byLane.waiting_on_vendor.length;
  const draftPersistedCount = persistedTasks.filter(
    (t) => t.status === "draft"
  ).length;

  return (
    <>
      <PageHeader
        eyebrow="Tasks"
        title="Renovation execution"
        description="Work bucketed by what it's actually waiting on. Each task links to the bid, document, or budget category that drives it. Gmail follow-up drafts are user-click only — nothing is sent."
      />

      <SectionPanel
        title="Task summary"
        description="Active count by lane. Done is shown so closed work stays visible without dominating."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <MetricTile
            label="Active"
            value={String(activeCount)}
            hint="Everything not Done"
          />
          <MetricTile
            label="Blocked"
            value={String(byLane.blocked.length)}
            hint="Cannot move forward"
          />
          <MetricTile
            label="Needs decision"
            value={String(byLane.needs_decision.length)}
            hint="Waiting on you"
          />
          <MetricTile
            label="In progress"
            value={String(byLane.in_progress.length)}
            hint="Active right now"
          />
          <MetricTile
            label="Waiting on vendor"
            value={String(byLane.waiting_on_vendor.length)}
            hint="Pending vendor reply"
          />
          <MetricTile
            label="Done"
            value={String(byLane.done.length)}
            hint="Recently closed"
          />
        </div>
      </SectionPanel>

      <SectionPanel
        title="Drafted tasks (persisted)"
        description={
          persistedTasks.length === 0
            ? "Nothing drafted yet. Use “Create draft task” on an AI document review under /documents to add one."
            : `${persistedTasks.length} persisted task${
                persistedTasks.length === 1 ? "" : "s"
              } · ${draftPersistedCount} still in draft. Sourced from AI document reviews — review before promoting.`
        }
      >
        {persistedTasks.length === 0 ? null : (
          <ul className="flex flex-col gap-3">
            {persistedTasks.map((t) => (
              <PersistedTaskCard
                key={t.id}
                task={t}
                gmailEnabled={gmailEnabled}
                gmailConnected={gmailConnected}
              />
            ))}
          </ul>
        )}
      </SectionPanel>

      <SectionPanel
        title="Sample tasks · planning view"
        description="Pre-populated examples for shaping the workspace. These are not persisted; real tasks live in the Drafted tasks panel above."
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {LANE_ORDER.map((lane) => (
            <LanePanel
              key={lane}
              lane={lane}
              items={byLane[lane]}
              gmailEnabled={gmailEnabled}
              gmailConnected={gmailConnected}
            />
          ))}
        </div>
      </SectionPanel>

      <SectionPanel
        title="Open decisions"
        description={`${nextDecisions.length} pending`}
      >
        <ul className="flex flex-col gap-3">
          {nextDecisions.map((d) => (
            <li
              key={d.id}
              className="flex flex-col gap-1 rounded-[var(--radius-md)] bg-[var(--color-surface-soft)] p-3 shadow-[var(--shadow-card-ring)]"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm font-semibold text-[var(--workspace-text)]">
                  {d.label}
                </span>
                <span className="text-xs font-medium text-[var(--workspace-text-secondary)]">
                  Due {d.due}
                </span>
              </div>
              <span className="text-xs text-[var(--workspace-text-secondary)]">
                {d.context}
              </span>
            </li>
          ))}
        </ul>
      </SectionPanel>

      <AiTasksPanel />
    </>
  );
}

// =============================================================
// Lane panel
// =============================================================

function LanePanel({
  lane,
  items,
  gmailEnabled,
  gmailConnected,
}: {
  lane: TaskExecutionLane;
  items: Task[];
  gmailEnabled: boolean;
  gmailConnected: boolean;
}) {
  const meta = taskExecutionLaneLabels[lane];
  const tone = LANE_TONE[lane];
  const isDone = lane === "done";

  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-[var(--radius-md)] bg-[var(--color-surface-soft)] p-4 shadow-[var(--shadow-card-ring)]">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-sm font-semibold text-[var(--workspace-text)]">
              {meta.label}
            </h3>
            <ToneTag
              label={`${items.length}`}
              tone={items.length === 0 ? "neutral" : tone}
            />
          </div>
          <p className="text-[12px] text-[var(--workspace-text-secondary)]">
            {meta.description}
          </p>
        </div>
      </header>

      {items.length === 0 ? (
        <p className="rounded-[var(--radius-md)] bg-[var(--color-surface)] px-3 py-4 text-center text-[12.5px] text-[var(--workspace-text-muted)]">
          Nothing in this lane right now.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              isDone={isDone}
              gmailEnabled={gmailEnabled}
              gmailConnected={gmailConnected}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

// =============================================================
// Task card
// =============================================================

function TaskCard({
  task,
  isDone,
  gmailEnabled,
  gmailConnected,
}: {
  task: Task;
  isDone: boolean;
  gmailEnabled: boolean;
  gmailConnected: boolean;
}) {
  const property = task.propertySlug
    ? trackedProperties.find((p) => p.slug === task.propertySlug) ?? null
    : null;
  const bid: Bid | null = task.linkedBidId
    ? bids.find((b) => b.id === task.linkedBidId) ?? null
    : null;
  const doc: DocumentRecord | null = task.linkedDocumentId
    ? documents.find((d) => d.id === task.linkedDocumentId) ?? null
    : null;
  const budgetCategory: BudgetCategory | null = task.linkedBudgetCategoryId
    ? budgetCategories.find((b) => b.id === task.linkedBudgetCategoryId) ??
      null
    : null;

  const priority = priorityLabels[task.priority];
  const priorityTokens = statusTokens[priority.tone];

  const showDraft = !isDone;
  const recipient = task.contactEmail ?? null;
  const draft = showDraft ? buildTaskDraft(task, property?.address ?? null) : null;

  return (
    <li className="rounded-[var(--radius-md)] bg-[var(--color-surface)] p-3 shadow-[var(--shadow-card-ring)]">
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <span
            className={`text-sm font-medium [overflow-wrap:anywhere] ${
              isDone
                ? "text-[var(--workspace-text-muted)] line-through"
                : "text-[var(--workspace-text)]"
            }`}
          >
            {task.title}
          </span>
          <span className="shrink-0 text-[11px] font-semibold text-[var(--workspace-text-secondary)]">
            {task.dueDate}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--workspace-text-secondary)]">
          <span>{task.context}</span>
          <span aria-hidden>·</span>
          <span>Owner: {task.owner}</span>
          {!isDone ? (
            <span
              className="inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold"
              style={{
                background: priorityTokens.background,
                color: priorityTokens.text,
                borderColor: priorityTokens.border,
              }}
            >
              {priority.label}
            </span>
          ) : null}
        </div>

        {task.notes ? (
          <p className="text-[12px] text-[var(--workspace-text-secondary)]">
            {task.notes}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-1.5">
          {property ? (
            <LinkChip href={`/properties/${property.slug}`}>
              {property.address}
            </LinkChip>
          ) : null}
          {bid ? (
            <LinkChip href="/bids">Bid: {bid.contractor}</LinkChip>
          ) : null}
          {budgetCategory ? (
            <LinkChip href="/budget">Budget: {budgetCategory.name}</LinkChip>
          ) : null}
          {doc ? <LinkChip href="/documents">Doc: {doc.name}</LinkChip> : null}
          {!bid && !budgetCategory && !doc ? (
            <span className="inline-flex min-h-[26px] items-center rounded-full border border-dashed border-[var(--color-border)] bg-[var(--color-surface-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--workspace-text-muted)]">
              No linked items
            </span>
          ) : null}
        </div>

        {draft ? (
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <GmailDraftButton
                enabled={gmailEnabled}
                connected={gmailConnected}
                to={recipient}
                subject={draft.subject}
                body={draft.body}
                context={{ kind: "task", label: task.title }}
                compact
                label="Draft follow-up email"
                returnTo="/tasks"
              />
            </div>
            {!recipient ? (
              <p className="text-[11px] text-[var(--workspace-text-muted)]">
                Add contact email to create follow-up draft.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </li>
  );
}

function LinkChip({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-[26px] items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--workspace-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
    >
      {children}
    </Link>
  );
}

// =============================================================
// Persisted task card
// =============================================================

const PERSISTED_STATUS_TONE: Record<TaskStatus, StatusTone> = {
  draft: "info",
  blocked: "error",
  needs_decision: "warning",
  ready: "info",
  in_progress: "review",
  waiting_on_vendor: "neutral",
  done: "success",
};

const PERSISTED_STATUS_LABEL: Record<TaskStatus, string> = {
  draft: "Draft",
  blocked: "Blocked",
  needs_decision: "Needs decision",
  ready: "Ready",
  in_progress: "In progress",
  waiting_on_vendor: "Waiting on vendor",
  done: "Done",
};

const PERSISTED_PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

function formatTaskTimestamp(date: Date): string {
  const dateFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  });
  return `${dateFmt.format(date)}, ${timeFmt.format(date)}`;
}

function PersistedTaskCard({
  task,
  gmailEnabled,
  gmailConnected,
}: {
  task: PersistedTaskRow;
  gmailEnabled: boolean;
  gmailConnected: boolean;
}) {
  const status = isTaskStatus(task.status) ? task.status : "draft";
  const priority = isTaskPriority(task.priority) ? task.priority : "medium";
  const property = task.propertySlug
    ? trackedProperties.find((p) => p.slug === task.propertySlug) ?? null
    : null;

  const draftSubject = `Follow-up: ${task.title}${
    property ? ` (${property.address})` : ""
  }`;
  const draftBody = (() => {
    const lines: string[] = [
      "Hi,",
      "",
      `Following up on the task "${task.title}".`,
      "",
      "Quick reference:",
      `  • Task: ${task.title}`,
      `  • Status: ${PERSISTED_STATUS_LABEL[status]}`,
      `  • Priority: ${PERSISTED_PRIORITY_LABEL[priority]}`,
    ];
    if (property) lines.push(`  • Property: ${property.address}`);
    if (task.category) lines.push(`  • Category: ${task.category}`);
    if (task.sourceDocumentName)
      lines.push(`  • Source document: ${task.sourceDocumentName}`);
    lines.push("");
    lines.push(
      "Could you share the latest status and confirm next steps when you have a moment?"
    );
    lines.push("");
    lines.push("Thanks,");
    return lines.join("\n");
  })();

  return (
    <li className="rounded-[var(--radius-md)] bg-[var(--color-surface-soft)] p-3 shadow-[var(--shadow-card-ring)]">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-sm font-semibold text-[var(--workspace-text)] [overflow-wrap:anywhere]">
            {task.title}
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <ToneTag
              label={PERSISTED_STATUS_LABEL[status]}
              tone={PERSISTED_STATUS_TONE[status]}
            />
            <ToneTag
              label={`${PERSISTED_PRIORITY_LABEL[priority]} priority`}
              tone={priority === "urgent" || priority === "high" ? "warning" : "neutral"}
            />
          </div>
        </div>

        {task.description ? (
          <p className="text-[12px] text-[var(--workspace-text-secondary)]">
            {task.description}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--workspace-text-secondary)]">
          {property ? (
            <LinkChip href={`/properties/${property.slug}`}>
              {property.address}
            </LinkChip>
          ) : null}
          {task.category ? (
            <span className="inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-0.5 font-medium">
              {task.category}
            </span>
          ) : null}
          {task.sourceType === "document_proposal" && task.sourceDocumentName ? (
            <LinkChip href="/documents">
              Source: {task.sourceDocumentName}
            </LinkChip>
          ) : null}
          <span className="text-[var(--workspace-text-muted)]">
            Created {formatTaskTimestamp(task.createdAt)}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <GmailDraftButton
            enabled={gmailEnabled}
            connected={gmailConnected}
            to={null}
            subject={draftSubject}
            body={draftBody}
            context={{ kind: "task", label: task.title }}
            compact
            label="Draft follow-up email"
            returnTo="/tasks"
          />
        </div>
      </div>
    </li>
  );
}

// =============================================================
// Gmail draft body
// =============================================================

function buildTaskDraft(
  task: Task,
  propertyAddress: string | null
): { subject: string; body: string } {
  const statusLabel = `${taskExecutionLaneLabels[executionLaneFor(task)].label} · ${
    priorityLabels[task.priority].label
  } priority`;
  const greetingName = task.contactName || task.owner || "there";
  const subject = `Follow-up: ${task.title}${
    propertyAddress ? ` (${propertyAddress})` : ""
  }`;

  const lines: string[] = [
    `Hi ${greetingName},`,
    "",
    `Quick follow-up on "${task.title}".`,
    "",
    "Quick reference:",
    `  • Task: ${task.title}`,
    `  • Status: ${statusLabel}`,
    `  • Context: ${task.context}`,
  ];
  if (propertyAddress) lines.push(`  • Property: ${propertyAddress}`);
  if (task.dueDate) lines.push(`  • Target: ${task.dueDate}`);
  if (task.notes) lines.push(`  • Notes: ${task.notes}`);
  lines.push("");
  lines.push(
    "Could you share the latest status and confirm next steps when you have a moment?"
  );
  lines.push("");
  lines.push("Thanks,");

  return { subject, body: lines.join("\n") };
}

// =============================================================
// AI placeholder
// =============================================================

const AI_TASK_ACTIONS = [
  {
    label: "Create tasks from bid scope",
    description:
      "Read the awarded bid's scope of work and propose a task list — never written to the board without your approval.",
  },
  {
    label: "Draft vendor follow-up",
    description:
      "Pick a task and draft a vendor follow-up email tailored to its current state and linked bid.",
  },
  {
    label: "Summarize blockers",
    description:
      "Plain-language summary of what's blocking the project and which owner can unblock each item.",
  },
  {
    label: "Build weekly renovation plan",
    description:
      "Lay out the next 7 days of work that respects field availability, permits, and decision-due dates.",
  },
  {
    label: "Find budget risks",
    description:
      "Cross-reference open tasks against budget categories to flag categories at risk of overrun.",
  },
];

function AiTasksPanel() {
  return (
    <SectionPanel
      title="AI execution review"
      description="Runs only when you click an action. Output is a draft review — verify before relying."
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {AI_TASK_ACTIONS.map((a) => (
          <button
            key={a.label}
            type="button"
            disabled
            aria-disabled
            title="AI execution review is not wired in this first-pass build."
            className="flex cursor-not-allowed flex-col items-start gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-surface-soft)] p-4 text-left shadow-[var(--shadow-card-ring)]"
          >
            <span className="text-sm font-semibold text-[var(--workspace-text)]">
              {a.label}
            </span>
            <span className="text-[12.5px] leading-relaxed text-[var(--workspace-text-secondary)]">
              {a.description}
            </span>
            <span className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--workspace-text-muted)]">
              First pass · not yet wired
            </span>
          </button>
        ))}
      </div>
      <p className="mt-3 text-[12px] text-[var(--workspace-text-secondary)]">
        AI execution review is a draft aid. Verify scope, permits, insurance,
        and contract terms before relying.
      </p>
    </SectionPanel>
  );
}
