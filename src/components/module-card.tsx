import Link from "next/link";
import type { ReactNode } from "react";

type ModuleCardProps = {
  title: string;
  description?: string;
  href?: string;
  icon?: ReactNode;
  badge?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
};

function CardChrome({ title, description, icon, badge, footer, children }: Omit<ModuleCardProps, "href">) {
  return (
    <div className="flex h-full flex-col gap-3 p-[21px]">
      <div className="flex items-start justify-between gap-3">
        {icon ? (
          <span className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
            {icon}
          </span>
        ) : null}
        {badge ? <div className="shrink-0">{badge}</div> : null}
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-semibold text-[var(--color-text)]">
          {title}
        </h3>
        {description ? (
          <p className="text-sm leading-6 text-[var(--color-text-muted)]">
            {description}
          </p>
        ) : null}
      </div>
      {children}
      {footer ? <div className="mt-auto pt-2">{footer}</div> : null}
    </div>
  );
}

export function ModuleCard(props: ModuleCardProps) {
  const baseClasses =
    "block h-full rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-white)] shadow-[var(--shadow-card)] transition-all";

  if (props.href) {
    return (
      <Link
        href={props.href}
        className={`${baseClasses} group hover:-translate-y-0.5 hover:border-[var(--color-border-strong)] hover:shadow-[var(--shadow-card-hover)]`}
      >
        <CardChrome {...props} />
      </Link>
    );
  }
  return (
    <div className={baseClasses}>
      <CardChrome {...props} />
    </div>
  );
}
