"use client";

import { useActionState } from "react";
import {
  refreshGoogleMapsContext,
  type GoogleMapsRefreshResult,
} from "./google-maps-actions";

/**
 * Refresh trigger for Google Maps geocode context. The API key never
 * reaches the client — only the boolean `keyConfigured`.
 */
export function GoogleMapsRefreshButton({
  keyConfigured,
}: {
  keyConfigured: boolean;
}) {
  const [state, action, pending] = useActionState<
    GoogleMapsRefreshResult | null,
    FormData
  >(refreshGoogleMapsContext, null);

  if (!keyConfigured) {
    return (
      <div className="flex flex-col gap-1 text-right">
        <button
          type="button"
          disabled
          aria-disabled
          title="Set GOOGLE_MAPS_SERVER_API_KEY on the server to enable refresh."
          className="inline-flex min-h-[40px] cursor-not-allowed items-center justify-center rounded-[var(--radius-md)] border border-[var(--market-border)] bg-[var(--market-surface-raised)] px-3 py-2 text-sm font-medium text-[var(--market-text-muted)]"
        >
          Google Maps key not configured
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
        {pending ? "Refreshing…" : "Refresh Google Maps context"}
      </button>
      {state ? <RefreshSummary result={state} /> : null}
    </form>
  );
}

function RefreshSummary({ result }: { result: GoogleMapsRefreshResult }) {
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
          {result.successCount}
        </strong>{" "}
        of{" "}
        <strong className="font-mono tabular-nums">{result.totalCount}</strong>{" "}
        properties geocoded
      </div>
    </div>
  );
}
