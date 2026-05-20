/**
 * Unified AI provider abstraction for J.G. Walsh & Co. Workspace.
 *
 * Goals:
 * - Single place to add / swap providers (OpenAI, xAI/Grok, future others)
 * - Eliminate ~70% duplicated logic between openai.ts and xai.ts
 * - Make provider choice a first-class, consistent capability across the app
 * - Preserve the excellent server-only safety discipline
 *
 * Design:
 * - `AiProvider` interface with the three operations we actually use today
 * - `getAiProvider(name)` + `getDefaultAiProvider()` factory
 * - Shared instruction text, response normalization, and source extraction
 * - Call sites can stay on the old named exports during migration, then move to
 *   the provider objects or thin router helpers.
 */

import OpenAI from "openai";
import type { Response } from "openai/resources/responses/responses";

if (typeof window !== "undefined") {
  throw new Error("src/lib/ai.ts is server-only and must not be imported on the client.");
}

// -----------------------------------------------------------------------------
// Public types (stable surface for the rest of the app)
// -----------------------------------------------------------------------------

export type AiProviderName = "openai" | "xai";

export interface AiTextInput {
  prompt: string;
  instructions?: string;
}

export interface AiTextResult {
  outputText: string;
}

export interface AiWebSearchResult extends AiTextResult {
  sources: string[];
}

export interface AiJsonResult extends AiTextResult {}

export interface AiProvider {
  readonly name: AiProviderName;
  readonly label: string; // "OpenAI" | "Grok"
  readonly model: string;

  hasKey(): boolean;

  /** Plain text generation (no tools) */
  generateText(input: AiTextInput): Promise<AiTextResult>;

  /** Text + web_search tool + source citations */
  generateWithWebSearch(input: AiTextInput): Promise<AiWebSearchResult>;

  /**
   * Constrained JSON object generation.
   * Only OpenAI currently offers first-class JSON mode in the Responses API.
   * xAI path falls back to text + tolerant parsing (same behavior as before).
   */
  generateJsonObject?(
    input: AiTextInput,
    options?: { maxOutputTokens?: number }
  ): Promise<AiJsonResult>;
}

// -----------------------------------------------------------------------------
// Shared constants & helpers (single source of truth)
// -----------------------------------------------------------------------------

const DEFAULT_OPENAI_MODEL = "gpt-5.1";
const DEFAULT_XAI_MODEL = "grok-4.3";
const DEFAULT_XAI_BASE_URL = "https://api.x.ai/v1";

const MAX_OUTPUT_TOKENS = 700;
const MAX_JSON_OUTPUT_TOKENS = 4000;

function defaultWorkspaceInstructions(provider: AiProviderName): string {
  const base = [
    "You are an internal AI assistant for J.G. Walsh & Co.",
    "Keep responses concise, practical, and clearly labeled as AI-generated internal assistance.",
    "Do not provide legal, tax, zoning, appraisal, or investment conclusions.",
    "Do not reveal hidden reasoning or chain-of-thought.",
  ].join(" ");

  // Slight wording tuning per historical behavior
  if (provider === "xai") {
    return base.replace("legal, tax, zoning, appraisal, or investment", "legal, tax, zoning, appraisal, or investment");
  }
  return base;
}

// -----------------------------------------------------------------------------
// OpenAI implementation (primary)
// -----------------------------------------------------------------------------

class OpenAIProvider implements AiProvider {
  readonly name = "openai" as const;
  readonly label = "OpenAI";
  private client: OpenAI | null = null;

  get model(): string {
    return process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL;
  }

  hasKey(): boolean {
    return Boolean(process.env.OPENAI_API_KEY?.trim());
  }

  private getClient(): OpenAI {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");
    if (!this.client) {
      this.client = new OpenAI({ apiKey });
    }
    return this.client;
  }

