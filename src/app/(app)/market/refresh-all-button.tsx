"use client";

import { useActionState } from "react";
import { RefreshCw } from "lucide-react";
import { refreshAllMarketData, type RefreshAllResult } from "./refresh-all-actions";

/**
 * Global "Refresh all" button for the Market Tracker header.
 * Triggers parallel refresh of all configured data sources.
 */
export function RefreshAllButton() {
  const [state, action, pending] = useActionState<
    RefreshAllResult | null,
    FormData
  >(refreshAllMarketData, null);

  return (
    <form action={action} className="flex flex-col gap-1">
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-md border border-[var(--market-cyan)] bg-[var(--market-blue)] px-3.5 py-2 text-sm font-semibold text-[var(--market-text)] transition hover:bg-[var(--market-cyan)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--market-cyan)] disabled:opacity-60"
      >
        <RefreshCw className={`h-4 w-4 ${pending ? "animate-spin" : ""}`} />
        {pending ? "Refreshing…" : "Refresh all"}
      </button>

      {state ? <RefreshAllSummary result={state} /> : null}
    </form>
  );
}

function RefreshAllSummary({ result }: { result: RefreshAllResult }) {
  const isSuccess = result.status === "ok";
  const isPartial = result.status === "partial";

  const color = isSuccess
    ? "var(--semantic-success)"
    : isPartial
      ? "var(--semantic-warning)"
      : "var(--semantic-error)";

  const bg = isSuccess
    ? "var(--semantic-success-bg)"
    : isPartial
      ? "var(--semantic-warning-bg)"
      : "var(--semantic-error-bg)";

  const border = isSuccess
    ? "var(--semantic-success-border)"
    : isPartial
      ? "var(--semantic-warning-border)"
      : "var(--semantic-error-border)";

  return (
    <div
      className="rounded-lg border px-3 py-2 text-xs"
      style={{
        color,
        background: bg,
        borderColor: border,
      }}
    >
      <div className="font-semibold mb-1">{result.message}</div>

      {result.details.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {result.details.map((d, i) => (
            <span
              key={i}
              className="inline-flex items-center rounded px-1.5 py-0.5 bg-black/10 text-[10px]"
            >
              {d.provider}: <span className="font-medium ml-1">{d.success}s</span>
              {d.noData > 0 && <span className="ml-1 opacity-70">·{d.noData}nd</span>}
              {d.errors > 0 && <span className="ml-1 opacity-70">·{d.errors}e</span>}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
