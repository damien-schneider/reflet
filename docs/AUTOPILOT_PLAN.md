# Reflet Autopilot — Implementation Plan

> Turn Reflet from a feedback platform into an **AI product team** for existing codebases.
> Paste a GitHub repo → get an autonomous PM, CTO, Growth Marketer, and Dev team that runs your product.

---

## Table of Contents

1. [Vision & Architecture](#1-vision--architecture)
2. [Agent Roles & Responsibilities](#2-agent-roles--responsibilities)
3. [Phase 0 — Schema & Foundation](#3-phase-0--schema--foundation)
4. [Phase 1 — Orchestrator + PM Agent](#4-phase-1--orchestrator--pm-agent)
5. [Phase 2 — CTO + Dev Agents](#5-phase-2--cto--dev-agents)
6. [Phase 3 — Growth Agent](#6-phase-3--growth-agent)
7. [Phase 4 — Autopilot Dashboard UI](#7-phase-4--autopilot-dashboard-ui)
8. [Phase 5 — Full Autonomy Mode](#8-phase-5--full-autonomy-mode)
9. [Safeguards & Guardrails](#9-safeguards--guardrails)
10. [File-by-File Changelist](#10-file-by-file-changelist)

---

## 1. Vision & Architecture

### What changes

Reflet today: **Humans** collect feedback → **Humans** prioritize → **Humans** build → **Humans** ship.

Reflet Autopilot: **Signals** (feedback + intelligence + repo analysis) → **PM Agent** prioritizes & creates tasks → **CTO Agent** converts to technical specs → **Dev Agent** creates PRs → **Architect Agent** validates & merges → **Growth Agent** promotes shipped work.

### Architecture overview

```
┌─────────────────────────────────────────────────────────────┐
│                    ORCHESTRATOR (CEO Agent)                  │
│  Convex cron / on-demand trigger                            │
│  Decides which agents to invoke, in what order              │
│  Manages the autopilot pipeline state machine               │
├────────────┬────────────┬──────────────┬────────────────────┤
│  PM Agent  │ CTO Agent  │  Dev Agent   │   Growth Agent     │
│            │            │  (1..N)      │                    │
│ - Triages  │ - Specs    │ - Codes      │ - Content          │
│ - Scores   │ - Prompts  │ - PRs        │ - Distribution     │
│ - Assigns  │ - Reviews  │ - Tests      │ - Engagement       │
│ - Roadmap  │ - Arch     │ - CI         │ - Analytics        │
└─────┬──────┴─────┬──────┴──────┬───────┴────────┬───────────┘
      │            │             │                │
  ┌───▼────┐  ┌───▼────┐  ┌────▼─────┐    ┌─────▼──────┐
  │Feedback│  │ Tasks  │  │ GitHub   │    │ Channels   │
  │Signals │  │ Board  │  │ PRs/CI   │    │ Reddit/LI  │
  │Insights│  │ Specs  │  │ Branches │    │ Email/Blog │
  └────────┘  └────────┘  └──────────┘    └────────────┘
```

### Key design decisions

- **All agents use `@convex-dev/agent`** — same pattern as existing `chatAgent`, `feedbackClarificationAgent`, `repoAnalysisAgent` in `packages/backend/convex/ai/agent.ts`
- **All agents use OpenRouter** with fallback chains — same pattern as `intelligence_agent.ts`
- **Pipeline state machine** lives in Convex tables — same pattern as `intelligenceJobs`
- **Cron-driven + on-demand** — same pattern as `intelligence/crons.ts` (`runScheduledScans` + manual trigger)
- **Human-in-the-loop by default** — every destructive action (merge PR, send email, post publicly) requires approval unless "full autopilot" is enabled

---

## 2. Agent Roles & Responsibilities

### 2.1 Orchestrator (CEO Agent)

**Purpose:** Top-level coordinator. Decides what to run, in what order, manages pipeline state.

**Not an AI agent itself** — this is a Convex `internalAction` state machine (like `runOrgScan` in `intelligence/crons.ts`), calling other agents sequentially.

**Responsibilities:**
- Run the full autopilot pipeline on cron or manual trigger
- Check which agents are enabled (per-org config)
- Execute pipeline: PM → CTO → Dev → Growth
- Track pipeline run state (started, in-progress, completed, failed)
- Report progress to the UI via `autopilotRuns` table

**Trigger patterns:**
- Cron: configurable (daily / twice daily / on new feedback)
- Manual: user clicks "Run Autopilot" button
- Event-driven: new high-priority feedback or intelligence insight

### 2.2 PM Agent (Product Manager)

**Purpose:** Autonomous product manager that triages signals into a prioritized task board.

**What it replaces:** Manual feedback triage, manual roadmap prioritization.

**Existing modules it builds on:**
- `intelligence/synthesis.ts` — already generates insights from signals
- `intelligence/feedback_integration.ts` — already boosts feedback priority from intelligence
- `feedback/feedback_auto_tagging.ts` — already classifies feedback with AI
- Roadmap feature — already has kanban board with statuses

**New capabilities:**
1. **Auto-create tasks** from high-priority feedback + intelligence insights
2. **Score & rank tasks** using a weighted formula:
   - User vote count (from `feedback.voteCount`)
   - AI priority (from `feedback.aiPriority`)
   - Intelligence signal strength (from linked `intelligenceInsights`)
   - Competitor gap urgency (from `featureComparisons`)
   - Recency decay
3. **Suggest task grouping** — cluster related feedback into single deliverables
4. **Generate task descriptions** — title, user story, acceptance criteria, linked feedback IDs
5. **Auto-assign priority/status** on the roadmap board

**Implementation:**

```typescript
// packages/backend/convex/ai/agent.ts — ADD:

export const pmAgent = new Agent(components.agent, {
  name: "Product Manager Agent",
  languageModel: openrouter("anthropic/claude-sonnet-4"),
  instructions: `You are an expert Product Manager for a software product.
Your job is to:
1. Analyze user feedback, intelligence signals, and competitor data
2. Identify the highest-impact tasks to work on next
3. Create clear, actionable task descriptions with acceptance criteria
4. Prioritize ruthlessly — focus on what moves the needle most
5. Group related feedback into coherent deliverables

Output tasks as structured JSON with: title, description, userStory, acceptanceCriteria, priority, complexity, linkedFeedbackIds, linkedInsightIds.
Never create duplicate tasks. Check existing tasks first.`,
});
```

**Convex functions to create:**

| Function | Type | File | What it does |
|----------|------|------|-------------|
| `runPMPipeline` | `internalAction` | `autopilot/pm_agent.ts` | Main entry: gathers signals → generates tasks → scores → assigns |
| `gatherSignals` | `internalQuery` | `autopilot/pm_agent.ts` | Collects unprocessed feedback, new insights, competitor gaps |
| `createAutopilotTask` | `internalMutation` | `autopilot/mutations.ts` | Writes to `autopilotTasks` table |
| `scoreAndRank` | `internalAction` | `autopilot/pm_agent.ts` | AI-powered scoring of all open tasks |
| `autoAssignRoadmap` | `internalMutation` | `autopilot/pm_agent.ts` | Moves top tasks to "Planned" status on roadmap |

### 2.3 CTO Agent (Technical Architect)

**Purpose:** Converts PM tasks into technical specifications and implementation prompts.

**What it replaces:** Manual spec writing, manual task decomposition.

**Existing modules it builds on:**
- `ai/agent.ts` → `repoAnalysisAgent` — already analyzes GitHub repos
- `integrations/github/repo_analysis.ts` — already has repo structure understanding
- `integrations/github/code_search.ts` — already searches code in repos
- `feedback` table fields `aiComplexity`, `aiTimeEstimate` — already has complexity scoring

**New capabilities:**
1. **Generate technical specs** from PM tasks:
   - Which files need to change
   - What the implementation approach should be
   - Estimated lines of code
   - Risk assessment
   - Dependencies on other tasks
2. **Create implementation prompts** — detailed prompts for the Dev Agent that include:
   - Relevant existing code context (from code search)
   - Architecture patterns to follow (from repo analysis)
   - Test requirements
   - File paths to modify
3. **Review Dev Agent output** — validate that PRs match the spec
4. **Detect architectural drift** — flag if changes break patterns

**Implementation:**

```typescript
// packages/backend/convex/ai/agent.ts — ADD:

export const ctoAgent = new Agent(components.agent, {
  name: "CTO Agent",
  languageModel: openrouter("anthropic/claude-sonnet-4"),
  instructions: `You are a senior technical architect reviewing and planning implementation work.
Your job is to:
1. Convert product tasks into detailed technical specifications
2. Identify which files, functions, and modules need changes
3. Assess complexity, risk, and dependencies
4. Write implementation prompts that a developer agent can execute
5. Review completed work against the specification
6. Ensure architectural consistency across changes

Always reference actual file paths from the codebase. Use the repo analysis and code search tools to ground your specs in reality.`,
});
```

**Convex functions to create:**

| Function | Type | File | What it does |
|----------|------|------|-------------|
| `runCTOPipeline` | `internalAction` | `autopilot/cto_agent.ts` | Takes top tasks → generates specs → creates dev prompts |
| `generateSpec` | `internalAction` | `autopilot/cto_agent.ts` | Single task → technical spec with file paths, approach |
| `generateDevPrompt` | `internalAction` | `autopilot/cto_agent.ts` | Spec → detailed implementation prompt for dev agent |
| `reviewPR` | `internalAction` | `autopilot/cto_agent.ts` | PR diff → review against spec → approve/request changes |
| `updateTaskSpec` | `internalMutation` | `autopilot/mutations.ts` | Writes spec to `autopilotTasks.spec` field |

### 2.4 Dev Agent

**Purpose:** Executes code changes based on CTO specs, creates PRs.

**What it replaces:** Manual coding (for routine tasks).

**Existing modules it builds on:**
- `integrations/github/` — full GitHub API integration (create branches, PRs, read files)
- `integrations/github/actions.ts` — GitHub Actions workflow creation
- `.github/workflows/reflet-release-sync.yml` — CI pipeline already exists
- Agent config in `feedback-detail/agent-config.ts` — already supports Cursor, Copilot, Windsurf deeplinks

**New capabilities:**
1. **Create feature branches** from the CTO prompt
2. **Generate code changes** via AI (using the implementation prompt)
3. **Create PRs** with description linking back to the autopilot task
4. **Monitor CI status** — wait for build/test results
5. **Self-correct** — if CI fails, analyze error, attempt fix, push again (max 3 retries)
6. **Request human review** when confidence is low or changes are large

**Important: Phase 1 approach — External execution, internal orchestration.**

The Dev Agent does NOT run code in Convex. Instead:
- It creates a GitHub PR using the GitHub API (already available via `github_helpers.ts`)
- The PR description contains the full implementation prompt
- The actual code generation happens via an external coding agent (Claude Code, Cursor, Codex) triggered by a GitHub Action
- OR (simpler v1): the Dev Agent uses the GitHub Contents API to directly commit file changes for small tasks

**Convex functions to create:**

| Function | Type | File | What it does |
|----------|------|------|-------------|
| `runDevPipeline` | `internalAction` | `autopilot/dev_agent.ts` | Takes spec'd tasks → creates branches → generates code → opens PRs |
| `createFeatureBranch` | `internalAction` | `autopilot/dev_agent.ts` | GitHub API: create branch from main |
| `generateCodeChanges` | `internalAction` | `autopilot/dev_agent.ts` | AI generates file diffs from CTO prompt |
| `commitChanges` | `internalAction` | `autopilot/dev_agent.ts` | GitHub Contents API: commit files to branch |
| `createPullRequest` | `internalAction` | `autopilot/dev_agent.ts` | GitHub API: open PR with task metadata |
| `monitorCI` | `internalAction` | `autopilot/dev_agent.ts` | Poll GitHub Actions for build status |
| `handleCIFailure` | `internalAction` | `autopilot/dev_agent.ts` | Analyze CI logs → generate fix → push |
| `updateTaskDevStatus` | `internalMutation` | `autopilot/mutations.ts` | Track PR URL, CI status, retry count |

### 2.5 Growth Agent

**Purpose:** Autonomous marketing and distribution for shipped work.

**What it replaces:** Manual content creation, manual community engagement.

**Existing modules it builds on:**
- `intelligence/community.ts` — already monitors Reddit, HN, web discussions
- `intelligence/intelligence_agent.ts` — already does web search with `:online` models
- `changelog/` — already has release notes infrastructure
- `email/` — already has email templates and Resend integration
- `notifications/weekly_digest.ts` — already sends digest emails

**New capabilities:**
1. **Content generation** from shipped releases:
   - Blog post drafts
   - Social media posts (LinkedIn, Twitter/X)
   - Reddit/HN comment drafts for relevant threads
   - Email campaign drafts
2. **Opportunity detection** — find relevant Reddit/HN/LinkedIn threads to engage with
   - Uses the existing community search with `:online` models
   - Matches threads to shipped features
   - Generates context-aware reply drafts
3. **SEO suggestions** — keyword opportunities based on intelligence signals
4. **Distribution pipeline** — suggest when and where to post
5. **Engagement tracking** — log what was posted, where, and outcomes

**All public-facing content requires human approval** unless full autopilot is enabled.

**Implementation:**

```typescript
// packages/backend/convex/ai/agent.ts — ADD:

export const growthAgent = new Agent(components.agent, {
  name: "Growth Agent",
  languageModel: openrouter("anthropic/claude-sonnet-4"),
  instructions: `You are a growth marketing expert for a software product.
Your job is to:
1. Turn shipped features and releases into compelling content
2. Find relevant online discussions where the product solves problems
3. Draft engagement-ready responses for Reddit, HN, LinkedIn, and Twitter
4. Suggest distribution strategies and timing
5. Write email campaign drafts for user re-engagement

Be authentic and value-driven — no spam. Every piece of content should genuinely help the reader.
Match the tone of the platform (casual on Reddit, professional on LinkedIn).`,
});
```

**Convex functions to create:**

| Function | Type | File | What it does |
|----------|------|------|-------------|
| `runGrowthPipeline` | `internalAction` | `autopilot/growth_agent.ts` | Main entry: finds opportunities → generates content → queues for approval |
| `findEngagementOpportunities` | `internalAction` | `autopilot/growth_agent.ts` | Uses `:online` models to find relevant threads |
| `generateReleaseContent` | `internalAction` | `autopilot/growth_agent.ts` | Release → blog draft + social posts + email |
| `generateReplyDraft` | `internalAction` | `autopilot/growth_agent.ts` | Thread context → draft reply |
| `createGrowthItem` | `internalMutation` | `autopilot/mutations.ts` | Writes to `growthItems` table |
| `approveGrowthItem` | `mutation` | `autopilot/mutations.ts` | User approves → marks ready to post |
| `markPosted` | `mutation` | `autopilot/mutations.ts` | User marks as posted (manual) or auto-post (future) |

### 2.6 Architect Agent (Quality Gate)

**Purpose:** Final quality gate before any code merge. Ensures builds pass, tests pass, no regressions.

**What it replaces:** Manual code review (for routine checks).

**Responsibilities:**
1. Review PR diffs for:
   - Adherence to `AGENTS.md` rules (no `any`, no `enum`, max 400 lines/file, etc.)
   - No accidental secret leaks
   - Test coverage
   - Type safety
2. Run checks: lint, typecheck, test, build (via GitHub Actions monitoring)
3. Auto-approve if all checks pass + diff is within safety threshold
4. Escalate to human if:
   - PR touches >10 files
   - PR modifies config files (`package.json`, `tsconfig`, etc.)
   - CI fails after 3 retries
   - Changes affect auth, billing, or data deletion

**This is NOT a separate AI agent** — it's a rule-based Convex action that uses the CTO Agent for code review and monitors GitHub Actions for CI results.

**Convex functions to create:**

| Function | Type | File | What it does |
|----------|------|------|-------------|
| `runArchitectReview` | `internalAction` | `autopilot/architect.ts` | PR → checks → approve or escalate |
| `checkSafetyThresholds` | `internalQuery` | `autopilot/architect.ts` | Files changed, config touched, scope check |
| `autoMergePR` | `internalAction` | `autopilot/architect.ts` | GitHub API: merge approved PR |
| `escalateToHuman` | `internalMutation` | `autopilot/mutations.ts` | Create notification requiring human review |

---

## 3. Phase 0 — Schema & Foundation

### 3.1 New database tables

Create file: `packages/backend/convex/autopilot/tableFields.ts`

```typescript
import { defineTable } from "convex/server";
import { v } from "convex/values";

// ============================================
// AUTOPILOT VALIDATORS
// ============================================

export const autopilotMode = v.union(
  v.literal("suggested"),    // Agents suggest, human approves everything
  v.literal("semi_auto"),    // Agents execute routine tasks, escalate risky ones
  v.literal("full_auto")     // Full autonomy (except prohibited actions)
);

export const agentRole = v.union(
  v.literal("pm"),
  v.literal("cto"),
  v.literal("dev"),
  v.literal("growth"),
  v.literal("architect")
);

export const taskStatus = v.union(
  v.literal("suggested"),       // PM suggested, awaiting approval
  v.literal("approved"),        // Human approved, ready for CTO
  v.literal("speccing"),        // CTO generating spec
  v.literal("specced"),         // Spec ready, awaiting dev
  v.literal("in_development"),  // Dev agent working on it
  v.literal("pr_open"),         // PR created, awaiting CI/review
  v.literal("ci_running"),      // CI in progress
  v.literal("ci_failed"),       // CI failed, dev agent retrying
  v.literal("review_requested"),// Escalated to human review
  v.literal("approved_to_merge"),// Human approved merge
  v.literal("merged"),          // PR merged
  v.literal("shipped"),         // Released via changelog
  v.literal("promoting"),       // Growth agent creating content
  v.literal("completed"),       // Full cycle done
  v.literal("cancelled"),       // Manually cancelled
  v.literal("blocked")          // Blocked by dependency or error
);

export const taskSource = v.union(
  v.literal("feedback"),       // Created from user feedback
  v.literal("intelligence"),   // Created from intelligence insight
  v.literal("manual"),         // Human-created
  v.literal("competitor_gap"), // Created from competitor feature gap
  v.literal("growth")          // Growth-driven (SEO, content needs)
);

export const growthItemType = v.union(
  v.literal("blog_post"),
  v.literal("social_linkedin"),
  v.literal("social_twitter"),
  v.literal("reddit_reply"),
  v.literal("hn_reply"),
  v.literal("linkedin_comment"),
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

// ============================================
// AUTOPILOT TABLES
// ============================================

export const autopilotTables = {
  // Per-org autopilot configuration
  autopilotConfig: defineTable({
    organizationId: v.id("organizations"),
    mode: autopilotMode,
    enabledAgents: v.array(agentRole),
    // Pipeline schedule
    pipelineFrequency: v.union(
      v.literal("on_new_feedback"),
      v.literal("hourly"),
      v.literal("twice_daily"),
      v.literal("daily")
    ),
    // Agent-specific settings
    pmConfig: v.optional(v.object({
      autoCreateTasks: v.boolean(),
      minVotesForAutoTask: v.number(),      // e.g., 3
      minPriorityForAutoTask: v.string(),   // e.g., "high"
      maxTasksPerRun: v.number(),           // e.g., 5
    })),
    devConfig: v.optional(v.object({
      maxPRsPerRun: v.number(),             // e.g., 1
      maxFilesPerPR: v.number(),            // e.g., 10
      maxRetriesOnCIFailure: v.number(),    // e.g., 3
      autoMergeWhenCIPasses: v.boolean(),
      protectedPaths: v.array(v.string()),  // e.g., ["packages/backend/convex/schema.ts"]
    })),
    growthConfig: v.optional(v.object({
      enableRedditEngagement: v.boolean(),
      enableLinkedInPosts: v.boolean(),
      enableEmailCampaigns: v.boolean(),
      enableBlogDrafts: v.boolean(),
      maxItemsPerRun: v.number(),
    })),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_organization", ["organizationId"]),

  // The core task board (PM Agent's output, CTO/Dev Agent's input)
  autopilotTasks: defineTable({
    organizationId: v.id("organizations"),
    // Task identity
    title: v.string(),
    description: v.string(),
    userStory: v.optional(v.string()),
    acceptanceCriteria: v.optional(v.array(v.string())),
    // Status & lifecycle
    status: taskStatus,
    source: taskSource,
    // Scoring (PM Agent)
    priorityScore: v.number(),                     // 0-100 computed score
    priorityFactors: v.optional(v.object({
      voteWeight: v.number(),
      aiPriorityWeight: v.number(),
      intelligenceWeight: v.number(),
      competitorGapWeight: v.number(),
      recencyWeight: v.number(),
    })),
    // Links to source data
    linkedFeedbackIds: v.optional(v.array(v.id("feedback"))),
    linkedInsightIds: v.optional(v.array(v.id("intelligenceInsights"))),
    linkedCompetitorIds: v.optional(v.array(v.id("competitors"))),
    // CTO Agent output
    spec: v.optional(v.object({
      approach: v.string(),
      filesToModify: v.array(v.string()),
      filesToCreate: v.optional(v.array(v.string())),
      estimatedLinesOfCode: v.optional(v.number()),
      riskAssessment: v.optional(v.string()),
      dependencies: v.optional(v.array(v.string())),
      implementationPrompt: v.string(),
      generatedAt: v.number(),
    })),
    // Dev Agent output
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
    // Growth Agent output
    growthItemIds: v.optional(v.array(v.id("growthItems"))),
    // Metadata
    createdByAgent: v.boolean(),
    approvedByUserId: v.optional(v.string()),
    approvedAt: v.optional(v.number()),
    complexity: v.optional(v.union(
      v.literal("trivial"),
      v.literal("simple"),
      v.literal("moderate"),
      v.literal("complex"),
      v.literal("very_complex")
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

  // Growth Agent content items
  growthItems: defineTable({
    organizationId: v.id("organizations"),
    taskId: v.optional(v.id("autopilotTasks")),
    releaseId: v.optional(v.id("releases")),
    type: growthItemType,
    status: growthItemStatus,
    // Content
    title: v.string(),
    body: v.string(),
    targetUrl: v.optional(v.string()),           // URL of thread to reply to
    targetPlatform: v.optional(v.string()),
    // Metadata
    generatedAt: v.number(),
    approvedAt: v.optional(v.number()),
    approvedByUserId: v.optional(v.string()),
    postedAt: v.optional(v.number()),
    postedUrl: v.optional(v.string()),           // URL where it was posted
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
    .index("by_task", ["taskId"])
    .index("by_release", ["releaseId"]),

  // Pipeline run history (like intelligenceJobs but for the full autopilot pipeline)
  autopilotRuns: defineTable({
    organizationId: v.id("organizations"),
    status: pipelineRunStatus,
    trigger: v.union(
      v.literal("cron"),
      v.literal("manual"),
      v.literal("event")
    ),
    currentStep: v.optional(v.string()),
    steps: v.array(v.object({
      agent: agentRole,
      status: v.union(
        v.literal("pending"),
        v.literal("running"),
        v.literal("completed"),
        v.literal("failed"),
        v.literal("skipped")
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

  // Agent activity log (audit trail for every agent action)
  agentActivityLog: defineTable({
    organizationId: v.id("organizations"),
    runId: v.optional(v.id("autopilotRuns")),
    agent: agentRole,
    action: v.string(),          // e.g., "created_task", "generated_spec", "opened_pr"
    description: v.string(),
    metadata: v.optional(v.string()), // JSON stringified extra data
    taskId: v.optional(v.id("autopilotTasks")),
    growthItemId: v.optional(v.id("growthItems")),
    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_run", ["runId"])
    .index("by_task", ["taskId"])
    .index("by_org_created", ["organizationId", "createdAt"]),
};
```

### 3.2 Register tables in schema

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

### 3.3 Register new agents

**File:** `packages/backend/convex/ai/agent.ts`

Add `pmAgent`, `ctoAgent`, `growthAgent` as shown in section 2 above.

### 3.4 Add autopilot cron job

**File:** `packages/backend/convex/crons.ts`

```diff
+ crons.daily(
+   "run autopilot pipeline",
+   { hourUTC: 7, minuteUTC: 0 },
+   internal.autopilot.orchestrator.runScheduledPipelines
+ );
```

---

## 4. Phase 1 — Orchestrator + PM Agent

### Files to create

```
packages/backend/convex/autopilot/
├── tableFields.ts          # Schema (from Phase 0)
├── validators.ts           # Shared validator exports
├── orchestrator.ts         # CEO pipeline state machine
├── pm_agent.ts             # PM Agent actions
├── mutations.ts            # Shared CRUD mutations
├── queries.ts              # Shared queries for UI
└── config.ts               # Config CRUD (public mutations/queries)
```

### 4.1 `orchestrator.ts` — Pipeline State Machine

Pattern: identical to `intelligence/crons.ts` → `runOrgScan`

```typescript
// packages/backend/convex/autopilot/orchestrator.ts

export const runScheduledPipelines = internalAction({
  // Like runScheduledScans — find orgs with autopilot enabled, run for each
});

export const runPipeline = internalAction({
  args: {
    organizationId: v.id("organizations"),
    trigger: v.union(v.literal("cron"), v.literal("manual"), v.literal("event")),
  },
  handler: async (ctx, args) => {
    // 1. Create autopilotRuns entry
    // 2. Load autopilotConfig for this org
    // 3. For each enabled agent, in order:
    //    a. Update run.currentStep
    //    b. Call agent pipeline (pm → cto → dev → growth)
    //    c. Record step result
    // 4. Update run status (completed/partial/failed)
    // Pattern: same as runPipelines() in intelligence/crons.ts
  },
});

// Manual trigger (exposed as public mutation with auth)
export const triggerManualRun = mutation({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    // Auth check (admin only)
    // Schedule the pipeline action
    await ctx.scheduler.runAfter(0,
      internal.autopilot.orchestrator.runPipeline,
      { organizationId: args.organizationId, trigger: "manual" }
    );
  },
});
```

### 4.2 `pm_agent.ts` — PM Agent

```typescript
// packages/backend/convex/autopilot/pm_agent.ts

export const runPMPipeline = internalAction({
  args: { organizationId: v.id("organizations"), runId: v.id("autopilotRuns") },
  handler: async (ctx, args) => {
    // Step 1: Gather unprocessed signals
    const signals = await ctx.runQuery(
      internal.autopilot.pm_agent.gatherSignals,
      { organizationId: args.organizationId }
    );

    // Step 2: Use pmAgent to analyze signals and suggest tasks
    // Uses the Agent pattern from @convex-dev/agent:
    // const thread = await pmAgent.createThread(ctx, { ... });
    // const result = await pmAgent.generateText(ctx, { thread, prompt: ... });
    //
    // OR use AI SDK directly with structured output (like auto-tagging):
    // const tasks = await generateStructuredWithFallback({
    //   models: PM_MODELS,
    //   schema: taskBatchSchema,
    //   system: PM_SYSTEM_PROMPT,
    //   prompt: buildPMPrompt(signals, existingTasks),
    // });

    // Step 3: Score each task
    // Step 4: Write tasks to autopilotTasks table
    // Step 5: Log activity
  },
});

export const gatherSignals = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    // Get: recent feedback (high vote, untagged), new intelligence insights,
    // competitor feature gaps, unaddressed high-priority items
    // Return merged signal set
  },
});
```

### 4.3 Connecting PM to existing data

The PM Agent reads from tables that already exist:
- `feedback` — filter by `organizationId`, sorted by `voteCount` desc, where no linked `autopilotTask` exists
- `intelligenceInsights` — filter by `status: "new"`, sorted by `priority`
- `featureComparisons` — get gaps where `userProductHasIt: false`
- `autopilotTasks` — check for duplicates before creating

No schema changes needed for existing tables. The link is one-directional: `autopilotTasks.linkedFeedbackIds` points to `feedback._id`.

---

## 5. Phase 2 — CTO + Dev Agents

### Files to create

```
packages/backend/convex/autopilot/
├── cto_agent.ts            # CTO Agent actions
├── dev_agent.ts            # Dev Agent actions
├── architect.ts            # Quality gate / review logic
└── github_bridge.ts        # Wrapper around existing GitHub integration
```

### 5.1 `cto_agent.ts`

```typescript
export const runCTOPipeline = internalAction({
  args: { organizationId: v.id("organizations"), runId: v.id("autopilotRuns") },
  handler: async (ctx, args) => {
    // 1. Get approved tasks without specs (status: "approved")
    // 2. For each task:
    //    a. Load repo context (use existing repo_analysis.ts + code_search.ts)
    //    b. Generate spec via ctoAgent
    //    c. Generate implementation prompt
    //    d. Update task status to "specced"
    //    e. Log activity
  },
});

export const generateSpec = internalAction({
  args: { taskId: v.id("autopilotTasks") },
  handler: async (ctx, args) => {
    // 1. Load task
    // 2. Load repo structure (reuse repoAnalysisAgent or cached analysis)
    // 3. Search codebase for relevant files (reuse code_search.ts)
    // 4. Generate spec with file paths, approach, risk
    // 5. Generate dev prompt with code context
    // 6. Write to task.spec
  },
});
```

### 5.2 `dev_agent.ts`

```typescript
export const runDevPipeline = internalAction({
  args: { organizationId: v.id("organizations"), runId: v.id("autopilotRuns") },
  handler: async (ctx, args) => {
    // 1. Get specced tasks (status: "specced"), limited by devConfig.maxPRsPerRun
    // 2. For each task:
    //    a. Check safety thresholds (file count, protected paths)
    //    b. Create feature branch
    //    c. Generate code changes via AI
    //    d. Commit to branch
    //    e. Open PR
    //    f. Update task status to "pr_open"
    //    g. Schedule CI monitor
  },
});
```

### 5.3 `github_bridge.ts` — Reuses existing GitHub infrastructure

```typescript
// This file wraps existing functions from integrations/github/
// to provide a clean interface for autopilot agents.

// Reuses:
// - github_helpers.ts → getOctokit(), getRepoInfo()
// - actions.ts → GitHub API calls
// - code_search.ts → searchCodeInRepo()
// - repo_analysis.ts → analyzeRepository()

export const getRepoContext = internalAction({
  // Wraps repo_analysis + code_search for CTO agent
});

export const createBranchAndPR = internalAction({
  // Wraps GitHub API calls for Dev agent
});

export const getCIStatus = internalAction({
  // Polls GitHub Actions API for build/test results
});

export const mergePR = internalAction({
  // Merges an approved PR
});
```

### 5.4 `architect.ts` — Quality Gate

```typescript
export const runArchitectReview = internalAction({
  args: { taskId: v.id("autopilotTasks") },
  handler: async (ctx, args) => {
    // 1. Load task + PR info
    // 2. Check safety thresholds:
    //    - Files changed < maxFilesPerPR
    //    - No protected paths modified
    //    - No config file changes
    //    - No auth/billing/deletion code touched
    // 3. If safe: use ctoAgent to review diff against spec
    // 4. If CTO approves + CI passes + thresholds OK:
    //    - In semi_auto/full_auto mode: auto-merge
    //    - In suggested mode: notify human for approval
    // 5. If unsafe: escalate to human with explanation
  },
});
```

---

## 6. Phase 3 — Growth Agent

### Files to create

```
packages/backend/convex/autopilot/
├── growth_agent.ts         # Growth Agent actions
```

### 6.1 `growth_agent.ts`

```typescript
export const runGrowthPipeline = internalAction({
  args: { organizationId: v.id("organizations"), runId: v.id("autopilotRuns") },
  handler: async (ctx, args) => {
    // 1. Find recently shipped tasks (status: "shipped" or "merged")
    // 2. Find recent releases without growth items
    // 3. For each:
    //    a. Generate content for each enabled channel
    //    b. Find engagement opportunities (reuse intelligence_agent.ts pattern)
    //    c. Create growthItems with status: "pending_approval"
    //    d. Log activity
  },
});

export const findEngagementOpportunities = internalAction({
  // Pattern: identical to intelligence_agent.ts → runCommunitySearch
  // But focused on finding threads where the product's features solve a problem
  // Uses :online models to search Reddit, HN, LinkedIn
  // Returns: thread URL + context + suggested reply angle
});

export const generateReleaseContent = internalAction({
  // Takes a release → generates blog post, social posts, email draft
  // Uses growthAgent with release notes + product context
});
```

---

## 7. Phase 4 — Autopilot Dashboard UI

### New routes

```
apps/web/app/(app)/dashboard/[orgSlug]/autopilot/
├── page.tsx                      # Main autopilot dashboard
├── tasks/page.tsx                # Task board (PM view)
├── tasks/[taskId]/page.tsx       # Task detail (spec, PR, growth)
├── growth/page.tsx               # Growth content queue
├── activity/page.tsx             # Agent activity log
├── settings/page.tsx             # Autopilot configuration
└── layout.tsx                    # Shared layout with sub-navigation
```

### New components

```
apps/web/src/features/autopilot/
├── components/
│   ├── autopilot-dashboard.tsx     # Overview: pipeline status, recent activity, key metrics
│   ├── task-board.tsx              # Kanban board: suggested → approved → specced → in-dev → pr-open → merged → shipped
│   ├── task-card.tsx               # Card with priority score, status badge, linked feedback count
│   ├── task-detail.tsx             # Full detail: spec, PR link, CI status, growth items
│   ├── pipeline-status.tsx         # Current/last run status with step indicators
│   ├── agent-activity-feed.tsx     # Scrollable log of agent actions
│   ├── growth-queue.tsx            # List of pending content items for approval
│   ├── growth-item-card.tsx        # Content preview with approve/edit/dismiss buttons
│   ├── autopilot-settings.tsx      # Mode toggle, agent enables, thresholds
│   ├── autopilot-mode-toggle.tsx   # suggested / semi-auto / full-auto selector
│   ├── run-autopilot-button.tsx    # Manual trigger button
│   └── agent-status-badge.tsx      # Shows agent health/last run
├── hooks/
│   └── use-autopilot.ts            # Convex query hooks for autopilot data
└── store/
    └── autopilot-atoms.ts          # Jotai atoms for local UI state
```

### Sidebar navigation update

**File:** `apps/web/src/features/dashboard/components/dashboard-sidebar.tsx`

Add to Admin section:

```typescript
{
  title: "Autopilot",
  url: `/${orgSlug}/autopilot`,
  icon: RobotIcon, // from Phosphor Icons
}
```

### Dashboard overview page

The main `/autopilot` page shows:
1. **Pipeline status card** — last run time, status, next scheduled run
2. **Quick stats** — tasks in pipeline, PRs open, growth items pending
3. **Run Autopilot button** — manual trigger
4. **Recent activity feed** — last 20 agent actions
5. **Task board preview** — top 5 tasks by priority

### Task board

Same kanban pattern as the existing roadmap (`roadmap-kanban.tsx`), but with autopilot-specific columns:

```
Suggested → Approved → Specced → In Dev → PR Open → Merged → Shipped → Promoting
```

Each card shows: title, priority score (0-100), source badge (feedback/intelligence/competitor), linked feedback count, assignee (agent name).

### Growth queue

List view of `growthItems` filtered by status. Each item shows:
- Content preview (truncated)
- Platform badge (Reddit, LinkedIn, etc.)
- Target URL (if reply)
- Approve / Edit / Dismiss buttons
- "Mark as Posted" button with URL input

---

## 8. Phase 5 — Full Autonomy Mode

### What "full auto" unlocks

In `full_auto` mode, the pipeline runs without human approval for:
- Task creation (PM auto-creates, no approval step)
- Spec generation (CTO auto-specs all approved tasks)
- PR creation (Dev auto-creates PRs)
- PR merge (Architect auto-merges if CI passes + safety thresholds met)
- Growth content (auto-queues, but still requires "mark as posted" for external platforms)

### What ALWAYS requires human approval (even in full auto)

- Changes to protected paths (schema, auth, billing, config files)
- PRs touching >10 files
- PRs that fail CI 3+ times
- Growth content posted to external platforms (Reddit, LinkedIn, etc.)
- Any action that costs money (ads, email sends to user base)
- Deleting anything

### Event-driven triggers

In `full_auto` + `on_new_feedback` mode, the pipeline triggers automatically when:
- New feedback with vote count >= threshold
- New intelligence insight with priority "critical" or "high"
- Competitor launches a feature that creates a gap

Implementation: Convex mutation hooks in `feedback/mutations.ts` and `intelligence/synthesis.ts` that call `ctx.scheduler.runAfter(0, internal.autopilot.orchestrator.runPipeline, ...)`.

---

## 9. Safeguards & Guardrails

### Build safety

Every PR created by the Dev Agent must:
1. Pass `bun x ultracite check` (lint + format)
2. Pass `turbo check-types` (TypeScript)
3. Pass `turbo test` (unit tests)
4. Pass `turbo build` (production build)

The Dev Agent includes a GitHub Actions workflow step that runs these checks. The Architect Agent monitors the workflow run and only approves if all pass.

### Code safety

The Architect Agent rejects PRs that:
- Modify files in `protectedPaths` (configurable per org)
- Add `any`, `@ts-ignore`, `enum`, or `biome-ignore` (per AGENTS.md rules)
- Remove tests without adding replacements
- Change config files (`package.json`, `tsconfig`, `biome.json`, `turbo.json`)
- Touch auth, billing, or data deletion logic

### Rate limiting

- Max tasks created per run: configurable (default 5)
- Max PRs created per run: configurable (default 1)
- Max growth items per run: configurable (default 10)
- Max CI retries: configurable (default 3)
- Cooldown between runs: minimum 1 hour

### Audit trail

Every agent action is logged in `agentActivityLog` with:
- Which agent
- What action
- What it affected (task ID, growth item ID)
- Timestamp
- Full metadata (JSON)

### Kill switch

The `autopilotConfig.mode` can be set to `"suggested"` at any time to pause all autonomous actions. All in-flight pipeline runs complete their current step but don't start new ones.

---

## 10. File-by-File Changelist

### New files

| File | Purpose |
|------|---------|
| `packages/backend/convex/autopilot/tableFields.ts` | Schema: 5 new tables |
| `packages/backend/convex/autopilot/validators.ts` | Shared validators |
| `packages/backend/convex/autopilot/orchestrator.ts` | Pipeline state machine |
| `packages/backend/convex/autopilot/pm_agent.ts` | PM Agent pipeline |
| `packages/backend/convex/autopilot/cto_agent.ts` | CTO Agent pipeline |
| `packages/backend/convex/autopilot/dev_agent.ts` | Dev Agent pipeline |
| `packages/backend/convex/autopilot/growth_agent.ts` | Growth Agent pipeline |
| `packages/backend/convex/autopilot/architect.ts` | Quality gate |
| `packages/backend/convex/autopilot/github_bridge.ts` | GitHub API wrapper |
| `packages/backend/convex/autopilot/mutations.ts` | Shared CRUD mutations |
| `packages/backend/convex/autopilot/queries.ts` | Shared queries for UI |
| `packages/backend/convex/autopilot/config.ts` | Config management |
| `apps/web/app/(app)/dashboard/[orgSlug]/autopilot/page.tsx` | Dashboard page |
| `apps/web/app/(app)/dashboard/[orgSlug]/autopilot/layout.tsx` | Layout |
| `apps/web/app/(app)/dashboard/[orgSlug]/autopilot/tasks/page.tsx` | Task board |
| `apps/web/app/(app)/dashboard/[orgSlug]/autopilot/tasks/[taskId]/page.tsx` | Task detail |
| `apps/web/app/(app)/dashboard/[orgSlug]/autopilot/growth/page.tsx` | Growth queue |
| `apps/web/app/(app)/dashboard/[orgSlug]/autopilot/activity/page.tsx` | Activity log |
| `apps/web/app/(app)/dashboard/[orgSlug]/autopilot/settings/page.tsx` | Settings |
| `apps/web/src/features/autopilot/components/*.tsx` | ~12 components |
| `apps/web/src/features/autopilot/hooks/use-autopilot.ts` | Query hooks |
| `apps/web/src/features/autopilot/store/autopilot-atoms.ts` | UI state |

### Modified files

| File | Change |
|------|--------|
| `packages/backend/convex/schema.ts` | Add `...autopilotTables` import |
| `packages/backend/convex/ai/agent.ts` | Add `pmAgent`, `ctoAgent`, `growthAgent` |
| `packages/backend/convex/crons.ts` | Add autopilot cron job |
| `apps/web/src/features/dashboard/components/dashboard-sidebar.tsx` | Add Autopilot nav item |
| `packages/backend/convex/feedback/mutations.ts` | Add optional event trigger for autopilot |
| `packages/backend/convex/intelligence/synthesis.ts` | Add optional event trigger for autopilot |

### Dependencies (no new ones needed)

Everything uses existing packages:
- `@convex-dev/agent` — already installed
- `ai` (AI SDK) — already used in `intelligence_agent.ts`
- `@openrouter/ai-sdk-provider` — already used
- `zod` — already in catalog
- GitHub API via Octokit — already in `github_helpers.ts`

---

## Implementation Order

**Sprint 1 (Week 1-2): Foundation**
1. Create `autopilot/tableFields.ts` + register in schema
2. Create `autopilot/config.ts` (CRUD for autopilot settings)
3. Create `autopilot/orchestrator.ts` (pipeline skeleton)
4. Create `autopilot/mutations.ts` + `queries.ts`
5. Add cron job
6. Deploy schema

**Sprint 2 (Week 2-3): PM Agent**
1. Add `pmAgent` to `ai/agent.ts`
2. Create `autopilot/pm_agent.ts`
3. Wire into orchestrator
4. Create basic UI: settings page + task board (reuse roadmap kanban pattern)
5. Add sidebar nav item

**Sprint 3 (Week 3-4): CTO + Dev Agents**
1. Add `ctoAgent` to `ai/agent.ts`
2. Create `autopilot/cto_agent.ts`
3. Create `autopilot/github_bridge.ts`
4. Create `autopilot/dev_agent.ts` (v1: small file changes only)
5. Create `autopilot/architect.ts`
6. Add task detail page with spec view + PR status

**Sprint 4 (Week 4-5): Growth Agent**
1. Add `growthAgent` to `ai/agent.ts`
2. Create `autopilot/growth_agent.ts`
3. Create growth queue UI
4. Add activity log page

**Sprint 5 (Week 5-6): Polish + Full Auto**
1. Implement full auto mode
2. Event-driven triggers
3. Pipeline status dashboard
4. Agent activity feed
5. E2E testing of full pipeline
6. Rate limiting + kill switch

---

## Open Questions (Decide Before Building)

1. **Dev Agent code generation:** V1 uses GitHub Contents API for small changes. V2 could trigger an external agent (Claude Code / Codex) via a GitHub Action. Which to start with?

2. **Growth Agent posting:** V1 generates drafts only. V2 could auto-post via APIs (Reddit API, LinkedIn API). Should we build the API integrations now or keep it manual?

3. **Billing implications:** Should autopilot be a premium feature? If so, add plan gating in `autopilotConfig` queries.

4. **Multi-repo support:** Current design assumes one repo per org. Should we support multiple repos per org from the start?

5. **Agent cost tracking:** Should we track LLM token usage per agent per run for cost visibility? (Convex dev agent has usage tracking built in.)
