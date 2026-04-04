# Autopilot V9: Autonomous Company Architecture — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the autopilot from an orchestrator-driven pipeline into a self-directed autonomous company where each agent owns its schedule, communicates through a shared board, and is proactive by design — never idle, never blocked.

**Architecture:** No orchestrator. Agents wake on conditions (heartbeat checks board state). Three data layers: Knowledge Base (wiki), Work Board (records with exclusive write), Notes (domain-restricted informal communication). Guards (cost, autonomy, rate, circuit breaker) wrap every execution as middleware.

**Tech Stack:** Convex (backend + real-time), AI SDK v6 + OpenRouter (LLM), TypeScript, Zod schemas.

**Spec docs:**
- `docs/PRODUCT_VISION.md` — Full product vision
- `docs/AUTOPILOT_ARCHITECTURE.md` — Technical architecture
- `docs/autopilot_arch_graph.md` — Mermaid architecture graphs

---

## Sub-Project Breakdown

This refactor is too large for a single plan. It's broken into 5 independent sub-projects that should be executed in order (each builds on the previous), but each produces working, deployable software.

| Sub-Project | What it does | Estimated tasks |
|---|---|---|
| **SP1: Rename Signals → Notes + Add Domain Restrictions** | Rename the existing `autopilotSignals` table/code to `autopilotNotes`, add `noteCategory` field for domain restriction, update all references | ~8 tasks |
| **SP2: Replace Orchestrator with Heartbeat** | Delete orchestrator + cron_handlers, create `heartbeat.ts` with condition checks, update `crons.ts` to single heartbeat interval | ~10 tasks |
| **SP3: Make PM + Growth Proactive** | Implement Growth market research (actual LLM + online search), PM reads Growth's notes + knowledge base, PM never returns 0 tasks | ~12 tasks |
| **SP4: Implement Remaining Agent Stubs** | Sales prospecting, CEO directive relay, non-blocking Company Brief gate, agent self-cleaning on wake | ~10 tasks |
| **SP5: Frontend Updates** | Remove obsolete pages (analytics, ops, intelligence), add knowledge base editor, update dashboard for condition-driven agents | ~8 tasks |

**This document covers SP1 and SP2.** SP3-SP5 will be separate plan documents.

---

## Chunk 1: SP1 — Rename Signals → Notes + Domain Restrictions

### File Structure

```
Modify: packages/backend/convex/autopilot/schema/validators.ts
Rename: packages/backend/convex/autopilot/schema/signals.tables.ts → notes.tables.ts
Rename: packages/backend/convex/autopilot/signals.ts → notes.ts
Modify: packages/backend/convex/autopilot/schema/index.ts
Modify: packages/backend/convex/autopilot/agent_context.ts
Modify: packages/backend/convex/autopilot/cron_handlers/system.ts
Modify: packages/backend/convex/autopilot/agents/prompts.ts
Modify: All files importing from signals.ts
Test:   packages/backend/convex/autopilot/__tests__/notes.test.ts
```

### Task 1.1: Add noteCategory validator and rename signal validators

**Files:**
- Modify: `packages/backend/convex/autopilot/schema/validators.ts:262-278`

- [ ] **Step 1: Update validators — rename signal types to note types, add noteCategory**

In `schema/validators.ts`, rename `signalType` → `noteType`, `signalStatus` → `noteStatus`, and add `noteCategory`:

```typescript
// Replace signalType (line 262-271) with:
export const noteType = v.union(
  v.literal("market_opportunity"),
  v.literal("feature_request_pattern"),
  v.literal("technical_debt"),
  v.literal("security_alert"),
  v.literal("competitive_move"),
  v.literal("user_sentiment_shift"),
  v.literal("growth_insight"),
  v.literal("initiative_proposal")
);

// Replace signalStatus (line 273-278) with:
export const noteStatus = v.union(
  v.literal("new"),
  v.literal("triaged"),
  v.literal("acted_on"),
  v.literal("dismissed")
);

// ADD new validator for domain restriction:
export const noteCategory = v.union(
  v.literal("market"),       // Growth only
  v.literal("prospect"),     // Sales only
  v.literal("user_pattern"), // Support only
  v.literal("vulnerability"),// Security only
  v.literal("tech_debt"),    // Architect only
  v.literal("technical"),    // CTO only
  v.literal("code_quality"), // Dev only
  v.literal("directive"),    // CEO only
  v.literal("product"),      // PM only
  v.literal("documentation") // Docs only
);
```

Keep the old exports as aliases temporarily so existing imports don't break:
```typescript
/** @deprecated Use noteType */
export const signalType = noteType;
/** @deprecated Use noteStatus */
export const signalStatus = noteStatus;
```

- [ ] **Step 2: Run type check**

Run: `cd packages/backend && npx tsc --noEmit`
Expected: PASS (aliases preserve compatibility)

- [ ] **Step 3: Commit**

```bash
git add packages/backend/convex/autopilot/schema/validators.ts
git commit -m "refactor(autopilot): add noteCategory validator, alias signal→note types"
```

### Task 1.2: Rename signals table to notes table

