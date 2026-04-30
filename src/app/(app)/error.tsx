"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="mx-auto flex w-full max-w-xl flex-col gap-4 rounded-[var(--radius-lg)] border border-[var(--status-error-border)] bg-[var(--status-error-bg)] p-6 text-[var(--status-error-text)]">
      <h2 className="text-lg font-semibold">Something went wrong on this page.</h2>
      <p className="text-sm">
        {error.message || "An unexpected error occurred. Try again or jump to another page."}
      </p>
      {error.digest ? (
        <code className="rounded-[var(--radius-sm)] bg-[var(--color-surface)] px-2 py-1 text-xs">
          digest: {error.digest}
        </code>
      ) : null}
      <button
        type="button"
        onClick={reset}
        className="self-start rounded-[var(--radius-md)] border border-[var(--status-error-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm font-semibold transition-colors hover:bg-[var(--color-surface-soft)]"
      >
        Try again
      </button>
    </section>
  );
}
