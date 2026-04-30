import { PageHeader } from "@/components/page-header";
import { SectionPanel } from "@/components/section-panel";
import { tasks, taskLaneLabels, type TaskLane } from "@/lib/mock-data";
import { priorityLabels, statusTokens } from "@/lib/status";

const laneOrder: TaskLane[] = ["today", "this_week", "waiting", "done"];

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

export default function TasksPage() {
  return (
    <>
      <PageHeader
        eyebrow="Tasks"
        title="Execution board"
        description="Today, this week, waiting on others, and recently completed."
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {laneOrder.map((lane) => {
          const items = tasks.filter((t) => t.lane === lane);
          const isDone = lane === "done";
          return (
            <SectionPanel
              key={lane}
              title={taskLaneLabels[lane]}
              description={`${items.length} · ${laneDescriptions[lane]}`}
              padded={false}
            >
              {items.length === 0 ? (
                <p className="px-5 py-6 text-center text-xs text-[var(--color-text-muted)]">
                  Nothing in this lane.
                </p>
              ) : (
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
                    </li>
                  ))}
                </ul>
              )}
            </SectionPanel>
          );
        })}
      </div>
    </>
  );
}
