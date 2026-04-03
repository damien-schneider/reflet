# Reflet Autopilot V6 — The Autonomous Company

> **Context:** V1-V3 built core infrastructure (adapters, execution, orchestrator, email, inbox). V4 audited and documented bugs. V5 added 5 missing agents (Support, Analytics, Docs, QA, Ops) completing the 12-agent roster. V6 transforms Reflet from "a tool with AI agents" into **the first fully autonomous company handler** — where connecting a repo boots up an entire virtual company that runs itself.
>
> **V6 is not about new agents.** The roster is complete. V6 is about the **organizational model**, the **autonomy engine**, the **onboarding pipeline**, the **user-in-the-loop experience**, and the **scaling architecture** that makes this work for any SaaS company — and eventually any business with a website.

---

## Part 1 — The Organizational Model

### The Company Metaphor (It's Not a Metaphor)

Reflet doesn't "use AI agents." Reflet **is** an AI company that runs your product. The user is the President. The agents are employees. The structure mirrors a real startup:

```
┌─────────────────────────────────────────────────────────┐
│                     PRESIDENT (User)                     │
│         Can talk to anyone. Overrides everything.        │
├─────────────────────────────────────────────────────────┤
│                        CEO Agent                         │
│   Strategic layer. Sees everything. Reports to President │
│   Relays President's decisions to the right employees    │
├──────────┬──────────┬──────────┬──────────┬─────────────┤
│ PRODUCT  │ENGINEERING│ GROWTH  │ SUPPORT  │   OPS       │
│  PM      │  CTO     │ Growth  │ Support  │  Ops        │
│          │  Dev     │ Sales*  │  Docs    │  QA         │
│          │ Security │         │ Analytics│  Architect  │
│          │          │         │          │             │
└──────────┴──────────┴──────────┴──────────┴─────────────┘
                    * Sales = V6 new agent
```

### Communication Model

**President → CEO:** Natural language chat. "I want to focus on enterprise features this quarter." CEO translates into PM priorities, CTO specs, task reprioritization. The CEO is the relay layer — it understands context and routes to the right department.

**President → Any Agent:** Direct access. The user can open any agent's panel and talk directly. "Hey Security, run a scan on the auth module." The agent executes immediately, bypassing the CEO relay. This is the "walk to their desk" interaction.

**Agent → Agent:** Database-as-communication. Agents don't call each other — they read and write shared tables. PM creates tasks, CTO picks them up. Dev creates PRs, Architect reviews them. QA watches merged PRs, Ops monitors deploys. The task DAG is the communication backbone.

**CEO → Agents:** The CEO can create tasks assigned to any agent, adjust priorities, and override agent decisions. When the President says "stop all growth activity," the CEO creates a pause directive that Growth respects.

### The "Hire" Concept (Future)

Users will eventually be able to "hire" specialized agents:

- **Sales Agent** (V6) — outbound lead generation, LinkedIn outreach, cold email sequences
- **Legal Agent** (future) — terms of service, privacy policy, compliance monitoring
- **Finance Agent** (future) — invoice generation, expense tracking, budget forecasting
- **Design Agent** (future) — UI mockups, design system maintenance, accessibility audits
- **i18n Agent** (future) — translation management, locale detection, content localization

Each "hire" is a plan upgrade. The agent appears in the team dashboard, gets its own panel, and joins the communication loop.

---

## Part 2 — The Three Autonomy Modes

### Mode 1: Supervised (Default)

The "smart company that asks before acting" mode. This is the sweet spot for most users.

**What's autonomous (no approval needed):**
- Agent-to-agent communication (PM creating tasks, CTO writing specs)
- Planning and analysis (PM analyzing feedback, Analytics pulling PostHog data)
- Internal reports (CEO daily summaries, Analytics briefs, Ops snapshots)
- Reading and analyzing the codebase
- Drafting content (emails, posts, docs, specs, test files)
- Running scans (security, architect review, stale docs check)
- Creating inbox items

**What requires approval (goes to inbox):**
- Creating or merging PRs (writing code that changes the product)
- Sending emails to real people
- Publishing content (Reddit, LinkedIn, Twitter, blog)
- Contacting users (support replies, shipped notifications)
- Creating high-cost tasks (estimated > $1)
- Deploying or rolling back
- Any action that modifies something outside the Reflet database

**How pause works:**
- Toggle flips `autonomyMode` from `supervised` to `stopped`
- All running actions complete their current step (no mid-operation cancellation)
- Scheduled crons still fire but immediately return when they see `stopped` mode
- Pending inbox items are preserved
- Queued tasks stay queued — nothing is lost
- Resume: toggle back to `supervised`, orchestrator picks up where it left off on next cron cycle

### Mode 2: Full Auto ("The Crazy One")

100% autonomous. The company runs itself. The user is informed, not asked.

**Everything from Supervised runs automatically, plus:**
- PRs auto-merge after CI passes + Architect approval score > 80
- Emails auto-send (within daily limits and blocklist)
- Growth posts auto-publish
- Support replies auto-send after 15-minute delay (time for user to intercept)
- Rollbacks auto-execute when Ops detects critical error spike
- New features auto-deploy

**Safeguards in Full Auto:**
- Daily cost cap (hard limit, not soft)
- Daily task limit still enforced
- Email daily limit still enforced
- Domain blocklist still enforced
- Protected files still protected
- 15-minute delay on all external communications (emails, posts, support replies)
- CEO generates a "Full Auto Daily Report" every morning summarizing everything that happened
- Any action that would exceed cost cap creates an inbox item instead of executing

**Who should use this:** Founders who want to sleep while their product evolves. Side project owners. People testing the limits.

### Mode 3: Stopped

Instant pause. Not "disabled" — paused.

**What happens immediately:**
- `autopilotConfig.autonomyMode` set to `stopped`
- `autopilotConfig.stoppedAt` timestamp recorded
- All running Convex scheduled functions see `stopped` and return early
- No new tasks dispatched
- No new runs created
- No emails sent
- No PRs created

**What is preserved:**
- All pending tasks (status stays `pending`)
- All in-progress tasks (status changes to `paused` — new status)
- All inbox items (nothing auto-expires while stopped)
- All agent memory
- All conversation threads
- All queued cron work

**What keeps running:**
- Revenue snapshot cron (passive data collection, no agent action)
- Analytics snapshot cron (passive data collection)
- Ops monitoring cron (passive monitoring, alerts still fire to inbox)
- Inbound email receiving (emails land in inbox, no agent processes them)

