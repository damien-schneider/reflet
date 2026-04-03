# Reflet Autopilot V5 — Full Autonomous Company

> **Context:** V4 audited Phases 1-3 (built) and found bugs to fix. V5 adds the 5 missing agents that close every loop a real product company needs, plus the CEO chat panel and bug fixes from V4. After V5, Reflet runs an entire product autonomously.
>
> **New agents:** Support, Analytics, Docs, QA, Ops
> **Total roster after V5:** 12 agents (CEO, PM, CTO, Dev, Security, Architect, Growth, Support, Analytics, Docs, QA, Ops)

---

## What Each New Agent Does & Why It Matters

### Support Agent — the user-facing loop

**The gap it fills:** Right now, feedback arrives and sits. Emails land and nobody responds. When a feature ships, the user who requested it never hears about it. Support closes the human loop.

**What it does:**
- Watches inbound emails and support conversations (existing `supportConversations` + `supportMessages` tables)
- Drafts replies to common questions using product knowledge (repo analysis, docs, changelog)
- Escalates bugs and feature requests to PM as tasks (with source link back to the conversation)
- When a task linked to feedback completes, drafts a "shipped" notification to the original requester
- Maintains a response quality score — learns which replies get positive reactions

**Connects to:**
- `supportConversations` / `supportMessages` tables (already exist, full conversation system)
- `feedback` table (already has `aiDraftReply` field — Support takes this over)
- `autopilotEmails` for email replies
- `autopilotInboxItems` for review before sending
- Existing notification system for "shipped" notifications

**Inbox items it creates:**
- `support_reply` — drafted reply ready to send
- `support_escalation` — bug/request escalated to PM
- `shipped_notification` — "tell user X their feature shipped"

---

### Analytics Agent — the data-driven loop

**The gap it fills:** PM currently prioritizes from explicit signals (votes, feedback text). But most users never write feedback — they just use the product or churn silently. Analytics turns implicit behavior into explicit priorities.

**What it does:**
- Connects to PostHog via the PostHog MCP (already connected — see tools list)
- Pulls feature adoption rates, funnel drop-offs, retention cohorts, error rates
- Cross-references with shipped tasks: "Feature X shipped 2 weeks ago, adoption is 3% — investigate"
- Generates weekly analytics briefs for the CEO inbox
- Creates PM tasks when data warrants action: "Onboarding funnel drops 40% at step 3 — investigate"
- Detects anomalies: traffic spikes, conversion drops, engagement changes

**Connects to:**
- PostHog MCP tools (already available: `query-trends`, `query-funnel`, `query-retention`, `query-lifecycle`, `insight-query`, `error-tracking-issues-list`)
- `intelligenceInsights` table for storing analytics findings
- PM agent (creates tasks with origin `analytics_signal`)
- CEO agent (weekly analytics brief in inbox)

**Inbox items it creates:**
- `analytics_insight` — "Feature adoption below threshold"
- `analytics_anomaly` — "Error rate spiked 3x after last deploy"
- `analytics_brief` — weekly data summary for CEO

---

### Docs Agent — the knowledge loop

**The gap it fills:** Every team has the same problem — docs lag behind the product. API changes ship, docs don't update. New features launch, no user guide exists. The Docs agent makes documentation a first-class automated output.

**What it does:**
- Watches merged PRs for API surface changes (new endpoints, changed parameters, removed features)
- Generates or updates documentation PRs via the coding adapter
- Maintains an auto-generated FAQ from recurring support questions
- Creates user guides for major new features (from CTO specs + PR descriptions)
- Detects stale docs: "This guide references a function that was deleted in PR #52"

**Connects to:**
- GitHub integration (PR data, file diffs — already synced)
- Coding adapter layer (creates documentation PRs, same as Dev)
- Support conversations (FAQ source material)
- Changelog / releases (feature descriptions for guides)

**Inbox items it creates:**
- `docs_update` — "API docs need updating after PR #47"
- `docs_new` — "New feature guide drafted for dark mode"
- `docs_stale` — "Guide references deleted function"

---

### QA Agent — the quality loop

