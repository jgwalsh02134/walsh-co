"use client";

import { useActionState } from "react";
import {
  refreshZillowZhviZipData,
  type ZillowZhviRefreshResult,
} from "./zillow-actions";

/**
 * Refresh trigger for the Zillow ZHVI ZIP snapshot. Disabled when the
 * server reports the CSV URL is not configured. The URL is never sent
 * to the client — only the boolean `urlConfigured`.
 */
export function ZillowRefreshButton({
  urlConfigured,
}: {
  urlConfigured: boolean;
}) {
  const [state, action, pending] = useActionState<
    ZillowZhviRefreshResult | null,
    FormData
  >(refreshZillowZhviZipData, null);

  if (!urlConfigured) {
    return (
      <div className="flex flex-col gap-1 text-right">
        <button
          type="button"
          disabled
          aria-disabled
          title="Set ZILLOW_ZHVI_ZIP_CSV_URL on the server to enable refresh."
          className="inline-flex min-h-[40px] cursor-not-allowed items-center justify-center rounded-[var(--radius-md)] border border-[var(--market-border)] bg-[var(--market-surface-raised)] px-3 py-2 text-sm font-medium text-[var(--market-text-muted)]"
        >
          Zillow ZHVI URL not configured
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
        {pending ? "Refreshing…" : "Refresh Zillow ZHVI data"}
      </button>
      {state ? <RefreshSummary result={state} /> : null}
    </form>
  );
}

function RefreshSummary({ result }: { result: ZillowZhviRefreshResult }) {
  const tone =
    result.status === "ok"
      ? "var(--semantic-success)"
      : result.status === "missing-url"
      ? "var(--semantic-warning)"
      : "var(--semantic-error)";
  const bg =
    result.status === "ok"
      ? "var(--semantic-success-bg)"
      : result.status === "missing-url"
      ? "var(--semantic-warning-bg)"
      : "var(--semantic-error-bg)";
  const border =
    result.status === "ok"
      ? "var(--semantic-success-border)"
      : result.status === "missing-url"
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
          {result.zipsResolved}
        </strong>{" "}
        of{" "}
        <strong className="font-mono tabular-nums">{result.totalZips}</strong>{" "}
        ZIPs resolved
      </div>
    </div>
  );
}
