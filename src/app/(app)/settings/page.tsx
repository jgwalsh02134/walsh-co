import { PageHeader } from "@/components/page-header";
import { SectionPanel } from "@/components/section-panel";

// Settings reads the encrypted Google session cookie and the
// WorkspaceSetting row that stores Drive folder ids. Both are
// per-request data, so prerender as dynamic to avoid touching the
// database at build time.
export const dynamic = "force-dynamic";
import { hasAttomKey } from "@/lib/attom";
import { hasCensusKey } from "@/lib/census";
import { hasFredKey } from "@/lib/fred";
import {
  getDriveStatus,
  getStoredWorkspaceFoldersForUi,
} from "@/lib/google-drive";
import { hasGoogleMapsServerKey } from "@/lib/google-maps";
import {
  hasGoogleClient,
  isGmailDraftsEnabled,
  isGoogleConnected,
} from "@/lib/google-gmail";
import { hasOpenAIKey } from "@/lib/openai";
import { hasRentCastKey } from "@/lib/rentcast";
import { hasXaiKey, xaiModelName } from "@/lib/xai";
import { hasZillowZhviUrl } from "@/lib/zillow-research";
import { GmailIntegrationCard } from "./gmail-integration-card";
import { IntegrationRow } from "./integration-row";
import { OpenAITestPanel } from "./openai-test-panel";

const ICON = {
  cloudflare: "/icons/workspace/cloudflare-icon.svg",
  microsoft: "/icons/workspace/microsoft-logo1-icon.svg",
  openai: "/icons/workspace/openai-icon-black.svg",
  xai: "/icons/workspace/xai-icon-black.svg",
  gmail: "/icons/workspace/gmail-icon.svg",
  adobe: "/icons/workspace/adobe-acrobat-reader.svg",
  googleDrive: "/icons/workspace/icons8-google-drive.svg",
  // Data source icons aren't bundled yet — fall back to a neutral
  // workspace glyph and let the title + status chip carry meaning.
  dataSource: "/icons/workspace/market-1.svg",
  googleMaps: "/icons/workspace/icons8-google-maps.svg",
} as const;

/**
 * Adobe PDF Services env check. Inlined here (rather than added to
 * `src/lib`) because the Settings page is the only consumer in this
 * pass — we read Boolean presence of the two required env vars without
 * touching their values. No Adobe SDK is imported; no Adobe API call
 * is made on render.
 */
function hasAdobePdfServices(): boolean {
  return (
    Boolean(process.env.ADOBE_PDF_SERVICES_CLIENT_ID?.trim()) &&
    Boolean(process.env.ADOBE_PDF_SERVICES_CLIENT_SECRET?.trim())
  );
}

const DEFAULT_OPENAI_MODEL = "gpt-5.1";

