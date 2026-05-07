"use server";

import {
  generateWorkspaceText,
  generateWorkspaceTextWithWebSearch,
  hasOpenAIKey,
} from "@/lib/openai";

export type OpenAITestState = {
  ok: boolean;
  message: string;
  sources?: string[];
};

export async function testOpenAIConnection(): Promise<OpenAITestState> {
  if (!hasOpenAIKey()) {
    return { ok: false, message: "OpenAI API key not configured." };
  }

  try {
    const result = await generateWorkspaceText({
      prompt:
        "Reply in one short sentence confirming the J.G. Walsh & Co. workspace AI helper is available.",
    });
    return {
      ok: true,
      message:
        result.outputText || "OpenAI responded, but no text was returned.",
    };
  } catch (error) {
    return { ok: false, message: providerErrorMessage(error) };
  }
}

export async function testOpenAIWebSearch(): Promise<OpenAITestState> {
  if (!hasOpenAIKey()) {
    return { ok: false, message: "OpenAI API key not configured." };
  }

  try {
    const result = await generateWorkspaceTextWithWebSearch({
      prompt:
        "Find one current public source about mortgage rates and summarize it in one sentence.",
    });
    return {
      ok: true,
      message:
        result.outputText || "OpenAI responded, but no text was returned.",
      sources: result.sources,
    };
  } catch (error) {
    return { ok: false, message: providerErrorMessage(error) };
  }
}

function providerErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return `OpenAI request failed: ${error.message.slice(0, 240)}`;
  }
  return "OpenAI request failed.";
}
