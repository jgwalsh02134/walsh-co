"use client";

import { useState, useTransition } from "react";
import {
  testOpenAIConnection,
  testOpenAIWebSearch,
  type OpenAITestState,
} from "./openai-actions";

export function OpenAITestPanel({ configured }: { configured: boolean }) {
  const [state, setState] = useState<OpenAITestState | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (kind: "normal" | "search") => {
    setState(null);
    startTransition(async () => {
      const result =
        kind === "normal"
          ? await testOpenAIConnection()
          : await testOpenAIWebSearch();
      setState(result);
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-[var(--color-text)]">
            OpenAI
          </span>
          <span className="text-xs text-[var(--color-text-muted)]">
            {configured ? "Configured" : "Not configured"}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending || !configured}
            onClick={() => run("normal")}
            className="inline-flex min-h-[40px] items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm font-medium text-[var(--color-text)] hover:border-[var(--color-border-strong)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Testing..." : "Test OpenAI"}
          </button>
          <button
            type="button"
            disabled={pending || !configured}
            onClick={() => run("search")}
            className="inline-flex min-h-[40px] items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-primary)] bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-[var(--color-text-inverse)] hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Testing..." : "Test Web Search"}
          </button>
        </div>
      </div>

      {state ? (
        <div
          className="rounded-[var(--radius-md)] border px-3 py-2 text-sm"
          style={{
            borderColor: state.ok
              ? "var(--semantic-success-border)"
              : "var(--semantic-error-border)",
            background: state.ok
              ? "var(--semantic-success-bg)"
              : "var(--semantic-error-bg)",
            color: state.ok ? "var(--semantic-success)" : "var(--semantic-error)",
          }}
        >
          <p>{state.message}</p>
          {state.sources && state.sources.length > 0 ? (
            <ul className="mt-2 flex flex-col gap-1 text-xs">
              {state.sources.map((url) => (
                <li key={url} className="break-all">
                  {url}
                </li>
              ))}
            </ul>
          ) : null}
          <p className="mt-2 text-xs opacity-80">
            AI-generated/internal assistance.
          </p>
        </div>
      ) : null}
    </div>
  );
}
