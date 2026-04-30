import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { RiskBadge } from "@/components/risk-badge";
import { SectionPanel } from "@/components/section-panel";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { Timeline, TimelineItem } from "@/components/timeline-item";
import {
  bids,
  budgetCategories,
  contractors,
  documents,
  openDecisions,
  permits,
  propertyProfile,
  recentActivity,
  riskItems,
  tasks,
  upcomingDeadlines,
} from "@/lib/mock-data";
import { contractorStatusLabels, statusTokens } from "@/lib/status";

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);

export default function WorkbenchPage() {
  const todaysPriority = tasks
    .filter((t) => t.priority === "high")
    .slice(0, 3);

  const openContractorDecisions = contractors
    .filter((c) => c.status === "bid_received" || c.status === "shortlisted")
    .slice(0, 4);

  const totalEstimate = budgetCategories.reduce((s, c) => s + c.estimate, 0);
  const totalCommitted = budgetCategories.reduce((s, c) => s + c.committed, 0);
  const totalActual = budgetCategories.reduce((s, c) => s + c.actual, 0);

  const recentDocs = documents.slice(0, 4);

  const awardedBids = bids.filter((b) => b.award === "awarded").length;
  const pendingBids = bids.filter((b) => b.award !== "awarded" && b.award !== "declined").length;

  const openPermits = permits.filter((p) => p.status !== "complete");

  return (
    <>
      <PageHeader
        eyebrow="Property Workbench"
        title={`${propertyProfile.address} · Renovation`}
        description={`${propertyProfile.type} · ${propertyProfile.squareFeet.toLocaleString()} sq ft · Phase: ${propertyProfile.phase}. Target completion ${propertyProfile.targetCompletion}.`}
        primaryAction={
          <Link
            href="/tasks"
            className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-text-inverse)] transition-colors hover:bg-[var(--color-primary-hover)]"
          >
            Quick add
          </Link>
        }
        secondaryAction={
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-xs font-medium text-[var(--color-text-muted)]">
            Started {propertyProfile.startDate}
          </span>
        }
      />

      <div className="grid grid-cols-1 gap-[13px] sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Phase" value={propertyProfile.phase} delta={`Target ${propertyProfile.targetCompletion}`} />
        <StatCard
          label="Bids"
          value={`${awardedBids} awarded`}
          delta={`${pendingBids} pending decisions`}
        />
        <StatCard
          label="Open tasks"
          value={String(tasks.length)}
          delta={`${tasks.filter((t) => t.priority === "high").length} high priority`}
        />
        <StatCard
          label="Budget committed"
          value={formatCurrency(totalCommitted)}
          delta={`of ${formatCurrency(totalEstimate)} estimate`}
        />
      </div>

      <div className="grid grid-cols-1 gap-[21px] xl:grid-cols-3">
        <SectionPanel
          title="Next decision needed"
          description="What is blocking forward motion right now."
          action={
            <Link href="/bids" className="text-xs font-semibold text-[var(--color-primary)] hover:underline">
              Open bids →
            </Link>
          }
        >
          <ul className="flex flex-col gap-3">
            {openDecisions.map((d) => (
              <li
                key={d.id}
                className="flex flex-col gap-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-3"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold text-[var(--color-text)]">{d.label}</span>
                  <span className="text-xs font-semibold text-[var(--color-text-muted)]">Due {d.due}</span>
                </div>
                <span className="text-xs text-[var(--color-text-muted)]">{d.context}</span>
              </li>
            ))}
          </ul>
        </SectionPanel>

        <SectionPanel
          title="Today's priority"
          description="High priority work for the next 48 hours."
          action={
            <Link href="/tasks" className="text-xs font-semibold text-[var(--color-primary)] hover:underline">
              All tasks →
            </Link>
          }
        >
          <ul className="flex flex-col gap-2">
            {todaysPriority.map((t) => (
              <li
                key={t.id}
                className="flex flex-col gap-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium text-[var(--color-text)]">{t.title}</span>
                  <StatusBadge status={t.status} />
                </div>
                <span className="text-xs text-[var(--color-text-muted)]">
                  {t.context} · Due {t.dueDate}
                </span>
              </li>
            ))}
          </ul>
        </SectionPanel>

        <SectionPanel
          title="Risk register"
          description="Items that could derail schedule or cost."
        >
          <ul className="flex flex-col gap-3">
            {riskItems.map((r) => (
              <li key={r.id} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold text-[var(--color-text)]">{r.label}</span>
                  <RiskBadge severity={r.severity} />
                </div>
                <span className="text-xs text-[var(--color-text-muted)]">{r.context}</span>
              </li>
            ))}
          </ul>
        </SectionPanel>
      </div>

      <div className="grid grid-cols-1 gap-[21px] xl:grid-cols-3">
        <SectionPanel
          title="Open contractor decisions"
          description="Bids received and shortlisted contractors awaiting action."
          action={
            <Link href="/contractors" className="text-xs font-semibold text-[var(--color-primary)] hover:underline">
              All contractors →
            </Link>
          }
          padded={false}
        >
          <ul className="divide-y divide-[var(--color-border)]">
            {openContractorDecisions.map((c) => {
              const meta = contractorStatusLabels[c.status];
              const tone = statusTokens[meta.tone];
              return (
                <li key={c.id} className="flex items-center justify-between gap-3 px-[21px] py-3">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-[var(--color-text)]">{c.organization}</span>
                    <span className="text-xs text-[var(--color-text-muted)]">{c.trade}</span>
                  </div>
                  <span
                    className="inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                    style={{ background: tone.background, color: tone.text }}
                  >
                    {meta.label}
                  </span>
                </li>
              );
            })}
          </ul>
        </SectionPanel>

        <SectionPanel
          title="Permit snapshot"
          description="Filings with the municipality."
          action={
            <Link href="/permits" className="text-xs font-semibold text-[var(--color-primary)] hover:underline">
              Open permits →
            </Link>
          }
          padded={false}
        >
          <ul className="divide-y divide-[var(--color-border)]">
            {openPermits.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-[21px] py-3">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-[var(--color-text)]">{p.type}</span>
                  <span className="text-xs text-[var(--color-text-muted)]">{p.number} · {p.authority}</span>
                </div>
                <StatusBadge status={p.status} />
              </li>
            ))}
          </ul>
        </SectionPanel>

        <SectionPanel
          title="Budget snapshot"
          description="Top categories by exposure."
        >
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex flex-col">
              <dt className="text-xs uppercase tracking-wide text-[var(--color-text-faint)]">Estimate</dt>
              <dd className="text-base font-semibold text-[var(--color-text)]">{formatCurrency(totalEstimate)}</dd>
            </div>
            <div className="flex flex-col">
              <dt className="text-xs uppercase tracking-wide text-[var(--color-text-faint)]">Committed</dt>
              <dd className="text-base font-semibold text-[var(--color-text)]">{formatCurrency(totalCommitted)}</dd>
            </div>
            <div className="flex flex-col">
              <dt className="text-xs uppercase tracking-wide text-[var(--color-text-faint)]">Actual</dt>
              <dd className="text-base font-semibold text-[var(--color-text)]">{formatCurrency(totalActual)}</dd>
            </div>
            <div className="flex flex-col">
              <dt className="text-xs uppercase tracking-wide text-[var(--color-text-faint)]">Remaining</dt>
              <dd className="text-base font-semibold text-[var(--color-text)]">
                {formatCurrency(Math.max(0, totalEstimate - totalCommitted))}
              </dd>
            </div>
          </dl>
        </SectionPanel>
      </div>

      <div className="grid grid-cols-1 gap-[21px] lg:grid-cols-2">
        <SectionPanel
          title="Recent documents & photos"
          description="Latest uploads to the project vault."
          action={
            <Link href="/documents" className="text-xs font-semibold text-[var(--color-primary)] hover:underline">
              All documents →
            </Link>
          }
          padded={false}
        >
          <ul className="divide-y divide-[var(--color-border)]">
            {recentDocs.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 px-[21px] py-3">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-[var(--color-text)]">{d.title}</span>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {d.category}
                    {d.contractor ? ` · ${d.contractor}` : ""}
                  </span>
                </div>
                <span className="text-xs text-[var(--color-text-faint)]">{d.updated}</span>
              </li>
            ))}
          </ul>
        </SectionPanel>

        <SectionPanel
          title="Activity"
          description="Latest events on the project."
          padded={false}
        >
          <div className="px-[21px]">
            <Timeline>
              {recentActivity.map((a) => (
                <TimelineItem
                  key={a.id}
                  label={a.label}
                  context={a.context}
                  timestamp={a.timestamp}
                  tone={a.tone === "neutral" ? "neutral" : a.tone}
                />
              ))}
            </Timeline>
          </div>
        </SectionPanel>
      </div>

      <SectionPanel
        title="Upcoming deadlines"
        description="Watch list across permits, trades, and field walks."
        padded={false}
      >
        <ul className="divide-y divide-[var(--color-border)]">
          {upcomingDeadlines.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 px-[21px] py-3">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-[var(--color-text)]">{d.label}</span>
                <span className="text-xs text-[var(--color-text-muted)]">{d.context}</span>
              </div>
              <span className="text-xs font-semibold text-[var(--color-text-muted)]">Due {d.due}</span>
            </li>
          ))}
        </ul>
      </SectionPanel>
    </>
  );
}
