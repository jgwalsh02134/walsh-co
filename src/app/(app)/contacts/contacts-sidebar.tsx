"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { ContactCategory } from "@prisma/client";
import { type AvatarIconKey } from "@/lib/contact-format";
import {
  contactCategoryLabels,
  contactCategoryOrder,
} from "@/lib/contacts";
import { icons } from "@/lib/navigation";
import { ICON_COMPONENTS } from "./contact-avatar";

type Counts = Partial<Record<ContactCategory, number>> & {
  __all?: number;
  __favorites?: number;
  __recent?: number;
};

const CATEGORY_ICONS: Record<ContactCategory, AvatarIconKey> = {
  CONTRACTORS_TRADES: "hardhat",
  LEGAL: "scale",
  INSURANCE: "clipboard-check",
  MUNICIPAL: "landmark",
  UTILITIES: "utility-pole",
  FINANCE_ACCOUNTING: "circle-dollar",
  REAL_ESTATE_LEASING: "house",
  PROPERTY_MANAGEMENT: "key-round",
  TENANTS_OCCUPANTS: "user",
  SUPPLIERS: "truck",
  INSPECTORS_TESTING: "search-check",
  OTHER: "briefcase",
};

type Mode = "all" | "favorites" | "recent";

export function ContactsSidebar({
  initialQuery,
  activeCategory,
  mode,
  counts,
}: {
  initialQuery: string;
  activeCategory: ContactCategory | null;
  mode: Mode;
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

  function pushParams(mutate: (p: URLSearchParams) => void) {
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

  function setMode(next: Mode) {
    pushParams((p) => {
      p.delete("favorite");
      p.delete("recent");
      if (next === "favorites") p.set("favorite", "1");
      if (next === "recent") p.set("recent", "1");
    });
  }

  function setCategory(next: ContactCategory | null) {
    pushParams((p) => {
      if (next) p.set("category", next);
      else p.delete("category");
    });
  }

  return (
    <aside className="flex flex-col gap-4">
      <label className="flex w-full items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm shadow-[var(--shadow-card)] focus-within:border-[var(--color-focus)]">
        <span className="text-[var(--color-text-muted)]">{icons.search}</span>
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search contacts"
          aria-label="Search contacts"
          className="w-full bg-transparent text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none"
        />
      </label>

      <div
        role="tablist"
        aria-label="Contact view"
        className="grid grid-cols-3 gap-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-1"
      >
        <SegmentTab
          label="All"
          count={counts.__all}
          active={mode === "all"}
          onClick={() => setMode("all")}
        />
        <SegmentTab
          label="Favorites"
          count={counts.__favorites}
          active={mode === "favorites"}
          onClick={() => setMode("favorites")}
        />
        <SegmentTab
          label="Recent"
          count={counts.__recent}
          active={mode === "recent"}
          onClick={() => setMode("recent")}
        />
      </div>

      <nav aria-label="Categories" className="flex flex-col">
        <div className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          Categories
        </div>
        <ul className="flex flex-col rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]">
          <CategoryRow
            label="All categories"
            iconKey="briefcase"
            count={counts.__all}
            active={activeCategory === null}
            onClick={() => setCategory(null)}
          />
          {contactCategoryOrder.map((cat) => (
            <CategoryRow
              key={cat}
              label={contactCategoryLabels[cat]}
              iconKey={CATEGORY_ICONS[cat]}
              count={counts[cat]}
              active={activeCategory === cat}
              onClick={() => setCategory(activeCategory === cat ? null : cat)}
            />
          ))}
        </ul>
      </nav>
    </aside>
  );
}

function SegmentTab({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number | undefined;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-[var(--radius-sm)] px-2 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] ${
        active
          ? "bg-[var(--color-surface)] text-[var(--color-text)] shadow-[var(--shadow-card)]"
          : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
      }`}
    >
      <span>{label}</span>
      {typeof count === "number" ? (
        <span
          className={`min-w-[1.25rem] rounded-full px-1.5 py-px text-center text-[10px] font-semibold tabular-nums ${
            active
              ? "bg-[var(--color-primary)] text-[var(--color-text-inverse)]"
              : "bg-[var(--color-border)] text-[var(--color-text-muted)]"
          }`}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

function CategoryRow({
  label,
  iconKey,
  count,
  active,
  onClick,
}: {
  label: string;
  iconKey: AvatarIconKey;
  count: number | undefined;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = ICON_COMPONENTS[iconKey];
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={`flex w-full min-h-[44px] items-center gap-3 border-b border-[var(--color-border)] px-3 py-2 text-left text-sm transition-colors last:border-b-0 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-focus)] ${
          active
            ? "bg-[var(--color-primary)] text-[var(--color-text-inverse)]"
            : "text-[var(--color-text)] hover:bg-[var(--color-surface-soft)]"
        }`}
      >
        <span
          className={`inline-flex h-6 w-6 shrink-0 items-center justify-center ${
            active
              ? "text-[var(--color-text-inverse)]"
              : "text-[var(--color-text-muted)]"
          }`}
        >
          <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
        </span>
        <span className="flex-1 truncate font-medium">{label}</span>
        {typeof count === "number" ? (
          <span
            className={`min-w-[1.5rem] rounded-full px-2 py-0.5 text-right text-[11px] font-semibold tabular-nums ${
              active
                ? "bg-[var(--color-text-inverse)] text-[var(--color-primary)]"
                : "bg-[var(--color-surface-soft)] text-[var(--color-text-muted)]"
            }`}
          >
            {count}
          </span>
        ) : null}
      </button>
    </li>
  );
}