**The gap it fills:** CI runs unit tests, Security checks vulnerabilities, Architect checks code quality. Nobody tests the product as a user would. QA validates that shipped features actually work end-to-end.

**What it does:**
- Reads acceptance criteria from CTO specs
- Generates E2E test scenarios (Playwright test files) and creates PRs via the coding adapter
- After every merged PR, runs a regression check: "Do existing flows still work?"
- Validates that the feature described in the task actually exists in the deployed product
- Creates bug tasks when tests fail, with reproduction steps

**Connects to:**
- `autopilotTasks` (reads acceptance criteria from CTO specs)
- Coding adapter layer (creates test PRs)
- GitHub CI status (monitors test results after PR merge)
- PM agent (creates bug tasks with origin `qa_regression`)
- PostHog error tracking (correlates test failures with real errors)

**Inbox items it creates:**
- `qa_test_ready` — "E2E tests generated for dark mode feature"
- `qa_regression` — "Login flow broken after PR #47"
- `qa_coverage` — "Feature has no E2E tests — draft ready"

---

### Ops Agent — the reliability loop

**The gap it fills:** Everything else builds. Ops keeps it running. When a deploy breaks production, nobody should have to notice manually.

**What it does:**
- Monitors Vercel deployments (via Vercel MCP — already connected: `get_deployment`, `get_runtime_logs`, `get_deployment_build_logs`, `list_deployments`)
- Monitors PostHog error tracking (`error-tracking-issues-list`, `list-errors`)
- Detects post-deploy error spikes: "Error rate 5x higher than pre-deploy baseline"
- Creates rollback tasks (or alerts CEO for manual rollback)
- Monitors build times, deployment frequency, failure rates
- Generates weekly reliability reports (uptime, error trends, deploy stats)

**Connects to:**
- Vercel MCP tools (deployment data, logs, build info)
- PostHog MCP tools (error tracking, event trends)
- `autopilotTasks` (creates rollback / hotfix tasks)
- CEO inbox (reliability reports, critical alerts)

**Inbox items it creates:**
- `ops_deploy_failure` — "Deployment failed, build logs attached"
- `ops_error_spike` — "Error rate 5x after deploy abc123"
- `ops_reliability_report` — weekly uptime and performance summary
- `ops_rollback` — "Recommend rollback — errors critical"

---

## Schema Changes

### New validators to add to `tableFields.ts`

```typescript
// Extend assignedAgent with new agents
export const assignedAgent = v.union(
  v.literal("pm"),
  v.literal("cto"),
  v.literal("dev"),
  v.literal("security"),
  v.literal("architect"),
  v.literal("growth"),
  v.literal("support"),
  v.literal("analytics"),
  v.literal("docs"),
  v.literal("qa"),
  v.literal("ops"),
  v.literal("orchestrator")
);

// Extend activityLogAgent similarly
export const activityLogAgent = v.union(
  ...assignedAgent options...,
  v.literal("system")
);

// Extend taskOrigin
export const taskOrigin = v.union(
  v.literal("pm_analysis"),
  v.literal("security_scan"),
  v.literal("architect_review"),
  v.literal("growth_suggestion"),
  v.literal("user_created"),
  v.literal("cto_breakdown"),
  v.literal("support_escalation"),
  v.literal("analytics_signal"),
  v.literal("qa_regression"),
  v.literal("ops_incident"),
  v.literal("docs_update")
);

// Extend inboxItemType
export const inboxItemType = v.union(
  ...existing types...,
  v.literal("support_reply"),
  v.literal("support_escalation"),
  v.literal("shipped_notification"),
  v.literal("analytics_insight"),
  v.literal("analytics_anomaly"),
  v.literal("analytics_brief"),
  v.literal("docs_update"),
  v.literal("docs_stale"),
  v.literal("qa_test_ready"),
  v.literal("qa_regression"),
  v.literal("ops_deploy_failure"),
  v.literal("ops_error_spike"),
  v.literal("ops_reliability_report"),
  v.literal("ops_rollback")
);
```

### New table: `autopilotAnalyticsSnapshots`

