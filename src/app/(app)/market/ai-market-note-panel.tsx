"use client";

import { useState, useTransition } from "react";
import {
  generateMarketNote,
  generateMarketNoteWithWebSearch,
  type MarketNoteInput,
  type MarketNoteState,
} from "./market-note-actions";

export function AIMarketNotePanel({ input }: { input: MarketNoteInput }) {
  const [state, setState] = useState<MarketNoteState | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (withWebSearch: boolean) => {
    setState(null);
    startTransition(async () => {
      const result = withWebSearch
        ? await generateMarketNoteWithWebSearch(input)
        : await generateMarketNote(input);
      setState(result);
    });
  };

  return (
    <details className="border border-[var(--market-border)] bg-[var(--market-surface)]">
      <summary className="flex min-h-[44px] cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-3 py-2 text-sm text-[var(--market-text)] [&::-webkit-details-marker]:hidden">
        <span className="font-display font-semibold">AI market note</span>
        <span className="text-xs text-[var(--market-text-muted)]">
          Non-autonomous internal draft
        </span>
      </summary>
      <div className="flex flex-col gap-3 border-t border-[var(--market-border)] p-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => run(false)}
            className="inline-flex min-h-[44px] items-center justify-center border border-[var(--market-blue)] bg-[var(--market-blue)] px-3 py-2 text-xs font-semibold text-[var(--market-text)] hover:bg-[var(--market-cyan)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Generating..." : "Generate AI market note"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(true)}
            className="inline-flex min-h-[44px] items-center justify-center border border-[var(--market-border-strong)] bg-transparent px-3 py-2 text-xs font-medium text-[var(--market-text-secondary)] hover:border-[var(--market-cyan)] hover:text-[var(--market-text)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Generating..." : "Generate with web context"}
          </button>
        </div>

        {state ? (
          <div className="border border-[var(--market-border)] bg-[var(--market-surface-raised)] p-3">
            <p className="whitespace-pre-wrap text-sm leading-6 text-[var(--market-text-secondary)]">
              {state.message}
            </p>
            {state.sources && state.sources.length > 0 ? (
              <div className="mt-3 border-t border-[var(--market-border)] pt-2">
                <span className="text-xs text-[var(--market-text-muted)]">
                  Sources
                </span>
                <ul className="mt-1 flex flex-col gap-1 text-xs text-[var(--market-text-secondary)]">
                  {state.sources.map((source) => (
                    <li key={source} className="break-all font-data">
                      {source}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <p className="mt-3 text-xs text-[var(--market-amber)]">
              AI-generated internal draft. Verify before relying.
            </p>
          </div>
        ) : (
          <p className="text-xs text-[var(--market-text-muted)]">
            Generates a short note from the market data already loaded on this
            page. It does not refresh providers or write to the database.
          </p>
        )}
      </div>
    </details>
  );
}
