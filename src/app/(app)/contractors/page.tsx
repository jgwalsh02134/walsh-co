import { FilterPill, FilterPillRow } from "@/components/filter-pill";
import { PageHeader } from "@/components/page-header";
import { SearchBar } from "@/components/search-bar";
import { SectionPanel } from "@/components/section-panel";
import {
  contractorStatusFilters,
  contractors,
  tradeFilters,
} from "@/lib/mock-data";
import { contractorStatusLabels, statusTokens } from "@/lib/status";

const qualLabels = {
  insurance: "Ins",
  workersComp: "WC",
  license: "Lic",
  w9: "W-9",
  references: "Refs",
} as const;

function QualPill({ label, ok }: { label: string; ok: boolean }) {
  const tone = statusTokens[ok ? "success" : "warning"];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={{ background: tone.background, color: tone.text }}
      aria-label={`${label} ${ok ? "verified" : "missing"}`}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: tone.text }} aria-hidden />
      {label}
    </span>
  );
}

function ActionButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="button"
      className="inline-flex items-center justify-center gap-1 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-xs font-medium text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]"
    >
      {children}
    </button>
  );
}

export default function ContractorsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Network"
        title="Contractors & Professionals"
        description="Source, qualify, and manage trades, architects, engineers, and other professionals. Placeholder data only — verify before any award."
        primaryAction={
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-text-inverse)] transition-colors hover:bg-[var(--color-primary-hover)]"
          >
            Add contractor
          </button>
        }
      />

      <div className="flex flex-col gap-[13px] lg:flex-row lg:items-center">
        <div className="lg:w-80">
          <SearchBar placeholder="Search contractors…" ariaLabel="Search contractors" />
        </div>
        <FilterPillRow>
          {tradeFilters.map((label, idx) => (
            <FilterPill key={label} label={label} active={idx === 0} />
          ))}
        </FilterPillRow>
      </div>

      <FilterPillRow>
        {contractorStatusFilters.map((label, idx) => (
          <FilterPill key={label} label={label} active={idx === 0} />
        ))}
      </FilterPillRow>

      <SectionPanel
        title={`All contractors`}
        description={`${contractors.length} entries · ${contractors.filter((c) => c.status === "preferred" || c.status === "awarded").length} preferred or awarded`}
        padded={false}
      >
        <div className="hidden lg:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                  <th className="border-b border-[var(--color-border)] px-[21px] py-2">Organization</th>
                  <th className="border-b border-[var(--color-border)] px-3 py-2">Trade</th>
                  <th className="border-b border-[var(--color-border)] px-3 py-2">Status</th>
                  <th className="border-b border-[var(--color-border)] px-3 py-2">Qualifications</th>
                  <th className="border-b border-[var(--color-border)] px-3 py-2">Notes</th>
                  <th className="border-b border-[var(--color-border)] px-[21px] py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {contractors.map((c) => {
                  const meta = contractorStatusLabels[c.status];
                  const tone = statusTokens[meta.tone];
                  return (
                    <tr key={c.id} className="hover:bg-[var(--color-bg-warm)]">
                      <td className="border-b border-[var(--color-border)] px-[21px] py-3 align-top">
                        <span className="block font-semibold text-[var(--color-text)]">{c.organization}</span>
                        <span className="block text-xs text-[var(--color-text-muted)]">{c.email} · {c.phone}</span>
                      </td>
                      <td className="border-b border-[var(--color-border)] px-3 py-3 align-top text-[var(--color-text-muted)]">
                        {c.trade}
                      </td>
                      <td className="border-b border-[var(--color-border)] px-3 py-3 align-top">
                        <span
                          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                          style={{ background: tone.background, color: tone.text }}
                        >
                          {meta.label}
                        </span>
                      </td>
                      <td className="border-b border-[var(--color-border)] px-3 py-3 align-top">
                        <div className="flex flex-wrap gap-1">
                          {(Object.keys(qualLabels) as (keyof typeof qualLabels)[]).map((key) => (
                            <QualPill key={key} label={qualLabels[key]} ok={c.qualifications[key]} />
                          ))}
                        </div>
                      </td>
                      <td className="border-b border-[var(--color-border)] px-3 py-3 align-top text-xs text-[var(--color-text-muted)]">
                        {c.notes}
                      </td>
                      <td className="border-b border-[var(--color-border)] px-[21px] py-3 align-top">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <ActionButton>Call</ActionButton>
                          <ActionButton>Email</ActionButton>
                          <ActionButton>Notes</ActionButton>
                          <ActionButton>Docs</ActionButton>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <ul className="flex flex-col gap-[13px] p-[13px] lg:hidden">
          {contractors.map((c) => {
            const meta = contractorStatusLabels[c.status];
            const tone = statusTokens[meta.tone];
            return (
              <li
                key={c.id}
                className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
              >
                <div className="flex items-start justify-between gap-2">
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
                </div>
                <div className="flex flex-wrap gap-1">
                  {(Object.keys(qualLabels) as (keyof typeof qualLabels)[]).map((key) => (
                    <QualPill key={key} label={qualLabels[key]} ok={c.qualifications[key]} />
                  ))}
                </div>
                <p className="text-xs text-[var(--color-text-muted)]">{c.notes}</p>
                <div className="flex flex-wrap gap-1.5">
                  <ActionButton>Call</ActionButton>
                  <ActionButton>Email</ActionButton>
                  <ActionButton>Notes</ActionButton>
                  <ActionButton>Docs</ActionButton>
                </div>
              </li>
            );
          })}
        </ul>
      </SectionPanel>
    </>
  );
}
