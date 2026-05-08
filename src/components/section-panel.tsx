import type { ReactNode } from "react";

type SectionPanelProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  padded?: boolean;
};

/**
 * Standard workspace card. Floats on the page background using the
 * shared layered shadow + inset ring tokens so the edge reads cleanly
 * on both warm-cream and white surfaces. The title row uses the strong
 * primary text tier; descriptions use the readable secondary tier (not
 * the pale muted tier).
 */
export function SectionPanel({
  title,
  description,
  action,
  children,
  padded = true,
}: SectionPanelProps) {
  return (
    <section className="rounded-[var(--radius-xl)] bg-[var(--color-surface)] shadow-[var(--shadow-card),var(--shadow-card-ring)]">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[color-mix(in_srgb,var(--color-border)_60%,transparent)] px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-[15px] font-semibold leading-snug text-[var(--workspace-text)]">
            {title}
          </h2>
          {description ? (
            <p className="text-sm leading-relaxed text-[var(--workspace-text-secondary)]">
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </header>
      <div className={padded ? "px-5 py-5 sm:px-6" : ""}>{children}</div>
    </section>
  );
}
