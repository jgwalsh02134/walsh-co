import Link from "next/link";
import { MetricTile } from "@/components/metric-tile";
import { PageHeader } from "@/components/page-header";
import { ProgressBar } from "@/components/progress-bar";
import { SectionPanel } from "@/components/section-panel";
import { ToneTag } from "@/components/tone-tag";
import {
  bids,
  budgetCategories,
  budgetCategoryKindLabels,
  type Bid,
  type BudgetCategory,
  type BudgetCategoryKind,
} from "@/lib/mock-data";
import type { StatusTone } from "@/lib/status";

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);

function lookupBid(id: string): Bid | null {
  return bids.find((b) => b.id === id) ?? null;
}

function categoryVarianceTone(estimated: number, committed: number): StatusTone {
  if (estimated === 0 && committed === 0) return "neutral";
  if (committed === 0) return "neutral";
  if (committed > estimated) return "warning";
  if (committed >= estimated * 0.9) return "review";
  return "success";
}

function categoryVarianceLabel(c: BudgetCategory): string {
  if (c.quoted === 0 && c.committed === 0) return "No quote yet";
  const variance = c.committed - c.estimated;
  if (variance === 0) return "On estimate";
  return variance > 0
    ? `Over by ${formatCurrency(variance)}`
    : `Under by ${formatCurrency(Math.abs(variance))}`;
}

const ISSUE_META: Record<
  NonNullable<BudgetCategory["issue"]>["kind"],
  { label: string; tone: StatusTone }
> = {
  over_budget: { label: "Over budget", tone: "warning" },
  missing_quote: { label: "Missing quote", tone: "review" },
  scope_pending: { label: "Scope pending", tone: "review" },
  contingency_low: { label: "Contingency low", tone: "warning" },
};

