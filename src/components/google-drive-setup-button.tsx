"use client";

/**
 * Client button that triggers the workspace Drive folder setup server
 * action. Visual states mirror the Gmail draft button so the two
 * Google-backed actions feel like siblings:
 *
 *   - idle / pending / success / error / needsConnect / needsScope
 *
 * The button is rendered disabled when the parent computes that Drive
 * is not ready (env missing, not connected, or scope missing); a
 * Connect/Reconnect link is shown alongside the disabled state.
 *
 * Tokens never reach this component. The parent passes only:
 *   - `ready` (can the action be run right now?)
 *   - `connectHref` (where the OAuth start link points)
 *   - `disabledReason` (copy shown when not ready)
 */
import { useActionState } from "react";
import {
  createDriveWorkspaceFoldersAction,
  type CreateDriveWorkspaceState,
} from "@/lib/google-drive-actions";

export type GoogleDriveSetupButtonProps = {
  /** True only when Drive is configured AND Google is connected AND
   *  the session has the drive.file scope. */
  ready: boolean;
  /** OAuth start URL with a returnTo back to the page hosting the button. */
  connectHref: string;
  /** When not ready, the parent supplies a one-line explanation. */
  disabledReason: string;
  /** Whether the workspace already has a stored root folder. Drives the
   *  button label between "Create workspace folder" and "Verify / repair
   *  workspace folder". */
  alreadyCreated: boolean;
};

export function GoogleDriveSetupButton({
  ready,
  connectHref,
  disabledReason,
  alreadyCreated,
}: GoogleDriveSetupButtonProps) {
  const [state, action, pending] = useActionState<
    CreateDriveWorkspaceState,
    FormData
  >(createDriveWorkspaceFoldersAction, null);

  if (!ready) {
    return (
      <div className="flex flex-col gap-2">
        <span
          aria-disabled
          title={disabledReason}
          className="inline-flex min-h-[36px] cursor-not-allowed items-center gap-1.5 self-start rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--workspace-text-muted)]"
        >
          <DriveIcon />
          Create workspace folder
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-[var(--workspace-text-muted)]">
            {disabledReason}
          </span>
          <a
            href={connectHref}
            className="inline-flex min-h-[28px] items-center gap-1.5 rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--workspace-text)] transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)]"
          >
            <DriveIcon size={12} />
            Connect Google
          </a>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-2">
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-[36px] items-center gap-1.5 self-start rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--workspace-text)] transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)] disabled:cursor-progress disabled:opacity-60"
      >
        <DriveIcon />
        {pending
          ? "Creating…"
          : alreadyCreated
          ? "Verify / repair workspace folder"
          : "Create workspace folder"}
      </button>
      {state ? <DriveResult state={state} connectHref={connectHref} /> : null}
    </form>
  );
}

function DriveResult({
  state,
  connectHref,
}: {
  state: NonNullable<CreateDriveWorkspaceState>;
  connectHref: string;
}) {
  if (state.ok) {
    const { created, reused } = state.summary;
    // Open Drive folder link is rendered once at the Drive card level
    // (always visible whenever stored folders exist). The button result
    // panel only shows the success chip so there's a single primary
    // "Open Drive folder" affordance.
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-[var(--status-success-border)] bg-[var(--status-success-bg)] px-2 py-0.5 text-[11px] font-semibold text-[var(--status-success)]">
          <DriveIcon size={12} />
          {created === 0
            ? "Up to date · all folders reused"
            : `Created ${created} · reused ${reused}`}
        </span>
      </div>
    );
  }

  if (state.needsConnect || state.needsScope) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center rounded-md border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-2 py-0.5 text-[11px] font-semibold text-[var(--status-warning)]">
          {state.needsScope
            ? "Google permission needed: Drive file."
            : state.message}
        </span>
        <a
          href={connectHref}
          className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2 py-0.5 text-[11px] font-semibold text-[var(--workspace-text)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
        >
          <DriveIcon size={12} />
          Reconnect Google
        </a>
      </div>
    );
  }

  return (
    <span className="inline-flex items-center rounded-md border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-2 py-0.5 text-[11px] font-semibold text-[var(--status-warning)]">
      {state.message}
    </span>
  );
}

function DriveIcon({ size = 14 }: { size?: number }) {
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src="/icons/workspace/icons8-google-drive.svg"
      alt=""
      aria-hidden
      width={size}
      height={size}
      className="inline-block shrink-0"
    />
  );
}
