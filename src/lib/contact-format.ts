/**
 * Contact formatting & normalization helpers.
 *
 * These are pure functions used in three places:
 *   - the contact form (client) when displaying or hinting at values,
 *   - server actions when normalizing user input before persisting,
 *   - the bulk CSV importer when normalizing imported values.
 *
 * No React, no Prisma — safe to import from any context.
 */

export type ContactNameParts = {
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  company?: string | null;
};

const EMPTY_DASH = "—";

const trim = (v: string | null | undefined): string => (v ?? "").trim();

// ---------- Names ----------

export function formatContactName(c: ContactNameParts): string {
  const first = trim(c.firstName);
  const last = trim(c.lastName);
  const full = [first, last].filter(Boolean).join(" ");
  if (full) return full;
  return trim(c.displayName) || trim(c.company) || "";
}

export function getContactSortName(c: ContactNameParts): string {
  return (
    trim(c.lastName) ||
    trim(c.displayName) ||
    trim(c.company) ||
    ""
  ).toUpperCase();
}

export function getContactInitial(c: ContactNameParts): string {
  const sortName = getContactSortName(c);
  const first = sortName.replace(/[^A-Z0-9]/g, "").charAt(0);
  return first || "#";
}

/**
 * Generate a default displayName when the user leaves the displayName
 * field blank. Returns null if no fallback is available so callers can
 * surface a validation error.
 */
export function deriveDisplayName(
  parts: ContactNameParts & { displayName?: string | null }
): string | null {
  const explicit = trim(parts.displayName);
  if (explicit) return explicit;
  const full = [trim(parts.firstName), trim(parts.lastName)]
    .filter(Boolean)
    .join(" ");
  if (full) return full;
  const company = trim(parts.company);
  return company || null;
}

// ---------- Phone ----------

const EXTENSION_RE = /\s*(?:ext\.?|extension|x)\s*([0-9]+)\s*$/i;

function splitExtension(raw: string): { main: string; extension: string | null } {
  const match = raw.match(EXTENSION_RE);
  if (!match) return { main: raw, extension: null };
  return {
    main: raw.slice(0, match.index).trim(),
    extension: match[1],
  };
}

/**
 * Normalize phone input as the user types it for storage. Trims surrounding
 * whitespace but otherwise preserves the user's intent. Display formatting
 * happens at render time via formatPhone.
 */
export function normalizePhoneInput(raw: string | null | undefined): string | null {
  const t = trim(raw);
  return t || null;
}

/**
 * Render a stored phone string for display.
 *   - 10 US digits:      (617) 383-3745
 *   - 11 US digits (1):  +1 (617) 383-3745
 *   - +1 followed by 10: +1 (617) 383-3745
 *   - Recognized "ext"/"x"/"extension" suffixes preserved as " ext. NN"
 *   - Unknown formats:   trimmed, otherwise unchanged
 */
export function formatPhone(phone: string | null | undefined): string {
  const t = trim(phone);
  if (!t) return "";

  const { main, extension } = splitExtension(t);

  const digitsOnly = main.replace(/\D/g, "");
  const startsWithPlus = /^\s*\+/.test(main);

  let formatted = main.trim();

  if (digitsOnly.length === 10) {
    formatted = `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6, 10)}`;
  } else if (digitsOnly.length === 11 && digitsOnly.startsWith("1")) {
    formatted = `+1 (${digitsOnly.slice(1, 4)}) ${digitsOnly.slice(4, 7)}-${digitsOnly.slice(7, 11)}`;
  } else if (startsWithPlus && digitsOnly.length >= 7) {
    formatted = `+${digitsOnly}`;
  }

  return extension ? `${formatted} ext. ${extension}` : formatted;
}

/**
 * Build a `tel:` URI safe for click-to-call. Uses E.164-ish digits with
 * a leading `+` if present in the source. Extensions are appended via the
 * comma-pause syntax.
 */
