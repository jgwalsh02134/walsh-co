import type { ReactNode } from "react";

/**
 * Shared layout for an integration / provider row on the Settings page.
 *
 * Renders an icon-in-soft-squircle on the left, a title / description /
 * optional model line in the middle, a status pill on the right, and an
 * optional `children` slot below for in-place actions (test buttons,
 * Connect link, etc.). Surface visuals are aligned with
 * `gmail-integration-card.tsx` so every provider row reads as part of
 * the same dashboard.
 *
 * This component is presentational only — every status value is
 * computed server-side by the page before being passed in. No secret
 * values are ever rendered; only "Configured" / "Connected" / etc.
 */
export type IntegrationStatus =
  | "configured"
  | "connected"
  | "not_connected"
  | "not_configured";

export type IntegrationRowProps = {
  iconSrc: string;
  /** Title displayed next to the icon (e.g. "OpenAI", "Gmail drafts"). */
  title: string;
  /** Optional plain-language description shown under the title. */
  description?: ReactNode;
  /** Optional model / detail line (e.g. "Model: grok-4.3"). */
  detail?: ReactNode;
  status: IntegrationStatus;
  /** Slot for in-row actions like test buttons or a Connect link. */
  actions?: ReactNode;
  /** Slot for additional content beneath the row (test results, etc.). */
  children?: ReactNode;
};

const STATUS_META: Record<
  IntegrationStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  configured: {
    label: "Configured",
    bg: "var(--status-success-bg)",
    text: "var(--status-success-text)",
    border: "var(--status-success-border)",
  },
  connected: {
    label: "Connected",
    bg: "var(--status-success-bg)",
    text: "var(--status-success-text)",
    border: "var(--status-success-border)",
  },
  not_connected: {
    label: "Not connected",
    bg: "var(--status-warning-bg)",
    text: "var(--status-warning-text)",
    border: "var(--status-warning-border)",
  },
  not_configured: {
    label: "Not configured",
    bg: "var(--status-neutral-bg)",
    text: "var(--status-neutral-text)",
    border: "var(--status-neutral-border)",
  },
};

export function IntegrationRow({
  iconSrc,
  title,
  description,
  detail,
  status,
  actions,
  children,
}: IntegrationRowProps) {
  const meta = STATUS_META[status];
  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-md)] bg-[var(--color-surface-soft)] p-4 shadow-[var(--shadow-card-ring)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[var(--color-surface)] shadow-[var(--shadow-card-ring)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={iconSrc} alt="" aria-hidden width={20} height={20} />
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display text-sm font-semibold text-[var(--workspace-text)]">
              {title}
            </span>
            <span
              className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold"
              style={{
                background: meta.bg,
                color: meta.text,
                borderColor: meta.border,
              }}
            >
              {meta.label}
            </span>
          </div>
          {description ? (
            <p className="text-[12.5px] leading-relaxed text-[var(--workspace-text-secondary)]">
              {description}
            </p>
          ) : null}
          {detail ? (
            <p className="text-[11px] text-[var(--workspace-text-muted)]">
              {detail}
            </p>
          ) : null}
        </div>

        {actions ? (
          <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
            {actions}
          </div>
        ) : null}
      </div>

      {children}
    </div>
  );
}
