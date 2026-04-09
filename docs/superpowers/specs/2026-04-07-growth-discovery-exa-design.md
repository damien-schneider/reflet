# Growth Discovery Pipeline Overhaul + Exa.ai Integration

**Date:** 2026-04-07
**Scope:** Autopilot Growth agent discovery, content enrichment, Exa.ai integration, Sales agent search improvements

---

## Problem Statement

The current growth discovery pipeline produces low-quality results:

1. **Generic search queries** — One big prompt asks an LLM to "find relevant discussions." No competitor-aware queries, no platform-specific targeting, no problem-domain keyword extraction.
2. **No thread content fetched** — We discover URLs but never read the actual thread. The LLM writes replies to threads it hasn't read, producing irrelevant responses (e.g., replying to a tattoo post thinking it's about screen recording).
3. **No relevance validation** — URL validation (HEAD request) only checks the link is alive, not that the content is relevant to the product.
4. **Poor output schema** — The discovery schema only captures `url`, `title`, `relevanceScore`, `suggestedAngle`. No original post content, no comments, no community context.
5. **Sales/Growth overlap** — Both agents run independent web searches against the same domains with no coordination. Sales doesn't leverage Growth's market intelligence for targeted prospecting.

---

## Architecture Overview

### New 4-Stage Pipeline

```
Stage 1: QUERY CONSTRUCTION
  Product def + competitors + problem keywords
  → LLM generates 6-8 targeted search queries per platform
  
Stage 2: MULTI-SEARCH EXECUTION  
  Exa.ai (if EXA_API_KEY set) OR enhanced web search (fallback)
  → Run queries with domain filtering + date filtering
  → Deduplicate results by URL
  
Stage 3: CONTENT ENRICHMENT
  For each discovered URL:
  → Exa contents API (preferred) OR fetch + extract
  → Reddit .json trick for Reddit URLs (free, structured)
  → Extract: original post, top comments, community, post age

Stage 4: RELEVANCE + QUALITY SCORING
  LLM reads actual thread content + product definition
  → Scores genuine relevance (not just title match)
  → Drops threads below threshold (70/100)
  → Checks thread freshness (>30 days = stale, skip for replies)
  → Only qualified threads proceed to content generation
```

### Shared Search Layer

New file: `agents/shared_search.ts` — unified search abstraction used by both Growth and Sales.

```
┌─────────────┐     ┌──────────────────┐     ┌──────────────┐
│ Growth Agent │     │ shared_search.ts │     │ Sales Agent  │
│  discovery   │────▶│                  │◀────│ prospecting  │
└─────────────┘     │  searchWithExa() │     └──────────────┘
                    │  searchWithWeb() │
                    │  fetchContent()  │
                    │  scoreRelevance()│
                    └──────────────────┘
```

**Growth** searches for: community threads to engage with, market signals, competitor mentions.
**Sales** searches for: people with buying intent, company signals, lead contact info.

They share the search infrastructure but have different query strategies and different output schemas.

---

## Detailed Design

### 1. Exa.ai Client (`agents/shared_exa.ts`)

New file. Thin wrapper around the Exa REST API (no SDK dependency — just `fetch`).

```typescript
// Environment check
const EXA_API_KEY = process.env.EXA_API_KEY;
export const isExaAvailable = (): boolean => !!EXA_API_KEY;

// Core search function
interface ExaSearchParams {
  query: string;
  numResults?: number;              // default 10
  includeDomains?: string[];
  excludeDomains?: string[];
  startPublishedDate?: string;      // ISO 8601
  category?: "company" | "people" | "news" | "personal site";
  includeText?: string[];           // max 1 string, 5 words
  contents?: {
    text?: { maxCharacters?: number };
    highlights?: { maxCharacters?: number; query?: string };
  };
}

interface ExaResult {
  url: string;
  title: string;
  publishedDate: string | null;
  author: string | null;
  text?: string;                    // full page content if requested
  highlights?: string[];            // relevant excerpts
  highlightScores?: number[];
}

interface ExaSearchResponse {
  results: ExaResult[];
  costDollars: { total: number };
}

export async function searchWithExa(params: ExaSearchParams): Promise<ExaSearchResponse>
```

