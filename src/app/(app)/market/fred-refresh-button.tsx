"use client";

import { useActionState } from "react";
import { refreshFredMacro, type FredRefreshResult } from "./fred-actions";

/**
 * Refresh trigger for FRED macro snapshot. Disabled with a notice when
 * the server reports that FRED_API_KEY is not configured. The API key
 * is never sent to the client — only the boolean `keyConfigured`.
 */
export function FredRefreshButton({
  keyConfigured,
}: {
  keyConfigured: boolean;
}) {
  const [state, action, pending] = useActionState<
    FredRefreshResult | null,
    FormData
  >(refreshFredMacro, null);

  if (!keyConfigured) {
    return (
      <div className="flex flex-col gap-1 text-right">
        <button
          type="button"
          disabled
          aria-disabled
          title="Set FRED_API_KEY on the server to enable refresh."
          className="inline-flex min-h-[40px] cursor-not-allowed items-center justify-center rounded-[var(--radius-md)] border border-[var(--market-border)] bg-[var(--market-surface-raised)] px-3 py-2 text-sm font-medium text-[var(--market-text-muted)]"
        >
          FRED API key not configured
        </button>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-1">
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-[40px] items-center justify-center rounded-[var(--radius-md)] border border-[var(--market-border-strong)] bg-[var(--market-surface)] px-3 py-2 text-sm font-semibold text-[var(--market-text)] transition-colors hover:border-[var(--market-cyan)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--market-cyan)] disabled:opacity-60"
      >
        {pending ? "Refreshing…" : "Refresh FRED macro data"}
      </button>
      {state ? <RefreshSummary result={state} /> : null}
    </form>
  );
}

function RefreshSummary({ result }: { result: FredRefreshResult }) {
  const tone =
    result.status === "ok"
      ? "var(--semantic-success)"
      : result.status === "missing-key"
      ? "var(--semantic-warning)"
      : "var(--semantic-error)";
  const bg =
    result.status === "ok"
      ? "var(--semantic-success-bg)"
      : result.status === "missing-key"
      ? "var(--semantic-warning-bg)"
      : "var(--semantic-error-bg)";
  const border =
    result.status === "ok"
      ? "var(--semantic-success-border)"
      : result.status === "missing-key"
      ? "var(--semantic-warning-border)"
      : "var(--semantic-error-border)";

  return (
    <div
      role="status"
      className="rounded-[var(--radius-md)] border px-3 py-2 text-[11px]"
      style={{ background: bg, borderColor: border, color: tone }}
    >
      {result.message ? (
        <div className="font-semibold">{result.message}</div>
      ) : null}
      <div>
        <strong className="font-mono tabular-nums">
          {result.successSeries}
        </strong>{" "}
        of{" "}
        <strong className="font-mono tabular-nums">{result.totalSeries}</strong>{" "}
        series fetched ·{" "}
        <strong className="font-mono tabular-nums">
          {result.errors.length}
        </strong>{" "}
        errored
      </div>
      {result.errors.length > 0 ? (
        <details className="mt-1">
          <summary className="cursor-pointer">Failure details</summary>
          <ul className="mt-1 flex flex-col gap-0.5 text-[var(--market-text-muted)]">
            {result.errors.slice(0, 10).map((f, i) => (
              <li key={i}>
                <span className="text-[var(--market-text-secondary)]">
                  {f.seriesId}
                </span>
                : {f.reason}
              </li>
            ))}
            {result.errors.length > 10 ? (
              <li>… {result.errors.length - 10} more</li>
            ) : null}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
