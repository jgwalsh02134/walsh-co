import { FilterPill, FilterPillRow } from "@/components/filter-pill";
import { PageHeader } from "@/components/page-header";
import { SectionPanel } from "@/components/section-panel";
import { StatusBadge } from "@/components/status-badge";
import { permits } from "@/lib/mock-data";

const filters = ["All", "Open", "In review", "Inspections", "Closed"] as const;

export default function PermitsPage() {
  const open = permits.filter((p) => p.status !== "complete");
  const closed = permits.filter((p) => p.status === "complete");

  return (
    <>
      <PageHeader
        eyebrow="Permits & Inspections"
        title="Municipal filings"
        description="Track permits, inspection windows, and authority correspondence. Placeholder data only — verify with the municipality."
        primaryAction={
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-text-inverse)] transition-colors hover:bg-[var(--color-primary-hover)]"
          >
            File permit
          </button>
        }
      />

      <FilterPillRow>
        {filters.map((label, idx) => (
          <FilterPill key={label} label={label} active={idx === 0} />
        ))}
      </FilterPillRow>

      <SectionPanel
        title="Open permits"
        description={`${open.length} active filings`}
        padded={false}
      >
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[760px] border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                <th className="border-b border-[var(--color-border)] px-[21px] py-2">Type</th>
                <th className="border-b border-[var(--color-border)] px-3 py-2">Number</th>
                <th className="border-b border-[var(--color-border)] px-3 py-2">Authority</th>
                <th className="border-b border-[var(--color-border)] px-3 py-2">Status</th>
                <th className="border-b border-[var(--color-border)] px-3 py-2">Filed</th>
                <th className="border-b border-[var(--color-border)] px-3 py-2">Inspection</th>
                <th className="border-b border-[var(--color-border)] px-[21px] py-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {open.map((p) => (
                <tr key={p.id} className="hover:bg-[var(--color-bg-warm)]">
                  <td className="border-b border-[var(--color-border)] px-[21px] py-3 font-semibold text-[var(--color-text)]">
                    {p.type}
                  </td>
                  <td className="border-b border-[var(--color-border)] px-3 py-3 text-[var(--color-text-muted)]">
                    {p.number}
                  </td>
                  <td className="border-b border-[var(--color-border)] px-3 py-3 text-[var(--color-text-muted)]">
                    {p.authority}
                  </td>
                  <td className="border-b border-[var(--color-border)] px-3 py-3">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="border-b border-[var(--color-border)] px-3 py-3 text-[var(--color-text-muted)]">
                    {p.filed}
                  </td>
                  <td className="border-b border-[var(--color-border)] px-3 py-3 text-[var(--color-text-muted)]">
                    {p.inspectionDate ?? "—"}
                  </td>
                  <td className="border-b border-[var(--color-border)] px-[21px] py-3 text-xs text-[var(--color-text-muted)]">
                    {p.notes}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul className="flex flex-col gap-[13px] p-[13px] md:hidden">
          {open.map((p) => (
            <li
              key={p.id}
              className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-[var(--color-text)]">{p.type}</span>
                  <span className="text-xs text-[var(--color-text-muted)]">{p.number} · {p.authority}</span>
                </div>
                <StatusBadge status={p.status} />
              </div>
              <p className="text-xs text-[var(--color-text-muted)]">{p.notes}</p>
              <div className="flex flex-wrap gap-3 text-xs text-[var(--color-text-faint)]">
                <span>Filed {p.filed}</span>
                {p.inspectionDate ? <span>Inspection {p.inspectionDate}</span> : null}
              </div>
            </li>
          ))}
        </ul>
      </SectionPanel>

      <SectionPanel
        title="Closed permits"
        description={`${closed.length} complete`}
        padded={false}
      >
        <ul className="divide-y divide-[var(--color-border)]">
          {closed.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 px-[21px] py-3">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-[var(--color-text)]">{p.type} · {p.number}</span>
                <span className="text-xs text-[var(--color-text-muted)]">{p.authority} · Closed {p.inspectionDate ?? p.filed}</span>
              </div>
              <StatusBadge status={p.status} />
            </li>
          ))}
        </ul>
      </SectionPanel>
    </>
  );
}