**Files:**
- Create: `packages/backend/convex/autopilot/schema/notes.tables.ts`
- Modify: `packages/backend/convex/autopilot/schema/index.ts`

**IMPORTANT:** Convex tables can't be renamed in-place. The underlying DB table name stays `autopilotSignals`. We only rename the TS export to `notesTables`. All code queries `"autopilotSignals"` still — the table name in the DB is an internal detail. The `noteCategory` field is added as `v.optional()` since existing rows don't have it (widen-first).

- [ ] **Step 1: Create notes.tables.ts — keep DB table name as autopilotSignals**

Create `packages/backend/convex/autopilot/schema/notes.tables.ts`:

```typescript
import { defineTable } from "convex/server";
import { v } from "convex/values";
import {
  autopilotTaskPriority,
  noteCategory,
  noteStatus,
  noteType,
} from "./validators";

export const notesTables = {
  /**
   * Agent notes — domain-restricted informal communication.
   * Each agent writes notes only within its noteCategory.
   * PM reads all notes as input for product decisions.
   *
   * DB table name remains "autopilotSignals" for migration compat.
   * All TS exports and function names use "notes" terminology.
   */
  autopilotSignals: defineTable({
    organizationId: v.id("organizations"),
    type: noteType,
    noteCategory: v.optional(noteCategory), // optional: existing rows lack it
    title: v.string(),
    description: v.string(),
    sourceAgent: v.string(),
    strength: v.number(),
    priority: autopilotTaskPriority,
    status: noteStatus,
    triagedAt: v.optional(v.number()),
    linkedInitiativeId: v.optional(v.id("autopilotInitiatives")),
    sourceUrl: v.optional(v.string()),
    createdAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_status", ["organizationId", "status"])
    .index("by_org_type", ["organizationId", "type"])
    .index("by_org_created", ["organizationId", "createdAt"]),
  // Note: by_org_category index omitted — noteCategory is optional until backfilled
};
```

- [ ] **Step 2: Update schema/index.ts — replace signalsTables with notesTables**

```typescript
import { notesTables } from "./notes.tables";
// Remove: import { signalsTables } from "./signals.tables";

export const autopilotTables = {
  ...configTables,
  ...tasksTables,
  ...knowledgeTables,
  ...recordsTables,
  ...notesTables,  // was signalsTables
  ...agentsTables,
  ...commsTables,
  ...dataTables,
};
```

- [ ] **Step 3: Delete old signals.tables.ts**

```bash
rm packages/backend/convex/autopilot/schema/signals.tables.ts
```

- [ ] **Step 4: Run type check to find all broken imports**

Run: `cd packages/backend && npx tsc --noEmit 2>&1 | head -50`
Expected: Errors for files still importing `signalsTables` or `autopilotSignals`

- [ ] **Step 5: Commit**

```bash
git add -A packages/backend/convex/autopilot/schema/
git commit -m "refactor(autopilot): rename signals table to notes with domain categories"
```

### Task 1.3: Rename signals.ts → notes.ts with domain enforcement

**Files:**
- Create: `packages/backend/convex/autopilot/notes.ts` (based on current `signals.ts`)
- Delete: `packages/backend/convex/autopilot/signals.ts`

- [ ] **Step 1: Create notes.ts with domain enforcement**

Read `signals.ts` for the current implementation, then create `notes.ts` with the same logic plus:
- `createNote` takes a `noteCategory` param
- Add a `AGENT_CATEGORY_MAP` constant that maps agent names to their allowed `noteCategory`
- Validate: `if (AGENT_CATEGORY_MAP[sourceAgent] !== noteCategory) throw`

```typescript
const AGENT_CATEGORY_MAP: Record<string, string> = {
  growth: "market",
  sales: "prospect",
  support: "user_pattern",
  security: "vulnerability",
  architect: "tech_debt",
  cto: "technical",
  dev: "code_quality",
  ceo: "directive",
  pm: "product",
  docs: "documentation",
};
```

- [ ] **Step 2: Delete old signals.ts**

```bash
rm packages/backend/convex/autopilot/signals.ts
```

- [ ] **Step 3: Fix all imports — rename function/variable names from signals→notes**

**Note:** DB table name stays `"autopilotSignals"` in all queries. Only TS function names, variable names, and module names change. The `intelligence/` module is NOT updated here — the deprecated aliases from Task 1.1 keep it compiling. Intelligence removal is deferred to SP5.

Files to update (run `grep -r "signals\|Signal" packages/backend/convex/autopilot/ --include="*.ts" -l` to verify):
- `agent_context.ts` — rename variable names, keep `.query("autopilotSignals")`
- `cron_handlers/system.ts` — rename function `runSignalCleanup` → `runNoteCleanup`
- `priorities.ts` — rename `SignalDoc` type alias, update variable names
- `orchestrator/slot_allocator.ts` — rename any signal variable references
- `agents/pm/analysis.ts` — rename signal references in prompt building
- `agents/growth/discovery.ts` — rename signal creation calls

**DO NOT modify** files in `intelligence/` — they compile via the deprecated aliases and will be removed in SP5.

- [ ] **Step 4: Run type check**