export default async function SettingsPage() {
  // All status booleans come from server-side env checks. No secret
  // values are read into the page — only Boolean(env?.trim()).
  const openAIConfigured = hasOpenAIKey();
  const openAIModel =
    process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL;

  const xaiConfigured = hasXaiKey();
  const xaiModel = xaiModelName();

  const googleClientConfigured = hasGoogleClient();
  const gmailDraftsEnabled = isGmailDraftsEnabled();
  const gmailConnected = gmailDraftsEnabled
    ? await isGoogleConnected()
    : false;

  const adobePdfConfigured = hasAdobePdfServices();
  const driveStatus = await getDriveStatus();
  const driveStoredFolders = await getStoredWorkspaceFoldersForUi();
  const driveIntegrationStatus =
    driveStatus.status === "configured"
      ? "configured"
      : driveStatus.status === "needs_scope"
      ? "not_connected"
      : driveStatus.status === "needs_connect"
      ? "not_connected"
      : "not_configured";

  const dataSources = [
    {
      key: "rentcast",
      title: "RentCast",
      description: "Rent estimate and comparable rent provider.",
      iconSrc: ICON.dataSource,
      configured: hasRentCastKey(),
      env: "RENTCAST_API_KEY",
    },
    {
      key: "attom",
      title: "ATTOM",
      description: "Public-record property facts (parcel, taxes, last sale).",
      iconSrc: ICON.dataSource,
      configured: hasAttomKey(),
      env: "ATTOM_API_KEY",
    },
    {
      key: "fred",
      title: "FRED",
      description: "St. Louis Fed macro/regional housing series.",
      iconSrc: ICON.dataSource,
      configured: hasFredKey(),
      env: "FRED_API_KEY",
    },
    {
      key: "zillow",
      title: "Zillow ZHVI",
      description: "Zillow Home Value Index, monthly ZIP-level CSV.",
      iconSrc: ICON.dataSource,
      configured: hasZillowZhviUrl(),
      env: "ZILLOW_ZHVI_ZIP_CSV_URL",
    },
    {
      key: "google-maps",
      title: "Google Maps",
      description: "Geocoding and place details for property addresses.",
      iconSrc: ICON.googleMaps,
      configured: hasGoogleMapsServerKey(),
      env: "GOOGLE_MAPS_SERVER_API_KEY",
    },
    {
      key: "census-acs",
      title: "Census ACS",
      description: "U.S. Census American Community Survey demographics.",
      iconSrc: ICON.dataSource,
      configured: hasCensusKey(),
      env: "CENSUS_API_KEY",
    },
  ] as const;

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
        description="Edge protection and identity provider for the workspace. Managed in the Cloudflare and Entra admin consoles, not inside this app."
      >
        <div className="flex flex-col gap-3">
          <IntegrationRow
            iconSrc={ICON.cloudflare}
            title="Cloudflare Access"
            description="Protects the app at the edge. Every request to the workspace passes through Cloudflare Access before reaching the runtime."
            status="connected"
          />
          <IntegrationRow
            iconSrc={ICON.microsoft}
            title="Microsoft Entra"
            description="Identity provider behind Cloudflare Access. Users sign in with their Entra account and Cloudflare enforces the policy."
            status="connected"
          />
        </div>
      </SectionPanel>

      <SectionPanel
        title="AI Providers"
        description="Server-side AI providers used by workspace AI actions. Keys live in environment variables — never rendered here."
      >
        <div className="flex flex-col gap-3">
          <IntegrationRow
            iconSrc={ICON.openai}
            title="OpenAI"
            description="Default text generation and web-search provider."
            detail={
              openAIConfigured ? (
                <>
                  Model: <span className="font-mono">{openAIModel}</span>
                </>
              ) : (
                <>Set OPENAI_API_KEY on the server to enable.</>
              )
            }
            status={openAIConfigured ? "configured" : "not_configured"}
          >
            <OpenAITestPanel configured={openAIConfigured} />
          </IntegrationRow>

          <IntegrationRow
            iconSrc={ICON.xai}
            title="xAI / Grok"
            description="Alternative AI provider. Wired into the same Responses API surface; selectable per action."
            detail={
              xaiConfigured ? (
                <>
                  Model: <span className="font-mono">{xaiModel}</span>
                </>
              ) : (
                <>Set XAI_API_KEY on the server to enable.</>
              )
            }
            status={xaiConfigured ? "configured" : "not_configured"}
          />
        </div>
      </SectionPanel>

      <SectionPanel
        title="Google Workspace"
        description="Google services connected to this workspace. Tokens are stored server-side in an encrypted httpOnly cookie."
      >
        <div className="flex flex-col gap-3">
          <GmailIntegrationCard
            clientConfigured={googleClientConfigured}
            draftsEnabled={gmailDraftsEnabled}
            connected={gmailConnected}
          />

          <IntegrationRow
            iconSrc={ICON.googleDrive}
            title="Google Drive"
            description="Workspace document storage. Uses drive.file scope — only files and folders the workspace creates are accessible."
            detail={
              driveStatus.status === "configured" ? (
                <>
                  Scope: <span className="font-mono">drive.file</span>
                  {driveStatus.connectedEmail
                    ? ` · Connected as ${driveStatus.connectedEmail}`
                    : null}
                  {driveStoredFolders?.rootId ? (
                    <>
                      {" · "}
                      Workspace folder created · {driveStoredFolders.childCount}{" "}
                      subfolder
                      {driveStoredFolders.childCount === 1 ? "" : "s"} on file
                    </>
                  ) : null}
                </>
              ) : driveStatus.status === "needs_scope" ? (
                <>
                  Connected, but Drive scope is missing. Reconnect Google to
                  add <span className="font-mono">drive.file</span>.
                </>
              ) : driveStatus.status === "needs_connect" ? (
                <>
                  Drive storage enabled. Connect Google to grant{" "}
                  <span className="font-mono">drive.file</span> alongside{" "}
                  <span className="font-mono">gmail.compose</span>.
                </>
              ) : (
                <>
                  Set{" "}
                  <span className="font-mono">GOOGLE_DRIVE_STORAGE_ENABLED</span>
                  =true on the server to enable Drive storage.
                </>
              )
            }
            status={driveIntegrationStatus}
            actions={
              driveStatus.status === "needs_scope" ||
              driveStatus.status === "needs_connect" ? (
                <a
                  href="/api/auth/google/start?returnTo=/settings"
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--workspace-text)] transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={ICON.googleDrive}
                    alt=""
                    aria-hidden
                    width={14}
                    height={14}
                  />
                  {driveStatus.status === "needs_connect"
                    ? "Connect Google for Drive"
                    : "Reconnect Google for Drive"}
                </a>
              ) : driveStoredFolders?.rootWebUrl ? (
                <a
                  href={driveStoredFolders.rootWebUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--workspace-text)] transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={ICON.googleDrive}
                    alt=""
                    aria-hidden
                    width={14}
                    height={14}
                  />
                  Open Drive folder
                </a>
              ) : null
            }
          />
        </div>
      </SectionPanel>

      <SectionPanel
        title="Document Processing"
        description="Server-side document tooling. No file is uploaded or processed unless you explicitly trigger an action — page load does not call any provider."
      >
        <IntegrationRow
          iconSrc={ICON.adobe}
          title="Adobe PDF Services"
          description="PDF extraction, OCR, compression, splitting, and document preparation."
          detail={
            adobePdfConfigured ? (
              <>
                Env:{" "}
                <span className="font-mono">ADOBE_PDF_SERVICES_CLIENT_ID</span>
                {" + "}
                <span className="font-mono">
                  ADOBE_PDF_SERVICES_CLIENT_SECRET
                </span>
                {" — Document processing only. Files are not processed automatically."}
              </>
            ) : (
              <>
                Set <span className="font-mono">ADOBE_PDF_SERVICES_CLIENT_ID</span>{" "}
                and{" "}
                <span className="font-mono">
                  ADOBE_PDF_SERVICES_CLIENT_SECRET
                </span>{" "}
                on the server to enable. Document processing only. Files are not
                processed automatically.
              </>
            )
          }
          status={adobePdfConfigured ? "configured" : "not_configured"}
        />
      </SectionPanel>

      <SectionPanel
        title="Data Sources"
        description="Market and property data providers used by the Market Tracker. Configured via server-side environment variables."
      >
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {dataSources.map((ds) => (
            <IntegrationRow
              key={ds.key}
              iconSrc={ds.iconSrc}
              title={ds.title}
              description={ds.description}
              detail={
                <>
                  Env: <span className="font-mono">{ds.env}</span>
                </>
              }
              status={ds.configured ? "configured" : "not_configured"}
            />
          ))}
        </div>
      </SectionPanel>
    </>
  );
}
