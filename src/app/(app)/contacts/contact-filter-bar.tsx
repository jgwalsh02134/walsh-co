"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { icons } from "@/lib/navigation";
import {
  contactCategoryLabels,
  contactCategoryOrder,
} from "@/lib/contacts";
import type { ContactCategory } from "@prisma/client";

type Counts = Partial<Record<ContactCategory, number>> & {
  __all?: number;
  __favorites?: number;
};

export function ContactFilterBar({
  initialQuery,
  activeCategory,
  favoritesOnly,
  counts,
}: {
  initialQuery: string;
  activeCategory: ContactCategory | null;
  favoritesOnly: boolean;
  counts: Counts;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [query, setQuery] = useState(initialQuery);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  function pushParams(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(search.toString());
    mutate(params);
    params.delete("id");
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    });
  }

  function onQueryChange(value: string) {
    setQuery(value);
    pushParams((p) => {
      if (value.trim()) p.set("q", value.trim());
      else p.delete("q");
    });
  }

  function setCategory(next: ContactCategory | null) {
    pushParams((p) => {
      if (next) p.set("category", next);
      else p.delete("category");
    });
  }

  function toggleFavorites() {
    pushParams((p) => {
      if (favoritesOnly) p.delete("favorite");
      else p.set("favorite", "1");
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex w-full items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm shadow-[var(--shadow-card)] focus-within:border-[var(--color-focus)]">
        <span className="text-[var(--color-text-muted)]">{icons.search}</span>
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search by name, company, role, or notes"
          aria-label="Search contacts"
          className="w-full bg-transparent text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none"
        />
      </label>

      <div role="group" aria-label="Filter by category" className="flex flex-wrap items-center gap-2">
        <FilterChip
          label="All"
          count={counts.__all}
          active={!activeCategory && !favoritesOnly}
          onClick={() => {
            pushParams((p) => {
              p.delete("category");
              p.delete("favorite");
            });
          }}
        />
        <FilterChip
          label="★ Favorites"
          count={counts.__favorites}
          active={favoritesOnly}
          onClick={toggleFavorites}
        />
        {contactCategoryOrder.map((c) => (
          <FilterChip
            key={c}
            label={contactCategoryLabels[c]}
            count={counts[c]}
            active={activeCategory === c}
            onClick={() => setCategory(activeCategory === c ? null : c)}
          />
        ))}
      </div>
    </div>
  );
}

function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-text-inverse)]"
          : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:border-[var(--color-border-strong)]"
      }`}
    >
      <span>{label}</span>
      {typeof count === "number" ? (
        <span
          className={`rounded-full px-1.5 text-[10px] font-semibold tabular-nums ${
            active
              ? "bg-white/20 text-[var(--color-text-inverse)]"
              : "bg-[var(--color-surface-soft)] text-[var(--color-text-muted)]"
          }`}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}
