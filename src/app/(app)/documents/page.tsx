import { FilterPill, FilterPillRow } from "@/components/filter-pill";
import { PageHeader } from "@/components/page-header";
import { SearchBar } from "@/components/search-bar";
import { SectionPanel } from "@/components/section-panel";
import { StatusBadge } from "@/components/status-badge";
import { documentCategories, documents } from "@/lib/mock-data";

export default function DocumentsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Vault"
        title="Documents"
        description="Contracts, COIs, proposals, permits, plans, photos, and inspection notes. Placeholder UI — uploads not wired."
        primaryAction={
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-text-inverse)] transition-colors hover:bg-[var(--color-primary-hover)]"
          >
            Upload
          </button>
        }
        secondaryAction={
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm font-semibold text-[var(--color-text)] transition-colors hover:border-[var(--color-border-strong)]"
          >
            Capture photo
          </button>
        }
      />

      <div
        role="region"
        aria-label="Upload drop zone (placeholder)"
        className="flex flex-col items-center gap-2 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-bg-warm)] px-6 py-[34px] text-center"
      >
        <svg
          className="h-8 w-8 text-[var(--color-text-muted)]"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0L7 9m5-5 5 5M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
        </svg>
        <h2 className="font-display text-lg text-[var(--color-text)]">
          Drop files to upload
        </h2>
        <p className="max-w-md text-sm text-[var(--color-text-muted)]">
          Or browse from your device. Setup in progress — uploads are not yet wired to a backend.
        </p>
        <button
          type="button"
          className="mt-2 inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-semibold text-[var(--color-text)] transition-colors hover:border-[var(--color-border-strong)]"
        >
          Browse files
        </button>
      </div>

      <div className="flex flex-col gap-[13px] lg:flex-row lg:items-center">
        <div className="lg:w-80">
          <SearchBar placeholder="Search documents…" ariaLabel="Search documents" />
        </div>
        <FilterPillRow>
          {documentCategories.map((label, idx) => (
            <FilterPill key={label} label={label} active={idx === 0} />
          ))}
        </FilterPillRow>
      </div>

      <SectionPanel title="All documents" description={`${documents.length} files`} padded={false}>
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[720px] border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                <th className="border-b border-[var(--color-border)] px-[21px] py-2">Title</th>
                <th className="border-b border-[var(--color-border)] px-3 py-2">Linked to</th>
                <th className="border-b border-[var(--color-border)] px-3 py-2">Category</th>
                <th className="border-b border-[var(--color-border)] px-3 py-2">Status</th>
                <th className="border-b border-[var(--color-border)] px-3 py-2">Updated</th>
                <th className="border-b border-[var(--color-border)] px-[21px] py-2 text-right">Size</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-[var(--color-bg-warm)]">
                  <td className="border-b border-[var(--color-border)] px-[21px] py-3 font-medium text-[var(--color-text)]">
                    {doc.title}
                  </td>
                  <td className="border-b border-[var(--color-border)] px-3 py-3 text-[var(--color-text-muted)]">
                    {doc.contractor ?? "—"}
                  </td>
                  <td className="border-b border-[var(--color-border)] px-3 py-3 text-[var(--color-text-muted)]">
                    {doc.category}
                  </td>
                  <td className="border-b border-[var(--color-border)] px-3 py-3">
                    <StatusBadge status={doc.status} />
                  </td>
                  <td className="border-b border-[var(--color-border)] px-3 py-3 text-[var(--color-text-muted)]">
                    {doc.updated}
                  </td>
                  <td className="border-b border-[var(--color-border)] px-[21px] py-3 text-right text-[var(--color-text-muted)]">
                    {doc.size}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul className="flex flex-col gap-[13px] p-[13px] md:hidden">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="flex flex-col gap-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-medium text-[var(--color-text)]">{doc.title}</span>
                <StatusBadge status={doc.status} />
              </div>
              <span className="text-xs text-[var(--color-text-muted)]">
                {doc.category}
                {doc.contractor ? ` · ${doc.contractor}` : ""}
              </span>
              <div className="flex items-center justify-between text-xs text-[var(--color-text-faint)]">
                <span>Updated {doc.updated}</span>
                <span>{doc.size}</span>
              </div>
            </li>
          ))}
        </ul>
      </SectionPanel>
    </>
  );
}