**Key decisions:**
- Direct `fetch()` to `https://api.exa.ai/search` — no npm dependency. The project already uses `ai` (Vercel AI SDK) and Exa offers `@exalabs/ai-sdk`, but for our use case we call specific endpoints with precise parameters (domain filtering, categories, content options). A thin `fetch` wrapper gives us full control without SDK abstraction leaking into our domain logic.
- Auth via `x-api-key` header. Key read from `process.env.EXA_API_KEY`.
- Always request `contents.highlights` with `maxCharacters: 2000` (token-efficient, 10x savings per Exa docs) for discovery. Request `contents.text` with `maxCharacters: 5000` only during enrichment when we need full thread content.
- Use `type: "auto"` for general searches (~1s latency, best quality). Use `type: "fast"` only if budget/latency is a concern.
- Track `costDollars.total` from every response and log it in activity.
- Respect Exa parameter constraints: `includeText`/`excludeText` accept only single-item arrays (max 5 words); `category: "company"/"people"` disables date/text filters and `excludeDomains`.

### 2. Query Construction (`agents/growth/query_builder.ts`)

New file. Generates targeted search queries from product context + competitors.

```typescript
interface SearchQuerySet {
  queries: Array<{
    query: string;
    platform: "reddit" | "hackernews" | "twitter" | "linkedin" | "general";
    intent: "problem_search" | "competitor_alternative" | "pain_point" | "recommendation_request";
  }>;
}

export async function buildGrowthQueries(
  productName: string,
  productDescription: string,
  competitors: string[],
  previouslyFoundUrls: string[]  // avoid re-discovering same threads
): Promise<SearchQuerySet>
```

The LLM prompt for query generation:

```
You are a growth strategist for ${productName}.

PRODUCT: ${productDescription}
COMPETITORS: ${competitors.join(", ")}

Generate 6-8 specific search queries to find community discussions where our product 
can naturally add value. Each query should target a specific platform and intent.

QUERY TYPES TO GENERATE:
1. PROBLEM SEARCHES (2-3 queries):
   People asking about the exact problem we solve.
   Example: "free screen recorder mac no watermark"
   
2. COMPETITOR ALTERNATIVES (1-2 queries):
   People looking for alternatives to our competitors.
   Example: "Screen Studio alternative free" or "tired of Loom limitations"

3. PAIN POINT THREADS (1-2 queries):  
   People frustrated with existing solutions.
   Example: "OBS too complex screen recording mac"

4. RECOMMENDATION REQUESTS (1-2 queries):
   "What do you use for X?" threads.
   Example: "what screen recorder do you use for tutorials mac"

RULES:
- Keep queries short (3-8 words) — search engines work better with concise queries
- Use natural language people actually type, not marketing speak
- Include the platform context (e.g. queries for Reddit should match how Redditors write)
- Do NOT include the product name in search queries (we're finding organic opportunities)
- Do NOT generate queries about our tech stack (React, Convex, etc.)
```

### 3. Multi-Search Execution (`agents/shared_search.ts`)

New file. Runs queries through Exa or web search with automatic fallback.

```typescript
interface DiscoveredThread {
  url: string;
  title: string;
  platform: "reddit" | "hackernews" | "twitter" | "linkedin";
  // Content from search (highlights or snippets)
  searchSnippet: string;
  publishedDate: string | null;
}

export async function executeSearchQueries(
  queries: SearchQuerySet["queries"]
): Promise<DiscoveredThread[]>
```

**Exa path** (when `EXA_API_KEY` available):
- Each query → `searchWithExa()` with:
  - `includeDomains` matching the query's platform (e.g. `["reddit.com"]` for Reddit queries)
  - `startPublishedDate` = 30 days ago (recent threads only)
  - `numResults` = 5 per query
  - `contents.highlights` = `{ maxCharacters: 2000, query: productDescription }`
- Deduplicate by URL across all query results.
- Cost is tracked per-query and summed.

**Web search fallback** (no Exa key):
- Enhanced version of current `generateTextWithWebSearch()` approach.
- Each query runs as a separate web search with `allowed_domains` matching the platform.
- Structured results extracted the same way as today, but with multiple focused queries instead of one generic one.

