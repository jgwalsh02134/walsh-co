import { PageHeader } from "@/components/page-header";
import { SectionPanel } from "@/components/section-panel";
import { ImportForm } from "./import-form";

export const dynamic = "force-dynamic";

const SAMPLE_HEADERS = [
  "firstName",
  "lastName",
  "displayName",
  "company",
  "role",
  "category",
  "phone",
  "email",
  "website",
  "address",
  "notes",
  "status",
  "relatedProperty",
  "relatedProject",
  "insuranceStatus",
  "licenseStatus",
  "w9Status",
  "isFavorite",
];

export default function ImportContactsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Contacts"
        title="Import contacts"
        description="Upload or paste a CSV. Phone, email, and website are normalized using the same rules as the contact form."
      />

      <SectionPanel title="CSV upload">
        <ImportForm />
      </SectionPanel>

      <SectionPanel
        title="What gets imported"
        description="Recognized columns and dedupe behavior."
      >
        <div className="flex flex-col gap-3 text-sm text-[var(--color-text)]">
          <p>
            Header row is required. Common Apple/Google export aliases are
            also recognized — for example <code>First Name</code>,{" "}
            <code>Last Name</code>, <code>Organization</code>,{" "}
            <code>Phone 1 - Value</code>, <code>E-mail 1 - Value</code>.
          </p>
          <p className="text-[var(--color-text-muted)]">
            Recognized native columns:
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {SAMPLE_HEADERS.map((h) => (
              <li
                key={h}
                className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-soft)] px-2.5 py-0.5 font-mono text-[11px] text-[var(--color-text)]"
              >
                {h}
              </li>
            ))}
          </ul>
          <ul className="list-disc pl-5 text-[var(--color-text-muted)]">
            <li>
              Each row must include at least one of: first/last name,
              company, or display name.
            </li>
            <li>
              Category defaults to <code>OTHER</code> when missing or
              unrecognized.
            </li>
            <li>
              Duplicates are skipped: by normalized email when present,
              otherwise by display name + company.
            </li>
            <li>Archived contacts are not considered live duplicates.</li>
          </ul>
        </div>
      </SectionPanel>
    </>
  );
}
