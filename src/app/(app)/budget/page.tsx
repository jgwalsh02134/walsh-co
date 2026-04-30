import { PageHeader } from "@/components/page-header";
import { ProgressBar } from "@/components/progress-bar";
import { SectionPanel } from "@/components/section-panel";
import { budgetCategories } from "@/lib/mock-data";
import { statusTokens } from "@/lib/status";

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);

function VarianceTag({ amount, basis }: { amount: number; basis: number }) {
  if (basis === 0) {
    return <span className="text-xs text-[var(--color-text-faint)]">No quote yet</span>;
  }
  const over = amount > 0;
  const tone = statusTokens[over ? "warning" : "success"];
  const label = `${over ? "Over" : "Under"} by ${formatCurrency(Math.abs(amount))}`;
  return (
    <span
      className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium"
      style={{ background: tone.background, color: tone.text, borderColor: tone.border }}
    >
      {label}
    </span>
  );
}

export default function BudgetPage() {
  const totals = budgetCategories.reduce(
    (acc, c) => ({
      estimated: acc.estimated + c.estimated,
      quoted: acc.quoted + c.quoted,
      committed: acc.committed + c.committed,
      paid: acc.paid + c.paid,
    }),
    { estimated: 0, quoted: 0, committed: 0, paid: 0 },
  );
  const variance = totals.committed - totals.estimated;

  return (
    <>
      <PageHeader
        eyebrow="Budget"
        title="Cost overview"
        description="Estimated, quoted, committed, and paid by category. Variance compares committed cost against the estimate."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Estimated", value: totals.estimated },
          { label: "Quoted", value: totals.quoted },
          { label: "Committed", value: totals.committed },
          { label: "Paid", value: totals.paid },
        ].map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col gap-1 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]"
          >
            <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-faint)]">
              {stat.label}
            </span>
            <span className="text-xl font-semibold text-[var(--color-text)]">
              {formatCurrency(stat.value)}
            </span>
          </div>
        ))}
      </div>

      <div
        className="flex flex-col gap-1 rounded-[var(--radius-lg)] border p-4"
        style={
          variance > 0
            ? {
                background: "var(--status-warning-bg)",
                borderColor: "var(--status-warning-border)",
                color: "var(--status-warning-text)",
              }
            : {
                background: "var(--status-success-bg)",
                borderColor: "var(--status-success-border)",
                color: "var(--status-success-text)",
              }
        }
      >
        <span className="text-xs font-semibold uppercase tracking-wide">
          Variance
        </span>
        <span className="text-base font-semibold">
          {variance === 0
            ? "On estimate"
            : variance > 0
              ? `Over estimate by ${formatCurrency(variance)}`
              : `Under estimate by ${formatCurrency(Math.abs(variance))}`}
        </span>
      </div>

      <SectionPanel title="Categories" description="Estimated vs. paid for each line item.">
        <ul className="flex flex-col gap-5">
          {budgetCategories.map((c) => {
            const pct = c.estimated ? Math.min(150, Math.round((c.paid / c.estimated) * 100)) : 0;
            const lineVariance = c.committed - c.estimated;
            return (
              <li key={c.id} className="flex flex-col gap-1.5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold text-[var(--color-text)]">{c.name}</span>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {formatCurrency(c.paid)} paid · {formatCurrency(c.committed)} committed · {formatCurrency(c.quoted)} quoted · {formatCurrency(c.estimated)} estimated
                  </span>
                </div>
                <ProgressBar value={pct} showValue={false} />
                <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]">
                  <span>{pct}% of estimate paid</span>
                  <VarianceTag amount={lineVariance} basis={c.quoted} />
                </div>
              </li>
            );
          })}
        </ul>
      </SectionPanel>
    </>
  );
}