### 4. Content Enrichment (`agents/growth/content_enricher.ts`)

New file. Fetches actual thread content for qualified URLs.

```typescript
interface EnrichedThread {
  url: string;
  title: string;
  platform: "reddit" | "hackernews" | "twitter" | "linkedin";
  // Enriched content
  originalPostContent: string;     // The actual post/question text
  topComments: string[];           // Top 3-5 comments
  community: string;               // e.g. "r/macapps", "r/ScreenRecording"
  postAge: string;                 // "2 days ago", "3 weeks ago"
  commentCount: number;            // engagement signal
  authorName: string;              // who posted
}

export async function enrichThreads(
  threads: DiscoveredThread[]
): Promise<EnrichedThread[]>
```

**Reddit enrichment strategy:**
1. **Primary (Exa):** If Exa available, use `searchWithExa` with `contents.text` for the specific URL. Exa can livecrawl Reddit pages.
2. **Fallback (Reddit JSON):** Append `.json` to any Reddit URL (e.g., `https://www.reddit.com/r/macapps/comments/xyz.json`). Returns structured JSON with post body, comments, scores, timestamps. No API key needed. Parse the JSON to extract `data.children[0].data` for the post and `data.children[1:]` for comments.
3. **Final fallback:** `fetch()` the HTML page, extract text content, send to LLM for structuring.

**HN enrichment strategy:**
1. **Primary:** HN Algolia API — `https://hn.algolia.com/api/v1/items/{id}`. Returns post text + all comments. Free, no auth.
2. **Fallback (Exa):** Use Exa contents API.

**Twitter/LinkedIn enrichment:**
1. **Exa only** — these platforms block direct scraping. Exa's livecrawl handles them.
2. If Exa unavailable, use the search snippet from web search (limited but better than nothing).

### 5. Relevance Scoring (`agents/growth/relevance_scorer.ts`)

New file. LLM-based relevance check using actual thread content.

```typescript
interface ScoredThread extends EnrichedThread {
  relevanceScore: number;          // 0-100
  relevanceReason: string;         // Why this score
  suggestedAngle: string;          // How to engage
  isStale: boolean;                // >30 days old
  engagementLevel: "high" | "medium" | "low";  // based on comments
}

export async function scoreThreadRelevance(
  threads: EnrichedThread[],
  productName: string,
  productDescription: string
): Promise<ScoredThread[]>
```

LLM prompt:

```
You are evaluating whether community threads are genuine opportunities for ${productName}.

PRODUCT: ${productDescription}

For each thread, read the ACTUAL CONTENT (not just the title) and score:

1. RELEVANCE (0-100): Does this person's problem/question genuinely relate to what our product does?
   - 90-100: They are literally asking for what we build
   - 70-89: Strong overlap, our product would clearly help
   - 50-69: Tangential — related topic but not a direct fit
   - 0-49: Not relevant — drop it

2. ENGAGEMENT OPPORTUNITY: Can we add genuine value without being spammy?
   - Is the thread still active (accepting new replies)?
   - Are there already good answers? (if solved, don't pile on)
   - Would mentioning our product feel natural or forced?

3. STALENESS: Threads >30 days old are stale for replies (mark isStale: true)

CRITICAL: Read the actual post content and comments, not just the title. 
A title like "Free screen recorder" could be about anything — the post body tells the truth.

Only pass threads with relevanceScore >= 70.
```

### 6. Enhanced Output Schema

The `threadDiscoverySchema` in `discovery.ts` becomes:

```typescript
export const enrichedThreadSchema = z.object({
  threads: z.array(z.object({
    // Identity
    platform: z.enum(["reddit", "hackernews", "linkedin", "twitter"]),
    url: z.string(),
    title: z.string(),
    community: z.string().describe("e.g. r/macapps, Hacker News front page"),
    
    // Content (from enrichment)
    originalPostContent: z.string().describe("The actual post text"),
    topComments: z.array(z.string()).describe("Top 3-5 comments for context"),
    authorName: z.string(),
    
    // Scoring (from relevance check)
    relevanceScore: z.number().min(0).max(100),
    relevanceReason: z.string(),
    suggestedAngle: z.string(),
    
    // Signals
    postAge: z.string(),
    commentCount: z.number(),
    isStale: z.boolean(),
    engagementLevel: z.enum(["high", "medium", "low"]),
  })),
});
```

