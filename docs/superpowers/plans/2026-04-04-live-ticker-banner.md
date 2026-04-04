# Live Agent Ticker Banner — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent horizontal ticker banner in the autopilot layout that shows real-time agent interactions with a typewriter effect, making the autonomous company feel alive.

**Architecture:** Enrich the existing `autopilotActivityLog` table with an optional `targetAgent` field for inter-agent interactions. Create a new `LiveTicker` React component that subscribes to recent activity via Convex real-time and displays entries as a horizontally scrolling ticker with CSS typewriter animation on new items. The ticker lives in `layout.tsx` between the header and the content area.

**Tech Stack:** Convex (real-time subscriptions), React, Motion (v12, already installed), Tailwind CSS, existing `@tabler/icons-react`.

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `packages/backend/convex/autopilot/tableFields.ts` | Modify | Add `targetAgent` optional field to `autopilotActivityLog` |
| `packages/backend/convex/autopilot/tasks.ts` | Modify | Update `logActivity` mutation args to accept optional `targetAgent` |
| `packages/backend/convex/autopilot/queries.ts` | Modify | Add `listTickerActivity` query (last 10 entries, lightweight) |
| `apps/web/src/features/autopilot/components/live-ticker.tsx` | Create | The ticker banner component with typewriter + marquee animation |
| `apps/web/app/(app)/dashboard/[orgSlug]/autopilot/layout.tsx` | Modify | Insert `<LiveTicker>` between header and content |

---

## Chunk 1: Backend — Schema & Query Changes

### Task 1: Add `targetAgent` field to activity log schema

**Files:**
- Modify: `packages/backend/convex/autopilot/tableFields.ts:391-406`

- [ ] **Step 1: Add targetAgent to the autopilotActivityLog table definition**

In `tableFields.ts`, the `autopilotActivityLog` table definition (around line 391) needs an optional `targetAgent` field. This represents the agent being addressed (e.g., CEO → PM).

```typescript
// Add after the existing `agent` field (line 395):
targetAgent: v.optional(activityLogAgent),
```

The full table should become:
```typescript
autopilotActivityLog: defineTable({
  organizationId: v.id("organizations"),
  taskId: v.optional(v.id("autopilotTasks")),
  runId: v.optional(v.id("autopilotRuns")),
  agent: activityLogAgent,
  targetAgent: v.optional(activityLogAgent),
  level: activityLogLevel,
  message: v.string,
  details: v.optional(v.string()),
  createdAt: v.number(),
})
  .index("by_organization", ["organizationId"])
  .index("by_org_created", ["organizationId", "createdAt"])
  .index("by_task", ["taskId"]),
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `cd packages/backend && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to `autopilotActivityLog`.

- [ ] **Step 3: Commit**

```bash
git add packages/backend/convex/autopilot/tableFields.ts
git commit -m "feat(autopilot): add targetAgent field to activity log schema"
```

### Task 2: Update `logActivity` mutation to accept `targetAgent`

**Files:**
- Modify: `packages/backend/convex/autopilot/tasks.ts:426-448`

- [ ] **Step 1: Add `targetAgent` to the logActivity args and handler**

In `tasks.ts`, the `logActivity` internalMutation (line 426) needs to accept and persist the optional `targetAgent`:

```typescript
export const logActivity = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    taskId: v.optional(v.id("autopilotTasks")),
    runId: v.optional(v.id("autopilotRuns")),
    agent: activityLogAgent,
    targetAgent: v.optional(activityLogAgent),
    level: activityLogLevel,
    message: v.string(),
    details: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("autopilotActivityLog", {
      organizationId: args.organizationId,
      taskId: args.taskId,
      runId: args.runId,
      agent: args.agent,
      targetAgent: args.targetAgent,
      level: args.level,
      message: args.message,
      details: args.details,
      createdAt: Date.now(),
    });
  },
});
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `cd packages/backend && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add packages/backend/convex/autopilot/tasks.ts
git commit -m "feat(autopilot): accept targetAgent in logActivity mutation"
```

### Task 3: Add lightweight ticker query

**Files:**
- Modify: `packages/backend/convex/autopilot/queries.ts` (after `listActivity`, around line 213)

- [ ] **Step 1: Add `listTickerActivity` query**

This query returns the 10 most recent activity entries — just enough for the ticker. It uses the same `by_org_created` index as `listActivity` but with a smaller limit and returns the `targetAgent` field.

Add after the existing `listActivity` query (after line 213):

```typescript
export const listTickerActivity = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);

    return ctx.db
      .query("autopilotActivityLog")
      .withIndex("by_org_created", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(10);
  },
});
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `cd packages/backend && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add packages/backend/convex/autopilot/queries.ts
git commit -m "feat(autopilot): add listTickerActivity query for live banner"
```

---

