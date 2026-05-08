"use server";

import {
  generateWorkspaceText,
  generateWorkspaceTextWithWebSearch,
  hasOpenAIKey,
} from "@/lib/openai";
import {
  generateXaiMarketText,
  generateXaiMarketTextWithWebSearch,
  generateXaiPropertyResearch,
  hasXaiKey,
} from "@/lib/xai";

// =============================================================
// Public types
// =============================================================

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

export type AiSource = {
  title: string;
  url: string;
  domain: string;
  usedFor?: string;
};

export type MarketNoteMode = "internal" | "web" | "property";

export type AiProvider = "openai" | "xai";

export type MarketNoteState = {
  ok: boolean;
  message: string;
  sources?: AiSource[];
  /** Mode badge displayed at the top of the rendered note. */
  modeLabel?: string;
  /** Provider that produced this note. */
  providerLabel?: "OpenAI" | "Grok";
  /** True when this mode would normally return citations. The renderer
   *  uses this to show "No external sources returned by provider" inside
   *  the sources block when `sources` comes back empty, instead of
   *  silently hiding the block. */
  expectedSources?: boolean;
};

/** Server-side check used by the page to gate the Grok provider option. */
export async function isXaiProviderAvailable(): Promise<boolean> {
  return hasXaiKey();
}

// =============================================================
// Shared safety / behaviour clauses
// =============================================================

const SAFETY_CLAUSE = [
  "Do not call this an appraisal.",
  "Do not give legal, tax, zoning, or financial conclusions.",
  "Do not invent values that are not in the supplied data or the cited sources.",
  "Use Markdown only. Do not include a meta-preamble; start with the heading specified.",
].join(" ");

const NO_PARROT_CLAUSE = [
  "You are NOT being asked to repeat the dashboard.",
  "The dashboard already shows RentCast, ATTOM, Zillow ZHVI, FRED, Google Maps, Census ACS, and manual values.",
  "Use those values only as context.",
  "Return only NEW insights, source conflicts, missing-data warnings, and next checks.",
  "If a value already shown on the dashboard is restated, it must be to flag a conflict, corroboration, or staleness — never as decoration.",
].join(" ");

const PREFERRED_SOURCES = [
  "Prefer official municipal/county/state/federal records, FHFA, FRED, Census, Zillow Research, Redfin Data Center, and reputable housing-market sources.",
  "Avoid SEO blogs, unverified realtor marketing pages, and undated listings.",
  "If a source is older than 12 months, label it stale.",
].join(" ");

// =============================================================
// Portfolio-level Internal Summary
// =============================================================

export async function generateMarketNote(
  input: MarketNoteInput,
  provider: AiProvider = "openai"
): Promise<MarketNoteState> {
  const providerLabel = providerLabelFor(provider);
  const keyMissing = providerKeyMissing(provider);
  if (keyMissing) {
    return {
      ok: false,
      message: keyMissing,
      modeLabel: "Internal summary",
      providerLabel,
    };
  }

  const prompt = [
    "You are producing an INTERNAL provider summary for the J.G. Walsh & Co. Market Tracker.",
    "Use only the supplied dashboard data. Do not search the web in this mode.",
    SAFETY_CLAUSE,
    "Do not list every value. Pick what matters.",
    "Required Markdown structure (use exactly these headings):",
    "# Ψ Internal Market Summary",
    "## Portfolio Signal",
    "- 2–3 bullets that highlight the headline takeaway, not raw numbers.",
    "## Value / Rent Observations",
    "- Highlight value vs rent disagreement, range tightness, or unusual yield.",
    "- Do not enumerate every property's numbers — call out what is interesting.",
    "## Gaps",
    "- Missing acquisition basis, missing tax/assessment, stale snapshots, missing condition/renovation facts, missing external confirmation.",
    "## Next Checks",
    "- 3–5 concrete, short action items.",
    "",
    "Dashboard data (JSON):",
    JSON.stringify(input, null, 2),
  ].join("\n");

  try {
    const result = await runInternal(provider, prompt);
    return {
      ok: true,
      message: result.outputText || `${providerLabel} returned no note text.`,
      modeLabel: "Internal summary",
      providerLabel,
    };
  } catch (error) {
    return {
      ok: false,
      message: errorMessage(error, "AI internal summary failed"),
      modeLabel: "Internal summary",
      providerLabel,
    };
  }
}

// =============================================================
// Portfolio-level Web Research
// =============================================================

