import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { SectionPanel } from "@/components/section-panel";

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Settings"
        description="Workspace preferences and basic configuration. Setup in progress."
      />

      <SectionPanel
        title="Workspace info"
        description="Identifies this workspace inside the app."
      >
        <form className="grid grid-cols-1 gap-[13px] sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-[var(--color-text)]">Workspace name</span>
            <input
              type="text"
              defaultValue="Walsh Co"
              className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] focus:border-[var(--color-focus)] focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-[var(--color-text)]">Active project</span>
            <input
              type="text"
              defaultValue="322 Osborne Rd Renovation"
              className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] focus:border-[var(--color-focus)] focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
            <span className="font-medium text-[var(--color-text)]">Description</span>
            <textarea
              rows={3}
              defaultValue="Renovation & construction operations workspace. Desktop for planning and decisions, iPhone for field updates."
              className="resize-y rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] focus:border-[var(--color-focus)] focus:outline-none"
            />
          </label>
          <div className="sm:col-span-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-text-inverse)] transition-colors hover:bg-[var(--color-primary-hover)]"
            >
              Save changes
            </button>
          </div>
        </form>
      </SectionPanel>

      <SectionPanel
        title="Theme"
        description="Light, dark, and system preferences."
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-[var(--color-text-muted)]">
            Currently follows your system preference. A theme toggle is coming
            soon.
          </p>
          <div className="flex flex-wrap gap-2">
            {["System", "Light", "Dark"].map((label, idx) => (
              <button
                key={label}
                type="button"
                aria-pressed={idx === 0}
                className={`rounded-[var(--radius-md)] border px-4 py-2 text-sm font-medium ${
                  idx === 0
                    ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
                    : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:border-[var(--color-border-strong)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </SectionPanel>

      <SectionPanel
        title="Integrations"
        description="External services your workspace can connect to."
      >
        <EmptyState
          variant="inline"
          title="No integrations yet"
          description="Connection to external services is coming soon. Setup in progress."
        />
      </SectionPanel>
    </>
  );
}