## Chunk 2: Frontend — LiveTicker Component

### Task 4: Create the LiveTicker component

**Files:**
- Create: `apps/web/src/features/autopilot/components/live-ticker.tsx`

- [ ] **Step 1: Create the LiveTicker component**

The component subscribes to `listTickerActivity`, shows entries scrolling horizontally in a marquee loop, and applies a typewriter animation to the newest entry when it changes.

```tsx
"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

// ============================================
// AGENT DISPLAY CONFIG
// ============================================

const AGENT_LABELS: Record<string, string> = {
  pm: "PM",
  cto: "CTO",
  dev: "Dev",
  security: "Security",
  architect: "Architect",
  growth: "Growth",
  orchestrator: "CEO",
  support: "Support",
  analytics: "Analytics",
  docs: "Docs",
  qa: "QA",
  ops: "Ops",
  sales: "Sales",
  system: "System",
};

const AGENT_COLORS: Record<string, string> = {
  pm: "text-blue-400",
  cto: "text-purple-400",
  dev: "text-green-400",
  security: "text-red-400",
  architect: "text-amber-400",
  growth: "text-pink-400",
  support: "text-teal-400",
  analytics: "text-indigo-400",
  docs: "text-emerald-400",
  qa: "text-violet-400",
  ops: "text-orange-400",
  sales: "text-rose-400",
  orchestrator: "text-yellow-400",
  system: "text-muted-foreground",
};

const LEVEL_SYMBOLS: Record<string, string> = {
  success: "✓",
  error: "✗",
  warning: "⚠",
  action: "▶",
  info: "·",
};

// ============================================
// TYPEWRITER HOOK
// ============================================

function useTypewriter(text: string, speed = 25) {
  const [displayed, setDisplayed] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    setDisplayed("");
    setIsTyping(true);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(interval);
        setIsTyping(false);
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);

  return { displayed, isTyping };
}

// ============================================
// TICKER ENTRY FORMATTING
// ============================================

function formatTickerEntry(entry: {
  agent: string;
  targetAgent?: string;
  message: string;
  level: string;
}): string {
  const source = AGENT_LABELS[entry.agent] ?? entry.agent;
  const symbol = LEVEL_SYMBOLS[entry.level] ?? "·";

  if (entry.targetAgent) {
    const target = AGENT_LABELS[entry.targetAgent] ?? entry.targetAgent;
    return `${source} → ${target}: "${entry.message}"`;
  }

  return `${symbol} ${source}: ${entry.message}`;
}

// ============================================
// TICKER ITEM COMPONENT
// ============================================

function TickerItem({
  entry,
  isLatest,
}: {
  entry: {
    _id: string;
    agent: string;
    targetAgent?: string;
    message: string;
    level: string;
  };
  isLatest: boolean;
}) {
  const text = formatTickerEntry(entry);
  const { displayed, isTyping } = useTypewriter(
    text,
    isLatest ? 20 : 0
  );
  const agentColor = AGENT_COLORS[entry.agent] ?? "text-muted-foreground";
  const showText = isLatest ? displayed : text;

  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 px-4">
      <span
        className={`size-1.5 shrink-0 rounded-full ${
          entry.level === "error"
            ? "bg-red-400"
            : entry.level === "success"
              ? "bg-green-400"
              : entry.level === "warning"
                ? "bg-amber-400"
                : entry.level === "action"
                  ? "bg-blue-400 animate-pulse"
                  : "bg-muted-foreground/40"
        }`}
      />
      <span className={agentColor}>{showText}</span>
      {isTyping && (
        <span className="inline-block h-3.5 w-px animate-pulse bg-current" />
      )}
    </span>
  );
}

// ============================================
// MAIN LIVE TICKER
// ============================================

export function LiveTicker({
  organizationId,
}: {
  organizationId: Id<"organizations">;
}) {
  const activity = useQuery(api.autopilot.queries.listTickerActivity, {
    organizationId,
  });
  const prevLatestId = useRef<string | null>(null);

  if (!activity || activity.length === 0) {
    return null;
  }

  const latestId = activity[0]._id;
  const isNewEntry = prevLatestId.current !== null && prevLatestId.current !== latestId;

  // Update ref after render
  useEffect(() => {
    prevLatestId.current = latestId;
  }, [latestId]);

  // Duplicate entries for seamless infinite scroll
  const entries = [...activity, ...activity];

  return (
    <div className="relative mb-4 overflow-hidden rounded-lg border border-border/50 bg-card/50 backdrop-blur-sm">
      {/* Fade edges */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-card/50 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-card/50 to-transparent" />

      <div className="flex items-center">
        {/* Live indicator */}
        <div className="flex shrink-0 items-center gap-1.5 border-border/50 border-r px-3 py-2">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-green-500" />
          </span>
          <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
            Live
          </span>
        </div>

        {/* Scrolling ticker */}
        <div className="min-w-0 flex-1 overflow-hidden py-2">
          <AnimatePresence mode="popLayout">
            <motion.div
              animate={{ x: "-50%" }}
              className="flex whitespace-nowrap text-sm"
              initial={{ x: "0%" }}
              key={latestId}
              transition={{
                x: {
                  duration: activity.length * 8,
                  ease: "linear",
                  repeat: Number.POSITIVE_INFINITY,
                },
              }}
            >
              {entries.map((entry, i) => (
                <TickerItem
                  entry={entry as typeof entry & { targetAgent?: string }}
                  isLatest={i === 0 && isNewEntry}
                  key={`${entry._id}-${i < activity.length ? "a" : "b"}`}
                />
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `cd apps/web && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/autopilot/components/live-ticker.tsx
git commit -m "feat(autopilot): create LiveTicker banner component with typewriter effect"
```

### Task 5: Integrate LiveTicker into the autopilot layout

**Files:**
- Modify: `apps/web/app/(app)/dashboard/[orgSlug]/autopilot/layout.tsx`

- [ ] **Step 1: Import and place LiveTicker in the layout**

Add the import at the top of `layout.tsx`:

```typescript
import { LiveTicker } from "@/features/autopilot/components/live-ticker";
```

Then insert `<LiveTicker>` right after `<HealthBanner />` (line 188) and before the children, so it's visible on every autopilot page:

Replace this block (around lines 186-189):
```tsx
<div className="min-w-0 flex-1">
  <HealthBanner />
  {needsSetup && !isSettingsPage ? <SetupGate /> : children}
