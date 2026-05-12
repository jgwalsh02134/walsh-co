import Link from "next/link";
import { GmailDraftButton } from "@/components/gmail-draft-button";
import { MetricTile } from "@/components/metric-tile";
import { PageHeader } from "@/components/page-header";
import { SectionPanel } from "@/components/section-panel";
import { ToneTag } from "@/components/tone-tag";
import {
  isGmailDraftsEnabled,
  isGoogleConnected,
} from "@/lib/google-gmail";
import { trackedProperties } from "@/lib/market-data";
import {
  bids,
  contractors,
  documents,
  type Bid,
  type BidLifecycleStatus,
  type BidTradeCategory,
} from "@/lib/mock-data";
import type { StatusTone } from "@/lib/status";

// =============================================================
// Lifecycle + trade metadata
// =============================================================

const LIFECYCLE_META: Record<
  BidLifecycleStatus,
  { label: string; tone: StatusTone }
> = {
  draft: { label: "Draft", tone: "neutral" },
  requested: { label: "Requested", tone: "info" },
  received: { label: "Received", tone: "review" },
  under_review: { label: "Under review", tone: "review" },
  needs_clarification: { label: "Needs clarification", tone: "warning" },
  accepted: { label: "Accepted", tone: "success" },
  rejected: { label: "Rejected", tone: "error" },
  archived: { label: "Archived", tone: "neutral" },
};

type TradeFilterOption = {
  id: BidTradeCategory | "all";
  label: string;
};

const TRADE_OPTIONS: TradeFilterOption[] = [
  { id: "all", label: "All trades" },
  { id: "general_contractor", label: "General Contractor" },
  { id: "electrical", label: "Electrical" },
  { id: "plumbing", label: "Plumbing" },
  { id: "hvac", label: "HVAC" },
  { id: "masonry", label: "Masonry" },
  { id: "roofing", label: "Roofing" },
  { id: "painting", label: "Painting" },
  { id: "flooring", label: "Flooring" },
  { id: "windows_doors", label: "Windows / Doors" },
  { id: "sitework_drainage", label: "Sitework / Drainage" },
  { id: "inspection_testing", label: "Inspection / Testing" },
  { id: "other", label: "Other" },
];

const TRADE_LABEL: Record<BidTradeCategory, string> = TRADE_OPTIONS.reduce(
  (acc, t) => {
    if (t.id !== "all") acc[t.id] = t.label;
    return acc;
  },
  {} as Record<BidTradeCategory, string>
);

// =============================================================
// Helpers
// =============================================================

const formatCurrency = (n: number | null | undefined) => {
  if (n == null || n === 0) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
};

function lifecycleFor(bid: Bid): BidLifecycleStatus {
  // Fallback when lifecycle is missing — map from legacy fields so the
  // UI never errors on a partially-annotated bid.
  if (bid.lifecycle) return bid.lifecycle;
  if (bid.decision === "approved") return "accepted";
  if (bid.decision === "rejected") return "rejected";
  switch (bid.status) {
    case "requested":
      return "requested";
    case "received":
      return "received";
    case "shortlisted":
      return "under_review";
    case "awarded":
      return "accepted";
    case "declined":
      return "rejected";
    default:
      return "draft";
  }
}

function isTradeOption(value: unknown): value is TradeFilterOption["id"] {
  if (typeof value !== "string") return false;
  return TRADE_OPTIONS.some((t) => t.id === value);
}

function completenessTone(pct: number | undefined): StatusTone {
  if (pct == null) return "neutral";
  if (pct >= 80) return "success";
  if (pct >= 50) return "warning";
  return "error";
}

// =============================================================
// Page
// =============================================================

type SearchParams = Promise<{ trade?: string }>;

