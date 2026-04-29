import { FilterPill, FilterPillRow } from "@/components/filter-pill";
import { PageHeader } from "@/components/page-header";
import { SectionPanel } from "@/components/section-panel";
import { StatusBadge } from "@/components/status-badge";
import { priorityLabels, statusTokens } from "@/lib/status";
import { taskFilters, tasks, type Task } from "@/lib/mock-data";

function PriorityPill({ priority }: { priority: Task["priority"] }) {
  const meta = priorityLabels[priority];
  const tone = statusTokens[meta.tone];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
      style={{ background: tone.background, color: tone.text }}
    >
      {meta.label}
    </span>
  );
}

export default function TasksPage() {
  return (
    <>
      <PageHeader
        eyebrow="Today"
        title="Tasks"
        description="Focused list, sorted by priority. Use filters to narrow your view."
        primaryAction={
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-text-inverse)] transition-colors hover:bg-[var(--color-primary-hover)]"
          >
            New task
          </button>
        }
      />

      <FilterPillRow>
        {taskFilters.map((label, idx) => (
          <FilterPill key={label} label={label} active={idx === 0} />
        ))}
      </FilterPillRow>

      <SectionPanel title="All tasks" description={`${tasks.length} open`} padded={false}>
        <ul className="divide-y divide-[var(--color-border)]">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="flex flex-col gap-2 px-[21px] py-3 sm:flex-row sm:items-center sm:gap-4"
            >
              <span
                className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border border-[var(--color-border-strong)] bg-[var(--color-surface)]"
                aria-hidden
              />
              <div className="flex flex-1 flex-col gap-0.5">
                <span className="text-sm font-medium text-[var(--color-text)]">
                  {task.title}
                </span>
                <span className="text-xs text-[var(--color-text-muted)]">
                  {task.context} • Owner: {task.owner}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                <PriorityPill priority={task.priority} />
                <StatusBadge status={task.status} />
                <span className="text-xs font-semibold text-[var(--color-text-muted)]">
                  Due {task.dueDate}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </SectionPanel>
    </>
  );
}
