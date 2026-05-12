/**
 * Server-only helper that turns Adobe-extracted PDF text into a
 * structured "draft review" object using either OpenAI (default) or
 * xAI/Grok.
 *
 * Safety:
 *   - The model is instructed not to invent facts; anything missing
 *     ends up in `missingInformation`.
 *   - All credentials live in env vars and never leave this module.
 *   - The action layer is responsible for persisting the result and
 *     calling `revalidatePath`; this helper is pure: text in, JSON out.
 *   - No legal, tax, zoning, or engineering conclusions are produced.
 */

import {
  generateWorkspaceJsonObject,
  hasOpenAIKey,
} from "@/lib/openai";
import { generateXaiMarketText, hasXaiKey } from "@/lib/xai";

if (typeof window !== "undefined") {
  throw new Error(
    "src/lib/ai-document-review.ts is server-only and must not be imported on the client."
  );
}

// =============================================================
// Public types
// =============================================================

export type AiReviewProvider = "openai" | "xai";

export type AiDocumentReview = {
  documentType: string | null;
  summary: string | null;
  propertyReferences: string[];
  vendorsOrParties: string[];
  dates: string[];
  dollarAmounts: string[];
  risks: string[];
  missingInformation: string[];
  suggestedTasks: string[];
  budgetImplications: string[];
  contractorQuestions: string[];
};

export type AiReviewResult =
  | {
      ok: true;
      provider: AiReviewProvider;
      review: AiDocumentReview;
      /** Raw model output, retained for debugging when shape validation
       *  trips edge cases. Never displayed to users. */
      rawOutputPreview: string;
    }
  | {
      ok: false;
      provider: AiReviewProvider | null;
      message: string;
    };

// =============================================================
// Provider routing
// =============================================================

export function isAiReviewProviderConfigured(
  provider: AiReviewProvider
): boolean {
  return provider === "openai" ? hasOpenAIKey() : hasXaiKey();
}

export function defaultAiReviewProvider(): AiReviewProvider | null {
  if (hasOpenAIKey()) return "openai";
  if (hasXaiKey()) return "xai";
  return null;
}

// =============================================================
// Prompt
// =============================================================

const REVIEW_INSTRUCTIONS = [
  "You are an internal AI assistant for J.G. Walsh & Co. reviewing a document that was OCR/text-extracted from a PDF in a real-estate workspace.",
  "Treat your output as a DRAFT REVIEW only. Do not make legal, tax, zoning, survey, or engineering conclusions.",
  "Do not invent facts that are not present in the extracted text.",
  "Preserve dates, addresses, parcel IDs, dollar amounts, and proper names exactly as written in the extracted text.",
  "If a category has no supporting evidence in the text, return an empty array for that field and add a short note under missingInformation explaining what was not found.",
  "When something is uncertain, prefix it with 'Uncertain — ' inside the relevant array.",
  "OUTPUT FORMAT: respond with one single JSON object only. No markdown. No code fences. No prose before or after the JSON. The object must contain every key listed in the schema.",
].join(" ");

function buildReviewPrompt(input: {
  documentName: string;
  category: string;
  linkedPropertyAddress: string | null;
  extractedText: string;
}): string {
  const propertyLine = input.linkedPropertyAddress
    ? `Linked property (workspace metadata, not necessarily mentioned in the document): ${input.linkedPropertyAddress}`
    : "Linked property: none.";
  return [
    "Document context:",
    `- File name: ${input.documentName}`,
    `- Workspace category: ${input.category}`,
    `- ${propertyLine}`,
    "",
    "Schema (all keys required; arrays may be empty; nullable strings allowed for documentType and summary):",
    "{",
    '  "documentType": string | null,',
    '  "summary": string | null,',
    '  "propertyReferences": string[],',
    '  "vendorsOrParties": string[],',
    '  "dates": string[],',
    '  "dollarAmounts": string[],',
    '  "risks": string[],',
    '  "missingInformation": string[],',
    '  "suggestedTasks": string[],',
    '  "budgetImplications": string[],',
    '  "contractorQuestions": string[]',
    "}",
    "",
    "Extracted text follows. Use only this text as evidence.",
    "----- BEGIN EXTRACTED TEXT -----",
    truncateForPrompt(input.extractedText),
    "----- END EXTRACTED TEXT -----",
  ].join("\n");
}

const PROMPT_TEXT_LIMIT = 12_000;

function truncateForPrompt(text: string): string {
  if (text.length <= PROMPT_TEXT_LIMIT) return text;
  return `${text.slice(0, PROMPT_TEXT_LIMIT)}\n\n[…text truncated for review prompt; full extract retained server-side…]`;
}

// =============================================================
// JSON parse + validate
// =============================================================

/**
 * Strip common LLM wrappers (markdown code fences, leading prose) and
 * attempt to parse JSON. Returns null on failure rather than throwing.
 *
 * Tolerant of:
 *   - Markdown code fences (```json … ``` or ``` … ```).
 *   - Prose before/after the JSON object — we extract the substring
 *     between the first `{` and the last `}`.
 *   - Smart quotes that some models emit instead of plain ASCII quotes.
 *   - Trailing commas in objects or arrays.
 */
function tryParseJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  // Strip a leading ```json (or just ```) and matching trailing ```
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  const fenced = fenceMatch ? fenceMatch[1].trim() : trimmed;

  const candidates: string[] = [fenced];

  // Best-effort: find the first balanced-looking {...} chunk in the
  // payload. This salvages responses that wrapped JSON in prose.
  const first = fenced.indexOf("{");
  const last = fenced.lastIndexOf("}");
  if (first >= 0 && last > first) {
    candidates.push(fenced.slice(first, last + 1));
  }

  for (const c of candidates) {
    const direct = safeJsonParse(c);
    if (direct !== undefined) return direct;
    const cleaned = repairCommonJsonGlitches(c);
    if (cleaned !== c) {
      const repaired = safeJsonParse(cleaned);
      if (repaired !== undefined) return repaired;
    }
  }
  return null;
}

