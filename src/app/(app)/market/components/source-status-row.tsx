/**
 * Compact source-health strip.
 *
 * Replaces the full Source Diagnostics table on the main page. Shows
 * one chip per provider with a coloured dot and a canonical state label
 * (Live / Pending / Off / Planned) so the user-facing vocabulary is
 * consistent everywhere on the page.
 *
 * The ⚙ link points at the `#market-tracker-settings` disclosure for
 * users who want to drill into the full diagnostics view.
 */

import Link from "next/link";
import { StatusBadge, type StatusKind } from "@/components/status-badge";
import {
  CANONICAL_LABEL,
  canonicalStateColors,
  fromSourceStatusRowKind,
  type CanonicalSourceState,
} from "./source-status-display";

export type SourceStatusKind = "connected" | "configured" | "missing";

export type SourceStatus = {
  label: string;
  kind: SourceStatusKind;
};

export type SourceStatusRowProps = {
  sources: SourceStatus[];
  settingsHref?: string;
};

export function SourceStatusRow({
  sources,
  settingsHref = "#market-tracker-settings",
}: SourceStatusRowProps) {
  return (
    <section
      aria-label="Data source health"
      className="flex flex-wrap items-center gap-x-3 gap-y-2 border border-[var(--market-border)] bg-[var(--market-surface)] px-3 py-2 sm:px-4"
    >
      <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--market-text-muted)]">
        Sources
      </span>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {sources.map((s) => (
          <SourceChip key={s.label} {...s} />
        ))}
      </div>
      <Link
        href={settingsHref}
        className="ml-auto inline-flex min-h-[28px] items-center rounded-full border border-[var(--market-border)] bg-[var(--market-surface-raised)] px-2.5 py-1 text-[11px] font-semibold text-[var(--market-text-secondary)] transition hover:border-[var(--market-border-strong)] hover:text-[var(--market-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--market-cyan)]"
      >
        Manage
      </Link>
    </section>
  );
}

function SourceChip({ label, kind }: SourceStatus) {
  const state: CanonicalSourceState = fromSourceStatusRowKind(kind);
  const colors = canonicalStateColors(state);
  const stateLabel = CANONICAL_LABEL[state];

  return (
    <span
      className="inline-flex items-center gap-1.5 text-[12px]"
      aria-label={`${label}: ${stateLabel}`}
    >
      <span className="text-[var(--market-text)]">{label}</span>
      <span className="text-[var(--market-text-muted)]" aria-hidden>
        ·
      </span>
      <StatusBadge
        kind={state as StatusKind}
        label={stateLabel}
        compact
      />
    </span>
  );
}
