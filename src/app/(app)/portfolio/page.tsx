import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { SectionPanel } from "@/components/section-panel";
import { statusTokens } from "@/lib/status";

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

export default function PortfolioPage() {
  return (
    <>
      <PageHeader
        eyebrow="Portfolio"
        title="J.G. Walsh & Co. Holding Company LLC"
        description="Company holdings, property status, and portfolio-level summaries. Ownership and legal details below are working notes — not legal, tax, or ownership advice."
      />

      <SectionPanel
        title="Business Structure"
        description="Working representation of the company structure."
      >
        <ul className="flex flex-col gap-3 text-sm">
          <li className="flex flex-col gap-0.5">
            <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-faint)]">
              Ultimate beneficial owner
            </span>
            <span className="text-[var(--color-text)]">
              John Gaynor Walsh III
            </span>
          </li>
          <li className="flex flex-col gap-0.5">
            <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-faint)]">
              Parent company
            </span>
            <span className="text-[var(--color-text)]">
              J.G. Walsh & Co. Holding Company LLC
            </span>
          </li>
          <li className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-faint)]">
              Child assets / investment properties
            </span>
            <ul className="flex flex-col gap-0.5 text-[var(--color-text)]">
              <li>· 51 Loudonwood E</li>
              <li>· 16 Momrow Ct</li>
              <li>· 322 Osborne Rd</li>
            </ul>
          </li>
          <li className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-faint)]">
              Private / reference-only asset
            </span>
            <span className="text-[var(--color-text)]">
              14 MacAffer Dr — held outside the business structure.
            </span>
          </li>
          <li>
            <ToneTag label="Needs verification" tone="warning" />
            <span className="ml-2 text-xs text-[var(--color-text-muted)]">
              Entity formation, ownership, and reporting structure are working
              notes only — confirm with counsel.
            </span>
          </li>
        </ul>
      </SectionPanel>

      <SectionPanel
        title="Property Holdings"
        description="All properties tracked by the workspace."
        action={
          <Link
            href="/properties"
            className="text-xs font-semibold text-[var(--color-primary)] hover:underline"
          >
            Open properties
          </Link>
        }
      >
        <ul className="flex flex-col gap-2 text-sm">
          <li className="flex items-baseline justify-between gap-3">
            <span className="text-[var(--color-text)]">51 Loudonwood E</span>
            <span className="text-xs text-[var(--color-text-muted)]">
              Active Rental
            </span>
          </li>
          <li className="flex items-baseline justify-between gap-3">
            <span className="text-[var(--color-text)]">16 Momrow Ct</span>
            <span className="text-xs text-[var(--color-text-muted)]">
              Active Rental
            </span>
          </li>
          <li className="flex items-baseline justify-between gap-3">
            <span className="text-[var(--color-text)]">322 Osborne Rd</span>
            <span className="text-xs text-[var(--color-text-muted)]">
              Active Renovation Project
            </span>
          </li>
          <li className="flex items-baseline justify-between gap-3">
            <span className="text-[var(--color-text-muted)]">
              14 MacAffer Dr
            </span>
            <span className="text-xs text-[var(--color-text-muted)]">
              Private / Reference Only
            </span>
          </li>
        </ul>
      </SectionPanel>

      <SectionPanel
        title="Portfolio Status"
        description="Current state across the business portfolio."
      >
        <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div className="flex flex-col gap-1">
            <dt className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-faint)]">
              Cash-flowing rentals
            </dt>
            <dd className="font-semibold text-[var(--color-text)]">2</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-faint)]">
              Active renovations
            </dt>
            <dd className="font-semibold text-[var(--color-text)]">1</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-faint)]">
              Business-held assets
            </dt>
            <dd className="font-semibold text-[var(--color-text)]">3</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-faint)]">
              Private / reference
            </dt>
            <dd className="font-semibold text-[var(--color-text)]">1</dd>
          </div>
        </dl>
      </SectionPanel>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionPanel
          title="Cash-Flowing Rentals"
          description="Investment properties currently generating income."
        >
          <ul className="flex flex-col gap-2 text-sm">
            <li className="flex items-baseline justify-between gap-3">
              <span className="text-[var(--color-text)]">51 Loudonwood E</span>
              <ToneTag label="Active Rental" tone="success" />
            </li>
            <li className="flex items-baseline justify-between gap-3">
              <span className="text-[var(--color-text)]">16 Momrow Ct</span>
              <ToneTag label="Active Rental" tone="success" />
            </li>
          </ul>
        </SectionPanel>

        <SectionPanel
          title="Active Renovations"
          description="Properties under active capital work."
        >
          <ul className="flex flex-col gap-2 text-sm">
            <li className="flex items-baseline justify-between gap-3">
              <span className="text-[var(--color-text)]">322 Osborne Rd</span>
              <Link
                href="/renovation"
                className="text-xs font-semibold text-[var(--color-primary)] hover:underline"
              >
                Open workspace
              </Link>
            </li>
          </ul>
        </SectionPanel>
      </div>

      <SectionPanel
        title="Private / Reference Assets"
        description="Excluded from business portfolio KPIs."
      >
        <div className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-soft)] p-4 text-sm">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-semibold text-[var(--color-text)]">
              14 MacAffer Dr
            </span>
            <ToneTag label="Private / Reference Only" tone="neutral" />
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">
            Primary residence held outside the business structure. Tracked for
            reference only — do not include in business portfolio metrics or
            financial reporting.
          </p>
        </div>
      </SectionPanel>

      <SectionPanel
        title="Data Completeness"
        description="What is missing or unverified in the portfolio record."
      >
        <ul className="flex flex-col gap-2 text-sm text-[var(--color-text-muted)]">
          <li>
            322 Osborne Rd ZIP and official municipal facts —{" "}
            <span className="text-[var(--status-warning-text)]">
              needs verification
            </span>
            .
          </li>
          <li>
            Entity formation documents, EIN, and operating agreement on file —{" "}
            <span className="text-[var(--status-warning-text)]">
              needs verification
            </span>
            .
          </li>
          <li>
            Insurance master schedule across all properties — not yet captured.
          </li>
          <li>Rent roll, lease terms, and tenant records — not yet captured.</li>
        </ul>
      </SectionPanel>

      <SectionPanel
        title="Open Portfolio Questions"
        description="Decisions and follow-ups at the portfolio level."
      >
        <ul className="flex flex-col gap-2 text-sm text-[var(--color-text-muted)]">
          <li>
            Confirm whether 322 Osborne Rd is held directly by the parent LLC
            or through a single-asset subsidiary.
          </li>
          <li>
            Decide on a standard property naming convention for documents and
            financial records.
          </li>
          <li>
            Identify which integrations (ATTOM, RentCast, etc.) are worth
            connecting first.
          </li>
        </ul>
      </SectionPanel>
    </>
  );
}
