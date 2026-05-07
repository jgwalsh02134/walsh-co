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
    "Create a short internal market analysis for the J.G. Walsh & Co. Market Tracker.",
    "Use only the supplied portfolio/property data unless web search is explicitly enabled.",
    "Do not call this an appraisal. Do not make legal, zoning, or financial conclusions.",
    "Structure with clearly-labeled sections:",
    "  • Market value summary",
    "  • Rent summary",
    "  • Source confidence",
    "  • Attention items",
    "  • Suggested next checks",
    "  • Caveats",
    "Use plain text. Keep the whole note under 240 words.",
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

// =============================================================
// Per-property AI analysis
// =============================================================

export type PropertyNoteInput = {
  property: {
    address: string;
    city: string;
    zip: string | null;
    role: string;
    isPrivate: boolean;
  };
  houseValue: {
    value: string;
    source: string;
    range: string;
    confidence: string;
    asOf: string;
  };
  marketRent: {
    rent: string;
    source: string;
    range: string;
    asOf: string;
  };
  yieldPct: string;
  verification: string;
  zipTrend: {
    zip: string | null;
    latest: string;
    change1Y: string;
    change3Y: string;
    change5Y: string;
    asOf: string;
  };
  attomFacts: {
    apn: string;
    yearBuilt: string;
    sqft: string;
    assessed: string;
    annualTaxes: string;
    lastSale: string;
  };
  comps: {
    saleCount: number;
    rentalCount: number;
    saleSummary: string[];
    rentalSummary: string[];
  };
  attentionItems: string[];
};

export async function generatePropertyAnalysis(
  input: PropertyNoteInput
): Promise<MarketNoteState> {
  return runPropertyAnalysis(input, false);
}

export async function generatePropertyAnalysisWithWebSearch(
  input: PropertyNoteInput
): Promise<MarketNoteState> {
  return runPropertyAnalysis(input, true);
}

async function runPropertyAnalysis(
  input: PropertyNoteInput,
  webSearch: boolean
): Promise<MarketNoteState> {
  if (!hasOpenAIKey()) {
    return { ok: false, message: "OpenAI API key not configured." };
  }

  const prompt = [
    "Create an internal property analysis for the J.G. Walsh & Co. Market Tracker.",
    "Use only the supplied property data unless web search is explicitly enabled.",
    "Do not call this an appraisal. Do not make legal, zoning, or financial conclusions.",
    "Be concrete and reference the supplied numbers.",
    "Structure with clearly-labeled sections:",
    "  • Market value summary",
    "  • Rent summary",
    "  • Source confidence",
    "  • Attention items",
    "  • Suggested next checks",
    "  • Caveats",
    "Use plain text. Keep the whole note under 220 words.",
    "",
    JSON.stringify(input, null, 2),
  ].join("\n");

  try {
    if (webSearch) {
      const result = await generateWorkspaceTextWithWebSearch({
        prompt:
          prompt +
          "\nIf web search is useful, use it only for broad current mortgage/rate context for the ZIP and cite sources.",
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
          ? `AI property analysis failed: ${error.message.slice(0, 220)}`
          : "AI property analysis failed.",
    };
  }
}