export default function BudgetPage() {
  // Renovation budget is scoped to 322 Osborne for this first pass. We
  // filter explicitly so future per-property pages can render the same
  // component cleanly.
  const renovationCategories = budgetCategories.filter(
    (c) => c.propertySlug === "322-osborne" || !c.propertySlug
  );

  const totals = renovationCategories.reduce(
    (acc, c) => ({
      estimated: acc.estimated + c.estimated,
      quoted: acc.quoted + c.quoted,
      committed: acc.committed + c.committed,
      paid: acc.paid + c.paid,
    }),
    { estimated: 0, quoted: 0, committed: 0, paid: 0 }
  );

  const contingency = renovationCategories.find((c) => c.kind === "contingency");
  const acquisitionCommitted = renovationCategories
    .filter((c) => c.kind === "acquisition")
    .reduce((s, c) => s + c.committed, 0);

  // Accepted bid total — sum of `accepted` lifecycle bids only.
  const acceptedBidTotal = bids
    .filter((b) => b.lifecycle === "accepted")
    .reduce((s, b) => s + b.amount, 0);

  // "Renovation" estimate excludes acquisition + contingency so the
  // remaining-budget metric reads as "money budgeted for construction
  // work that hasn't been spent yet."
  const renovationEstimate = renovationCategories
    .filter((c) => c.kind !== "acquisition" && c.kind !== "contingency")
    .reduce((s, c) => s + c.estimated, 0);
  const renovationPaid = renovationCategories
    .filter((c) => c.kind !== "acquisition")
    .reduce((s, c) => s + c.paid, 0);
  const remaining = Math.max(renovationEstimate - renovationPaid, 0);

  const issueCategories = renovationCategories.filter((c) => c.issue);

  return (
    <>
      <PageHeader
        eyebrow="Budget"
        title="Renovation cost control"
        description="322 Osborne renovation budget — estimates, committed amounts, actuals, contingency, and open issues. AI placeholders are draft aids; verify before relying."
      />

      <SectionPanel
        title="Renovation budget summary"
        description="Across renovation categories. Acquisition is shown separately so it doesn't crowd construction metrics."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <MetricTile
            label="Estimated renovation"
            value={formatCurrency(renovationEstimate)}
            hint="Construction work only (no acquisition/contingency)"
          />
          <MetricTile
            label="Accepted bid total"
            value={formatCurrency(acceptedBidTotal)}
            hint={
              acceptedBidTotal === 0
                ? "Nothing accepted yet"
                : "Sum of accepted contractor bids"
            }
          />
          <MetricTile
            label="Actual spend"
            value={formatCurrency(renovationPaid)}
            hint="Paid to date across renovation"
          />
          <MetricTile
            label="Remaining budget"
            value={formatCurrency(remaining)}
            hint="Estimated minus paid"
          />
          <MetricTile
            label="Contingency reserve"
            value={formatCurrency(contingency?.estimated ?? 0)}
            hint={
              contingency
                ? `${formatCurrency(contingency.paid)} drawn so far`
                : "Not set"
            }
          />
          <MetricTile
            label="Items needing review"
            value={String(issueCategories.length)}
            hint={
              issueCategories.length === 0
                ? "Clean across categories"
                : "See Open Issues below"
            }
          />
        </div>
        {acquisitionCommitted > 0 ? (
          <p className="mt-3 text-[12px] text-[var(--workspace-text-muted)]">
            Acquisition committed: {formatCurrency(acquisitionCommitted)} —
            tracked separately from the construction budget above.
          </p>
        ) : null}
      </SectionPanel>

      <SectionPanel
        title="Cost categories"
        description="Each line shows estimate, quoted, committed, and paid — plus the bid(s) feeding it, if any."
      >
        <ul className="flex flex-col gap-3">
          {renovationCategories.map((c) => (
            <BudgetCategoryRow key={c.id} category={c} />
          ))}
        </ul>
      </SectionPanel>

      <SectionPanel
        title="Actual vs estimated"
        description="Where committed amounts land against the estimate. Bars fill to paid as a fraction of estimate."
      >
        <ul className="flex flex-col gap-5">
          {renovationCategories
            .filter((c) => c.kind !== "acquisition")
            .map((c) => {
              const pct = c.estimated
                ? Math.min(150, Math.round((c.paid / c.estimated) * 100))
                : 0;
              return (
                <li key={c.id} className="flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold text-[var(--color-text)]">
                      {c.name}
                    </span>
                    <span className="text-xs text-[var(--color-text-muted)]">
                      {formatCurrency(c.paid)} paid ·{" "}
                      {formatCurrency(c.committed)} committed ·{" "}
                      {formatCurrency(c.estimated)} estimated
                    </span>
                  </div>
                  <ProgressBar value={pct} showValue={false} />
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]">
                    <span>{pct}% of estimate paid</span>
                    <ToneTag
                      label={categoryVarianceLabel(c)}
                      tone={categoryVarianceTone(c.estimated, c.committed)}
                    />
                  </div>
                </li>
              );
            })}
        </ul>
      </SectionPanel>

      <ContingencyPanel category={contingency ?? null} totals={totals} />

      <OpenBudgetIssuesPanel categories={issueCategories} />

      <AiBudgetPanel />

      <SectionPanel
        title="Portfolio summary"
        description="High-level picture across the business portfolio."
      >
        <p className="text-sm text-[var(--color-text-muted)]">
          Cash-flowing rentals, active renovations, and aggregate exposure roll
          up here. Property-level numbers populate as financial records are
          loaded.
        </p>
      </SectionPanel>

      <SectionPanel
        title="Change orders"
        description="Approved changes to scope or price."
      >
        <p className="text-sm text-[var(--color-text-muted)]">
          No change orders recorded yet.{" "}
          <ToneTag label="Coming later" tone="neutral" />
        </p>
      </SectionPanel>
    </>
  );
}

// =============================================================
// Budget category row
// =============================================================

