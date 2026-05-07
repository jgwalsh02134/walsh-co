"use server";

import {
  generateWorkspaceText,
  generateWorkspaceTextWithWebSearch,
  hasOpenAIKey,
} from "@/lib/openai";

export type MarketNoteProperty = {
  address: string;
  city: string;
  zip: string | null;
  houseValue: string;
  houseSource: string;
  rent: string;
  rentSource: string;
  yieldPct: string;
  refreshed: string;
  verification: string;
};

export type MarketNoteInput = {
  portfolio: {
    businessAssets: number;
    houseValue: string;
    marketRent: string;
    grossRentYield: string;
    completeness: string;
  };
  properties: MarketNoteProperty[];
  attentionItems: string[];
};

export type MarketNoteState = {
  ok: boolean;
  message: string;
  sources?: string[];
};

export async function generateMarketNote(
  input: MarketNoteInput
): Promise<MarketNoteState> {
  return runMarketNote(input, false);
}

export async function generateMarketNoteWithWebSearch(
  input: MarketNoteInput
): Promise<MarketNoteState> {
  return runMarketNote(input, true);
}

async function runMarketNote(
  input: MarketNoteInput,
  webSearch: boolean
): Promise<MarketNoteState> {
  if (!hasOpenAIKey()) {
    return { ok: false, message: "OpenAI API key not configured." };
  }

  const prompt = [
    "Create a short internal market note for the J.G. Walsh & Co. Market Tracker.",
    "Use only the supplied portfolio/property data unless web search is explicitly enabled.",
    "Do not call this an appraisal. Do not make legal, zoning, or financial conclusions.",
    "Structure: portfolio read, property notes, attention items, confidence caveats, recommended next checks.",
    "Keep it under 220 words.",
    "",
    JSON.stringify(input, null, 2),
  ].join("\n");

  try {
    if (webSearch) {
      const result = await generateWorkspaceTextWithWebSearch({
        prompt:
          prompt +
          "\nIf web search is useful, use it only for broad current mortgage/rate context and cite sources.",
      });

      return {
        ok: true,
        message: result.outputText || "OpenAI returned no note text.",
        sources: result.sources,
      };
    }

    const result = await generateWorkspaceText({ prompt });

    return {
      ok: true,
      message: result.outputText || "OpenAI returned no note text.",
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? `AI market note failed: ${error.message.slice(0, 220)}`
          : "AI market note failed.",
    };
  }
}
