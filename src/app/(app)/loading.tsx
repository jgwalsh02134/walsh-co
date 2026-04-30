export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="h-3 w-24 animate-pulse rounded bg-[var(--color-surface-soft)]" />
        <div className="h-7 w-64 animate-pulse rounded bg-[var(--color-surface-soft)]" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded bg-[var(--color-surface-soft)]" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]"
          />
        ))}
      </div>
    </div>
  );
}