export default async function BidsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { trade: rawTrade } = await searchParams;
  const activeTrade: TradeFilterOption["id"] = isTradeOption(rawTrade)
    ? rawTrade
    : "all";

  const filtered =
    activeTrade === "all"
      ? bids
      : bids.filter((b) => b.tradeCategory === activeTrade);

  const gmailEnabled = isGmailDraftsEnabled();
  const gmailConnected = gmailEnabled ? await isGoogleConnected() : false;

  // Summary across the unfiltered set so the metrics describe the full
  // pipeline regardless of the current filter.
  const lifecycleCounts: Record<BidLifecycleStatus, number> = {
    draft: 0,
    requested: 0,
    received: 0,
    under_review: 0,
    needs_clarification: 0,
    accepted: 0,
    rejected: 0,
    archived: 0,
  };
  for (const b of bids) lifecycleCounts[lifecycleFor(b)]++;

  const totalQuoted = bids
    .filter((b) => lifecycleFor(b) !== "draft" && lifecycleFor(b) !== "rejected")
    .reduce((sum, b) => sum + (b.amount > 0 ? b.amount : 0), 0);
  const acceptedAmount = bids
    .filter((b) => lifecycleFor(b) === "accepted")
    .reduce((sum, b) => sum + b.amount, 0);
  const receivedCount =
    lifecycleCounts.received +
    lifecycleCounts.under_review +
    lifecycleCounts.needs_clarification +
    lifecycleCounts.accepted +
    lifecycleCounts.rejected;

  return (
    <>
      <PageHeader
        eyebrow="Bids"
        title="Contractor comparison"
        description="Compare contractor proposals across trades, surface scope gaps, and decide what to award. AI bid review is a draft aid — verify scope, permits, insurance, and contract terms before relying."
        primaryAction={
          <button
            type="button"
            disabled
            aria-disabled
            title="Bid request flow is not wired in this build."
            className="inline-flex min-h-[40px] cursor-not-allowed items-center justify-center rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface-soft)] px-3.5 py-2 text-sm font-medium text-[var(--workspace-text-secondary)]"
          >
            Request bid
          </button>
        }
      />

      <SampleBanner total={bids.length} />

      <SectionPanel
        title="Pipeline summary"
        description="Across all trades. Filtering below does not change these totals."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <MetricTile
            label="Total bids"
            value={String(bids.length)}
            hint="In pipeline"
          />
          <MetricTile
            label="Received"
            value={String(receivedCount)}
            hint="At least proposal in hand"
          />
          <MetricTile
            label="Total quoted"
            value={formatCurrency(totalQuoted)}
            hint="Sum of received bids"
          />
          <MetricTile
            label="Need clarification"
            value={String(lifecycleCounts.needs_clarification)}
            hint="Open scope questions"
          />
          <MetricTile
            label="Accepted amount"
            value={formatCurrency(acceptedAmount)}
            hint={
              lifecycleCounts.accepted === 0
                ? "Nothing accepted yet"
                : `${lifecycleCounts.accepted} bid${
                    lifecycleCounts.accepted === 1 ? "" : "s"
                  } accepted`
            }
          />
        </div>
      </SectionPanel>

      <SectionPanel
        title="Comparison"
        description={`${filtered.length} bid${
          filtered.length === 1 ? "" : "s"
        } shown.`}
      >
        <TradeFilters active={activeTrade} />
        <BidList
          bids={filtered}
          activeTrade={activeTrade}
          gmailEnabled={gmailEnabled}
          gmailConnected={gmailConnected}
        />
      </SectionPanel>

      <AiReviewPanel />
    </>
  );
}

// =============================================================
// Sample-data banner
// =============================================================

function SampleBanner({ total }: { total: number }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius-md)] bg-[var(--color-surface-soft)] px-4 py-3 text-sm shadow-[var(--shadow-card-ring)]">
      <ToneTag label="Sample data" tone="neutral" />
      <span className="text-[var(--workspace-text-secondary)]">
        {total} sample bids shown. Bid request, document storage, and AI
        review are placeholders in this first-pass build.
      </span>
    </div>
  );
}

// =============================================================
// Trade filter chip strip
// =============================================================

