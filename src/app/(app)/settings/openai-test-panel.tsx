"use client";

import { useState, useTransition } from "react";
import {
  testOpenAIConnection,
  testOpenAIWebSearch,
  type OpenAITestState,
} from "./openai-actions";

/**
 * Client-side test buttons + result panel for the OpenAI integration.
 *
 * Renders only the actionable surface (buttons + result). The provider
 * row chrome (icon, title, status pill, model line) lives in the
 * Settings page via `IntegrationRow` so every integration shares the
 * same visual frame. Test actions are user-click initiated and call
 * existing server actions; this component never reads secrets directly.
 */
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
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending || !configured}
          onClick={() => run("normal")}
          className="inline-flex min-h-[36px] items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--workspace-text)] transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Testing…" : "Test OpenAI"}
        </button>
        <button
          type="button"
          disabled={pending || !configured}
          onClick={() => run("search")}
          className="inline-flex min-h-[36px] items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-primary)] bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-inverse)] hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Testing…" : "Test web search"}
        </button>
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