  async generateText(input: AiTextInput): Promise<AiTextResult> {
    const client = this.getClient();
    const response = await client.responses.create({
      model: this.model,
      instructions: input.instructions ?? defaultWorkspaceInstructions("openai"),
      input: input.prompt,
      reasoning: { effort: "none" },
      max_output_tokens: MAX_OUTPUT_TOKENS,
      store: false,
    });
    return { outputText: (response as any).output_text?.trim() || "" };
  }

  async generateWithWebSearch(input: AiTextInput): Promise<AiWebSearchResult> {
    const client = this.getClient();
    const response = await client.responses.create({
      model: this.model,
      instructions:
        input.instructions ??
        `${defaultWorkspaceInstructions("openai")} Cite public sources when web search is used.`,
      input: input.prompt,
      reasoning: { effort: "none" },
      max_output_tokens: MAX_OUTPUT_TOKENS,
      tools: [{ type: "web_search" }],
      tool_choice: "auto",
      include: ["web_search_call.action.sources"],
      store: false,
    });
    return {
      outputText: (response as any).output_text?.trim() || "",
      sources: extractSourceUrls(response as Response),
    };
  }

  async generateJsonObject(
    input: AiTextInput,
    options: { maxOutputTokens?: number } = {}
  ): Promise<AiJsonResult> {
    const client = this.getClient();
    const response = await client.responses.create({
      model: this.model,
      instructions: input.instructions ?? defaultWorkspaceInstructions("openai"),
      input: input.prompt,
      reasoning: { effort: "none" },
      max_output_tokens: options.maxOutputTokens ?? MAX_JSON_OUTPUT_TOKENS,
      store: false,
      text: { format: { type: "json_object" } },
    });
    return { outputText: (response as any).output_text?.trim() || "" };
  }
}

// -----------------------------------------------------------------------------
// xAI / Grok implementation (OpenAI-compatible Responses API)
// -----------------------------------------------------------------------------

class XaiProvider implements AiProvider {
  readonly name = "xai" as const;
  readonly label = "Grok";
  private client: OpenAI | null = null;
  private cachedKey: string | null = null;
  private cachedBase: string | null = null;

  get model(): string {
    return process.env.XAI_MODEL?.trim() || DEFAULT_XAI_MODEL;
  }

  get baseUrl(): string {
    return process.env.XAI_BASE_URL?.trim() || DEFAULT_XAI_BASE_URL;
  }

  hasKey(): boolean {
    return Boolean(process.env.XAI_API_KEY?.trim());
  }

  private getClient(): OpenAI {
    const apiKey = process.env.XAI_API_KEY?.trim();
    if (!apiKey) throw new Error("XAI_API_KEY is not configured.");
    const baseURL = this.baseUrl;

    if (
      !this.client ||
      this.cachedKey !== apiKey ||
      this.cachedBase !== baseURL
    ) {
      this.client = new OpenAI({ apiKey, baseURL });
      this.cachedKey = apiKey;
      this.cachedBase = baseURL;
    }
    return this.client;
  }

  async generateText(input: AiTextInput): Promise<AiTextResult> {
    const client = this.getClient();
    const response = await client.responses.create({
      model: this.model,
      instructions: input.instructions ?? defaultWorkspaceInstructions("xai"),
      input: input.prompt,
      max_output_tokens: MAX_OUTPUT_TOKENS,
      store: false,
    });
    return { outputText: (response as any).output_text?.trim() || "" };
  }

  async generateWithWebSearch(input: AiTextInput): Promise<AiWebSearchResult> {
    return this.runWithTool(input, "web_search");
  }

  // Exposed for future "x_search" experiments (not yet surfaced in UI)
  async generateWithXSearch(input: AiTextInput): Promise<AiWebSearchResult> {
    return this.runWithTool(input, "x_search");
  }