Run: `cd packages/backend && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Run linter**

Run: `bun x ultracite check`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add -A packages/backend/convex/autopilot/
git commit -m "refactor(autopilot): rename signals→notes with domain enforcement"
```

### Task 1.4: Update agent_context.ts to load notes instead of signals

**Files:**
- Modify: `packages/backend/convex/autopilot/agent_context.ts:38-58`

- [ ] **Step 1: Update context loader to query autopilotNotes**

Replace the signals section with notes, filtered by domain relevance.
**Note:** DB table name stays `"autopilotSignals"` — only TS variable names change.

```typescript
// Replace the signals loading block with:
const twoDaysAgo = Date.now() - 48 * 60 * 60 * 1000;
const notes = await ctx.db
  .query("autopilotSignals") // DB table name unchanged
  .withIndex("by_org_created", (q) =>
    q.eq("organizationId", args.organizationId)
  )
  .collect();

const recentNotes = notes
  .filter((n) => n.createdAt > twoDaysAgo)
  .slice(0, 10);

if (recentNotes.length > 0) {
  const noteSummaries = recentNotes
    .map(
      (n) =>
        `- [${n.noteCategory}/${n.status}] ${n.title} (from: ${n.sourceAgent}, strength: ${n.strength})`
    )
    .join("\n");
  sections.push(`RECENT NOTES FROM TEAM:\n${noteSummaries}`);
}
```

- [ ] **Step 2: Run type check + linter**

Run: `cd packages/backend && npx tsc --noEmit && bun x ultracite check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/backend/convex/autopilot/agent_context.ts
git commit -m "refactor(autopilot): agent context loads notes instead of signals"
```

### Task 1.5: Update prompts to reference notes instead of signals

**Files:**
- Modify: `packages/backend/convex/autopilot/agents/prompts.ts`

- [ ] **Step 1: Global find-replace in prompts.ts**

Replace all occurrences of "signal" with "note" in prompt text (not variable names):
- "intelligence insights" → "notes from team"
- "SIGNALS" → "NOTES"
- "signal triage" → "note triage"
- "raise signals" → "leave notes"

- [ ] **Step 2: Run linter**

Run: `bun x ultracite check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/backend/convex/autopilot/agents/prompts.ts
git commit -m "refactor(autopilot): update prompts to use notes terminology"
```

### Task 1.6: Write tests for note domain enforcement

**Files:**
- Create: `packages/backend/convex/autopilot/__tests__/notes.test.ts`

- [ ] **Step 1: Write test for domain enforcement**

**Important:** Import `AGENT_CATEGORY_MAP` and `validateNoteDomain` from the production `notes.ts` module. Do NOT duplicate the map in the test.

First, ensure `notes.ts` exports both:
```typescript
// In notes.ts — must be exported
export const AGENT_CATEGORY_MAP: Record<string, string> = { ... };
export const validateNoteDomain = (agent: string, category: string): boolean => {
  return AGENT_CATEGORY_MAP[agent] === category;
};
```

Then write the test:
```typescript
import { describe, expect, it } from "vitest";
import { AGENT_CATEGORY_MAP, validateNoteDomain } from "../notes";

describe("Note domain enforcement", () => {
  it("maps every active agent to a category", () => {
    const agents = ["pm", "cto", "dev", "security", "architect", "growth", "sales", "support", "docs", "ceo"];
    for (const agent of agents) {
      expect(AGENT_CATEGORY_MAP[agent]).toBeDefined();
    }
  });

  it("each category is unique to one agent", () => {
    const categories = Object.values(AGENT_CATEGORY_MAP);
    const unique = new Set(categories);
    expect(unique.size).toBe(categories.length);
  });

  it("validates correct agent-category pairs", () => {
    expect(validateNoteDomain("growth", "market")).toBe(true);
    expect(validateNoteDomain("security", "vulnerability")).toBe(true);
    expect(validateNoteDomain("pm", "product")).toBe(true);
  });

  it("rejects cross-domain writes", () => {
    expect(validateNoteDomain("dev", "market")).toBe(false);
    expect(validateNoteDomain("growth", "vulnerability")).toBe(false);
    expect(validateNoteDomain("sales", "technical")).toBe(false);
  });

  it("rejects unknown agents", () => {
    expect(validateNoteDomain("unknown_agent", "market")).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests**

Run: `cd packages/backend && bun test autopilot/__tests__/notes.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/backend/convex/autopilot/__tests__/notes.test.ts
git commit -m "test(autopilot): add note domain enforcement tests"
```

---

## Chunk 2: SP2 — Replace Orchestrator with Heartbeat

### File Structure

```
Create:  packages/backend/convex/autopilot/heartbeat.ts
Create:  packages/backend/convex/autopilot/guards.ts
Delete:  packages/backend/convex/autopilot/orchestrator/ (entire directory)
Delete:  packages/backend/convex/autopilot/cron_handlers/ (entire directory)
Delete:  packages/backend/convex/autopilot/prerequisites.ts
Modify:  packages/backend/convex/crons.ts
Modify:  packages/backend/convex/autopilot/config.ts
Modify:  packages/backend/convex/autopilot/agents/pm/analysis.ts
Modify:  packages/backend/convex/autopilot/agents/growth/discovery.ts
Modify:  packages/backend/convex/autopilot/agents/sales.ts
Test:    packages/backend/convex/autopilot/__tests__/heartbeat.test.ts
```

### Task 2.1: Create guards.ts — middleware for every agent execution

**Files:**
- Create: `packages/backend/convex/autopilot/guards.ts`

- [ ] **Step 1: Write guards.ts**

```typescript
/**
 * Guards — middleware checks wrapping every agent execution.
 * Not an orchestrator. Just safety checks like building security badges.
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalQuery } from "../_generated/server";

/**
 * Check all guards for an agent. Returns { allowed, reason }.
 */
