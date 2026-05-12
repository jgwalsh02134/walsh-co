import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { SectionPanel } from "@/components/section-panel";
import { ToneTag } from "@/components/tone-tag";
import {
  documents,
  type DocumentCategory,
  type DocumentExtractionStatus,
  type DocumentRecord,
} from "@/lib/mock-data";
import { trackedProperties } from "@/lib/market-data";
import type { StatusTone } from "@/lib/status";

// =============================================================
// Category metadata
// =============================================================

type CategoryMeta = {
  id: DocumentCategory | "all";
  label: string;
};

const CATEGORIES: CategoryMeta[] = [
  { id: "all", label: "All documents" },
  { id: "inspection", label: "Inspection" },
  { id: "contractor_bid", label: "Contractor bid" },
  { id: "survey", label: "Survey" },
  { id: "deed_title", label: "Deed / title" },
  { id: "tax_assessment", label: "Tax / assessment" },
  { id: "permit", label: "Permit" },
  { id: "insurance", label: "Insurance" },
  { id: "lease_rental", label: "Lease / rental" },
  { id: "receipt_invoice", label: "Receipt / invoice" },
  { id: "photo_media", label: "Photo / media" },
  { id: "other", label: "Other" },
];

const CATEGORY_LABEL: Record<DocumentCategory, string> = {
  inspection: "Inspection",
  contractor_bid: "Contractor bid",
  survey: "Survey",
  deed_title: "Deed / title",
  tax_assessment: "Tax / assessment",
  permit: "Permit",
  insurance: "Insurance",
  lease_rental: "Lease / rental",
  receipt_invoice: "Receipt / invoice",
  photo_media: "Photo / media",
  other: "Other",
};

// =============================================================
// Extraction status metadata
// =============================================================

const EXTRACTION_LABEL: Record<
  DocumentExtractionStatus,
  { label: string; tone: StatusTone }
> = {
  not_started: { label: "Extraction: not started", tone: "neutral" },
  draft_ready: { label: "AI draft ready", tone: "info" },
  reviewed: { label: "Reviewed", tone: "success" },
};

const VERIFIED_LABEL: Record<
  DocumentRecord["verified"],
  { label: string; tone: StatusTone } | null
> = {
  verified: { label: "Verified", tone: "success" },
  needs_verification: { label: "Needs verification", tone: "warning" },
  not_required: null,
};

// =============================================================
// Page
// =============================================================

type SearchParams = Promise<{ category?: string }>;

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { category: rawCategory } = await searchParams;
  const activeCategory: DocumentCategory | "all" = isCategoryId(rawCategory)
    ? rawCategory
    : "all";

  const filtered =
    activeCategory === "all"
      ? documents
      : documents.filter((d) => d.category === activeCategory);

  const counts = {
    total: documents.length,
    needsReview: documents.filter((d) => d.verified === "needs_verification")
      .length,
    draftsReady: documents.filter((d) => d.extractionStatus === "draft_ready")
      .length,
    notStarted: documents.filter(
      (d) => d.extractionStatus === "not_started" || !d.extractionStatus
    ).length,
  };

  return (
    <>
      <PageHeader
        eyebrow="Documents"
        title="Document workspace"
        description="A central library for property records, contracts, permits, insurance, bids, and supporting media. AI extraction surfaces facts, risks, and action items as draft notes you review before relying on."
        primaryAction={
          <button
            type="button"
            disabled
            aria-disabled
            title="File upload is not wired in this build."
            className="inline-flex min-h-[40px] cursor-not-allowed items-center justify-center rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface-soft)] px-3.5 py-2 text-sm font-medium text-[var(--workspace-text-secondary)]"
          >
            Upload document
          </button>
        }
      />

      <SampleBanner total={counts.total} />

      <SectionPanel
        title="Library"
        description={`${counts.total} documents on file · ${counts.draftsReady} AI drafts ready to review · ${counts.needsReview} need verification.`}
      >
        <CategoryFilters active={activeCategory} />
        <DocumentList docs={filtered} activeCategory={activeCategory} />
      </SectionPanel>

      <AdobePdfServicesPanel configured={hasAdobePdfServices()} />

      <ExtractionPanel />
    </>
  );
}

/**
 * Adobe PDF Services env check. Inlined here (rather than added to
 * `src/lib`) because nothing else consumes it yet — we read Boolean
 * presence of the two required env vars without touching their values.
 * No Adobe SDK is imported; no Adobe API call is made on render.
 */
function hasAdobePdfServices(): boolean {
  return (
    Boolean(process.env.ADOBE_PDF_SERVICES_CLIENT_ID?.trim()) &&
    Boolean(process.env.ADOBE_PDF_SERVICES_CLIENT_SECRET?.trim())
  );
}

// =============================================================
// Sample banner
// =============================================================

function SampleBanner({ total }: { total: number }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius-md)] bg-[var(--color-surface-soft)] px-4 py-3 text-sm shadow-[var(--shadow-card-ring)]">
      <ToneTag label="Sample data" tone="neutral" />
      <span className="text-[var(--workspace-text-secondary)]">
        {total} sample documents shown. File upload, full-text storage, and AI
        extraction are placeholders in this first-pass build.
      </span>
    </div>
  );
}

