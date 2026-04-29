import { FilterPill, FilterPillRow } from "@/components/filter-pill";
import { PageHeader } from "@/components/page-header";
import { ProgressBar } from "@/components/progress-bar";
import { StatusBadge } from "@/components/status-badge";
import { priorityLabels, statusTokens, type StatusKey } from "@/lib/status";
import { projects, type Project } from "@/lib/mock-data";

const phaseColumns: { key: Project["phase"]; label: string; status: StatusKey }[] = [
  { key: "planning", label: "Planning", status: "planning" },
  { key: "in_progress", label: "In progress", status: "in_progress" },
  { key: "review", label: "In review", status: "review" },
  { key: "complete", label: "Complete", status: "complete" },
];

function PriorityPill({ priority }: { priority: Project["priority"] }) {
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

function ProjectCard({ project }: { project: Project }) {
  return (
    <article className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold leading-snug text-[var(--color-text)]">
          {project.name}
        </h3>
        <PriorityPill priority={project.priority} />
      </div>
      <p className="text-xs text-[var(--color-text-muted)]">{project.description}</p>
      <ProgressBar value={project.progress} showValue={false} />
      <div className="flex items-center justify-between text-[11px] text-[var(--color-text-faint)]">
        <span>Due {project.dueDate}</span>
        <span>{project.owner}</span>
      </div>
    </article>
  );
}

export default function ProjectsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Workstreams"
        title="Projects"
        description="Phase board across the workspace. Drag-and-drop coming soon."
        primaryAction={
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-text-inverse)] transition-colors hover:bg-[var(--color-primary-hover)]"
          >
            New project
          </button>
        }
        secondaryAction={
          <div className="inline-flex rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-0.5 text-sm">
            <span className="rounded-[6px] bg-[var(--color-bg-warm)] px-3 py-1 font-medium text-[var(--color-text)]">
              Board
            </span>
            <span className="px-3 py-1 text-[var(--color-text-muted)]">List</span>
            <span className="px-3 py-1 text-[var(--color-text-muted)]">Timeline</span>
          </div>
        }
      />

      <FilterPillRow>
        <FilterPill label="All" active />
        <FilterPill label="High priority" />
        <FilterPill label="Due this week" />
        <FilterPill label="Mine" />
      </FilterPillRow>

      <div className="grid grid-cols-1 gap-[13px] md:grid-cols-2 xl:grid-cols-4">
        {phaseColumns.map((column) => {
          const items = projects.filter((p) => p.phase === column.key);
          return (
            <section
              key={column.key}
              className="flex flex-col gap-[13px] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-3"
            >
              <header className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StatusBadge status={column.status} />
                  <span className="text-xs font-semibold text-[var(--color-text-muted)]">
                    {items.length}
                  </span>
                </div>
              </header>
              {items.length === 0 ? (
                <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-6 text-center text-xs text-[var(--color-text-faint)]">
                  Nothing in this phase
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {items.map((p) => (
                    <ProjectCard key={p.id} project={p} />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