function safeJsonParse(s: string): unknown | undefined {
  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
}

/**
 * Best-effort repair for the two cheap-to-fix mistakes LLMs make most
 * often. Anything more aggressive risks silently changing meaning, so
 * stop here.
 *
 * 1. Replace curly quotes “ / ” / ‘ / ’ with ASCII " or '.
 * 2. Strip a trailing comma immediately before `}` or `]`.
 */
function repairCommonJsonGlitches(s: string): string {
  let out = s
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'");
  out = out.replace(/,(\s*[}\]])/g, "$1");
  return out;
}

/**
 * Cap a raw model output to a length safe to surface inside an error
 * message. Strips control chars and replaces newlines with spaces so the
 * preview doesn't break terminal/HTML rendering. Stays well under any
 * conceivable log indexing limit.
 */
function sanitizeOutputPreview(raw: string): string {
  // eslint-disable-next-line no-control-regex
  const controlPattern = /[\x00-\x1F\x7F]+/g;
  const stripped = raw.replace(controlPattern, " ").replace(/\s+/g, " ").trim();
  const MAX = 500;
  if (stripped.length === 0) return "(empty)";
  return stripped.length > MAX ? `${stripped.slice(0, MAX)}…` : stripped;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const v of value) {
    if (typeof v === "string" && v.trim().length > 0) out.push(v.trim());
  }
  return out;
}

function asNullableString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length > 0 ? t : null;
}

function normalizeReview(value: unknown): AiDocumentReview | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  return {
    documentType: asNullableString(v.documentType),
    summary: asNullableString(v.summary),
    propertyReferences: asStringArray(v.propertyReferences),
    vendorsOrParties: asStringArray(v.vendorsOrParties),
    dates: asStringArray(v.dates),
    dollarAmounts: asStringArray(v.dollarAmounts),
    risks: asStringArray(v.risks),
    missingInformation: asStringArray(v.missingInformation),
    suggestedTasks: asStringArray(v.suggestedTasks),
    budgetImplications: asStringArray(v.budgetImplications),
    contractorQuestions: asStringArray(v.contractorQuestions),
  };
}

// =============================================================
// Public entry
// =============================================================

export type ReviewExtractedTextInput = {
  documentName: string;
  category: string;
  linkedPropertyAddress: string | null;
  extractedText: string;
  /** Defaults to `defaultAiReviewProvider()` when omitted. */
  provider?: AiReviewProvider;
};

/**
 * Run a structured draft review over the supplied extracted text.
 * Throws-as-result: failures (no provider configured, model returned
 * non-JSON, network error) come back as `{ ok: false, message }` so the
 * action layer can persist a clean failed state.
 */
export async function reviewExtractedText(
  input: ReviewExtractedTextInput
): Promise<AiReviewResult> {
  const provider = input.provider ?? defaultAiReviewProvider();
  if (!provider) {
    return {
      ok: false,
      provider: null,
      message:
        "No AI provider is configured. Set OPENAI_API_KEY (preferred) or XAI_API_KEY on the server.",
    };
  }
  if (!isAiReviewProviderConfigured(provider)) {
    return {
      ok: false,
      provider,
      message: `Selected AI provider "${provider}" is not configured.`,
    };
  }

  const prompt = buildReviewPrompt({
    documentName: input.documentName,
    category: input.category,
    linkedPropertyAddress: input.linkedPropertyAddress,
    extractedText: input.extractedText,
  });

  let raw: string;
  try {
    if (provider === "openai") {
      // JSON mode enforces a single JSON object response server-side at
      // OpenAI, which prevents the markdown/code-fence wrapping that
      // tripped the old text-mode parser.
      const r = await generateWorkspaceJsonObject(
        { prompt, instructions: REVIEW_INSTRUCTIONS },
        { maxOutputTokens: 4000 }
      );
      raw = r.outputText;
    } else {
      // xAI is OpenAI-compatible but we don't depend on its JSON-mode
      // support; keep it as text generation guarded by the prompt
      // instructions and the tolerant parser below.
      const r = await generateXaiMarketText({
        prompt,
        instructions: REVIEW_INSTRUCTIONS,
      });
      raw = r.outputText;
    }
  } catch (error) {
    return {
      ok: false,
      provider,
      message:
        error instanceof Error
          ? `AI review request failed: ${error.message.slice(0, 200)}`
          : "AI review request failed.",
    };
  }

  if (!raw || raw.trim().length === 0) {
    return {
      ok: false,
      provider,
      message: "AI provider returned an empty response.",
    };
  }

  const parsed = tryParseJsonObject(raw);
  if (!parsed) {
    const preview = sanitizeOutputPreview(raw);
    // Server-side diagnostic only — no secrets, no full extracted text
    // (this is the model output, not the source document).
    console.warn(
      "[ai-document-review] non-JSON response",
      JSON.stringify({ provider, preview })
    );
    return {
      ok: false,
      provider,
      message: `AI provider did not return valid JSON. Preview: ${preview}`,
    };
  }

  const review = normalizeReview(parsed);
  if (!review) {
    const preview = sanitizeOutputPreview(raw);
    return {
      ok: false,
      provider,
      message: `AI response JSON did not match the expected shape. Preview: ${preview}`,
    };
  }

  return {
    ok: true,
    provider,
    review,
    rawOutputPreview: raw.slice(0, 4000),
  };
}
