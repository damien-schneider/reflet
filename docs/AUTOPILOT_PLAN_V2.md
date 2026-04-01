# Reflet Autopilot V2 — Full Implementation Plan

> **Vision:** Turn Reflet into an **AI product team for existing codebases**.
> Paste a GitHub repo → get an autonomous CEO, PM, CTO, Security Engineer, Architecture Guardian, Dev team, and Growth Marketer — all running your product while you sleep.
>
> **Context:** This is Reflet's answer to NanoCorp — but instead of creating businesses from scratch, we manage existing products end-to-end. The user pastes a repo and the AI team handles everything: roadmap, code, security, marketing, analytics.
>
> **Building approach:** All features are built concurrently using Claude Code subagents. No sprints — parallel execution.

---

## Table of Contents

1. [Architecture & Key Decisions](#1-architecture--key-decisions)
2. [Tech Stack Decisions](#2-tech-stack-decisions)
3. [Agent Roster (8 Agents)](#3-agent-roster-8-agents)
4. [Schema — New Tables](#4-schema--new-tables)
5. [Backend Implementation](#5-backend-implementation)
6. [Frontend Implementation](#6-frontend-implementation)
7. [Safeguards & Guardrails](#7-safeguards--guardrails)
8. [Cost Tracking](#8-cost-tracking)
9. [Billing & Premium Gating](#9-billing--premium-gating)
10. [File-by-File Changelist](#10-file-by-file-changelist)
11. [Subagent Task Breakdown](#11-subagent-task-breakdown)

---

## 1. Architecture & Key Decisions

### High-level flow

```
User pastes GitHub repo URL
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│                     CEO AGENT (Chat Panel)                      │
│  Always visible right-side panel. Free-form conversation.       │
│  Sees everything: tasks, growth, analytics, revenue.            │
│  Can trigger any agent manually. Explains decisions.            │
├─────────────────────────────────────────────────────────────────┤
│                     ORCHESTRATOR (State Machine)                │
│  Convex internalAction. Cron + event-driven triggers.           │
│  Runs the pipeline: PM → CTO → Dev → Security → Architect →    │
│  Growth. Tracks pipeline runs in autopilotRuns table.           │
├────────┬──────────┬───────────┬───────────┬───────────┬─────────┤
│   PM   │   CTO    │ Dev(1..N) │ Security  │ Architect │ Growth  │
│ Agent  │  Agent   │  Agent    │  Agent    │  Agent    │ Agent   │
├────────┴──────────┴───────────┴───────────┴───────────┴─────────┤
│                     DATA LAYER (Convex)                         │
│  autopilotTasks, growthItems, agentActivityLog, autopilotRuns   │
│  + existing: feedback, intelligence, changelog, github, stripe  │
├─────────────────────────────────────────────────────────────────┤
│                     EXTERNAL SERVICES                           │
│  Claude Agent SDK (code execution)  │  GitHub API (PRs/CI)      │
│  Stripe Connect (revenue data)      │  OpenRouter (LLM)         │
└─────────────────────────────────────────────────────────────────┘
```

### Single repo per organization

One org = one product = one repo. No multi-repo support in v1.

### One orchestration layer: Convex

Everything runs through Convex internalActions. No split between Convex and Next.js API routes for orchestration. When a Convex action needs to execute code (Dev Agent), it calls a worker that runs the Claude Agent SDK.

---

## 2. Tech Stack Decisions

### Where do agents run?

| Agent | Runs in | Why |
|-------|---------|-----|
| CEO (Chat) | Convex `@convex-dev/agent` | Conversational, needs Convex data access, already works |
| PM | Convex `internalAction` + AI SDK `generateObject` | Reads from Convex tables, writes structured output. No code execution needed |
| CTO | Convex `internalAction` + AI SDK `generateObject` | Reads repo analysis + code search (already exist), outputs specs. No code execution |
| Dev | **Convex `internalAction` → Worker → Claude Agent SDK** | Needs filesystem: clone repo, edit files, run linters, commit, push |
| Security | **Convex `internalAction` → Worker → Claude Agent SDK** | Needs filesystem: run `bun audit`, analyze code, create fix PRs |
| Architect | **Convex `internalAction` → Worker → Claude Agent SDK** | Needs filesystem: scan for AGENTS.md violations, refactor |
| Growth | Convex `internalAction` + AI SDK `generateObject` | Pure text generation, no code execution. Uses `:online` models for web search |

### AI SDK vs Convex AI vs Claude Agent SDK

**Use AI SDK (`generateObject` / `generateText`) for:**
- PM Agent (scoring, task creation) — structured output
- CTO Agent (spec generation) — structured output
- Growth Agent (content generation) — structured output
- All "thinking" agents that don't need to touch files

Pattern: Same as existing `intelligence_agent.ts` and `feedback_auto_tagging.ts`.

```typescript
// Example: PM Agent generates tasks using structured output
const result = await generateObject({
  model: openrouter("anthropic/claude-sonnet-4"),
  schema: taskBatchSchema,   // Zod schema → type-safe output
  system: PM_SYSTEM_PROMPT,
  prompt: buildPMPrompt(signals, existingTasks),
});
```

**Use `@convex-dev/agent` for:**
- CEO Chat Agent — needs thread-based conversation with memory
- Already works this way (see `chatAgent` in `ai/agent.ts`)

**Use Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`) for:**
- Dev Agent — needs Read, Write, Edit, Bash, Glob, Grep on real files
- Security Agent — needs `bun audit`, dependency scanning, code analysis
- Architect Agent — needs codebase scanning, AGENTS.md rule checking

```typescript
// Example: Dev Agent creates a feature via Claude Agent SDK
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: implementationPrompt,
  options: {
    allowedTools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep"],
    appendSystemPrompt: agentsMdContent, // AGENTS.md rules
    agents: {
      "reviewer": {
        description: "Reviews changes against AGENTS.md rules",
        prompt: "Check all modified files against these rules: ...",
        tools: ["Read", "Glob", "Grep"]
      }
    },
    hooks: {
      PostToolUse: [{
        matcher: "Edit|Write",
        hooks: [logFileChangeToConvex]
      }]
    }
  }
})) {
  // Stream progress back to Convex via mutation
  await reportProgress(message);
}
```

### Dev Agent Worker Architecture

The Dev Agent can't run inside Convex's serverless runtime (no filesystem). Options:

**Option A: Self-hosted worker (Railway / Fly.io)** — Recommended for v1
- A lightweight Node.js service that receives tasks from Convex
- Clones repo, runs Claude Agent SDK, pushes to GitHub
- Convex calls it via `fetch()` from an `internalAction`
- Reports progress back via Convex HTTP endpoints

**Option B: GitHub Action trigger** — Simpler but less control
- Convex creates a GitHub issue with the implementation prompt
- A custom GitHub Action runs Claude Agent SDK (or Codex) in the CI environment
- PR is created automatically
- Less real-time progress, but no infra to manage

**Option C: Vercel serverless function** — Possible but timeout-limited
- Vercel functions have a 5-minute timeout (Pro plan)
- Code generation tasks can take longer
- Works for small tasks, not for complex features

**Recommendation:** Start with **Option A** (self-hosted worker on Railway). It gives full control, no timeouts, and you can stream progress. The worker is tiny (~100 lines of TypeScript) — it just clones, runs the SDK, and pushes.

### Why NOT GitHub Copilot Coding Agent?

- No programmatic API trigger as of March 2026 (confirmed)
- Locked to GitHub's models — can't use Claude
- Can't stream progress back to your UI
- Can't customize the system prompt or rules

### Why NOT OpenAI Codex directly?

- No REST API for task creation (only GitHub Actions or `@codex` mentions)
- Locked to OpenAI models
- Could be offered as a future **alternative backend** the user chooses in settings

---

## 3. Agent Roster (8 Agents)

### 3.1 CEO Agent (Chat Panel)

**Purpose:** The user's always-available AI product advisor. Free-form chat with full context.

**UI:** Right-side panel, always visible on the autopilot dashboard. Like a Slack DM with your AI CEO.

**Has access to:**
- All autopilot tasks (current state, history)
- Growth queue and content items
- Recent agent activity log
- Revenue data (from Stripe Connect)
- Feedback signals and intelligence insights
- Pipeline run history

**Can do (via tool calling):**
- Create/modify/prioritize tasks
- Trigger a pipeline run
- Approve/reject pending items
- Ask clarifying questions to the user
- Explain any agent's decision ("why did you prioritize X?")

**Implementation:** Extend existing `chatAgent` in `ai/agent.ts` with autopilot-specific tools:

```typescript
export const ceoAgent = new Agent(components.agent, {
  name: "CEO Agent",
  languageModel: openrouter("anthropic/claude-sonnet-4"),
  instructions: `You are the AI CEO of this product. You have full visibility into:
- The product roadmap and task board
- User feedback and intelligence signals
- Revenue data and growth metrics
- All agent activity and pipeline runs

Your job is to:
1. Advise the founder on product strategy
2. Explain agent decisions in plain language
3. Execute commands (create tasks, trigger agents, approve items)
4. Proactively surface important insights and opportunities

Be direct, concise, and opinionated. You're a co-founder, not a consultant.`,
  tools: {
    // Convex queries/mutations exposed as agent tools
    getTaskBoard: { ... },
    createTask: { ... },
    triggerPipeline: { ... },
    approveGrowthItem: { ... },
    getRevenueData: { ... },
    getRecentActivity: { ... },
  },
});
```

### 3.2 PM Agent (Product Manager)

**Purpose:** Triages all signals into a prioritized, auto-filled task board.

**Inputs:**
- User feedback (votes, priority, complexity from existing AI fields)
- Intelligence insights (competitor gaps, community signals, market trends)
- Revenue impact signals (from Stripe: which features correlate with upgrades)
- CEO directives (tasks the user creates via chat)

**Outputs:** `autopilotTasks` entries with structured fields via `generateObject`:

```typescript
const taskSchema = z.object({
  title: z.string().max(100),
  description: z.string(),
  userStory: z.string().describe("As a [user], I want to [action] so that [benefit]"),
  acceptanceCriteria: z.array(z.string()),
  priority: z.enum(["critical", "high", "medium", "low"]),
  complexity: z.enum(["trivial", "simple", "moderate", "complex", "very_complex"]),
  estimatedMinutes: z.number(),
  source: z.enum(["feedback", "intelligence", "competitor_gap", "growth", "security", "manual"]),
  linkedFeedbackIds: z.array(z.string()).optional(),
  linkedInsightIds: z.array(z.string()).optional(),
  reasoning: z.string().describe("Why this task matters now"),
});
```

**Scoring formula (computed, not AI-generated):**

```typescript
const computePriorityScore = (task, feedback, insights, revenue) => {
  const voteWeight = Math.min(feedback.voteCount / 10, 1) * 25;        // 0-25 points
  const aiPriorityWeight = priorityToScore(feedback.aiPriority) * 20;   // 0-20 points
  const intelligenceWeight = insights.length > 0 ? 15 : 0;             // 0-15 points
  const competitorGapWeight = isCompetitorGap ? 15 : 0;                // 0-15 points
  const revenueWeight = affectsRevenueFeature ? 15 : 0;                // 0-15 points
  const recencyWeight = recencyDecay(feedback.createdAt) * 10;         // 0-10 points
  return voteWeight + aiPriorityWeight + intelligenceWeight +
         competitorGapWeight + revenueWeight + recencyWeight;
};
```

### 3.3 CTO Agent (Technical Architect)

**Purpose:** Converts PM tasks into technical specs and implementation prompts.

**Uses existing infrastructure:**
- `repo_analysis.ts` — repo structure, tech stack
- `code_search.ts` — find relevant files
- `repoAnalysisAgent` — already in `ai/agent.ts`

**Output schema:**

```typescript
const specSchema = z.object({
  approach: z.string().describe("High-level implementation strategy"),
  filesToModify: z.array(z.object({
    path: z.string(),
    reason: z.string(),
    changeType: z.enum(["modify", "create", "delete"]),
  })),
  dependencies: z.array(z.string()).describe("Other tasks this depends on"),
  riskLevel: z.enum(["low", "medium", "high"]),
  riskExplanation: z.string().optional(),
  implementationPrompt: z.string().describe(
    "Complete, self-contained prompt for the Dev Agent. Includes all context needed to implement the change without further questions."
  ),
  testRequirements: z.array(z.string()),
  estimatedLinesOfCode: z.number(),
});
```

The `implementationPrompt` is the key output — it's a complete prompt that includes:
- Task description and acceptance criteria
- Relevant existing code snippets (from code search)
- Architecture patterns to follow (from repo analysis)
- Specific file paths to modify
- Test requirements
- AGENTS.md rules to follow

### 3.4 Dev Agent (Developer)

**Purpose:** Executes code changes. Creates PRs.

**Runs via:** Claude Agent SDK on a worker (see section 2).

**Flow:**
1. Receives `implementationPrompt` from CTO
2. Clones repo to workspace
3. Creates feature branch (`autopilot/task-{id}-{slug}`)
4. Runs Claude Agent SDK with prompt + AGENTS.md rules
5. Claude reads relevant files, writes code, runs `bun x ultracite fix --unsafe`
6. Claude runs `turbo check-types` and `turbo test`
7. If checks fail: Claude reads errors, fixes, retries (max 3 times)
8. Commits changes, pushes to branch
9. Opens PR via GitHub API with:
   - Title: task title
   - Body: task description, acceptance criteria, linked feedback
   - Labels: `autopilot`, priority level
10. Reports PR URL + status back to Convex

**Claude Agent SDK configuration for Dev Agent:**

```typescript
const devAgentConfig = {
  allowedTools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep"],
  appendSystemPrompt: `${agentsMdContent}

CRITICAL RULES:
- Run 'bun x ultracite fix --unsafe' after every code change
- Run 'turbo check-types' before committing - zero errors required
- Run 'turbo test' before committing - all must pass
- Maximum 3 retry attempts on failures
- Never modify: schema.ts, package.json, tsconfig, biome.jsonc, turbo.json
- Never modify auth, billing, or data deletion logic
- Use existing patterns from the codebase. Read before writing.`,
  agents: {
    "self-reviewer": {
      description: "Reviews your own code before committing",
      prompt: "Review all modified files against AGENTS.md rules. Check for: type safety, naming, duplication, test coverage, accessibility. Report any issues.",
      tools: ["Read", "Glob", "Grep"]
    }
  }
};
```

### 3.5 Security Agent

**Purpose:** Continuously scans for vulnerabilities, auto-creates fix PRs.

**Runs via:** Claude Agent SDK on worker (same as Dev Agent).

**Triggers:**
- After every merged PR
- Daily cron
- On demand

**What it checks:**
1. `bun audit` / `npm audit` — dependency vulnerabilities
2. Secret scanning — API keys, tokens in code
3. OWASP patterns — XSS, injection, insecure direct object references
4. Dependency freshness — outdated packages with known CVEs
5. Permission checks — proper auth on all endpoints

**Output:** Creates PRs with fix-only changes. These PRs are auto-mergeable (configurable) because they don't change functionality.

**PR format:**
```
Title: 🔒 Security: [brief description]
Labels: autopilot, security, auto-merge-eligible
Body:
  ## Vulnerability
  [what was found, severity]

  ## Fix
  [what was changed]

  ## Verification
  - [ ] bun audit passes
  - [ ] No new vulnerabilities introduced
  - [ ] All tests pass
```

### 3.6 Architecture Agent (Guardian)

**Purpose:** Proactively maintains codebase health. Enforces AGENTS.md rules.

**Runs via:** Claude Agent SDK on worker.

**Triggers:**
- After every merged PR (checks if the merge introduced any violations)
- Weekly full scan
- On demand

**What it checks (from AGENTS.md):**
- Files > 400 lines → split them
- Functions > 50 lines → refactor
- Nesting > 3 levels → early returns
- Folders > 8 files → extract features
- Barrel files → remove them
- Duplicate code → extract to shared
- `any`, `enum`, `@ts-ignore` → fix types
- Missing test coverage → add tests
- `useEffect` without name → add names
- Raw HTML elements → use design system components

**Output:** Creates refactoring PRs. Each PR fixes one category of violation across the codebase.

### 3.7 Growth Agent (Marketer)

**Purpose:** Turns shipped work into distribution. Everything pre-built, one-click.

**Runs via:** Convex `internalAction` + AI SDK `generateObject` + `:online` models for web search.

**Key principle:** The user should never write anything. Every growth item is ready to post with a single click or tap.

**Growth item types and their UX:**

| Type | What the user sees | Action |
|------|-------------------|--------|
| Reddit reply | Thread URL + pre-written reply | "Open Thread" button (link) + "Copy Reply" button |
| LinkedIn post | Full post text + suggested image prompt | "Copy Post" button + link to LinkedIn compose |
| Twitter/X post | Tweet text (280 chars) | "Copy Tweet" button + link to X compose |
| HN comment | Thread URL + pre-written comment | "Open Thread" + "Copy Comment" |
| LinkedIn comment | Comment URL + reply text | "Open Comment" + "Copy Reply" |
| Blog post | Full markdown article | "Copy to CMS" or "Download .md" |
| Email campaign | Subject + body + segment | "Send via [email provider]" button |
| Changelog announce | Auto-formatted release notes | "Publish" button (uses existing changelog system) |

**Structured output for growth items:**

```typescript
const growthItemSchema = z.object({
  type: z.enum(["reddit_reply", "social_linkedin", "social_twitter", "hn_reply", "linkedin_comment", "blog_post", "email_campaign", "changelog_announcement"]),
  title: z.string().max(100).describe("Internal title for the dashboard"),
  body: z.string().describe("The exact text to post, ready to copy-paste"),
  targetUrl: z.string().url().optional().describe("URL of thread/post to reply to"),
  targetPlatform: z.string().optional(),
  context: z.string().describe("Why this opportunity matters — shown to user"),
  relevanceScore: z.number().min(0).max(1),
  suggestedTiming: z.string().optional().describe("Best time to post, e.g., 'Tuesday 9am EST'"),
});
```

**Finding opportunities — uses existing intelligence pattern:**

```typescript
// Same pattern as intelligence_agent.ts → runCommunitySearch
// But focused on finding threads where the product's shipped features solve problems
const GROWTH_SEARCH_MODELS = [
  "qwen/qwen3.6-plus-preview:free:online",   // Free first
  "openai/gpt-5.4-mini:online",              // Paid fallback
] as const;
```

**For each shipped release or completed task:**
1. Extract key features and pain points solved
2. Search Reddit, HN, LinkedIn for related discussions (`:online` models)
3. Generate reply drafts using `generateObject` with growth item schema
4. Find relevant LinkedIn posts to comment on
5. Generate a blog post draft
6. Generate social media posts (LinkedIn, Twitter)
7. Queue everything as `growthItems` with `status: "pending_approval"`

### 3.8 Orchestrator (Pipeline State Machine)

**Not an AI agent.** A Convex `internalAction` that runs the pipeline.

**Pattern:** Identical to `intelligence/crons.ts` → `runOrgScan`.

```
Pipeline flow:
1. PM Agent: gather signals → create/update tasks → score & rank
2. CTO Agent: take top N approved tasks → generate specs
3. Dev Agent: take top N specced tasks → create PRs
4. Security Agent: scan for vulnerabilities → create fix PRs
5. Architect Agent: check codebase health → create refactoring PRs
6. Growth Agent: take shipped items → generate content → queue for approval
```

Each step is independent — if one fails, the others continue. Each step reports progress to `autopilotRuns` table.

**Triggers:**
- `daily` cron (configurable: hourly, twice daily, daily)
- `on_new_feedback` — when high-priority feedback arrives
- `on_merge` — when a PR is merged (triggers Security + Architect)
- `on_release` — when a changelog release is published (triggers Growth)
- `manual` — user clicks "Run Autopilot" or CEO agent triggers it

---

## 4. Schema — New Tables

### File: `packages/backend/convex/autopilot/tableFields.ts`

```typescript
import { defineTable } from "convex/server";
import { v } from "convex/values";

// ============================================
// VALIDATORS
// ============================================

export const autopilotMode = v.union(
  v.literal("suggested"),
  v.literal("semi_auto"),
  v.literal("full_auto")
);

export const agentRole = v.union(
  v.literal("ceo"),
  v.literal("pm"),
  v.literal("cto"),
  v.literal("dev"),
  v.literal("security"),
  v.literal("architect"),
  v.literal("growth")
);

export const taskStatus = v.union(
  v.literal("suggested"),
  v.literal("approved"),
  v.literal("speccing"),
  v.literal("specced"),
  v.literal("in_development"),
  v.literal("pr_open"),
  v.literal("ci_running"),
  v.literal("ci_failed"),
  v.literal("review_requested"),
  v.literal("approved_to_merge"),
  v.literal("merged"),
  v.literal("shipped"),
  v.literal("promoting"),
  v.literal("completed"),
  v.literal("cancelled"),
  v.literal("blocked")
);

export const taskSource = v.union(
  v.literal("feedback"),
  v.literal("intelligence"),
  v.literal("competitor_gap"),
  v.literal("growth"),
  v.literal("security"),
  v.literal("architecture"),
  v.literal("manual")
);

export const growthItemType = v.union(
  v.literal("reddit_reply"),
  v.literal("social_linkedin"),
  v.literal("social_twitter"),
  v.literal("hn_reply"),
  v.literal("linkedin_comment"),
  v.literal("blog_post"),
  v.literal("email_campaign"),
  v.literal("changelog_announcement")
);

export const growthItemStatus = v.union(
  v.literal("draft"),
  v.literal("pending_approval"),
  v.literal("approved"),
  v.literal("posted"),
  v.literal("dismissed")
);

export const pipelineRunStatus = v.union(
  v.literal("pending"),
  v.literal("running"),
  v.literal("completed"),
  v.literal("failed"),
  v.literal("partial")
);

export const pipelineTrigger = v.union(
  v.literal("cron"),
  v.literal("manual"),
  v.literal("on_new_feedback"),
  v.literal("on_merge"),
  v.literal("on_release")
);

// ============================================
// TABLES
// ============================================

export const autopilotTables = {
  autopilotConfig: defineTable({
    organizationId: v.id("organizations"),
    mode: autopilotMode,
    enabledAgents: v.array(agentRole),
    pipelineFrequency: v.union(
      v.literal("on_new_feedback"),
      v.literal("hourly"),
      v.literal("twice_daily"),
      v.literal("daily")
    ),
    // Stripe Connect
    stripeConnectAccountId: v.optional(v.string()),
    stripeConnectStatus: v.optional(v.union(
      v.literal("connected"),
      v.literal("disconnected"),
      v.literal("pending")
    )),
    // PM config
    pmConfig: v.optional(v.object({
      autoCreateTasks: v.boolean(),
      minVotesForAutoTask: v.number(),
      minPriorityForAutoTask: v.string(),
      maxTasksPerRun: v.number(),
    })),
    // Dev config
    devConfig: v.optional(v.object({
      maxPRsPerRun: v.number(),
      maxFilesPerPR: v.number(),
      maxRetriesOnCIFailure: v.number(),
      autoMergeWhenCIPasses: v.boolean(),
      protectedPaths: v.array(v.string()),
      workerUrl: v.optional(v.string()),
    })),
    // Security config
    securityConfig: v.optional(v.object({
      autoMergeSecurityFixes: v.boolean(),
      scanOnEveryMerge: v.boolean(),
      dailyScan: v.boolean(),
    })),
    // Architect config
    architectConfig: v.optional(v.object({
      scanOnEveryMerge: v.boolean(),
      weeklyFullScan: v.boolean(),
      autoMergeRefactors: v.boolean(),
    })),
    // Growth config
    growthConfig: v.optional(v.object({
      enableReddit: v.boolean(),
      enableLinkedIn: v.boolean(),
      enableTwitter: v.boolean(),
      enableHN: v.boolean(),
      enableBlog: v.boolean(),
      enableEmail: v.boolean(),
      maxItemsPerRun: v.number(),
    })),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_organization", ["organizationId"]),

  autopilotTasks: defineTable({
    organizationId: v.id("organizations"),
    title: v.string(),
    description: v.string(),
    userStory: v.optional(v.string()),
    acceptanceCriteria: v.optional(v.array(v.string())),
    reasoning: v.optional(v.string()),
    status: taskStatus,
    source: taskSource,
    // Scoring
    priorityScore: v.number(),
    priorityFactors: v.optional(v.object({
      voteWeight: v.number(),
      aiPriorityWeight: v.number(),
      intelligenceWeight: v.number(),
      competitorGapWeight: v.number(),
      revenueWeight: v.number(),
      recencyWeight: v.number(),
    })),
    // Links
    linkedFeedbackIds: v.optional(v.array(v.id("feedback"))),
    linkedInsightIds: v.optional(v.array(v.id("intelligenceInsights"))),
    linkedCompetitorIds: v.optional(v.array(v.id("competitors"))),
    // CTO output
    spec: v.optional(v.object({
      approach: v.string(),
      filesToModify: v.array(v.object({
        path: v.string(),
        reason: v.string(),
        changeType: v.union(v.literal("modify"), v.literal("create"), v.literal("delete")),
      })),
      dependencies: v.optional(v.array(v.string())),
      riskLevel: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
      riskExplanation: v.optional(v.string()),
      implementationPrompt: v.string(),
      testRequirements: v.optional(v.array(v.string())),
      estimatedLinesOfCode: v.optional(v.number()),
      generatedAt: v.number(),
    })),
    // Dev output
    dev: v.optional(v.object({
      branchName: v.optional(v.string()),
      prNumber: v.optional(v.number()),
      prUrl: v.optional(v.string()),
      ciStatus: v.optional(v.union(
        v.literal("pending"),
        v.literal("running"),
        v.literal("passed"),
        v.literal("failed")
      )),
      ciRetryCount: v.number(),
      lastCIError: v.optional(v.string()),
      mergedAt: v.optional(v.number()),
    })),
    growthItemIds: v.optional(v.array(v.id("growthItems"))),
    createdByAgent: v.boolean(),
    approvedByUserId: v.optional(v.string()),
    approvedAt: v.optional(v.number()),
    complexity: v.optional(v.union(
      v.literal("trivial"), v.literal("simple"), v.literal("moderate"),
      v.literal("complex"), v.literal("very_complex")
    )),
    estimatedTimeMinutes: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_status", ["organizationId", "status"])
    .index("by_org_priority", ["organizationId", "priorityScore"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["organizationId"],
    }),

  growthItems: defineTable({
    organizationId: v.id("organizations"),
    taskId: v.optional(v.id("autopilotTasks")),
    releaseId: v.optional(v.id("releases")),
    type: growthItemType,
    status: growthItemStatus,
    title: v.string(),
    body: v.string(),
    targetUrl: v.optional(v.string()),
    targetPlatform: v.optional(v.string()),
    context: v.optional(v.string()),
    relevanceScore: v.optional(v.number()),
    suggestedTiming: v.optional(v.string()),
    approvedAt: v.optional(v.number()),
    approvedByUserId: v.optional(v.string()),
    postedAt: v.optional(v.number()),
    postedUrl: v.optional(v.string()),
    engagementMetrics: v.optional(v.object({
      views: v.optional(v.number()),
      clicks: v.optional(v.number()),
      reactions: v.optional(v.number()),
    })),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_status", ["organizationId", "status"])
    .index("by_org_type", ["organizationId", "type"])
    .index("by_task", ["taskId"])
    .index("by_release", ["releaseId"]),

  autopilotRuns: defineTable({
    organizationId: v.id("organizations"),
    status: pipelineRunStatus,
    trigger: pipelineTrigger,
    currentStep: v.optional(v.string()),
    steps: v.array(v.object({
      agent: agentRole,
      status: v.union(
        v.literal("pending"), v.literal("running"),
        v.literal("completed"), v.literal("failed"), v.literal("skipped")
      ),
      startedAt: v.optional(v.number()),
      completedAt: v.optional(v.number()),
      error: v.optional(v.string()),
      stats: v.optional(v.object({
        itemsProcessed: v.number(),
        itemsCreated: v.number(),
        errors: v.number(),
      })),
    })),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_created", ["organizationId", "startedAt"]),

  agentActivityLog: defineTable({
    organizationId: v.id("organizations"),
    runId: v.optional(v.id("autopilotRuns")),
    agent: agentRole,
    action: v.string(),
    description: v.string(),
    metadata: v.optional(v.string()),
    taskId: v.optional(v.id("autopilotTasks")),
    growthItemId: v.optional(v.id("growthItems")),
    // Cost tracking
    tokenUsage: v.optional(v.object({
      inputTokens: v.number(),
      outputTokens: v.number(),
      model: v.string(),
      estimatedCostUsd: v.number(),
    })),
    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_run", ["runId"])
    .index("by_task", ["taskId"])
    .index("by_org_created", ["organizationId", "createdAt"]),

  // Revenue data from Stripe Connect
  revenueSnapshots: defineTable({
    organizationId: v.id("organizations"),
    period: v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly")),
    periodStart: v.number(),
    periodEnd: v.number(),
    mrr: v.number(),
    totalRevenue: v.number(),
    newCustomers: v.number(),
    churnedCustomers: v.number(),
    topFeatureRequests: v.optional(v.array(v.object({
      feedbackId: v.id("feedback"),
      title: v.string(),
      revenueImpact: v.optional(v.number()),
    }))),
    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_period", ["organizationId", "period", "periodStart"]),
};
```

### Register in schema

**File:** `packages/backend/convex/schema.ts`

```diff
+ import { autopilotTables } from "./autopilot/tableFields";

  export default defineSchema({
    ...organizationTables,
    ...feedbackTables,
+   ...autopilotTables,
    // ... rest
  });
```

---

## 5. Backend Implementation

### File structure

```
packages/backend/convex/autopilot/
├── tableFields.ts          # Schema (section 4)
├── validators.ts           # Shared validator re-exports
├── orchestrator.ts         # Pipeline state machine (cron + manual)
├── pm_agent.ts             # PM: signal gathering, task creation, scoring
├── cto_agent.ts            # CTO: spec generation, dev prompt creation
├── dev_agent.ts            # Dev: worker invocation, PR creation, CI monitoring
├── security_agent.ts       # Security: vulnerability scanning, fix PRs
├── architect_agent.ts      # Architecture: AGENTS.md enforcement, refactoring PRs
├── growth_agent.ts         # Growth: content generation, opportunity finding
├── mutations.ts            # Shared CRUD mutations for all agents
├── queries.ts              # Shared queries for the UI
├── config.ts               # Config CRUD (public mutations/queries)
├── stripe_connect.ts       # Stripe Connect OAuth + revenue data sync
└── worker_client.ts        # HTTP client for the Dev/Security/Architect worker
```

### New agents in `ai/agent.ts`

```diff
+ export const ceoAgent = new Agent(components.agent, {
+   name: "CEO Agent",
+   languageModel: openrouter("anthropic/claude-sonnet-4"),
+   instructions: CEO_SYSTEM_PROMPT,
+   tools: { /* autopilot query/mutation tools */ },
+ });
```

PM, CTO, and Growth agents use AI SDK `generateObject` directly (not `@convex-dev/agent`), because they don't need conversation threads — they're single-shot structured output calls.

### Cron additions

**File:** `packages/backend/convex/crons.ts`

```diff
+ crons.daily(
+   "run autopilot pipeline",
+   { hourUTC: 7, minuteUTC: 0 },
+   internal.autopilot.orchestrator.runScheduledPipelines
+ );
+
+ crons.daily(
+   "sync stripe revenue",
+   { hourUTC: 1, minuteUTC: 0 },
+   internal.autopilot.stripe_connect.syncDailyRevenue
+ );
```

### Event triggers in existing code

**File:** `packages/backend/convex/feedback/mutations.ts` — add at the end of feedback creation:

```typescript
// If autopilot is enabled and feedback meets threshold, trigger pipeline
await ctx.scheduler.runAfter(0,
  internal.autopilot.orchestrator.maybeRunOnNewFeedback,
  { organizationId, feedbackId }
);
```

**File:** `packages/backend/convex/integrations/github/mutations.ts` — add on PR merge webhook:

```typescript
// Trigger security + architect scans after merge
await ctx.scheduler.runAfter(0,
  internal.autopilot.orchestrator.onPRMerged,
  { organizationId, prNumber }
);
```

---

## 6. Frontend Implementation

### Routes

```
apps/web/app/(app)/dashboard/[orgSlug]/autopilot/
├── page.tsx                          # Dashboard overview
├── layout.tsx                        # Layout with sub-nav + CEO chat panel
├── tasks/
│   ├── page.tsx                      # Task board (kanban)
│   └── [taskId]/page.tsx             # Task detail (spec, PR, growth)
├── growth/page.tsx                   # Growth content queue
├── activity/page.tsx                 # Agent activity log
├── revenue/page.tsx                  # Revenue dashboard (Stripe Connect)
├── security/page.tsx                 # Security scan results
├── settings/page.tsx                 # Autopilot configuration
└── connect-stripe/page.tsx           # Stripe Connect OAuth flow
```

### Components

```
apps/web/src/features/autopilot/
├── components/
│   ├── autopilot-dashboard.tsx       # Overview: pipeline status + stats + activity
│   ├── ceo-chat-panel.tsx            # Right-side persistent chat with CEO agent
│   ├── task-board.tsx                # Kanban: suggested → approved → ... → completed
│   ├── task-card.tsx                 # Card with score, status, source badge
│   ├── task-detail.tsx               # Full detail: spec, PR, CI, growth items
│   ├── pipeline-status.tsx           # Current run progress indicator
│   ├── agent-activity-feed.tsx       # Scrollable log with agent avatars
│   ├── growth-queue.tsx              # List of pending content items
│   ├── growth-item-card.tsx          # Content preview + one-click actions
│   ├── revenue-dashboard.tsx         # MRR chart, customer count, feature impact
│   ├── security-dashboard.tsx        # Vulnerability list, fix PR status
│   ├── autopilot-settings.tsx        # Mode toggle, agent enables, thresholds
│   ├── mode-toggle.tsx               # suggested / semi_auto / full_auto selector
│   ├── run-button.tsx                # "Run Autopilot" button
│   ├── agent-cost-dashboard.tsx      # Token usage and cost per agent
│   ├── stripe-connect-button.tsx     # Connect Stripe OAuth flow
│   └── agent-avatar.tsx              # Icon per agent role
├── hooks/
│   └── use-autopilot.ts             # Convex query hooks
└── store/
    └── autopilot-atoms.ts           # Jotai atoms for UI state
```

### CEO Chat Panel — Always Visible

The `layout.tsx` for the autopilot section includes a persistent right-side panel:

```tsx
// apps/web/app/(app)/dashboard/[orgSlug]/autopilot/layout.tsx
export default function AutopilotLayout({ children }) {
  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-auto">
        {children}
      </div>
      <div className="w-96 border-l bg-muted/30 flex flex-col">
        <CEOChatPanel />
      </div>
    </div>
  );
}
```

The CEO chat uses the existing `chatAgent` thread pattern but with autopilot-specific tools registered.

### Growth Queue UX — One Click Per Action

Each growth item card has exactly one primary action:

```tsx
// For Reddit reply:
<GrowthItemCard>
  <div className="text-sm text-muted-foreground">{item.context}</div>
  <div className="mt-2 p-3 bg-muted rounded-md font-mono text-sm">
    {item.body}
  </div>
  <div className="flex gap-2 mt-3">
    <Button size="sm" asChild>
      <a href={item.targetUrl} target="_blank" rel="noopener">
        Open Thread
      </a>
    </Button>
    <Button size="sm" variant="outline" onClick={() => copyToClipboard(item.body)}>
      Copy Reply
    </Button>
    <Button size="sm" variant="ghost" onClick={() => dismiss(item._id)}>
      Skip
    </Button>
  </div>
</GrowthItemCard>
```

### Sidebar navigation

**File:** `apps/web/src/features/dashboard/components/dashboard-sidebar.tsx`

Add to Admin section:

```typescript
{
  title: "Autopilot",
  url: `/${orgSlug}/autopilot`,
  icon: Robot, // from Phosphor Icons @phosphor-icons/react
  badge: pendingActionsCount > 0 ? pendingActionsCount : undefined,
}
```

---

## 7. Safeguards & Guardrails

### Three modes

| Mode | PM creates tasks | CTO specs | Dev creates PRs | Merge | Growth publishes |
|------|:---:|:---:|:---:|:---:|:---:|
| **suggested** | Auto-suggest, human approves | On approved tasks | On specced tasks | Always human | Human copies/posts |
| **semi_auto** | Auto-create low-risk | Auto-spec | Auto-PR for low-risk | Auto-merge if CI passes + <5 files | Human copies/posts |
| **full_auto** | Auto-create all | Auto-spec | Auto-PR all | Auto-merge if CI passes + thresholds met | Human copies/posts |

**Growth content is NEVER auto-posted** — only pre-built for one-click action. External platform posting requires human action.

### Hard limits (never overridden)

- Protected paths: `schema.ts`, `package.json`, `tsconfig*`, `biome.jsonc`, `turbo.json`, `convex.config.ts`
- Never modify: auth logic, billing logic, data deletion logic
- Max CI retries: 3
- Max files per PR: configurable (default 10)
- Max PRs per run: configurable (default 2)
- Minimum 30 minutes between pipeline runs (rate limit)
- All changes must pass: `ultracite check` + `check-types` + `turbo test` + `turbo build`

### Kill switch

Setting `mode: "suggested"` pauses all autonomous actions immediately. In-flight pipeline runs complete their current step but don't start new ones.

---

## 8. Cost Tracking

Every AI call logs to `agentActivityLog.tokenUsage`:

```typescript
{
  inputTokens: 1523,
  outputTokens: 847,
  model: "anthropic/claude-sonnet-4",
  estimatedCostUsd: 0.0234,
}
```

**Cost dashboard shows:**
- Total cost per period (day/week/month)
- Cost per agent role
- Cost per task (sum of all agent calls for that task)
- Average cost per PR created
- Cost trends over time

**Cost estimation formula:**

```typescript
const estimateCost = (inputTokens: number, outputTokens: number, model: string): number => {
  const pricing: Record<string, { input: number; output: number }> = {
    "anthropic/claude-sonnet-4": { input: 3 / 1_000_000, output: 15 / 1_000_000 },
    "openai/gpt-5.4-mini": { input: 0.15 / 1_000_000, output: 0.6 / 1_000_000 },
    "qwen/qwen3.6-plus-preview:free": { input: 0, output: 0 },
    "z-ai/glm-4.5-air:free": { input: 0, output: 0 },
  };
  const p = pricing[model] ?? { input: 3 / 1_000_000, output: 15 / 1_000_000 };
  return inputTokens * p.input + outputTokens * p.output;
};
```

---

## 9. Billing & Premium Gating

Autopilot is a **premium feature**. Gate at the Convex query/mutation level:

```typescript
// In every autopilot query/mutation:
const plan = await getOrgPlan(ctx, args.organizationId);
if (plan === "free") {
  throw new ConvexError("Autopilot requires a Pro or Enterprise plan");
}
```

**Plan tiers:**
- **Free:** Can see the autopilot dashboard in "read-only demo" mode with sample data
- **Pro:** Suggested mode + all agents. User brings their own API key (OpenRouter/Anthropic)
- **Enterprise:** Full auto mode + priority support + custom agent configuration

The user's own API key approach keeps costs transparent — they pay LLM providers directly, Reflet charges for the platform.

---

## 10. File-by-File Changelist

### New files (backend)

| File | Lines (est.) |
|------|-------------|
| `packages/backend/convex/autopilot/tableFields.ts` | ~250 |
| `packages/backend/convex/autopilot/validators.ts` | ~30 |
| `packages/backend/convex/autopilot/orchestrator.ts` | ~200 |
| `packages/backend/convex/autopilot/pm_agent.ts` | ~250 |
| `packages/backend/convex/autopilot/cto_agent.ts` | ~200 |
| `packages/backend/convex/autopilot/dev_agent.ts` | ~200 |
| `packages/backend/convex/autopilot/security_agent.ts` | ~150 |
| `packages/backend/convex/autopilot/architect_agent.ts` | ~150 |
| `packages/backend/convex/autopilot/growth_agent.ts` | ~250 |
| `packages/backend/convex/autopilot/mutations.ts` | ~200 |
| `packages/backend/convex/autopilot/queries.ts` | ~200 |
| `packages/backend/convex/autopilot/config.ts` | ~100 |
| `packages/backend/convex/autopilot/stripe_connect.ts` | ~150 |
| `packages/backend/convex/autopilot/worker_client.ts` | ~80 |

### New files (frontend)

| File | Lines (est.) |
|------|-------------|
| `apps/web/app/(app)/dashboard/[orgSlug]/autopilot/layout.tsx` | ~50 |
| `apps/web/app/(app)/dashboard/[orgSlug]/autopilot/page.tsx` | ~30 |
| `apps/web/app/(app)/dashboard/[orgSlug]/autopilot/tasks/page.tsx` | ~30 |
| `apps/web/app/(app)/dashboard/[orgSlug]/autopilot/tasks/[taskId]/page.tsx` | ~30 |
| `apps/web/app/(app)/dashboard/[orgSlug]/autopilot/growth/page.tsx` | ~30 |
| `apps/web/app/(app)/dashboard/[orgSlug]/autopilot/activity/page.tsx` | ~30 |
| `apps/web/app/(app)/dashboard/[orgSlug]/autopilot/revenue/page.tsx` | ~30 |
| `apps/web/app/(app)/dashboard/[orgSlug]/autopilot/security/page.tsx` | ~30 |
| `apps/web/app/(app)/dashboard/[orgSlug]/autopilot/settings/page.tsx` | ~30 |
| `apps/web/src/features/autopilot/components/*.tsx` | ~17 files, ~2000 total |
| `apps/web/src/features/autopilot/hooks/use-autopilot.ts` | ~80 |
| `apps/web/src/features/autopilot/store/autopilot-atoms.ts` | ~20 |

### New files (worker)

| File | Lines (est.) |
|------|-------------|
| `packages/worker/src/index.ts` | ~100 |
| `packages/worker/src/dev-agent.ts` | ~150 |
| `packages/worker/src/security-agent.ts` | ~100 |
| `packages/worker/src/architect-agent.ts` | ~100 |
| `packages/worker/package.json` | ~20 |
| `packages/worker/Dockerfile` | ~15 |

### Modified files

| File | Change |
|------|--------|
| `packages/backend/convex/schema.ts` | Add `...autopilotTables` |
| `packages/backend/convex/ai/agent.ts` | Add `ceoAgent` |
| `packages/backend/convex/crons.ts` | Add autopilot + stripe crons |
| `apps/web/src/features/dashboard/components/dashboard-sidebar.tsx` | Add Autopilot nav item |
| `packages/backend/convex/feedback/mutations.ts` | Add event trigger |

### New dependencies

| Package | Where | Why |
|---------|-------|-----|
| `@anthropic-ai/claude-agent-sdk` | `packages/worker` | Dev/Security/Architect agents |
| `stripe` (for Connect) | `packages/backend` | Already have `@convex-dev/stripe`, may need raw `stripe` for Connect API |

---

## 11. Subagent Task Breakdown

These are **parallel tasks** that can each be assigned to a Claude Code subagent:

### Task A: Schema & Foundation
- Create `autopilot/tableFields.ts` with all tables
- Create `autopilot/validators.ts`
- Register in `schema.ts`
- Run `convex codegen` + type check

### Task B: Orchestrator
- Create `autopilot/orchestrator.ts` — pipeline state machine
- Create `autopilot/mutations.ts` — shared CRUD
- Create `autopilot/queries.ts` — shared queries
- Add cron to `crons.ts`
- Add event triggers in `feedback/mutations.ts`

### Task C: PM Agent
- Create `autopilot/pm_agent.ts`
- Implement signal gathering (reads from feedback, intelligence, featureComparisons)
- Implement task creation via `generateObject`
- Implement priority scoring formula
- Wire into orchestrator

### Task D: CTO Agent
- Create `autopilot/cto_agent.ts`
- Integrate with existing `repo_analysis.ts` + `code_search.ts`
- Implement spec generation via `generateObject`
- Implement implementation prompt generation
- Wire into orchestrator

### Task E: Dev Agent Worker
- Create `packages/worker/` — new package
- Implement Claude Agent SDK integration
- Implement repo clone → edit → commit → push → PR flow
- Create `autopilot/dev_agent.ts` (Convex side: calls worker)
- Create `autopilot/worker_client.ts`
- Wire into orchestrator

### Task F: Security Agent
- Create `autopilot/security_agent.ts`
- Implement vulnerability scanning logic
- Wire into worker
- Wire into orchestrator (on_merge + daily cron)

### Task G: Architect Agent
- Create `autopilot/architect_agent.ts`
- Implement AGENTS.md rule checking
- Wire into worker
- Wire into orchestrator (on_merge + weekly cron)

### Task H: Growth Agent
- Create `autopilot/growth_agent.ts`
- Implement opportunity finding (`:online` models)
- Implement content generation via `generateObject`
- Implement all 8 growth item types
- Wire into orchestrator

### Task I: CEO Chat Agent
- Add `ceoAgent` to `ai/agent.ts`
- Implement autopilot-specific tools (query tasks, trigger pipeline, etc.)
- Create chat thread management

### Task J: Stripe Connect
- Create `autopilot/stripe_connect.ts`
- Implement OAuth flow
- Implement revenue data sync
- Create `revenueSnapshots` cron

### Task K: Config & Settings
- Create `autopilot/config.ts` — public CRUD for settings
- Implement plan gating
- Implement mode switching

### Task L: Frontend — Dashboard & Layout
- Create all route files (`autopilot/*/page.tsx`)
- Create layout with CEO chat panel
- Add sidebar nav item
- Create `autopilot-dashboard.tsx` overview

### Task M: Frontend — Task Board
- Create `task-board.tsx` (kanban, reuse roadmap pattern)
- Create `task-card.tsx`
- Create `task-detail.tsx`

### Task N: Frontend — Growth Queue
- Create `growth-queue.tsx`
- Create `growth-item-card.tsx` with one-click actions
- Implement copy-to-clipboard, open-link patterns

### Task O: Frontend — Activity, Revenue, Security, Settings
- Create `agent-activity-feed.tsx`
- Create `revenue-dashboard.tsx`
- Create `security-dashboard.tsx`
- Create `autopilot-settings.tsx` + `mode-toggle.tsx`
- Create `agent-cost-dashboard.tsx`

### Task P: Frontend — CEO Chat Panel
- Create `ceo-chat-panel.tsx`
- Wire to `ceoAgent` via Convex agent threads
- Implement tool result rendering (task created, pipeline triggered, etc.)

### Dependency graph

```
A (Schema) ──────────────────────────────────────────────────►
  │
  ├── B (Orchestrator) ──────────────────────────────────────►
  │     │
  │     ├── C (PM Agent) ───────────────────────────────────►
  │     ├── D (CTO Agent) ──────────────────────────────────►
  │     ├── E (Dev Worker) ─────────────────────────────────►
  │     ├── F (Security Agent) ─────────────────────────────►
  │     ├── G (Architect Agent) ────────────────────────────►
  │     ├── H (Growth Agent) ───────────────────────────────►
  │     └── I (CEO Chat) ──────────────────────────────────►
  │
  ├── J (Stripe Connect) ──────────────────────────────────►
  ├── K (Config) ──────────────────────────────────────────►
  │
  └── L-P (Frontend tasks — parallel after schema exists) ─►
```

**A must complete first.** Then B + J + K can run in parallel. Then C through I can run in parallel. L through P can start as soon as A is done (they just need the types).

**Total: 16 parallel subagent tasks**, with only A as a hard prerequisite.
