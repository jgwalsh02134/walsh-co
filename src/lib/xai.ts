/**
 * Server-only xAI / Grok helper.
 *
 * Mirrors the public surface of src/lib/openai.ts so the Market Tracker
 * server actions can route between providers behind a uniform API.
 *
 * - XAI_API_KEY  (required)
 * - XAI_MODEL    (default: grok-4.3)
 * - XAI_BASE_URL (default: https://api.x.ai/v1)
 *
 * xAI exposes an OpenAI-compatible chat-completions API, so we reuse the
 * installed openai SDK with a different baseURL + apiKey rather than
 * adding a new dependency.
 *
 * Web/search mode is intentionally NOT wired in this pass — xAI Live
 * Search uses a non-OpenAI `search_parameters` body that the SDK does
 * not type, and the spec instructs us to return a clear "not wired"
 * state rather than fake citations.
 */

import OpenAI from "openai";

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
  /** Always [] in this revision — xAI search is not wired yet. */
  sources: string[];
  /** True when the call returned a "not wired" stub instead of generation. */
  notWired?: boolean;
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

export async function generateXaiMarketText(
  input: XaiTextInput | string
): Promise<XaiTextResult> {
  const normalized = normalizeInput(input);

  const completion = await getXaiClient().chat.completions.create({
    model: xaiModelName(),
    messages: [
      {
        role: "system",
        content: normalized.instructions ?? defaultInstructions(),
      },
      { role: "user", content: normalized.prompt },
    ],
    max_tokens: MAX_OUTPUT_TOKENS,
  });

  const outputText = completion.choices?.[0]?.message?.content?.trim() ?? "";
  return { outputText };
}

/**
 * xAI search mode — NOT WIRED in this revision.
 *
 * Returns a clearly-labelled stub instead of fabricating results. Callers
 * surface the message via the existing MarketNoteState shape.
 */
export async function generateXaiMarketTextWithSearch(
  _input: XaiTextInput | string
): Promise<XaiSearchResult> {
  return {
    outputText:
      "xAI web/search mode is not wired yet. Use OpenAI for web research, or run the xAI internal summary instead.",
    sources: [],
    notWired: true,
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