export const checkGuards = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    agent: v.string(),
  },
  returns: v.object({
    allowed: v.boolean(),
    reason: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    // 1. Autonomy check — is the system stopped?
    const config = await ctx.db
      .query("autopilotConfig")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique();

    if (!config?.enabled) {
      return { allowed: false, reason: "Autopilot disabled" };
    }

    if ((config.autonomyMode ?? "supervised") === "stopped") {
      return { allowed: false, reason: "Autopilot stopped" };
    }

    // 2. Cost guard — budget remaining?
    const dailyCap = config.dailyCostCapUsd ?? 20;
    const used = config.costUsedTodayUsd ?? 0;
    if (used >= dailyCap) {
      return { allowed: false, reason: "Daily cost cap reached" };
    }

    // 3. Rate limit — check recent activity count for this agent
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const recentActivity = await ctx.db
      .query("autopilotActivityLog")
      .withIndex("by_org_created", (q) =>
        q.eq("organizationId", args.organizationId).gte("createdAt", oneHourAgo)
      )
      .collect();

    const agentCalls = recentActivity.filter(
      (a) => a.agent === args.agent && a.level === "action"
    );
    const MAX_CALLS_PER_HOUR = 10;
    if (agentCalls.length >= MAX_CALLS_PER_HOUR) {
      return { allowed: false, reason: `Rate limit: ${args.agent} at ${MAX_CALLS_PER_HOUR}/hour` };
    }

    // 4. Circuit breaker — too many failures recently?
    const tenMinAgo = Date.now() - 10 * 60 * 1000;
    const recentErrors = recentActivity.filter(
      (a) => a.level === "error" && a.createdAt > tenMinAgo
    );
    if (recentErrors.length >= 5) {
      return { allowed: false, reason: "Circuit breaker: 5+ failures in 10 min" };
    }

    return { allowed: true };
  },
});
```

- [ ] **Step 2: Run type check**

Run: `cd packages/backend && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/backend/convex/autopilot/guards.ts
git commit -m "feat(autopilot): add guards middleware for agent execution"
```

### Task 2.2: Create heartbeat.ts — condition-driven agent waking

**Files:**
- Create: `packages/backend/convex/autopilot/heartbeat.ts`

This is the core of the new architecture. One function runs every few minutes, checks conditions for each agent, and wakes them if needed.

- [ ] **Step 1: Write heartbeat.ts**

```typescript
/**
 * Heartbeat — the only system cron for autopilot.
 *
 * Runs every 3 minutes. For each enabled org, checks wake conditions
 * for each agent. If conditions are met + guards pass, wakes the agent.
 *
 * This replaces the orchestrator, all cron_handlers, and the self-heal cron.
 */

import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { internalAction, internalQuery } from "../_generated/server";
import { v } from "convex/values";

// ============================================
// PURE FUNCTIONS (exported for testing)
// ============================================

const ONE_HOUR = 60 * 60 * 1000;
const FOUR_HOURS = 4 * ONE_HOUR;
const ONE_DAY = 24 * ONE_HOUR;
const THREE_DAYS = 3 * ONE_DAY;
const ONE_WEEK = 7 * ONE_DAY;

export const shouldWakePM = (
  readyStories: number, newNotes: number, lastRanAt: number, now: number, roadmapStale: boolean
): boolean =>
  readyStories < 3 || newNotes > 0 || roadmapStale || now - lastRanAt > FOUR_HOURS;

export const shouldWakeGrowth = (
  lastRanAt: number, now: number, shippedWithoutContent: boolean
): boolean =>
  shippedWithoutContent || now - lastRanAt > THREE_DAYS;

/**
 * Check wake conditions for all agents in an org.
 * Returns the list of agents that should wake up.
 */
