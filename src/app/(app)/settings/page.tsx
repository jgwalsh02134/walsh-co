import { PageHeader } from "@/components/page-header";
import { SectionPanel } from "@/components/section-panel";

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Workspace settings"
        description="Workspace configuration. Most controls live with the underlying systems and not inside this app."
      />

      <SectionPanel
        title="Workspace Settings"
        description="Identifies this workspace."
      >
        <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <dt className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-faint)]">
              Name
            </dt>
            <dd className="text-[var(--color-text)]">J.G. Walsh & Co.</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-faint)]">
              Product
            </dt>
            <dd className="text-[var(--color-text)]">
              J.G. Walsh & Co. Workspace
            </dd>
          </div>
        </dl>
      </SectionPanel>

      <SectionPanel
        title="Access"
        description="Cloudflare Access · Microsoft Entra"
      >
        <ul className="flex flex-col gap-2 text-sm text-[var(--color-text)]">
          <li>
            <span className="font-medium">Cloudflare Access</span>{" "}
            <span className="text-[var(--color-text-muted)]">
              protects the app at the edge.
            </span>
          </li>
          <li>
            <span className="font-medium">Microsoft Entra</span>{" "}
            <span className="text-[var(--color-text-muted)]">
              is the identity provider behind Cloudflare Access.
            </span>
          </li>
          <li className="text-xs text-[var(--color-text-muted)]">
            Access policies, identity providers, and audit logs are managed in
            the Cloudflare and Entra admin consoles, not inside this app.
          </li>
        </ul>
      </SectionPanel>

      <SectionPanel
        title="Integrations"
        description="External services this workspace will connect to."
      >
        <p className="text-sm text-[var(--color-text-muted)]">Coming later.</p>
      </SectionPanel>

      <SectionPanel
        title="Data Sources"
        description="Market and property data providers."
      >
        <p className="text-sm text-[var(--color-text-muted)]">Coming later.</p>
      </SectionPanel>
    </>
  );
}
