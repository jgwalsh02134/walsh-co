import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-[var(--color-bg)] px-6">
      <div className="flex max-w-md flex-col gap-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center shadow-[var(--shadow-card)]">
        <span className="self-center rounded-full bg-[var(--color-primary-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">
          404
        </span>
        <h1 className="font-display text-2xl text-[var(--color-text)]">
          Not found
        </h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          That page is not part of the Walsh Co workspace. It may have moved or
          never existed.
        </p>
        <Link
          href="/"
          className="self-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-text-inverse)] transition-colors hover:bg-[var(--color-primary-hover)]"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
