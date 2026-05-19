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
};

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
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--market-border)] px-4 py-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2
            id="needs-attention-heading"
            className="font-display text-base font-semibold text-[var(--market-text)]"
          >
            Needs attention
          </h2>
          <p className="text-[11.5px] text-[var(--market-text-secondary)]">
            Items that reduce confidence or need verification.
          </p>
        </div>
        <span className="text-[11px] text-[var(--market-text-muted)]">
          {groups.length === 0 ? "Clear" : `${groups.length} issues`}
        </span>
      </header>

      {groups.length === 0 ? (
        <p className="px-4 py-3 text-sm text-[var(--market-text-secondary)]">
          No critical market-data flags right now.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-[var(--market-border)]">
          {groups.map((g, i) => (
            <li key={`${g.issue}-${i}`} className="flex gap-3 px-4 py-3">
              <span
                aria-hidden
                className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full"
                style={{ background: severityColor(g.severity) }}
              />
              <div className="min-w-0 flex-1">
                <div className="font-display text-sm font-semibold text-[var(--market-text)]">
                  {g.issue}
                </div>
                {g.detail ? (
                  <div className="mt-0.5 text-xs text-[var(--market-text-secondary)]">
                    {g.detail}
                  </div>
                ) : null}
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {g.properties.map((p) => (
                    <span
                      key={p}
                      className="border border-[var(--market-border)] bg-[var(--market-surface-raised)] px-1.5 py-0.5 text-[11px] text-[var(--market-text)]"
                    >
                      {p}
                    </span>
                  ))}
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