function TradeFilters({ active }: { active: TradeFilterOption["id"] }) {
  return (
    <nav
      aria-label="Filter bids by trade"
      className="-mx-1 flex flex-wrap gap-2 pb-3"
    >
      {TRADE_OPTIONS.map((opt) => {
        const isActive = active === opt.id;
        const href =
          opt.id === "all"
            ? "/bids"
            : `/bids?trade=${encodeURIComponent(opt.id)}`;
        return (
          <Link
            key={opt.id}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={`inline-flex min-h-[36px] items-center justify-center rounded-full border px-3 py-1 text-[12.5px] font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] ${
              isActive
                ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
                : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--workspace-text-secondary)] hover:border-[var(--color-border-strong)] hover:text-[var(--workspace-text)]"
            }`}
          >
            {opt.label}
          </Link>
        );
      })}
    </nav>
  );
}

// =============================================================
// Bid list
// =============================================================

function BidList({
  bids,
  activeTrade,
  gmailEnabled,
  gmailConnected,
}: {
  bids: Bid[];
  activeTrade: TradeFilterOption["id"];
  gmailEnabled: boolean;
  gmailConnected: boolean;
}) {
  if (bids.length === 0) {
    return (
      <div className="rounded-[var(--radius-md)] bg-[var(--color-surface-soft)] px-4 py-6 text-center text-sm text-[var(--workspace-text-secondary)] shadow-[var(--shadow-card-ring)]">
        No bids in this trade yet.
        {activeTrade !== "all" ? (
          <>
            {" "}
            <Link
              href="/bids"
              className="font-semibold text-[var(--color-primary)] hover:underline"
            >
              Show all
            </Link>
          </>
        ) : null}
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {bids.map((bid) => (
        <BidRow
          key={bid.id}
          bid={bid}
          gmailEnabled={gmailEnabled}
          gmailConnected={gmailConnected}
        />
      ))}
    </ul>
  );
}

function BidRow({
  bid,
  gmailEnabled,
  gmailConnected,
}: {
  bid: Bid;
  gmailEnabled: boolean;
  gmailConnected: boolean;
}) {
  const lifecycleId = lifecycleFor(bid);
  const lifecycle = LIFECYCLE_META[lifecycleId];
  const tradeLabel = bid.tradeCategory
    ? TRADE_LABEL[bid.tradeCategory]
    : bid.trade;
  const property =
    bid.propertySlug !== undefined
      ? trackedProperties.find((p) => p.slug === bid.propertySlug) ?? null
      : null;
  const linkedDoc = bid.linkedDocumentId
    ? documents.find((d) => d.id === bid.linkedDocumentId) ?? null
    : null;
  const completeness =
    bid.completenessPct != null
      ? `${bid.completenessPct}% complete`
      : "Completeness not set";
  const showClarificationDraft = lifecycleId === "needs_clarification";
  const showGmailDraft =
    lifecycleId !== "draft" && lifecycleId !== "archived";
  const contractorRecord = contractors.find((c) => c.id === bid.contractorId);
  const contractorEmail = contractorRecord?.email ?? null;
  const formattedAmount = bid.amount > 0 ? formatCurrency(bid.amount) : null;

  return (
    <li className="rounded-[var(--radius-md)] bg-[var(--color-surface-soft)] p-4 shadow-[var(--shadow-card-ring)]">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-base font-semibold text-[var(--workspace-text)] [overflow-wrap:anywhere]">
              {bid.contractor}
            </span>
            <span className="text-[12.5px] text-[var(--workspace-text-secondary)]">
              · {tradeLabel}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[12px] text-[var(--workspace-text-secondary)]">
            {bid.dateReceived ? (
              <span>Received {bid.dateReceived}</span>
            ) : (
              <span>Not yet received</span>
            )}
            {bid.startDate && bid.startDate !== "—" ? (
              <>
                <span aria-hidden>·</span>
                <span>Start {bid.startDate}</span>
              </>
            ) : null}
            {bid.durationDays > 0 ? (
              <>
                <span aria-hidden>·</span>
                <span>{bid.durationDays}d</span>
              </>
            ) : null}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-2">
            <ToneTag label={lifecycle.label} tone={lifecycle.tone} />
            <ToneTag
              label={completeness}
              tone={completenessTone(bid.completenessPct)}
            />
            {property ? (
              <Link
                href={`/properties/${property.slug}`}
                className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-0.5 text-[11px] font-medium text-[var(--workspace-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
              >
                {property.address}
              </Link>
            ) : null}
            {linkedDoc ? (
              <Link
                href="/documents"
                className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-0.5 text-[11px] font-medium text-[var(--workspace-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
              >
                Doc: {linkedDoc.name}
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-0.5 text-[11px] font-medium text-[var(--workspace-text-muted)]">
                No bid PDF linked
              </span>
            )}
          </div>

          {bid.nextAction ? (
            <p className="mt-1 text-[12.5px] text-[var(--workspace-text-secondary)]">
              <span className="font-semibold text-[var(--workspace-text)]">
                Next:
              </span>{" "}
              {bid.nextAction}
            </p>
          ) : null}

          {showGmailDraft
            ? (() => {
                const propertyName = property?.address ?? null;
                const subjectBase = `${bid.contractor} — ${tradeLabel}${
                  propertyName ? ` (${propertyName})` : ""
                }`;
                const subject = showClarificationDraft
                  ? `Bid clarification: ${subjectBase}`
                  : `Bid follow-up: ${subjectBase}`;

                // 4–6 clarification questions, trimmed and renumbered so the
                // list stays useful even when scope notes are absent.
                const clarificationQuestions = [
                  "Can you confirm the full scope covered by your proposal — including any work assumed but not itemized?",
                  "Which items are explicitly excluded from your bid (permits, dump fees, decking, allowances, etc.)?",
                  bid.nextAction
                    ? `Can you address the open item we flagged: "${bid.nextAction}"?`
                    : "Are there any scope gaps you noticed when comparing against the bid request?",
                  "What is your expected start window and projected duration on site?",
                  "Is your insurance (GL + workers comp) current through the project window, and can you share a COI?",
                  formattedAmount
                    ? `Is the quoted total of ${formattedAmount} firm, and are there any unit-price line items subject to change?`
                    : "Is the quoted total firm, and are there any unit-price line items subject to change?",
                ];

                const lines: string[] = [
                  `Hi ${contractorRecord?.contact || bid.contractor},`,
                  "",
                ];
                lines.push(
                  showClarificationDraft
                    ? `Thanks again for the ${tradeLabel.toLowerCase()} proposal${
                        bid.dateReceived ? ` received ${bid.dateReceived}` : ""
                      }${propertyName ? ` for ${propertyName}` : ""}. Before we can finalize a decision we have a few clarifications.`
                    : `Following up on your ${tradeLabel.toLowerCase()} proposal${
                        bid.dateReceived ? ` received ${bid.dateReceived}` : ""
                      }${propertyName ? ` for ${propertyName}` : ""}.`
                );
                lines.push("");
                lines.push("Quick reference:");
                if (propertyName) lines.push(`  • Property: ${propertyName}`);
                lines.push(`  • Contractor: ${bid.contractor}`);
                lines.push(`  • Trade: ${tradeLabel}`);
                if (formattedAmount)
                  lines.push(`  • Bid amount on file: ${formattedAmount}`);
                if (bid.nextAction)
                  lines.push(`  • Open item: ${bid.nextAction}`);
                lines.push("");
                lines.push("Clarification questions:");
                clarificationQuestions.forEach((q, i) =>
                  lines.push(`  ${i + 1}. ${q}`)
                );
                lines.push("");
                lines.push(
                  "Happy to jump on a quick call if it's easier than email. Thanks for the help getting this finalized."
                );
                lines.push("");
                lines.push("Thanks,");
                const body = lines.join("\n");

                const label = showClarificationDraft
                  ? "Draft clarification email"
                  : "Draft email";

                return (
                  <div className="mt-2 flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <GmailDraftButton
                        enabled={gmailEnabled}
                        connected={gmailConnected}
                        to={contractorEmail}
                        subject={subject}
                        body={body}
                        context={{
                          kind: "bid",
                          label: `${bid.contractor} — ${tradeLabel}`,
                        }}
                        compact
                        label={label}
                        returnTo="/bids"
                      />
                    </div>
                    {!contractorEmail ? (
                      <p className="text-[11px] text-[var(--workspace-text-muted)]">
                        Add contractor email to create Gmail draft.
                      </p>
                    ) : null}
                  </div>
                );
              })()
            : null}
        </div>

        <div className="flex flex-col items-start gap-2 sm:items-end">
          <span className="font-data text-xl font-semibold tabular-nums text-[var(--workspace-text)] [overflow-wrap:anywhere]">
            {formatCurrency(bid.amount)}
          </span>
          <RowLinks property={property?.slug ?? null} />
        </div>
      </div>
    </li>
  );
}

function RowLinks({ property }: { property: string | null }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <RowLink href="/contacts" label="Contacts" />
      <RowLink href="/documents" label="Docs" />
      <RowLink href="/budget" label="Budget" />
      <RowLink href="/tasks" label="Tasks" />
      {property ? (
        <RowLink href={`/properties/${property}`} label="Property" />
      ) : null}
    </div>
  );
}

function RowLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-[28px] items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--workspace-text-secondary)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
    >
      {label}
    </Link>
  );
}

// =============================================================
// AI bid review placeholder
// =============================================================

const REVIEW_ACTIONS: { label: string; description: string }[] = [
  {
    label: "Compare bids",
    description:
      "Side-by-side scope/cost compare across received bids in the active trade. Flags pricing outliers and missing line items.",
  },
  {
    label: "Find missing scope",
    description:
      "Read each bid for omissions vs. the project scope of work — permit fees, dump fees, decking allowance, etc.",
  },
  {
    label: "Draft contractor questions",
    description:
      "Generate a punch list of clarification questions per bidder before award.",
  },
  {
    label: "Convert scope to tasks",
    description:
      "Turn the awarded bid's scope of work into a draft task list — never written without your approval.",
  },
  {
    label: "Send accepted items to budget",
    description:
      "Draft committed-cost line items to push into the Budget workspace once accepted.",
  },
];

function AiReviewPanel() {
  return (
    <SectionPanel
      title="AI bid review"
      description="Runs only when you click an action. Output is a draft review — verify scope, permits, insurance, and contract terms before relying."
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {REVIEW_ACTIONS.map((a) => (
          <ReviewAction key={a.label} label={a.label} description={a.description} />
        ))}
      </div>
      <p className="mt-3 text-[12px] text-[var(--workspace-text-secondary)]">
        AI bid review is a draft aid. Nothing is sent to vendors, written to
        the budget, or written to tasks without your explicit action. Future
        review will surface scope gaps, pricing outliers, missing
        insurance/permit references, and proposed next steps.
      </p>
    </SectionPanel>
  );
}

function ReviewAction({
  label,
  description,
}: {
  label: string;
  description: string;
}) {
  return (
    <button
      type="button"
      disabled
      aria-disabled
      title="AI bid review is not wired in this first-pass build."
      className="flex cursor-not-allowed flex-col items-start gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-surface-soft)] p-4 text-left shadow-[var(--shadow-card-ring)]"
    >
      <span className="text-sm font-semibold text-[var(--workspace-text)]">
        {label}
      </span>
      <span className="text-[12.5px] leading-relaxed text-[var(--workspace-text-secondary)]">
        {description}
      </span>
      <span className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--workspace-text-muted)]">
        First pass · not yet wired
      </span>
    </button>
  );
}