  private async runWithTool(
    input: AiTextInput,
    toolName: "web_search" | "x_search"
  ): Promise<AiWebSearchResult> {
    const client = this.getClient();
    const tools = [{ type: toolName }] as any; // cast because SDK types lag xAI tool names

    const response = await client.responses.create({
      model: this.model,
      instructions:
        input.instructions ??
        `${defaultWorkspaceInstructions("xai")} Cite public sources when search is used.`,
      input: input.prompt,
      max_output_tokens: MAX_OUTPUT_TOKENS,
      store: false,
      tools,
      tool_choice: "auto",
    });

    return {
      outputText: (response as any).output_text?.trim() || "",
      sources: extractSourceUrlsXai(response as Response),
    };
  }
}

// -----------------------------------------------------------------------------
// Source extraction helpers (consolidated from the two previous files)
// -----------------------------------------------------------------------------

function extractSourceUrls(response: Response): string[] {
  const urls = new Set<string>();
  for (const item of (response as any).output ?? []) {
    if (item.type === "message") {
      for (const part of item.content ?? []) {
        if (part.type !== "output_text") continue;
        for (const ann of part.annotations ?? []) {
          if (ann.type === "url_citation") urls.add(ann.url);
        }
      }
    }
    if (item.type === "web_search_call") {
      const action = item.action;
      if (action?.type === "search") {
        for (const s of action.sources ?? []) urls.add(s.url);
      } else if (action?.url) {
        urls.add(action.url);
      }
    }
  }
  return Array.from(urls);
}

function extractSourceUrlsXai(response: Response): string[] {
  // More defensive extraction for xAI (unknown tool shapes)
  const urls = new Set<string>();
  for (const item of (response as any).output ?? []) {
    if (item.type === "message") {
      for (const part of item.content ?? []) {
        if (part.type !== "output_text") continue;
        for (const ann of part.annotations ?? []) {
          if (ann.type === "url_citation") urls.add(ann.url);
        }
      }
      continue;
    }
    const candidate = item as any;
    const action = candidate.action;
    if (!action) continue;
    if (Array.isArray(action.sources)) {
      for (const s of action.sources) if (s?.url) urls.add(s.url);
    }
    if (typeof action.url === "string" && action.url) urls.add(action.url);
  }
  return Array.from(urls);
}

// -----------------------------------------------------------------------------
// Factory & registry
// -----------------------------------------------------------------------------

const providers = new Map<AiProviderName, AiProvider>();

function getOpenAIProvider(): AiProvider {
  if (!providers.has("openai")) providers.set("openai", new OpenAIProvider());
  return providers.get("openai")!;
}

function getXaiProvider(): AiProvider {
  if (!providers.has("xai")) providers.set("xai", new XaiProvider());
  return providers.get("xai")!;
}

export function getAiProvider(name: AiProviderName): AiProvider {
  if (name === "openai") return getOpenAIProvider();
  if (name === "xai") return getXaiProvider();
  throw new Error(`Unknown AI provider: ${name}`);
}

export function getDefaultAiProvider(): AiProvider {
  // Prefer OpenAI when both are configured; fall back to xAI if only xAI is present
  if (getOpenAIProvider().hasKey()) return getOpenAIProvider();
  if (getXaiProvider().hasKey()) return getXaiProvider();
  return getOpenAIProvider(); // will throw on first use — same behavior as before
}

export function hasAiKey(name: AiProviderName): boolean {
  return getAiProvider(name).hasKey();
}

export function isAnyAiProviderConfigured(): boolean {
  return getOpenAIProvider().hasKey() || getXaiProvider().hasKey();
}

// -----------------------------------------------------------------------------
// Convenience re-exports for incremental migration (stable names)
// These will eventually point at the router, but for now they preserve
// the exact call signatures used across the codebase.
// -----------------------------------------------------------------------------

export { hasOpenAIKey, generateWorkspaceText, generateWorkspaceTextWithWebSearch, generateWorkspaceJsonObject } from "./openai";
export { hasXaiKey, xaiModelName, generateXaiMarketText, generateXaiMarketTextWithWebSearch, generateXaiPropertyResearch } from "./xai";

// Note: The re-exports above keep every existing import working without changes.
// Future work can migrate call sites to `getAiProvider("openai").generateText(...)`
// or to new thin router helpers when we want to centralize dispatch + logging.