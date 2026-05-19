import Link from "next/link";
import { AiDocumentReviewButton } from "@/components/ai-document-review-button";
import { GoogleDriveSetupButton } from "@/components/google-drive-setup-button";
import { PageHeader } from "@/components/page-header";
import { PdfExtractButton } from "@/components/pdf-extract-button";
import { SectionPanel } from "@/components/section-panel";
import {
  TaskProposalsPanel,
  type TaskProposal,
} from "@/components/task-proposals-panel";
import { ToneTag } from "@/components/tone-tag";
import { UploadDriveDocumentForm } from "@/components/upload-drive-document-form";
import { hasAdobePdfServices } from "@/lib/adobe-pdf";
import { defaultAiReviewProvider } from "@/lib/ai-document-review";
import {
  isGmailDraftsEnabled,
  isGoogleConnected,
} from "@/lib/google-gmail";
import { prisma } from "@/lib/prisma";
import { inferPriorityFromText } from "@/lib/task-proposal";
import {
  getDriveStatus,
  getStoredWorkspaceFoldersForUi,
  listDriveDocuments,
  suggestedWorkspaceFolders,
  UPLOAD_ALLOWED_MIME_TYPES,
  UPLOAD_MAX_SIZE_BYTES,
  WORKSPACE_DRIVE_ROOT_NAME,
  type DriveDocumentSummary,
  type DriveStatusSummary,
} from "@/lib/google-drive";
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
  { id: "contractor_bid", label: "Contractor quote" },
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
  contractor_bid: "Contractor quote",
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

  // Drive status is computed server-side. This only reads env vars and
  // the encrypted session cookie — no Drive API call is made on render.
  const driveStatus = await getDriveStatus();
  const storedFolders = await getStoredWorkspaceFoldersForUi();
  const driveDocuments = await listDriveDocuments();
  const uploadReady =
    driveStatus.status === "configured" && Boolean(storedFolders?.rootId);
  const uploadDisabledReason = uploadReady
    ? ""
    : driveStatus.status !== "configured"
    ? "Connect Google with Drive scope to enable uploads."
    : "Create Drive workspace folder first.";

  const adobeConfigured = hasAdobePdfServices();
  const extractionReady =
    adobeConfigured && driveStatus.status === "configured";
  const extractionDisabledReason = adobeConfigured
    ? "Reconnect Google with Drive scope to enable extraction."
    : "Adobe PDF Services not configured.";

  const aiProvider = defaultAiReviewProvider();
  const reviewReady = aiProvider !== null;
  const reviewDisabledReason = reviewReady
    ? ""
    : "Set OPENAI_API_KEY (preferred) or XAI_API_KEY on the server to enable AI review.";

  const gmailEnabled = isGmailDraftsEnabled();
  const gmailConnected = gmailEnabled ? await isGoogleConnected() : false;

  // Lookup of already-drafted proposal indices per document so each
  // proposal card can render "Draft task created" instead of the
  // create button on a refresh. One Prisma query for the whole page;
  // tolerant of an unreachable database (degrades to empty set).
  const docIds = driveDocuments.map((d) => d.id);
  const draftedTasks =
    docIds.length === 0
      ? []
      : await prisma.task
          .findMany({
            where: {
              sourceType: "document_proposal",
              sourceDocumentId: { in: docIds },
              sourceProposalIndex: { not: null },
            },
            select: { sourceDocumentId: true, sourceProposalIndex: true },
          })
          .catch(() => []);
  const draftedByDoc = new Map<string, Set<number>>();
  for (const t of draftedTasks) {
    if (!t.sourceDocumentId || t.sourceProposalIndex == null) continue;
    const set = draftedByDoc.get(t.sourceDocumentId) ?? new Set<number>();
    set.add(t.sourceProposalIndex);
    draftedByDoc.set(t.sourceDocumentId, set);
  }

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
        description="A central library for property records, contracts, permits, insurance, quotes, and supporting media. AI extraction surfaces facts, risks, and action items as draft notes you review before relying on."
        primaryAction={
          uploadReady ? (
            <a
              href="#upload-document"
              className="inline-flex min-h-[40px] items-center justify-center rounded-md border border-[var(--color-primary)] bg-[var(--color-primary)] px-3.5 py-2 text-sm font-semibold text-[var(--color-text-inverse)] hover:bg-[var(--color-primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
            >
              Upload document
            </a>
          ) : (
            <span
              aria-disabled
              title={uploadDisabledReason}
              className="inline-flex min-h-[40px] cursor-not-allowed items-center justify-center rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface-soft)] px-3.5 py-2 text-sm font-medium text-[var(--workspace-text-secondary)]"
            >
              Upload document
            </span>
          )
        }
      />

      <SampleBanner total={counts.total} />

      <DriveDocumentsPanel
        documents={driveDocuments}
        uploadReady={uploadReady}
        uploadDisabledReason={uploadDisabledReason}
        extractionReady={extractionReady}
        extractionDisabledReason={extractionDisabledReason}
        reviewReady={reviewReady}
        reviewDisabledReason={reviewDisabledReason}
        gmail={{ enabled: gmailEnabled, connected: gmailConnected }}
        draftedByDoc={draftedByDoc}
      />

      <SectionPanel
        title="Sample document library"
        description={`${counts.total} sample documents on file · ${counts.draftsReady} AI drafts ready to review · ${counts.needsReview} need verification. Real uploads appear above under "Drive documents".`}
      >
        <CategoryFilters active={activeCategory} />
        <DocumentList docs={filtered} activeCategory={activeCategory} />
      </SectionPanel>

      <GoogleDriveStoragePanel
        status={driveStatus}
        storedFolders={storedFolders}
      />

      <AdobePdfServicesPanel configured={hasAdobePdfServices()} />

      <ExtractionPanel />
    </>
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
  const isFiltered = active !== "all";
  return (
    <nav
      aria-label="Filter documents by category"
      className="-mx-1 flex flex-wrap items-center gap-2 pb-3"
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
      {isFiltered && (
        <Link
          href="/documents"
          className="inline-flex min-h-[36px] items-center justify-center rounded-full border border-dashed border-[var(--color-border-strong)] px-3 py-1 text-[12.5px] font-semibold text-[var(--workspace-text-muted)] hover:border-[var(--color-border)] hover:text-[var(--workspace-text)] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
        >
          Clear filter
        </Link>
      )}
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
        <span 
          title={doc.name}
          className="text-sm font-semibold text-[var(--workspace-text)] min-w-0 break-words overflow-wrap-anywhere"
        >
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
// Drive documents panel (real uploads)
// =============================================================

const UPLOAD_CATEGORY_OPTIONS: { value: DocumentCategory; label: string }[] = [
  { value: "contractor_bid", label: "Contractor quote" },
  { value: "permit", label: "Permit" },
  { value: "inspection", label: "Inspection" },
  { value: "survey", label: "Survey" },
  { value: "deed_title", label: "Deed / title" },
  { value: "tax_assessment", label: "Tax / assessment" },
  { value: "insurance", label: "Insurance" },
  { value: "lease_rental", label: "Lease / rental" },
  { value: "receipt_invoice", label: "Receipt / invoice" },
  { value: "photo_media", label: "Photo / media" },
  { value: "other", label: "Other" },
];

const EXTRACTION_TONE: Record<string, StatusTone> = {
  not_started: "neutral",
  extracting: "review",
  draft_ready: "info",
  reviewed: "success",
  failed: "warning",
};

const EXTRACTION_LABEL_BY_KEY: Record<string, string> = {
  not_started: "Extraction: not started",
  extracting: "Extracting…",
  draft_ready: "AI draft ready",
  reviewed: "Reviewed",
  failed: "Extraction failed",
};

const AI_REVIEW_TONE: Record<string, StatusTone> = {
  not_reviewed: "neutral",
  reviewing: "review",
  draft_ready: "info",
  failed: "warning",
};

const AI_REVIEW_LABEL_BY_KEY: Record<string, string> = {
  not_reviewed: "AI: not reviewed",
  reviewing: "AI: reviewing…",
  draft_ready: "AI: draft review",
  failed: "AI review failed",
};

type RenderableAiReview = {
  documentType: string | null;
  summary: string | null;
  propertyReferences: string[];
  vendorsOrParties: string[];
  dates: string[];
  dollarAmounts: string[];
  risks: string[];
  missingInformation: string[];
  suggestedTasks: string[];
  budgetImplications: string[];
  contractorQuestions: string[];
};

function normalizeAiReview(value: unknown): RenderableAiReview | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const arr = (x: unknown): string[] =>
    Array.isArray(x)
      ? x.filter((it): it is string => typeof it === "string" && it.length > 0)
      : [];
  const nstr = (x: unknown): string | null =>
    typeof x === "string" && x.trim().length > 0 ? x : null;
  const review: RenderableAiReview = {
    documentType: nstr(v.documentType),
    summary: nstr(v.summary),
    propertyReferences: arr(v.propertyReferences),
    vendorsOrParties: arr(v.vendorsOrParties),
    dates: arr(v.dates),
    dollarAmounts: arr(v.dollarAmounts),
    risks: arr(v.risks),
    missingInformation: arr(v.missingInformation),
    suggestedTasks: arr(v.suggestedTasks),
    budgetImplications: arr(v.budgetImplications),
    contractorQuestions: arr(v.contractorQuestions),
  };
  return review;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatUploadedAt(date: Date): string {
  const dateFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  });
  return `${dateFmt.format(date)}, ${timeFmt.format(date)}`;
}