export const checkWakeConditions = internalQuery({
  args: { organizationId: v.id("organizations") },
  returns: v.array(v.string()),
  handler: async (ctx, args) => {
    const agentsToWake: string[] = [];
    const now = Date.now();
    const ONE_HOUR = 60 * 60 * 1000;
    const FOUR_HOURS = 4 * ONE_HOUR;
    const ONE_DAY = 24 * ONE_HOUR;
    const THREE_DAYS = 3 * ONE_DAY;

    // Collect activity log ONCE for performance (not per-agent)
    const recentLog = await ctx.db
      .query("autopilotActivityLog")
      .withIndex("by_org_created", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(200);

    const lastActivity = (agent: string): number => {
      const entry = recentLog.find((l) => l.agent === agent);
      return entry?.createdAt ?? 0;
    };

    // Shared queries (reused across conditions)
    const readyStories = await ctx.db
      .query("autopilotUserStories")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "ready")
      )
      .collect();

    const newNotes = await ctx.db
      .query("autopilotSignals") // DB name unchanged
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "new")
      )
      .collect();

    // PM: stories low, new notes, roadmap stale, or time fallback
    const roadmapDoc = await ctx.db
      .query("autopilotKnowledgeDocs")
      .withIndex("by_org_docType", (q) =>
        q.eq("organizationId", args.organizationId).eq("docType", "product_roadmap")
      )
      .unique();
    const ROADMAP_STALE_MS = 7 * ONE_DAY;
    const roadmapStale = roadmapDoc
      ? now - roadmapDoc.lastUpdatedAt > ROADMAP_STALE_MS
      : true;

    if (shouldWakePM(readyStories.length, newNotes.length, lastActivity("pm"), now, roadmapStale)) {
      agentsToWake.push("pm");
    }

    // CTO: stories in "ready" status (need specs)
    if (readyStories.length > 0) {
      agentsToWake.push("cto");
    }

    // Dev: approved specs exist, OR CI fix needed (failed runs)
    const approvedSpecs = await ctx.db
      .query("autopilotTechnicalSpecs")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();
    const failedRuns = await ctx.db
      .query("autopilotRuns")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "failed")
      )
      .first();

    if (approvedSpecs.some((s) => s.status === "approved") || failedRuns) {
      agentsToWake.push("dev");
    }

    // Growth: research stale (> 3 days) OR shipped initiatives without content
    const shippedStories = await ctx.db
      .query("autopilotUserStories")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "shipped")
      )
      .collect();
    const contentItems = await ctx.db
      .query("autopilotGrowthItems")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();
    const shippedWithoutContent = shippedStories.length > contentItems.length;

    if (shouldWakeGrowth(lastActivity("growth"), now, shippedWithoutContent)) {
      agentsToWake.push("growth");
    }

    // Sales: new market/prospect notes, or daily follow-up check
    const prospectNotes = newNotes.filter(
      (n) => n.noteCategory === "market" || n.noteCategory === "prospect"
    );
    if (prospectNotes.length > 0 || now - lastActivity("sales") > ONE_DAY) {
      agentsToWake.push("sales");
    }

    // Security: daily scan, or new dependency detected (check recent PRs)
    if (now - lastActivity("security") > ONE_DAY) {
      agentsToWake.push("security");
    }

    // CEO: ~4h coordination, or President messages pending
    if (now - lastActivity("ceo") > FOUR_HOURS) {
      agentsToWake.push("ceo");
    }

    // Architect: new PR to review (check recent runs), or weekly fallback
    const recentCompletedRuns = await ctx.db
      .query("autopilotRuns")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "completed")
      )
      .order("desc")
      .first();
    const hasRecentPR = recentCompletedRuns && recentCompletedRuns.prUrl &&
      now - (recentCompletedRuns.completedAt ?? 0) < ONE_DAY;

    if (hasRecentPR || now - lastActivity("architect") > 7 * ONE_DAY) {
      agentsToWake.push("architect");
    }

    // Support: new conversations, or daily fallback
    const newConversations = await ctx.db
      .query("autopilotSupportConversations")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "new")
      )
      .first();
    if (newConversations || now - lastActivity("support") > ONE_DAY) {
      agentsToWake.push("support");
    }

    // Docs: weekly fallback
    if (now - lastActivity("docs") > 7 * ONE_DAY) {
      agentsToWake.push("docs");
    }

    return agentsToWake;
  },
});

/**
 * The heartbeat — the single autopilot cron.
 * Checks conditions, passes guards, wakes agents.
 */
export const runHeartbeat = internalAction({
  args: {},
  handler: async (ctx) => {
    const configs = await ctx.runQuery(
      internal.autopilot.config.getEnabledConfigs
    );

    for (const config of configs) {
      const orgId = config.organizationId;

      // Check which agents should wake
      const agentsToWake = await ctx.runQuery(
        internal.autopilot.heartbeat.checkWakeConditions,
        { organizationId: orgId }
      );

      if (agentsToWake.length === 0) {
        continue;
      }

      // Check activation status for each agent
      for (const agent of agentsToWake) {
        // Check if agent is enabled
        const enabled = await ctx.runQuery(
          internal.autopilot.config.isAgentEnabled,
          { organizationId: orgId, agent }
        );
        if (!enabled) {
          continue;
        }

        // Check guards
        const guardResult = await ctx.runQuery(
          internal.autopilot.guards.checkGuards,
          { organizationId: orgId, agent }
        );
        if (!guardResult.allowed) {
          continue;
        }

        // Wake the agent — schedule its action
        try {
          await wakeAgent(ctx, orgId, agent);
        } catch {
          // Best effort — one agent failing shouldn't block others
        }
      }
    }
  },
});

/**
 * Wake a specific agent by scheduling its main action.
 */
