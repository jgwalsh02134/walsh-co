import OpenAI from "openai";
import type { Response } from "openai/resources/responses/responses";

if (typeof window !== "undefined") {
  throw new Error(
    "src/lib/openai.ts is server-only and must not be imported on the client."
  );
}

const DEFAULT_MODEL = "gpt-5.1";
const MAX_OUTPUT_TOKENS = 700;

let client: OpenAI | null = null;

export type WorkspaceTextInput = {
  prompt: string;
  instructions?: string;
};

export type WorkspaceTextResult = {
  outputText: string;
};

export type WorkspaceWebSearchResult = WorkspaceTextResult & {
  sources: string[];
};

export function hasOpenAIKey(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }
  client ??= new OpenAI({ apiKey });
  return client;
}

export async function generateWorkspaceText(
  input: WorkspaceTextInput | string
): Promise<WorkspaceTextResult> {
  const normalized = normalizeInput(input);
  const response = await getOpenAIClient().responses.create({
    model: modelName(),
    instructions: normalized.instructions ?? defaultInstructions(),
    input: normalized.prompt,
    reasoning: { effort: "none" },
    max_output_tokens: MAX_OUTPUT_TOKENS,
    store: false,
  });

  return { outputText: outputText(response) };
}

export async function generateWorkspaceTextWithWebSearch(
  input: WorkspaceTextInput | string
): Promise<WorkspaceWebSearchResult> {
  const normalized = normalizeInput(input);
  const response = await getOpenAIClient().responses.create({
    model: modelName(),
    instructions:
      normalized.instructions ??
      `${defaultInstructions()} Cite public sources when web search is used.`,
    input: normalized.prompt,
    reasoning: { effort: "none" },
    max_output_tokens: MAX_OUTPUT_TOKENS,
    tools: [{ type: "web_search" }],
    tool_choice: "auto",
    include: ["web_search_call.action.sources"],
    store: false,
  });

  return {
    outputText: outputText(response),
    sources: sourceUrls(response),
  };
}

function modelName(): string {
  return process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL;
}

function defaultInstructions(): string {
  return [
    "You are an internal AI assistant for J.G. Walsh & Co.",
    "Keep responses concise, practical, and clearly labeled as AI-generated internal assistance.",
    "Do not provide legal or financial conclusions. When discussing current public facts, use citations or say when sources are unavailable.",
    "Do not reveal hidden reasoning or chain-of-thought.",
  ].join(" ");
}

function normalizeInput(input: WorkspaceTextInput | string): WorkspaceTextInput {
  if (typeof input === "string") return { prompt: input };
  return input;
}

function outputText(response: Response): string {
  return response.output_text?.trim() || "";
}

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
    }

    if (item.type === "web_search_call") {
      if (item.action.type === "search") {
        for (const source of item.action.sources ?? []) {
          urls.add(source.url);
        }
      } else if (item.action.type === "open_page" && item.action.url) {
        urls.add(item.action.url);
      } else if (item.action.type === "find_in_page") {
        urls.add(item.action.url);
      }
    }
  }

  return Array.from(urls);
}
