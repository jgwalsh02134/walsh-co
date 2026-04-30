import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { SectionPanel } from "@/components/section-panel";
import { StatCard } from "@/components/stat-card";
import { bids, budgetCategories, contractors, permits, tasks } from "@/lib/mock-data";

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);

export default function ReportsPage() {
  const totalEstimate = budgetCategories.reduce((s, c) => s + c.estimate, 0);
  const totalCommitted = budgetCategories.reduce((s, c) => s + c.committed, 0);
  const awardedCount = bids.filter((b) => b.award === "awarded").length;
  const activePermits = permits.filter((p) => p.status !== "complete").length;

  return (
    <>
      <PageHeader
        eyebrow="Reports"
        title="Project reporting"
        description="Snapshots and summaries for owners, lenders, and insurers. Placeholder content only — no real export logic."
        primaryAction={
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-text-inverse)] transition-colors hover:bg-[var(--color-primary-hover)]"
          >
            Generate report
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-[13px] sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Contractors" value={String(contractors.length)} delta="On file" />
        <StatCard label="Bids awarded" value={String(awardedCount)} delta={`${bids.length - awardedCount} pending`} />
        <StatCard label="Active permits" value={String(activePermits)} delta={`${permits.length} total`} />
        <StatCard
          label="Budget committed"
          value={formatCurrency(totalCommitted)}
          delta={`${Math.round((totalCommitted / totalEstimate) * 100)}% of estimate`}
        />
      </div>

      <SectionPanel
        title="Saved views"
        description="Recurring exports and stakeholder packets."
      >
        <ul className="grid grid-cols-1 gap-[13px] md:grid-cols-2">
          {[
            { title: "Owner weekly", description: "Phase progress, key risks, and decisions needed.", cadence: "Weekly · Mondays" },
            { title: "Lender draw package", description: "Budget-to-actual with documents per category.", cadence: "On draw" },
            { title: "Insurance COI ledger", description: "Active certificates with expiration warnings.", cadence: "Monthly" },
            { title: "Punch list export", description: "Open punch list grouped by trade.", cadence: "On demand" },
          ].map((v) => (
            <li
              key={v.title}
              className="flex flex-col gap-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-3"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-semibold text-[var(--color-text)]">{v.title}</span>
                <span className="text-xs text-[var(--color-text-muted)]">{v.cadence}</span>
              </div>
              <span className="text-xs text-[var(--color-text-muted)]">{v.description}</span>
            </li>
          ))}
        </ul>
      </SectionPanel>

      <SectionPanel
        title="Activity & exports"
        description={`${tasks.length} tasks tracked · export pipeline placeholder.`}
      >
        <EmptyState
          variant="inline"
          title="No exports yet"
          description="Reporting export, scheduled deliveries, and stakeholder distribution lists will live here. Setup in progress."
        />
      </SectionPanel>
    </>
  );
}
