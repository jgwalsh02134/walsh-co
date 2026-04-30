"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { sidebarNav, settingsNav } from "@/lib/navigation";

type Command = {
  id: string;
  label: string;
  hint?: string;
  href: string;
};

const navCommands: Command[] = [...sidebarNav, ...settingsNav].map((item) => ({
  id: item.href,
  label: item.label,
  hint: "Navigate",
  href: item.href,
}));

type Listener = (next: boolean) => void;
const listeners = new Set<Listener>();

export function openCommandPalette() {
  listeners.forEach((l) => l(true));
}

export function toggleCommandPalette() {
  listeners.forEach((l) => l(false));
}

function fuzzyMatch(haystack: string, needle: string): boolean {
  if (!needle) return true;
  const h = haystack.toLowerCase();
  const n = needle.toLowerCase();
  let i = 0;
  for (const ch of h) {
    if (ch === n[i]) i++;
    if (i === n.length) return true;
  }
  return false;
}

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [rawActive, setRawActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return navCommands;
    return navCommands.filter((c) => fuzzyMatch(c.label, q));
  }, [query]);

  const activeIndex = filtered.length === 0 ? 0 : Math.min(rawActive, filtered.length - 1);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setRawActive(0);
  }, []);

  const run = useCallback(
    (command: Command) => {
      router.push(command.href);
      close();
    },
    [router, close],
  );

  useEffect(() => {
    const listener: Listener = (forceOpen) => {
      setOpen((prev) => (forceOpen ? true : !prev));
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      } else if (e.key === "Escape") {
        setOpen((prev) => {
          if (prev) {
            setQuery("");
            setRawActive(0);
            return false;
          }
          return prev;
        });
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[10vh]"
    >
      <button
        type="button"
        aria-label="Close command palette"
        onClick={close}
        className="absolute inset-0 bg-[#0F1B17]/40"
      />
      <div className="relative w-full max-w-xl rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card-hover)]">
        <label className="flex items-center gap-3 border-b border-[var(--color-border)] px-4 py-3">
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
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setRawActive((i) => Math.min(filtered.length - 1, i + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setRawActive((i) => Math.max(0, i - 1));
              } else if (e.key === "Enter") {
                e.preventDefault();
                const command = filtered[activeIndex];
                if (command) run(command);
              }
            }}
            placeholder="Jump to a page…"
            aria-label="Command palette search"
            aria-controls="command-palette-list"
            className="w-full bg-transparent text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none"
          />
          <kbd className="hidden rounded border border-[var(--color-border)] bg-[var(--color-surface-soft)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-text-muted)] sm:inline-flex">
            Esc
          </kbd>
        </label>

        <ul id="command-palette-list" className="max-h-80 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-[var(--color-text-muted)]">
              No matches.
            </li>
          ) : (
            filtered.map((command, index) => (
              <li key={command.id}>
                <button
                  type="button"
                  onClick={() => run(command)}
                  onMouseEnter={() => setRawActive(index)}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm transition-colors ${
                    index === activeIndex
                      ? "bg-[var(--color-primary-soft)] text-[var(--color-text)]"
                      : "text-[var(--color-text)] hover:bg-[var(--color-surface-soft)]"
                  }`}
                >
                  <span className="font-medium">{command.label}</span>
                  {command.hint ? (
                    <span className="text-xs text-[var(--color-text-faint)]">
                      {command.hint}
                    </span>
                  ) : null}
                </button>
              </li>
            ))
          )}
        </ul>

        <footer className="flex items-center justify-between gap-2 border-t border-[var(--color-border)] px-4 py-2 text-[11px] text-[var(--color-text-faint)]">
          <span>↑↓ to navigate · ↵ to open</span>
          <span>⌘K to toggle</span>
        </footer>
      </div>
    </div>
  );
}