### 7. Content Generation Update

`generateGrowthContent` in `content_generation.ts` gets enriched thread data:

```
THREAD TO REPLY TO:
Platform: Reddit (r/macapps)  
Title: "Free screen recorder without watermark for macOS?"
Original post: "I'm looking for a free screen recorder for macOS that doesn't add a 
watermark. I've tried OBS but it's too complex for simple recordings. QuickTime is too 
basic — no annotation tools. Any suggestions that just work?"

Top comments already posted:
- "Kap is good but hasn't been updated in a while" (47 upvotes)
- "Screen Studio is amazing but $89 is steep for occasional use" (32 upvotes)  
- "Have you tried the built-in Screenshot toolbar? Cmd+Shift+5" (28 upvotes)

---

Write a reply that:
1. Acknowledges the specific pain points mentioned (OBS complexity, QuickTime limitations)
2. Adds genuine value (don't just say "try X")
3. Mentions ${productName} naturally — explain what specifically makes it relevant
4. Matches the subreddit's conversational tone
5. Does NOT sound like a marketing pitch
```

### 8. Document Storage Updates

When saving growth content documents, include enriched metadata:

```typescript
await ctx.runMutation(internal.autopilot.documents.createDocument, {
  organizationId,
  type: "reddit_reply",
  title: `Reply to: ${thread.title}`,
  content: generatedReply,
  targetUrl: thread.url,
  platform: thread.platform,
  sourceAgent: "growth",
  needsReview: true,
  reviewType: "growth_content",
  tags: ["growth", "reddit_reply"],
  // Store thread context as JSON metadata so UI can render it
  metadata: JSON.stringify({
    originalPost: thread.originalPostContent,
    topComments: thread.topComments,
    community: thread.community,
    postAge: thread.postAge,
    commentCount: thread.commentCount,
    relevanceScore: thread.relevanceScore,
    relevanceReason: thread.relevanceReason,
  }),
});
```

### 9. Sales Agent Search Improvements

The sales agent gets the same Exa/fallback infrastructure with specialized patterns learned from Exa's lead generation best practices.