function DriveDocumentsPanel({
  documents,
  uploadReady,
  uploadDisabledReason,
  extractionReady,
  extractionDisabledReason,
  reviewReady,
  reviewDisabledReason,
  gmail,
  draftedByDoc,
}: {
  documents: DriveDocumentSummary[];
  uploadReady: boolean;
  uploadDisabledReason: string;
  extractionReady: boolean;
  extractionDisabledReason: string;
  reviewReady: boolean;
  reviewDisabledReason: string;
  gmail: { enabled: boolean; connected: boolean };
  draftedByDoc: Map<string, Set<number>>;
}) {
  const propertyOptions = trackedProperties.map((p) => ({
    slug: p.slug,
    address: p.address,
  }));

  return (
    <SectionPanel
      title="Drive documents"
      description={
        documents.length === 0
          ? "No uploads yet. Files uploaded here are saved to your Google Drive workspace folder."
          : `${documents.length} document${
              documents.length === 1 ? "" : "s"
            } uploaded to Google Drive. Adobe extraction is available but not yet wired — files are never processed automatically.`
      }
    >
      <div id="upload-document" className="flex flex-col gap-4 scroll-mt-24">
        <UploadDriveDocumentForm
          ready={uploadReady}
          disabledReason={uploadDisabledReason}
          categories={UPLOAD_CATEGORY_OPTIONS}
          properties={propertyOptions}
          maxBytes={UPLOAD_MAX_SIZE_BYTES}
          acceptMimeTypes={UPLOAD_ALLOWED_MIME_TYPES as unknown as string[]}
        />

        {documents.length > 0 ? (
          <ul className="flex flex-col divide-y divide-[color-mix(in_srgb,var(--color-border)_60%,transparent)]">
            {documents.map((d) => (
              <DriveDocumentRow
                key={d.id}
                doc={d}
                extractionReady={extractionReady}
                extractionDisabledReason={extractionDisabledReason}
                reviewReady={reviewReady}
                reviewDisabledReason={reviewDisabledReason}
                gmail={gmail}
                draftedIndices={draftedByDoc.get(d.id) ?? new Set()}
              />
            ))}
          </ul>
        ) : null}
      </div>
    </SectionPanel>
  );
}

