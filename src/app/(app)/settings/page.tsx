import { PageHeader } from "@/components/page-header";
import { SectionPanel } from "@/components/section-panel";
import { hasAttomKey } from "@/lib/attom";
import { hasCensusKey } from "@/lib/census";
import { hasFredKey } from "@/lib/fred";
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
  // Data source icons aren't bundled yet — fall back to a neutral
  // workspace glyph and let the title + status chip carry meaning.
  dataSource: "/icons/workspace/market-1.svg",
  googleMaps: "/icons/workspace/icons8-google-maps.svg",
} as const;

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
        <GmailIntegrationCard
          clientConfigured={googleClientConfigured}
          draftsEnabled={gmailDraftsEnabled}
          connected={gmailConnected}
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
