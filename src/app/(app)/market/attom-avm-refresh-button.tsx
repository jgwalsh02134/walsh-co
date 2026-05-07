"use client";

import { useActionState } from "react";
import {
  refreshAttomAvm,
  type AttomAvmRefreshResult,
} from "./attom-avm-actions";

export function AttomAvmRefreshButton({
  keyConfigured,
}: {
  keyConfigured: boolean;
}) {
  const [state, action, pending] = useActionState<
    AttomAvmRefreshResult | null,
    FormData
  >(refreshAttomAvm, null);

  if (!keyConfigured) {
    return (
      <div className="flex flex-col gap-1 text-right">
        <button
          type="button"
          disabled
          aria-disabled
          title="Set ATTOM_API_KEY on the server to enable refresh."
          className="inline-flex min-h-[40px] cursor-not-allowed items-center justify-center rounded-[var(--radius-md)] border border-[var(--market-border)] bg-[var(--market-surface-raised)] px-3 py-2 text-sm font-medium text-[var(--market-text-muted)]"
        >
          ATTOM key not configured
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
        {pending ? "Refreshing…" : "Refresh ATTOM AVM"}
      </button>
      {state ? <Summary result={state} /> : null}
    </form>
  );
}

function Summary({ result }: { result: AttomAvmRefreshResult }) {
  const ok =
    result.status === "ok" &&
    (result.avmSuccess > 0 || result.historySuccess > 0);
  const tone = ok
    ? "var(--semantic-success)"
    : result.status === "missing-key"
    ? "var(--semantic-warning)"
    : result.avmUnavailable + result.historyUnavailable > 0
    ? "var(--semantic-warning)"
    : "var(--semantic-error)";
  const bg = ok
    ? "var(--semantic-success-bg)"
    : result.status === "missing-key"
    ? "var(--semantic-warning-bg)"
    : result.avmUnavailable + result.historyUnavailable > 0
    ? "var(--semantic-warning-bg)"
    : "var(--semantic-error-bg)";
  const border = ok
    ? "var(--semantic-success-border)"
    : result.status === "missing-key"
    ? "var(--semantic-warning-border)"
    : result.avmUnavailable + result.historyUnavailable > 0
    ? "var(--semantic-warning-border)"
    : "var(--semantic-error-border)";

  return (
    <div
      role="status"
      className="rounded-[var(--radius-md)] border px-3 py-2 text-[11px]"
      style={{ background: bg, borderColor: border, color: tone }}
    >
      {result.message ? <div className="font-semibold">{result.message}</div> : null}
      <div>
        AVM:{" "}
        <strong className="font-mono tabular-nums">{result.avmSuccess}</strong>{" "}
        ok ·{" "}
        <strong className="font-mono tabular-nums">
          {result.avmUnavailable}
        </strong>{" "}
        unavailable ·{" "}
        <strong className="font-mono tabular-nums">{result.avmErrors}</strong>{" "}
        err
      </div>
      <div>
        History:{" "}
        <strong className="font-mono tabular-nums">
          {result.historySuccess}
        </strong>{" "}
        ok ·{" "}
        <strong className="font-mono tabular-nums">
          {result.historyUnavailable}
        </strong>{" "}
        unavailable ·{" "}
        <strong className="font-mono tabular-nums">
          {result.historyErrors}
        </strong>{" "}
        err
      </div>
      {result.failures.length > 0 ? (
        <details className="mt-1">
          <summary className="cursor-pointer">Failure details</summary>
          <ul className="mt-1 flex flex-col gap-0.5 text-[var(--market-text-muted)]">
            {result.failures.slice(0, 10).map((f, i) => (
              <li key={i}>
                <span className="text-[var(--market-text-secondary)]">
                  {f.address}
                </span>
                : {f.reason}
              </li>
            ))}
            {result.failures.length > 10 ? (
              <li>… {result.failures.length - 10} more</li>
            ) : null}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
