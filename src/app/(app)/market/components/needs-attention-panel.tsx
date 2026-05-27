/**
 * Needs Attention sidebar.
 *
 * Concise, grouped-by-issue view. Avoids the previous pattern of one
 * giant row per (property × issue) combination.
 */

export type NeedsAttentionGroup = {
  /** Short label, e.g. "Acquisition basis missing". */
  issue: string;
  /** One-line explanation, e.g. "Recorded purchase basis not captured". */
  detail?: string;
  /** Property addresses affected. */
  properties: string[];
  /** Severity hint for color band. */
  severity: "info" | "warning" | "error";
  /** AI-generated research suggestions (for missing data issues) */
  aiSuggestions?: Array<{
    property: string;
    suggestion: string;
    source?: string;
    confidence?: string;
  }>;
};

import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";

export function NeedsAttentionPanel({
  groups,
}: {
  groups: NeedsAttentionGroup[];
}) {
  return (
    <section
      aria-labelledby="needs-attention-heading"
      className="flex flex-col border border-[var(--market-border)] bg-[var(--market-surface)]"
    >
      <header className="flex items-center justify-between border-b border-[var(--market-border)] px-3 py-1.5">
        <div className="flex items-baseline gap-2">
          <h2
            id="needs-attention-heading"
            className="font-display text-sm font-semibold text-[var(--market-text)]"
          >
            Needs attention
          </h2>
          <p className="text-[11px] text-[var(--market-text-secondary)]">
            Items that reduce confidence or need verification
          </p>
        </div>
        {groups.length > 0 && (
          <StatusBadge
            kind="pending"
            label={`${groups.length} issues`}
            showIcon={false}
            compact
          />
        )}
      </header>

      {groups.length === 0 ? (
        <p className="px-4 py-4 text-sm text-[var(--market-text-secondary)]">
          All key data points are captured. Good.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-[var(--market-border)] text-sm">
          {groups.map((g, i) => (
            <li key={`${g.issue}-${i}`} className="px-3 py-3">
              <div className="flex items-start gap-3">
                <StatusBadge
                  kind={g.severity === "error" ? "off" : g.severity === "warning" ? "pending" : "planned"}
                  showIcon
                  compact
                />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div>
                    <div className="font-medium text-[var(--market-text)]">{g.issue}</div>
                    {g.detail && (
                      <div className="text-xs text-[var(--market-text-secondary)]">{g.detail}</div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {g.properties.map((p) => (
                      <Link
                        key={p}
                        href="/market/manual"
                        className="rounded border border-[var(--market-border)] bg-[var(--market-surface-raised)] px-2 py-0.5 text-[11px] text-[var(--market-text)] hover:border-[var(--market-cyan)] hover:text-[var(--market-cyan)] transition-colors"
                        title={`Edit manual data for ${p}`}
                      >
                        {p}
                      </Link>
                    ))}
                  </div>

                  <Link
                    href="/market/manual"
                    className="inline-block text-[12px] font-medium text-[var(--market-cyan)] hover:underline"
                  >
                    Edit manual data →
                  </Link>

                  {g.aiSuggestions && g.aiSuggestions.length > 0 && (
                    <div className="mt-3 rounded-lg border border-[var(--market-border)] bg-[var(--market-surface)] p-3 text-xs">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="font-semibold text-[var(--market-cyan)]">AI Research Suggestions</div>
                          <div className="text-[10px] text-[var(--market-text-muted)]">(auto-generated)</div>
                        </div>
                      </div>
                      {g.aiSuggestions.map((s, idx) => (
                        <div key={idx} className="mb-3 border-l-2 border-[var(--market-cyan)] pl-2">
                          <div className="font-medium text-[var(--market-text)]">{s.property}</div>
                          <div className="text-[var(--market-text-secondary)] mt-0.5">{s.suggestion}</div>
                          {s.source && (
                            <div className="mt-1 text-[10px] text-[var(--market-text-muted)]">Source: {s.source}</div>
                          )}
                          <Link
                            href={`/market/manual?property=${encodeURIComponent(s.property)}&aiNote=${encodeURIComponent(s.suggestion)}`}
                            className="mt-2 inline-flex items-center gap-1 rounded-md border border-[var(--market-cyan)] bg-[var(--market-surface-raised)] px-2 py-1 text-[11px] font-medium text-[var(--market-cyan)] hover:bg-[var(--market-cyan)] hover:text-white transition-colors"
                          >
                            Use this suggestion →
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function severityColor(s: NeedsAttentionGroup["severity"]): string {
  switch (s) {
    case "error":
      return "var(--market-negative-dark)";
    case "warning":
      return "var(--market-amber)";
    case "info":
    default:
      return "var(--market-cyan)";
  }
}