async function wakeAgent(
  ctx: { scheduler: { runAfter: (delay: number, fn: unknown, args: unknown) => Promise<void> } },
  organizationId: Id<"organizations">,
  agent: string
): Promise<void> {
  const orgId = organizationId;

  switch (agent) {
    case "pm":
      await ctx.scheduler.runAfter(
        0,
        internal.autopilot.agents.pm.analysis.runPMAnalysis,
        { organizationId: orgId }
      );
      break;
    case "cto":
      // CTO picks up stories from the board
      await ctx.scheduler.runAfter(
        0,
        internal.autopilot.agents.cto.runCTOSpecGeneration,
        { organizationId: orgId }
      );
      break;
    case "growth":
      await ctx.scheduler.runAfter(
        0,
        internal.autopilot.agents.growth.discovery.runGrowthDiscovery,
        { organizationId: orgId }
      );
      break;
    case "sales":
      await ctx.scheduler.runAfter(
        0,
        internal.autopilot.agents.sales.runSalesFollowUp,
        { organizationId: orgId }
      );
      break;
    case "security":
      await ctx.scheduler.runAfter(
        0,
        internal.autopilot.agents.security.runSecurityScan,
        { organizationId: orgId, triggerReason: "heartbeat" as const }
      );
      break;
    case "ceo":
      await ctx.scheduler.runAfter(
        0,
        internal.autopilot.agents.ceo.coordination.runCEOCoordination,
        { organizationId: orgId }
      );
      break;
    case "architect":
      await ctx.scheduler.runAfter(
        0,
        internal.autopilot.agents.architect.runArchitectReview,
        { organizationId: orgId, triggerReason: "heartbeat" as const }
      );
      break;
    case "support":
      await ctx.scheduler.runAfter(
        0,
        internal.autopilot.agents.support.runSupportTriage,
        { organizationId: orgId }
      );
      break;
    case "docs":
      await ctx.scheduler.runAfter(
        0,
        internal.autopilot.agents.docs.runDocsCheck,
        { organizationId: orgId }
      );
      break;
  }
}
```

- [ ] **Step 2: Add getEnabledConfigs query to config.ts**

In `packages/backend/convex/autopilot/config.ts`, add:

```typescript
export const getEnabledConfigs = internalQuery({
  args: {},
  handler: async (ctx) => {
    const configs = await ctx.db.query("autopilotConfig").collect();
    return configs.filter(
      (c) => c.enabled && (c.autonomyMode ?? "supervised") !== "stopped"
    );
  },
});
```

- [ ] **Step 3: Run type check**

Run: `cd packages/backend && npx tsc --noEmit`
Expected: May have errors if CTO/agent function signatures don't match — note them for Task 2.4

- [ ] **Step 4: Commit**

```bash
git add packages/backend/convex/autopilot/heartbeat.ts packages/backend/convex/autopilot/guards.ts packages/backend/convex/autopilot/config.ts
git commit -m "feat(autopilot): add heartbeat (condition-driven agent waking) + guards"
```

### Task 2.3: Create maintenance.ts FIRST, then update crons.ts

**Files:**
- Create: `packages/backend/convex/autopilot/maintenance.ts` (from `cron_handlers/system.ts`)
- Modify: `packages/backend/convex/autopilot/self_heal.ts` (update import from orchestrator → config)
- Modify: `packages/backend/convex/crons.ts`

**Order matters:** Create `maintenance.ts` and fix `self_heal.ts` BEFORE updating `crons.ts` to avoid a broken intermediate state.

- [ ] **Step 1: Create maintenance.ts from cron_handlers/system.ts**

Copy `cron_handlers/system.ts` to `maintenance.ts`. Update internal references: replace `internal.autopilot.orchestrator.queries.getEnabledOrgs` with `internal.autopilot.config.getEnabledConfigs`. Rename `runSignalCleanup` → `runNoteCleanup`.

- [ ] **Step 2: Update self_heal.ts — replace orchestrator import**

In `self_heal.ts`, find all references to `internal.autopilot.orchestrator.queries.getEnabledOrgs` and replace with `internal.autopilot.config.getEnabledConfigs`. Adjust the return type usage if needed (the new query returns full config objects, not just `{organizationId}`).

- [ ] **Step 3: Replace all autopilot crons in crons.ts**

In `packages/backend/convex/crons.ts`, remove ALL lines between `// AUTOPILOT CRONS` and `export default crons`, then add:

```typescript
// ============================================
// AUTOPILOT — single heartbeat + maintenance
// ============================================

// The heartbeat checks agent wake conditions every 3 min.
// This replaces all 20 previous agent-specific crons.
crons.interval(
  "autopilot heartbeat",
  { minutes: 3 },
  internal.autopilot.heartbeat.runHeartbeat
);

// Self-healing: clean stuck/orphaned tasks (system-wide)
crons.interval(
  "autopilot self-healing",
  { minutes: 10 },
  internal.autopilot.self_heal.runSelfHealing
);

// Infrastructure maintenance (no agent intelligence)
crons.daily(
  "autopilot cost reset",
  { hourUTC: 0, minuteUTC: 0 },
  internal.autopilot.cost_guard.resetDailyCounters
);

crons.daily(
  "autopilot inbox expiration",
  { hourUTC: 1, minuteUTC: 0 },
  internal.autopilot.maintenance.runInboxExpiration
);

crons.daily(
  "autopilot note cleanup",
  { hourUTC: 2, minuteUTC: 0 },
  internal.autopilot.maintenance.runNoteCleanup
);

crons.daily(
  "autopilot knowledge staleness check",
  { hourUTC: 6, minuteUTC: 30 },
  internal.autopilot.maintenance.runKnowledgeStalenessCheck
);

// NOTE: intelligence crons are KEPT until SP5 removes the intelligence module.
// They compile against existing tables and don't conflict with the heartbeat.
crons.daily(
  "autopilot intelligence scans",
  { hourUTC: 6, minuteUTC: 0 },
  internal.autopilot.intelligence.crons.runScheduledScans
);

crons.weekly(
  "autopilot intelligence digest",
  { dayOfWeek: "monday", hourUTC: 10, minuteUTC: 0 },
  internal.autopilot.intelligence.notifications.sendAllIntelligenceDigests
);
```

- [ ] **Step 4: Run type check**

Run: `cd packages/backend && npx tsc --noEmit`
Expected: PASS (maintenance.ts and self_heal.ts are updated before crons.ts references them)

- [ ] **Step 5: Commit**

```bash
git add packages/backend/convex/autopilot/maintenance.ts packages/backend/convex/autopilot/self_heal.ts packages/backend/convex/crons.ts
git commit -m "refactor(autopilot): replace 20 crons with heartbeat + maintenance + self-heal"
```

### Task 2.4: Delete orchestrator directory

**Files:**
- Delete: `packages/backend/convex/autopilot/orchestrator/` (entire directory)

- [ ] **Step 1: Find all references to orchestrator**

Run: `grep -r "autopilot.orchestrator" packages/backend/convex/ --include="*.ts" -l`

- [ ] **Step 2: Update all references**

The main references are:
- `crons.ts` — already updated in Task 2.3
- `cron_handlers/*.ts` — they reference `orchestrator.queries.getEnabledOrgs`. Replace with `config.getEnabledConfigs` or inline.
- `onboarding.ts` — may reference orchestrator

For each file found, replace `internal.autopilot.orchestrator.queries.getEnabledOrgs` with `internal.autopilot.config.getEnabledConfigs` (added in Task 2.2).

- [ ] **Step 3: Delete orchestrator directory**

```bash
rm -rf packages/backend/convex/autopilot/orchestrator/
```

- [ ] **Step 4: Run type check**

Run: `cd packages/backend && npx tsc --noEmit`
Expected: Should pass or show errors only in cron_handlers (which we keep temporarily)

- [ ] **Step 5: Commit**

```bash
git add -A packages/backend/convex/autopilot/orchestrator/ packages/backend/convex/autopilot/
git commit -m "refactor(autopilot): remove orchestrator — heartbeat replaces it"
```

### Task 2.5: Delete most cron_handlers (keep system.ts as maintenance.ts)

**Files:**
- Delete: `packages/backend/convex/autopilot/cron_handlers/pm.ts`
- Delete: `packages/backend/convex/autopilot/cron_handlers/ceo.ts`
- Delete: `packages/backend/convex/autopilot/cron_handlers/security.ts`
- Delete: `packages/backend/convex/autopilot/cron_handlers/architect.ts`
- Delete: `packages/backend/convex/autopilot/cron_handlers/growth.ts`
- Delete: `packages/backend/convex/autopilot/cron_handlers/sales.ts`
- Delete: `packages/backend/convex/autopilot/cron_handlers/support.ts`
- Delete: `packages/backend/convex/autopilot/cron_handlers/docs.ts`
- Rename: `packages/backend/convex/autopilot/cron_handlers/system.ts` → `packages/backend/convex/autopilot/maintenance.ts`

These cron handlers were just wrappers that looped over orgs and called agent actions. The heartbeat now does this directly.

- [ ] **Step 1: Move system.ts to maintenance.ts**

Copy `cron_handlers/system.ts` content to `maintenance.ts` at the autopilot root. Update its internal references to use `config.getEnabledConfigs` instead of `orchestrator.queries.getEnabledOrgs`.

- [ ] **Step 2: Update crons.ts references**

Change:
```
internal.autopilot.cron_handlers.system.runInboxExpiration
internal.autopilot.cron_handlers.system.runSignalCleanup
```
To:
```
internal.autopilot.maintenance.runInboxExpiration
internal.autopilot.maintenance.runNoteCleanup
```

- [ ] **Step 3: Delete cron_handlers directory**

```bash
rm -rf packages/backend/convex/autopilot/cron_handlers/
```

- [ ] **Step 4: Run type check + linter**

Run: `cd packages/backend && npx tsc --noEmit && bun x ultracite check`
Expected: PASS

- [ ] **Step 5: Run tests**

Run: `cd packages/backend && bun test`
Expected: PASS (existing tests may need updating if they reference orchestrator)

- [ ] **Step 6: Commit**

```bash
git add -A packages/backend/convex/autopilot/
git commit -m "refactor(autopilot): delete cron_handlers, keep maintenance for cleanup jobs"
```

### Task 2.6: Delete prerequisites.ts