</div>
```

With:
```tsx
<div className="min-w-0 flex-1">
  <HealthBanner />
  {config?.enabled && <LiveTicker organizationId={org._id} />}
  {needsSetup && !isSettingsPage ? <SetupGate /> : children}
</div>
```

The `config?.enabled` guard ensures the ticker only shows when autopilot is active — no empty state needed.

- [ ] **Step 2: Verify no TypeScript errors**

Run: `cd apps/web && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors.

- [ ] **Step 3: Visual verification**

Open the autopilot dashboard in the browser. Verify:
- The ticker banner appears between the health banner and the page content
- The "Live" indicator pulses green
- Entries scroll horizontally in a loop
- When a new activity log entry is inserted, it appears with a typewriter effect
- Navigating between autopilot sub-pages keeps the ticker visible

- [ ] **Step 4: Run linter**

Run: `bun x ultracite check`
Fix any issues found.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/\(app\)/dashboard/\[orgSlug\]/autopilot/layout.tsx
git commit -m "feat(autopilot): integrate LiveTicker banner into autopilot layout"
```

---

## Chunk 3: Enrich Agent Messages (Narrative Style)

### Task 6: Add narrative `targetAgent` calls to key agent interactions

**Files:**
- Modify: `packages/backend/convex/autopilot/agents/pm.ts` (2 call sites)
- Modify: `packages/backend/convex/autopilot/agents/cto.ts` (if applicable)
- Modify: `packages/backend/convex/autopilot/crons.ts` (orchestrator dispatches)

This task enriches existing `logActivity` calls to include `targetAgent` where agents are clearly delegating to or communicating with another agent. This makes the ticker show directional interactions like `CEO → PM: "Analyze user feedback"`.

- [ ] **Step 1: Identify and update key interaction points**

Search for `logActivity` calls that represent inter-agent communication. The main ones:

**In `crons.ts`** — when the orchestrator dispatches agent runs, add `targetAgent` to the log:
```typescript
// When CEO/orchestrator triggers PM analysis:
targetAgent: "pm",
message: "Launching PM analysis cycle"

// When orchestrator triggers CTO:
targetAgent: "cto",
message: "Requesting technical breakdown"

// When orchestrator triggers security:
targetAgent: "security",
message: "Initiating security scan"
```

**In `pm.ts`** — when PM creates tasks assigned to other agents:
```typescript
// Line ~430, when PM creates a task for another agent:
targetAgent: task.assignedAgent as typeof args.agent,
message: `New task assigned: ${task.title}`
```

**In `cto.ts`** — when CTO breaks down tasks for dev:
```typescript
targetAgent: "dev",
message: `Technical spec ready: ${task.title}`
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `cd packages/backend && npx tsc --noEmit --pretty 2>&1 | head -20`

- [ ] **Step 3: Run linter**

Run: `bun x ultracite check`

- [ ] **Step 4: Commit**

```bash
git add packages/backend/convex/autopilot/agents/pm.ts packages/backend/convex/autopilot/agents/cto.ts packages/backend/convex/autopilot/crons.ts
git commit -m "feat(autopilot): enrich activity logs with inter-agent targeting"
```
