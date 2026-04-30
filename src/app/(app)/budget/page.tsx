import { PageHeader } from "@/components/page-header";
import { ProgressBar } from "@/components/progress-bar";
import { SectionPanel } from "@/components/section-panel";
import { StatCard } from "@/components/stat-card";
import { statusTokens } from "@/lib/status";
import { budgetCategories, changeOrders } from "@/lib/mock-data";

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);

const changeOrderToneByStatus: Record<
  (typeof changeOrders)[number]["status"],
  keyof typeof statusTokens
> = {
  pending: "review",
  approved: "success",
  rejected: "error",
};

export default function BudgetPage() {
  const totalEstimate = budgetCategories.reduce((sum, c) => sum + c.estimate, 0);
  const totalCommitted = budgetCategories.reduce((sum, c) => sum + c.committed, 0);
  const totalActual = budgetCategories.reduce((sum, c) => sum + c.actual, 0);
  const variance = totalActual - totalEstimate;
  const variancePct = totalEstimate
    ? Math.round((variance / totalEstimate) * 100)
    : 0;
  const coTotal = changeOrders.reduce((s, c) => s + c.amount, 0);

  return (
    <>
      <PageHeader
        eyebrow="Budget & Change Orders"
        title="Budget"
        description="Estimate, commitments, actuals, and variance by category. Mock values only — no real accounting logic."
        primaryAction={
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-text-inverse)] transition-colors hover:bg-[var(--color-primary-hover)]"
          >
            New change order
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-[13px] sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total estimate"
          value={formatCurrency(totalEstimate)}
          delta={`${budgetCategories.length} categories`}
        />
        <StatCard
          label="Committed"
          value={formatCurrency(totalCommitted)}
          delta={`${Math.round((totalCommitted / totalEstimate) * 100)}% of estimate`}
        />
        <StatCard
          label="Actual to date"
          value={formatCurrency(totalActual)}
          delta={`${Math.round((totalActual / totalEstimate) * 100)}% spent`}
        />
        <StatCard
          label={variance >= 0 ? "Over budget" : "Under budget"}
          value={formatCurrency(Math.abs(variance))}
          delta={`${variancePct >= 0 ? "+" : ""}${variancePct}% vs. estimate`}
          emphasis
        />
      </div>

      <SectionPanel title="Category breakdown" description="Estimate vs. committed vs. actual by line.">
        <ul className="flex flex-col gap-[21px]">
          {budgetCategories.map((c) => {
            const pct = c.estimate
              ? Math.min(150, Math.round((c.actual / c.estimate) * 100))
              : 0;
            const over = c.actual > c.estimate;
            const tone = statusTokens[over ? "warning" : "success"];
            return (
              <li key={c.id} className="flex flex-col gap-1.5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold text-[var(--color-text)]">
                    {c.name}
                  </span>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    Committed {formatCurrency(c.committed)} · Actual {formatCurrency(c.actual)} of {formatCurrency(c.estimate)}
                  </span>
                </div>
                <ProgressBar value={pct} showValue={false} />
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold"
                    style={{ background: tone.background, color: tone.text }}
                  >
                    {over ? "Over" : "Under"} by{" "}
                    {formatCurrency(Math.abs(c.actual - c.estimate))}
                  </span>
                  <span className="text-[var(--color-text-faint)]">
                    {pct}% of estimate used
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </SectionPanel>

      <SectionPanel
        title="Change orders"
        description={`${changeOrders.length} on file · ${formatCurrency(coTotal)} total exposure`}
        padded={false}
      >
        <ul className="divide-y divide-[var(--color-border)]">
          {changeOrders.map((co) => {
            const tone = statusTokens[changeOrderToneByStatus[co.status]];
            return (
              <li key={co.id} className="flex flex-col gap-1 px-[21px] py-3 sm:flex-row sm:items-center sm:gap-4">
                <span className="w-20 shrink-0 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-faint)]">
                  {co.number}
                </span>
                <div className="flex flex-1 flex-col gap-0.5">
                  <span className="text-sm font-medium text-[var(--color-text)]">{co.description}</span>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {co.contractor} · Submitted {co.submitted}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-[var(--color-text)]">{formatCurrency(co.amount)}</span>
                  <span
                    className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize"
                    style={{ background: tone.background, color: tone.text }}
                  >
                    {co.status}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </SectionPanel>

      <SectionPanel
        title="Notes"
        description="What this view does not do (yet)."
      >
        <ul className="flex flex-col gap-2 text-sm text-[var(--color-text-muted)]">
          <li>· No invoice ingestion or vendor sync.</li>
          <li>· No tax, contingency rules, or accounting periods.</li>
          <li>· Variance shown is illustrative; needs verification before any decision.</li>
        </ul>
      </SectionPanel>
    </>
  );
}
