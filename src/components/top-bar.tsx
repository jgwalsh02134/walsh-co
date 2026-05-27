"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import {
  icons,
  isActiveHref,
  productName,
  settingsNav,
  sidebarNav,
} from "@/lib/navigation";
import { WorkspaceAiDrawer } from "./workspace-ai-drawer";

export function TopBar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);
  const openAi = () => setAiOpen(true);
  const closeAi = () => setAiOpen(false);

  // Keyboard shortcut: Cmd/Ctrl + K opens AI drawer
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setAiOpen(true);
      }
      if (e.key === "Escape") {
        if (aiOpen) setAiOpen(false);
        if (menuOpen) setMenuOpen(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [aiOpen, menuOpen]);

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 sm:px-6 lg:px-8">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          aria-expanded={menuOpen}
          className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)] lg:hidden"
        >
          {icons.menu}
        </button>
        <Link
          href="/"
          className="flex items-center gap-2 lg:hidden"
          aria-label={`${productName} home`}
        >
          <span
            aria-hidden
            className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] text-[var(--color-text-inverse)]"
          >
            <span className="font-display text-base font-semibold">W</span>
          </span>
          <span className="font-display text-base text-[var(--color-text)]">
            {productName}
          </span>
        </Link>
        <div className="hidden items-baseline gap-2 lg:flex">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-faint)]">
            Workspace
          </span>
          <span className="text-sm font-medium text-[var(--color-text)]">
            {productName}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Global AI Assistant Trigger */}
        <button
          onClick={openAi}
          className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-sm font-medium text-[var(--color-text)] transition-colors hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-soft)]"
          aria-label="Open Workspace AI (⌘K)"
          title="Open Workspace AI (⌘K)"
        >
          <Sparkles className="h-4 w-4 text-[var(--color-primary)]" />
          <span className="hidden sm:inline text-xs font-semibold">Ask AI</span>
        </button>

        <span
          aria-label="Account"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-surface-soft)] text-sm font-semibold text-[var(--color-text)]"
        >
          JW
        </span>
      </div>

      <WorkspaceAiDrawer open={aiOpen} onClose={closeAi} />

      {menuOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button
            type="button"
            aria-label="Close menu"
            onClick={closeMenu}
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
                <span className="font-display text-lg text-[var(--color-text)]">
                  {productName}
                </span>
              </Link>
              <button
                type="button"
                onClick={closeMenu}
                aria-label="Close menu"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-text)]"
              >
                {icons.close}
              </button>
            </div>
            <nav className="flex flex-col gap-1" aria-label="Sections">
              {/* Workspace AI - available everywhere */}
              <button
                onClick={() => {
                  closeMenu();
                  openAi();
                }}
                className="flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-left text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-soft)]"
              >
                <Sparkles className="h-4 w-4 text-[var(--color-primary)]" />
                <span>Ask AI (⌘K)</span>
              </button>

              {sidebarNav.map((item) => {
                const active = isActiveHref(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMenu}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                      active
                        ? "bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
                        : "text-[var(--color-text)] hover:bg-[var(--color-surface-soft)]"
                    }`}
                  >
                    <span className={active ? "text-[var(--color-primary)]" : "text-[var(--color-text-muted)]"}>
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
                    onClick={closeMenu}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                      active
                        ? "bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
                        : "text-[var(--color-text)] hover:bg-[var(--color-surface-soft)]"
                    }`}
                  >
                    <span className={active ? "text-[var(--color-primary)]" : "text-[var(--color-text-muted)]"}>
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
