"use client";

/**
 * Upload form for the Documents workspace. Posts to the
 * `uploadDriveDocumentAction` server action, which:
 *   - validates file type + size + category + property
 *   - resolves the target Drive folder (property → category → root)
 *   - performs the multipart upload to Drive
 *   - inserts one `DriveDocument` row
 *
 * Adobe extraction is intentionally NOT triggered by this form. The
 * uploaded record lands with `extractionStatus: "not_started"`.
 *
 * The form is rendered disabled with a helpful inline message when
 * Drive is not ready (env missing, not connected, scope missing, or
 * workspace folder not yet created). The parent decides readiness and
 * passes a `disabledReason` so this component does no env inspection
 * itself.
 */
import { useActionState, useRef } from "react";
import {
  uploadDriveDocumentAction,
  type UploadDriveDocumentState,
} from "@/lib/google-drive-actions";

export type CategoryOption = { value: string; label: string };
export type PropertyOption = { slug: string; address: string };

export type UploadDriveDocumentFormProps = {
  ready: boolean;
  disabledReason: string;
  categories: CategoryOption[];
  properties: PropertyOption[];
  /** Max file size in bytes (for the input attribute hint). */
  maxBytes: number;
  /** Comma-separated MIME types for the `accept` attribute. */
  acceptMimeTypes: string[];
};

export function UploadDriveDocumentForm({
  ready,
  disabledReason,
  categories,
  properties,
  maxBytes,
  acceptMimeTypes,
}: UploadDriveDocumentFormProps) {
  const [state, action, pending] = useActionState<
    UploadDriveDocumentState,
    FormData
  >(uploadDriveDocumentAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  if (!ready) {
    return (
      <div className="flex flex-col gap-2 rounded-[var(--radius-md)] bg-[var(--color-surface-soft)] p-4 shadow-[var(--shadow-card-ring)]">
        <span className="text-sm font-semibold text-[var(--workspace-text)]">
          Upload document
        </span>
        <p className="text-[12.5px] text-[var(--workspace-text-secondary)]">
          {disabledReason}
        </p>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      action={(formData) => {
        action(formData);
      }}
      className="flex flex-col gap-3 rounded-[var(--radius-md)] bg-[var(--color-surface-soft)] p-4 shadow-[var(--shadow-card-ring)]"
    >
      <div className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-[var(--workspace-text)]">
          Upload document
        </span>
        <p className="text-[12.5px] leading-relaxed text-[var(--workspace-text-secondary)]">
          Saves directly to your Google Drive workspace folder. Choose a
          category and (optionally) a property; the file is routed to the
          matching subfolder. Nothing is sent for AI extraction.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--workspace-text-muted)]">
            File
          </span>
          <input
            type="file"
            name="file"
            required
            disabled={pending}
            accept={acceptMimeTypes.join(",")}
            className="block w-full cursor-pointer rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-xs text-[var(--workspace-text)] file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-[var(--color-primary-soft)] file:px-2.5 file:py-1.5 file:text-xs file:font-semibold file:text-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60"
          />
          <span className="text-[11px] text-[var(--workspace-text-muted)]">
            Max {(maxBytes / (1024 * 1024)).toFixed(0)} MB · PDF, image, Word,
            or Excel.
          </span>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--workspace-text-muted)]">
            Category
          </span>
          <select
            name="category"
            required
            defaultValue="other"
            disabled={pending}
            className="block w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-xs text-[var(--workspace-text)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <span className="text-[11px] text-[var(--workspace-text-muted)]">
            Determines the fallback Drive subfolder if no property is linked.
          </span>
        </label>

        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--workspace-text-muted)]">
            Linked property (optional)
          </span>
          <select
            name="propertySlug"
            defaultValue=""
            disabled={pending}
            className="block w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-xs text-[var(--workspace-text)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="">— No property —</option>
            {properties.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.address}
              </option>
            ))}
          </select>
          <span className="text-[11px] text-[var(--workspace-text-muted)]">
            When set, the file is routed under Properties/{"{address}"}.
          </span>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-md border border-[var(--color-primary)] bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-inverse)] transition-colors hover:bg-[var(--color-primary-hover)] disabled:cursor-progress disabled:opacity-60"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/workspace/icons8-google-drive.svg"
            alt=""
            aria-hidden
            width={14}
            height={14}
          />
          {pending ? "Uploading…" : "Upload to Drive"}
        </button>
        {state ? <UploadStatus state={state} /> : null}
      </div>
    </form>
  );
}

function UploadStatus({
  state,
}: {
  state: NonNullable<UploadDriveDocumentState>;
}) {
  if (state.ok) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-[var(--status-success-border)] bg-[var(--status-success-bg)] px-2 py-0.5 text-[11px] font-semibold text-[var(--status-success)]">
        Uploaded · {state.targetLabel}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-md border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-2 py-0.5 text-[11px] font-semibold text-[var(--status-warning)]">
      {state.message}
    </span>
  );
}