**Sales-specific Exa usage (from Exa's official patterns):**

1. **People discovery** — `category: "people"`:
   - Find decision-makers, content creators, potential users who mention competitor products
   - Note: `category: "people"` does NOT support date filters, text inclusion/exclusion, or `excludeDomains`
   - Use `includeDomains: ["linkedin.com"]` (the only domain filter supported with `people` category)
   - Example: `{ query: "content creator screen recording tutorials", category: "people", includeDomains: ["linkedin.com"], numResults: 10 }`

2. **Company discovery** — `category: "company"`:
   - Find companies in the target market, competitors' customers, agencies that need screen recording
   - Note: `category: "company"` does NOT support date filters, text inclusion/exclusion, or `excludeDomains`
   - Example: `{ query: "video production agency creating tutorials", category: "company", numResults: 10 }`

3. **Lead enrichment** — query variations pattern (from Exa lead gen skill):
   - Generate 2-3 query phrasings per vertical, run in parallel, deduplicate results
   - Micro-vertical decomposition: break broad categories into specific niches
     - e.g. "online course creators" → "Udemy instructors", "YouTube educators", "corporate training producers"
   - Competitor mining queries: "companies similar to {competitor} creating {content_type}"

4. **Structured output** for lead scoring:
   - Use Exa's `outputSchema` to get structured JSON directly:
     ```json
     {
       "type": "object",
       "properties": {
         "leads": {
           "type": "array",
           "items": {
             "properties": {
               "name": { "type": "string" },
               "company": { "type": "string" },
               "relevance_reasoning": { "type": "string" },
               "icp_fit_score": { "type": "integer" }
             }
           }
         }
       }
     }
     ```

**Growth/Sales boundary (clear separation):**

| Dimension | Growth Agent | Sales Agent |
|-----------|-------------|-------------|
| **Searches for** | Community threads, market signals | People, companies, buying intent |
| **Exa categories** | No category (general) + `includeDomains` | `"people"`, `"company"` |
| **Domain focus** | reddit.com, news.ycombinator.com, x.com | linkedin.com, github.com, producthunt.com |
| **Output** | Content docs (replies, posts, blog) | Leads (person/company records) |
| **Intent** | Engage communities, build presence | Fill pipeline, find buyers |
| **Data flow** | Growth → market research docs → Sales reads them | Sales → lead patterns → Growth uses for targeting |

Both share `shared_search.ts` + `shared_exa.ts` for infrastructure but call with completely different parameters and categories.

**Key Exa constraint to respect:**
- `includeText` / `excludeText` accept only a **single-item array** (max 5 words). Multi-item arrays cause 400 errors.
- `category: "company"` and `category: "people"` disable all date filters and text filters.
- Always check `costDollars.total` in responses and log it.

### 10. Exa Cost Tracking

Every Exa call returns `costDollars.total`. We log this:

```typescript
await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
  organizationId,
  agent: "growth",
  level: "info",
  message: `Exa search: ${results.length} results`,
  details: `Cost: $${cost.toFixed(4)} | Query: "${query}"`,
});
```

The cost guard system (`cost_guard.ts`) should include Exa costs in its budget tracking.

---

## File Changes Summary

### New Files
| File | Purpose |
|------|---------|
| `agents/shared_exa.ts` | Exa.ai REST client (no SDK dep), env check, cost tracking |
| `agents/shared_search.ts` | Unified search layer: Exa with web search fallback |
| `agents/growth/query_builder.ts` | Competitor-aware search query generation |
| `agents/growth/content_enricher.ts` | Fetch actual thread content (Reddit JSON, HN API, Exa) |
| `agents/growth/relevance_scorer.ts` | LLM-based relevance validation with thread content |

### Modified Files
| File | Changes |
|------|---------|
| `agents/growth/discovery.ts` | Replace `searchCommunities` + `structureDiscoveries` with new pipeline. Update `threadDiscoverySchema` to `enrichedThreadSchema`. |
| `agents/growth/content_generation.ts` | Pass enriched thread data to `generateGrowthContent`. Update `saveContentDocuments` to store metadata. |
| `agents/growth/market_research.ts` | Use `shared_search` instead of direct `generateTextWithWebSearch`. Load competitors for query construction. |
| `agents/sales_prospecting.ts` | Use `shared_search` with Exa `people`/`company` categories. |
| `agents/shared_web.ts` | Keep for URL validation. Remove search as primary path (moved to shared_search). |

### Unchanged Files
| File | Why |
|------|-----|
| `agents/growth/product_context.ts` | No changes needed |
| `agents/growth/research_helpers.ts` | Schema + save logic stays the same |
| `agents/models.ts` | Web search models still used in fallback path |
| `agents/prompts.ts` | Growth system prompt stays the same |
| `schema/documents.tables.ts` | `metadata` field already supports JSON string |

---

## Fallback Strategy

```
Is EXA_API_KEY set?
  ├── YES → Use Exa for search + content enrichment
  │         Track cost, respect budget limits
  │         If Exa fails (rate limit, error) → fall back to web search
  │
  └── NO  → Use enhanced web search (multiple targeted queries)
            Use Reddit .json / HN Algolia API for content enrichment
            Use fetch() + LLM extraction for other platforms
```

Both paths produce the same `EnrichedThread[]` output — the rest of the pipeline (relevance scoring, content generation, document saving) doesn't know or care which search backend was used.

---

## API Recommendation Summary

**For production (later):** Exa.ai
- Search: `POST /search` with `includeDomains`, `contents.highlights`, date filters
- Content: `contents.text` with `maxCharacters: 5000` for thread enrichment  
- People: `category: "people"` for sales lead discovery
- Companies: `category: "company"` for market research
- Pricing: Pay-per-search, cost tracked via `costDollars` in every response
- No SDK needed: Direct REST calls via `fetch()`

**Alternative APIs evaluated but not chosen:**
- Apify: More powerful scraping but overkill for search + content retrieval
- Syften: Reddit/HN monitoring but no content retrieval, no LinkedIn/X
- Brand24/Mention: Enterprise pricing, more monitoring than search
