import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { SectionPanel } from "@/components/section-panel";

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Workspace"
        description="Configuration and integrations. Most workspace state will live here as the app grows."
      />

      <SectionPanel title="Workspace" description="Identifies this workspace.">
        <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <dt className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-faint)]">
              Name
            </dt>
            <dd className="text-[var(--color-text)]">Walsh Co</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-faint)]">
              Active project
            </dt>
            <dd className="text-[var(--color-text)]">322 Osborne Rd Renovation</dd>
          </div>
        </dl>
      </SectionPanel>

      <SectionPanel
        title="Access"
        description="Who can reach this workspace and how."
      >
        <ul className="flex flex-col gap-2 text-sm text-[var(--color-text)]">
          <li>
            <span className="font-medium">Cloudflare Access</span>{" "}
            <span className="text-[var(--color-text-muted)]">
              protects the app at the edge.
            </span>
          </li>
          <li>
            <span className="font-medium">Microsoft login</span>{" "}
            <span className="text-[var(--color-text-muted)]">
              is enabled through Cloudflare Access.
            </span>
          </li>
          <li className="text-xs text-[var(--color-text-muted)]">
            Access policies, identity providers, and audit logs are managed in the
            Cloudflare dashboard, not from inside this app.
          </li>
        </ul>
      </SectionPanel>

      <SectionPanel
        title="Integrations"
        description="External services this workspace can connect to."
      >
        <p className="text-sm text-[var(--color-text-muted)]">
          Walsh Co talks to Slack, Microsoft Teams, Microsoft Planner,
          Microsoft Excel, GitHub, Notion, and Midpage through server-side
          adapters. Credentials live in environment variables on the server and
          are never sent to the browser.
        </p>
        <Link
          href="/integrations"
          className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-primary)] hover:underline"
        >
          Manage integrations →
        </Link>
      </SectionPanel>
    </>
  );
}
