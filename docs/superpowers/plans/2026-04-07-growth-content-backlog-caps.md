# Growth Content Backlog Caps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent Growth agent from endlessly accumulating draft content by adding backlog caps at the wake condition and generation levels.

**Architecture:** Add `pendingGrowthContentCount` and `pendingGrowthBlogCount` to the heartbeat wake summary. Growth won't wake for content generation when content backlog is full (but can still wake for market research). At generation time, a safety-net cap in `saveContentDocuments` drops excess items, prioritizing community engagement over blog posts.

**Tech Stack:** Convex (queries, mutations), TypeScript, Vitest

---

### Task 1: Add content backlog fields to wake conditions

**Files:**
- Modify: `packages/backend/convex/autopilot/heartbeat_conditions.ts`
- Test: `packages/backend/convex/autopilot/__tests__/heartbeat.test.ts`

- [ ] **Step 1: Write failing tests for content backlog caps**

Add to `packages/backend/convex/autopilot/__tests__/heartbeat.test.ts`, inside the `shouldWakeGrowth` describe block:

```typescript
it("does not wake for shipped features when content backlog is full", () => {
  expect(
    shouldWakeGrowth({
      ...BASE_SUMMARY,
      shippedFeaturesWithoutContent: 3,
      pendingGrowthContentCount: 10,
    })
  ).toBe(false);
});

it("does not wake for follow-ups when content backlog is full", () => {
  expect(
    shouldWakeGrowth({
      ...BASE_SUMMARY,
      growthFollowUpNoteCount: 2,
      pendingGrowthContentCount: 10,
    })
  ).toBe(false);
});

it("still wakes for bootstrap (no research docs) even when backlog full", () => {
  expect(
    shouldWakeGrowth({
      ...BASE_SUMMARY,
      hasResearchDocs: false,
      pendingGrowthContentCount: 10,
    })
  ).toBe(true);
});

it("wakes when content backlog is below cap", () => {
  expect(
    shouldWakeGrowth({
      ...BASE_SUMMARY,
      shippedFeaturesWithoutContent: 2,
      pendingGrowthContentCount: 5,
    })
  ).toBe(true);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/backend && npx vitest run convex/autopilot/__tests__/heartbeat.test.ts`
Expected: FAIL — `pendingGrowthContentCount` does not exist on the type.

- [ ] **Step 3: Add `pendingGrowthContentCount` to ActivitySummary and `shouldWakeGrowth`**

In `packages/backend/convex/autopilot/heartbeat_conditions.ts`:

Add constant at the top (after existing constants):
```typescript
const MAX_PENDING_GROWTH_CONTENT = 10;
```

Add field to `ActivitySummary` interface:
```typescript
pendingGrowthContentCount: number;
```

Update `shouldWakeGrowth` to gate content-producing wake reasons behind the backlog cap:
```typescript
export const shouldWakeGrowth = (summary: ActivitySummary): boolean => {
  // Bootstrap always runs — we need initial research regardless of backlog
  if (!summary.hasResearchDocs) {
    return true;
  }

  // Content backlog full — don't wake for content-producing reasons
  const contentBacklogFull =
    summary.pendingGrowthContentCount >= MAX_PENDING_GROWTH_CONTENT;

  if (summary.shippedFeaturesWithoutContent > 0) {
    return !contentBacklogFull;
  }
  if (summary.growthFollowUpNoteCount > 0) {
    if (contentBacklogFull) {
      return false;
    }
    const recentlyRan =
      summary.recentGrowthSuccessAt !== null &&
      summary.now - summary.recentGrowthSuccessAt <
        GROWTH_FOLLOWUP_DAMPENING_MS;
    return !recentlyRan;
  }
  return false;
};
```

- [ ] **Step 4: Add `pendingGrowthContentCount: 0` to BASE_SUMMARY in the test file**

In `packages/backend/convex/autopilot/__tests__/heartbeat.test.ts`, add to `BASE_SUMMARY`:
```typescript
pendingGrowthContentCount: 0,
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd packages/backend && npx vitest run convex/autopilot/__tests__/heartbeat.test.ts`
Expected: ALL PASS

- [ ] **Step 6: Commit**

```bash
git add packages/backend/convex/autopilot/heartbeat_conditions.ts packages/backend/convex/autopilot/__tests__/heartbeat.test.ts
git commit -m "feat(autopilot): add content backlog cap to growth wake conditions"
```

---

### Task 2: Query pending growth content in `checkWakeConditions`

**Files:**
- Modify: `packages/backend/convex/autopilot/heartbeat_conditions.ts`

- [ ] **Step 1: Add the query for pending growth content documents**