```typescript
autopilotAnalyticsSnapshots: defineTable({
  organizationId: v.id("organizations"),
  snapshotDate: v.string(),
  activeUsers: v.number(),
  newUsers: v.number(),
  retention7d: v.optional(v.number()),
  retention30d: v.optional(v.number()),
  topFeatures: v.optional(v.string()), // JSON array of { name, usage }
  funnelDropoffs: v.optional(v.string()), // JSON array of { step, dropRate }
  errorCount: v.optional(v.number()),
  insights: v.optional(v.string()), // AI-generated summary
  createdAt: v.number(),
})
  .index("by_organization", ["organizationId"])
  .index("by_org_date", ["organizationId", "snapshotDate"]),
```

### New table: `autopilotOpsSnapshots`

```typescript
autopilotOpsSnapshots: defineTable({
  organizationId: v.id("organizations"),
  snapshotDate: v.string(),
  deployCount: v.number(),
  failedDeploys: v.number(),
  avgBuildTime: v.optional(v.number()),
  errorRate: v.optional(v.number()),
  uptimePercent: v.optional(v.number()),
  incidentCount: v.number(),
  createdAt: v.number(),
})
  .index("by_organization", ["organizationId"])
  .index("by_org_date", ["organizationId", "snapshotDate"]),
```

---

## Build Plan

### Phase 6A: Bug Fixes from V4 (do first)

All critical bugs from the V4 audit. These block testing of everything else.

