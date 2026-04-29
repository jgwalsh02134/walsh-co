import Link from "next/link";

export function TopBar() {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface-white)]/90 px-4 py-3 backdrop-blur sm:px-6 lg:px-[34px]">
      <Link href="/" className="flex items-center gap-2 lg:hidden" aria-label="Walsh Co home">
        <span
          aria-hidden
          className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] text-[var(--color-text-inverse)]"
        >
          <span className="font-display text-base font-semibold">W</span>
        </span>
        <span className="font-display text-base text-[var(--color-text)]">Walsh Co</span>
      </Link>

      <div className="hidden items-center gap-2 lg:flex">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-faint)]">
          Workspace
        </span>
        <span className="text-sm font-medium text-[var(--color-text)]">
          Generic Placeholder
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Notifications"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-white)] text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.7}
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14V11a6 6 0 1 0-12 0v3a2 2 0 0 1-.6 1.6L4 17h5" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a3 3 0 0 0 6 0" />
          </svg>
          <span
            className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full"
            style={{ background: "var(--color-pruyn-brick)" }}
            aria-hidden
          />
        </button>
        <span
          aria-label="Account"
          className="hidden h-9 w-9 items-center justify-center rounded-full bg-[var(--color-bg-warm)] text-sm font-semibold text-[var(--color-text)] sm:inline-flex"
        >
          JW
        </span>
      </div>
    </header>
  );
}
