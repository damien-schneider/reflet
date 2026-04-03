# Reflet Autopilot V7 — Final Build

> **Context:** V6 designed the architecture. V7 is the final implementation pass — fixing every gap between the current codebase and the vision. After V7, Reflet ships as the first fully autonomous company handler.
>
> This document covers: agent restructuring (Growth + Intelligence merge), missing frontend interfaces, proactivity injection across all agents, safety architecture, CEO upgrade, prompt engineering, feedback loops, and the complete task list.

---

## 1. Growth + Intelligence Merge → Growth & Intelligence Agent

### Why Merge

Growth and Intelligence do overlapping work with different outputs:

| | Intelligence | Growth |
|---|---|---|
| **Input** | Keywords, competitor URLs | Completed tasks, repo analysis |
| **Process** | Online search → structured signals | Online search → content generation |
| **Output** | Internal insights (pain points, trends) | External content (posts, replies) |

Both search the same platforms (Reddit, HN, LinkedIn). Both use online-capable models. Both surface market signals. The difference is only what happens with the signal: Intelligence stores it as an insight. Growth turns it into content.

**Merged agent:** **Growth & Intelligence** (internally `growth`)

**The merged flow:**

```
DISCOVERY (shared)
├── Community search (Reddit, HN, LinkedIn, Twitter, forums)
├── Competitor monitoring (pricing, features, changelog)
├── Keyword trend tracking
└── Market signal extraction
          │
          ├──→ INTELLIGENCE OUTPUT
          │    ├── Structured signals (pain_point, trend, gap, competitor_update)
          │    ├── Weekly intelligence brief → CEO inbox
          │    └── PM task suggestions (feature gaps, market opportunities)
          │
          └──→ GROWTH OUTPUT
               ├── Content drafts (reddit replies, LinkedIn posts, tweets, blog, changelog)
               ├── Thread discovery for shipped features
               └── SEO analysis and content gaps
```

### What Changes

