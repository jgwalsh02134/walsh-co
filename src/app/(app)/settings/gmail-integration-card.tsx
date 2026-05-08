/**
 * Compact Gmail integration status card for the Settings page.
 * Server-rendered: receives only booleans, never the token. Provides a
 * Connect / Reconnect link to the OAuth start route, never reads or
 * displays the token itself.
 */

import { GMAIL_COMPOSE_SCOPE } from "@/lib/google-gmail";

export type GmailIntegrationCardProps = {
  /** GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET configured. */
  clientConfigured: boolean;
  /** Above + GOOGLE_GMAIL_DRAFTS_ENABLED === "true". */
  draftsEnabled: boolean;
  /** Encrypted httpOnly session cookie present. */
  connected: boolean;
};

const ICON = "/icons/workspace/gmail-icon.svg";

export function GmailIntegrationCard({
  clientConfigured,
  draftsEnabled,
  connected,
}: GmailIntegrationCardProps) {
  const status = !clientConfigured
    ? "not_configured"
    : !draftsEnabled
    ? "disabled"
    : connected
    ? "connected"
    : "needs_connect";

  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-md)] bg-[var(--color-surface-soft)] p-4 shadow-[var(--shadow-card-ring)] sm:flex-row sm:items-start sm:gap-4">
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[var(--color-surface)] shadow-[var(--shadow-card-ring)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ICON} alt="" aria-hidden width={22} height={22} />
      </span>

      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-display text-sm font-semibold text-[var(--workspace-text)]">
            Gmail drafts
          </span>
          <StatusPill status={status} />
        </div>
        <p className="text-[12.5px] leading-relaxed text-[var(--workspace-text-secondary)]">
          {{
            not_configured:
              "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET on the server to enable Gmail drafts.",
            disabled:
              "Set GOOGLE_GMAIL_DRAFTS_ENABLED=true to expose Gmail draft buttons in the UI.",
            connected:
              "Connected. Drafts are saved to your Gmail Drafts folder. Nothing is sent.",
            needs_connect:
              "Connect Google to create Gmail drafts. Single OAuth scope: gmail.compose. Drafts only — no send.",
          }[status]}
        </p>
        <p className="text-[11px] text-[var(--workspace-text-muted)]">
          Scope: <span className="font-mono">{GMAIL_COMPOSE_SCOPE}</span>
        </p>

        {status === "needs_connect" || status === "connected" ? (
          <div className="mt-2 flex flex-wrap gap-2">
            <a
              href="/api/auth/google/start?returnTo=/settings"
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--workspace-text)] transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ICON} alt="" aria-hidden width={14} height={14} />
              {status === "connected" ? "Reconnect Google" : "Connect Google"}
            </a>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StatusPill({
  status,
}: {
  status: "not_configured" | "disabled" | "connected" | "needs_connect";
}) {
  const meta = {
    not_configured: {
      label: "Not configured",
      bg: "var(--status-neutral-bg)",
      text: "var(--status-neutral-text)",
      border: "var(--status-neutral-border)",
    },
    disabled: {
      label: "Disabled",
      bg: "var(--status-neutral-bg)",
      text: "var(--status-neutral-text)",
      border: "var(--status-neutral-border)",
    },
    connected: {
      label: "Connected",
      bg: "var(--status-success-bg)",
      text: "var(--status-success-text)",
      border: "var(--status-success-border)",
    },
    needs_connect: {
      label: "Not connected",
      bg: "var(--status-warning-bg)",
      text: "var(--status-warning-text)",
      border: "var(--status-warning-border)",
    },
  }[status];

  return (
    <span
      className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold"
      style={{
        background: meta.bg,
        color: meta.text,
        borderColor: meta.border,
      }}
    >
      {meta.label}
    </span>
  );
}
