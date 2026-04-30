import { PageHeader } from "@/components/page-header";
import { SectionPanel } from "@/components/section-panel";
import {
  getAllIntegrationStatuses,
  integrations,
  type IntegrationCategory,
} from "@/lib/integrations";
import { statusTokens } from "@/lib/status";

export const dynamic = "force-dynamic";

const categoryOrder: IntegrationCategory[] = [
  "Communication",
  "Project tracking",
  "Documents",
  "Source control",
  "Research",
];

function StatusPill({ configured }: { configured: boolean }) {
  const tone = statusTokens[configured ? "success" : "neutral"];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold"
      style={{ background: tone.background, color: tone.text, borderColor: tone.border }}
    >
      <span
        aria-hidden
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: tone.text }}
      />
      {configured ? "Connected" : "Not configured"}
    </span>
  );
}

export default function IntegrationsPage() {
  const statuses = getAllIntegrationStatuses();
  const statusById = new Map(statuses.map((s) => [s.id, s]));

  const totalConfigured = statuses.filter((s) => s.configured).length;

  const grouped = categoryOrder.map((category) => ({
    category,
    items: integrations.filter((i) => i.category === category),
  }));

  return (
    <>
      <PageHeader
        eyebrow="Integrations"
        title="Connected services"
        description="Walsh Co talks to external tools through server-side adapters. Credentials live in environment variables on the server — they are never exposed to the browser."
      />

      <div className="grid grid-cols-2 gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)] sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-faint)]">
            Available
          </span>
          <span className="text-sm font-semibold text-[var(--color-text)]">
            {integrations.length}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-faint)]">
            Connected
          </span>
          <span className="text-sm font-semibold text-[var(--color-text)]">
            {totalConfigured}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-faint)]">
            Awaiting setup
          </span>
          <span className="text-sm font-semibold text-[var(--color-text)]">
            {integrations.length - totalConfigured}
          </span>
        </div>
      </div>

      {grouped
        .filter(({ items }) => items.length > 0)
        .map(({ category, items }) => (
          <SectionPanel key={category} title={category} padded={false}>
            <ul className="divide-y divide-[var(--color-border)]">
              {items.map((integration) => {
                const status = statusById.get(integration.id)!;
                return (
                  <li
                    key={integration.id}
                    className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-start lg:justify-between"
                  >
                    <div className="flex flex-col gap-1 lg:max-w-2xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-[var(--color-text)]">
                          {integration.name}
                        </h3>
                        <span className="text-xs text-[var(--color-text-faint)]">
                          {integration.vendor}
                        </span>
                        <StatusPill configured={status.configured} />
                      </div>
                      <p className="text-sm text-[var(--color-text-muted)]">
                        {integration.summary}
                      </p>
                      <ul className="mt-1 flex flex-wrap gap-2">
                        {integration.capabilities.map((cap) => (
                          <li
                            key={cap.label}
                            title={cap.description}
                            className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-soft)] px-2.5 py-0.5 text-[11px] text-[var(--color-text-muted)]"
                          >
                            {cap.label}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex flex-col gap-1.5 text-xs lg:items-end lg:text-right">
                      <span className="font-semibold uppercase tracking-wide text-[var(--color-text-faint)]">
                        Required env
                      </span>
                      <code className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-soft)] px-2 py-1 font-mono text-[11px] text-[var(--color-text)]">
                        {integration.envVars.join(" · ")}
                      </code>
                      {!status.configured && status.missing.length > 0 ? (
                        <span className="text-[11px] text-[var(--status-warning-text)]">
                          Missing: {status.missing.join(", ")}
                        </span>
                      ) : null}
                      {integration.docsUrl ? (
                        <a
                          href={integration.docsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-[var(--color-primary)] hover:underline"
                        >
                          API docs ↗
                        </a>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </SectionPanel>
        ))}

      <SectionPanel
        title="How integrations work"
        description="Architecture notes for anyone wiring up new credentials."
      >
        <ul className="flex flex-col gap-2 text-sm text-[var(--color-text-muted)]">
          <li>
            Every integration lives in <code className="font-mono text-xs">src/lib/integrations.ts</code> with the env vars it needs.
          </li>
          <li>
            Adapter functions in <code className="font-mono text-xs">src/lib/integration-adapters.ts</code> wrap remote APIs and throw <code className="font-mono text-xs">IntegrationNotConfiguredError</code> when env is missing.
          </li>
          <li>
            Route handlers under <code className="font-mono text-xs">src/app/api/integrations/*</code> translate that error into a 501 response so the UI stays functional even when a connector is offline.
          </li>
          <li>
            Browsers never read these env vars. Add credentials to <code className="font-mono text-xs">.env.local</code> in development, or to your hosting provider for production.
          </li>
        </ul>
      </SectionPanel>
    </>
  );
}
