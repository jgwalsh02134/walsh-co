"use client";

/**
 * Portfolio-level AI analysis panel.
 *
 * Replaces the previous <details>-based ai-market-note-panel. Renders a
 * normal card with two visible buttons that call the existing server-only
 * OpenAI helpers via market-note-actions. No provider refresh, no DB
 * writes, no autonomous behavior.
 */

import { useState, useTransition } from "react";
import {
  generateMarketNote,
  generateMarketNoteWithWebSearch,
  type MarketNoteInput,
  type MarketNoteState,
} from "../market-note-actions";
import { AiResponseCard } from "./ai-response-card";

export function AiMarketAnalysisPanel({
  input,
  webSearchAvailable = true,
}: {
  input: MarketNoteInput;
  webSearchAvailable?: boolean;
}) {
  const [state, setState] = useState<MarketNoteState | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (webSearch: boolean) => {
    setState(null);
    startTransition(async () => {
      const result = webSearch
        ? await generateMarketNoteWithWebSearch(input)
        : await generateMarketNote(input);
      setState(result);
    });
  };

  return (
    <section
      aria-labelledby="ai-market-analysis-heading"
      className="flex flex-col border border-[var(--market-border)] bg-[var(--market-surface)]"
    >
      <header className="flex flex-col gap-1 border-b border-[var(--market-border)] px-4 py-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2
            id="ai-market-analysis-heading"
            className="font-display text-base font-semibold text-[var(--market-text)]"
          >
            AI Analysis
          </h2>
          <span className="text-[11px] text-[var(--market-text-muted)]">
            Server-only · non-autonomous
          </span>
        </div>
        <p className="text-xs text-[var(--market-text-secondary)]">
          Summarizes the data already loaded on this page. Does not refresh
          providers or update the database.
        </p>
      </header>

      <div className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => run(false)}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center border border-[var(--market-blue)] bg-[var(--market-blue)] px-3 py-2 text-sm font-semibold text-[var(--market-text)] transition hover:bg-[var(--market-cyan)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--market-cyan)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Generating…" : "Generate portfolio analysis"}
          </button>
          {webSearchAvailable ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(true)}
              className="inline-flex min-h-[44px] items-center justify-center border border-[var(--market-border-strong)] bg-transparent px-3 py-2 text-sm font-semibold text-[var(--market-text-secondary)] transition hover:border-[var(--market-cyan)] hover:text-[var(--market-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--market-cyan)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "…" : "Generate with web search"}
            </button>
          ) : null}
        </div>

        {state ? (
          <AiResponseCard state={state} />
        ) : (
          <p className="text-xs text-[var(--market-text-muted)]">
            Output appears here. Includes market value summary, rent summary,
            source confidence, attention items, suggested next checks, and
            caveats.
          </p>
        )}
      </div>
    </section>
  );
}