In the `checkWakeConditions` handler in `heartbeat_conditions.ts`, after the existing `draftDocs` query block (around line 219), add:

```typescript
// Growth content backlog: count pending_review docs from growth agent
const pendingGrowthContent = await ctx.db
  .query("autopilotDocuments")
  .withIndex("by_org_status", (q) =>
    q.eq("organizationId", args.organizationId).eq("status", "pending_review")
  )
  .take(QUERY_LIMIT);
const pendingGrowthContentCount = pendingGrowthContent.filter(
  (d) => d.sourceAgent === "growth"
).length;
```

- [ ] **Step 2: Add `pendingGrowthContentCount` to the summary object**

In the summary construction block, add:
```typescript
pendingGrowthContentCount,
```

- [ ] **Step 3: Run tests to verify everything still passes**

Run: `cd packages/backend && npx vitest run convex/autopilot/__tests__/heartbeat.test.ts`
Expected: ALL PASS

- [ ] **Step 4: Run lint check**

Run: `cd packages/backend && bun x ultracite check`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add packages/backend/convex/autopilot/heartbeat_conditions.ts
git commit -m "feat(autopilot): query pending growth content count in wake conditions"
```

---

### Task 3: Add generation-level cap in `saveContentDocuments`

**Files:**
- Modify: `packages/backend/convex/autopilot/agents/growth/content_generation.ts`

- [ ] **Step 1: Add constants for content caps**

At the top of `content_generation.ts` (after imports), add:

```typescript
const MAX_PENDING_GROWTH_CONTENT = 10;
const MAX_PENDING_BLOG_POSTS = 3;
```

- [ ] **Step 2: Add backlog check and priority filtering in `saveContentDocuments`**

Replace the `saveContentDocuments` function with:

```typescript
/** Content types ordered by priority — community engagement first, blog posts last */
const CONTENT_PRIORITY: string[] = [
  "reddit_reply",
  "hn_comment",
  "twitter_post",
  "linkedin_post",
  "blog_post",
];

const saveContentDocuments = async (
  ctx: {
    runMutation: ActionCtx["runMutation"];
    runQuery: ActionCtx["runQuery"];
  },
  organizationId: Id<"organizations">,
  items: z.infer<typeof growthContentSchema>["items"]
): Promise<{ saved: number; dropped: number }> => {
  // Check existing backlog
  const pendingDocs = await ctx.runQuery(
    internal.autopilot.documents.getDocumentsByTags,
    { organizationId, tags: ["growth"], status: "pending_review" }
  );
  const currentTotal = pendingDocs.length;
  const currentBlogCount = pendingDocs.filter(
    (d) => d.type === "blog_post"
  ).length;

  // If already at the cap, skip entirely
  if (currentTotal >= MAX_PENDING_GROWTH_CONTENT) {
    await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
      organizationId,
      agent: "growth",
      level: "info",
      message: `Content generation skipped — backlog full (${currentTotal}/${MAX_PENDING_GROWTH_CONTENT} pending)`,
    });
    return { saved: 0, dropped: items.length };
  }

  // Sort items by priority: community engagement first, blog posts last
  const sortedItems = [...items].sort(
    (a, b) =>
      (CONTENT_PRIORITY.indexOf(a.type) === -1
        ? CONTENT_PRIORITY.length
        : CONTENT_PRIORITY.indexOf(a.type)) -
      (CONTENT_PRIORITY.indexOf(b.type) === -1
        ? CONTENT_PRIORITY.length
        : CONTENT_PRIORITY.indexOf(b.type))
  );

  // Batch dedup check
  const dedupResults = await ctx.runQuery(
    internal.autopilot.dedup.findSimilarGrowthItems,
    { organizationId, titles: sortedItems.map((i) => i.title) }
  );
  const existingTitles = new Set(
    dedupResults.filter((r) => r.existingId !== null).map((r) => r.title)
  );

  let saved = 0;
  let dropped = 0;
  let blogsSaved = 0;

  for (const item of sortedItems) {
    // Total cap
    if (currentTotal + saved >= MAX_PENDING_GROWTH_CONTENT) {
      dropped++;
      continue;
    }

    // Blog-specific cap
    if (
      item.type === "blog_post" &&
      currentBlogCount + blogsSaved >= MAX_PENDING_BLOG_POSTS
    ) {
      dropped++;
      continue;
    }

    // Dedup
    if (existingTitles.has(item.title)) {
      continue;
    }

    let validatedTargetUrl = item.targetUrl;
    if (validatedTargetUrl) {
      const validation = await validateUrl(validatedTargetUrl);
      if (!validation.valid) {
        await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
          organizationId,
          agent: "growth",
          level: "info",
          message: `Dropped invalid targetUrl: ${validatedTargetUrl} (${validation.reason})`,
        });
        validatedTargetUrl = "";
      }
    }

    await ctx.runMutation(internal.autopilot.documents.createDocument, {
      organizationId,
      type: item.type as
        | "blog_post"
        | "reddit_reply"
        | "linkedin_post"
        | "twitter_post"
        | "hn_comment",
      title: item.title,
      content: item.content,
      targetUrl: validatedTargetUrl,
      status: "pending_review",
      sourceAgent: "growth",
      needsReview: true,
      reviewType: "growth_content",
      tags: ["growth", item.type],
    });

    saved++;
    if (item.type === "blog_post") {
      blogsSaved++;
    }
  }

  if (dropped > 0) {
    await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
      organizationId,
      agent: "growth",
      level: "info",
      message: `Content cap applied: saved ${saved}, dropped ${dropped} (total backlog: ${currentTotal + saved}/${MAX_PENDING_GROWTH_CONTENT}, blogs: ${currentBlogCount + blogsSaved}/${MAX_PENDING_BLOG_POSTS})`,
    });
  }

  return { saved, dropped };
};
```

- [ ] **Step 3: Update `processGrowthGenerationResults` to use the new return value**

In `processGrowthGenerationResults`, change the `saveContentDocuments` call and the success log:

```typescript
const { saved, dropped } = await saveContentDocuments(ctx, orgId, generatedContent.items);

