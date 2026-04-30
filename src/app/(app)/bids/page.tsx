import { FilterPill, FilterPillRow } from "@/components/filter-pill";
import { PageHeader } from "@/components/page-header";
import { RiskBadge } from "@/components/risk-badge";
import { SectionPanel } from "@/components/section-panel";
import { bids, tradeFilters } from "@/lib/mock-data";
import { statusTokens } from "@/lib/status";

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);

const awardLabels: Record<(typeof bids)[number]["award"], { label: string; tone: keyof typeof statusTokens }> = {
  pending: { label: "Pending", tone: "neutral" },
  shortlisted: { label: "Shortlisted", tone: "review" },
  awarded: { label: "Awarded", tone: "success" },
  declined: { label: "Declined", tone: "error" },
};

function AwardPill({ award }: { award: (typeof bids)[number]["award"] }) {
  const meta = awardLabels[award];
  const tone = statusTokens[meta.tone];
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ background: tone.background, color: tone.text }}
    >
      {meta.label}
    </span>
  );
}

function ScorePill({ score }: { score: number }) {
  const tone = statusTokens[score >= 85 ? "success" : score >= 70 ? "info" : "warning"];
  return (
    <span
      className="inline-flex items-center rounded-[var(--radius-sm)] px-1.5 py-0.5 text-xs font-semibold"
      style={{ background: tone.background, color: tone.text }}
    >
      {score}
    </span>
  );
}

export default function BidsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Bids & Awards"
        title="Bid comparison"
        description="Compare proposals side by side: scope, schedule, exclusions, insurance, risk, and award decision. Mock data only."
        primaryAction={
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-text-inverse)] transition-colors hover:bg-[var(--color-primary-hover)]"
          >
            Request bid
          </button>
        }
        secondaryAction={
          <div className="inline-flex rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-0.5 text-sm">
            <span className="rounded-[6px] bg-[var(--color-bg-warm)] px-3 py-1 font-medium text-[var(--color-text)]">
              Compare
            </span>
            <span className="px-3 py-1 text-[var(--color-text-muted)]">Table</span>
          </div>
        }
      />

      <FilterPillRow>
        {tradeFilters.map((label, idx) => (
          <FilterPill key={label} label={label} active={idx === 0} />
        ))}
      </FilterPillRow>

      <SectionPanel
        title={`Bid table`}
        description={`${bids.length} bids · ${bids.filter((b) => b.award === "awarded").length} awarded`}
        padded={false}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                <th className="border-b border-[var(--color-border)] px-[21px] py-2">Contractor</th>
                <th className="border-b border-[var(--color-border)] px-3 py-2">Trade</th>
                <th className="border-b border-[var(--color-border)] px-3 py-2 text-right">Bid</th>
                <th className="border-b border-[var(--color-border)] px-3 py-2">Start</th>
                <th className="border-b border-[var(--color-border)] px-3 py-2">Duration</th>
                <th className="border-b border-[var(--color-border)] px-3 py-2">Includes</th>
                <th className="border-b border-[var(--color-border)] px-3 py-2">Excludes</th>
                <th className="border-b border-[var(--color-border)] px-3 py-2">Insurance</th>
                <th className="border-b border-[var(--color-border)] px-3 py-2">Risk</th>
                <th className="border-b border-[var(--color-border)] px-3 py-2">Score</th>
                <th className="border-b border-[var(--color-border)] px-[21px] py-2 text-right">Award</th>
              </tr>
            </thead>
            <tbody>
              {bids.map((b) => {
                const insTone = statusTokens[b.insuranceOk ? "success" : "warning"];
                return (
                  <tr key={b.id} className="hover:bg-[var(--color-bg-warm)]">
                    <td className="border-b border-[var(--color-border)] px-[21px] py-3 align-top font-medium text-[var(--color-text)]">
                      {b.contractor}
                    </td>
                    <td className="border-b border-[var(--color-border)] px-3 py-3 align-top text-[var(--color-text-muted)]">
                      {b.trade}
                    </td>
                    <td className="border-b border-[var(--color-border)] px-3 py-3 align-top text-right font-semibold text-[var(--color-text)]">
                      {formatCurrency(b.amount)}
                    </td>
                    <td className="border-b border-[var(--color-border)] px-3 py-3 align-top text-[var(--color-text-muted)]">
                      {b.startDate}
                    </td>
                    <td className="border-b border-[var(--color-border)] px-3 py-3 align-top text-[var(--color-text-muted)]">
                      {b.durationDays}d
                    </td>
                    <td className="border-b border-[var(--color-border)] px-3 py-3 align-top text-xs text-[var(--color-text-muted)]">
                      <ul className="flex flex-col gap-0.5">
                        {b.includes.map((i) => (
                          <li key={i}>· {i}</li>
                        ))}
                      </ul>
                    </td>
                    <td className="border-b border-[var(--color-border)] px-3 py-3 align-top text-xs text-[var(--color-text-muted)]">
                      <ul className="flex flex-col gap-0.5">
                        {b.excludes.map((i) => (
                          <li key={i}>· {i}</li>
                        ))}
                      </ul>
                    </td>
                    <td className="border-b border-[var(--color-border)] px-3 py-3 align-top">
                      <span
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
                        style={{ background: insTone.background, color: insTone.text }}
                      >
                        {b.insuranceOk ? "Verified" : "Gap"}
                      </span>
                    </td>
                    <td className="border-b border-[var(--color-border)] px-3 py-3 align-top">
                      <RiskBadge severity={b.risk} />
                    </td>
                    <td className="border-b border-[var(--color-border)] px-3 py-3 align-top">
                      <ScorePill score={b.score} />
                    </td>
                    <td className="border-b border-[var(--color-border)] px-[21px] py-3 align-top text-right">
                      <AwardPill award={b.award} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionPanel>

      <SectionPanel
        title="Side-by-side comparison"
        description="Compare contenders within the same trade. Placeholder layout."
      >
        <div className="grid grid-cols-1 gap-[13px] md:grid-cols-2">
          {bids
            .filter((b) => b.trade === "Roofing")
            .map((b) => (
              <article
                key={b.id}
                className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-3"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-sm font-semibold text-[var(--color-text)]">{b.contractor}</h3>
                  <AwardPill award={b.award} />
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]">
                  <span>{formatCurrency(b.amount)}</span>
                  <span>·</span>
                  <span>{b.durationDays}d starting {b.startDate}</span>
                  <span>·</span>
                  <ScorePill score={b.score} />
                </div>
                <dl className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex flex-col">
                    <dt className="text-[var(--color-text-faint)]">Includes</dt>
                    <dd className="text-[var(--color-text)]">{b.includes.length} line items</dd>
                  </div>
                  <div className="flex flex-col">
                    <dt className="text-[var(--color-text-faint)]">Excludes</dt>
                    <dd className="text-[var(--color-text)]">{b.excludes.length} line items</dd>
                  </div>
                </dl>
                <div className="flex flex-wrap gap-2 pt-1">
                  <RiskBadge severity={b.risk} />
                  <span className="text-xs text-[var(--color-text-muted)]">
                    Insurance: {b.insuranceOk ? "verified" : "gap — needs follow-up"}
                  </span>
                </div>
              </article>
            ))}
        </div>
      </SectionPanel>
    </>
  );
}