**Backend:**
- Merge `intelligence_agent.ts` logic into `agents/growth.ts`
- Growth agent gets two modes: `discover` (intelligence) and `generate` (content)
- Single cron triggers both: discovery first, then content generation from discoveries + completed tasks
- Intelligence signals table stays (it's the discovery output)
- Growth items table stays (it's the content output)

**Frontend:**
- Merge `/intelligence` and `/growth` into a single `/growth` page with tabs:
  - **Content** — generated posts/replies ready for review (current growth page)
  - **Insights** — market signals, trends, pain points (current intelligence insights tab)
  - **Community** — Reddit/HN thread monitoring (current intelligence community tab)
  - **Competitors** — competitor tracking (current intelligence competitors tab)
  - **SEO** — new tab for SEO analysis results
  - **Settings** — keywords, competitors, platforms, tone (merged settings)
- Nav: Remove "Intelligence" item, rename "Growth" to "Growth & Intel"

**Schema:**
- Add `growthEnabled` absorbs `intelligenceEnabled` (single toggle)
- Intelligence cron entries fold into growth cron schedule

---

## 2. Agent Interface Audit — Who Needs a Page

### Current State

Only 2 of 13 agents have dedicated feature pages (Growth, Intelligence). The rest surface work through the shared Tasks, Inbox, and Activity Feed. This is fine for some agents but creates blind spots for others.

### Decision: Which Agents Need Dedicated Pages

| Agent | Needs Page? | Reason |
|---|---|---|
| **CEO** | Yes — Chat panel | Primary user interface, already half-built (ceo-chat components exist) |
| **PM** | No | Tasks page IS the PM page. PM's output = tasks. |
| **CTO** | No | CTO specs live inside task detail pages. No separate output. |
| **Dev** | No | Dev output = PRs. Visible in tasks + GitHub. |
| **Security** | Yes — Security dashboard | Security findings need a dedicated view (vulnerability list, severity breakdown, scan history, dependency audit). Too specialized for generic inbox. |
| **Architect** | No | Code health score visible in dashboard widget. Reviews in inbox. |
| **Growth & Intel** | Yes — Already exists | Merged page with content + insights + community + competitors + SEO tabs |
| **Support** | Yes — Support panel | Support conversations, drafted replies, escalation queue, shipped notifications. The existing support system (`supportConversations`) needs an autopilot overlay. |
| **Analytics** | Yes — Analytics dashboard | Metrics, trends, anomalies, feature adoption, funnel analysis. Too data-rich for inbox items alone. |
| **Docs** | No | Doc updates visible in tasks + inbox. Low output volume. |
| **QA** | No | Test results in tasks + inbox. Can link to CI for details. |
| **Ops** | Yes — Ops dashboard | Deploy status, error rates, uptime, incident history. Real-time monitoring needs a dedicated view. |
| **Sales** | Yes — Sales pipeline | Lead pipeline, outreach queue, conversion tracking. CRM-lite view. |

### New Pages to Build

```
/autopilot/
├── page.tsx                    # Dashboard (exists)
├── inbox/page.tsx              # Inbox (exists)
├── tasks/page.tsx              # Tasks (exists) — PM's interface
├── tasks/[taskId]/page.tsx     # Task detail (exists) — CTO specs live here
├── agents/page.tsx             # Agent config (exists)
├── growth/page.tsx             # Growth & Intel (merge existing two pages)
├── email/page.tsx              # Email (exists)
├── email/[emailId]/page.tsx    # Email detail (exists)
├── costs/page.tsx              # Costs (exists)
├── settings/page.tsx           # Settings (exists)
├── security/page.tsx           # NEW: Security dashboard
├── support/page.tsx            # NEW: Support panel
├── analytics/page.tsx          # NEW: Analytics dashboard
├── ops/page.tsx                # NEW: Ops dashboard
├── sales/page.tsx              # NEW: Sales pipeline
└── sales/[leadId]/page.tsx     # NEW: Lead detail
```

**Nav update (12 items):**
```
Dashboard | Inbox | Tasks | Agents | Growth & Intel | Security |
Support | Analytics | Ops | Sales | Email | Costs | Settings
```

### Page Specifications

**Security Dashboard (`/security`):**
- Scan history timeline (date, findings count, severity breakdown)
- Active vulnerabilities list (severity, type, file, status: open/fixing/fixed)
- Dependency audit results (outdated packages, known CVEs)
- OWASP coverage radar chart
- "Run Scan Now" button (manual trigger)

**Support Panel (`/support`):**
- Conversation queue (new conversations awaiting triage)
- Drafted replies (with approve/edit/reject)
- Escalation log (bugs/requests sent to PM)
- Shipped notifications log (features shipped → users notified)
- Response quality score (approval rate of drafted replies)

**Analytics Dashboard (`/analytics`):**
- Key metrics cards (active users, new users, retention, error rate)
- Trend charts (7d/30d/90d selectors)
- Feature adoption table (feature name, usage %, trend)
- Funnel visualization (configurable steps)
- Anomaly alert history
- "Pull Latest Data" button (manual trigger)

**Ops Dashboard (`/ops`):**
- Current status: green/yellow/red with uptime %
- Recent deployments list (status, time, build duration, error delta)
- Error rate chart (with deploy markers)
- Incident history (date, severity, resolution, time-to-fix)
- "Check Deployments Now" button (manual trigger)

**Sales Pipeline (`/sales`):**
- Kanban-style pipeline (discovered → contacted → replied → demo → converted)
- Lead cards (name, company, source, last contact, next follow-up)
- Outreach queue (drafts pending approval)
- Conversion metrics (source breakdown, stage conversion rates)
- Lead detail page with conversation history

---

## 3. Proactivity Engine — Making Agents Take Initiative

### The Problem

The audit found that **100% of agents are passive** — they only work when triggered by crons or events. A real employee doesn't wait for a meeting to tell you something is broken. They walk to your desk.

### The Solution: Proactive Discovery Layer

Every agent gets a `discoverWork` function that runs alongside its normal cron. Instead of just processing assigned tasks, agents actively look for opportunities.

**Architecture:**

```typescript
// packages/backend/convex/autopilot/proactive.ts

/**
 * Proactive Discovery Pattern
 * Every agent implements discoverWork() which:
 * 1. Scans its domain for unaddressed issues
 * 2. Creates tasks or inbox items for things it finds
 * 3. Alerts CEO when cross-cutting issues emerge
 * 4. Chains to other agents when their domain is affected
 */

// Example: PM proactive discovery
// Instead of only analyzing feedback when cron fires:
// - Detect feedback velocity spikes ("10 reports about X in 2 hours")
// - Detect feedback staleness ("23 items unaddressed for 30+ days")
// - Detect pattern clusters ("5 users reporting similar bugs")
// - Cross-reference with analytics ("feature X has low adoption AND negative feedback")
```

### Per-Agent Proactive Behaviors

**CEO — Strategic Proactivity:**
- Monitors all agent activity. If 3+ agents report issues in the same area → creates cross-cutting task
- Detects capacity imbalance ("Dev has 15 queued tasks but QA has 0 — something's wrong")
- Notices when agent approval rates drop ("User rejected 5 Growth posts in a row — pause and ask why")
- Generates unprompted strategic recommendations ("Revenue grew 20% but support tickets grew 50% — growth is outpacing support capacity")
- Checks if there's enough context/data to ask a specialist agent to do something before the user asks

**PM — Feedback Proactivity:**
- Spike detection: "12 feedback items about login issues in the last 3 hours" → auto-creates urgent task
- Staleness sweep: flags feedback items older than 14 days with no linked task
- Cluster detection: groups similar feedback and creates a single task instead of duplicates
- Cross-references analytics: "Feature X shipped but adoption is 2% and feedback is negative" → creates investigation task
- Monitors competitor signals from Growth & Intel: "Competitor Y just launched feature Z that 5 users requested" → reprioritizes

**CTO — Spec Proactivity:**
- Reviews own past specs: "This spec was rejected 3 times — it needs a different approach"
- Detects spec bottlenecks: "8 tasks waiting for specs, only 2 completed this week" → simplifies upcoming specs
- Validates spec feasibility: checks if referenced files/APIs still exist before handing to Dev
- Auto-updates specs when dependent PRs change the codebase

**Security — Threat Proactivity:**
- Monitors public CVE databases for dependencies used in the project
- When a new dependency is added via PR → immediate targeted scan
- Post-deploy scan: every deployment triggers a quick security check
- Tracks security debt: "3 medium vulnerabilities open for 30+ days" → escalates to CEO

**Growth & Intel — Market Proactivity:**
- Trending topic detection: when a thread about the product's domain goes viral → draft content immediately
- Competitor alert: when competitor ships a feature users requested → draft positioning content
- Content refresh: flag published content older than 30 days that could be updated
- Auto-correlate: shipped feature + high community interest → prioritize distribution

**Support — User Proactivity:**
- Pattern recognition: "3 users asking the same question today" → draft FAQ entry + alert Docs agent
- Sentiment monitoring: detect negative sentiment trends in conversations → alert CEO
- Shipped feature follow-up: proactively reach out to users who requested a feature that just shipped
- Stale conversation detection: flag conversations with no reply for 24+ hours

**Analytics — Data Proactivity:**
- Anomaly detection runs continuously, not just daily snapshots
- Post-deploy monitoring: automatically compare metrics before/after every deployment
- Feature experiment tracking: if a new feature is shipped, auto-create a 7-day adoption tracking task
- Engagement decay detection: "Feature X adoption peaked at 15% and is now declining to 8%" → alert PM

**QA — Quality Proactivity:**
- After every PR merge: automatically assess if E2E tests exist for the changed functionality
- Test coverage monitoring: track which features have zero test coverage → create tasks
- Flaky test detection: if a test passes/fails inconsistently → create investigation task
- Regression pattern: "Last 3 deploys each had a regression" → alert Ops and CEO

**Ops — Reliability Proactivity:**
- Build time trend monitoring: "Build times increased 40% over 2 weeks" → create optimization task
- Pre-deploy risk assessment: analyze PR size/complexity before deploy → flag high-risk deploys
- Error budget tracking: "We've used 80% of our monthly error budget" → alert CEO
- Resource monitoring: detect memory/CPU trends that predict future outages

**Docs — Knowledge Proactivity:**
- After support answers the same question 3+ times → auto-generate documentation
- Track which docs are most viewed → ensure they're up to date
- After API changes detected in PRs → immediately flag for doc update (don't wait for weekly cron)
- Cross-reference: user asks support a question that IS documented → improve doc discoverability

**Sales — Pipeline Proactivity:**
- Detect high-intent signals: GitHub star + visit pricing page → create lead
- Automated follow-up timing: contacts who haven't replied in 3 days get a follow-up draft
- Win/loss analysis: after conversion or loss, generate post-mortem insight for CEO
- Referral detection: when a converted customer mentions the product in a community → amplify

### Proactive Prompt Injection

Every agent's system prompt gets this addition:

```
PROACTIVE BEHAVIOR — You are not a passive tool that waits for instructions.
You are an employee who takes initiative.

After completing your assigned task, ALWAYS:
1. SCAN your domain for unaddressed issues or opportunities
2. CHECK if other agents need information you have
3. ALERT the CEO if you notice cross-cutting patterns
4. CREATE follow-up tasks when you identify next steps
5. FLAG risks before they become problems

You should be the kind of employee that your CEO never has to micromanage.
Think: "What would a senior {role} notice that hasn't been flagged yet?"
```

---

## 4. Safety Architecture — The Autonomy Gate

### The Problem

The audit found that **11 of 13 agents have NO autonomy mode check**. Only `sales.ts` checks. This means even when the user toggles to "Stopped," agents can still create tasks and inbox items.

### The Solution: Universal Autonomy Gate

Every agent action passes through a central gate before doing anything:

```typescript
// packages/backend/convex/autopilot/gate.ts

import { ActionCtx, MutationCtx } from "../_generated/server";

type ActionType =
  | "read"           // Always allowed unless stopped
  | "analyze"        // Always allowed unless stopped
  | "draft"          // Always allowed unless stopped
  | "create_task"    // Allowed in supervised, auto in full_auto
  | "create_inbox"   // Allowed in supervised, auto in full_auto
  | "send_email"     // Requires approval in supervised
  | "create_pr"      // Requires approval in supervised
  | "publish"        // Requires approval in supervised
  | "contact_user"   // Requires approval in supervised
  | "deploy"         // Requires approval in supervised
  | "delete";        // Always requires approval

type GateResult =
  | { proceed: true }
  | { proceed: false; reason: "stopped" | "requires_approval" | "plan_limit" | "cost_limit" | "rate_limit" }

export async function checkGate(
  ctx: ActionCtx | MutationCtx,
  organizationId: Id<"organizations">,
  action: ActionType,
  agent: string
): Promise<GateResult> {
  // 1. Check autonomy mode
  // 2. Check plan limits (free tier can't send_email)
  // 3. Check daily cost cap
  // 4. Check rate limits (max inbox items per agent per hour)
  // 5. Return proceed or blocked with reason
}
```

**Every agent action wraps with:**

```typescript
const gate = await checkGate(ctx, args.organizationId, "create_task", "pm");
if (!gate.proceed) {
  if (gate.reason === "requires_approval") {
    // Create inbox item instead of executing directly
    await createInboxItem(ctx, { ... });
  }
  return; // Don't proceed
}
```

### Rate Limiting Per Agent

Prevent any single agent from flooding:

```typescript
const AGENT_RATE_LIMITS = {
  max_inbox_items_per_hour: 10,
  max_tasks_per_hour: 5,
  max_emails_per_hour: 3,
  max_growth_items_per_run: 5,
  max_security_alerts_per_scan: 10,
  max_support_drafts_per_triage: 5,
} as const;
```

### Deduplication

Agents must check before creating:

```typescript
// Before creating a task, check if a similar one exists
const existing = await ctx.db
  .query("autopilotTasks")
  .withIndex("by_organization", (q) => q.eq("organizationId", orgId))
  .filter((q) =>
    q.and(
      q.neq(q.field("status"), "completed"),
      q.neq(q.field("status"), "cancelled"),
      q.neq(q.field("status"), "failed")
    )
  )
  .collect();

// Use AI to check semantic similarity with existing task titles
// If similarity > 0.85, skip creation and link to existing task
```

---

## 5. CEO Agent Upgrade — The Brain

### Current Problems

1. CEO only generates reports on cron schedule — no strategic thinking
2. CEO doesn't coordinate between agents
3. CEO doesn't learn from user approval/rejection patterns
4. CEO can't adjust agent behavior based on business context
5. CEO isn't truly the "main communicant" with the user

### CEO V2: Strategic Coordinator

**New CEO Capabilities:**

**a) Cross-Agent Coordination**
```
CEO runs a coordination pass every 30 minutes:
1. Query all agent activity from last 30 minutes
2. Detect conflicts (two agents working on related issues)
3. Detect gaps (important area with no agent activity)
4. Detect overload (agent has 20+ queued items)
5. Create coordination actions:
   - Reassign tasks between agents
   - Pause low-priority agent work when urgent issues arise
   - Merge duplicate efforts
   - Alert user when human decision needed
```

**b) User Pattern Learning**
```
CEO tracks:
- Which inbox items user approves vs rejects (per agent, per type)
- How quickly user responds to different item types
- What the user manually creates (indicates what agents should be doing)
- What the user asks in CEO chat (indicates information gaps)

CEO adjusts:
- Agents with < 50% approval rate get more conservative
- Agents with > 90% approval rate can get more autonomy
- Information the user keeps asking for gets proactively surfaced
```

**c) Strategic Thinking**
```
Weekly strategic analysis:
1. Business health: revenue trend + user growth + error rate
2. Team effectiveness: tasks completed, approval rates, cost efficiency
3. Market position: intelligence signals, competitor moves
4. Recommendations: "Prioritize X because Y. Pause Z because W."
5. Risk assessment: "If we continue current trajectory, X will happen in N weeks"
```