export function phoneHref(phone: string | null | undefined): string {
  const t = trim(phone);
  if (!t) return "";

  const { main, extension } = splitExtension(t);
  const startsWithPlus = /^\s*\+/.test(main);
  const digits = main.replace(/\D/g, "");
  if (!digits) return "";
  const base = startsWithPlus ? `+${digits}` : digits;
  return extension ? `tel:${base},${extension}` : `tel:${base}`;
}

// ---------- Email ----------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmailInput(raw: string | null | undefined): string | null {
  const t = trim(raw).toLowerCase();
  return t || null;
}

export function formatEmail(email: string | null | undefined): string {
  return trim(email).toLowerCase();
}

export function isLikelyValidEmail(email: string | null | undefined): boolean {
  const t = trim(email);
  if (!t) return false;
  return EMAIL_RE.test(t);
}

export function emailHref(email: string | null | undefined): string {
  if (!isLikelyValidEmail(email)) return "";
  return `mailto:${formatEmail(email)}`;
}

// ---------- Website ----------

export function normalizeWebsiteInput(raw: string | null | undefined): string | null {
  const t = trim(raw);
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  // Some other scheme (mailto:, tel:, ftp:) — leave alone.
  if (/^[a-z][a-z0-9+.-]*:/i.test(t)) return t;
  return `https://${t}`;
}

/**
 * Display-friendly website. Strips the leading scheme and any trailing
 * slash so the field reads cleanly in a contact card.
 */
export function formatWebsite(url: string | null | undefined): string {
  const t = trim(url);
  if (!t) return "";
  return t.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
}

export function websiteHref(url: string | null | undefined): string {
  return normalizeWebsiteInput(url) ?? "";
}

// ---------- Address ----------

/**
 * For detail views: trim and normalize line breaks. Use with
 * `whitespace-pre-wrap` so the original line breaks render naturally.
 */
export function formatAddress(address: string | null | undefined): string {
  return trim(address).replace(/\r\n/g, "\n");
}

/**
 * For list views: collapse line breaks into a single comma-separated line.
 */
export function formatAddressInline(address: string | null | undefined): string {
  return formatAddress(address)
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .join(", ");
}

// ---------- Dates ----------