// =============================================================
// Category filter chips (server-rendered, search-params driven)
// =============================================================

function CategoryFilters({ active }: { active: CategoryMeta["id"] }) {
  return (
    <nav
      aria-label="Filter documents by category"
      className="-mx-1 flex flex-wrap gap-2 pb-3"
    >
      {CATEGORIES.map((cat) => {
        const isActive = active === cat.id;
        const href =
          cat.id === "all"
            ? "/documents"
            : `/documents?category=${encodeURIComponent(cat.id)}`;
        return (
          <Link
            key={cat.id}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={`inline-flex min-h-[36px] items-center justify-center rounded-full border px-3 py-1 text-[12.5px] font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] ${
              isActive
                ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
                : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--workspace-text-secondary)] hover:border-[var(--color-border-strong)] hover:text-[var(--workspace-text)]"
            }`}
          >
            {cat.label}
          </Link>
        );
      })}
    </nav>
  );
}

// =============================================================
// Document list
// =============================================================

function DocumentList({
  docs,
  activeCategory,
}: {
  docs: DocumentRecord[];
  activeCategory: CategoryMeta["id"];
}) {
  if (docs.length === 0) {
    return (
      <div className="rounded-[var(--radius-md)] bg-[var(--color-surface-soft)] px-4 py-6 text-center text-sm text-[var(--workspace-text-secondary)] shadow-[var(--shadow-card-ring)]">
        No documents in this category yet.
        {activeCategory !== "all" ? (
          <>
            {" "}
            <Link
              href="/documents"
              className="font-semibold text-[var(--color-primary)] hover:underline"
            >
              Show all
            </Link>
          </>
        ) : null}
      </div>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-[color-mix(in_srgb,var(--color-border)_60%,transparent)]">
      {docs.map((doc) => (
        <DocumentRow key={doc.id} doc={doc} />
      ))}
    </ul>
  );
}

function DocumentRow({ doc }: { doc: DocumentRecord }) {
  const verified = VERIFIED_LABEL[doc.verified];
  const extraction = doc.extractionStatus
    ? EXTRACTION_LABEL[doc.extractionStatus]
    : EXTRACTION_LABEL.not_started;
  const property =
    doc.propertySlug !== undefined
      ? trackedProperties.find((p) => p.slug === doc.propertySlug) ?? null
      : null;

  return (
    <li className="grid grid-cols-1 gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-sm font-semibold text-[var(--workspace-text)] [overflow-wrap:anywhere]">
          {doc.name}
        </span>
        <span className="text-xs text-[var(--workspace-text-secondary)]">
          {doc.linkedTo}
          {" · "}
          {doc.date}
          {doc.lastReviewed ? (
            <>
              {" · "}
              <span className="text-[var(--workspace-text-muted)]">
                last reviewed {doc.lastReviewed}
              </span>
            </>
          ) : null}
        </span>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {doc.category ? (
            <ToneTag label={CATEGORY_LABEL[doc.category]} tone="neutral" />
          ) : null}
          {property ? (
            <Link
              href={`/properties/${property.slug}`}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--workspace-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
            >
              {property.address}
            </Link>
          ) : null}
        </div>
      </div>
      <div className="flex flex-col items-start gap-1.5 sm:items-end">
        {verified ? <ToneTag label={verified.label} tone={verified.tone} /> : null}
        <ToneTag label={extraction.label} tone={extraction.tone} />
        <DocumentGmailDraftPlaceholder />
      </div>
    </li>
  );
}

/**
 * Disabled Gmail draft affordance for a document row. Documents have no
 * linked contact/email field in the data model yet, so the pill always
 * renders disabled with a hint explaining what would unlock it. Per the
 * scope of this pass we are not implementing upload/storage or per-doc
 * contact linking — just exposing the future surface so it is
 * discoverable in the UI.
 */
function DocumentGmailDraftPlaceholder() {
  return (
    <span
      aria-disabled
      title="Link a contact or email to this document to enable a Gmail draft."
      className="inline-flex min-h-[28px] cursor-not-allowed items-center gap-1.5 rounded-full border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--workspace-text-muted)]"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icons/workspace/gmail-icon.svg"
        alt=""
        aria-hidden
        width={14}
        height={14}
        className="inline-block shrink-0"
      />
      Draft email about this document
    </span>
  );
}

// =============================================================
// Adobe PDF Services panel
// =============================================================

const ADOBE_PDF_ACTIONS: { label: string; description: string }[] = [
  {
    label: "Extract PDF facts",
    description:
      "Pull structured text, headings, and metadata from a PDF for downstream review. Adobe Extract API.",
  },
  {
    label: "OCR scanned PDF",
    description:
      "Recognize text in scanned/image-only PDFs so it can be searched and extracted. Adobe OCR API.",
  },
  {
    label: "Extract tables",
    description:
      "Identify and pull tabular data (line items, bid summaries) into a structured format.",
  },
  {
    label: "Split / compress / prepare PDF",
    description:
      "Split a multi-doc PDF, compress large scans, or prepare a clean copy before extraction runs.",
  },
];

function AdobePdfServicesPanel({ configured }: { configured: boolean }) {
  const statusCopy = configured
    ? "Adobe PDF Services is configured. Files are not processed automatically."
    : "Adobe PDF Services not configured.";

  return (
    <SectionPanel
      title="Adobe PDF Services"
      description="PDF extraction, OCR, table extraction, and document preparation. Runs only when you click an action — page load does not call Adobe."
    >
      <div className="mb-4 flex flex-col gap-3 rounded-[var(--radius-md)] bg-[var(--color-surface-soft)] p-4 shadow-[var(--shadow-card-ring)] sm:flex-row sm:items-start sm:gap-4">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[var(--color-surface)] shadow-[var(--shadow-card-ring)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/workspace/adobe-acrobat-reader.svg"
            alt=""
            aria-hidden
            width={20}
            height={20}
          />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display text-sm font-semibold text-[var(--workspace-text)]">
              Adobe PDF Services
            </span>
            <span
              className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold"
              style={{
                background: configured
                  ? "var(--status-success-bg)"
                  : "var(--status-neutral-bg)",
                color: configured
                  ? "var(--status-success-text)"
                  : "var(--status-neutral-text)",
                borderColor: configured
                  ? "var(--status-success-border)"
                  : "var(--status-neutral-border)",
              }}
            >
              {configured ? "Configured" : "Not configured"}
            </span>
          </div>
          <p className="text-[12.5px] leading-relaxed text-[var(--workspace-text-secondary)]">
            {statusCopy}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ADOBE_PDF_ACTIONS.map((a) => (
          <button
            key={a.label}
            type="button"
            disabled
            aria-disabled
            title={
              configured
                ? "Adobe PDF action is not wired in this first-pass build."
                : "Configure Adobe PDF Services to enable this action."
            }
            className="flex cursor-not-allowed flex-col items-start gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-surface-soft)] p-4 text-left shadow-[var(--shadow-card-ring)] transition-colors"
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-[var(--workspace-text)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icons/workspace/adobe-acrobat-reader.svg"
                alt=""
                aria-hidden
                width={16}
                height={16}
                className="inline-block shrink-0"
              />
              {a.label}
            </span>
            <span className="text-[12.5px] leading-relaxed text-[var(--workspace-text-secondary)]">
              {a.description}
            </span>
            <span className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--workspace-text-muted)]">
              First pass · not yet wired
            </span>
          </button>
        ))}
      </div>
    </SectionPanel>
  );
}

