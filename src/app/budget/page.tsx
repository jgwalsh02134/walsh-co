import { PageHeader } from "@/components/page-header";
import { ProgressBar } from "@/components/progress-bar";
import { SectionPanel } from "@/components/section-panel";
import { StatCard } from "@/components/stat-card";
import { statusTokens } from "@/lib/status";
import { budgetCategories } from "@/lib/mock-data";

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);

export default function BudgetPage() {
  const totalEstimate = budgetCategories.reduce((sum, c) => sum + c.estimate, 0);
  const totalActual = budgetCategories.reduce((sum, c) => sum + c.actual, 0);
  const variance = totalActual - totalEstimate;
  const variancePct = totalEstimate
    ? Math.round((variance / totalEstimate) * 100)
    : 0;

  return (
    <>
      <PageHeader
        eyebrow="Finance"
        title="Budget"
        description="Estimate vs. actual across categories. Mock values only — no real accounting logic."
      />

      <div className="grid grid-cols-1 gap-[13px] sm:grid-cols-3">
        <StatCard
          label="Total estimate"
          value={formatCurrency(totalEstimate)}
          delta={`${budgetCategories.length} categories`}
        />
        <StatCard
          label="Total actual"
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

      <SectionPanel title="Category breakdown" description="Estimate vs. actual by line.">
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
                    {formatCurrency(c.actual)} of {formatCurrency(c.estimate)}
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
        title="Notes"
        description="What this view does not do (yet)."
      >
        <ul className="flex flex-col gap-2 text-sm text-[var(--color-text-muted)]">
          <li>• No invoice ingestion or vendor sync.</li>
          <li>• No tax, contingency rules, or accounting periods.</li>
          <li>• Variance shown is illustrative; needs verification before any decision.</li>
        </ul>
      </SectionPanel>
    </>
  );
}