function BudgetCategoryRow({ category }: { category: BudgetCategory }) {
  const variance = category.committed - category.estimated;
  const tone = categoryVarianceTone(category.estimated, category.committed);
  const kindLabel = labelForKind(category.kind);
  const linkedBids = (category.linkedBidIds ?? [])
    .map(lookupBid)
    .filter((b): b is Bid => b !== null);

  return (
    <li className="rounded-[var(--radius-md)] bg-[var(--color-surface-soft)] p-4 shadow-[var(--shadow-card-ring)]">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-base font-semibold text-[var(--workspace-text)] [overflow-wrap:anywhere]">
              {category.name}
            </span>
            {kindLabel ? (
              <span className="text-[12px] text-[var(--workspace-text-secondary)]">
                · {kindLabel}
              </span>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[12px] text-[var(--workspace-text-secondary)] sm:grid-cols-4">
            <span>
              Estimate{" "}
              <span className="font-data tabular-nums text-[var(--workspace-text)]">
                {formatCurrency(category.estimated)}
              </span>
            </span>
            <span>
              Quoted{" "}
              <span className="font-data tabular-nums text-[var(--workspace-text)]">
                {formatCurrency(category.quoted)}
              </span>
            </span>
            <span>
              Committed{" "}
              <span className="font-data tabular-nums text-[var(--workspace-text)]">
                {formatCurrency(category.committed)}
              </span>
            </span>
            <span>
              Paid{" "}
              <span className="font-data tabular-nums text-[var(--workspace-text)]">
                {formatCurrency(category.paid)}
              </span>
            </span>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-2">
            <ToneTag label={categoryVarianceLabel(category)} tone={tone} />
            {linkedBids.length > 0 ? (
              linkedBids.map((bid) => (
                <Link
                  key={bid.id}
                  href="/bids"
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-0.5 text-[11px] font-medium text-[var(--workspace-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                >
                  Bid: {bid.contractor}
                </Link>
              ))
            ) : category.kind !== "acquisition" && category.kind !== "contingency" ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-0.5 text-[11px] font-medium text-[var(--workspace-text-muted)]">
                No bid linked
              </span>
            ) : null}
            {category.issue ? (
              <ToneTag
                label={ISSUE_META[category.issue.kind].label}
                tone={ISSUE_META[category.issue.kind].tone}
              />
            ) : null}
          </div>

          {category.issue ? (
            <p className="text-[12.5px] text-[var(--workspace-text-secondary)]">
              <span className="font-semibold text-[var(--workspace-text)]">
                Note:
              </span>{" "}
              {category.issue.note}
            </p>
          ) : category.notes ? (
            <p className="text-[12.5px] text-[var(--workspace-text-secondary)]">
              {category.notes}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col items-start gap-2 sm:items-end">
          <span className="font-data text-xl font-semibold tabular-nums text-[var(--workspace-text)] [overflow-wrap:anywhere]">
            {formatCurrency(category.estimated)}
          </span>
          <div className="flex flex-wrap gap-1.5">
            <Link
              href="/bids"
              className="inline-flex min-h-[28px] items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--workspace-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
            >
              Bids
            </Link>
            <Link
              href="/documents"
              className="inline-flex min-h-[28px] items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--workspace-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
            >
              Docs
            </Link>
            <Link
              href="/tasks"
              className="inline-flex min-h-[28px] items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--workspace-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
            >
              Tasks
            </Link>
            <span className="inline-flex min-h-[28px] cursor-default items-center rounded-full border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--workspace-text-muted)]">
              {variance > 0 ? "▲" : variance < 0 ? "▼" : "—"} variance
            </span>
          </div>
        </div>
      </div>
    </li>
  );
}

function labelForKind(kind: BudgetCategoryKind | undefined): string | null {
  if (!kind) return null;
  return budgetCategoryKindLabels[kind];
}

// =============================================================
// Contingency
// =============================================================

function ContingencyPanel({
  category,
  totals,
}: {
  category: BudgetCategory | null;
  totals: { estimated: number; quoted: number; committed: number; paid: number };
}) {
  if (!category) {
    return (
      <SectionPanel
        title="Contingency reserve"
        description="No contingency category configured."
      >
        <p className="text-sm text-[var(--color-text-muted)]">
          Add a Contingency budget line to track reserve drawdown over the
          life of the project.
        </p>
      </SectionPanel>
    );
  }

  const drawn = category.paid;
  const remaining = Math.max(category.estimated - drawn, 0);
  const pct =
    category.estimated > 0
      ? Math.min(150, Math.round((drawn / category.estimated) * 100))
      : 0;
  const exposureRatio =
    totals.estimated > 0
      ? Math.round((category.estimated / totals.estimated) * 100)
      : 0;
  const lowReserve = remaining < category.estimated * 0.25;

  return (
    <SectionPanel
      title="Contingency reserve"
      description="What's set aside for unknowns and how much has been drawn."
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MetricTile
          label="Reserve"
          value={formatCurrency(category.estimated)}
          hint={`${exposureRatio}% of total budget`}
        />
        <MetricTile
          label="Drawn"
          value={formatCurrency(drawn)}
          hint={`${pct}% of reserve used`}
        />
        <MetricTile
          label="Remaining"
          value={formatCurrency(remaining)}
          hint={lowReserve ? "Low — review soon" : "Healthy"}
        />
      </div>
      <p className="mt-3 text-[12px] text-[var(--workspace-text-secondary)]">
        Contingency is intentionally excluded from the &quot;estimated
        renovation&quot; metric so a healthy reserve doesn&apos;t inflate the
        construction estimate. Adjust the reserve as scope clarifies.
      </p>
    </SectionPanel>
  );
}

// =============================================================
// Open budget issues
// =============================================================

function OpenBudgetIssuesPanel({
  categories,
}: {
  categories: BudgetCategory[];
}) {
  return (
    <SectionPanel
      title="Open budget issues"
      description={
        categories.length === 0
          ? "Nothing flagged right now."
          : `${categories.length} categor${
              categories.length === 1 ? "y" : "ies"
            } need attention.`
      }
    >
      {categories.length === 0 ? (
        <p className="text-sm text-[var(--workspace-text-secondary)]">
          Flagged categories (missing quote, scope pending, over budget) will
          surface here for action.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {categories.map((c) => {
            const issue = c.issue!;
            const meta = ISSUE_META[issue.kind];
            return (
              <li
                key={c.id}
                className="rounded-[var(--radius-md)] border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] p-4 shadow-[var(--shadow-card-ring)]"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold text-[var(--workspace-text)]">
                    {c.name}
                  </span>
                  <ToneTag label={meta.label} tone={meta.tone} />
                </div>
                <p className="mt-1 text-[12.5px] text-[var(--workspace-text-secondary)]">
                  {issue.note}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Link
                    href="/bids"
                    className="inline-flex min-h-[28px] items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--workspace-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                  >
                    Open bids
                  </Link>
                  <Link
                    href="/documents"
                    className="inline-flex min-h-[28px] items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--workspace-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                  >
                    Docs
                  </Link>
                  <Link
                    href="/tasks"
                    className="inline-flex min-h-[28px] items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--workspace-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                  >
                    Tasks
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </SectionPanel>
  );
}

// =============================================================
// AI placeholder
// =============================================================

const AI_BUDGET_ACTIONS = [
  {
    label: "Find budget risks",
    description:
      "Surface categories with missing quotes, scope gaps, or pricing outliers vs. comparable projects.",
  },
  {
    label: "Build weekly renovation plan",
    description:
      "Draft a 1-week plan that respects budget exposure, vendor availability, and permit dates.",
  },
  {
    label: "Summarize variance",
    description:
      "Plain-language explanation of where the budget is drifting and why — for review, not action.",
  },
] as const;

function AiBudgetPanel() {
  return (
    <SectionPanel
      title="AI budget review"
      description="Runs only when you click an action. Output is a draft review — verify before relying."
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {AI_BUDGET_ACTIONS.map((a) => (
          <button
            key={a.label}
            type="button"
            disabled
            aria-disabled
            title="AI budget review is not wired in this first-pass build."
            className="flex cursor-not-allowed flex-col items-start gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-surface-soft)] p-4 text-left shadow-[var(--shadow-card-ring)]"
          >
            <span className="text-sm font-semibold text-[var(--workspace-text)]">
              {a.label}
            </span>
            <span className="text-[12.5px] leading-relaxed text-[var(--workspace-text-secondary)]">
              {a.description}
            </span>
            <span className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--workspace-text-muted)]">
              First pass · not yet wired
            </span>
          </button>
        ))}
      </div>
      <p className="mt-3 text-[12px] text-[var(--workspace-text-secondary)]">
        AI budget review is a draft aid. Verify scope, permits, insurance, and
        contract terms before relying.
      </p>
    </SectionPanel>
  );
}
