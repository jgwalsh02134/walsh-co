"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { isActiveHref, settingsNav, sidebarNav } from "@/lib/navigation";

export function TopBar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 sm:px-6 lg:px-8">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
          className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)] lg:hidden"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.7} viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <Link href="/" className="flex items-center gap-2 lg:hidden" aria-label="Walsh Co home">
          <span
            aria-hidden
            className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] text-[var(--color-text-inverse)]"
          >
            <span className="font-display text-base font-semibold">W</span>
          </span>
          <span className="font-display text-base text-[var(--color-text)]">Walsh Co</span>
        </Link>
        <div className="hidden items-baseline gap-2 lg:flex">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-faint)]">
            Project
          </span>
          <span className="text-sm font-medium text-[var(--color-text)]">
            322 Osborne Rd
          </span>
        </div>
      </div>

      <span
        aria-label="Account"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-surface-soft)] text-sm font-semibold text-[var(--color-text)]"
      >
        JW
      </span>

      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-[#0F1B17]/40"
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[80vw] flex-col gap-6 border-r border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-6">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] text-[var(--color-text-inverse)]"
                >
                  <span className="font-display text-base font-semibold">W</span>
                </span>
                <span className="font-display text-lg text-[var(--color-text)]">Walsh Co</span>
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-text)]"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
            <nav className="flex flex-col gap-1" aria-label="Sections">
              {sidebarNav.map((item) => {
                const active = isActiveHref(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={close}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium ${
                      active
                        ? "bg-[var(--color-primary)] text-[var(--color-text-inverse)]"
                        : "text-[var(--color-text)] hover:bg-[var(--color-surface-soft)]"
                    }`}
                  >
                    <span className={active ? "text-[var(--color-text-inverse)]" : "text-[var(--color-text-muted)]"}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="mt-auto flex flex-col gap-1">
              {settingsNav.map((item) => {
                const active = isActiveHref(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={close}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium ${
                      active
                        ? "bg-[var(--color-primary)] text-[var(--color-text-inverse)]"
                        : "text-[var(--color-text)] hover:bg-[var(--color-surface-soft)]"
                    }`}
                  >
                    <span className={active ? "text-[var(--color-text-inverse)]" : "text-[var(--color-text-muted)]"}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
