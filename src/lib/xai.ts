/**
 * Server-only xAI / Grok helper.
 *
 * Mirrors the public surface of src/lib/openai.ts so the Market Tracker
 * server actions can route between providers behind a uniform API.
 *
 * Configuration:
 *   - XAI_API_KEY  (required)
 *   - XAI_MODEL    (default: grok-4.3)
 *   - XAI_BASE_URL (default: https://api.x.ai/v1)
 *
 * xAI exposes an OpenAI-compatible Responses API at the configured base
 * URL, so we reuse the installed `openai` SDK and only swap baseURL +
 * apiKey rather than adding a new dependency.
 *
 * Web search uses the Responses API tool `web_search`. Internal generation
 * uses the same Responses API without tools. X-search is exposed as an
 * optional helper but is NOT wired into the user-facing UI in this pass —
 * adding a button without a clear UX would introduce dead-ends.
 */

import OpenAI from "openai";
import type { Response } from "openai/resources/responses/responses";

if (typeof window !== "undefined") {
  throw new Error(
    "src/lib/xai.ts is server-only and must not be imported on the client."
  );
}

const DEFAULT_MODEL = "grok-4.3";
const DEFAULT_BASE_URL = "https://api.x.ai/v1";
const MAX_OUTPUT_TOKENS = 700;

let client: OpenAI | null = null;
let cachedKeyForClient: string | null = null;
let cachedBaseUrlForClient: string | null = null;

export type XaiTextInput = {
  prompt: string;
  instructions?: string;
};

export type XaiTextResult = {
  outputText: string;
};

export type XaiSearchResult = XaiTextResult & {
  sources: string[];
};

export function hasXaiKey(): boolean {
  return Boolean(process.env.XAI_API_KEY?.trim());
}

export function xaiModelName(): string {
  return process.env.XAI_MODEL?.trim() || DEFAULT_MODEL;
}

export function xaiBaseUrl(): string {
  return process.env.XAI_BASE_URL?.trim() || DEFAULT_BASE_URL;
}

export function getXaiClient(): OpenAI {
  const apiKey = process.env.XAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("XAI_API_KEY is not configured.");
  }
  const baseURL = xaiBaseUrl();
  if (!client || cachedKeyForClient !== apiKey || cachedBaseUrlForClient !== baseURL) {
    client = new OpenAI({ apiKey, baseURL });
    cachedKeyForClient = apiKey;
    cachedBaseUrlForClient = baseURL;
  }
  return client;
}

// ---------- Internal generation (no tools) ----------

export async function generateXaiMarketText(
  input: XaiTextInput | string
): Promise<XaiTextResult> {
  const normalized = normalizeInput(input);
  const response = await getXaiClient().responses.create({
    model: xaiModelName(),
    instructions: normalized.instructions ?? defaultInstructions(),
    input: normalized.prompt,
    max_output_tokens: MAX_OUTPUT_TOKENS,
    store: false,
  });

  return { outputText: outputText(response) };
}

// ---------- Web research ----------

export async function generateXaiMarketTextWithWebSearch(
  input: XaiTextInput | string
): Promise<XaiSearchResult> {
  return runResponsesWithTool(input, "web_search");
}

/**
 * Property research is the same Responses-API + web_search call; the
 * caller injects the property context into the prompt. This export
 * exists so server actions can route by intent rather than by tool
 * name.
 */
export async function generateXaiPropertyResearch(
  input: XaiTextInput | string
): Promise<XaiSearchResult> {
  return runResponsesWithTool(input, "web_search");
}

/**
 * Optional X-search helper. Not wired into the UI — exposed so that
 * server-side experiments can opt in without spreading the cast.
 */
export async function generateXaiMarketTextWithXSearch(
  input: XaiTextInput | string
): Promise<XaiSearchResult> {
  return runResponsesWithTool(input, "x_search");
}

// ---------- Internals ----------

type XaiToolName = "web_search" | "x_search";

async function runResponsesWithTool(
  input: XaiTextInput | string,
  toolName: XaiToolName
): Promise<XaiSearchResult> {
  const normalized = normalizeInput(input);

  // The OpenAI SDK's typed `tools` array uses OpenAI's tool registry
  // (web_search, file_search, etc.). xAI accepts the same JSON shape at
  // the wire level, but the union type does not declare every xAI tool.
  // Cast narrowly here, with a matching comment, to avoid a broad `any`.
  const tools = [{ type: toolName }] as unknown as Parameters<
    OpenAI["responses"]["create"]
  >[0]["tools"];

  const response = await getXaiClient().responses.create({
    model: xaiModelName(),
    instructions:
      normalized.instructions ??
      `${defaultInstructions()} Cite public sources when search is used.`,
    input: normalized.prompt,
    max_output_tokens: MAX_OUTPUT_TOKENS,
    store: false,
    tools,
    tool_choice: "auto",
  });

  return {
    outputText: outputText(response),
    sources: sourceUrls(response),
  };
}

function defaultInstructions(): string {
  return [
    "You are an internal AI assistant for J.G. Walsh & Co.",
    "Keep responses concise, practical, and clearly labeled as AI-generated internal assistance.",
    "Do not provide legal, tax, zoning, appraisal, or investment conclusions.",
    "Do not reveal hidden reasoning or chain-of-thought.",
  ].join(" ");
}

function normalizeInput(input: XaiTextInput | string): XaiTextInput {
  if (typeof input === "string") return { prompt: input };
  return input;
}

function outputText(response: Response): string {
  return response.output_text?.trim() || "";
}

/**
 * Extract URL citations + tool-call source URLs from a Responses-API
 * response. Defensive against partial/unknown shapes returned by xAI.
 */
function sourceUrls(response: Response): string[] {
  const urls = new Set<string>();

  for (const item of response.output ?? []) {
    if (item.type === "message") {
      for (const part of item.content ?? []) {
        if (part.type !== "output_text") continue;
        for (const annotation of part.annotations ?? []) {
          if (annotation.type === "url_citation") urls.add(annotation.url);
        }
      }
      continue;
    }

    // Best-effort extraction from any tool-call style item: web_search,
    // x_search, or future variants. The OpenAI SDK types only declare a
    // subset, so we read structurally rather than by tagged type.
    const candidate = item as unknown as {
      type?: string;
      action?: {
        type?: string;
        url?: string;
        sources?: Array<{ url?: string }>;
      };
    };
    const action = candidate.action;
    if (!action) continue;
    if (Array.isArray(action.sources)) {
      for (const source of action.sources) {
        if (source?.url) urls.add(source.url);
      }
    }
    if (typeof action.url === "string" && action.url.length > 0) {
      urls.add(action.url);
    }
  }

  return Array.from(urls);
}
