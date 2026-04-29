import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
  variant?: "panel" | "inline";
};

export function EmptyState({
  title,
  description,
  action,
  variant = "panel",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center gap-3 text-center ${
        variant === "panel"
          ? "rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-soft)] p-[34px]"
          : "py-6"
      }`}
    >
      <h3 className="font-display text-xl text-[var(--color-text)]">{title}</h3>
      <p className="max-w-md text-sm text-[var(--color-text-muted)]">
        {description}
      </p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
