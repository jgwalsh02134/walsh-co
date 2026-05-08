import { DraftEmailButton } from "@/components/draft-email-button";
import { GmailDraftButton } from "@/components/gmail-draft-button";
import { PageHeader } from "@/components/page-header";
import { SectionPanel } from "@/components/section-panel";
import {
  isGmailDraftsEnabled,
  isGoogleConnected,
} from "@/lib/google-gmail";
import {
  nextDecisions,
  tasks,
  taskLaneLabels,
  type Task,
  type TaskLane,
} from "@/lib/mock-data";
import { hasGraphToken } from "@/lib/microsoft-graph";
import { priorityLabels, statusTokens } from "@/lib/status";

const laneDescriptions: Record<TaskLane, string> = {
  today: "Doing now",
  this_week: "Plan to finish this week",
  waiting: "Blocked or pending response",
  done: "Recently closed",
};

function PriorityTag({ priority }: { priority: keyof typeof priorityLabels }) {
  const meta = priorityLabels[priority];
  const tone = statusTokens[meta.tone];
  return (
    <span
      className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium"
      style={{ background: tone.background, color: tone.text, borderColor: tone.border }}
    >
      {meta.label} priority
    </span>
  );
}

function TaskList({
  items,
  isDone = false,
  showFollowUpDraft = false,
  gmailEnabled = false,
  gmailConnected = false,
}: {
  items: Task[];
  isDone?: boolean;
  showFollowUpDraft?: boolean;
  gmailEnabled?: boolean;
  gmailConnected?: boolean;
}) {
  if (items.length === 0) {
    return (
      <p className="px-5 py-6 text-center text-xs text-[var(--color-text-muted)]">
        Nothing in this lane.
      </p>
    );
  }
  const graphAvailable = hasGraphToken();
  return (
    <ul className="divide-y divide-[var(--color-border)]">
      {items.map((t) => (
        <li key={t.id} className="flex flex-col gap-1.5 px-5 py-3">
          <div className="flex items-start justify-between gap-2">
            <span
              className={`text-sm ${
                isDone
                  ? "text-[var(--color-text-muted)] line-through"
                  : "text-[var(--color-text)]"
              }`}
            >
              {t.title}
            </span>
            <span className="shrink-0 text-xs font-medium text-[var(--color-text-muted)]">
              {t.dueDate}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]">
            <span>{t.context}</span>
            <span aria-hidden>·</span>
            <span>Owner: {t.owner}</span>
            {!isDone ? <PriorityTag priority={t.priority} /> : null}
          </div>
          {t.notes ? (
            <p className="text-xs text-[var(--color-text-muted)]">{t.notes}</p>
          ) : null}
          {showFollowUpDraft && !isDone ? (
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <DraftEmailButton
                graphAvailable={graphAvailable}
                to={null}
                subject={`Follow-up: ${t.title}`}
                body={[
                  `Hi,`,
                  "",
                  `Following up on "${t.title}" — context: ${t.context}.`,
                  t.notes ? `\nDetails: ${t.notes}` : "",
                  t.dueDate ? `\nTarget: ${t.dueDate}.` : "",
                  "",
                  "Could you share the latest status when you have a moment?",
                  "",
                  "Thanks,",
                ]
                  .filter((line) => line !== "")
                  .join("\n")}
                context={{ kind: "task", label: t.title }}
                compact
                label="Draft follow-up email"
              />
              <GmailDraftButton
                enabled={gmailEnabled}
                connected={gmailConnected}
                to={null}
                subject={`Follow-up: ${t.title}`}
                body={[
                  `Hi,`,
                  "",
                  `Following up on "${t.title}" — context: ${t.context}.`,
                  t.notes ? `\nDetails: ${t.notes}` : "",
                  t.dueDate ? `\nTarget: ${t.dueDate}.` : "",
                  "",
                  "Could you share the latest status when you have a moment?",
                  "",
                  "Thanks,",
                ]
                  .filter((line) => line !== "")
                  .join("\n")}
                context={{ kind: "task", label: t.title }}
                compact
                label="Draft follow-up email"
                returnTo="/tasks"
              />
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export default async function TasksPage() {
  const today = tasks.filter((t) => t.lane === "today");
  const thisWeek = tasks.filter((t) => t.lane === "this_week");
  const waiting = tasks.filter((t) => t.lane === "waiting");
  const done = tasks.filter((t) => t.lane === "done");
  const punchList = tasks.filter((t) => t.context === "Punch list");
  const gmailEnabled = isGmailDraftsEnabled();
  const gmailConnected = gmailEnabled ? await isGoogleConnected() : false;

  return (
    <>
      <PageHeader
        eyebrow="Tasks & Follow-ups"
        title="Execution board"
        description="Project work, punch items, deadlines, and open decisions."
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <SectionPanel
          title={taskLaneLabels.today}
          description={`${today.length} · ${laneDescriptions.today}`}
          padded={false}
        >
          <TaskList
            items={today}
            showFollowUpDraft
            gmailEnabled={gmailEnabled}
            gmailConnected={gmailConnected}
          />
        </SectionPanel>

        <SectionPanel
          title="This Week"
          description={`${thisWeek.length} · ${laneDescriptions.this_week}`}
          padded={false}
        >
          <TaskList
            items={thisWeek}
            showFollowUpDraft
            gmailEnabled={gmailEnabled}
            gmailConnected={gmailConnected}
          />
        </SectionPanel>

        <SectionPanel
          title="Waiting On"
          description={`${waiting.length} · ${laneDescriptions.waiting}`}
          padded={false}
        >
          <TaskList
            items={waiting}
            showFollowUpDraft
            gmailEnabled={gmailEnabled}
            gmailConnected={gmailConnected}
          />
        </SectionPanel>

        <SectionPanel
          title="Open Decisions"
          description={`${nextDecisions.length} pending`}
        >
          <ul className="flex flex-col gap-3">
            {nextDecisions.map((d) => (
              <li
                key={d.id}
                className="flex flex-col gap-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold text-[var(--color-text)]">
                    {d.label}
                  </span>
                  <span className="text-xs font-medium text-[var(--color-text-muted)]">
                    Due {d.due}
                  </span>
                </div>
                <span className="text-xs text-[var(--color-text-muted)]">
                  {d.context}
                </span>
              </li>
            ))}
          </ul>
        </SectionPanel>

        <SectionPanel
          title="Overdue"
          description="Past due based on the dates on file."
        >
          <p className="text-sm text-[var(--color-text-muted)]">
            No tasks are flagged as overdue. Dates are working entries — review
            against current calendar before relying on this view.
          </p>
        </SectionPanel>

        <SectionPanel
          title="Punch List"
          description={`${punchList.length} punch list item${
            punchList.length === 1 ? "" : "s"
          }`}
          padded={false}
        >
          <TaskList items={punchList} />
        </SectionPanel>

        <SectionPanel
          title="Completed"
          description={`${done.length} · ${laneDescriptions.done}`}
          padded={false}
        >
          <TaskList items={done} isDone />
        </SectionPanel>
      </div>
    </>
  );
}
