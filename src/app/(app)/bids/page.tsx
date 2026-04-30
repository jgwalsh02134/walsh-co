import { PageHeader } from "@/components/page-header";
import { SectionPanel } from "@/components/section-panel";
import { bids, type Bid } from "@/lib/mock-data";
import { bidStatusLabels, riskLabels, statusTokens } from "@/lib/status";

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);

const decisionLabels: Record<Bid["decision"], { label: string; tone: keyof typeof statusTokens }> = {
  pending: { label: "Pending", tone: "neutral" },
  approved: { label: "Approved", tone: "success" },
  rejected: { label: "Rejected", tone: "error" },
};

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

function MobileBidCard({ bid }: { bid: Bid }) {
  const status = bidStatusLabels[bid.status];
  const risk = riskLabels[bid.risk];
  const decision = decisionLabels[bid.decision];
  return (
    <article className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-text)]">{bid.contractor}</h3>
          <span className="text-xs text-[var(--color-text-muted)]">{bid.trade}</span>
        </div>
        <span className="text-base font-semibold text-[var(--color-text)]">
          {formatCurrency(bid.amount)}
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <dt className="text-[var(--color-text-faint)]">Start</dt>
          <dd className="text-[var(--color-text)]">{bid.startDate}</dd>
        </div>
        <div>
          <dt className="text-[var(--color-text-faint)]">Duration</dt>
          <dd className="text-[var(--color-text)]">{bid.durationDays} days</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-[var(--color-text-faint)]">Includes</dt>
          <dd className="text-[var(--color-text)]">{bid.includes.join(", ")}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-[var(--color-text-faint)]">Excludes</dt>
          <dd className="text-[var(--color-text)]">{bid.excludes.join(", ")}</dd>
        </div>
      </dl>

      <div className="flex flex-wrap gap-1.5">
        <ToneTag label={status.label} tone={status.tone} />
        <ToneTag label={risk.label} tone={risk.tone} />
        <ToneTag label={`Decision: ${decision.label}`} tone={decision.tone} />
      </div>
    </article>
  );
}

export default function BidsPage() {
  const trades = Array.from(new Set(bids.map((b) => b.trade)));

  return (
    <>
      <PageHeader
        eyebrow="Bids"
        title="Bid comparison"
        description="Compare proposals across contractors. Includes, excludes, schedule, risk, and award decisions for each trade."
      />

      <div className="flex flex-col gap-6 lg:hidden">
        {trades.map((trade) => {
          const tradeBids = bids.filter((b) => b.trade === trade);
          return (
            <SectionPanel
              key={trade}
              title={trade}
              description={`${tradeBids.length} bid${tradeBids.length === 1 ? "" : "s"}`}
            >
              <div className="flex flex-col gap-3">
                {tradeBids.map((b) => (
                  <MobileBidCard key={b.id} bid={b} />
                ))}
              </div>
            </SectionPanel>
          );
        })}
      </div>

      <div className="hidden lg:flex lg:flex-col lg:gap-8">
        {trades.map((trade) => {
          const tradeBids = bids.filter((b) => b.trade === trade);
          return (
            <SectionPanel
              key={trade}
              title={trade}
              description={`${tradeBids.length} bid${tradeBids.length === 1 ? "" : "s"}`}
              padded={false}
            >
              <div className="overflow-x-auto">
                <table className="w-full border-separate border-spacing-0 text-sm">
                  <thead>
                    <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                      <th className="border-b border-[var(--color-border)] px-6 py-2">Contractor</th>
                      <th className="border-b border-[var(--color-border)] px-3 py-2 text-right">Amount</th>
                      <th className="border-b border-[var(--color-border)] px-3 py-2">Status</th>
                      <th className="border-b border-[var(--color-border)] px-3 py-2">Includes</th>
                      <th className="border-b border-[var(--color-border)] px-3 py-2">Excludes</th>
                      <th className="border-b border-[var(--color-border)] px-3 py-2">Start</th>
                      <th className="border-b border-[var(--color-border)] px-3 py-2 text-right">Duration</th>
                      <th className="border-b border-[var(--color-border)] px-3 py-2">Risk</th>
                      <th className="border-b border-[var(--color-border)] px-6 py-2">Decision</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tradeBids.map((b) => {
                      const status = bidStatusLabels[b.status];
                      const risk = riskLabels[b.risk];
                      const decision = decisionLabels[b.decision];
                      return (
                        <tr key={b.id} className="hover:bg-[var(--color-surface-raised)]">
                          <td className="border-b border-[var(--color-border)] px-6 py-3 align-top font-medium text-[var(--color-text)]">
                            {b.contractor}
                          </td>
                          <td className="border-b border-[var(--color-border)] px-3 py-3 align-top text-right font-semibold text-[var(--color-text)]">
                            {formatCurrency(b.amount)}
                          </td>
                          <td className="border-b border-[var(--color-border)] px-3 py-3 align-top">
                            <ToneTag label={status.label} tone={status.tone} />
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
                          <td className="border-b border-[var(--color-border)] px-3 py-3 align-top text-[var(--color-text-muted)]">
                            {b.startDate}
                          </td>
                          <td className="border-b border-[var(--color-border)] px-3 py-3 align-top text-right text-[var(--color-text-muted)]">
                            {b.durationDays}d
                          </td>
                          <td className="border-b border-[var(--color-border)] px-3 py-3 align-top">
                            <ToneTag label={risk.label} tone={risk.tone} />
                          </td>
                          <td className="border-b border-[var(--color-border)] px-6 py-3 align-top">
                            <ToneTag label={decision.label} tone={decision.tone} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </SectionPanel>
          );
        })}
      </div>
    </>
  );
}
