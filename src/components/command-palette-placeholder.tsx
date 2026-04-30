"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef } from "react";
import { landingCards } from "@/lib/navigation";

export function CommandPalettePlaceholder() {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const open = useCallback(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const close = useCallback(() => {
    const dialog = dialogRef.current;
    if (dialog?.open) dialog.close();
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const isShortcut =
        (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (!isShortcut) return;
      event.preventDefault();
      if (dialogRef.current?.open) close();
      else open();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, close]);

  const onBackdropClick = (event: React.MouseEvent<HTMLDialogElement>) => {
    if (event.target === dialogRef.current) close();
  };

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-haspopup="dialog"
        aria-label="Open command palette"
        className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-glass)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-muted)] backdrop-blur transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]"
      >
        <kbd className="inline-flex h-5 items-center gap-0.5 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 font-mono text-[10px] font-semibold text-[var(--color-text-muted)]">
          <span aria-hidden>⌘</span>K
        </kbd>
        <span>Search workspace</span>
      </button>

      <dialog
        ref={dialogRef}
        onClick={onBackdropClick}
        aria-label="Command palette"
        className="command-palette m-0 mx-auto w-[calc(100vw-32px)] max-w-[520px] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-0 text-[var(--color-text)] shadow-[var(--shadow-card-hover)] backdrop:backdrop-blur-sm"
      >
        <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface-soft)] px-4 py-3">
          <div className="flex items-center gap-2">
            <svg
              className="h-4 w-4 text-[var(--color-text-muted)]"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.7}
              viewBox="0 0 24 24"
              aria-hidden
            >
              <circle cx="11" cy="11" r="7" />
              <path strokeLinecap="round" d="m20 20-3.5-3.5" />
            </svg>
            <span className="text-sm font-semibold">Search workspace</span>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-warm)] hover:text-[var(--color-text)]"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <p className="px-4 py-3 text-xs text-[var(--color-text-muted)]">
          Workspace search is being set up. In the meantime, jump to a section:
        </p>

        <nav aria-label="Jump to section">
          <ul className="max-h-[50vh] overflow-y-auto px-2 pb-3">
            {landingCards.map((card) => (
              <li key={card.href}>
                <Link
                  href={card.href}
                  onClick={close}
                  className="flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm transition-colors hover:bg-[var(--color-primary-soft)] focus-visible:bg-[var(--color-primary-soft)]"
                >
                  <span
                    aria-hidden
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-surface-soft)] text-[var(--color-text-muted)]"
                  >
                    {card.icon}
                  </span>
                  <span className="flex flex-1 flex-col gap-0.5">
                    <span className="font-medium text-[var(--color-text)]">
                      {card.label}
                    </span>
                    <span className="text-xs text-[var(--color-text-muted)]">
                      {card.description}
                    </span>
                  </span>
                  <svg
                    className="h-4 w-4 shrink-0 text-[var(--color-text-faint)]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <path strokeLinecap="round" d="M9 6l6 6-6 6" />
                  </svg>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center justify-between gap-3 border-t border-[var(--color-border)] bg-[var(--color-surface-soft)] px-4 py-2 text-[11px] text-[var(--color-text-faint)]">
          <span>Press Esc to close</span>
          <kbd className="inline-flex h-5 items-center gap-0.5 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 font-mono text-[10px] font-semibold">
            <span aria-hidden>⌘</span>K
          </kbd>
        </div>
      </dialog>
    </>
  );
}
