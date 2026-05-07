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
  houseRange: string;
  rent: string;
  rentSource: string;
  rentRange: string;
  yieldPct: string;
  refreshed: string;
  verification: string;
  zillowTrend: {
    latest: string;
    change1Y: string;
    change3Y: string;
    change5Y: string;
    asOf: string;
  };
  comps: {
    saleCount: number;
    rentalCount: number;
  };
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
  sources?: AiSource[];
};

export type AiSource = {
  title: string;
  url: string;
  domain: string;
  usedFor?: string;
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
    "Return Markdown only, using this structure:",
    "# Market Note",
    "## Executive Takeaway",
    "- 2-3 bullets max.",
    "## Property Value Signal",
    "- House value by source, range/confidence, and source disagreement if visible.",
    "## Rent Signal",
    "- Current market rent and rent range/comps if available.",
    "## Evidence",
    "- RentCast comps, ATTOM verification, Zillow ZIP trend, and FRED macro context if relevant.",
    "## Risks / Missing Data",
    "- Missing assessment/tax, acquisition basis, stale snapshots, unknown condition/renovation scope.",
    "## Next Checks",
    "- 3-5 concise actionable checks.",
    "## Sources",
    "- Compact internal/provider source list. Use [1], [2] markers only when web search is enabled.",
    "Keep the whole note concise.",
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
        sources: normalizeAiSources(
          result.sources,
          "Current macro / mortgage-rate context"
        ),
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
    "Return Markdown only, using this structure:",
    "# Market Note",
    "## Executive Takeaway",
    "- 2-3 bullets max.",
    "## Property Value Signal",
    "- House value by source, range/confidence, and source disagreement if visible.",
    "## Rent Signal",
    "- Current market rent and rent range/comps if available.",
    "## Evidence",
    "- RentCast comps, ATTOM verification, Zillow ZIP trend, and FRED macro context if relevant.",
    "## Risks / Missing Data",
    "- Missing assessment/tax, acquisition basis, stale snapshots, unknown condition/renovation scope.",
    "## Next Checks",
    "- 3-5 concise actionable checks.",
    "## Sources",
    "- Compact internal/provider source list. Use [1], [2] markers only when web search is enabled.",
    "Keep the whole note concise.",
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
        sources: normalizeAiSources(
          result.sources,
          "Current ZIP / macro market context"
        ),
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

function normalizeAiSources(urls: string[], usedFor: string): AiSource[] {
  const seen = new Set<string>();
  const sources: AiSource[] = [];

  for (const url of urls) {
    if (!url || seen.has(url)) continue;
    seen.add(url);
    let domain = "source";
    try {
      domain = new URL(url).hostname.replace(/^www\./, "");
    } catch {
      domain = "source";
    }
    sources.push({
      title: domain,
      domain,
      url,
      usedFor,
    });
  }

  return sources;
}
