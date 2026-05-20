"use server";

import {
  getAiProvider,
  type AiProviderName,
} from "@/lib/ai";

export type XaiTestState = {
  ok: boolean;
  message: string;
  sources?: string[];
  provider: "Grok";
};

function getXai() {
  return getAiProvider("xai");
}

export async function testXaiConnection(): Promise<XaiTestState> {
  const provider = getXai();
  if (!provider.hasKey()) {
    return { ok: false, message: "xAI API key not configured.", provider: "Grok" };
  }

  try {
    const result = await provider.generateText({
      prompt:
        "Reply in one short sentence confirming the J.G. Walsh & Co. workspace AI helper (Grok) is available.",
    });
    return {
      ok: true,
      message:
        result.outputText || "Grok responded, but no text was returned.",
      provider: "Grok",
    };
  } catch (error) {
    return {
      ok: false,
      message: providerErrorMessage(error),
      provider: "Grok",
    };
  }
}

export async function testXaiWebSearch(): Promise<XaiTestState> {
  const provider = getXai();
  if (!provider.hasKey()) {
    return { ok: false, message: "xAI API key not configured.", provider: "Grok" };
  }

  try {
    const result = await provider.generateWithWebSearch({
      prompt:
        "Find one current public source about mortgage rates in the Capital Region of New York and summarize it in one sentence.",
    });
    return {
      ok: true,
      message:
        result.outputText || "Grok responded, but no text was returned.",
      sources: result.sources,
      provider: "Grok",
    };
  } catch (error) {
    return {
      ok: false,
      message: providerErrorMessage(error),
      provider: "Grok",
    };
  }
}

function providerErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return `Grok request failed: ${error.message.slice(0, 240)}`;
  }
  return "Grok request failed.";
}