export async function generateMarketNoteWithWebSearch(
  input: MarketNoteInput,
  provider: AiProvider = "openai"
): Promise<MarketNoteState> {
  const providerLabel = providerLabelFor(provider);
  const keyMissing = providerKeyMissing(provider);
  if (keyMissing) {
    return {
      ok: false,
      message: keyMissing,
      modeLabel: "Web research",
      providerLabel,
    };
  }

  const prompt = [
    "You are producing a WEB-RESEARCHED market intelligence note for the J.G. Walsh & Co. Market Tracker.",
    NO_PARROT_CLAUSE,
    SAFETY_CLAUSE,
    PREFERRED_SOURCES,
    "Search for: current Albany County / Loudonville (12211) / Menands (12204) housing-market context;",
    "nearby listing/sale activity if publicly available; FHFA HPI and Zillow Research / Redfin Data Center / Census / FRED context;",
    "official county/town records that disambiguate property facts; rate environment relevant to small landlords.",
    "Inline cite with [1], [2], [3] markers ONLY where a claim depends on the cited source.",
    "Required Markdown structure (use exactly these headings):",
    "# Ψ Market Intelligence Note",
    "## Executive Takeaway",
    "- 2–3 bullets max, each delivering NEW insight beyond the dashboard.",
    "## External Market Signal",
    "- Summarize external market evidence. Do not repeat dashboard values unless flagging conflict or staleness.",
    "## Property-Specific Notes",
    "### 51 Loudonwood E",
    "- New external context. Confirmation/conflict vs dashboard. Next check.",
    "### 16 Momrow Ct",
    "- New external context. Confirmation/conflict vs dashboard. Next check.",
    "### 322 Osborne Rd",
    "- New external context. Confirmation/conflict vs dashboard. Next check.",
    "## Data Conflicts / Watch Items",
    "- Source disagreement, missing public-record fields, stale provider data, renovation/condition uncertainty, rent/value mismatch where relevant.",
    "## Next Checks",
    "- 3–6 concise action items.",
    "Do NOT include a Markdown ## Sources section — the UI renders sources separately.",
    "",
    "Dashboard data (JSON, context only):",
    JSON.stringify(input, null, 2),
  ].join("\n");

  try {
    const result = await runWebSearch(provider, prompt, "market");
    return {
      ok: true,
      message: result.outputText || `${providerLabel} returned no note text.`,
      modeLabel: "Web research",
      providerLabel,
      expectedSources: true,
      sources: normalizeAiSources(
        result.sources,
        "External corroboration / context"
      ),
    };
  } catch (error) {
    return {
      ok: false,
      message: errorMessage(error, "AI web research failed"),
      modeLabel: "Web research",
      providerLabel,
    };
  }
}

// =============================================================
// Per-property analysis (used by both the per-property card and
// the Property Research mode of the main AI panel).
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
  input: PropertyNoteInput,
  provider: AiProvider = "openai"
): Promise<MarketNoteState> {
  const providerLabel = providerLabelFor(provider);
  const keyMissing = providerKeyMissing(provider);
  if (keyMissing) {
    return {
      ok: false,
      message: keyMissing,
      modeLabel: "Internal summary",
      providerLabel,
    };
  }

  const prompt = [
    "You are producing an INTERNAL provider summary for ONE property in the J.G. Walsh & Co. Market Tracker.",
    "Use only the supplied property data. Do not search the web in this mode.",
    SAFETY_CLAUSE,
    `${input.property.isPrivate ? "This property is held privately and is reference-only — exclude from business KPI commentary." : ""}`,
    "Required Markdown structure (use exactly these headings):",
    "# Ψ Internal Property Summary",
    "## Headline",
    "- 2 bullets max — what stands out about THIS property.",
    "## Value / Rent",
    "- Source disagreement, range tightness, yield, ATTOM verification status.",
    "## Gaps",
    "- Missing acquisition basis, tax/assessment, stale provider data, renovation/condition uncertainty.",
    "## Next Checks",
    "- 3–5 short action items.",
    "",
    "Property data (JSON):",
    JSON.stringify(input, null, 2),
  ].join("\n");

  try {
    const result = await runInternal(provider, prompt);
    return {
      ok: true,
      message: result.outputText || `${providerLabel} returned no note text.`,
      modeLabel: "Internal summary",
      providerLabel,
    };
  } catch (error) {
    return {
      ok: false,
      message: errorMessage(error, "AI property summary failed"),
      modeLabel: "Internal summary",
      providerLabel,
    };
  }
}