export function formatContactDate(d: Date | string | null | undefined): string {
  if (!d) return EMPTY_DASH;
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return EMPTY_DASH;
  return dt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ---------- Avatar ----------

export type AvatarTone = { bg: string; fg: string };

/**
 * Named avatar palette. Keys are stored in Contact.avatarColor and validated
 * against this map server-side. White initials sit on each tone with at
 * least ~6:1 contrast. Inline hex on purpose — these colors live only in
 * the avatar component and are not part of the workspace color system.
 */
export const AVATAR_PALETTE: Record<string, AvatarTone> = {
  navy: { bg: "#1E3A8A", fg: "#FFFFFF" },
  slate: { bg: "#334155", fg: "#FFFFFF" },
  zinc: { bg: "#3F3F46", fg: "#FFFFFF" },
  amber: { bg: "#B45309", fg: "#FFFFFF" },
  emerald: { bg: "#047857", fg: "#FFFFFF" },
  teal: { bg: "#0F766E", fg: "#FFFFFF" },
  sky: { bg: "#0369A1", fg: "#FFFFFF" },
  violet: { bg: "#5B21B6", fg: "#FFFFFF" },
  rose: { bg: "#9F1239", fg: "#FFFFFF" },
  orange: { bg: "#7C2D12", fg: "#FFFFFF" },
};

export const AVATAR_PALETTE_ORDER = [
  "navy",
  "slate",
  "zinc",
  "amber",
  "emerald",
  "teal",
  "sky",
  "violet",
  "rose",
  "orange",
] as const;

export type AvatarColor = (typeof AVATAR_PALETTE_ORDER)[number];

export function isAvatarColor(value: unknown): value is AvatarColor {
  return typeof value === "string" && value in AVATAR_PALETTE;
}

/**
 * Default tone keyed by category — used when a contact does NOT have an
 * explicit avatarColor set. Categories that share a tone (e.g. PROPERTY_*
 * → slate) are intentional; users can override per contact.
 */
const CATEGORY_DEFAULT_COLOR: Record<string, AvatarColor> = {
  CONTRACTORS_TRADES: "amber",
  LEGAL: "violet",
  INSURANCE: "teal",
  MUNICIPAL: "slate",
  UTILITIES: "sky",
  FINANCE_ACCOUNTING: "emerald",
  REAL_ESTATE_LEASING: "navy",
  PROPERTY_MANAGEMENT: "slate",
  TENANTS_OCCUPANTS: "rose",
  SUPPLIERS: "orange",
  INSPECTORS_TESTING: "zinc",
  OTHER: "slate",
};

type AvatarSource = ContactNameParts & {
  category?: string | null;
  avatarColor?: string | null;
};

export function getAvatarColor(c: AvatarSource): AvatarColor {
  if (isAvatarColor(c.avatarColor)) return c.avatarColor;
  const key = (c.category ?? "OTHER").toString();
  return CATEGORY_DEFAULT_COLOR[key] ?? "slate";
}

export function getAvatarTone(c: AvatarSource): AvatarTone {
  return AVATAR_PALETTE[getAvatarColor(c)] ?? AVATAR_PALETTE.slate;
}

export function getAvatarLabel(c: ContactNameParts): string {
  const first = trim(c.firstName);
  const last = trim(c.lastName);
  if (first && last) {
    return (first[0] + last[0]).toUpperCase();
  }
  if (first) return first[0].toUpperCase();
  if (last) return last[0].toUpperCase();
  const fallback = trim(c.displayName) || trim(c.company);
  if (!fallback) return "•";
  // Use the first two word-initials for org-style names like
  // "Sample Plumbing & Heating" → "SP".
  const tokens = fallback
    .split(/\s+/)
    .map((w) => w.replace(/[^A-Za-z0-9]/g, ""))
    .filter(Boolean);
  if (tokens.length >= 2) {
    return (tokens[0][0] + tokens[1][0]).toUpperCase();
  }
  return fallback[0].toUpperCase();
}

// ---------- Trade icon inference ----------

/**
 * Allowed icon keys. The avatarIcon field stores one of these strings;
 * the actual Lucide component is resolved in the avatar component so this
 * file stays runtime-light and free of React imports.
 */
export const AVATAR_ICON_KEYS = [
  "briefcase",
  "user",
  "hardhat",
  "scale",
  "clipboard-check",
  "file-check",
  "umbrella",
  "shield-check",
  "landmark",
  "zap",
  "utility-pole",
  "gauge",
  "circle-dollar",
  "house",
  "key-round",
  "building",
  "truck",
  "search-check",
  "droplets",
  "wrench",
  "brick-wall",
  "hammer",
  "paintbrush",
  "sparkles",
  "gavel",
] as const;

export type AvatarIconKey = (typeof AVATAR_ICON_KEYS)[number];

export function isAvatarIconKey(value: unknown): value is AvatarIconKey {
  return (
    typeof value === "string" &&
    (AVATAR_ICON_KEYS as readonly string[]).includes(value)
  );
}

const CATEGORY_ICON: Record<string, AvatarIconKey> = {
  CONTRACTORS_TRADES: "hardhat",
  LEGAL: "scale",
  INSURANCE: "clipboard-check",
  MUNICIPAL: "landmark",
  UTILITIES: "utility-pole",
  FINANCE_ACCOUNTING: "circle-dollar",
  REAL_ESTATE_LEASING: "house",
  PROPERTY_MANAGEMENT: "key-round",
  TENANTS_OCCUPANTS: "user",
  SUPPLIERS: "truck",
  INSPECTORS_TESTING: "search-check",
  OTHER: "briefcase",
};

const TRADE_KEYWORDS: { match: RegExp; icon: AvatarIconKey }[] = [
  { match: /\belectric|electrical|electrician\b/i, icon: "zap" },
  { match: /\bplumb|plumbing|plumber|water heater\b/i, icon: "droplets" },
  { match: /\bmason|masonry|chimney|foundation|brick\b/i, icon: "brick-wall" },
  { match: /\bpaint|painter|painting\b/i, icon: "paintbrush" },
  { match: /\broof|roofer|roofing\b/i, icon: "hammer" },
  { match: /\bclean|cleaner|cleaning\b/i, icon: "sparkles" },
  { match: /\block|locksmith\b/i, icon: "key-round" },
  { match: /\binspect|inspection|inspector|testing\b/i, icon: "search-check" },
  { match: /\bsupplier|supply|distribution|materials\b/i, icon: "truck" },
  { match: /\binsurance|broker|coverage\b/i, icon: "umbrella" },
  { match: /\battorney|legal|counsel|law\b/i, icon: "scale" },
  { match: /\bgas|utility|meter\b/i, icon: "gauge" },
  { match: /\bgeneral contractor|gc\b/i, icon: "hardhat" },
];

type IconSource = {
  category?: string | null;
  avatarIcon?: string | null;
  role?: string | null;
  company?: string | null;
  notes?: string | null;
};

/**
 * Resolve the icon key for a contact. Order of precedence:
 *   1. Explicit avatarIcon override (validated)
 *   2. Trade-keyword inference from role/company/notes
 *   3. Category-default icon
 *   4. "briefcase" as a final fallback
 */
export function getAvatarIconKey(c: IconSource): AvatarIconKey {
  if (isAvatarIconKey(c.avatarIcon)) return c.avatarIcon;
  const haystack = [c.role, c.company, c.notes].filter(Boolean).join(" ");
  if (haystack) {
    for (const { match, icon } of TRADE_KEYWORDS) {
      if (match.test(haystack)) return icon;
    }
  }
  const category = (c.category ?? "OTHER").toString();
  return CATEGORY_ICON[category] ?? "briefcase";
}

// ---------- Avatar mode ----------

export const AVATAR_MODES = ["INITIALS", "ICON"] as const;
export type AvatarMode = (typeof AVATAR_MODES)[number];

export function isAvatarMode(value: unknown): value is AvatarMode {
  return value === "INITIALS" || value === "ICON";
}

export function getAvatarMode(c: { avatarMode?: string | null }): AvatarMode {
  return isAvatarMode(c.avatarMode) ? c.avatarMode : "INITIALS";
}

// ---------- Official seals ----------
// Government / AHJ contacts can use a real official seal in the avatar
// frame instead of generated initials. Detection is conservative — we
// require BOTH (a) clear textual evidence of the entity AND (b) a
// taxonomy/category signal that this contact is government, before we
// swap the avatar for an institutional seal.

export type OfficialSeal = {
  src: string;
  alt: string;
};

const SEALS = {
  colonie: {
    src: "/icons/contacts/colonie_seal.svg",
    alt: "Town of Colonie seal",
  },
  menands: {
    src: "/icons/contacts/village_menands_seal.svg",
    alt: "Village of Menands seal",
  },
  nys: {
    src: "/icons/contacts/nys_seal.svg",
    alt: "State of New York seal",
  },
} as const;

type SealSource = {
  category?: string | null;
  relationshipType?: string | null;
  displayName?: string | null;
  company?: string | null;
};

function isGovernmentish(c: SealSource): boolean {
  if (c.relationshipType === "GOVERNMENT_AHJ") return true;
  if (c.category === "MUNICIPAL") return true;
  return false;
}

export function getOfficialSeal(c: SealSource): OfficialSeal | null {
  if (!isGovernmentish(c)) return null;
  const haystack = `${c.displayName ?? ""} ${c.company ?? ""}`.toLowerCase();
  if (!haystack.trim()) return null;

  // Order matters: check the more-specific village before generic Colonie,
  // and check NYS last so a town/village doesn't match the broader "ny".
  if (/\b(village of menands|menands)\b/.test(haystack)) return SEALS.menands;
  if (/\b(town of colonie|colonie)\b/.test(haystack)) return SEALS.colonie;
  if (
    /\b(state of new york|new york state|nys|department of state)\b/.test(
      haystack
    )
  ) {
    return SEALS.nys;
  }
  return null;
}
