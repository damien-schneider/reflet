# Reflet Autopilot V3 — Definitive Implementation Plan

> **Vision:** Turn Reflet into an **AI product team for existing codebases**.
> Paste a GitHub repo → get an autonomous CEO, PM, CTO, Security Engineer, Architecture Guardian, Dev team, and Growth Marketer — all running your product while you sleep.
>
> **Context:** NanoCorp creates autonomous businesses from scratch. Reflet does the same but for **existing products**. The user pastes a repo and gets a full AI team with hand control, inbox, email integration, and multiple autonomy levels.
>
> **Building approach:** All features are built concurrently using subagents. No sprints — parallel execution.
>
> **What changed since V2:** Provider-agnostic coding adapters (user chooses Copilot, Codex, Claude Code, or built-in), no self-hosted infrastructure needed, email integration, NanoCorp-style inbox and CEO reports, gamified activity feed.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Tech Stack Decisions (Resolved)](#2-tech-stack-decisions-resolved)
3. [Coding Adapter System (NEW)](#3-coding-adapter-system)
4. [Agent Roster (8 Agents)](#4-agent-roster-8-agents)
5. [Email Integration & Inbox (NEW)](#5-email-integration--inbox)
6. [Schema — All Tables](#6-schema--all-tables)
7. [Inter-Agent Communication & Task Stack](#7-inter-agent-communication--task-stack)
8. [Gamified Activity Feed & Transparency](#8-gamified-activity-feed--transparency)
9. [Autonomy Levels & Task Throttle](#9-autonomy-levels--task-throttle)
10. [Frontend Implementation](#10-frontend-implementation)
11. [Safeguards & Guardrails](#11-safeguards--guardrails)
12. [Cost Tracking & Billing](#12-cost-tracking--billing)
13. [Subagent Build Tasks](#13-subagent-build-tasks)

---

## 1. Architecture Overview

```
User pastes GitHub repo URL
        │
        ▼
┌───────────────────────────────────────────────────────────────────────┐
│                     CEO AGENT (Chat Panel — always visible right)     │
│  Free-form conversation. Sees everything. Can trigger any agent.      │
│  Sends reports, documents, and emails to the INBOX.                   │
├───────────────────────────────────────────────────────────────────────┤
│                     INBOX (NanoCorp-style)                            │
│  Receives: CEO reports, emails to review/send, Reddit posts to post, │
│  LinkedIn posts, PRs to review, documents, growth items.              │
│  Each item: approve/edit/reject with one click.                       │
├───────────────────────────────────────────────────────────────────────┤
│                     ORCHESTRATOR (Convex cron, every 2 min)           │
│  Scans pending tasks → checks throttle → dispatches to agents.        │
│  Respects blockedBy DAG. Reports progress to activity feed.           │
├────────┬──────────┬───────────┬───────────┬───────────┬───────────────┤
│   PM   │   CTO    │ Dev Agent │ Security  │ Architect │    Growth     │
│ Agent  │  Agent   │ (Adapter) │  Agent    │  Agent    │    Agent      │
│  AI SDK│  AI SDK  │ Pluggable │  AI SDK   │  AI SDK   │   AI SDK      │
├────────┴──────────┴───────────┴───────────┴───────────┴───────────────┤
│                     CODING ADAPTER LAYER                              │
│  Built-in (AI SDK + GitHub API) │ GitHub Copilot │ OpenAI Codex │    │
│  Claude Code (Anthropic)        │ User picks in settings             │
├───────────────────────────────────────────────────────────────────────┤
│                     DATA LAYER (Convex)                               │
│  autopilotConfig, autopilotTasks, autopilotRuns, autopilotActivityLog │
│  autopilotAdapterCredentials, autopilotInboxItems, autopilotEmails    │
│  + existing: feedback, intelligence, changelog, github, stripe        │
├───────────────────────────────────────────────────────────────────────┤
│                     EXTERNAL SERVICES                                 │
│  GitHub API (PRs, issues, CI)    │  Stripe Connect (revenue)          │
│  OpenRouter / AI Gateway (LLM)   │  Resend (email sending)            │
│  Email receiving (webhook/IMAP)  │  Reddit/LinkedIn/X (growth)        │
└───────────────────────────────────────────────────────────────────────┘
```

### Key Principles

- **Single repo per org.** One org = one product = one GitHub repo.
- **Provider-agnostic.** User chooses their coding agent backend. No vendor lock-in.
- **Database as communication.** Agents don't talk directly — they read/write shared Convex tables. The task DAG ensures ordering.
- **Inbox-driven UX.** Everything flows to the user's inbox. They approve, edit, or dismiss. Full autopilot = auto-approve everything.
- **Email-native.** Each org gets an email address. Agents can draft emails. Users review before sending (or auto-send in full auto mode).
- **Gamified transparency.** Every agent action is visible in real-time. Users see what agents are doing, thinking, and producing.

---

## 2. Tech Stack Decisions (Resolved)

### AI SDK vs Convex AI vs Coding Adapters

| Agent | Runtime | Technology | Why |
|-------|---------|------------|-----|
| CEO (Chat) | Convex `@convex-dev/agent` | Thread-based, persistent memory | Conversational, needs Convex data access |
| PM | Convex `internalAction` | AI SDK `generateObject` + OpenRouter | Structured output, reads/writes Convex tables |
| CTO | Convex `internalAction` | AI SDK `generateObject` + OpenRouter | Converts tasks to technical specs |
| Dev | Convex `internalAction` → **Coding Adapter** | Pluggable (see section 3) | User chooses: Copilot, Codex, Claude Code, or built-in |
| Security | Convex `internalAction` | AI SDK `generateObject` → **Coding Adapter** | Generates fix specs, delegates to adapter for PRs |
| Architect | Convex `internalAction` | AI SDK `generateObject` → **Coding Adapter** | Generates refactoring specs, delegates to adapter |
| Growth | Convex `internalAction` | AI SDK `generateObject` + `:online` models | Web search + content generation, no code execution |
| Orchestrator | Convex cron (2 min) | Pure Convex logic | No LLM — just DAG traversal and dispatch |

### Model Strategy

```typescript
// Free models first, paid fallback
const THINKING_MODELS = [
  "qwen/qwen3.6-plus-preview:free",
  "openai/gpt-5.4-mini",
] as const;

const SEARCH_MODELS = [
  "qwen/qwen3.6-plus-preview:free:online",
  "openai/gpt-5.4-mini:online",
] as const;

const SPEC_MODELS = [
  "anthropic/claude-sonnet-4",  // CTO needs high quality
] as const;
```

**Coding models** are determined by the adapter:
- Built-in: user's OpenRouter/AI Gateway key (any model)
- Copilot: GitHub's models
- Codex: GPT-5-Codex
- Claude Code: Claude Sonnet/Opus

---

## 3. Coding Adapter System

**ALREADY BUILT** — see `packages/backend/convex/autopilot/adapters/`.

### Architecture

Every adapter implements the `CodingAdapter` interface:

```typescript
interface CodingAdapter {
  name: "builtin" | "copilot" | "codex" | "claude_code";
  displayName: string;
  requiredCredentials: string[];
  executeTask(input: CodingTaskInput, credentials): Promise<CodingTaskOutput>;
  getStatus(externalRef: string, credentials): Promise<TaskStatusResponse>;
  cancelTask(externalRef: string, credentials): Promise<void>;
  validateCredentials(credentials): Promise<boolean>;
}
```

### Adapter Comparison

| Adapter | How It Works | Sandbox | Models | Cost |
|---------|-------------|---------|--------|------|
| **Built-in** | GitHub API: read code, create branch, draft PR | None (GitHub API only) | Any via OpenRouter/AI Gateway | Cheapest (free models) |
| **GitHub Copilot** | Create issue → assign to `copilot-swe-agent[bot]` → automatic PR | GitHub Actions (fully managed) | GitHub's selection | Copilot subscription |
| **OpenAI Codex** | Create issue → dispatch `codex.yml` workflow → PR | OpenAI managed container | GPT-5-Codex | OpenAI API pricing |
| **Claude Code** | Create issue with `@claude` → dispatch `claude.yml` → PR | GitHub Actions runner | Claude Sonnet/Opus | Anthropic API pricing |

### How It Flows

```
CTO Agent produces technical spec
        │
        ▼
Orchestrator picks up dev task
        │
        ▼
execution.ts loads org config → resolves adapter
        │
        ▼
adapter.executeTask({
  repoUrl, baseBranch, title, technicalSpec,
  acceptanceCriteria, agentsMdContent, featureBranch
})
        │
        ├─── Built-in: GitHub API (create branch, draft PR with spec)
        ├─── Copilot: Create issue → assign to copilot-swe-agent
        ├─── Codex: Create issue → trigger codex.yml workflow
        └─── Claude: Create issue with @claude → trigger claude.yml
        │
        ▼
For async adapters: pollTaskStatus runs every 60s via ctx.scheduler
        │
        ▼
PR created → Architect Agent reviews → auto-merge or user review
```

### User Setup (Settings Page)

```
Autopilot Settings
├── Adapter: [Built-in ▾] [Copilot ▾] [Codex ▾] [Claude Code ▾]
├── Credentials: [GitHub Token] [OpenAI Key / Anthropic Key]
├── [Validate Credentials] button
├── Autonomy: [Full Auto ▾] [Review Required ▾] [Manual ▾]
├── Max tasks/day: [10]
├── Auto-merge PRs: [x]
└── Require Architect review: [x]
```

---

## 4. Agent Roster (8 Agents)

### 4.1 CEO Agent (Chat Panel)

**Purpose:** Always-available AI product advisor. Sends reports and documents to the inbox.

**UI:** Right-side panel, always visible. Like NanoCorp's CEO chat.

**Has access to:** All tables, all agent activity, revenue data, feedback, intelligence.

**Can do:** Create/modify tasks, trigger pipeline, approve/reject inbox items, send reports to inbox, explain any agent decision.

**Sends to inbox:**
- Weekly product reports (auto-generated)
- Strategic recommendations
- Revenue analysis documents
- Competitor alert summaries
- "State of the product" briefs

**Implementation:** Extend existing `chatAgent` with autopilot-specific tools.

### 4.2 PM Agent (Product Manager)

**Purpose:** Triages all signals into a prioritized, auto-filled task board.

**Inputs:** Feedback (votes, AI priority), intelligence insights, revenue signals, CEO directives.

**Output:** `autopilotTasks` with structured fields via `generateObject`.

**Scoring formula:**
```
voteWeight (0-25) + aiPriorityWeight (0-20) + intelligenceWeight (0-15)
+ competitorGapWeight (0-15) + revenueWeight (0-15) + recencyWeight (0-10)
```

### 4.3 CTO Agent (Technical Architect)

**Purpose:** Converts PM tasks into technical specs and implementation prompts.

**Uses existing:** `repo_analysis.ts`, `code_search.ts`, `repoAnalysisAgent`.

**Output:** Technical spec with `filesToModify`, `dependencies`, `riskLevel`, `implementationPrompt`, `testRequirements`.

The `implementationPrompt` is self-contained: includes task description, relevant code snippets, architecture patterns, file paths, test requirements, and AGENTS.md rules.

### 4.4 Dev Agent (Developer)

**Purpose:** Executes code changes. Creates PRs.

**Runs via:** The coding adapter layer (user's choice).

**Flow:**
1. Receives `implementationPrompt` from CTO
2. Adapter creates branch/issue/dispatch (depends on adapter)
3. Adapter's sandbox: installs deps, explores code, makes changes, runs linter/types/tests
4. PR created automatically
5. If async adapter: poll until PR appears
6. Report PR URL + status back to Convex

### 4.5 Security Agent

**Purpose:** Continuously scans for vulnerabilities, auto-creates fix PRs.

**Triggers:** After every merged PR, daily cron, on demand.

**Checks:** `bun audit`, secret scanning, OWASP patterns, dependency freshness, auth coverage.

**Output:** Creates fix PRs via the coding adapter. These PRs are auto-merge eligible.

### 4.6 Architecture Agent (Guardian)

**Purpose:** Enforces AGENTS.md rules. Maintains codebase health.

**Triggers:** After every merged PR, weekly full scan, on demand.

**Checks:** File length (>400 lines), function length (>50 lines), nesting (>3), barrel files, duplicates, type safety, test coverage.

**Output:** Refactoring PRs via the coding adapter.

### 4.7 Growth Agent (Marketer)

**Purpose:** Turns shipped work into distribution. Everything pre-built, one-click.

**Key principle:** The user should never write anything. Every growth item is ready to post with a single click.

**Growth item types:**

| Type | What appears in inbox | User action |
|------|----------------------|-------------|
| Reddit reply | Thread URL + pre-written reply | "Open Thread" + "Copy Reply" |
| LinkedIn post | Full post text | "Copy Post" + "Open LinkedIn" |
| Twitter/X post | Tweet text (280 chars) | "Copy Tweet" + "Open X" |
| HN comment | Thread URL + reply | "Open Thread" + "Copy" |
| Blog post | Full markdown article | "Copy to CMS" / "Download" |
| Email campaign | Subject + body + segment | "Send" button (via email integration) |
| Changelog announce | Auto-formatted release notes | "Publish" (uses existing changelog) |

**All growth items go to the inbox.** In full auto mode, they can auto-post (where APIs allow).

### 4.8 Orchestrator

**Purpose:** Drives the pipeline. No LLM — pure state machine.

**Runs:** Convex cron every 2 minutes.

**Logic:**
1. Scan all orgs with autopilot enabled + pending tasks
2. For each org: check daily throttle
3. Get dispatchable tasks (pending + unblocked in DAG)
4. Dispatch highest priority task to assigned agent
5. Log all activity

**ALREADY BUILT** — see `packages/backend/convex/autopilot/crons.ts`.

---

## 5. Email Integration & Inbox

### 5.1 Email System

Each org gets an email address for its autopilot. Two approaches:

**Option A: Reflet-provided email (default)**
- Auto-generated: `{org-slug}@autopilot.reflet.app`
- Uses Resend (already integrated) for sending
- Inbound emails received via Resend webhook or a catch-all domain
- Zero setup for the user

**Option B: User-provided email (BYOE)**
- User connects their own email via OAuth (Gmail, Outlook) or SMTP
- Emails appear in the inbox with the user's actual domain
- Professional appearance for outbound communications

**Implementation:**
- `autopilotEmails` table stores drafts, sent, received emails
- Growth Agent drafts emails → they appear in inbox as "Email to send"
- CEO Agent receives inbound emails → summarizes and surfaces relevant ones
- In full auto mode: emails auto-send after CEO approval (not user approval)

### 5.2 Inbox (NanoCorp-style)

The inbox is the central hub. Every agent output that needs user attention goes here.

```typescript
const inboxItemType = v.union(
  v.literal("pr_review"),        // Dev Agent created a PR
  v.literal("email_draft"),      // Growth/CEO drafted an email to send
  v.literal("email_received"),   // Inbound email from a customer/user
  v.literal("growth_post"),      // Reddit/LinkedIn/X post ready to publish
  v.literal("ceo_report"),       // CEO weekly report or document
  v.literal("security_alert"),   // Security Agent found a vulnerability
  v.literal("architect_finding"),// Architecture Agent found violations
  v.literal("task_approval"),    // PM created a task that needs approval
  v.literal("revenue_alert"),    // Revenue changed significantly
);
```

**Each inbox item has:**
- Title, summary, full content
- Source agent
- Action buttons (approve, edit, reject, snooze)
- Status (pending, approved, rejected, snoozed, expired)
- Priority badge
- Timestamp

**In full auto mode:** Items are auto-approved based on rules:
- PRs with passing CI + architect approval → auto-merge
- Growth posts → auto-mark as approved (user still needs to click post)
- Emails → auto-send if CEO approved
- Security fixes → auto-merge
- CEO reports → auto-filed

### 5.3 Email Table Schema

```typescript
autopilotEmails: defineTable({
  organizationId: v.id("organizations"),
  direction: v.union(v.literal("inbound"), v.literal("outbound")),
  status: v.union(
    v.literal("draft"),
    v.literal("pending_review"),
    v.literal("approved"),
    v.literal("sent"),
    v.literal("received"),
    v.literal("rejected")
  ),
  from: v.string(),
  to: v.array(v.string()),
  cc: v.optional(v.array(v.string())),
  subject: v.string(),
  bodyHtml: v.string(),
  bodyText: v.string(),
  inReplyTo: v.optional(v.id("autopilotEmails")),
  threadId: v.optional(v.string()),
  draftedByAgent: v.optional(v.string()),
  sentAt: v.optional(v.number()),
  receivedAt: v.optional(v.number()),
  createdAt: v.number(),
})
  .index("by_organization", ["organizationId"])
  .index("by_org_status", ["organizationId", "status"])
  .index("by_thread", ["threadId"]),

autopilotInboxItems: defineTable({
  organizationId: v.id("organizations"),
  type: inboxItemType,
  title: v.string(),
  summary: v.string(),
  content: v.optional(v.string()),
  sourceAgent: v.string(),
  priority: v.union(v.literal("critical"), v.literal("high"), v.literal("medium"), v.literal("low")),
  status: v.union(
    v.literal("pending"),
    v.literal("approved"),
    v.literal("rejected"),
    v.literal("snoozed"),
    v.literal("expired"),
    v.literal("auto_approved")
  ),
  actionUrl: v.optional(v.string()),
  relatedTaskId: v.optional(v.id("autopilotTasks")),
  relatedEmailId: v.optional(v.id("autopilotEmails")),
  relatedRunId: v.optional(v.id("autopilotRuns")),
  metadata: v.optional(v.string()),
  expiresAt: v.optional(v.number()),
  reviewedAt: v.optional(v.number()),
  createdAt: v.number(),
})
  .index("by_organization", ["organizationId"])
  .index("by_org_status", ["organizationId", "status"])
  .index("by_org_type", ["organizationId", "type"])
  .index("by_task", ["relatedTaskId"]),
```

---

## 6. Schema — All Tables

### Already Built (in `autopilot/tableFields.ts`)

| Table | Purpose |
|-------|---------|
| `autopilotConfig` | Per-org settings: adapter, throttle, autonomy level |
| `autopilotAdapterCredentials` | Encrypted credentials per adapter per org |
| `autopilotTasks` | Task DAG: status, priority, agent, blocking deps, PR tracking, cost |
| `autopilotRuns` | Individual coding attempts: sandbox status, CI tracking, retry |
| `autopilotActivityLog` | Real-time gamified feed of all agent actions |

### To Build

| Table | Purpose |
|-------|---------|
| `autopilotInboxItems` | NanoCorp-style inbox: items pending user review |
| `autopilotEmails` | Email drafts, sent, received — full email integration |
| `autopilotGrowthItems` | Pre-generated growth content (Reddit, LinkedIn, X, blog, email) |
| `autopilotRevenueSnapshots` | Daily revenue snapshots from Stripe Connect |
| `autopilotAgentMemory` | Persistent context/memory per agent per org (for CEO chat history summary) |

---

## 7. Inter-Agent Communication & Task Stack

### Database-as-Communication

Agents don't call each other directly. They read and write shared tables:

```
PM creates task (status: pending, assignedAgent: cto)
        │
Orchestrator picks up → dispatches to CTO
        │
CTO reads task → generates spec → creates subtask (assignedAgent: dev, blockedBy: cto-task)
        │
CTO task completes → blocker resolved
        │
Orchestrator picks up dev task → dispatches to coding adapter
        │
Dev runs → PR created → task status: waiting_review
        │
Architect Agent reviews PR → approves → inbox item created
        │
User approves (or auto-approve in full auto) → PR merged → task completed
```

### Task Stack That Never Stops

The orchestrator runs every 2 minutes. As long as there are pending tasks with resolved blockers, it keeps dispatching. The PM Agent refills the queue periodically (daily or on-demand):

```
PM Agent scans feedback + intelligence
        │
Creates 5 new tasks (pending)
        │
Orchestrator dispatches task 1 → CTO
CTO creates subtask 1a (dev) → blocked by CTO
CTO completes → subtask 1a unblocked
Orchestrator dispatches 1a → Dev
...continues until queue is empty
        │
Next PM scan refills the queue
```

### Waiting and Blocking

```typescript
// Task with dependency
{
  title: "Implement dark mode toggle",
  assignedAgent: "dev",
  blockedByTaskId: ctoTaskId,  // Can't start until CTO finishes spec
  status: "pending",           // Won't be dispatched while blocked
}
```

The `getDispatchableTasks` query checks: `status === "pending" AND (blockedByTaskId is null OR blocker.status === "completed")`.

### Hard Stop Button

Each org's `autopilotConfig` has an `enabled` boolean. Setting it to `false` immediately stops:
- Orchestrator skips the org
- Active runs can be cancelled via `adapter.cancelTask()`
- All pending tasks stay pending (resume when re-enabled)

---

## 8. Gamified Activity Feed & Transparency

### Real-Time Feed

Every agent action writes to `autopilotActivityLog`. The frontend subscribes via Convex real-time queries:

```
[2m ago]  PM Agent analyzed 23 feedback items → created 3 tasks
[1m ago]  CTO Agent converted "Add dark mode" into technical spec
[45s ago] Dev Agent started working on PR #47 — exploring codebase...
[30s ago] Dev Agent pushed commit: "Add dark mode toggle component"
[15s ago] Security Agent found 0 vulnerabilities in latest scan
[5s ago]  Growth Agent drafted LinkedIn post about dark mode launch
[now]     Architect Agent reviewing PR #47...
```

### Activity Log Entry Structure

```typescript
{
  agent: "dev",           // Which agent
  level: "action",        // info | action | success | warning | error
  message: "Creating PR", // Human-readable
  details: "Branch: autopilot/task-123-dark-mode", // Optional extra context
  taskId: "...",          // Link to task
  runId: "...",           // Link to coding run
  createdAt: 1712345678,
}
```

### Gamification Elements

- **Agent avatars** — each agent has a distinct icon/emoji in the feed
- **Status badges** — "Working", "Idle", "Waiting", "Error" per agent
- **Daily stats** — "Today: 3 tasks completed, 2 PRs merged, 1 email sent"
- **Streak counter** — "Autopilot has been running for 14 days straight"
- **Cost ticker** — "Today's AI cost: $0.23"

---

## 9. Autonomy Levels & Task Throttle

### Three Autonomy Levels

| Level | Behavior |
|-------|----------|
| **Full Auto** | Everything runs autonomously. PRs auto-merge after CI + architect review. Emails auto-send after CEO approval. Growth posts auto-approve. User only sees the inbox for transparency. |
| **Review Required** (default) | Agents work autonomously but all outputs go to inbox for user approval. PRs need user merge. Emails need user send. Growth posts need user copy/post. |
| **Manual** | Agents only work when explicitly triggered by user or CEO chat. No automatic dispatch. |

### Per-Task Override

Each task has its own `autonomyLevel` field. A critical security fix can be `full_auto` even if the org default is `review_required`.

### Task Throttle

```typescript
autopilotConfig: {
  maxTasksPerDay: 10,
  tasksUsedToday: 3,
  tasksResetAt: 1712400000000, // Midnight UTC
}
```

The orchestrator checks: `tasksUsedToday < maxTasksPerDay` before dispatching. When the limit is hit, remaining tasks stay pending.

**User controls this in settings.** Default: 10 tasks/day. Can increase up to plan limit.

### Credits System (Future)

Like NanoCorp's credits. Each adapter has a cost-per-task. Credits are consumed on dispatch:
- Built-in: 1 credit (cheapest, uses free models)
- Copilot: 2 credits
- Codex: 3 credits
- Claude Code: 3 credits

Credits refresh monthly based on billing plan.

---

## 10. Frontend Implementation

### Route Structure

```
/[org]/autopilot                    → Dashboard (overview + activity feed)
/[org]/autopilot/inbox              → NanoCorp-style inbox
/[org]/autopilot/tasks              → Task board (PM view)
/[org]/autopilot/tasks/[id]         → Task detail
/[org]/autopilot/agents             → Agent status overview
/[org]/autopilot/growth             → Growth content queue
/[org]/autopilot/email              → Email inbox/outbox
/[org]/autopilot/email/[id]         → Email thread view
/[org]/autopilot/settings           → Adapter, autonomy, throttle, email config
/[org]/autopilot/costs              → Cost tracking dashboard
```

### Key Components

**Dashboard (`/autopilot`)**
- Activity feed (real-time, Convex subscription)
- Quick stats: tasks today, PRs open, inbox pending, daily cost
- Agent status cards (idle/working/error)
- Revenue widget (Stripe Connect data)
- CEO chat panel (always visible, right side)

**Inbox (`/autopilot/inbox`)**
- Card-based list, most recent first
- Filter by type (PR, email, growth, report, alert)
- Each card: title, summary, source agent, priority badge
- Action buttons: Approve, Edit, Reject, Snooze
- Bulk actions: "Approve all growth posts", "Reject all low priority"

**CEO Chat (right panel)**
- Persistent across all autopilot pages
- Thread-based conversation
- Can reference tasks, PRs, emails by name
- Shows "typing..." when CEO is generating a report

**Email View (`/autopilot/email`)**
- Gmail-like thread view
- Draft editor with agent-suggested content
- "Send" button (requires explicit user action unless full auto)
- Inbound emails with AI summary

---

## 11. Safeguards & Guardrails

### Protected Files (Dev Agent cannot modify)

```
schema.ts, package.json, tsconfig.json, biome.jsonc, turbo.json,
convex.config.ts, auth.config.ts, .env*, Dockerfile,
billing/*, auth/*, migrations/*
```

### PR Safeguards

- All PRs are created as **drafts**
- CI must pass before any auto-merge
- Architect Agent reviews every PR (configurable)
- Max 3 retries per task before failing
- Each PR is labeled: `autopilot`, priority level, agent name

### Email Safeguards

- Emails are never sent without at least one approval (user or CEO agent)
- In full auto: CEO approves, then auto-sends
- In review required: user must explicitly click send
- Daily email limit (configurable, default: 20)
- Blocklist for email domains (never auto-email competitors, press, etc.)

### Cost Safeguards

- Daily cost cap (configurable)
- Per-task cost limit
- Alert when daily cost exceeds 80% of cap
- Hard stop when cap is reached

### Emergency Stop

- Red "Stop All" button on dashboard
- Sets `enabled: false` on config
- Cancels all active runs via adapter cancel
- All pending tasks preserved for resume

---

## 12. Cost Tracking & Billing

### Per-Task Cost Tracking

Every task and run tracks:
```typescript
{
  tokensUsed: 15234,
  estimatedCostUsd: 0.023,
}
```

### Aggregate Views

- **Daily cost** — sum of all runs today
- **Per-agent cost** — which agent costs the most
- **Per-adapter cost** — built-in vs Copilot vs Codex vs Claude
- **Cost trend** — chart over last 30 days

### Premium Gating

Autopilot is a **premium feature**:

| Plan | Autopilot Access |
|------|-----------------|
| Free | No autopilot |
| Pro | 5 tasks/day, review required only, built-in adapter only |
| Business | 50 tasks/day, all autonomy levels, all adapters |
| Enterprise | Unlimited, custom limits, priority support |

---

## 13. Subagent Build Tasks

All tasks below can be built concurrently by subagents. Each task is self-contained with clear inputs and outputs.

### Phase 1: Core Infrastructure (DONE)

- [x] `autopilot/tableFields.ts` — all table schemas and validators
- [x] `autopilot/adapters/types.ts` — CodingAdapter interface
- [x] `autopilot/adapters/builtin.ts` — Built-in adapter (AI SDK + GitHub API)
- [x] `autopilot/adapters/copilot.ts` — GitHub Copilot adapter
- [x] `autopilot/adapters/codex.ts` — OpenAI Codex adapter
- [x] `autopilot/adapters/claude_code.ts` — Claude Code adapter
- [x] `autopilot/adapters/registry.ts` — Adapter registry
- [x] `autopilot/config.ts` — Config queries/mutations
- [x] `autopilot/tasks.ts` — Task CRUD, activity logging
- [x] `autopilot/execution.ts` — Task execution + polling
- [x] `autopilot/crons.ts` — Orchestrator cron
- [x] Wired into `schema.ts` and `crons.ts`

### Phase 2: Email & Inbox (DONE)

- [x] `autopilot/tableFields.ts` — Added inbox, email, growth, revenue, agent memory tables + validators
- [x] `autopilot/inbox.ts` — Inbox CRUD (create, list, update, bulk, expire)
- [x] `autopilot/email.ts` — Email CRUD (draft, send, receive, thread, counts)
- [x] `autopilot/email_sending.ts` — Email sending via Resend, daily limits, domain blocklist
- [x] `autopilot/email_receiving.ts` — Inbound email webhook handler with AI summary
- [x] `autopilot/growthItems.ts` — Growth items CRUD (create, update, publish tracking)

### Phase 3: Agent Intelligence (DONE)

- [x] `autopilot/agents/ceo.ts` — CEO Agent (chatAgent extension + periodic reports)
- [x] `autopilot/agents/pm.ts` — PM Agent (feedback → prioritized tasks)
- [x] `autopilot/agents/cto.ts` — CTO Agent (task → technical spec + dev subtask)
- [x] `autopilot/agents/security.ts` — Security Agent (vulnerability scan → fix tasks)
- [x] `autopilot/agents/architect.ts` — Architect Agent (code review → refactor tasks)
- [x] `autopilot/agents/growth.ts` — Growth Agent (shipped work → content generation)
- [x] `autopilot/revenue.ts` — Stripe revenue snapshots + cron + alerts
- [x] Updated `crons.ts` — Agent routing + daily/weekly cron handlers
- [x] Updated orchestrator to dispatch to all agents (not just dev)

### Phase 4: Frontend

| # | Task | File(s) | Dependencies |
|---|------|---------|-------------|
| 4.1 | Autopilot dashboard page | `app/[org]/autopilot/page.tsx` | Phase 1 |
| 4.2 | Activity feed component (real-time) | `components/autopilot/activity-feed.tsx` | Phase 1 |
| 4.3 | CEO chat panel (right side) | `components/autopilot/ceo-chat.tsx` | 3.1 |
| 4.4 | Inbox page + item cards | `app/[org]/autopilot/inbox/page.tsx` | 2.2 |
| 4.5 | Task board page | `app/[org]/autopilot/tasks/page.tsx` | Phase 1 |
| 4.6 | Task detail page | `app/[org]/autopilot/tasks/[id]/page.tsx` | Phase 1 |
| 4.7 | Growth queue page | `app/[org]/autopilot/growth/page.tsx` | 3.6 |
| 4.8 | Email inbox/outbox page | `app/[org]/autopilot/email/page.tsx` | 2.3 |
| 4.9 | Settings page (adapter, autonomy, throttle, email) | `app/[org]/autopilot/settings/page.tsx` | Phase 1 |
| 4.10 | Cost tracking dashboard | `app/[org]/autopilot/costs/page.tsx` | Phase 1 |
| 4.11 | Agent status cards | `components/autopilot/agent-status.tsx` | Phase 1 |
| 4.12 | Inbox item action buttons | `components/autopilot/inbox-actions.tsx` | 2.2 |

### Phase 5: Polish & Integration

| # | Task | File(s) | Dependencies |
|---|------|---------|-------------|
| 5.1 | GitHub webhook handler (PR merge → trigger security/architect) | `autopilot/webhooks.ts` | 3.4, 3.5 |
| 5.2 | Auto-onboarding flow (paste repo → analyze → enable autopilot) | `autopilot/onboarding.ts` | All |
| 5.3 | Emergency stop button | `components/autopilot/emergency-stop.tsx` | Phase 1 |
| 5.4 | Cost cap enforcement | `autopilot/cost_guard.ts` | Phase 1 |
| 5.5 | Premium gating middleware | `autopilot/billing_gate.ts` | Billing module |
| 5.6 | E2E tests for full pipeline | `autopilot/__tests__/` | All |

### Parallel Execution Map

```
Phase 1 (DONE) ─────────────────────────────────────────────
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
    Phase 2      Phase 3     Phase 4.1-4.2, 4.5-4.6, 4.9-4.11
   (Email &     (Agent       (Pages that only need Phase 1)
    Inbox)      Intelligence)
        │           │           │
        ▼           ▼           ▼
    Phase 4.4    Phase 4.3   Phase 4.7, 4.8
   (Inbox page) (CEO chat)  (Growth, Email pages)
        │           │           │
        └───────────┼───────────┘
                    ▼
               Phase 5
            (Polish & E2E)
```

---

## Appendix: Files Built (8,167 lines across 23 files)

```
packages/backend/convex/autopilot/
├── adapters/
│   ├── types.ts           ✅ CodingAdapter interface + types (106 lines)
│   ├── builtin.ts         ✅ Built-in adapter (AI SDK + GitHub API) (574 lines)
│   ├── copilot.ts         ✅ GitHub Copilot adapter (353 lines)
│   ├── codex.ts           ✅ OpenAI Codex adapter (379 lines)
│   ├── claude_code.ts     ✅ Claude Code adapter (410 lines)
│   └── registry.ts        ✅ Adapter registry (48 lines)
├── agents/
│   ├── ceo.ts             ✅ CEO Agent — chat + periodic reports (433 lines)
│   ├── pm.ts              ✅ PM Agent — feedback → tasks (442 lines)
│   ├── cto.ts             ✅ CTO Agent — task → technical spec (434 lines)
│   ├── security.ts        ✅ Security Agent — vulnerability scan (310 lines)
│   ├── architect.ts       ✅ Architect Agent — code review (335 lines)
│   └── growth.ts          ✅ Growth Agent — content generation (470 lines)
├── config.ts              ✅ Config queries/mutations (300 lines)
├── crons.ts               ✅ Orchestrator + cron handlers (362 lines)
├── email.ts               ✅ Email CRUD (392 lines)
├── email_receiving.ts     ✅ Inbound email webhook (260 lines)
├── email_sending.ts       ✅ Outbound email via Resend (297 lines)
├── execution.ts           ✅ Task execution + polling (429 lines)
├── growthItems.ts         ✅ Growth items CRUD (273 lines)
├── inbox.ts               ✅ Inbox CRUD (337 lines)
├── revenue.ts             ✅ Stripe revenue snapshots (426 lines)
├── tableFields.ts         ✅ 10 tables + 12 validators (416 lines)
└── tasks.ts               ✅ Task CRUD + activity logging (381 lines)

Modified files:
├── schema.ts              ✅ Added autopilotTables
└── crons.ts               ✅ 7 cron entries (orchestrator, revenue, CEO, security, architect, inbox)
```