// =============================================================
// AI Extraction placeholder panel
// =============================================================

const EXTRACTION_ACTIONS: {
  label: string;
  description: string;
}[] = [
  {
    label: "Extract document facts",
    description:
      "Read the document and propose document type, parties, dates, costs, and reference numbers as a draft for review.",
  },
  {
    label: "Find risks",
    description:
      "Surface clauses, liabilities, exclusions, expirations, and missing information that warrant attention.",
  },
  {
    label: "Create tasks",
    description:
      "Suggest follow-up tasks (signatures, COIs, permits to obtain, replies due) — never written to the database without your approval.",
  },
  {
    label: "Link to budget",
    description:
      "Map line items, prices, and committed amounts to budget categories for review.",
  },
  {
    label: "Draft contractor questions",
    description:
      "Generate questions to send back to the vendor or municipality based on what is unclear or missing.",
  },
];

function ExtractionPanel() {
  return (
    <SectionPanel
      title="AI document extraction"
      description="Runs only when you click an action. Output is a draft review — verify before relying."
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {EXTRACTION_ACTIONS.map((a) => (
          <button
            key={a.label}
            type="button"
            disabled
            aria-disabled
            title="Extraction is not wired in this first-pass build."
            className="flex cursor-not-allowed flex-col items-start gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-surface-soft)] p-4 text-left shadow-[var(--shadow-card-ring)] transition-colors"
          >
            <span className="text-sm font-semibold text-[var(--workspace-text)]">
              {a.label}
            </span>
            <span className="text-[12.5px] leading-relaxed text-[var(--workspace-text-secondary)]">
              {a.description}
            </span>
            <span className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--workspace-text-muted)]">
              First pass · not yet wired
            </span>
          </button>
        ))}
      </div>
      <p className="mt-3 text-[12px] text-[var(--workspace-text-secondary)]">
        Future extraction will produce: document type, linked property,
        vendor / contact, dates, costs, risks, permit / code questions,
        action items, and missing information — all surfaced as draft
        notes you can edit, accept, or discard before anything is saved.
      </p>
    </SectionPanel>
  );
}

// =============================================================
// Helpers
// =============================================================

function isCategoryId(value: unknown): value is CategoryMeta["id"] {
  if (typeof value !== "string") return false;
  return CATEGORIES.some((c) => c.id === value);
}
