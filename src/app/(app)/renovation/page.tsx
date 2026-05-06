import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { SectionPanel } from "@/components/section-panel";
import {
  bids,
  budgetCategories,
  contractors,
  documents,
  nextDecisions,
  propertyProfile,
  tasks,
} from "@/lib/mock-data";
import {
  bidStatusLabels,
  contractorStatusLabels,
  insuranceStatusLabels,
  statusTokens,
} from "@/lib/status";

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);

function ToneTag({
  label,
  tone,
}: {
  label: string;
  tone: keyof typeof statusTokens;
}) {
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

export default function RenovationPage() {
  const thisWeek = tasks.filter(
    (t) => t.lane === "today" || t.lane === "this_week",
  );
  const punchList = tasks.filter((t) => t.context === "Punch list");

  const contractorsToContact = contractors.filter(
    (c) =>
      c.status === "prequalification_needed" ||
      c.insurance === "expired" ||
      c.insurance === "missing" ||
      c.bidStatus === "requested",
  );

  const openBids = bids.filter(
    (b) => b.status === "received" || b.status === "shortlisted",
  );

  const missingDocs = documents.filter(
    (d) => d.verified === "needs_verification",
  );

  const totalEstimated = budgetCategories.reduce(
    (s, c) => s + c.estimated,
    0,
  );
  const totalCommitted = budgetCategories.reduce(
    (s, c) => s + c.committed,
    0,
  );
  const totalPaid = budgetCategories.reduce((s, c) => s + c.paid, 0);
  const overrunCategory = budgetCategories.find(
    (c) => c.paid > c.estimated,
  );

  return (
    <>
      <PageHeader
        eyebrow="322 Osborne Workspace"
        title={`${propertyProfile.address} · Active Renovation Project`}
        description={`${propertyProfile.squareFeet.toLocaleString()} sq ft · Started ${propertyProfile.startDate} · Target ${propertyProfile.targetCompletion}. ZIP and official facts need verification.`}
      />

      <SectionPanel
        title="Project Snapshot"
        description="High-level state of the renovation."
      >
        <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div className="flex flex-col gap-1">
            <dt className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-faint)]">
              Phase
            </dt>
            <dd className="font-semibold text-[var(--color-text)]">
              {propertyProfile.phase}
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-faint)]">
              Open tasks
            </dt>
            <dd className="font-semibold text-[var(--color-text)]">
              {tasks.filter((t) => t.lane !== "done").length}
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-faint)]">
              Open bids
            </dt>
            <dd className="font-semibold text-[var(--color-text)]">
              {openBids.length}
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-faint)]">
              Committed
            </dt>
            <dd className="font-semibold text-[var(--color-text)]">
              {formatCurrency(totalCommitted)}{" "}
              <span className="text-xs font-normal text-[var(--color-text-faint)]">
                of {formatCurrency(totalEstimated)}
              </span>
            </dd>
          </div>
        </dl>
      </SectionPanel>

      <SectionPanel
        title="Current Phase"
        description="What this phase covers and what closes it out."
      >
        <p className="text-sm text-[var(--color-text-muted)]">
          {propertyProfile.phase}. Bids are being collected and qualified, with
          award decisions pending insurance verification, scope alignment, and
          permit readiness.
        </p>
      </SectionPanel>

      <SectionPanel
        title="Next Decision Needed"
        description="What is blocking forward motion right now."
      >
        <ul className="flex flex-col gap-3">
          {nextDecisions.map((d) => (
            <li
              key={d.id}
              className="flex flex-col gap-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm font-semibold text-[var(--color-text)]">
                  {d.label}
                </span>
                <span className="text-xs font-medium text-[var(--color-text-muted)]">
                  Due {d.due}
                </span>
              </div>
              <span className="text-xs text-[var(--color-text-muted)]">
                {d.context}
              </span>
            </li>
          ))}
        </ul>
      </SectionPanel>

      <SectionPanel
        title="This Week"
        description={`${thisWeek.length} items`}
        action={
          <Link
            href="/tasks"
            className="text-xs font-semibold text-[var(--color-primary)] hover:underline"
          >
            Open tasks
          </Link>
        }
        padded={false}
      >
        <ul className="divide-y divide-[var(--color-border)]">
          {thisWeek.map((t) => (
            <li
              key={t.id}
              className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-center sm:gap-4"
            >
              <div className="flex flex-1 flex-col gap-0.5">
                <span className="text-sm text-[var(--color-text)]">
                  {t.title}
                </span>
                <span className="text-xs text-[var(--color-text-muted)]">
                  {t.context} · Owner: {t.owner}
                </span>
              </div>
              <span className="text-xs font-semibold text-[var(--color-text-muted)] sm:shrink-0">
                {t.dueDate}
              </span>
            </li>
          ))}
        </ul>
      </SectionPanel>

      <SectionPanel
        title="Contractors to Contact"
        description="Qualification gaps or open requests."
        action={
          <Link
            href="/contacts?category=CONTRACTORS_TRADES"
            className="text-xs font-semibold text-[var(--color-primary)] hover:underline"
          >
            All contacts
          </Link>
        }
        padded={false}
      >
        <ul className="divide-y divide-[var(--color-border)]">
          {contractorsToContact.slice(0, 6).map((c) => {
            const status = contractorStatusLabels[c.status];
            const ins = insuranceStatusLabels[c.insurance];
            return (
              <li key={c.id} className="flex flex-col gap-1 px-5 py-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold text-[var(--color-text)]">
                    {c.company}
                  </span>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {c.trade}
                  </span>
                </div>
                <span className="text-xs text-[var(--color-text-muted)]">
                  {c.contact} · {c.phone}
                </span>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <ToneTag label={status.label} tone={status.tone} />
                  <ToneTag label={ins.label} tone={ins.tone} />
                </div>
              </li>
            );
          })}
        </ul>
      </SectionPanel>

      <SectionPanel
        title="Open Bids"
        description={`${openBids.length} awaiting decision`}
        action={
          <Link
            href="/bids"
            className="text-xs font-semibold text-[var(--color-primary)] hover:underline"
          >
            Compare bids
          </Link>
        }
        padded={false}
      >
        <ul className="divide-y divide-[var(--color-border)]">
          {openBids.map((b) => {
            const meta = bidStatusLabels[b.status];
            return (
              <li
                key={b.id}
                className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-center sm:gap-4"
              >
                <div className="flex flex-1 flex-col">
                  <span className="text-sm font-medium text-[var(--color-text)]">
                    {b.contractor}
                  </span>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {b.trade} · {b.durationDays}d · Start {b.startDate}
                  </span>
                </div>
                <div className="flex items-center gap-3 sm:shrink-0">
                  <span className="text-sm font-semibold text-[var(--color-text)]">
                    {formatCurrency(b.amount)}
                  </span>
                  <ToneTag label={meta.label} tone={meta.tone} />
                </div>
              </li>
            );
          })}
        </ul>
      </SectionPanel>

      <SectionPanel
        title="Tasks / Punch List"
        description={`${punchList.length} punch list items on file`}
        action={
          <Link
            href="/tasks"
            className="text-xs font-semibold text-[var(--color-primary)] hover:underline"
          >
            Open tasks
          </Link>
        }
      >
        {punchList.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">
            No punch list items recorded yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {punchList.map((t) => (
              <li
                key={t.id}
                className="flex items-baseline justify-between gap-3 text-sm"
              >
                <span className="text-[var(--color-text)]">{t.title}</span>
                <span className="text-xs text-[var(--color-text-muted)]">
                  {t.dueDate} · {t.owner}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionPanel>

      <SectionPanel
        title="Missing Documents"
        description={`${missingDocs.length} need verification`}
        action={
          <Link
            href="/documents"
            className="text-xs font-semibold text-[var(--color-primary)] hover:underline"
          >
            All documents
          </Link>
        }
        padded={false}
      >
        <ul className="divide-y divide-[var(--color-border)]">
          {missingDocs.slice(0, 6).map((d) => (
            <li key={d.id} className="flex flex-col gap-0.5 px-5 py-3">
              <span className="text-sm text-[var(--color-text)]">{d.name}</span>
              <span className="text-xs text-[var(--color-text-muted)]">
                {d.type} · {d.linkedTo}
              </span>
            </li>
          ))}
        </ul>
      </SectionPanel>

      <SectionPanel
        title="Budget Exposure"
        description="Estimated vs. committed and paid to date."
      >
        <div className="flex flex-col gap-3 text-sm">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[var(--color-text-muted)]">Paid to date</span>
            <span className="font-semibold text-[var(--color-text)]">
              {formatCurrency(totalPaid)}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[var(--color-text-muted)]">Committed</span>
            <span className="font-semibold text-[var(--color-text)]">
              {formatCurrency(totalCommitted)}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[var(--color-text-muted)]">Estimated</span>
            <span className="font-semibold text-[var(--color-text)]">
              {formatCurrency(totalEstimated)}
            </span>
          </div>
          {overrunCategory ? (
            <p className="rounded-[var(--radius-md)] border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] p-3 text-xs text-[var(--status-warning-text)]">
              {overrunCategory.name} is over its estimate. Review variance on
              the budget page.
            </p>
          ) : (
            <p className="text-xs text-[var(--color-text-muted)]">
              No category currently exceeds its estimate.
            </p>
          )}
          <Link
            href="/budget"
            className="text-xs font-semibold text-[var(--color-primary)] hover:underline"
          >
            Open budget
          </Link>
        </div>
      </SectionPanel>

      <SectionPanel
        title="Permit / Inspection Notes"
        description="Outstanding items for the Town of Loudonville."
      >
        <ul className="flex flex-col gap-2 text-sm text-[var(--color-text-muted)]">
          <li>Building permit application submitted — awaiting plan review.</li>
          <li>Demolition permit closed out.</li>
          <li>
            Pre-construction inspection notes on file —{" "}
            <span className="text-[var(--status-warning-text)]">
              needs verification
            </span>
            .
          </li>
        </ul>
      </SectionPanel>

      <SectionPanel
        title="Risks"
        description="Known risks tracked for this project."
      >
        <ul className="flex flex-col gap-2 text-sm text-[var(--color-text-muted)]">
          <li>
            Tile lead time may shift the finishes phase if not selected this
            week.
          </li>
          <li>
            Adirondack Plumbing workers comp is expired — cannot award until
            updated certificate is on file.
          </li>
          <li>
            Roofing decking allowance variance between Northline and Capital
            bids is unresolved.
          </li>
        </ul>
      </SectionPanel>

      <SectionPanel
        title="Decision Log"
        description="Decisions of record for this project."
      >
        <ul className="flex flex-col gap-2 text-sm text-[var(--color-text-muted)]">
          <li>Architect agreement executed (Loudonville Architecture).</li>
          <li>Electrical scope awarded to Mohawk Electric LLC.</li>
          <li>Demolition permit closed out.</li>
        </ul>
      </SectionPanel>
    </>
  );
}
