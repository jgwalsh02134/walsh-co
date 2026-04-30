import { PageHeader } from "@/components/page-header";
import { SectionPanel } from "@/components/section-panel";
import { StatusBadge } from "@/components/status-badge";
import type { StatusKey } from "@/lib/status";

type Phase = {
  id: string;
  name: string;
  status: StatusKey;
  window: string;
  trades: string[];
  gating: string;
};

const phases: Phase[] = [
  {
    id: "ph-pre",
    name: "Pre-construction",
    status: "complete",
    window: "Mar 17 → Apr 18",
    trades: ["Architect", "Engineer"],
    gating: "Permit set issued, demo permit closed.",
  },
  {
    id: "ph-bids",
    name: "Bidding & procurement",
    status: "in_progress",
    window: "Apr 14 → May 06",
    trades: ["Roofing", "Plumbing", "Electrical", "HVAC", "Framing"],
    gating: "Awards needed for roofing, plumbing, HVAC.",
  },
  {
    id: "ph-shell",
    name: "Demo & shell",
    status: "planning",
    window: "May 12 → Jun 14",
    trades: ["Demolition", "Framing", "Roofing"],
    gating: "Roofing award and dumpster placement.",
  },
  {
    id: "ph-rough",
    name: "Rough-ins",
    status: "planning",
    window: "Jun 09 → Jul 12",
    trades: ["Plumbing", "Electrical", "HVAC", "Insulation"],
    gating: "Rough-in inspection windows must be sequenced.",
  },
  {
    id: "ph-finish",
    name: "Finishes",
    status: "planning",
    window: "Jul 14 → Sep 06",
    trades: ["Drywall", "Painting", "Flooring", "Tile", "Cabinetry"],
    gating: "Tile selection lead time must be locked by May 09.",
  },
  {
    id: "ph-closeout",
    name: "Closeout & punch list",
    status: "planning",
    window: "Sep 09 → Sep 30",
    trades: ["General"],
    gating: "Final inspections and CO.",
  },
];

const decisionLog = [
  {
    id: "dl-1",
    decision: "Architect of record",
    outcome: "Loudonville Architecture",
    date: "Mar 17",
    rationale: "Prior project performance, familiarity with municipality.",
  },
  {
    id: "dl-2",
    decision: "Service upgrade",
    outcome: "200A panel (CO-002 approved)",
    date: "Apr 21",
    rationale: "Inspector recommendation, future-proofing for HVAC and EV.",
  },
];

export default function ConstructionPage() {
  return (
    <>
      <PageHeader
        eyebrow="Construction Plan"
        title="Phases & sequencing"
        description="Phase windows, gating items, and trade sequencing for the renovation. Placeholder dates only — confirm with the schedule of record."
        primaryAction={
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-text-inverse)] transition-colors hover:bg-[var(--color-primary-hover)]"
          >
            Edit phase
          </button>
        }
      />

      <SectionPanel
        title="Phase board"
        description="Where the project is, where it is going, and what gates each step."
        padded={false}
      >
        <ul className="divide-y divide-[var(--color-border)]">
          {phases.map((p) => (
            <li key={p.id} className="flex flex-col gap-2 px-[21px] py-3 lg:flex-row lg:items-center lg:gap-6">
              <div className="flex flex-1 flex-col gap-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-[var(--color-text)]">{p.name}</span>
                  <StatusBadge status={p.status} />
                </div>
                <span className="text-xs text-[var(--color-text-muted)]">{p.window}</span>
              </div>
              <div className="flex flex-1 flex-col gap-1 text-xs text-[var(--color-text-muted)]">
                <span className="font-semibold uppercase tracking-wide text-[var(--color-text-faint)]">
                  Trades
                </span>
                <span>{p.trades.join(" · ")}</span>
              </div>
              <div className="flex flex-1 flex-col gap-1 text-xs text-[var(--color-text-muted)]">
                <span className="font-semibold uppercase tracking-wide text-[var(--color-text-faint)]">
                  Gating
                </span>
                <span>{p.gating}</span>
              </div>
            </li>
          ))}
        </ul>
      </SectionPanel>

      <SectionPanel
        title="Decision log"
        description="Recorded decisions with rationale. Placeholder entries."
        padded={false}
      >
        <ul className="divide-y divide-[var(--color-border)]">
          {decisionLog.map((d) => (
            <li key={d.id} className="flex flex-col gap-1 px-[21px] py-3 sm:flex-row sm:items-baseline sm:gap-6">
              <span className="w-32 shrink-0 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-faint)]">
                {d.date}
              </span>
              <div className="flex flex-1 flex-col gap-0.5">
                <span className="text-sm font-semibold text-[var(--color-text)]">
                  {d.decision} → {d.outcome}
                </span>
                <span className="text-xs text-[var(--color-text-muted)]">{d.rationale}</span>
              </div>
            </li>
          ))}
        </ul>
      </SectionPanel>
    </>
  );
}
