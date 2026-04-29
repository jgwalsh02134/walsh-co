import type { ReactNode } from "react";

type SectionPanelProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  padded?: boolean;
};

export function SectionPanel({
  title,
  description,
  action,
  children,
  padded = true,
}: SectionPanelProps) {
  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-white)] shadow-[var(--shadow-card)]">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--color-border)] px-[21px] py-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold text-[var(--color-text)]">
            {title}
          </h2>
          {description ? (
            <p className="text-sm text-[var(--color-text-muted)]">
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </header>
      <div className={padded ? "px-[21px] py-[21px]" : ""}>{children}</div>
    </section>
  );
}
