# Design Critique: Market Tracker (`/market`)

**Stage assessed:** Refinement — the data pipeline is mature, the layout is a recent rebuild per the page docstring, and the visual system is consistent enough to push on hierarchy and reduction rather than exploration.

## Overall Impression

The page is doing a lot of honest work — it shows the portfolio, what's broken, the source health, the macro context, and an AI assistant, all on one screen. The biggest opportunity is **ordering and reduction**: the most actionable view (what changed, what's broken) is buried under a large AI generator that produces content only when invoked, and the same "is this source healthy" question is answered in four different vocabularies in four different panels. Tightening the hierarchy and unifying the status language would make this feel like one tool instead of six stacked tools.

## Usability

| Finding | Severity | Recommendation |
|---|---|---|
| AI Market Analysis panel sits between the source-health strip and the property cards, occupying the most valuable vertical real estate before the user has seen their portfolio. | 🔴 Critical | Move it below Property Comparison, or collapse it to a single generate button that expands on click. The user comes to this page to see their numbers first, generate prose second. |
| Two competing paths to per-property AI analysis: the top AI panel has a "Property research" mode with a picker, and each PropertyCard has its own "Generate property analysis" + "with web search" buttons. | 🔴 Critical | Pick one. Remove "Property research" from the top panel — it's redundant with the per-card buttons and forces the user to pick a property twice (once mentally, once in the dropdown). The top panel should be portfolio-scoped only. |
| "Data source settings" in the header anchors to `#market-tracker-settings`, but Settings is a `<details>` collapsed by default, so the user scrolls there and still sees a closed disclosure. | 🟡 Moderate | Either auto-open the `<details>` when the hash matches, or change the link target so the disclosure starts open when navigated to from the header. |
| To refresh anything, the user must scroll to the bottom and open Settings — there's no global refresh action. | 🟡 Moderate | Add a single "Refresh all sources" button in the header (next to the existing two), or surface the configured providers' refresh buttons in the Source Status Row. |
| Each PropertyCard nests 5 tabs (Summary, Chart, Comps, Records, Area trend) inside a long-scroll page. Deep nesting + lots of properties = users will only see "Summary." | 🟡 Moderate | Collapse to 2 tabs: **Summary** and **Details** (everything else). Or make the additional views progressive disclosure rather than peer tabs. |
| Property cards stack full-width even on desktop, so 4 business properties become a long scroll before the private/reference card. | 🟡 Moderate | On `lg+`, render 2 cards per row, or add a compact "table view" toggle for power-scanning. |
| Freshness is shown in 5 places (snapshot card, source row sublabel, per-property chip, diagnostics row, post-refresh status). | 🟢 Minor | Keep snapshot (portfolio-level) + per-card (property-level). Demote the others to tooltip-on-hover. |

## Visual Hierarchy

**What draws the eye first:** The cream-colored AI Market Analysis Panel — it's the only warm-tinted block on a dark dashboard, has a serif Ψ icon, and is roughly the size of the entire portfolio snapshot. That contrast is doing too much work. The user should land on **portfolio value / yield / what needs attention**, not a content generator.

**Reading flow:** Header → 5 KPI cards → 6 source dots → big cream panel → small attention panel → property cards. The eye gets pulled to the cream block in the middle and has to bounce back up to read KPIs and back down to find properties. The AI panel acts as a visual wall that breaks scanning.

**Emphasis:** Inside the snapshot, "House market value" and "Monthly market rent" are correctly emphasized at `lg/2xl`. Good. But the "Business assets" count and "Data freshness" are sized the same as a KPI when they're really meta-information. Demote those to a top-strip subline or footer chip and let the three real money numbers (value, rent, yield) own the snapshot.

**Suggested order:** Header → Portfolio Snapshot → **Needs Attention** (promoted) → Property Comparison → AI Analysis (demoted, possibly collapsed) → Location/Demographics → Macro → Settings.

## Consistency

| Element | Issue | Recommendation |
|---|---|---|
| Status taxonomy | Four overlapping vocabularies: SourceStatusRow uses `connected / configured / missing`; SourceDiagnosticsPanel uses `Connected / Manual / Planned / Not connected`; DataCoveragePanel uses `Connected / Missing / Planned / Optional`; PropertyCard verification uses `Public record matched / Records pending / Manual notes`. | Define one canonical three-state model — e.g., **Live / Pending / Off** — plus an optional `Planned` modifier, and reuse a single `<StatusBadge kind="..." />` everywhere. |
| Color encoding | Cyan does triple duty: interactive accent, "Planned" status, "Info" severity, and active-tab indicator. Amber does double duty: "warning" severity and "Pending/Manual" status. | Reserve cyan for interactivity (links, active tab) and pick a distinct neutral-blue for "Planned." Keep amber for warning only; pick a different tone for "Pending." |
| Section title casing | Mixed: "Property comparison" (sentence), "Needs Attention" (title), "Market Tracker Settings" (title), "Private / Reference Only" (title with separator). | Pick one — sentence case reads warmer and matches the rest of the app's serif display headings. |
| Verification badge wording | "Public record matched," "Records pending," and "Manual notes" don't form a clean progression — "Manual notes" sounds like a state, not a verification level. | Rename to **Verified · Pending · Manual** and tooltip the detail. |
| Refresh buttons | Each provider has its own refresh button with identical styling and post-submit summary, scattered across header (none), settings, and per-source rows. | One pattern is fine — but consolidate placement. All in Settings, OR all inline next to their status chip in Source Status Row. Not both. |
| Spacing | Page uses negative margins (`-mx-4 -my-6 sm:-mx-6 sm:-my-8 lg:-mx-8 lg:-my-10`) to break out of the app shell padding. Works, but means the market page is the only page in the app that does this — feels like an escape hatch rather than a system decision. | If breakout is intentional, expose it as an app-shell prop (`<AppShell fullBleed>`) so this isn't a one-off. |

