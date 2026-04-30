"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { SectionPanel } from "@/components/section-panel";
import {
  contractors,
  type Contractor,
  type Trade,
} from "@/lib/mock-data";
import {
  bidStatusLabels,
  contractorStatusLabels,
  insuranceStatusLabels,
  statusTokens,
} from "@/lib/status";

type TradeFilter = "All" | Trade;

const tradeOptions: TradeFilter[] = [
  "All",
  ...(["General", "Roofing", "Framing", "Electrical", "Plumbing", "HVAC", "Painting", "Flooring", "Architect"] as Trade[]),
];

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

function ContactRow({ contractor }: { contractor: Contractor }) {
  const status = contractorStatusLabels[contractor.status];
  const insurance = insuranceStatusLabels[contractor.insurance];
  const bid = bidStatusLabels[contractor.bidStatus];
  return (
    <article className="flex flex-col gap-3 border-b border-[var(--color-border)] px-5 py-4 last:border-b-0 hover:bg-[var(--color-surface-raised)] lg:grid lg:grid-cols-[2fr_1fr_2fr_2fr_auto] lg:items-center lg:gap-4 lg:px-6">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-semibold text-[var(--color-text)]">
          {contractor.company}
        </span>
        <span className="text-xs text-[var(--color-text-muted)]">
          {contractor.contact}
        </span>
      </div>

      <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-faint)] lg:text-sm lg:normal-case lg:tracking-normal lg:text-[var(--color-text)]">
        {contractor.trade}
      </span>

      <div className="flex flex-col gap-0.5 text-xs text-[var(--color-text-muted)]">
        <a
          href={`tel:${contractor.phone.replace(/[^0-9+]/g, "")}`}
          className="hover:text-[var(--color-link)] hover:underline"
        >
          {contractor.phone}
        </a>
        <a
          href={`mailto:${contractor.email}`}
          className="hover:text-[var(--color-link)] hover:underline"
        >
          {contractor.email}
        </a>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <ToneTag label={status.label} tone={status.tone} />
        <ToneTag label={insurance.label} tone={insurance.tone} />
        <ToneTag label={`Bid: ${bid.label}`} tone={bid.tone} />
      </div>

      <div className="flex flex-wrap gap-1.5 lg:justify-end">
        <a
          href={`tel:${contractor.phone.replace(/[^0-9+]/g, "")}`}
          className="inline-flex items-center justify-center gap-1 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-xs font-medium text-[var(--color-text)] transition-colors hover:border-[var(--color-border-strong)]"
        >
          Call
        </a>
        <a
          href={`mailto:${contractor.email}`}
          className="inline-flex items-center justify-center gap-1 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-xs font-medium text-[var(--color-text)] transition-colors hover:border-[var(--color-border-strong)]"
        >
          Email
        </a>
        <span
          className="inline-flex items-center justify-center gap-1 rounded-[var(--radius-sm)] border border-dashed border-[var(--color-border)] px-2.5 py-1 text-xs font-medium text-[var(--color-text-faint)]"
          title="Coming soon"
        >
          Notes
        </span>
      </div>

      {contractor.notes ? (
        <p className="text-xs text-[var(--color-text-muted)] lg:col-span-5">
          {contractor.notes}
        </p>
      ) : null}
    </article>
  );
}

export default function ContractorsPage() {
  const [search, setSearch] = useState("");
  const [trade, setTrade] = useState<TradeFilter>("All");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contractors.filter((c) => {
      if (trade !== "All" && c.trade !== trade) return false;
      if (!q) return true;
      return (
        c.company.toLowerCase().includes(q) ||
        c.contact.toLowerCase().includes(q) ||
        c.trade.toLowerCase().includes(q) ||
        c.notes.toLowerCase().includes(q)
      );
    });
  }, [search, trade]);

  return (
    <>
      <PageHeader
        eyebrow="Contractors"
        title="Trades & professionals"
        description="Find, qualify, and contact contractors for the renovation. Click a phone or email to call or compose."
      />

      <div className="flex flex-col gap-3">
        <label className="flex w-full items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm shadow-[var(--shadow-card)] focus-within:border-[var(--color-focus)]">
          <svg
            className="h-4 w-4 text-[var(--color-text-muted)]"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
            aria-hidden
          >
            <circle cx="11" cy="11" r="7" />
            <path strokeLinecap="round" d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by company, contact, trade, or note"
            aria-label="Search contractors"
            className="w-full bg-transparent text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none"
          />
        </label>

        <div role="group" aria-label="Filter by trade" className="flex flex-wrap items-center gap-2">
          {tradeOptions.map((t) => {
            const active = trade === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTrade(t)}
                aria-pressed={active}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-text-inverse)]"
                    : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:border-[var(--color-border-strong)]"
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      <SectionPanel
        title={`${filtered.length} contractor${filtered.length === 1 ? "" : "s"}`}
        description={trade === "All" ? "Across all trades" : `Filtered to ${trade}`}
        padded={false}
      >
        <div className="hidden border-b border-[var(--color-border)] bg-[var(--color-surface-soft)] px-6 py-2 lg:grid lg:grid-cols-[2fr_1fr_2fr_2fr_auto] lg:gap-4 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          <span>Company / Contact</span>
          <span>Trade</span>
          <span>Phone / Email</span>
          <span>Status</span>
          <span className="text-right">Actions</span>
        </div>
        {filtered.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-[var(--color-text-muted)]">
            No contractors match this search.
          </p>
        ) : (
          filtered.map((c) => <ContactRow key={c.id} contractor={c} />)
        )}
      </SectionPanel>
    </>
  );
}