**d) Vision Alignment**
```
CEO maintains a "company direction" document (user-editable):
- Product vision (from repo analysis + user input)
- Current quarter priorities
- Off-limits areas (topics/features to avoid)
- Tone guidelines (how to communicate externally)

Every agent decision checks alignment:
- PM: "Does this task align with quarterly priorities?"
- Growth: "Does this content match our tone?"
- Sales: "Is this lead in our target market?"
- CEO: "Is the team working on what matters most?"
```

### CEO System Prompt V2

```
You are the CEO of an autonomous AI company managing a real software product.

YOUR ROLE:
You are the bridge between the President (the human user) and the team (the agents).
When the President speaks to you, you translate their vision into concrete actions.
When agents need direction, you provide strategic context they lack.

YOUR INFORMATION ACCESS:
- All agent activity logs (who did what, when)
- All inbox items and their approval/rejection history
- Revenue and cost data
- User feedback and analytics
- Market intelligence and competitor data
- Current task pipeline (what's planned, in progress, blocked)

YOUR RESPONSIBILITIES:

1. STRATEGIC OVERSIGHT
   - Maintain awareness of the big picture at all times
   - Ensure the team works on what matters most
   - Detect when priorities need shifting
   - Balance short-term execution with long-term health

2. COORDINATION
   - When you notice two agents working on related issues: merge efforts
   - When you notice a critical area with no activity: assign work
   - When you notice an agent is overwhelmed: redistribute tasks
   - When you notice conflicting agent recommendations: resolve or escalate

3. COMMUNICATION
   - Give the President clear, actionable summaries (not data dumps)
   - Be honest about problems — don't sugarcoat
   - When asked a question, answer from data, not assumptions
   - Proactively surface important information before being asked
   - If you don't have enough data to answer, say so and ask the right specialist

4. LEARNING
   - Track which of your recommendations the President accepts vs rejects
   - Adapt your communication style to what works
   - Notice what the President cares about (they'll ask about it)
   - Get better at predicting what the President needs to know

5. PROACTIVE INTELLIGENCE
   - Before the President asks, check if there's enough information to answer
   - If a specialist agent has relevant data, pull it into your context
   - If you notice something the President would want to know: surface it
   - If you need more data: ask the right agent to investigate

THINKING PROCESS:
Before every response or action, think through:
- What is the President's likely intent?
- What data do I have? What am I missing?
- Which agents are relevant to this?
- What's the most helpful thing I can do right now?
- Are there risks or opportunities the President hasn't considered?

TONE:
Direct, strategic, data-informed. You're a CEO, not an assistant.
Say "I recommend X because Y" not "Would you like me to X?"
Say "We have a problem with X" not "There might be an issue."
Own your analysis. Be the leader the President hired.
```

---

## 6. Feedback Loop System

### Agent Learning from Approvals/Rejections

Every inbox item approval or rejection feeds back to the originating agent:

```typescript
// packages/backend/convex/autopilot/feedback.ts

// When user approves/rejects an inbox item:
export const recordFeedback = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    agent: activityLogAgent,
    itemType: inboxItemType,
    decision: v.union(v.literal("approved"), v.literal("rejected"), v.literal("edited")),
    userReason: v.optional(v.string()), // Why they rejected/edited
  },
  handler: async (ctx, args) => {
    // Store in autopilotAgentMemory
    await ctx.db.insert("autopilotAgentMemory", {
      organizationId: args.organizationId,
      agent: args.agent,
      memoryType: "feedback",
      key: `feedback_${args.itemType}_${Date.now()}`,
      value: JSON.stringify({
        type: args.itemType,
        decision: args.decision,
        reason: args.userReason,
        timestamp: Date.now(),
      }),
      createdAt: Date.now(),
    });
  },
});

// Before generating new content, agent queries its feedback history:
export const getAgentFeedbackSummary = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    agent: activityLogAgent,
  },
  handler: async (ctx, args) => {
    const memories = await ctx.db
      .query("autopilotAgentMemory")
      .withIndex("by_org_agent", (q) =>
        q.eq("organizationId", args.organizationId).eq("agent", args.agent)
      )
      .filter((q) => q.eq(q.field("memoryType"), "feedback"))
      .order("desc")
      .take(50);

    // Calculate approval rates by type
    // Extract rejection reasons
    // Return summary for agent's system prompt
    return {
      overallApprovalRate,
      approvalRateByType,
      commonRejectionReasons,
      recentFeedback: memories.slice(0, 5),
    };
  },
});
```

Each agent's prompt includes its feedback summary:

```
YOUR RECENT PERFORMANCE:
- Overall approval rate: 78%
- Growth posts: 85% approved (users like your Reddit replies, less so LinkedIn)
- Common rejection reasons: "Too promotional", "Doesn't match our tone"
- Recent adjustment: Shifted to more technical, less salesy tone

ADAPT YOUR BEHAVIOR:
- For item types with < 60% approval: Be more conservative, ask CEO for guidance
- For item types with > 90% approval: Maintain current approach
- When you see a rejection reason repeating: Actively change your approach
```

---

## 7. Concurrent Lookup Architecture