## Accessibility

- **Color-only status encoding:** Source Status Row dots and DataCoverage badges rely on green/amber/red dots with very short adjacent labels. For protanopia/deuteranopia, green and amber are indistinguishable. Add a small icon (✓ / ⏳ / ✕) inside the dot, or make the status text bold and color-independent.
- **Small label type:** `text-[11px] uppercase tracking-wide` for section labels is borderline at standard AA contrast assuming `--market-text-secondary`. Run a contrast check (target 4.5:1 for body, 3:1 for large) — at 11px with letter-spacing, you want the higher bar.
- **Cream-on-dark AI panel:** `#FBF8F3` background with dark body text inside a dark page is fine for text contrast, but the *card border* `#E5DDD0` against the dark page background may fail the 3:1 non-text UI contrast requirement. Bump border opacity or add a subtle shadow for separation.
- **Disclosure affordance:** Native `<details>` for Settings is accessible by default, but the chevron is the only visible "open me" cue. Add the word "Show" or a `[+]` so non-mouse users see it as actionable.
- **Refresh button live regions:** Post-submit status ("3 succeeded · 1 errored") should be in an `aria-live="polite"` region so screen readers announce results without the user re-focusing.
- **Tab navigation inside PropertyCard:** Make sure the 5 in-card tabs use `role="tablist"` + arrow-key navigation, not just clickable divs. If they're already `<button>`s, good — but verify arrow-key behavior.
- **Disabled refresh buttons:** When a provider key is missing, the button is disabled. Disabled buttons should still be focusable with `aria-disabled="true"` + a tooltip explaining *why*, rather than being skipped over.

## What Works Well

- **Clear separation of business vs. private/reference assets** with explicit "Excluded from portfolio KPIs and AI analysis" copy. That's exactly the kind of dry, unambiguous disclosure a real-estate ledger needs.
- **Per-property left-border accent color** is a strong scanning aid — at a glance you can tell which property you're reading without re-reading the address.
- **Snapshot card mental model is right** for the user: assets, value, rent, yield, freshness. That's the investor's first-look mental checklist in the correct order.
- **Empty/error states are calm and informative**, not alarming ("no snapshots", "no critical market-data flags right now") — appropriate for a tool that lives with you for years.
- **Server-side aggregation** means the page renders deterministically. The whole `analyze()` pipeline producing `PropertyAnalysis` objects keeps the UI components dumb and consistent.
- **Trend-derived modeled history** in the valuation chart is honestly labeled "MODELED — not actual past appraisals," which is the right intellectual honesty for an investor tool.

## Priority Recommendations

1. **Reorder for the actual question the user is asking.** When you land on `/market`, you want to know: *what is my portfolio worth, what's changed, what's broken.* Today the page answers: *what is my portfolio worth, what data sources do I have, here's a giant AI generator, oh here's what's broken.* Promote `NeedsAttentionPanel` to directly under `PortfolioSnapshot`. Demote `AiMarketAnalysisPanel` below `Property Comparison`, or collapse it to a single CTA that expands on click. This is the single highest-impact change.

2. **Unify the status taxonomy.** Right now four panels speak four dialects of "is this data flowing." Pick a canonical tri-state (Live / Pending / Off) with one badge component and one color mapping, and apply it to SourceStatusRow, SourceDiagnosticsPanel, DataCoveragePanel, and PropertyCard verification. This will reduce cognitive load every time the user scans the page.

3. **Resolve the per-property AI redundancy.** Two entry points (top panel "Property research" mode + per-card buttons) for the same action is decision fatigue and implementation duplication. Remove the top panel's property mode; keep the per-card buttons since they're contextually anchored where the user is already looking.

4. **(Stretch) Add a portfolio-level "Refresh all" in the header** so the user doesn't have to scroll to Settings, open the disclosure, and click six buttons. One click per refresh cycle is the bar.

---

*Critique scoped to UX/visual review of the rendered React components — no functional or code-review concerns flagged here, by design.*