**Files:**
- Delete: `packages/backend/convex/autopilot/prerequisites.ts`

Prerequisites were the old system's way of checking "does this agent have data to work with?" In the new architecture, agents are self-directed and proactive — they find their own work. No prerequisites needed.

- [ ] **Step 1: Find all references**

Run: `grep -r "prerequisites" packages/backend/convex/autopilot/ --include="*.ts" -l`

- [ ] **Step 2: Remove prerequisite checks from agent files, add graceful empty-data handling**

For each agent that calls `checkXPrerequisites`, remove the check and ensure the agent handles empty data gracefully:

- `agents/docs.ts` — calls `checkDocsPrerequisites`. Remove check. If no completed tasks or support conversations, log "no data to analyze" and return early (no LLM call).
- `agents/sales.ts` — calls `checkSalesPrerequisites`. Remove check. If no leads, the agent should proactively discover leads instead of skipping.
- `agents/growth/content.ts` — calls `checkGrowthPrerequisites`. Remove check. If no completed tasks, focus on market research instead of content generation.

The pattern: **don't skip, pivot.** If primary data is empty, do the secondary (proactive) work instead.

- [ ] **Step 3: Delete prerequisites.ts**

```bash
rm packages/backend/convex/autopilot/prerequisites.ts
```

- [ ] **Step 4: Run type check + tests**

Run: `cd packages/backend && npx tsc --noEmit && bun test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A packages/backend/convex/autopilot/
git commit -m "refactor(autopilot): remove prerequisites — agents are self-directed"
```

### Task 2.7: Write heartbeat tests

**Files:**
- Create: `packages/backend/convex/autopilot/__tests__/heartbeat.test.ts`

- [ ] **Step 1: Write condition logic tests using exported pure functions**

Test the actual production logic from `heartbeat.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { shouldWakePM, shouldWakeGrowth } from "../heartbeat";

const ONE_HOUR = 60 * 60 * 1000;

describe("shouldWakePM", () => {
  const now = Date.now();

  it("wakes when ready stories below threshold", () => {
    expect(shouldWakePM(2, 0, now, now, false)).toBe(true);
  });

  it("does NOT wake when stories sufficient and no triggers", () => {
    expect(shouldWakePM(5, 0, now, now, false)).toBe(false);
  });

  it("wakes when new notes exist", () => {
    expect(shouldWakePM(10, 1, now, now, false)).toBe(true);
  });

  it("wakes when roadmap is stale", () => {
    expect(shouldWakePM(10, 0, now, now, true)).toBe(true);
  });

  it("wakes on 4h time fallback", () => {
    const fiveHoursAgo = now - 5 * ONE_HOUR;
    expect(shouldWakePM(10, 0, fiveHoursAgo, now, false)).toBe(true);
  });

  it("does NOT wake when recently ran and no triggers", () => {
    const oneHourAgo = now - ONE_HOUR;
    expect(shouldWakePM(5, 0, oneHourAgo, now, false)).toBe(false);
  });
});

describe("shouldWakeGrowth", () => {
  const now = Date.now();

  it("wakes when shipped features lack content", () => {
    expect(shouldWakeGrowth(now, now, true)).toBe(true);
  });

  it("wakes when research is stale (> 3 days)", () => {
    const fourDaysAgo = now - 4 * 24 * ONE_HOUR;
    expect(shouldWakeGrowth(fourDaysAgo, now, false)).toBe(true);
  });

  it("does NOT wake when recent and no shipped features", () => {
    expect(shouldWakeGrowth(now, now, false)).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests**

Run: `cd packages/backend && bun test autopilot/__tests__/heartbeat.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/backend/convex/autopilot/__tests__/heartbeat.test.ts
git commit -m "test(autopilot): add heartbeat condition and guard tests"
```

### Task 2.8: Final verification — SP1 + SP2

- [ ] **Step 1: Type check entire backend**

Run: `cd packages/backend && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 2: Lint check**

Run: `bun x ultracite check`
Expected: PASS

- [ ] **Step 3: Run all tests**

Run: `cd packages/backend && bun test`
Expected: PASS

- [ ] **Step 4: Verify no file over 400 lines**

Run: `find packages/backend/convex/autopilot -name '*.ts' ! -path '*__tests__*' -exec wc -l {} + | sort -n | awk '$1 > 400'`
Expected: No output (no files over 400 lines)

- [ ] **Step 5: Commit any remaining fixes**

```bash
git add -A && git commit -m "refactor(autopilot): SP1+SP2 complete — notes + heartbeat architecture"
```

---

## Next Plans

**SP3: Make PM + Growth Proactive** — Implement Growth's actual market research (LLM + online search models), update PM to read Growth's notes + knowledge base, ensure PM never returns empty. This is the critical "make it actually work" sub-project.

**SP4: Implement Remaining Agent Stubs** — Sales prospecting, CEO directive relay via chat, non-blocking Company Brief gate, self-cleaning on agent wake.

**SP5: Frontend Updates** — Remove analytics/ops/intelligence pages, add knowledge editor, update dashboard.

Each will be a separate plan document in `docs/superpowers/plans/`.
