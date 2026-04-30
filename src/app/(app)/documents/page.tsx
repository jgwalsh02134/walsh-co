import { PageHeader } from "@/components/page-header";
import { SectionPanel } from "@/components/section-panel";
import { documents, type DocumentRecord } from "@/lib/mock-data";
import { statusTokens } from "@/lib/status";

const verificationLabels: Record<
  DocumentRecord["verified"],
  { label: string; tone: keyof typeof statusTokens }
> = {
  verified: { label: "Verified", tone: "success" },
  needs_verification: { label: "Needs verification", tone: "warning" },
  not_required: { label: "—", tone: "neutral" },
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

export default function DocumentsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Documents"
        title="Document vault"
        description="Contracts, COIs, permits, bids, plans, and photos linked to the project."
      />

      <SectionPanel
        title={`${documents.length} document${documents.length === 1 ? "" : "s"}`}
        description="Verification status reflects the most recent file on record."
        padded={false}
      >
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                <th className="border-b border-[var(--color-border)] px-6 py-2">Name</th>
                <th className="border-b border-[var(--color-border)] px-3 py-2">Type</th>
                <th className="border-b border-[var(--color-border)] px-3 py-2">Linked to</th>
                <th className="border-b border-[var(--color-border)] px-3 py-2">Verification</th>
                <th className="border-b border-[var(--color-border)] px-6 py-2 text-right">Date</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => {
                const meta = verificationLabels[doc.verified];
                return (
                  <tr key={doc.id} className="hover:bg-[var(--color-surface-raised)]">
                    <td className="border-b border-[var(--color-border)] px-6 py-3 font-medium text-[var(--color-text)]">
                      {doc.name}
                    </td>
                    <td className="border-b border-[var(--color-border)] px-3 py-3 text-[var(--color-text-muted)]">
                      {doc.type}
                    </td>
                    <td className="border-b border-[var(--color-border)] px-3 py-3 text-[var(--color-text-muted)]">
                      {doc.linkedTo}
                    </td>
                    <td className="border-b border-[var(--color-border)] px-3 py-3">
                      {doc.verified === "not_required" ? (
                        <span className="text-xs text-[var(--color-text-faint)]">Not required</span>
                      ) : (
                        <ToneTag label={meta.label} tone={meta.tone} />
                      )}
                    </td>
                    <td className="border-b border-[var(--color-border)] px-6 py-3 text-right text-[var(--color-text-muted)]">
                      {doc.date}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <ul className="flex flex-col divide-y divide-[var(--color-border)] md:hidden">
          {documents.map((doc) => {
            const meta = verificationLabels[doc.verified];
            return (
              <li key={doc.id} className="flex flex-col gap-1.5 px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-sm font-medium text-[var(--color-text)]">{doc.name}</span>
                  <span className="shrink-0 text-xs text-[var(--color-text-muted)]">{doc.date}</span>
                </div>
                <span className="text-xs text-[var(--color-text-muted)]">
                  {doc.type} · {doc.linkedTo}
                </span>
                {doc.verified !== "not_required" ? (
                  <ToneTag label={meta.label} tone={meta.tone} />
                ) : null}
              </li>
            );
          })}
        </ul>
      </SectionPanel>
    </>
  );
}
