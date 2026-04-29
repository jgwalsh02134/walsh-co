import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  display?: boolean;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  primaryAction,
  secondaryAction,
  display = false,
}: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-[13px] sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-1.5">
        {eyebrow ? (
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            {eyebrow}
          </span>
        ) : null}
        <h1
          className={`text-[var(--color-text)] ${
            display
              ? "font-display text-3xl leading-tight sm:text-4xl"
              : "text-2xl font-semibold sm:text-3xl"
          }`}
        >
          {title}
        </h1>
        {description ? (
          <p className="max-w-2xl text-sm text-[var(--color-text-muted)] sm:text-base">
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
