import Link from "next/link";
import type { ReactNode } from "react";

type ActionCardProps = {
  title: string;
  description: string;
  href: string;
  cta?: string;
  emphasis?: boolean;
  meta?: ReactNode;
};

export function ActionCard({
  title,
  description,
  href,
  cta = "Open",
  emphasis = false,
  meta,
}: ActionCardProps) {
  return (
    <Link
      href={href}
      className={`group flex h-full flex-col gap-3 rounded-[var(--radius-lg)] border p-[21px] shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)] ${
        emphasis
          ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]"
          : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border-strong)]"
      }`}
    >
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-semibold text-[var(--color-text)]">{title}</h3>
        <p className="text-sm leading-6 text-[var(--color-text-muted)]">{description}</p>
      </div>
      {meta ? <div className="text-xs text-[var(--color-text-muted)]">{meta}</div> : null}
      <span
        className={`mt-auto inline-flex items-center gap-1 text-sm font-semibold ${
          emphasis ? "text-[var(--color-primary)]" : "text-[var(--color-text)]"
        }`}
      >
        {cta}
        <svg
          className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 5l7 7-7 7" />
        </svg>
      </span>
    </Link>
  );
}