| # | Fix | File | Effort |
|---|-----|------|--------|
| 6A.1 | Fix infinite retry loop (increment retryCount) | execution.ts, tasks.ts | Small |
| 6A.2 | Fix growth agent API call (openrouter.chat → openrouter) | agents/growth.ts | Trivial |
| 6A.3 | Standardize model names + create shared models.ts | agents/*.ts, agents/shared.ts | Small |
| 6A.4 | Delete duplicate email send stub | email.ts | Trivial |
| 6A.5 | Load AGENTS.md in execution layer | execution.ts | Small |
| 6A.6 | Wire isEmailBlocked into sending flow | email_sending.ts | Small |
| 6A.7 | Pass CC field to Resend | email_sending.ts | Trivial |
| 6A.8 | Revenue snapshot deduplication | revenue.ts | Small |

### Phase 6B: CEO Chat Panel

The single biggest UX gap. Must exist before new agents can surface their outputs properly.

| # | Task | File | Effort |
|---|------|------|--------|
| 6B.1 | Public queries: getCEOThread, getCEOMessages | queries.ts | Small |
| 6B.2 | Public mutation: sendCEOMessage + wire streaming | mutations.ts | Medium |
| 6B.3 | CEO chat panel component (resizable right sidebar) | ceo-chat-panel.tsx | Medium |
| 6B.4 | CEO message bubble (reuse inbox MessageBubble pattern) | ceo-message-bubble.tsx | Small |
| 6B.5 | CEO input with Cmd+Enter, typing indicator | ceo-input.tsx | Small |
| 6B.6 | Wire into autopilot layout (collapsible, persists across pages) | layout.tsx | Small |

### Phase 6C: Support Agent

Highest-value new agent. Connects existing support system to autopilot.

| # | Task | File | Effort |
|---|------|------|--------|
| 6C.1 | Extend validators (assignedAgent, taskOrigin, inboxItemType) | tableFields.ts | Small |
| 6C.2 | Build Support Agent | agents/support.ts | Large |
| 6C.3 | "Shipped" notification system (feedback → task → completion → user notify) | agents/support.ts | Medium |
| 6C.4 | Support response quality tracking | agents/support.ts | Small |
| 6C.5 | Add support cron (check new conversations every 5 min) | crons.ts | Small |
| 6C.6 | Frontend: support replies in inbox | inbox-item-card.tsx | Small |

**Support Agent internals:**
- `runSupportTriage` (internalAction) — scans new support conversations, drafts replies, escalates bugs
- `generateSupportReply` — uses product knowledge (repo analysis, changelog, FAQ) to draft contextual replies
- `notifyFeatureShipped` — watches completed tasks, finds linked feedback, drafts "shipped" notifications
- Queries: existing `supportConversations`, `supportMessages`, `feedback` tables
- Creates: inbox items (support_reply, support_escalation, shipped_notification), autopilot tasks (bug escalations)

### Phase 6D: Analytics Agent

Second-highest value. Uses PostHog MCP tools already connected.

| # | Task | File | Effort |
|---|------|------|--------|
| 6D.1 | Add autopilotAnalyticsSnapshots table | tableFields.ts | Small |
| 6D.2 | Build Analytics Agent | agents/analytics.ts | Large |
| 6D.3 | PostHog data pulling helpers (trends, funnels, errors) | agents/analytics.ts | Medium |
| 6D.4 | Weekly analytics brief generation | agents/analytics.ts | Medium |
| 6D.5 | Anomaly detection (post-deploy error spikes, adoption drops) | agents/analytics.ts | Medium |
| 6D.6 | Add analytics crons (daily snapshot, weekly brief) | crons.ts | Small |
| 6D.7 | Frontend: analytics insights in inbox + dashboard widget | inbox-item-card.tsx, dashboard | Small |

**Analytics Agent internals:**
- `captureAnalyticsSnapshot` (internalAction) — daily pull from PostHog: active users, retention, errors, top features
- `runAnalyticsBrief` (internalAction) — weekly AI summary of trends, anomalies, recommendations
- `detectAnomalies` — compares current vs baseline metrics, fires alerts on significant changes
- `correlateWithShippedFeatures` — cross-references PostHog data with completed tasks to measure feature impact
- Uses: PostHog MCP tools (`query-trends`, `query-funnel`, `query-retention`, `error-tracking-issues-list`)
- Creates: inbox items (analytics_insight, analytics_anomaly, analytics_brief), PM tasks (analytics_signal origin)

### Phase 6E: Docs Agent

Medium effort, high long-term value.

| # | Task | File | Effort |
|---|------|------|--------|
| 6E.1 | Build Docs Agent | agents/docs.ts | Large |
| 6E.2 | PR diff analysis (detect API surface changes) | agents/docs.ts | Medium |
| 6E.3 | FAQ generator from support conversations | agents/docs.ts | Medium |
| 6E.4 | Stale docs detector | agents/docs.ts | Small |
| 6E.5 | Add docs cron (post-merge trigger, weekly stale check) | crons.ts | Small |
| 6E.6 | Frontend: docs items in inbox | inbox-item-card.tsx | Small |

**Docs Agent internals:**
- `runDocsCheck` (internalAction) — scans recent merged PRs for API/UI changes, generates doc update specs
- `generateFAQ` — mines support conversations for recurring questions, produces FAQ entries
- `detectStaleDocs` — compares doc references against current codebase, flags outdated content
- Creates: coding adapter tasks (docs PRs), inbox items (docs_update, docs_stale, docs_new)

### Phase 6F: QA Agent

| # | Task | File | Effort |
|---|------|------|--------|
| 6F.1 | Build QA Agent | agents/qa.ts | Large |
| 6F.2 | E2E test generation from acceptance criteria | agents/qa.ts | Large |
| 6F.3 | Regression detection (post-merge CI monitoring) | agents/qa.ts | Medium |
| 6F.4 | Add QA cron (post-merge trigger) | crons.ts | Small |
| 6F.5 | Frontend: QA items in inbox | inbox-item-card.tsx | Small |

**QA Agent internals:**
- `generateE2ETests` (internalAction) — reads task acceptance criteria + CTO spec, generates Playwright test files, creates PR via coding adapter
- `runRegressionCheck` (internalAction) — after PR merge, checks CI status, correlates with PostHog error data
- `createBugTask` — when regression detected, creates high-priority task with reproduction steps
- Uses: coding adapter (for test PRs), GitHub CI status, PostHog error tracking

### Phase 6G: Ops Agent

| # | Task | File | Effort |
|---|------|------|--------|
| 6G.1 | Add autopilotOpsSnapshots table | tableFields.ts | Small |
| 6G.2 | Build Ops Agent | agents/ops.ts | Large |
| 6G.3 | Vercel deployment monitoring (via Vercel MCP) | agents/ops.ts | Medium |
| 6G.4 | Post-deploy error correlation | agents/ops.ts | Medium |
| 6G.5 | Weekly reliability report | agents/ops.ts | Small |
| 6G.6 | Add ops crons (hourly deploy check, daily snapshot, weekly report) | crons.ts | Small |
| 6G.7 | Frontend: ops items in inbox + dashboard health indicator | inbox-item-card.tsx, dashboard | Small |

**Ops Agent internals:**
- `monitorDeployments` (internalAction) — polls Vercel MCP for recent deploys, checks build status, monitors runtime logs
- `detectErrorSpike` — compares post-deploy error rates vs pre-deploy baseline via PostHog
- `captureOpsSnapshot` (internalAction) — daily reliability metrics (deploy count, fail rate, build time, error rate)
- `generateReliabilityReport` — weekly summary with uptime, trends, incident list
- Uses: Vercel MCP tools (`list_deployments`, `get_deployment`, `get_runtime_logs`, `get_deployment_build_logs`), PostHog MCP
- Creates: inbox items (ops_deploy_failure, ops_error_spike, ops_rollback, ops_reliability_report), rollback/hotfix tasks

---

## Orchestrator Updates

The orchestrator in `crons.ts` already has a `switch` on `task.assignedAgent`. Add cases for the 5 new agents:

```typescript
case "support":
  await ctx.scheduler.runAfter(0, internal.autopilot.agents.support.runSupportTriage, {
    organizationId: args.organizationId,
  });
  break;

case "analytics":
  await ctx.scheduler.runAfter(0, internal.autopilot.agents.analytics.runAnalyticsBrief, {
    organizationId: args.organizationId,
  });
  break;

case "docs":
  await ctx.scheduler.runAfter(0, internal.autopilot.agents.docs.runDocsCheck, {
    organizationId: args.organizationId,
  });
  break;

case "qa":
  await ctx.scheduler.runAfter(0, internal.autopilot.agents.qa.generateE2ETests, {
    organizationId: args.organizationId,
    taskId: task._id,
  });
  break;

case "ops":
  await ctx.scheduler.runAfter(0, internal.autopilot.agents.ops.monitorDeployments, {
    organizationId: args.organizationId,
  });
  break;
```

### New Crons

```typescript
// Support: check for new conversations every 5 minutes
crons.interval("autopilot support triage", { minutes: 5 },
  internal.autopilot.crons.runSupportTriage);

// Analytics: daily snapshot + weekly brief
crons.daily("autopilot analytics snapshot", { hourUTC: 7, minuteUTC: 30 },
  internal.autopilot.crons.runAnalyticsSnapshot);
crons.weekly("autopilot analytics brief", { dayOfWeek: "monday", hourUTC: 8, minuteUTC: 0 },
  internal.autopilot.crons.runAnalyticsBrief);

// Docs: weekly stale check
crons.weekly("autopilot docs stale check", { dayOfWeek: "wednesday", hourUTC: 6, minuteUTC: 0 },
  internal.autopilot.crons.runDocsStaleCheck);

// QA: no dedicated cron — triggered by PR merge webhook
// Ops: hourly deploy monitoring + daily snapshot
crons.interval("autopilot ops monitoring", { hours: 1 },
  internal.autopilot.crons.runOpsMonitoring);
crons.daily("autopilot ops snapshot", { hourUTC: 23, minuteUTC: 0 },
  internal.autopilot.crons.runOpsSnapshot);
```

---

## Frontend Updates

### Agents page (`/autopilot/agents`)

Add 5 new agent cards with status, last activity, and descriptions. The page already renders cards dynamically from a list — just extend the agent definitions.

### Inbox page

The `inbox-item-card.tsx` component already renders based on `type`. Add icon/color/action mappings for the 14 new inbox item types. Most are read-only with an approve/dismiss action.

### Dashboard

Add widgets:
- **Support pulse** — "3 replies drafted, 1 escalation pending"
- **Analytics highlight** — "Feature adoption: dark mode 12%, search 89%"
- **Reliability status** — green/yellow/red indicator based on latest ops snapshot
- **Docs freshness** — "2 docs flagged as stale"

### Settings page

Add agent-specific toggles:
- Enable/disable each agent individually
- PostHog project ID for Analytics agent
- Vercel project ID for Ops agent (or auto-detect from existing integration)

---

## Parallel Execution Map

```
Phase 6A (Bug fixes) ──────────────────────────────────────────────
         │
         ├── Phase 6B (CEO Chat Panel) ──────────────┐
         │                                            │
         ├── Phase 6C (Support Agent) ────────────────┤
         │                                            │
         ├── Phase 6D (Analytics Agent) ──────────────┤
         │                                            │
         ├── Phase 6E (Docs Agent) ───────────────────┤
         │                                            │
         ├── Phase 6F (QA Agent) ─────────────────────┤
         │                                            │
         └── Phase 6G (Ops Agent) ────────────────────┤
                                                      │
                                            All merge → Update frontend
                                                      → Update orchestrator
                                                      → E2E testing
```

All 5 new agents + CEO chat can be built in parallel. They share:
- `tableFields.ts` (validators must be extended once, before agents)
- `crons.ts` (add entries after agents are built)
- `inbox-item-card.tsx` (extend after agents produce items)

**Recommended build order within parallel:**
1. First: extend validators in tableFields.ts (all agents depend on this)
2. Then: all 5 agents + CEO chat in parallel
3. Last: orchestrator updates, cron wiring, frontend card types

---

## Files to Create

```
packages/backend/convex/autopilot/agents/
├── support.ts        # Support Agent
├── analytics.ts      # Analytics Agent
├── docs.ts           # Docs Agent
├── qa.ts             # QA Agent
└── ops.ts            # Ops Agent

apps/web/src/features/autopilot/components/
├── ceo-chat-panel.tsx
├── ceo-message-bubble.tsx
└── ceo-input.tsx
```

## Files to Modify

```
packages/backend/convex/autopilot/
├── tableFields.ts      # New validators, new tables
├── crons.ts            # New cron handlers, orchestrator cases
├── execution.ts        # Bug fixes from V4
├── tasks.ts            # retryCount fix
├── email.ts            # Delete stub
├── email_sending.ts    # CC, blocklist
├── revenue.ts          # Dedup
├── agents/growth.ts    # API call fix
├── agents/shared.ts    # Model name standardization
├── queries.ts          # CEO chat queries
└── mutations.ts        # CEO chat mutations

apps/web/
├── app/.../autopilot/layout.tsx           # CEO chat panel integration
├── src/features/autopilot/components/
│   ├── inbox-item-card.tsx                # New item types
│   ├── agent-status-cards.tsx             # New agent cards
│   └── dashboard-stats.tsx                # New widgets
└── app/.../autopilot/settings/page.tsx    # Agent toggles
```

---

## After V5: The Complete Agent Roster

| Agent | Loop it closes | Data sources | Outputs |
|-------|---------------|--------------|---------|
| CEO | Strategic oversight | Everything | Reports, decisions, chat |
| PM | Signal → task | Feedback, intelligence, analytics | Prioritized tasks |
| CTO | Task → spec | Repo analysis, AGENTS.md | Technical specs, dev subtasks |
| Dev | Spec → code | CTO specs, coding adapter | PRs |
| Security | Code → safe code | Codebase, dependencies | Fix PRs, alerts |
| Architect | Code → clean code | AGENTS.md, codebase | Refactor PRs, reviews |
| Growth | Shipped → distributed | Completed tasks, intelligence | Posts, content, emails |
| Support | User → heard | Conversations, feedback, changelog | Replies, escalations, shipped notifications |
| Analytics | Behavior → insight | PostHog, shipped tasks | Insights, anomalies, PM tasks |
| Docs | Shipped → documented | PRs, support, codebase | Doc PRs, FAQ, stale alerts |
| QA | Shipped → tested | Acceptance criteria, CI, PostHog | Test PRs, regression alerts |
| Ops | Deployed → reliable | Vercel, PostHog errors | Rollback tasks, reliability reports |