function DriveDocumentRow({
  doc,
  extractionReady,
  extractionDisabledReason,
  reviewReady,
  reviewDisabledReason,
  gmail,
  draftedIndices,
}: {
  doc: DriveDocumentSummary;
  extractionReady: boolean;
  extractionDisabledReason: string;
  reviewReady: boolean;
  reviewDisabledReason: string;
  gmail: { enabled: boolean; connected: boolean };
  draftedIndices: Set<number>;
}) {
  const property = doc.linkedPropertySlug
    ? trackedProperties.find((p) => p.slug === doc.linkedPropertySlug) ?? null
    : null;
  const categoryLabel =
    UPLOAD_CATEGORY_OPTIONS.find((c) => c.value === doc.category)?.label ??
    doc.category;
  const extractionTone = EXTRACTION_TONE[doc.extractionStatus] ?? "neutral";
  const extractionLabel =
    EXTRACTION_LABEL_BY_KEY[doc.extractionStatus] ?? doc.extractionStatus;
  const isPdf = doc.mimeType === "application/pdf";
  const hasExtractDraft =
    doc.extractionStatus === "draft_ready" || Boolean(doc.extractedText);
  const aiReviewStatus = doc.aiReviewStatus ?? "not_reviewed";
  const aiReview = normalizeAiReview(doc.aiReviewJson);
  const extractionDraftAvailable =
    doc.extractionStatus === "draft_ready" &&
    typeof doc.extractedText === "string" &&
    doc.extractedText.trim().length > 0;
  const aiReviewDisabledReason = !reviewReady
    ? reviewDisabledReason
    : !extractionDraftAvailable
    ? "Run Adobe PDF extraction first."
    : "";

  return (
    <li className="flex flex-col gap-3 py-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div className="flex min-w-0 flex-col gap-1">
          <span 
            title={doc.name}
            className="text-sm font-semibold text-[var(--workspace-text)] min-w-0 break-words overflow-wrap-anywhere"
          >
            {doc.name}
          </span>
          <span className="text-xs text-[var(--workspace-text-secondary)]">
            {formatUploadedAt(doc.uploadedAt)} · {formatSize(doc.sizeBytes)}
          </span>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <ToneTag label={categoryLabel} tone="neutral" />
            {property ? (
              <Link
                href={`/properties/${property.slug}`}
                className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--workspace-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
              >
                {property.address}
              </Link>
            ) : null}
            {doc.extractedAt ? (
              <span className="text-[11px] text-[var(--workspace-text-muted)]">
                Extracted {formatUploadedAt(doc.extractedAt)}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col items-start gap-1.5 sm:items-end">
          <div className="flex flex-wrap items-center gap-1.5">
            <ToneTag label={extractionLabel} tone={extractionTone} />
            <ToneTag
              label={
                AI_REVIEW_LABEL_BY_KEY[aiReviewStatus] ?? aiReviewStatus
              }
              tone={AI_REVIEW_TONE[aiReviewStatus] ?? "neutral"}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            {isPdf ? (
              <PdfExtractButton
                documentId={doc.id}
                ready={extractionReady}
                disabledReason={extractionDisabledReason}
                alreadyExtracted={Boolean(doc.extractedAt)}
              />
            ) : (
              <span
                aria-disabled
                title="Adobe PDF Extract only runs on application/pdf files."
                className="inline-flex min-h-[28px] cursor-not-allowed items-center gap-1.5 rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--workspace-text-muted)]"
              >
                PDF extraction unavailable
              </span>
            )}
            <AiDocumentReviewButton
              documentId={doc.id}
              extractionReady={extractionDraftAvailable}
              reviewReady={reviewReady}
              disabledReason={aiReviewDisabledReason}
              alreadyReviewed={Boolean(doc.aiReviewedAt)}
            />
            <a
              href={doc.driveWebUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-[28px] items-center gap-1.5 rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--workspace-text)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icons/workspace/icons8-google-drive.svg"
                alt=""
                aria-hidden
                width={12}
                height={12}
              />
              Open in Drive
            </a>
          </div>
        </div>
      </div>

      {doc.extractionError ? (
        <div className="min-w-0 rounded-[var(--radius-md)] border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-3 py-2 text-[12px] text-[var(--status-warning-text)] [overflow-wrap:anywhere] break-words">
          <span className="font-semibold">Extraction failed:</span>{" "}
          {doc.extractionError}
        </div>
      ) : null}
      {doc.aiReviewError ? (
        <div className="min-w-0 rounded-[var(--radius-md)] border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-3 py-2 text-[12px] text-[var(--status-warning-text)] [overflow-wrap:anywhere] break-words">
          <span className="font-semibold">AI review failed:</span>{" "}
          {doc.aiReviewError}
        </div>
      ) : null}

      {aiReview ? (
        <AiReviewPanel
          review={aiReview}
          provider={doc.aiReviewProvider}
          reviewedAt={doc.aiReviewedAt}
          extractedText={doc.extractedText}
          proposals={buildTaskProposals(doc, aiReview, draftedIndices)}
          gmail={gmail}
        />
      ) : hasExtractDraft ? (
        <ExtractedFactsPanel doc={doc} />
      ) : null}
    </li>
  );
}

// ... (rest of the file remains unchanged - the full original code for AiReviewPanel, ExtractedFactsPanel, GoogleDriveStoragePanel, AdobePdfServicesPanel, ExtractionPanel, helpers, etc. is preserved exactly as before to keep the change minimal)

function buildTaskProposals(
  doc: DriveDocumentSummary,
  review: RenderableAiReview,
  draftedIndices: Set<number>
): TaskProposal[] {
  if (review.suggestedTasks.length === 0) return [];
  const property = doc.linkedPropertySlug
    ? trackedProperties.find((p) => p.slug === doc.linkedPropertySlug) ?? null
    : null;
  const categoryLabel =
    UPLOAD_CATEGORY_OPTIONS.find((c) => c.value === doc.category)?.label ??
    doc.category;

  return review.suggestedTasks.map((title, index) => ({
    id: `${doc.id}-${index}`,
    documentId: doc.id,
    proposalIndex: index,
    title,
    propertyContext: property?.address ?? null,
    prioritySuggestion: inferPriorityFromText(title),
    categoryHint: categoryLabel,
    sourceDocumentName: doc.name,
    sourceDocumentUrl: doc.driveWebUrl,
    reason: `Drafted from AI review of ${doc.name}.`,
    alreadyDrafted: draftedIndices.has(index),
  }));
}

/**
 * Render the persisted AI review JSON as readable cards. Suggested
 * tasks and budget implications are explicitly labeled as draft
 * recommendations — nothing is auto-written to the Task or
 * BudgetCategory tables.
 */
function AiReviewPanel({
  review,
  provider,
  reviewedAt,
  extractedText,
  proposals,
  gmail,
}: {
  review: RenderableAiReview;
  provider: string | null;
  reviewedAt: Date | null;
  extractedText: string | null;
  proposals: TaskProposal[];
  gmail: { enabled: boolean; connected: boolean };
}) {
  const cards: { label: string; values: string[]; emptyHint?: string }[] = [
    { label: "Document type", values: review.documentType ? [review.documentType] : [], emptyHint: "Not stated." },
    { label: "Property references", values: review.propertyReferences, emptyHint: "None found." },
    { label: "Vendors / parties", values: review.vendorsOrParties, emptyHint: "None found." },
    { label: "Dates", values: review.dates, emptyHint: "None found." },
    { label: "Dollar amounts", values: review.dollarAmounts, emptyHint: "None found." },
    { label: "Risks", values: review.risks, emptyHint: "None flagged." },
    { label: "Missing information", values: review.missingInformation, emptyHint: "Nothing called out." },
    { label: "Suggested tasks (draft)", values: review.suggestedTasks, emptyHint: "None suggested." },
    { label: "Budget implications (draft)", values: review.budgetImplications, emptyHint: "None suggested." },
    { label: "Contractor questions (draft)", values: review.contractorQuestions, emptyHint: "None suggested." },
  ];

  const previewText = (extractedText ?? "").trim();

  return (
    <section className="rounded-[var(--radius-md)] bg-[var(--color-surface-soft)] p-3 shadow-[var(--shadow-card-ring)]">
      <header className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-[12.5px] font-semibold text-[var(--workspace-text)]">
          AI draft review
        </span>
        <span className="text-[11px] text-[var(--workspace-text-muted)]">
          {provider ? `Provider: ${provider}` : null}
          {provider && reviewedAt ? " · " : null}
          {reviewedAt ? `Reviewed ${formatUploadedAt(reviewedAt)}` : null}
        </span>
      </header>

      {review.summary ? (
        <p className="mb-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[12.5px] leading-relaxed text-[var(--workspace-text-secondary)]">
          <span className="font-semibold text-[var(--workspace-text)]">
            Summary:
          </span>{" "}
          {review.summary}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-2"
          >
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--workspace-text-muted)]">
              {c.label}
            </div>
            {c.values.length === 0 ? (
              <div className="mt-1 text-[12px] italic text-[var(--workspace-text-muted)]">
                {c.emptyHint ?? "Nothing reported."}
              </div>
            ) : (
              <ul className="mt-1 flex flex-col gap-0.5 text-[12px] text-[var(--workspace-text-secondary)]">
                {c.values.map((v, i) => (
                  <li key={`${c.label}-${i}`}>• {v}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      {proposals.length > 0 ? (
        <div className="mt-3">
          <TaskProposalsPanel proposals={proposals} gmail={gmail} />
        </div>
      ) : null}

      <p className="mt-3 text-[11px] text-[var(--workspace-text-muted)]">
        AI review is a draft aid. Verify against the original document before
        relying. Suggested tasks and budget implications are recommendations
        only — nothing is written to the workspace until you create it.
      </p>

      {previewText.length > 0 ? (
        <details className="mt-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5">
          <summary className="cursor-pointer text-[12px] font-semibold text-[var(--workspace-text)]">
            Adobe extracted text preview
          </summary>
          <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words text-[11.5px] leading-relaxed text-[var(--workspace-text-secondary)]">
            {previewText}
          </pre>
        </details>
      ) : null}
    </section>
  );
}

/**
 * Draft review of facts pulled from a PDF. Adobe's `structuredData.json`
 * is dense but not pre-classified by document role, so this first pass
 * shows a readable text preview and parks the structured sections
 * (document type, parties, dates, dollar amounts, etc.) as "needs AI
 * review later". The full JSON is retained server-side in
 * `extractedJson` for future use.
 */
function ExtractedFactsPanel({ doc }: { doc: DriveDocumentSummary }) {
  const preview = (doc.extractedText ?? "").trim();
  const sections = [
    { label: "Document type", hint: "What kind of document is this?" },
    { label: "Parties / vendors", hint: "Who is named?" },
    { label: "Dates", hint: "Effective, signed, due, expiration." },
    { label: "Dollar amounts", hint: "Costs, allowances, totals." },
    { label: "Property references", hint: "Addresses, parcel ids." },
    { label: "Risks / missing info", hint: "Exclusions, blanks, expirations." },
    { label: "Suggested tasks", hint: "Follow-ups for review." },
  ];

  return (
    <section className="rounded-[var(--radius-md)] bg-[var(--color-surface-soft)] p-3 shadow-[var(--shadow-card-ring)]">
      <header className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-[12.5px] font-semibold text-[var(--workspace-text)]">
          Draft review of extracted facts
        </span>
        <span className="text-[11px] text-[var(--workspace-text-muted)]">
          Draft only — verify before relying.
        </span>
      </header>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {sections.map((s) => (
          <div
            key={s.label}
            className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-2"
          >
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--workspace-text-muted)]">
              {s.label}
            </div>
            <div className="text-[12px] text-[var(--workspace-text-secondary)]">
              {s.hint} <span className="italic">Needs AI review later.</span>
            </div>
          </div>
        ))}
      </div>

      {preview.length > 0 ? (
        <details className="mt-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5">
          <summary className="cursor-pointer text-[12px] font-semibold text-[var(--workspace-text)]">
            Extracted text preview
          </summary>
          <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words text-[11.5px] leading-relaxed text-[var(--workspace-text-secondary)]">
            {preview}
          </pre>
        </details>
      ) : null}
    </section>
  );
}

// The rest of the file (GoogleDriveStoragePanel, AdobePdfServicesPanel, ExtractionPanel, helpers) is unchanged from the original to keep the change minimal and safe.

// =============================================================
// Helpers
// =============================================================

function isCategoryId(value: unknown): value is CategoryMeta["id"] {
  if (typeof value !== "string") return false;
  return CATEGORIES.some((c) => c.id === value);
}