await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
  organizationId: orgId,
  agent: "growth",
  level: "success",
  message: `Growth generation complete: ${saved} saved, ${dropped} dropped (cap), ${discoveredThreads.threads.length} threads analyzed`,
  details: JSON.stringify({
    tasksAnalyzed: relevantTasks.length,
    threadsDiscovered: discoveredThreads.threads.length,
    contentPieces: generatedContent.items.length,
    contentSaved: saved,
    contentDropped: dropped,
    triggerReason: args.triggerReason,
  }),
});
```

- [ ] **Step 4: Run lint check**

Run: `cd packages/backend && bun x ultracite check`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add packages/backend/convex/autopilot/agents/growth/content_generation.ts
git commit -m "feat(autopilot): add generation-level content backlog cap with priority ordering"
```

---

### Task 4: Add market research document cap

**Files:**
- Modify: `packages/backend/convex/autopilot/agents/growth/research_helpers.ts`

- [ ] **Step 1: Read the current `saveResearchFindings` function**

Read `packages/backend/convex/autopilot/agents/growth/research_helpers.ts` to understand the current save logic.

- [ ] **Step 2: Add market research cap to `saveResearchFindings`**

At the top of `research_helpers.ts` (after imports), add:

```typescript
const MAX_PENDING_RESEARCH_DOCS = 15;
```

At the start of the `saveResearchFindings` function, add a backlog check:

```typescript
// Check existing research backlog
const existingResearch = await ctx.runQuery(
  internal.autopilot.documents.getDocumentsByOrg,
  { organizationId, type: "market_research" }
);
const pendingResearchCount = existingResearch.filter(
  (d) => d.status === "draft" || d.status === "pending_review"
).length;

if (pendingResearchCount >= MAX_PENDING_RESEARCH_DOCS) {
  await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
    organizationId,
    agent: "growth",
    level: "info",
    message: `Research save skipped — backlog full (${pendingResearchCount}/${MAX_PENDING_RESEARCH_DOCS} pending)`,
  });
  return;
}
```

Also cap the number of findings saved to not exceed the limit:

```typescript
const slotsAvailable = MAX_PENDING_RESEARCH_DOCS - pendingResearchCount;
const findingsToSave = findings.slice(0, slotsAvailable);
```

Then use `findingsToSave` instead of `findings` in the save loop.

- [ ] **Step 3: Run lint check**

Run: `cd packages/backend && bun x ultracite check`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add packages/backend/convex/autopilot/agents/growth/research_helpers.ts
git commit -m "feat(autopilot): add market research document backlog cap"
```

---

### Task 5: Verify full integration

- [ ] **Step 1: Run all autopilot tests**

Run: `cd packages/backend && npx vitest run convex/autopilot/`
Expected: ALL PASS

- [ ] **Step 2: Run type check**

Run: `cd packages/backend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Run lint**

Run: `bun x ultracite check`
Expected: No errors

- [ ] **Step 4: Final commit if any fixes needed**

If any fixes were required, commit them:
```bash
git add -u
git commit -m "fix(autopilot): address lint/type issues from content cap implementation"
```