export async function generatePropertyAnalysisWithWebSearch(
  input: PropertyNoteInput,
  provider: AiProvider = "openai"
): Promise<MarketNoteState> {
  const providerLabel = providerLabelFor(provider);
  const keyMissing = providerKeyMissing(provider);
  if (keyMissing) {
    return {
      ok: false,
      message: keyMissing,
      modeLabel: "Property research",
      providerLabel,
    };
  }

  const prompt = [
    "You are producing a WEB-RESEARCHED property research note for ONE property in the J.G. Walsh & Co. Market Tracker.",
    NO_PARROT_CLAUSE,
    SAFETY_CLAUSE,
    PREFERRED_SOURCES,
    "Use the supplied address, city, ZIP, and dashboard values strictly as CONTEXT.",
    "Search for: current submarket activity for this ZIP and town; nearby publicly-listed sales / rentals;",
    "official county/town record context (parcel, assessment, recent sale, permits if discoverable);",
    "any condition/renovation context if publicly disclosed; FHFA HPI, Zillow Research, Redfin, Census, FRED context relevant to this submarket.",
    "Inline cite with [1], [2], [3] markers ONLY where a claim depends on the cited source.",
    "Required Markdown structure (use exactly these headings):",
    "# Ψ Property Research Note",
    "## Headline",
    "- 2–3 bullets, each a NEW external insight beyond the dashboard.",
    "## Submarket Signal",
    "- External activity at the ZIP / town level. Note staleness when applicable.",
    "## Property-Specific Findings",
    "- New external context. Confirmation or conflict with dashboard values. Verifiable public-record clues.",
    "## Risks / Watch Items",
    "- Source disagreement, missing public-record fields, stale provider data, condition/renovation uncertainty, rent/value mismatch.",
    "## Next Checks",
    "- 3–6 concrete action items.",
    "Do NOT include a Markdown ## Sources section — the UI renders sources separately.",
    "",
    "Property data (JSON, context only):",
    JSON.stringify(input, null, 2),
  ].join("\n");

  try {
    const result = await runWebSearch(provider, prompt, "property");
    return {
      ok: true,
      message: result.outputText || `${providerLabel} returned no note text.`,
      modeLabel: "Property research",
      providerLabel,
      expectedSources: true,
      sources: normalizeAiSources(
        result.sources,
        `External context for ${input.property.address}`
      ),
    };
  } catch (error) {
    return {
      ok: false,
      message: errorMessage(error, "AI property research failed"),
      modeLabel: "Property research",
      providerLabel,
    };
  }
}

// =============================================================
// Provider routing
// =============================================================

type InternalResult = { outputText: string };
type WebSearchResult = {
  outputText: string;
  sources: string[];
};

type WebSearchContext = "market" | "property";

function providerLabelFor(provider: AiProvider): "OpenAI" | "Grok" {
  return provider === "xai" ? "Grok" : "OpenAI";
}

function providerKeyMissing(provider: AiProvider): string | null {
  if (provider === "xai") {
    return hasXaiKey() ? null : "xAI API key not configured.";
  }
  return hasOpenAIKey() ? null : "OpenAI API key not configured.";
}

async function runInternal(
  provider: AiProvider,
  prompt: string
): Promise<InternalResult> {
  if (provider === "xai") {
    const result = await generateXaiMarketText({ prompt });
    return { outputText: result.outputText };
  }
  const result = await generateWorkspaceText({ prompt });
  return { outputText: result.outputText };
}

async function runWebSearch(
  provider: AiProvider,
  prompt: string,
  context: WebSearchContext = "market"
): Promise<WebSearchResult> {
  if (provider === "xai") {
    const result =
      context === "property"
        ? await generateXaiPropertyResearch({ prompt })
        : await generateXaiMarketTextWithWebSearch({ prompt });
    return {
      outputText: result.outputText,
      sources: result.sources,
    };
  }
  const result = await generateWorkspaceTextWithWebSearch({ prompt });
  return { outputText: result.outputText, sources: result.sources };
}

// =============================================================
// Helpers
// =============================================================

function normalizeAiSources(urls: string[], usedFor: string): AiSource[] {
  const seen = new Set<string>();
  const sources: AiSource[] = [];
  for (const raw of urls) {
    if (!raw || seen.has(raw)) continue;
    seen.add(raw);
    let domain = "source";
    let title = raw;
    try {
      const u = new URL(raw);
      domain = u.hostname.replace(/^www\./, "");
      const path = u.pathname.replace(/\/$/, "");
      title = path && path !== "" ? `${domain}${path}` : domain;
    } catch {
      domain = "source";
    }
    sources.push({ title, domain, url: raw, usedFor });
  }
  return sources;
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return `${fallback}: ${error.message.slice(0, 220)}`;
  return `${fallback}.`;
}