### The Problem

Agents work sequentially and in isolation. A real company has concurrent activity — people work in parallel and share information in real-time.

### Active Concurrent Lookup Pattern

When an agent is working on a task, it checks what other agents know:

```typescript
// Before PM creates a task about "login issues":
const concurrentContext = await gatherConcurrentContext(ctx, orgId, "login");

// Returns:
{
  security: "2 auth-related vulnerabilities found in last scan",
  support: "5 support conversations about login errors this week",
  analytics: "Login funnel drop-off increased 15% after last deploy",
  ops: "Deploy #89 changed auth middleware (2 days ago)",
  growth: "3 community threads about login UX (negative sentiment)",
}

// PM now creates a much more informed task:
// "Fix login issues — auth vulnerability (Security), 15% funnel drop (Analytics),
//  5 user reports (Support), likely caused by deploy #89 auth middleware change (Ops)"
```

**Implementation:**

```typescript
// packages/backend/convex/autopilot/context.ts

export const gatherConcurrentContext = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    topic: v.string(), // keyword or topic to search for
  },
  handler: async (ctx, args) => {
    // Search across all agent outputs for relevant information
    // 1. Recent tasks mentioning the topic
    // 2. Recent inbox items related to the topic
    // 3. Recent activity logs mentioning the topic
    // 4. Intelligence signals about the topic
    // 5. Support conversations about the topic
    // 6. Security findings related to the topic

    // Return structured context per agent
  },
});
```

### CEO as Context Hub

The CEO agent maintains a running context of what every agent is working on:

```typescript
// CEO's coordination loop (every 30 minutes):
export const runCEOCoordination = internalAction({
  handler: async (ctx, args) => {
    // 1. Get all recent agent activity
    const activity = await ctx.runQuery(internal.autopilot.context.getRecentActivity, {
      organizationId: args.organizationId,
      windowMinutes: 30,
    });

    // 2. Check for conflicts/overlaps
    // 3. Check for gaps
    // 4. Check for agents that might need information from each other
    // 5. Create coordination tasks if needed

    // Example output:
    // "Security found auth vulnerability + Support has 5 login complaints
    //  + Ops shows deploy #89 changed auth → These are the same issue.
    //  Creating a single urgent task and notifying PM, CTO, Dev."
  },
});
```

---

## 8. Community & Drafted Answers System

### Growth & Intel: Active Community Monitoring

The merged Growth & Intelligence agent doesn't just search — it maintains **active lookups** on community platforms:

**Continuous monitoring (every 30 minutes during business hours):**
- Reddit: track mentions of product name, competitor names, domain keywords
- Hacker News: track front-page posts in the product's domain
- LinkedIn: track discussions in relevant groups
- Twitter/X: track mentions and relevant hashtags
- GitHub Discussions: track issues and discussions on the product's repo

**When a relevant thread is found:**
1. Analyze sentiment and intent (question, complaint, feature request, praise)
2. Draft a contextual reply based on product knowledge
3. Create inbox item: "New Reddit thread about {topic} — draft reply ready"
4. If the thread mentions a shipped feature: use changelog data for accurate response
5. If the thread mentions a competitor: use intelligence data for positioning

**Draft quality system:**

```
Every community draft includes:
- Platform-appropriate tone (casual for Reddit, professional for LinkedIn)
- Product mention that feels natural (not forced marketing)
- Actual value in the response (answer the question, solve the problem)
- No lies or exaggeration about product capabilities
- Disclosure when appropriate ("I work on this product")

The draft is a STARTING POINT. The user edits and publishes.
In Full Auto mode: drafts are auto-published after 15-minute delay.
```

---

## 9. Complete Build Task List

### Phase 8A: Safety Foundation (BLOCKING — Do First)

| # | Task | File(s) | Effort |
|---|------|---------|--------|
| 8A.1 | Create universal `gate.ts` with `checkGate()` | autopilot/gate.ts | Medium |
| 8A.2 | Add autonomy check to CEO agent | agents/ceo.ts | Small |
| 8A.3 | Add autonomy check to PM agent | agents/pm.ts | Small |
| 8A.4 | Add autonomy check to CTO agent | agents/cto.ts | Small |
| 8A.5 | Add autonomy check to Security agent | agents/security.ts | Small |
| 8A.6 | Add autonomy check to Architect agent | agents/architect.ts | Small |
| 8A.7 | Add autonomy check to Growth agent | agents/growth.ts | Small |
| 8A.8 | Add autonomy check to Support agent | agents/support.ts | Small |
| 8A.9 | Add autonomy check to Analytics agent | agents/analytics.ts | Small |
| 8A.10 | Add autonomy check to Docs agent | agents/docs.ts | Small |
| 8A.11 | Add autonomy check to QA agent | agents/qa.ts | Small |
| 8A.12 | Add autonomy check to Ops agent | agents/ops.ts | Small |
| 8A.13 | Implement rate limiting in gate.ts | autopilot/gate.ts | Medium |
| 8A.14 | Implement deduplication helpers | autopilot/dedup.ts | Medium |
| 8A.15 | Add `paused` task status + resume logic | tableFields.ts, config.ts | Small |

### Phase 8B: Growth & Intelligence Merge

| # | Task | File(s) | Effort |
|---|------|---------|--------|
| 8B.1 | Merge intelligence_agent.ts logic into agents/growth.ts | agents/growth.ts | Large |
| 8B.2 | Add dual-mode to growth: discover + generate | agents/growth.ts | Medium |
| 8B.3 | Update growth cron to run discovery first, then content | crons.ts | Small |
| 8B.4 | Merge frontend: combine /intelligence and /growth pages | growth/page.tsx | Large |
| 8B.5 | Add tabs: Content, Insights, Community, Competitors, SEO | growth/page.tsx | Medium |
| 8B.6 | Update nav: remove Intelligence, rename Growth | autopilot-nav.tsx | Trivial |
| 8B.7 | Merge config toggles (growthEnabled absorbs intelligenceEnabled) | tableFields.ts, settings | Small |

### Phase 8C: CEO V2 — Strategic Coordinator

| # | Task | File(s) | Effort |
|---|------|---------|--------|
| 8C.1 | Rewrite CEO system prompt with V2 strategy/coordination instructions | agents/ceo.ts | Medium |
| 8C.2 | Implement `runCEOCoordination` (30-min cross-agent check) | agents/ceo.ts | Large |
| 8C.3 | Implement user pattern learning (approval/rejection tracking) | feedback.ts | Medium |
| 8C.4 | Add CEO to agents page with special treatment (not a toggle — always on) | agents/page.tsx | Small |
| 8C.5 | Create "company direction" editable document in settings | settings/page.tsx | Medium |
| 8C.6 | Wire CEO chat to use V2 prompt with full cross-agent context | agent_chat.ts | Medium |
| 8C.7 | CEO proactive alerts: capacity imbalance, approval rate drops, revenue anomalies | agents/ceo.ts | Medium |

### Phase 8D: Proactivity Engine

