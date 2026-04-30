import {
  getIntegration,
  getIntegrationStatus,
  type IntegrationId,
} from "./integrations";

export class IntegrationNotConfiguredError extends Error {
  readonly id: IntegrationId;
  readonly missing: readonly string[];

  constructor(id: IntegrationId, missing: readonly string[]) {
    super(
      `Integration "${id}" is not configured. Missing env vars: ${missing.join(", ")}.`,
    );
    this.id = id;
    this.missing = missing;
    this.name = "IntegrationNotConfiguredError";
  }
}

export function ensureConfigured(id: IntegrationId): void {
  const integration = getIntegration(id);
  const status = getIntegrationStatus(integration);
  if (!status.configured) {
    throw new IntegrationNotConfiguredError(id, status.missing);
  }
}

/**
 * Server-only: each adapter is a thin wrapper around an external API.
 * They throw IntegrationNotConfiguredError when credentials are missing,
 * which the route handlers translate into 501 Not Implemented.
 *
 * Real network calls live behind the credential check so a misconfigured
 * environment fails fast rather than leaking partial requests.
 */
export const adapters = {
  async slackPostMessage(input: { text: string; channelId?: string }) {
    ensureConfigured("slack");
    const channel = input.channelId ?? process.env.SLACK_CHANNEL_ID!;
    const res = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
        "content-type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({ channel, text: input.text }),
    });
    return (await res.json()) as { ok: boolean; ts?: string; error?: string };
  },

  async notionSearch(query: string) {
    ensureConfigured("notion");
    const res = await fetch("https://api.notion.com/v1/search", {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.NOTION_API_KEY}`,
        "notion-version": "2022-06-28",
        "content-type": "application/json",
      },
      body: JSON.stringify({ query, page_size: 10 }),
    });
    return (await res.json()) as { results: unknown[] };
  },

  async githubListIssues() {
    ensureConfigured("github");
    const repo = process.env.GITHUB_REPO!;
    const res = await fetch(`https://api.github.com/repos/${repo}/issues?state=open`, {
      headers: {
        authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        accept: "application/vnd.github+json",
      },
    });
    return (await res.json()) as Array<{ number: number; title: string; html_url: string }>;
  },
} as const;
