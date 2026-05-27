"use client";

import { useState, useTransition } from "react";
import { X, Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";

import { AiProviderSegmented } from "./ai-provider-segmented";
import type { AiProviderName } from "@/lib/ai";
import { getAiProvider } from "@/lib/ai";

/**
 * Global Workspace AI Drawer
 *
 * A workspace-wide AI assistant that can be triggered from anywhere.
 * Currently supports:
 * - Provider selection (OpenAI / Grok)
 * - Basic question answering with optional web research
 * - Automatic page context (current route)
 *
 * Future: richer context (current property, open document, portfolio snapshot, etc.)
 */
export function WorkspaceAiDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const [provider, setProvider] = useState<AiProviderName>("openai");
  const [mode, setMode] = useState<"internal" | "web">("internal");
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [sources, setSources] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  const xaiAvailable = true; // In real usage this would come from a server prop or context

  const run = () => {
    if (!prompt.trim()) return;

    setResponse("");
    setSources([]);

    startTransition(async () => {
      try {
        const p = getAiProvider(provider);

        const instructions = [
          "You are an internal AI assistant for J.G. Walsh & Co. operations.",
          "Be concise, practical, and professional.",
          `Current page context: ${pathname}`,
          "Do not provide legal, tax, or investment advice.",
        ].join(" ");

        let result;
        if (mode === "web") {
          result = await p.generateWithWebSearch({
            prompt,
            instructions,
          });
        } else {
          result = await p.generateText({
            prompt,
            instructions,
          });
        }

        setResponse(result.outputText || "No response generated.");
        if ("sources" in result && Array.isArray(result.sources)) {
          setSources(result.sources);
        } else {
          setSources([]);
        }
      } catch (err) {
        setResponse(
          err instanceof Error ? err.message : "Something went wrong with the AI request."
        );
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      run();
    }
    if (e.key === "Escape") {
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative flex h-full w-full max-w-md flex-col border-l border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[var(--color-primary)]" />
            <div>
              <div className="font-display text-lg font-semibold">Workspace AI</div>
              <div className="text-[11px] text-[var(--color-text-muted)]">
                Ask anything about your portfolio, projects, or data
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-soft)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Provider + Mode */}
        <div className="space-y-3 border-b border-[var(--color-border)] bg-[var(--color-surface-soft)] p-4">
          <AiProviderSegmented
            provider={provider}
            onChange={setProvider}
            xaiAvailable={xaiAvailable}
            size="compact"
          />

          <div className="flex gap-2">
            <button
              onClick={() => setMode("internal")}
              className={`flex-1 rounded-md border px-3 py-1.5 text-sm font-medium transition ${
                mode === "internal"
                  ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
                  : "border-[var(--color-border)] hover:bg-[var(--color-surface)]"
              }`}
            >
              Internal knowledge
            </button>
            <button
              onClick={() => setMode("web")}
              className={`flex-1 rounded-md border px-3 py-1.5 text-sm font-medium transition ${
                mode === "web"
                  ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
                  : "border-[var(--color-border)] hover:bg-[var(--color-surface)]"
              }`}
            >
              + Web research
            </button>
          </div>
        </div>

        {/* Input */}
        <div className="p-4">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What would you like to know? (e.g. 'Summarize risks for 322 Osborne' or 'Compare yields this quarter')"
            className="h-24 w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
          />
          <button
            onClick={run}
            disabled={pending || !prompt.trim()}
            className="mt-2 w-full rounded-md bg-[var(--color-primary)] py-2 text-sm font-semibold text-[var(--color-text-inverse)] transition hover:bg-[var(--color-primary-hover)] disabled:opacity-60"
          >
            {pending ? "Thinking…" : "Ask AI"}
          </button>
        </div>

        {/* Response */}
        {(response || pending) && (
          <div className="flex-1 overflow-auto border-t border-[var(--color-border)] p-4 text-sm">
            {pending && !response && (
              <div className="text-[var(--color-text-muted)]">Generating response…</div>
            )}

            {response && (
              <div className="space-y-3">
                <div className="whitespace-pre-wrap rounded-lg bg-[var(--color-surface-soft)] p-3 leading-relaxed">
                  {response}
                </div>

                {sources.length > 0 && (
                  <div>
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                      Sources
                    </div>
                    <ul className="space-y-1 text-xs">
                      {sources.map((url, i) => (
                        <li key={i}>
                          <a href={url} target="_blank" rel="noopener noreferrer" className="text-[var(--color-primary)] hover:underline break-all">
                            {url}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="text-[10px] text-[var(--color-text-faint)]">
                  AI-generated internal assistance only.
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer hint */}
        <div className="border-t border-[var(--color-border)] p-3 text-center text-[10px] text-[var(--color-text-faint)]">
          Press <kbd className="rounded bg-[var(--color-surface-soft)] px-1">Esc</kbd> to close • Context: <span className="font-mono">{pathname}</span>
        </div>
      </div>
    </div>
  );
}
