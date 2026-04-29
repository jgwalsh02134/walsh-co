type SearchBarProps = {
  placeholder?: string;
  defaultValue?: string;
  ariaLabel?: string;
};

export function SearchBar({
  placeholder = "Search…",
  defaultValue,
  ariaLabel = "Search",
}: SearchBarProps) {
  return (
    <label className="flex w-full items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm shadow-[var(--shadow-card)] focus-within:border-[var(--color-focus)] focus-within:ring-2 focus-within:ring-[var(--color-focus)]/30">
      <svg
        className="h-4 w-4 text-[var(--color-text-muted)]"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
        aria-hidden
      >
        <circle cx="11" cy="11" r="7" />
        <path strokeLinecap="round" d="m20 20-3.5-3.5" />
      </svg>
      <input
        type="search"
        defaultValue={defaultValue}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="w-full bg-transparent text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none"
      />
    </label>
  );
}
