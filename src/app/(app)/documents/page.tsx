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

type Category = {
  title: string;
  description: string;
  match: (doc: DocumentRecord) => boolean;
};

const categories: Category[] = [
  {
    title: "Deeds",
    description: "Property deeds and title records.",
    match: () => false,
  },
  {
    title: "Insurance",
    description: "Property insurance policies and declarations.",
    match: () => false,
  },
  {
    title: "Permits",
    description: "Building, demolition, and other municipal permits.",
    match: (d) => d.type === "Permit",
  },
  {
    title: "Contracts",
    description: "Executed agreements with contractors and professionals.",
    match: (d) => d.type === "Contract",
  },
  {
    title: "COIs",
    description: "Certificates of insurance and workers comp.",
    match: (d) => d.type === "COI",
  },
  {
    title: "Bids / Proposals",
    description: "Contractor proposals and bid documents.",
    match: (d) => d.type === "Proposal",
  },
  {
    title: "Invoices",
    description: "Invoices, lien waivers, and payment records.",
    match: () => false,
  },
  {
    title: "Photos",
    description: "Site photography and existing-conditions documentation.",
    match: (d) => d.type === "Photo",
  },
  {
    title: "Tax Records",
    description: "Property tax bills, assessments, and exemption records.",
    match: () => false,
  },
  {
    title: "Inspection Reports",
    description:
      "Pre-purchase, pre-construction, and progress inspection reports.",
    match: (d) => d.type === "Inspection",
  },
];

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

function DocList({ docs }: { docs: DocumentRecord[] }) {
  if (docs.length === 0) {
    return (
      <p className="text-sm text-[var(--color-text-muted)]">
        Nothing on file yet.
      </p>
    );
  }
  return (
    <ul className="flex flex-col divide-y divide-[var(--color-border)]">
      {docs.map((doc) => {
        const meta = verificationLabels[doc.verified];
        return (
          <li
            key={doc.id}
            className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
          >
            <div className="flex flex-col">
              <span className="text-sm font-medium text-[var(--color-text)]">
                {doc.name}
              </span>
              <span className="text-xs text-[var(--color-text-muted)]">
                {doc.linkedTo} · {doc.date}
              </span>
            </div>
            {doc.verified !== "not_required" ? (
              <ToneTag label={meta.label} tone={meta.tone} />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export default function DocumentsPage() {
  const unverified = documents.filter((d) => d.verified === "needs_verification");

  return (
    <>
      <PageHeader
        eyebrow="Documents"
        title="Document vault"
        description="Organize deeds, insurance, permits, contracts, COIs, bids, invoices, photos, tax records, and inspection reports."
      />

      <SectionPanel
        title="Unverified Documents"
        description={`${unverified.length} document${
          unverified.length === 1 ? "" : "s"
        } need${unverified.length === 1 ? "s" : ""} verification.`}
      >
        <DocList docs={unverified} />
      </SectionPanel>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {categories.map((cat) => {
          const matched = documents.filter(cat.match);
          return (
            <SectionPanel
              key={cat.title}
              title={cat.title}
              description={cat.description}
            >
              <DocList docs={matched} />
            </SectionPanel>
          );
        })}
      </div>
    </>
  );
}