| # | Task | File(s) | Effort |
|---|------|---------|--------|
| 8D.1 | Add `discoverWork` function to PM (spike detection, staleness sweep, clustering) | agents/pm.ts | Large |
| 8D.2 | Add `discoverWork` function to Security (CVE monitoring, post-deploy scan) | agents/security.ts | Medium |
| 8D.3 | Add `discoverWork` function to Growth (trending topics, content refresh) | agents/growth.ts | Medium |
| 8D.4 | Add `discoverWork` function to Support (pattern recognition, sentiment monitoring) | agents/support.ts | Medium |
| 8D.5 | Add `discoverWork` function to Analytics (continuous anomaly, post-deploy compare) | agents/analytics.ts | Medium |
| 8D.6 | Add `discoverWork` function to QA (coverage monitoring, flaky test detection) | agents/qa.ts | Medium |
| 8D.7 | Add `discoverWork` function to Ops (build time trends, pre-deploy risk, error budget) | agents/ops.ts | Medium |
| 8D.8 | Add `discoverWork` function to Docs (FAQ from support patterns, API change detection) | agents/docs.ts | Medium |
| 8D.9 | Add `discoverWork` function to Sales (high-intent signals, win/loss analysis) | agents/sales.ts | Medium |
| 8D.10 | Inject proactive behavior prompt into all agent system prompts | agents/*.ts | Small |
| 8D.11 | Create concurrent context gatherer (`gatherConcurrentContext`) | context.ts | Medium |

### Phase 8E: Feedback Loop System

| # | Task | File(s) | Effort |
|---|------|---------|--------|
| 8E.1 | Create `feedback.ts` with `recordFeedback` + `getAgentFeedbackSummary` | autopilot/feedback.ts | Medium |
| 8E.2 | Wire inbox approve/reject to record feedback | inbox.ts, mutations.ts | Small |
| 8E.3 | Inject feedback summary into each agent's system prompt | agents/*.ts, shared.ts | Medium |
| 8E.4 | CEO uses feedback data to adjust agent behavior recommendations | agents/ceo.ts | Small |

### Phase 8F: New Frontend Pages

| # | Task | File(s) | Effort |
|---|------|---------|--------|
| 8F.1 | Build Security Dashboard page | security/page.tsx | Medium |
| 8F.2 | Build Support Panel page | support/page.tsx | Medium |
| 8F.3 | Build Analytics Dashboard page | analytics/page.tsx | Large |
| 8F.4 | Build Ops Dashboard page | ops/page.tsx | Medium |
| 8F.5 | Build Sales Pipeline page (kanban) | sales/page.tsx | Large |
| 8F.6 | Build Lead Detail page | sales/[leadId]/page.tsx | Medium |
| 8F.7 | Update nav with all new pages | autopilot-nav.tsx | Small |
| 8F.8 | Add "Manual Trigger" buttons to each page (Run Scan, Pull Data, Check Deploys) | All new pages | Small |

### Phase 8G: Agent Prompt Engineering

| # | Task | File(s) | Effort |
|---|------|---------|--------|
| 8G.1 | Create `prompts.ts` with all agent system prompts (centralized, not scattered) | agents/prompts.ts | Large |
| 8G.2 | Add chain-of-thought structure to all agent prompts (UNDERSTAND → APPROACH → REASON → DECIDE → ACT → REFLECT) | agents/prompts.ts | Medium |
| 8G.3 | Add `.describe()` to ALL Zod schema fields for better structured output | agents/*.ts | Medium |
| 8G.4 | Add feedback context injection to all prompts | agents/prompts.ts | Small |
| 8G.5 | Add concurrent context injection to all prompts | agents/prompts.ts | Small |
| 8G.6 | Temperature: 0 for all structured output calls (deterministic) | agents/shared.ts | Trivial |

### Phase 8H: V4 Bug Fixes (if still pending)

| # | Fix | File |
|---|-----|------|
| 8H.1 | Fix infinite retry loop | execution.ts, tasks.ts |
| 8H.2 | Fix growth agent API call | agents/growth.ts |
| 8H.3 | Delete duplicate email send stub | email.ts |
| 8H.4 | Load AGENTS.md in execution layer | execution.ts |
| 8H.5 | Wire isEmailBlocked | email_sending.ts |
| 8H.6 | Pass CC to Resend | email_sending.ts |
| 8H.7 | Revenue snapshot deduplication | revenue.ts |

### Phase 8I: Integration & Testing

| # | Task | Effort |
|---|------|--------|
| 8I.1 | E2E: full agent loop (feedback → task → spec → PR → review → deploy → announce → support) | Large |
| 8I.2 | E2E: autonomy mode switching (supervised ↔ full_auto ↔ stopped mid-task) | Medium |
| 8I.3 | E2E: CEO coordination (detect conflict between agents, resolve) | Medium |
| 8I.4 | E2E: proactive discovery (agent finds work without being told) | Medium |
| 8I.5 | E2E: feedback loop (reject 5 items, verify agent adapts) | Medium |
| 8I.6 | E2E: rate limiting (verify agents can't flood inbox) | Small |
| 8I.7 | Performance: 50 concurrent orgs with active autopilot | Medium |
| 8I.8 | Run `bun x ultracite fix` + `bun run check-types` | Small |

---

## 10. Parallel Execution Map

```
Phase 8A (Safety Foundation) ──────────────────────────────────
         │
         ├── Phase 8B (Growth + Intel Merge) ────────┐
         │                                            │
         ├── Phase 8C (CEO V2)  ─────────────────────┤
         │                                            │
         ├── Phase 8D (Proactivity Engine) ───────────┤
         │                                            │
         ├── Phase 8E (Feedback Loops) ──────────────┤
         │                                            │
         ├── Phase 8G (Prompt Engineering) ───────────┤
         │                                            │
         └── Phase 8H (Bug Fixes) ───────────────────┤
                                                      │
                                           Phase 8F (New Frontend Pages)
                                                      │
                                           Phase 8I (Integration & Testing)
```

**Critical path:** 8A → (8B + 8C + 8D + 8E + 8G + 8H parallel) → 8F → 8I

**Estimated time:** 3-5 weeks with parallel execution.

---

## 11. Files Summary

### New Files

```
packages/backend/convex/autopilot/
├── gate.ts              # Universal autonomy gate + rate limits
├── dedup.ts             # Deduplication helpers
├── feedback.ts          # Approval/rejection feedback tracking
├── context.ts           # Concurrent context gatherer
└── agents/prompts.ts    # Centralized agent system prompts

apps/web/app/(app)/dashboard/[orgSlug]/autopilot/
├── security/page.tsx    # Security dashboard
├── support/page.tsx     # Support panel
├── analytics/page.tsx   # Analytics dashboard
├── ops/page.tsx         # Ops dashboard
├── sales/page.tsx       # Sales pipeline
└── sales/[leadId]/page.tsx  # Lead detail
```

### Modified Files

```
packages/backend/convex/autopilot/
├── agents/ceo.ts        # V2 strategic coordinator
├── agents/pm.ts         # + autonomy gate + proactive discovery
├── agents/cto.ts        # + autonomy gate
├── agents/security.ts   # + autonomy gate + proactive CVE monitoring
├── agents/architect.ts  # + autonomy gate
├── agents/growth.ts     # + intelligence merge + autonomy gate + proactive discovery
├── agents/support.ts    # + autonomy gate + proactive patterns
├── agents/analytics.ts  # + autonomy gate + proactive anomaly detection
├── agents/docs.ts       # + autonomy gate + proactive FAQ generation
├── agents/qa.ts         # + autonomy gate + proactive coverage monitoring
├── agents/ops.ts        # + autonomy gate + proactive risk assessment
├── agents/sales.ts      # + proactive high-intent detection
├── agents/shared.ts     # + temperature defaults + cost tracking
├── crons.ts             # + CEO coordination cron + merged growth/intel crons
├── inbox.ts             # + feedback recording on approve/reject
├── tableFields.ts       # + paused status + merged config toggles
├── config.ts            # + resume from paused logic
├── execution.ts         # Bug fixes from V4
├── email.ts             # Delete duplicate stub
├── email_sending.ts     # CC fix + blocklist wire
└── revenue.ts           # Dedup fix

apps/web/
├── src/features/autopilot/components/autopilot-nav.tsx  # + new pages, remove intelligence
├── app/.../autopilot/growth/page.tsx    # Merged with intelligence tabs
└── app/.../autopilot/agents/page.tsx    # CEO special treatment
```

---

## 12. After V7: What Reflet Becomes

```
User connects repo
    → Company boots (12 agents + CEO online)
    → Repo analyzed, AGENTS.md generated
    → Primary tasks created (feedback widget, changelog, market analysis, SEO, security scan)
    → Agents start working immediately

Within 5 minutes:
    → CEO welcome report in inbox
    → Security baseline in inbox
    → Architecture health score in inbox
    → Market analysis starting

Within 1 hour:
    → PM has prioritized the first batch of tasks
    → CTO has specced the highest priority ones
    → Dev is creating the first PR
    → Growth has found community threads to engage with
    → Support is monitoring for user conversations

Within 24 hours:
    → First PRs merged
    → First community replies drafted
    → Security vulnerabilities catalogued
    → Analytics baseline established
    → Ops monitoring active
    → Docs audit complete
    → CEO daily report delivered

The user checks their inbox, approves what looks good, rejects what doesn't.
The agents learn. They get better. The cycle accelerates.

The company runs.
```

---

## 13. UX Resilience — Error Handling, Edge Cases & Activity Visibility

> This section is critical. An autonomous system that fails silently is worse than no system at all. The user must ALWAYS know what's happening, what's broken, and what to do about it.

### 13.1 The Always-Visible Activity Banner

A persistent, collapsible banner at the bottom of every Autopilot page. Think of it as the "terminal" of the company — always running, always visible.

```
┌─────────────────────────────────────────────────────────────────┐
│ Main page content                                                │
│                                                                   │
│                                                                   │
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│ ▼ Company Activity                                    [Expand ↑] │
│ 🟢 14:32 PM: Created task "Add rate limiting" from feedback #42  │
│ 🟢 14:30 CTO: Generated spec for "Dark mode toggle"             │
│ 🟡 14:28 Dev: PR #47 waiting for CI — running tests...          │
│ 🔴 14:25 Security: Scan failed — GitHub token expired            │
│ 🟢 14:22 Support: Drafted reply to user@example.com             │
│ ⏸  14:20 System: Autopilot paused by user                       │
└─────────────────────────────────────────────────────────────────┘
```

**Design:**
- **Collapsed (default):** Single-line showing the latest event + count of recent events
- **Expanded:** Scrollable log of last 50 events, color-coded by severity
- **Persists across all Autopilot pages** (mounted in layout.tsx)
- **Real-time updates** via Convex subscription (no polling)
- **Color coding:** 🟢 success, 🟡 warning/waiting, 🔴 error/failure, ⏸ paused, 🔵 info
- **Clickable entries:** Click any event to jump to the relevant page (task, inbox item, agent)
- **Filter buttons:** All | Errors only | Agent-specific
- **Notification dot** on collapsed banner when there are unread errors

**Implementation:**
```typescript
// components/activity-banner.tsx
// Subscribes to autopilotActivityLogs via useQuery
// Filters by organizationId, orders by createdAt desc
// Shows latest 50 entries with real-time updates
// Collapsed mode shows only the last entry
// Red notification dot when any entry has level: "error" and is newer than last viewed
```

### 13.2 Setup Gate — Nothing Works Until Setup is Complete

**The Problem:** Right now, if a user navigates to Autopilot without setup, they see partial UI with empty data. No guidance on what to do.

**The Solution: Setup Wizard Gate**

The entire Autopilot section is gated behind a setup check. If setup is incomplete, the user sees a guided wizard instead of broken pages.

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                   │
│   ┌─────────────────────────────────────────────────────────┐    │
│   │  Welcome to Reflet Autopilot                             │    │
│   │                                                           │    │
│   │  Let's set up your autonomous company.                    │    │
│   │                                                           │    │
│   │  Step 1 of 4                                              │    │
│   │  ────────────────────────────────────────────             │    │
│   │                                                           │    │
│   │  ● Connect your GitHub repository                         │    │
│   │    ○ Select your coding adapter                           │    │
│   │    ○ Add credentials                                      │    │
│   │    ○ Enable Autopilot                                     │    │
│   │                                                           │    │
│   │  [Select Repository ▾]                                    │    │
│   │                                                           │    │
│   │  Connected repos:                                         │    │
│   │    reflet/reflet (main) ✓                                 │    │
│   │                                                           │    │
│   │                               [Continue →]                │    │
│   └─────────────────────────────────────────────────────────┘    │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

**Setup Steps (blocking — must complete in order):**

| Step | What | Required? | Validation |
|------|------|-----------|------------|
| 1. Connect Repo | Link a GitHub repository | Yes | `githubConnections` has entry for org |
| 2. Select Adapter | Choose coding backend (builtin/copilot/codex/claude_code) | Yes | `autopilotConfig.adapter` is set |
| 3. Add Credentials | Provide API keys for chosen adapter | Yes for non-builtin | `autopilotAdapterCredentials.isValid === true` |
| 4. Enable | Toggle autopilot on | Yes | `autopilotConfig.enabled === true` |

**After completing setup:**
- Onboarding tasks auto-generate
- Agents start their initial scans
- Setup wizard disappears, replaced by the real dashboard
- A "Setup Complete" inbox item appears with next steps

**If user navigates to ANY autopilot page before setup is complete:**
- Redirect to `/autopilot` which shows the setup wizard
- Nav items are visible but grayed out with tooltips: "Complete setup first"

**Implementation:**
```typescript
// In layout.tsx, wrap children with:
const setupStatus = useSetupStatus(organizationId);

if (!setupStatus.isComplete) {
  return <SetupWizard currentStep={setupStatus.currentStep} />;
}

// useSetupStatus checks:
// 1. Has githubConnection? → step 1 done
// 2. Has autopilotConfig with adapter? → step 2 done
// 3. Has valid credentials for adapter? → step 3 done
// 4. Is enabled? → step 4 done
```

### 13.3 Stopped Mode — Everything Shows Why

When the user toggles to "Stopped," every page must clearly communicate:

**Global banner (replaces normal status bar):**
```
┌─────────────────────────────────────────────────────────────────┐
│ ⏸  AUTOPILOT PAUSED — Agents are not running. No tasks will     │
│    be dispatched. Paused at 2:30 PM today.  [Resume →]          │
└─────────────────────────────────────────────────────────────────┘
```

**Per-page behavior when stopped:**

| Page | What Changes |
|------|-------------|
| **Dashboard** | Stats show last-active values with "(paused)" suffix. Agent cards show ⏸ icon. Activity feed shows "Paused at {time}" as latest entry. |
| **Inbox** | Items still visible and actionable (user can approve/reject while paused). Yellow banner: "New items won't be generated while paused." |
| **Tasks** | Tasks visible. Paused tasks show ⏸ badge. "Paused tasks will resume when autopilot is restarted." |
| **Agents** | All agent cards show ⏸ state. Toggle switches are disabled with tooltip: "Resume autopilot to change agent settings." |
| **Growth** | Content still visible. Banner: "No new content will be generated while paused." |
| **Settings** | Fully functional — user can change settings while paused. |
| **All new pages** | Same pattern: data visible, read-only context, clear message about pause state. |

### 13.4 Agent Blocked States — Always Show Why

When an agent can't work, the user must know why and what to do:

**Agent Card States (on Agents page and Dashboard):**

| State | Indicator | Message | Action |
|-------|-----------|---------|--------|
| 🟢 Active | Green dot, pulsing | "Working — last active 2 min ago" | — |
| 🟡 Idle | Yellow dot | "Waiting for tasks" | — |
| ⏸ Paused | Gray dot, pause icon | "Autopilot is paused" | [Resume] button |
| 🔴 Error | Red dot, ! icon | "Last run failed: {reason}" | [View Error] → task detail |
| ⚪ Disabled | Gray dot, strikethrough | "Agent is disabled" | [Enable] toggle |
| 🔒 Blocked | Lock icon | "Missing {requirement}" | [Fix →] link to settings |
| 💰 Cost Limited | Dollar icon | "Daily cost cap reached" | [Increase Limit] → settings |
| 🔄 Rate Limited | Clock icon | "Daily task limit reached — resets in 4h" | — |

**"Blocked" reasons and their resolutions:**

```typescript
const BLOCK_REASONS = {
  no_repo: {
    message: "No GitHub repository connected",
    action: "Connect a repository in Settings",
    link: "/settings",
  },
  no_credentials: {
    message: "Adapter credentials not configured",
    action: "Add your API keys in Settings",
    link: "/settings",
  },
  invalid_credentials: {
    message: "Adapter credentials are invalid",
    action: "Update your API keys in Settings",
    link: "/settings",
  },
  no_config: {
    message: "Autopilot not initialized",
    action: "Complete the setup wizard",
    link: "/autopilot",
  },
  agent_disabled: {
    message: "This agent is turned off",
    action: "Enable it in Agents settings",
    link: "/agents",
  },
  dependency_blocked: {
    message: "Waiting for task #{taskId} to complete",
    action: "View the blocking task",
    link: "/tasks/{taskId}",
  },
  plan_limit: {
    message: "Your plan doesn't include this agent",
    action: "Upgrade to Pro for all agents",
    link: "/settings/billing",
  },
  daily_limit: {
    message: "Daily task limit reached (10/10)",
    action: "Resets at {resetTime}",
    link: null,
  },
  cost_limit: {
    message: "Daily cost cap reached ($5.00/$5.00)",
    action: "Increase cap in Settings or wait for reset",
    link: "/settings",
  },
} as const;
```

### 13.5 Empty States — First Time & No Data

Every page needs two empty states: **first-time** (never had data) and **filtered-empty** (had data but filters exclude it).

**First-time empty states:**

| Page | Empty State Message | CTA |
|------|-------------------|-----|
| **Dashboard** | "Your company is booting up. Agents are running their initial analysis — results will appear here shortly." | Animated spinner + progress checklist of onboarding tasks |
| **Inbox** | "No items yet. Agents will create inbox items as they work — you'll see drafts, alerts, and reports here." | "Learn how the inbox works" link |
| **Tasks** | "No tasks yet. The PM agent will create tasks from your feedback, or you can create one manually." | [Create Task] button |
| **Growth** | "No content generated yet. The Growth agent will create content once features are shipped." | "Growth agent needs completed tasks to generate content." |
| **Security** | "No scan results yet. The first security scan runs within 10 minutes of setup." | Progress indicator if scan is running |
| **Support** | "No conversations yet. Support will activate when users start reaching out." | "Set up your support email in Settings" link |
| **Analytics** | "No data yet. Connect PostHog to see user analytics, or wait for the first daily snapshot." | [Connect PostHog] button |
| **Ops** | "No deployment data yet. Connect Vercel to monitor deployments." | [Connect Vercel] button |
| **Sales** | "No leads yet. The Sales agent will discover potential customers from community activity." | "Sales agent requires Business plan" (if on free/pro) |
| **Email** | "No emails yet. Set up your org email address in Settings to start sending." | [Configure Email] link |
| **Costs** | "No cost data yet. Costs will appear once agents start using AI models." | — |

**Filtered-empty states:**
```
"No {items} match your current filters."
[Clear Filters] button
```

### 13.6 Error Recovery — Never Leave the User Stuck

**Global Error Boundary:**
```typescript
// components/autopilot-error-boundary.tsx
// Wraps every Autopilot page
// Catches React render errors
// Shows: "Something went wrong in the {pageName} page."
// Action: [Reload Page] [Go to Dashboard] [Report Issue]
// Logs error to activity feed automatically
```

**Mutation Failure Pattern:**
Every mutation that can fail should:
1. Show a toast with the error message
2. Include a [Retry] action in the toast
3. For critical failures, show an inline error banner that persists (not just a toast that disappears)

```typescript
// Pattern for all mutation calls:
const handleAction = async () => {
  try {
    await mutate(args);
    toast.success("Action completed");
  } catch (error) {
    toast.error("Failed to {action}: {error.message}", {
      action: <Button onClick={() => handleAction()}>Retry</Button>,
      duration: 10000, // 10 seconds, not the default 3
    });
    // For critical actions, also set inline error state:
    setInlineError(`Failed to {action}. ${error.message}`);
  }
};
```

**Task Stuck Detection:**
A background check (cron or client-side polling) that detects stuck states:

```typescript
// packages/backend/convex/autopilot/health.ts

export const getSystemHealth = query({
  handler: async (ctx, args) => {
    // Returns:
    return {
      status: "healthy" | "degraded" | "critical" | "stopped",
      issues: [
        {
          type: "stuck_task",
          message: "Task #42 has been in_progress for 2 hours without updates",
          action: "retry" | "cancel" | "investigate",
          taskId: "...",
        },
        {
          type: "credential_expired",
          message: "GitHub token expired — Dev agent cannot create PRs",
          action: "update_credentials",
        },
        {
          type: "agent_failing",
          message: "Security agent has failed 3 consecutive runs",
          action: "check_logs",
        },
      ],
      lastActivity: timestamp, // When was the last successful agent action?
      agentStatuses: { pm: "active", cto: "idle", dev: "error", ... },
    };
  },
});
```

**Health indicator in header (next to the mode toggle):**
```
When healthy:    🟢 All systems operational
When degraded:   🟡 1 issue needs attention    [View →]
When critical:   🔴 3 issues blocking agents   [Fix Now →]
When stopped:    ⏸  Paused
```

Clicking "View" or "Fix Now" opens a **System Health Panel** (slide-over from the right) showing all issues with one-click resolution actions.

### 13.7 Silent Failure Elimination

**Backend fixes — every silent failure gets an inbox item:**

| Silent Failure | Fix |
|---|---|
| Config deleted during polling → task hangs | Detect missing config in pollTaskStatus, mark task as `failed`, create inbox item: "Task failed — autopilot config was removed" |
| Credentials deleted during polling → task hangs | Detect missing creds in pollTaskStatus, mark task as `failed`, create inbox item: "Task failed — credentials were removed" |
| Cron job fails for an org → console.log only | Wrap cron in try-catch that creates inbox item: "System error — {agent} cron failed: {error}" |
| AGENTS.md fetch fails → silent empty string | Log warning to activity: "Could not load AGENTS.md — agent specs may be less accurate" |
| Repo URL missing → falls back to placeholder | Block task execution entirely, create inbox item: "Cannot execute task — no GitHub repository connected" |
| Email limit stored but never checked | Wire emailDailyLimit into email_sending.ts, reject sends when limit hit, create inbox item |
| Cost cap reached but task continues | Actually stop task execution when cost cap hit, not just log |
| Autonomy mode changed mid-task | Re-read config before setting final task status |

### 13.8 Connectivity & External Service Health

Agents depend on external services. When they're down, the user should know:

**Service health checks (run every 5 minutes):**

```typescript
const EXTERNAL_SERVICES = [
  {
    name: "GitHub",
    check: "validate GitHub token with API call",
    affects: ["Dev", "CTO", "QA", "Docs", "Architect"],
  },
  {
    name: "OpenRouter",
    check: "validate API key with models list call",
    affects: ["All agents (AI calls)"],
  },
  {
    name: "Resend",
    check: "validate domain with Resend API",
    affects: ["Email sending", "Support replies", "Sales outreach"],
  },
  {
    name: "PostHog",
    check: "validate project access",
    affects: ["Analytics", "Ops (error tracking)"],
  },
  {
    name: "Vercel",
    check: "validate deployment access",
    affects: ["Ops (deploy monitoring)"],
  },
];
```

**When a service is down:**
- Affected agents show 🔒 state: "GitHub is unreachable — Dev, CTO, QA, Docs, Architect paused"
- Activity banner shows: "🔴 GitHub API unreachable since 2:30 PM — 5 agents affected"
- Tasks that need the service are not dispatched (held in pending instead of failing)
- When service recovers: "🟢 GitHub API is back online — resuming 5 agents"

### 13.9 "Nothing Happening" Detection

**The worst UX state: the user sees an active system with no movement.**

Detection rules:
```typescript
const INACTIVITY_THRESHOLDS = {
  // If NO activity for this long, something is wrong
  no_activity_warning: 30 * 60 * 1000,   // 30 minutes
  no_activity_critical: 2 * 60 * 60 * 1000, // 2 hours

  // If tasks are pending but none dispatched
  pending_not_dispatched: 15 * 60 * 1000, // 15 minutes

  // If in_progress tasks haven't updated
  task_stale: 60 * 60 * 1000, // 1 hour
};
```

**When "nothing happening" is detected:**

```
┌─────────────────────────────────────────────────────────────────┐
│ 🟡 No agent activity for 45 minutes                             │
│                                                                   │
│ Possible reasons:                                                 │
│ • All tasks are completed — waiting for new feedback or events    │
│ • Daily task limit reached (10/10) — resets in 3h 12m            │
│ • No pending tasks in queue                                       │
│                                                                   │
│ You can:                                                          │
│ [Create a Task] [Trigger PM Analysis] [Ask CEO What's Up]        │
└─────────────────────────────────────────────────────────────────┘
```

**Specific scenarios and messages:**

| Scenario | Detection | Message |
|---|---|---|
| All tasks done, no new feedback | `pendingTasks === 0 && lastActivity > 30min` | "All caught up! Your company is waiting for new feedback or events. Everything is healthy." |
| Task limit reached | `tasksUsedToday >= maxTasksPerDay` | "Daily task limit reached (10/10). Agents are paused until tomorrow at {resetTime}." |
| Cost cap hit | `costUsedTodayUsd >= dailyCostCapUsd` | "Daily cost cap reached (${used}/${cap}). Increase the cap in Settings or wait for reset." |
| Tasks pending but not dispatching | `pendingTasks > 0 && lastDispatch > 15min` | "3 tasks are pending but not being dispatched. Check if agents are enabled and credentials are valid." |
| Task stuck in_progress | `task.status === "in_progress" && lastUpdate > 1h` | "Task #{id} has been running for 2 hours with no updates. It may be stuck." + [Retry] [Cancel] |
| Agent repeatedly failing | `lastNRuns.filter(failed).length >= 3` | "Security agent has failed 3 times in a row. Last error: {message}" + [View Logs] [Disable Agent] |

### 13.10 Onboarding Progress Indicator

After setup, while initial scans are running, show a progress checklist:

```
┌─────────────────────────────────────────────────────────────────┐
│ 🚀 Your company is booting up...                                 │
│                                                                   │
│ ✅ Repository analyzed                                            │
│ ✅ 7 onboarding tasks created                                     │
│ ✅ CEO welcome report generated                                   │
│ 🔄 Security baseline scan running...                              │
│ 🔄 Architecture review running...                                 │
│ ○  Market analysis (queued)                                       │
│ ○  SEO analysis (queued)                                          │
│ ○  Documentation audit (queued)                                   │
│                                                                   │
│ Estimated time: ~5 minutes remaining                              │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━░░░░░░░░░  62%                     │
└─────────────────────────────────────────────────────────────────┘
```

This replaces the dashboard content during the first ~10 minutes. Once all onboarding tasks have completed or produced their first output, it transitions to the normal dashboard with a "Setup complete" toast.

---

## 14. Updated Build Tasks for Error Handling & UX

### Phase 8J: UX Resilience (Add to V7 Build Plan)

| # | Task | File(s) | Effort |
|---|------|---------|--------|
| 8J.1 | Build Always-Visible Activity Banner component | components/activity-banner.tsx | Medium |
| 8J.2 | Mount Activity Banner in autopilot layout.tsx | layout.tsx | Small |
| 8J.3 | Build Setup Wizard Gate component | components/setup-wizard.tsx | Large |
| 8J.4 | Build `useSetupStatus` hook (check repo, config, creds, enabled) | hooks/use-setup-status.ts | Medium |
| 8J.5 | Gate all autopilot pages behind setup check in layout.tsx | layout.tsx | Small |
| 8J.6 | Build Stopped Mode global banner | components/stopped-banner.tsx | Small |
| 8J.7 | Add stopped-mode indicators to all pages (⏸ badges, disabled states) | All page.tsx files | Medium |
| 8J.8 | Build agent blocked-state system (BLOCK_REASONS with resolution links) | components/agent-status-cards.tsx | Medium |
| 8J.9 | Build first-time empty states for all 11 pages | All page.tsx files | Medium |
| 8J.10 | Build filtered-empty states for list pages | inbox, tasks, growth, email pages | Small |
| 8J.11 | Build Autopilot Error Boundary wrapper | components/autopilot-error-boundary.tsx | Small |
| 8J.12 | Add retry actions to all mutation toast errors | All pages with mutations | Medium |
| 8J.13 | Build `getSystemHealth` query (stuck tasks, credential issues, failing agents) | autopilot/health.ts | Medium |
| 8J.14 | Build System Health Panel (slide-over with one-click resolutions) | components/system-health-panel.tsx | Medium |
| 8J.15 | Add health indicator to header (next to mode toggle) | components/autopilot-status-bar.tsx | Small |
| 8J.16 | Build "nothing happening" detection and messaging | autopilot/health.ts + dashboard | Medium |
| 8J.17 | Build onboarding progress indicator | components/onboarding-progress.tsx | Medium |
| 8J.18 | Build external service health checks | autopilot/health.ts | Medium |
| 8J.19 | Fix silent failure: config deleted during polling | execution.ts | Small |
| 8J.20 | Fix silent failure: credentials deleted during polling | execution.ts | Small |
| 8J.21 | Fix silent failure: cron errors create inbox items | crons.ts | Small |
| 8J.22 | Fix silent failure: missing repo blocks execution (no placeholder fallback) | onboarding.ts, execution.ts | Small |
| 8J.23 | Fix silent failure: wire emailDailyLimit into sending | email_sending.ts | Small |
| 8J.24 | Fix silent failure: cost cap actually stops execution | execution.ts | Small |
| 8J.25 | Fix race condition: re-read autonomy mode before task completion | execution.ts | Small |
| 8J.26 | Fix duplicate onboarding tasks on rapid enable/disable | onboarding.ts | Small |

---

## Updated Parallel Execution Map (Full V7)

```
Phase 8A (Safety Foundation) ──────────────────────────────────
         │
         ├── Phase 8B (Growth + Intel Merge) ────────┐
         │                                            │
         ├── Phase 8C (CEO V2)  ─────────────────────┤
         │                                            │
         ├── Phase 8D (Proactivity Engine) ───────────┤
         │                                            │
         ├── Phase 8E (Feedback Loops) ──────────────┤
         │                                            │
         ├── Phase 8G (Prompt Engineering) ───────────┤
         │                                            │
         ├── Phase 8H (Bug Fixes) ───────────────────┤
         │                                            │
         └── Phase 8J.19-26 (Silent Failure Fixes) ──┤
                                                      │
                                      Phase 8F (New Frontend Pages)
                                      Phase 8J.1-18 (UX Resilience)
                                                      │
                                      Phase 8I (Integration & Testing)
```

This is V7. After this, Reflet ships.
