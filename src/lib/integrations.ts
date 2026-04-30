export type IntegrationId =
  | "github"
  | "slack"
  | "microsoft_teams"
  | "microsoft_planner"
  | "microsoft_excel"
  | "notion"
  | "midpage";

export type IntegrationCategory =
  | "Communication"
  | "Project tracking"
  | "Documents"
  | "Source control"
  | "Research";

export type IntegrationCapability = {
  label: string;
  description: string;
};

export type IntegrationDefinition = {
  id: IntegrationId;
  name: string;
  vendor: string;
  category: IntegrationCategory;
  summary: string;
  envVars: readonly string[];
  capabilities: readonly IntegrationCapability[];
  docsUrl?: string;
};

export const integrations: readonly IntegrationDefinition[] = [
  {
    id: "github",
    name: "GitHub",
    vendor: "GitHub Inc.",
    category: "Source control",
    summary:
      "Source the renovation project plan, issues, and decision logs from a private GitHub repository.",
    envVars: ["GITHUB_TOKEN", "GITHUB_REPO"],
    capabilities: [
      { label: "Issues", description: "Open issues become tasks." },
      { label: "Releases", description: "Tag milestones with build phases." },
      { label: "Pull requests", description: "Document scope changes." },
    ],
    docsUrl: "https://docs.github.com/en/rest",
  },
  {
    id: "slack",
    name: "Slack",
    vendor: "Slack Technologies",
    category: "Communication",
    summary:
      "Post bid awards, qualification gaps, and inspection events to a project channel.",
    envVars: ["SLACK_BOT_TOKEN", "SLACK_CHANNEL_ID"],
    capabilities: [
      { label: "Send message", description: "Notify the team about awards or blockers." },
      { label: "Read channel", description: "Pull recent decisions for the workbench feed." },
      { label: "Canvases", description: "Maintain a living scope-of-work canvas." },
    ],
    docsUrl: "https://api.slack.com",
  },
  {
    id: "microsoft_teams",
    name: "Microsoft Teams",
    vendor: "Microsoft",
    category: "Communication",
    summary:
      "Sync coordination chats, meeting transcripts, and shared files from a Teams channel.",
    envVars: ["MS_GRAPH_TENANT_ID", "MS_GRAPH_CLIENT_ID", "MS_GRAPH_CLIENT_SECRET"],
    capabilities: [
      { label: "Channel messages", description: "Mirror site-walk recaps." },
      { label: "Meeting transcripts", description: "Index decisions for fast lookup." },
      { label: "Files", description: "Surface drawings and specs." },
    ],
    docsUrl: "https://learn.microsoft.com/en-us/graph/teams-concept-overview",
  },
  {
    id: "microsoft_planner",
    name: "Microsoft Planner",
    vendor: "Microsoft",
    category: "Project tracking",
    summary:
      "Mirror tasks and buckets between Planner and the Walsh Co execution board.",
    envVars: ["MS_GRAPH_TENANT_ID", "MS_GRAPH_CLIENT_ID", "MS_GRAPH_CLIENT_SECRET", "MS_PLANNER_PLAN_ID"],
    capabilities: [
      { label: "List tasks", description: "Two-way sync with the Tasks page." },
      { label: "Create plan", description: "Spin up a board for a new property." },
      { label: "Buckets", description: "Mirror trade phases as buckets." },
    ],
    docsUrl: "https://learn.microsoft.com/en-us/graph/planner-concept-overview",
  },
  {
    id: "microsoft_excel",
    name: "Microsoft Excel",
    vendor: "Microsoft",
    category: "Documents",
    summary:
      "Read and write the master budget workbook on OneDrive without copying numbers around.",
    envVars: ["MS_GRAPH_TENANT_ID", "MS_GRAPH_CLIENT_ID", "MS_GRAPH_CLIENT_SECRET", "MS_EXCEL_FILE_ID"],
    capabilities: [
      { label: "Read rows", description: "Hydrate budget categories from a workbook." },
      { label: "Write cells", description: "Push committed costs back from awarded bids." },
      { label: "Tables", description: "Append paid-to-date entries." },
    ],
    docsUrl: "https://learn.microsoft.com/en-us/graph/api/resources/excel",
  },
  {
    id: "notion",
    name: "Notion",
    vendor: "Notion Labs",
    category: "Documents",
    summary:
      "Sync property pages, meeting notes, and decision databases from a Notion workspace.",
    envVars: ["NOTION_API_KEY", "NOTION_DATABASE_ID"],
    capabilities: [
      { label: "Search", description: "Find a contractor's notes from the command palette." },
      { label: "Database query", description: "Pull a structured punch list." },
      { label: "Page comments", description: "Round-trip site walk feedback." },
    ],
    docsUrl: "https://developers.notion.com",
  },
  {
    id: "midpage",
    name: "Midpage",
    vendor: "Midpage",
    category: "Research",
    summary:
      "Look up case law for permit appeals, contract disputes, or zoning research.",
    envVars: ["MIDPAGE_API_KEY"],
    capabilities: [
      { label: "Search", description: "Search opinions across jurisdictions." },
      { label: "Find in opinion", description: "Locate a clause inside a long opinion." },
      { label: "Analyze opinion", description: "Summarize a holding for a contract memo." },
    ],
  },
] as const;

const integrationsById: Record<IntegrationId, IntegrationDefinition> = Object.fromEntries(
  integrations.map((integration) => [integration.id, integration]),
) as Record<IntegrationId, IntegrationDefinition>;

export function getIntegration(id: IntegrationId): IntegrationDefinition {
  return integrationsById[id];
}

export type IntegrationStatus = {
  id: IntegrationId;
  configured: boolean;
  missing: readonly string[];
};

/**
 * Server-only: inspects environment for required credentials.
 * Never imported from client components.
 */
export function getIntegrationStatus(integration: IntegrationDefinition): IntegrationStatus {
  const missing = integration.envVars.filter((key) => {
    const value = process.env[key];
    return !value || value.trim() === "";
  });
  return {
    id: integration.id,
    configured: missing.length === 0,
    missing,
  };
}

export function getAllIntegrationStatuses(): IntegrationStatus[] {
  return integrations.map(getIntegrationStatus);
}