**Resume behavior:**
- Toggle back to supervised or full_auto
- `paused` tasks revert to `in_progress`
- Orchestrator resumes dispatching on next cron cycle
- Time-sensitive inbox items may have expired (by design — stale items shouldn't auto-approve)

### Implementation: The Autonomy Engine

```typescript
// New fields in autopilotConfig
autonomyMode: v.union(
  v.literal("supervised"),
  v.literal("full_auto"),
  v.literal("stopped")
),
stoppedAt: v.optional(v.number()),
fullAutoDelay: v.optional(v.number()), // ms delay before auto-actions, default 900000 (15 min)
autoMergeThreshold: v.optional(v.number()), // Architect score threshold, default 80
```

Every agent action checks autonomy before executing:

```typescript
// packages/backend/convex/autopilot/autonomy.ts
export const shouldExecuteAction = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    actionType: v.union(
      v.literal("read"),        // Always allowed unless stopped
      v.literal("plan"),        // Always allowed unless stopped
      v.literal("draft"),       // Always allowed unless stopped
      v.literal("write_code"),  // Requires approval in supervised
      v.literal("send_email"),  // Requires approval in supervised
      v.literal("publish"),     // Requires approval in supervised
      v.literal("deploy"),      // Requires approval in supervised
      v.literal("contact_user") // Requires approval in supervised
    ),
  },
  handler: async (ctx, args) => {
    const config = await getConfig(ctx, args.organizationId);

    if (config.autonomyMode === "stopped") {
      return { allowed: false, reason: "stopped" };
    }

    if (config.autonomyMode === "full_auto") {
      return { allowed: true, reason: "full_auto", delay: config.fullAutoDelay };
    }

    // supervised mode
    const readActions = ["read", "plan", "draft"];
    if (readActions.includes(args.actionType)) {
      return { allowed: true, reason: "supervised_safe" };
    }

    // Write actions → create inbox item for approval
    return { allowed: false, reason: "requires_approval" };
  },
});
```

---

## Part 3 — The Main Toggle

### Always Visible, Always Accessible

The autonomy toggle lives in the **global app header**, not buried in settings. It's the most important control in the product.

```
┌──────────────────────────────────────────────────────────────┐
│ [Reflet Logo]  Dashboard  Feedback  Changelog  ...  Autopilot│
│                                                              │
│   ┌─────────────────────────────────────────────┐            │
│   │  🟢 Supervised  │  ⚡ Full Auto  │  ⏸ Stop  │            │
│   └─────────────────────────────────────────────┘            │
│                                                              │
│   12 agents active · 3 tasks running · $0.42 today           │
└──────────────────────────────────────────────────────────────┘
```

**Design details:**
- Three-segment toggle with color coding: green (supervised), orange/electric (full auto), gray (stopped)
- Below toggle: one-line status summary (active agents, running tasks, daily cost)
- Clicking "Stop" shows a confirmation modal: "This will pause all agent activity. Running tasks will complete their current step. Resume anytime."
- Switching to "Full Auto" shows a stronger warning: "Full Auto mode will execute all actions autonomously including sending emails, publishing content, and merging PRs. A 15-minute delay applies to external actions. Are you sure?"
- The toggle is also accessible from the Autopilot dashboard page as a larger, more detailed version
- Keyboard shortcut: `Cmd+Shift+A` cycles modes (supervised → full_auto → stopped → supervised)

### Status Indicator in Navigation

Even outside the Autopilot section, the nav shows a subtle indicator:

- 🟢 Small green dot next to "Autopilot" nav item = supervised, agents working
- ⚡ Small orange pulse next to "Autopilot" = full auto mode active
- ⏸ Gray dot = stopped
- 🔴 Red dot = error state (task failed, cost cap hit, etc.)

---

## Part 4 — Auto-Onboarding Pipeline

### Connect Repo → Boot Company

When a user connects their GitHub repository, Reflet doesn't just "enable autopilot." It boots up a virtual company that immediately starts working. This is the most important first impression.

### Step 1: Repository Analysis (immediate, 30-60 seconds)

The moment the repo URL is submitted:

1. **Clone & analyze** — tech stack detection, framework identification, project structure mapping
2. **Generate AGENTS.md** — coding conventions, file patterns, protected files, testing patterns
3. **Identify existing infrastructure** — does the repo have CI? Tests? Docs? A landing page? Analytics?
4. **Assess product maturity** — new project vs established product, deployment status, user count

Output: `autopilotRepoAnalysis` record with structured findings.

### Step 2: Primary Task Generation (automatic, 1-2 minutes)

Based on the repo analysis, PM automatically creates **primary onboarding tasks**. These are the first things any real CTO would do when joining a company:

**Always created (for every repo):**

| Task | Agent | Priority | Description |
|------|-------|----------|-------------|
| Implement Reflet Feedback Widget | Dev | High | Add the Reflet feedback widget to the product. Users can submit feedback directly from the app. |
| Implement Reflet Changelog | Dev | High | Add the Reflet changelog component. Users see what shipped without leaving the product. |
| Market Analysis | Analytics + Growth | Medium | Analyze the competitive landscape. Who are the competitors? What's the market size? What's the positioning? |
| SEO Analysis | Growth | Medium | Audit the current SEO state. Meta tags, sitemap, robots.txt, page speed, content gaps. |
| Security Baseline Scan | Security | High | Full OWASP scan of the codebase. Dependency audit. Secret detection. Auth coverage check. |
| Architecture Review | Architect | Medium | Code health assessment. File sizes, complexity, test coverage, patterns, tech debt. |
| Documentation Audit | Docs | Medium | What docs exist? What's missing? What's stale? Create a docs roadmap. |

**Conditionally created (based on repo analysis):**

| Condition | Task | Agent |
|-----------|------|-------|
| No landing page detected | Create Landing Page | Dev |
| No CI/CD detected | Set Up CI Pipeline | Dev |
| No tests detected | Create Test Foundation | QA |
| No monitoring detected | Set Up Error Tracking | Ops |
| No analytics detected | Integrate Analytics | Analytics |
| Has feedback but no triage | Triage Existing Feedback | PM |
| Has open issues | Import GitHub Issues as Tasks | PM |
| No README or outdated | Generate README | Docs |

### Step 3: Agent Activation (automatic, immediate)

Each agent runs its initial scan:

- **CEO** creates a welcome message: "I've analyzed your repo. Here's what I found and what we're starting with."
- **PM** creates the task board from onboarding tasks
- **CTO** starts speccing the highest-priority tasks
- **Security** runs the baseline scan
- **Architect** runs the code health review
- **Analytics** connects to PostHog if configured, runs initial data pull
- **Growth** starts market and SEO analysis
- **Support** scans existing feedback for unanswered items
- **Docs** audits existing documentation
- **QA** identifies test coverage gaps
- **Ops** checks deployment health if Vercel is connected

### Step 4: First Inbox Items (within 5-10 minutes)

The user's inbox fills with the first results:

- CEO welcome report with company overview
- Security baseline findings
- Architecture health score
- List of generated onboarding tasks for approval
- Market analysis first pass (if Growth agent has web access)

This is the "wow moment." The user connects a repo and within minutes has a working AI company analyzing their product and generating actionable work.

### Implementation: Onboarding Pipeline

```typescript
// packages/backend/convex/autopilot/onboarding.ts

export const runOnboarding = internalAction({
  args: {
    organizationId: v.id("organizations"),
    repoUrl: v.string(),
  },
  handler: async (ctx, args) => {
    // Step 1: Repo analysis
    const analysis = await ctx.runAction(
      internal.autopilot.onboarding.analyzeRepository,
      { organizationId: args.organizationId, repoUrl: args.repoUrl }
    );

    // Step 2: Generate primary tasks
    await ctx.runMutation(
      internal.autopilot.onboarding.createPrimaryTasks,
      { organizationId: args.organizationId, analysis }
    );

    // Step 3: Trigger initial agent scans (parallel via scheduler)
    await ctx.scheduler.runAfter(0, internal.autopilot.agents.security.runSecurityScan, {
      organizationId: args.organizationId, triggerReason: "onboarding",
    });
    await ctx.scheduler.runAfter(0, internal.autopilot.agents.architect.runArchitectReview, {
      organizationId: args.organizationId, triggerReason: "onboarding",
    });
    await ctx.scheduler.runAfter(0, internal.autopilot.agents.ceo.generateCEOReport, {
      organizationId: args.organizationId, reportType: "onboarding_welcome",
    });
    // ... more agents

    // Step 4: Log onboarding start
    await ctx.runMutation(internal.autopilot.tasks.logActivity, {
      organizationId: args.organizationId,
      agent: "orchestrator",
      level: "success",
      message: "Company booted. 12 agents online. Onboarding tasks created.",
    });
  },
});
```

### New table: `autopilotRepoAnalysis`

```typescript
autopilotRepoAnalysis: defineTable({
  organizationId: v.id("organizations"),
  repoUrl: v.string(),
  techStack: v.string(),           // JSON: { framework, language, runtime, css, testing, ci }
  projectStructure: v.string(),     // JSON: { directories, entryPoints, configFiles }
  hasLandingPage: v.boolean(),
  hasCICD: v.boolean(),
  hasTests: v.boolean(),
  hasMonitoring: v.boolean(),
  hasAnalytics: v.boolean(),
  hasDocs: v.boolean(),
  hasChangelog: v.boolean(),
  hasFeedbackWidget: v.boolean(),
  maturityLevel: v.union(
    v.literal("new"),           // < 10 commits, no deploys
    v.literal("early"),         // Active development, few users
    v.literal("growing"),       // Regular deploys, some users
    v.literal("established")    // Stable, significant user base
  ),
  agentsMdContent: v.optional(v.string()),
  protectedFiles: v.array(v.string()),
  analyzedAt: v.number(),
  createdAt: v.number(),
})
  .index("by_organization", ["organizationId"]),
```

---

## Part 5 — The Sales Agent (V6 New Agent)

### Why Sales

Every other agent serves the existing product and existing users. Sales brings in **new** users. For a SaaS company, growth isn't just about shipping features — it's about finding and converting customers.

The Growth agent creates content (posts, articles, replies). The Sales agent converts interest into revenue.

### What the Sales Agent Does

**Lead Discovery:**
- Monitors GitHub stars, forks, and contributor activity
- Tracks Product Hunt, HN, Reddit mentions of the product (via Intelligence module)
- Identifies potential customers from competitor discussions
- Analyzes website visitors (if analytics connected) for high-intent signals

**Outreach Drafting:**
- Drafts personalized outreach emails based on lead context
- Creates LinkedIn connection request messages
- Writes follow-up sequences (day 1, day 3, day 7)
- All drafts go to inbox for approval (even in Full Auto, outreach has a mandatory review step)

**Pipeline Management:**
- Tracks leads through stages: discovered → contacted → replied → demo → converted → churned
- Creates inbox items for lead status changes
- Summarizes pipeline weekly for CEO report

**Revenue Signals:**
- Correlates outreach with Stripe signups
- Tracks which outreach channels convert best
- Feeds conversion data back to Growth agent for content optimization

### Sales Agent Safety

Sales is the most sensitive agent. Contacting real people has real consequences.

**Mandatory safeguards regardless of autonomy mode:**
- All outreach emails require inbox approval (even in Full Auto)
- Rate limit: max 10 outreach emails per day (configurable)
- Domain blocklist for outreach (personal emails, competitors, etc.)
- Unsubscribe tracking — never contact someone who opted out
- Cool-down period: don't contact the same person more than once per 30 days
- All outreach clearly identifies as coming from the product (no deceptive practices)

### Schema additions

```typescript
// New table: autopilotLeads
autopilotLeads: defineTable({
  organizationId: v.id("organizations"),
  name: v.optional(v.string()),
  email: v.optional(v.string()),
  linkedinUrl: v.optional(v.string()),
  company: v.optional(v.string()),
  source: v.union(
    v.literal("github"),
    v.literal("product_hunt"),
    v.literal("hacker_news"),
    v.literal("reddit"),
    v.literal("linkedin"),
    v.literal("website"),
    v.literal("referral"),
    v.literal("manual")
  ),
  stage: v.union(
    v.literal("discovered"),
    v.literal("contacted"),
    v.literal("replied"),
    v.literal("demo_scheduled"),
    v.literal("converted"),
    v.literal("lost"),
    v.literal("opted_out")
  ),
  notes: v.optional(v.string()),
  lastContactedAt: v.optional(v.number()),
  nextFollowUpAt: v.optional(v.number()),
  discoveredAt: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_organization", ["organizationId"])
  .index("by_org_stage", ["organizationId", "stage"])
  .index("by_org_source", ["organizationId", "source"]),

// Extend assignedAgent
// Add: v.literal("sales")

// Extend taskOrigin
// Add: v.literal("sales_outreach")

// Extend inboxItemType
// Add: v.literal("sales_lead"), v.literal("sales_outreach_draft"), v.literal("sales_pipeline_update")

// Extend activityLogAgent
// Add: v.literal("sales")
```

---

## Part 6 — User-in-the-Loop Experience

### The User Can Do Everything Agents Can Do

This is a core principle. The user is not a spectator — they're the President who can roll up their sleeves and do any employee's job.

**What this means concretely:**

| Agent capability | User equivalent |
|-----------------|-----------------|
| PM creates tasks | User creates tasks manually with full form |
| CTO writes specs | User writes/edits technical specs on any task |
| Dev creates PRs | User triggers a coding run manually ("Build this now") |
| Security scans | User triggers an on-demand security scan |
| Growth creates posts | User drafts content directly in the growth panel |
| Support replies | User writes support replies directly |
| CEO reports | User reads reports, asks CEO questions in chat |
| Analytics insights | User queries PostHog via the analytics panel |
| Docs updates | User triggers a docs check or writes docs manually |
| QA tests | User triggers test generation for a specific feature |
| Ops monitoring | User checks deployment status, triggers rollback |
| Sales outreach | User adds leads, drafts outreach, manages pipeline |

### Agent Panels (The "Desk" Metaphor)

Each agent has its own panel accessible from the team dashboard. The panel is the agent's "desk" — you can see what they're working on, talk to them, and do their job yourself.

**Panel layout:**

```
┌──────────────────────────────────────────────────┐
│ [Agent Avatar] PM Agent                    🟢 Active │
│ Last active: 2 minutes ago                          │
├──────────────────────────────────────────────────┤
│                                                      │
│  [Chat Tab]  [Tasks Tab]  [Activity Tab]  [Config]   │
│                                                      │
│  ┌────────────────────────────────────────────┐      │
│  │ Chat with PM                                │      │
│  │                                              │      │
│  │ 🤖 PM: I've analyzed 12 new feedback items.  │      │
│  │ I've created 3 high-priority tasks and       │      │
│  │ deprioritized 2 existing ones.               │      │
│  │                                              │      │
│  │ 👤 You: Focus on enterprise features only    │      │
│  │ for the next 2 weeks.                        │      │
│  │                                              │      │
│  │ 🤖 PM: Understood. I've re-tagged 4 tasks    │      │
│  │ as enterprise-priority and will filter        │      │
│  │ incoming feedback accordingly.                │      │
│  │                                              │      │
│  │ [Type a message...]              [Send]       │      │
│  └────────────────────────────────────────────┘      │
│                                                      │
│  Current work:                                       │
│  · Analyzing 3 new feedback items                    │
│  · Creating spec request for "API rate limiting"     │
│                                                      │
└──────────────────────────────────────────────────┘
```

**Chat Tab:** Direct conversation with the agent. The agent responds using its specific knowledge and tools. Talking to PM focuses on priorities and feedback. Talking to Security focuses on vulnerabilities. Each agent has its own system prompt and tool access.

**Tasks Tab:** All tasks assigned to this agent. User can reassign, reprioritize, cancel.

**Activity Tab:** Real-time feed of what this agent has done recently.

**Config Tab:** Agent-specific settings (e.g., PM: feedback sources, priorities. Security: scan frequency, OWASP categories. Growth: platforms, tone, target audience).

### Agent Chat Implementation

Each agent gets a conversational thread, similar to the CEO chat:

```typescript
// New table: autopilotAgentThreads
autopilotAgentThreads: defineTable({
  organizationId: v.id("organizations"),
  agent: activityLogAgent, // which agent this thread belongs to
  threadId: v.string(),    // @convex-dev/agent thread ID
  lastMessageAt: v.number(),
  messageCount: v.number(),
  createdAt: v.number(),
})
  .index("by_org_agent", ["organizationId", "agent"]),
```

The chat uses the same `@convex-dev/agent` framework as the CEO chat, but each agent has:
- Its own system prompt (PM talks about priorities, CTO talks about architecture)
- Access to its own tools (PM can create tasks, CTO can write specs)
- Its own memory context (agent-specific knowledge from `autopilotAgentMemory`)

---

## Part 7 — The Team Dashboard

### Company View

The Autopilot dashboard reimagined as a **company dashboard**. Not a list of settings — a live view of your virtual company.

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  🟢 SUPERVISED    ⚡ Full Auto    ⏸ Stop                     │ │
│  │  12 agents · 5 tasks running · $1.23 today · 47 tasks done   │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌── COMPANY HEALTH ──────────────────────────────────────────┐  │
│  │  Revenue: $4,200 MRR (+12%)  │  Users: 342 active (+8%)    │  │
│  │  Uptime: 99.9%               │  Errors: 3 (↓ from 7)       │  │
│  │  Tasks completed: 47 (7d)    │  PRs merged: 12 (7d)         │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌── DEPARTMENTS ─────────────────────────────────────────────┐  │
│  │                                                              │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │  │
│  │  │ PRODUCT │ │ENGINEER │ │ GROWTH  │ │ SUPPORT │           │  │
│  │  │ 🟢 PM    │ │ 🟢 CTO  │ │ 🟢 Growth│ │ 🟢 Support│          │  │
│  │  │ 3 tasks │ │ 🟢 Dev  │ │ 🟡 Sales│ │ 🟢 Docs  │           │  │
│  │  │ pending │ │ 🟢 Sec  │ │ 2 posts │ │ 🟢 Analytics│        │  │
│  │  │         │ │ 5 PRs   │ │ ready   │ │ 1 reply │           │  │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │  │
│  │                                                              │  │
│  │  ┌─────────┐                                                 │  │
│  │  │  OPS    │                                                 │  │
│  │  │ 🟢 Ops  │                                                 │  │
│  │  │ 🟢 QA   │                                                 │  │
│  │  │ 🟢 Arch │                                                 │  │
│  │  │ 99.9% ↑ │                                                 │  │
│  │  └─────────┘                                                 │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌── LIVE FEED ──────────────────────────────────────────────┐   │
│  │  🔵 PM: Created task "Add API rate limiting" (2 min ago)    │   │
│  │  🟢 Dev: PR #47 merged — dark mode (5 min ago)              │   │
│  │  🟡 Security: 1 medium vulnerability found (12 min ago)     │   │
│  │  🔵 Support: Drafted reply to user@example.com (15 min ago) │   │
│  │  🟢 Ops: Deploy #89 healthy, no errors (20 min ago)         │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌── CEO CHAT ──────────────────────────────────────── [↗] ──┐   │
│  │  Latest: "All systems normal. 3 tasks completed today."     │   │
│  │  [Open full chat]                                            │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Department Cards

Each department card is clickable and expands into the team view:

- **Status indicators per agent:** 🟢 active / 🟡 idle / 🔴 error / ⏸ paused
- **Key metric per department:** Product: tasks pending. Engineering: PRs open. Growth: content ready. Support: replies drafted. Ops: uptime %.
- **Click → department detail page** with all agents in that department, their panels, and department-level metrics

### Agent Performance Metrics

Each agent tracks effectiveness over time:

```typescript
// New table: autopilotAgentMetrics
autopilotAgentMetrics: defineTable({
  organizationId: v.id("organizations"),
  agent: activityLogAgent,
  period: v.string(),           // "2026-04-03" for daily, "2026-W14" for weekly
  tasksCompleted: v.number(),
  tasksFailed: v.number(),
  avgCompletionTimeMs: v.optional(v.number()),
  tokensUsed: v.number(),
  estimatedCostUsd: v.number(),
  inboxItemsCreated: v.number(),
  inboxItemsApproved: v.number(),
  inboxItemsRejected: v.number(),
  approvalRate: v.optional(v.number()),
  createdAt: v.number(),
})
  .index("by_org_agent", ["organizationId", "agent"])
  .index("by_org_period", ["organizationId", "period"]),
```

The metrics feed the dashboard and help the CEO agent make smarter decisions ("Security has a 95% approval rate on fix PRs — consider auto-approving low-risk fixes").

---

## Part 8 — Coding Agent Integration (Latest Tech)

### The Adapter Evolution

V5 has four adapters: builtin, copilot, codex, claude_code. V6 upgrades them and adds new ones.

### Updated Adapter: Open SWE (LangChain)

Open SWE is the open-source async coding agent from LangChain (launched March 2026). It captures patterns from Stripe, Ramp, Coinbase engineering teams.

**Why it matters for Reflet:** Open SWE is designed for GitHub-integrated async work — exactly what Reflet's Dev agent does. It runs independently on complex tasks, creates PRs, and reports results.

**Integration approach:**
- New adapter type: `open_swe`
- Triggers via GitHub Actions (similar to claude_code adapter)
- Uses `@langchain/open-swe` package
- Gets the CTO's technical spec as input
- Reports back via webhook when PR is created

### Updated Adapter: OpenClaw

OpenClaw (247K+ GitHub stars, viral in early 2026) is an open-source personal AI agent with 50+ integrations. Its GitHub integration makes it viable as a coding backend.

**Integration approach:**
- New adapter type: `openclaw`
- Runs as a self-hosted agent (user provides their OpenClaw instance URL)
- Receives task specs via OpenClaw's API
- Reports results via webhook
- Free (user pays only for the underlying LLM)

### Updated Adapter: Claude Agent SDK Teams

Anthropic's Claude Agent SDK now supports Agent Teams — multiple Claude Code sessions orchestrated by a team lead. This maps directly to Reflet's CTO → Dev flow.

**Integration approach:**
- Upgrade `claude_code` adapter to use Agent Teams
- CTO spec becomes the team lead's instruction
- Multiple sub-agents work on different files in parallel
- Results consolidated into a single PR
- Uses MCP for tool access (file I/O, shell, web search)

### Updated Adapter: Codex CLI with Subagents

OpenAI's Codex CLI now supports subagents for parallel task execution and can be exposed as an MCP server.

**Integration approach:**
- Upgrade `codex` adapter to use subagents
- Complex tasks split into parallel sub-tasks automatically
- Built-in code review by separate Codex agent before commit
- Uses o3/o4-mini models

### Adapter Selection Matrix

```typescript
// Extended adapter types
export const codingAdapterType = v.union(
  v.literal("builtin"),       // AI SDK + GitHub API (cheapest, simplest)
  v.literal("copilot"),       // GitHub Copilot Coding Agent
  v.literal("codex"),         // OpenAI Codex CLI + subagents
  v.literal("claude_code"),   // Claude Agent SDK Teams
  v.literal("open_swe"),      // LangChain Open SWE
  v.literal("openclaw")       // OpenClaw self-hosted
);
```

| Adapter | Cost | Complexity | Speed | Best For |
|---------|------|------------|-------|----------|
| builtin | Free (OpenRouter free models) | Low | Slow | Simple changes, prototyping |
| copilot | $10/mo (GitHub plan) | Low | Medium | GitHub-native teams |
| codex | ChatGPT Plus ($20/mo) | Medium | Fast | Complex multi-file tasks |
| claude_code | Anthropic API credits | Medium | Fast | Large refactors, team tasks |
| open_swe | LLM provider costs | High | Medium | Enterprise-grade async work |
| openclaw | Self-hosted + LLM costs | High | Variable | Full control, custom tooling |

---

## Part 9 — The Never-Stops Architecture

### Cron-Based Resilience

Reflet's agents never "run." They're **triggered**. Every agent action is initiated by a Convex cron job or a Convex scheduled function. This means:

1. **No long-running processes to crash.** Each action is a stateless function invocation.
2. **No state to lose.** Everything is in the database. If a function fails mid-execution, the next cron run picks up the incomplete task.
3. **No coordination overhead.** The orchestrator is a pure state machine — it reads the task table and dispatches.
4. **Infinite horizontal scale.** Convex handles concurrency. More orgs just means more function invocations.

### The Cron Schedule (V6 Complete)

```
Every 1 minute:
  - Status health checks (existing)

Every 2 minutes:
  - Autopilot orchestrator (dispatch pending tasks)

Every 5 minutes:
  - Check scheduled changelog releases (existing)
  - Check pending domain verification (existing)
  - Support triage (scan new conversations)
  - Sales follow-up check (new)

Every 1 hour:
  - Ops deployment monitoring

Every 6 hours:
  - PM analysis (feedback → tasks)

Daily:
  - 00:00 UTC: Cost counter reset
  - 01:00 UTC: Inbox expiration
  - 02:30 UTC: Email event cleanup (existing)
  - 03:00 UTC: Deleted feedback cleanup (existing)
  - 03:30 UTC: Old status checks cleanup (existing)
  - 04:00 UTC: Stale feedback archival (existing)
  - 05:00 UTC: Stale survey response cleanup (existing)
  - 06:00 UTC: Intelligence scans
  - 07:00 UTC: Security scans
  - 07:30 UTC: Analytics snapshot
  - 08:00 UTC: CEO daily report
  - 23:00 UTC: Ops daily snapshot

Weekly (Monday):
  - 08:00 UTC: Analytics brief
  - 09:00 UTC: Team digest (existing)
  - 09:30 UTC: CEO weekly report
  - 10:00 UTC: Intelligence digest

Weekly (Wednesday):
  - 06:00 UTC: Docs stale check
  - 08:00 UTC: Architect review
```

### Async-Safe Pause Implementation

Every cron handler and scheduled function follows this pattern:

```typescript
export const someAgentAction = internalAction({
  handler: async (ctx, args) => {
    // FIRST LINE: Check if stopped
    const config = await ctx.runQuery(internal.autopilot.config.getConfig, {
      organizationId: args.organizationId,
    });

    if (!config || config.autonomyMode === "stopped") {
      return; // Silent return. Cron fires again later. No data lost.
    }

    // ... do work ...

    // BEFORE ANY WRITE ACTION: Check again (mode may have changed mid-execution)
    const freshConfig = await ctx.runQuery(internal.autopilot.config.getConfig, {
      organizationId: args.organizationId,
    });

    if (freshConfig.autonomyMode === "stopped") {
      // Save progress, mark task as paused, return
      await ctx.runMutation(internal.autopilot.tasks.updateTaskStatus, {
        taskId: args.taskId,
        status: "paused",
      });
      return;
    }

    // ... proceed with write action ...
  },
});
```

### Task Status: New "paused" State

```typescript
export const autopilotTaskStatus = v.union(
  v.literal("pending"),
  v.literal("in_progress"),
  v.literal("paused"),         // NEW: stopped while in progress
  v.literal("blocked"),
  v.literal("waiting_review"),
  v.literal("completed"),
  v.literal("failed"),
  v.literal("cancelled")
);
```

When resuming from `stopped`:
1. Query all tasks with status `paused`
2. Set them back to `in_progress`
3. Orchestrator picks them up on next cron cycle

---

## Part 10 — Premium Tiers & Free Tier Safety

### Free Tier: The Preview

The free tier gives enough to understand what Reflet Autopilot can do, without risk.

**What's included:**
- 3 agents active: CEO, PM, Security (the essentials)
- 2 tasks per day
- Supervised mode only (no Full Auto)
- Repo analysis + onboarding tasks generated (but limited execution)
- CEO chat (10 messages/day)
- Inbox (read-only view of what agents would do)
- No email sending
- No coding adapter (no PR creation) — shows "what would be built" without building
- Dashboard with company health metrics

**The "preview" trick:** Even on free, agents analyze and plan. The inbox fills with draft tasks, security findings, architecture suggestions. The user sees the value — they just can't execute. This is the conversion driver.

### Pro Tier

**What's added:**
- All 13 agents active
- 10 tasks per day
- Supervised + Full Auto modes
- Built-in coding adapter (free models)
- CEO chat unlimited
- Email sending (10/day)
- All inbox actions (approve, reject, edit)
- Basic analytics dashboard

### Business Tier

**What's added:**
- 100 tasks per day
- All coding adapters (copilot, codex, claude_code, open_swe, openclaw)
- 50 emails/day
- Sales agent with pipeline management
- Advanced analytics (PostHog deep integration)
- Custom agent configurations
- Priority support
- Team collaboration (multiple users per org)

### Enterprise Tier

**What's added:**
- Unlimited tasks
- Custom daily limits
- Dedicated support
- Custom agent development
- Self-hosted option
- SSO / SAML
- Audit logs
- SLA guarantees

### Implementation: Plan Limits

```typescript
// packages/backend/convex/autopilot/plans.ts

export const PLAN_LIMITS = {
  free: {
    maxTasksPerDay: 2,
    maxAgents: 3,
    allowedAgents: ["ceo", "pm", "security"],
    autonomyModes: ["supervised"],
    codingAdapters: [],
    maxEmailsPerDay: 0,
    maxCeoChatMessagesPerDay: 10,
    salesEnabled: false,
    fullAutoEnabled: false,
  },
  pro: {
    maxTasksPerDay: 10,
    maxAgents: 13,
    allowedAgents: "all",
    autonomyModes: ["supervised", "full_auto"],
    codingAdapters: ["builtin"],
    maxEmailsPerDay: 10,
    maxCeoChatMessagesPerDay: -1, // unlimited
    salesEnabled: false,
    fullAutoEnabled: true,
  },
  business: {
    maxTasksPerDay: 100,
    maxAgents: 13,
    allowedAgents: "all",
    autonomyModes: ["supervised", "full_auto"],
    codingAdapters: ["builtin", "copilot", "codex", "claude_code", "open_swe", "openclaw"],
    maxEmailsPerDay: 50,
    maxCeoChatMessagesPerDay: -1,
    salesEnabled: true,
    fullAutoEnabled: true,
  },
  enterprise: {
    maxTasksPerDay: -1, // unlimited
    maxAgents: 13,
    allowedAgents: "all",
    autonomyModes: ["supervised", "full_auto"],
    codingAdapters: "all",
    maxEmailsPerDay: -1,
    maxCeoChatMessagesPerDay: -1,
    salesEnabled: true,
    fullAutoEnabled: true,
  },
} as const;
```

---

## Part 11 — Scalable Architecture for Any Business

### Beyond SaaS

Reflet V6 works for any SaaS with a GitHub repo. But the architecture can extend further.

**SaaS Company (primary market):**
All 13 agents active. Full pipeline: feedback → task → code → deploy → announce → support.

**Website + Sales (secondary market):**
A business with just a website (no active development) can still use:
- Sales agent for lead generation and outreach
- Growth agent for content creation and SEO
- Analytics agent for traffic and conversion tracking
- Support agent for customer communication
- CEO for strategic oversight

No Dev, CTO, Security, Architect, QA, Ops needed. These agents simply stay inactive.

**API-First Product:**
Heavy use of Docs (API documentation), Security (API auth, rate limiting), QA (API testing), Ops (uptime monitoring). Less Growth/Sales.

**Open Source Project:**
Heavy use of Growth (community engagement), Support (issue triage), Docs, QA. Less Sales.

### Multi-Repo Support (Future)

Some companies have multiple repos (monorepo, microservices). V6 architecture supports this:

```typescript
// Future: autopilotRepoAnalysis supports multiple repos per org
autopilotRepoAnalysis: defineTable({
  organizationId: v.id("organizations"),
  repoUrl: v.string(),    // Multiple rows per org
  isPrimary: v.boolean(),
  // ... rest of fields
})
  .index("by_organization", ["organizationId"])
  .index("by_org_repo", ["organizationId", "repoUrl"]),
```

### Webhook-Driven Architecture

V6 moves beyond cron-only to a hybrid cron + webhook model:

**Cron-driven (scheduled work):**
- PM analysis, security scans, analytics snapshots, ops monitoring
- These happen on a schedule regardless of external events

**Webhook-driven (event work):**
- GitHub PR merged → trigger QA regression check + Docs update check + Ops deploy monitor
- GitHub issue created → PM ingests as feedback/task
- Stripe event → Revenue snapshot + CEO alert
- Inbound email → Support triage
- PostHog alert → Analytics anomaly detection

```typescript
// packages/backend/convex/autopilot/webhooks.ts

export const handleGitHubWebhook = httpAction(async (ctx, request) => {
  const event = request.headers.get("x-github-event");
  const payload = await request.json();

  switch (event) {
    case "pull_request":
      if (payload.action === "closed" && payload.pull_request.merged) {
        // PR merged → trigger post-merge pipeline
        await ctx.runAction(internal.autopilot.webhooks.onPRMerged, {
          repoUrl: payload.repository.html_url,
          prNumber: payload.pull_request.number,
          prTitle: payload.pull_request.title,
          branch: payload.pull_request.head.ref,
          diffUrl: payload.pull_request.diff_url,
        });
      }
      break;

    case "issues":
      if (payload.action === "opened") {
        await ctx.runAction(internal.autopilot.webhooks.onIssueOpened, {
          repoUrl: payload.repository.html_url,
          issueNumber: payload.issue.number,
          title: payload.issue.title,
          body: payload.issue.body,
          labels: payload.issue.labels.map(l => l.name),
        });
      }
      break;
  }

  return new Response("OK", { status: 200 });
});
```

---

## Part 12 — Build Plan

### Phase Overview

```
Phase 7A: Autonomy Engine (core mode system)           — 3-4 days
Phase 7B: Main Toggle + Global Header                  — 2 days
Phase 7C: Auto-Onboarding Pipeline                     — 3-4 days
Phase 7D: Sales Agent                                  — 3-4 days
Phase 7E: Agent Panels + Direct Chat                   — 4-5 days
Phase 7F: Team Dashboard Redesign                      — 3-4 days
Phase 7G: Coding Adapter Upgrades                      — 3-4 days
Phase 7H: Webhook Pipeline                             — 2-3 days
Phase 7I: Plan Limits + Free Tier                      — 2 days
Phase 7J: Agent Performance Metrics                    — 2 days
Phase 7K: V4 Bug Fixes (if not done)                   — 1-2 days
Phase 7L: Polish + E2E Testing                         — 3-4 days

Total estimated: 5-7 weeks
```

### Phase 7A: Autonomy Engine

The foundation everything else depends on.

| # | Task | File | Effort |
|---|------|------|--------|
| 7A.1 | Create `autonomy.ts` with `shouldExecuteAction` query | autopilot/autonomy.ts | Medium |
| 7A.2 | Add `autonomyMode`, `stoppedAt`, `fullAutoDelay`, `autoMergeThreshold` to autopilotConfig | tableFields.ts | Small |
| 7A.3 | Add `paused` to autopilotTaskStatus | tableFields.ts | Trivial |
| 7A.4 | Create `setAutonomyMode` mutation with pause/resume logic | autopilot/config.ts | Medium |
| 7A.5 | Update every agent action to check autonomy before write actions | agents/*.ts | Medium |
| 7A.6 | Update orchestrator to respect `stopped` mode | crons.ts | Small |
| 7A.7 | Create Full Auto auto-approval engine (delayed execution for external actions) | autopilot/full_auto.ts | Large |
| 7A.8 | Create resume logic (unpause tasks, restart orchestrator) | autopilot/config.ts | Small |

### Phase 7B: Main Toggle + Global Header

| # | Task | File | Effort |
|---|------|------|--------|
| 7B.1 | Create `AutopilotModeToggle` component (3-segment toggle) | components/autopilot-mode-toggle.tsx | Medium |
| 7B.2 | Add status bar below toggle (agents, tasks, cost) | components/autopilot-status-bar.tsx | Small |
| 7B.3 | Integrate into app layout header (always visible) | app/layout.tsx | Small |
| 7B.4 | Create confirmation modals for mode switches | components/autopilot-mode-toggle.tsx | Small |
| 7B.5 | Add nav indicator (dot next to "Autopilot") | components/autopilot-nav.tsx | Trivial |
| 7B.6 | Add `Cmd+Shift+A` keyboard shortcut | hooks/use-autopilot-shortcut.ts | Small |

### Phase 7C: Auto-Onboarding Pipeline

| # | Task | File | Effort |
|---|------|------|--------|
| 7C.1 | Create `autopilotRepoAnalysis` table | tableFields.ts | Small |
| 7C.2 | Build `analyzeRepository` action (clone + analyze) | onboarding.ts | Large |
| 7C.3 | Build `createPrimaryTasks` mutation (conditional task generation) | onboarding.ts | Medium |
| 7C.4 | Build `runOnboarding` orchestrator action | onboarding.ts | Medium |
| 7C.5 | Wire onboarding trigger to repo connection flow | mutations.ts | Small |
| 7C.6 | Create onboarding progress UI (stepper showing analysis → tasks → agents) | components/onboarding-progress.tsx | Medium |
| 7C.7 | Generate AGENTS.md from repo analysis | onboarding.ts | Medium |

### Phase 7D: Sales Agent

| # | Task | File | Effort |
|---|------|------|--------|
| 7D.1 | Create `autopilotLeads` table | tableFields.ts | Small |
| 7D.2 | Extend validators (assignedAgent, taskOrigin, inboxItemType) | tableFields.ts | Trivial |
| 7D.3 | Build Sales Agent core (lead discovery + outreach drafting) | agents/sales.ts | Large |
| 7D.4 | Build pipeline management (stage tracking, follow-ups) | agents/sales.ts | Medium |
| 7D.5 | Build outreach safety system (rate limits, blocklist, opt-out tracking) | agents/sales.ts | Medium |
| 7D.6 | Add sales cron (follow-up check every 5 min) | crons.ts | Small |
| 7D.7 | Update orchestrator for sales agent dispatch | crons.ts | Small |
| 7D.8 | Frontend: Sales dashboard page (pipeline view, lead cards) | app/.../autopilot/sales/page.tsx | Medium |
| 7D.9 | Frontend: Lead detail page | app/.../autopilot/sales/[leadId]/page.tsx | Small |

### Phase 7E: Agent Panels + Direct Chat

| # | Task | File | Effort |
|---|------|------|--------|
| 7E.1 | Create `autopilotAgentThreads` table | tableFields.ts | Small |
| 7E.2 | Build agent chat backend (per-agent thread management) | autopilot/agent_chat.ts | Large |
| 7E.3 | Build agent system prompts (one per agent type) | agents/prompts.ts | Medium |
| 7E.4 | Create `AgentPanel` component (chat + tasks + activity + config tabs) | components/agent-panel.tsx | Large |
| 7E.5 | Create `AgentChat` component (reuse CEO chat patterns) | components/agent-chat.tsx | Medium |
| 7E.6 | Wire each agent card to open its panel | app/.../autopilot/agents/page.tsx | Small |
| 7E.7 | Add "Do it yourself" actions in each panel (manual triggers for agent capabilities) | components/agent-panel.tsx | Medium |

### Phase 7F: Team Dashboard Redesign

| # | Task | File | Effort |
|---|------|------|--------|
| 7F.1 | Redesign dashboard with company health section | app/.../autopilot/page.tsx | Medium |
| 7F.2 | Create department cards (grouped agents with status + key metric) | components/department-card.tsx | Medium |
| 7F.3 | Create department detail pages | app/.../autopilot/departments/[dept]/page.tsx | Medium |
| 7F.4 | Upgrade live activity feed (richer cards, agent avatars, clickable items) | components/activity-feed.tsx | Medium |
| 7F.5 | Add company health widgets (revenue, users, uptime, tasks, PRs) | components/company-health.tsx | Medium |
| 7F.6 | Integrate CEO chat preview in dashboard | app/.../autopilot/page.tsx | Small |

### Phase 7G: Coding Adapter Upgrades

| # | Task | File | Effort |
|---|------|------|--------|
| 7G.1 | Create `open_swe` adapter | adapters/open_swe.ts | Large |
| 7G.2 | Create `openclaw` adapter | adapters/openclaw.ts | Medium |
| 7G.3 | Upgrade `claude_code` adapter for Agent Teams | adapters/claude_code.ts | Medium |
| 7G.4 | Upgrade `codex` adapter for subagents | adapters/codex.ts | Medium |
| 7G.5 | Update adapter selection UI | app/.../autopilot/settings/page.tsx | Small |
| 7G.6 | Add adapter type to schema | tableFields.ts | Trivial |

### Phase 7H: Webhook Pipeline

| # | Task | File | Effort |
|---|------|------|--------|
| 7H.1 | Create webhook router (`handleGitHubWebhook` httpAction) | autopilot/webhooks.ts | Medium |
| 7H.2 | PR merged handler → trigger QA + Docs + Ops | autopilot/webhooks.ts | Medium |
| 7H.3 | Issue opened handler → PM ingestion | autopilot/webhooks.ts | Small |
| 7H.4 | Stripe webhook handler → Revenue snapshot + CEO alert | autopilot/webhooks.ts | Small |
| 7H.5 | Webhook registration UI (show webhook URL, test button) | app/.../autopilot/settings/page.tsx | Small |

### Phase 7I: Plan Limits + Free Tier

| # | Task | File | Effort |
|---|------|------|--------|
| 7I.1 | Create `plans.ts` with PLAN_LIMITS constant | autopilot/plans.ts | Small |
| 7I.2 | Create `checkPlanLimit` query (used before every action) | autopilot/plans.ts | Medium |
| 7I.3 | Wire plan limits into orchestrator + all agent actions | autopilot/*.ts | Medium |
| 7I.4 | Free tier: show "preview" inbox items (what agents would do) | components/inbox-item-card.tsx | Medium |
| 7I.5 | Upgrade prompts in billing settings | app/.../settings/billing/page.tsx | Small |

### Phase 7J: Agent Performance Metrics

| # | Task | File | Effort |
|---|------|------|--------|
| 7J.1 | Create `autopilotAgentMetrics` table | tableFields.ts | Small |
| 7J.2 | Build daily metric aggregation cron | autopilot/metrics.ts | Medium |
| 7J.3 | Build metrics queries (per agent, per period, trends) | autopilot/metrics.ts | Small |
| 7J.4 | Frontend: agent performance cards in dashboard | components/agent-metrics.tsx | Medium |
| 7J.5 | Feed metrics into CEO agent context (smarter decisions) | agents/ceo.ts | Small |

### Phase 7K: V4 Bug Fixes

If not already done from V5 build:

| # | Fix | File |
|---|-----|------|
| 7K.1 | Fix infinite retry loop | execution.ts, tasks.ts |
| 7K.2 | Fix growth agent API call | agents/growth.ts |
| 7K.3 | Standardize model names | agents/models.ts |
| 7K.4 | Delete duplicate email send stub | email.ts |
| 7K.5 | Load AGENTS.md in execution layer | execution.ts |
| 7K.6 | Wire isEmailBlocked | email_sending.ts |
| 7K.7 | Pass CC to Resend | email_sending.ts |
| 7K.8 | Revenue snapshot deduplication | revenue.ts |

### Phase 7L: Polish + E2E Testing

| # | Task | Effort |
|---|------|--------|
| 7L.1 | End-to-end test: onboarding flow (connect repo → tasks generated → inbox fills) | Large |
| 7L.2 | End-to-end test: full task lifecycle (PM → CTO → Dev → QA → Ops → Growth → Support) | Large |
| 7L.3 | End-to-end test: autonomy mode switching (supervised ↔ full_auto ↔ stopped) | Medium |
| 7L.4 | End-to-end test: plan limit enforcement (free → pro upgrade → access unlocked) | Medium |
| 7L.5 | Performance test: 100 concurrent orgs with active autopilot | Medium |
| 7L.6 | UI polish: loading states, empty states, error states for all autopilot pages | Medium |
| 7L.7 | Accessibility audit: all autopilot components meet WCAG AA | Medium |

---

## Part 13 — Parallel Execution Map

```
Phase 7A (Autonomy Engine) ────────────────────────────────────
         │
         ├── Phase 7B (Main Toggle)  ─────────────────┐
         │                                             │
         ├── Phase 7C (Onboarding)   ─────────────────┤
         │                                             │
         ├── Phase 7D (Sales Agent)  ─────────────────┤
         │                                             │
         ├── Phase 7E (Agent Panels) ─────────────────┤
         │                                             │
         ├── Phase 7G (Adapter Upgrades) ─────────────┤
         │                                             │
         └── Phase 7H (Webhooks)     ─────────────────┤
                                                       │
                                            Phase 7F (Dashboard Redesign)
                                            Phase 7I (Plan Limits)
                                            Phase 7J (Agent Metrics)
                                                       │
                                            Phase 7K (Bug Fixes — anytime)
                                                       │
                                            Phase 7L (Polish + E2E)
```

**Critical path:** 7A → 7B + 7C + 7D + 7E (parallel) → 7F + 7I + 7J (parallel) → 7L

---

## Part 14 — New Files Summary

### Backend (packages/backend/convex/autopilot/)

```
autopilot/
├── autonomy.ts           # Autonomy engine (shouldExecuteAction, mode checks)
├── full_auto.ts          # Full auto delayed execution engine
├── onboarding.ts         # Repo analysis + primary task generation
├── agent_chat.ts         # Per-agent chat thread management
├── webhooks.ts           # GitHub/Stripe webhook handlers
├── plans.ts              # Plan limits + enforcement
├── metrics.ts            # Agent performance metric aggregation
├── agents/
│   ├── sales.ts          # Sales Agent
│   └── prompts.ts        # System prompts for each agent (chat mode)
└── adapters/
    ├── open_swe.ts       # Open SWE adapter
    └── openclaw.ts       # OpenClaw adapter
```

### Frontend (apps/web/)

```
src/features/autopilot/components/
├── autopilot-mode-toggle.tsx    # 3-segment mode toggle
├── autopilot-status-bar.tsx     # Status summary bar
├── agent-panel.tsx              # Universal agent panel (chat + tasks + activity)
├── agent-chat.tsx               # Agent direct chat component
├── department-card.tsx          # Department grouping card
├── company-health.tsx           # Company health widgets
├── agent-metrics.tsx            # Agent performance cards
├── onboarding-progress.tsx      # Onboarding stepper UI
└── hooks/
    └── use-autopilot-shortcut.ts # Cmd+Shift+A keyboard shortcut

app/(app)/dashboard/[orgSlug]/autopilot/
├── sales/
│   ├── page.tsx                 # Sales pipeline dashboard
│   └── [leadId]/page.tsx        # Lead detail page
└── departments/
    └── [dept]/page.tsx          # Department detail page
```

### Schema Changes Summary

```typescript
// New tables:
autopilotRepoAnalysis       // Repo analysis results per org
autopilotLeads              // Sales pipeline leads
autopilotAgentThreads       // Per-agent chat threads
autopilotAgentMetrics       // Daily/weekly agent performance

// Modified tables:
autopilotConfig             // + autonomyMode, stoppedAt, fullAutoDelay, autoMergeThreshold

// Modified validators:
autopilotTaskStatus         // + "paused"
codingAdapterType           // + "open_swe", "openclaw"
assignedAgent               // + "sales"
activityLogAgent            // + "sales"
taskOrigin                  // + "sales_outreach"
inboxItemType               // + "sales_lead", "sales_outreach_draft", "sales_pipeline_update"
```

---

## Part 15 — The Vision

After V6, Reflet is no longer a feedback tool with AI features. It's a **virtual company** that runs your product.

Connect a repo. Get 13 specialized employees. A CEO who reports to you. A PM who never sleeps. Engineers who ship features while you're at dinner. A security team that scans every night. A growth team that turns every shipped feature into distribution. A support team that closes the loop with every user. A sales team that finds new customers. An ops team that keeps the lights on.

You're the President. You set the direction. The company executes.

Toggle to supervised when you want control. Toggle to full auto when you trust the team. Toggle to stop when you need a break.

Every SaaS with a GitHub repo is a potential customer. Every founder drowning in execution work is a potential convert. The market is every software company in the world.

NanoCorp builds AI companies from scratch. **Reflet runs yours.**
