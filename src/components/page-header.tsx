import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  display?: boolean;
};

/**
 * Standard page header used on every workspace route. Display variant
 * uses the Adobe display face for landing-style hero pages; the default
 * variant uses the body face at h1 weight for normal pages. Description
 * sits on the readable secondary text tier — not the pale muted tier.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  primaryAction,
  secondaryAction,
  display = false,
}: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-2">
        {eyebrow ? (
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--workspace-text-secondary)]">
            {eyebrow}
          </span>
        ) : null}
        <h1
          className={`tracking-tight text-[var(--workspace-text)] ${
            display
              ? "font-display text-3xl font-semibold leading-tight sm:text-4xl"
              : "text-2xl font-semibold leading-tight sm:text-3xl"
          }`}
        >
          {title}
        </h1>
        {description ? (
          <p className="max-w-2xl text-sm leading-relaxed text-[var(--workspace-text-secondary)] sm:text-base">
            {description}
          </p>
        ) : null}
      </div>
      {primaryAction || secondaryAction ? (
        <div className="flex flex-wrap items-center gap-2">
          {secondaryAction}
          {primaryAction}
        </div>
      ) : null}
    </header>
  );
}
