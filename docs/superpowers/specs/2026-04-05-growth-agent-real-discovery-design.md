# Growth Agent — Real Discovery & Proactive Community Engagement

**Date:** 2026-04-05
**Status:** Approved
**Scope:** Backend (Growth agent, shared utilities, models) + Frontend (inbox improvements)

## Problem

The Growth agent has the right architecture (shared board, inbox approval, document types) but three critical gaps:

1. **Hallucinated discovery** — `discoverThreads` asks an LLM to "find" URLs without any web access. URLs are fabricated from training data.
2. **Deprecated web search** — `:online` model suffix is deprecated by OpenRouter in favor of the `openrouter:web_search` server tool.
3. **Reactive-only wake conditions** — Growth only wakes on bootstrap or shipped features. No self-driven curiosity.
4. **Inbox gaps** — No content preview, no edit-before-approve, no target URL context for Growth content.

## Design

### 1. Web Search Infrastructure (`shared.ts`)

New `generateTextWithWebSearch` function alongside existing `generateObjectWithFallback`.

Uses `generateText` from AI SDK with `extraBody` to inject the `openrouter:web_search` server tool (the AI SDK's OpenRouter provider filters tools to `type: "function"` only, so server tools must go through `extraBody`).

```typescript
generateTextWithWebSearch({
  models: string[],
  prompt: string,
  systemPrompt: string,
  searchConfig?: {
    max_results?: number,
    allowed_domains?: string[],
    excluded_domains?: string[],
  }
}) → { text: string, citations: Array<{ url: string, title: string, content: string }> }
```

- Model fallback chain (same pattern as `generateObjectWithFallback`)
- Extracts `url_citation` annotations from response
- Returns structured citations alongside raw text

### 2. URL Validation Utility (`shared.ts`)

```typescript
validateUrl(url: string): Promise<{ valid: boolean, status?: number, reason?: string }>
validateUrls(urls: string[]): Promise<Map<string, { valid: boolean, status?: number }>>
```

- HTTP HEAD requests with 5s timeout
- `validateUrls` runs in parallel via `Promise.allSettled`
- Used by Growth discovery AND content generation

### 3. Two-Step Discovery Pipeline (`growth/discovery.ts`)

Replace single `discoverThreads` with:

**Step 1 — `searchCommunities`:** `generateTextWithWebSearch` with domain filtering (`reddit.com`, `news.ycombinator.com`, `linkedin.com`, `x.com`). Returns real URLs via citations.

**Step 2 — `structureDiscoveries`:** `generateObjectWithFallback` (no web search) takes raw text + citations → outputs `threadDiscoverySchema`. Only includes URLs from actual citations.

**Step 3 — `validateDiscoveredUrls`:** HTTP HEAD on each URL. Filters out 404s/unreachable. Logs dropped URLs.

### 4. Deprecate `:online` Models (`models.ts`)

- Mark `SEARCH_FREE`, `SEARCH_PAID`, `SEARCH_MODEL_FALLBACKS` as `@deprecated`
- Add new `WEB_SEARCH_MODELS` constant using regular (non-`:online`) models for use with `generateTextWithWebSearch`
- Update Growth and Sales agents to use the new approach

### 5. Growth Agent Soul — Work-Driven Proactivity

**No time-based wake conditions.** Instead, after every run, Growth self-assesses gaps and writes follow-up notes:

- "Are there competitor entries with no recent research?"
- "Are there community topics I haven't explored yet?"
- "Did I find evolving conversations worth re-checking?"

Gap notes go on the shared board as `note` documents tagged `growth-followup`.

**Updated `shouldWakeGrowth`:** Add condition for unprocessed Growth follow-up notes.

**Updated `GROWTH_SYSTEM_PROMPT`:** Add curiosity-driven self-assessment instructions.

### 6. Sales Agent — Same Web Search Upgrade

Sales prospecting (`runSalesProspecting`) also uses `SEARCH_MODEL_FALLBACKS`. Update to use the two-step pattern: real web search for lead discovery → structure → validate URLs.

### 7. Inbox Improvements

**a) Content preview in inbox card:** When clicking an inbox item that's a document, open the existing `DocumentSheet` (already has full content display, target URL, source URLs, tags, status transitions).

**b) Edit-before-approve:** The `DocumentSheet` already has `TiptapMarkdownEditor` but it's read-only in view mode. Make it editable for `pending_review` documents so the president can tweak wording before approving.

**c) Target URL display in inbox card:** Show the `targetUrl` (the thread being replied to) as a chip/link on the inbox card for Growth content types.

## Files Changed

### Backend
- `packages/backend/convex/autopilot/agents/shared.ts` — add `generateTextWithWebSearch`, `validateUrl`, `validateUrls`
- `packages/backend/convex/autopilot/agents/models.ts` — deprecate `:online`, add `WEB_SEARCH_MODELS`
- `packages/backend/convex/autopilot/agents/growth/discovery.ts` — rewrite with two-step pipeline
- `packages/backend/convex/autopilot/agents/growth/content.ts` — use new discovery, add gap assessment
- `packages/backend/convex/autopilot/agents/sales.ts` — update prospecting to use web search
- `packages/backend/convex/autopilot/agents/prompts.ts` — update Growth and Sales prompts
- `packages/backend/convex/autopilot/heartbeat.ts` — add Growth follow-up note wake condition

### Frontend
- `apps/web/src/features/autopilot/components/inbox-item-card.tsx` — add target URL chip, click-to-open document sheet
- `apps/web/app/(app)/dashboard/[orgSlug]/autopilot/inbox/page.tsx` — integrate DocumentSheet for detail view
- `apps/web/src/features/autopilot/components/document-sheet.tsx` — make editor editable for pending_review items, add save mutation

## Non-Goals
- Actual posting to platforms (Reddit API, LinkedIn API, etc.) — manual for now
- Time-based cron scanning — stays work-driven
- `ToolLoopAgent` migration — agents are single-shot Convex actions, not long-lived loops
