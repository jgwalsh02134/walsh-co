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

function ToneTag({ label, tone }: { label: string; tone: keyof typeof statusTokens }) {
  const t = statusTokens[tone];
  return (
    <span
      className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium"
      style={{ background: t.background, color: t.text, borderColor: t.border }}
    >
      {label}
    </span>
  );
}

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
        eyebrow="Budget & Financials"
        title="Cost overview"
        description="Estimates, quoted costs, committed costs, paid costs, variance, and exposure across the portfolio."
      />

      <SectionPanel
        title="Portfolio Financial Summary"
        description="High-level financial picture across the business portfolio."
      >
        <p className="text-sm text-[var(--color-text-muted)]">
          Cash-flowing rentals, active renovations, and aggregate exposure roll
          up here. Property-level numbers will populate as financial records
          are loaded.
        </p>
      </SectionPanel>

      <SectionPanel
        title="Property-Level Budget"
        description="Per-property budget summaries."
      >
        <ul className="flex flex-col divide-y divide-[var(--color-border)] text-sm">
          <li className="flex items-baseline justify-between gap-3 py-3">
            <span className="text-[var(--color-text)]">51 Loudonwood E</span>
            <span className="text-xs text-[var(--color-text-muted)]">
              Active Rental — financials not yet loaded
            </span>
          </li>
          <li className="flex items-baseline justify-between gap-3 py-3">
            <span className="text-[var(--color-text)]">16 Momrow Ct</span>
            <span className="text-xs text-[var(--color-text-muted)]">
              Active Rental — financials not yet loaded
            </span>
          </li>
          <li className="flex items-baseline justify-between gap-3 py-3">
            <span className="text-[var(--color-text)]">322 Osborne Rd</span>
            <span className="text-xs text-[var(--color-text-muted)]">
              Renovation budget detailed below
            </span>
          </li>
        </ul>
      </SectionPanel>

      <SectionPanel
        title="Renovation Budget"
        description="322 Osborne Rd — totals across all categories."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Estimates", value: totals.estimated },
            { label: "Quoted Costs", value: totals.quoted },
            { label: "Committed Costs", value: totals.committed },
            { label: "Paid Costs", value: totals.paid },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col gap-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-3"
            >
              <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-faint)]">
                {stat.label}
              </span>
              <span className="text-base font-semibold text-[var(--color-text)]">
                {formatCurrency(stat.value)}
              </span>
            </div>
          ))}
        </div>
      </SectionPanel>

      <SectionPanel
        title="Variance"
        description="Committed cost compared to estimate."
      >
        <div
          className="flex flex-col gap-1 rounded-[var(--radius-md)] border p-4"
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
          <span className="text-base font-semibold">
            {variance === 0
              ? "On estimate"
              : variance > 0
                ? `Over estimate by ${formatCurrency(variance)}`
                : `Under estimate by ${formatCurrency(Math.abs(variance))}`}
          </span>
        </div>

        <ul className="mt-4 flex flex-col gap-5">
          {budgetCategories.map((c) => {
            const pct = c.estimated
              ? Math.min(150, Math.round((c.paid / c.estimated) * 100))
              : 0;
            const lineVariance = c.committed - c.estimated;
            return (
              <li key={c.id} className="flex flex-col gap-1.5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold text-[var(--color-text)]">
                    {c.name}
                  </span>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {formatCurrency(c.paid)} paid · {formatCurrency(c.committed)}{" "}
                    committed · {formatCurrency(c.quoted)} quoted ·{" "}
                    {formatCurrency(c.estimated)} estimated
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

      <SectionPanel
        title="Change Orders"
        description="Approved changes to scope or price."
      >
        <p className="text-sm text-[var(--color-text-muted)]">
          No change orders recorded yet.{" "}
          <ToneTag label="Coming later" tone="neutral" />
        </p>
      </SectionPanel>

      <SectionPanel
        title="Cash Flow"
        description="Inflows and outflows across the portfolio."
      >
        <p className="text-sm text-[var(--color-text-muted)]">
          Rent rolls and capital outlays will populate here once financial
          records are loaded.{" "}
          <ToneTag label="Coming later" tone="neutral" />
        </p>
      </SectionPanel>
    </>
  );
}
