import type { ReactNode } from "react";

type FilterPillProps = {
  label: string;
  active?: boolean;
  count?: number;
  children?: ReactNode;
};

export function FilterPill({ label, active = false, count, children }: FilterPillProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-text-inverse)]"
          : "border-[var(--color-border)] bg-[var(--color-surface-white)] text-[var(--color-text)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-bg-warm)]"
      }`}
    >
      {children}
      {label}
      {typeof count === "number" ? (
        <span
          className={`rounded-full px-1.5 text-xs ${
            active
              ? "bg-[var(--color-text-inverse)]/20 text-[var(--color-text-inverse)]"
              : "bg-[var(--color-bg-warm)] text-[var(--color-text-muted)]"
          }`}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

export function FilterPillRow({ children }: { children: ReactNode }) {
  return (
    <div
      role="group"
      aria-label="Filters"
      className="flex flex-wrap items-center gap-2"
    >
      {children}
    </div>
  );
}
