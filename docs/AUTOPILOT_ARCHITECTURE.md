# Autopilot Architecture

Living document — maintain whenever the architecture changes.

## Core Design Principles

1. **No orchestrator.** Agents own their work. They check the shared board, find what needs doing, and do it — like employees, not microservices.
2. **Condition-driven, not cron-driven.** Agents wake up when there's a reason to work, not on fixed timers. A lightweight heartbeat checks conditions and wakes agents when needed.
3. **Shared board, not function calls.** Agents communicate through data on a shared board (the database). No agent calls another agent directly.
4. **Guards, not gatekeepers.** Cost limits, autonomy checks, and rate limits are middleware that wraps every execution — not a centralized dispatcher.
5. **Two unified models.** All work is in `autopilotWorkItems` (with parent/child hierarchy). All content is in `autopilotDocuments` (with type/tag filtering). No redundant tables.
6. **Inbox as a view, not a table.** Items needing the President's review are flagged with `needsReview: true` on work items and documents — not stored in a separate inbox table.

## Agent Hierarchy

```
President (User)
  └── CEO — Strategy, coordination, relays President directives
        ├── PM — Product decisions, roadmap, stories (consumes Growth's research)
        │     └── CTO — Technical specs from PM's stories
        │           └── Dev — Code from CTO's specs
        ├── Growth — Market research + distribution (feeds PM with findings)
        ├── Sales — Prospecting + pipeline (reads Growth's findings + PM's ICP)
        └── Support — User conversations + escalation
```

## The Shared Board

All agents read from and write to the same database. Two unified models + specialized tables:

### Knowledge Base — `autopilotKnowledgeDocs` + `autopilotKnowledgeDocVersions`

7 living documents that capture who the company is. Auto-generated at onboarding, maintained by owning agents.

| Document | Owner | Read by |
|----------|-------|---------|
| Product Definition | PM | Everyone |
| User Personas & ICP | PM | Sales, Growth, Support |
| Competitive Landscape | PM (from Growth's research) | Growth, Sales, CEO |
| Brand Voice | Growth | Support, Sales |
| Technical Architecture | CTO | Dev |
| Goals & OKRs | CEO | PM, everyone |
| Product Roadmap | PM | CEO, CTO, Growth |

**Rules:** Versioned (max 10). User edits protected 72h. Change cascading flags downstream data as stale. No silent fallbacks — agents halt if missing.

### Work Board — `autopilotWorkItems` (unified)

All work lives in one table with parent/child relationships via `parentId`.

| Type | Created by | Parent | Consumed by |
|------|-----------|--------|-------------|
| `initiative` | PM | — | CTO looks for child stories |
| `story` | PM | initiative | CTO creates spec from it |
| `spec` | CTO | story | Dev builds from it |
| `task` | Dev / PM / User | story or spec | Dev executes via coding adapter |
| `bug` | CTO / Support | — | Dev fixes |

**Status flow:** `backlog` → `todo` → `in_progress` → `in_review` → `done` / `cancelled`

**Review:** When `needsReview: true`, item appears in the President's Inbox.

### Documents — `autopilotDocuments` (unified)

All content lives in one table with type/tag filtering.

| Type | Created by | Purpose |
|------|-----------|---------|
| `market_research` | Growth | Analysis with relevance score + source links |
| `blog_post` / `reddit_reply` / `linkedin_post` / `twitter_post` / `hn_comment` / `changelog` | Growth | Distribution content |
| `note` | Any agent | Quick observations |
| `email` | Sales / Support | Email drafts and received emails |
| `support_thread` | Support | Support conversations (messages in metadata) |
| `battlecard` | Sales | Competitor positioning |
| `report` | CEO | Status/coordination reports |
| `adr` | CTO | Architecture decision records |

**Review:** When `needsReview: true`, item appears in the President's Inbox.

### Specialized Tables

| Table | Purpose |
|-------|---------|
| `autopilotCompetitors` | Competitor CRM (name, URL, pricing, features, strengths, weaknesses) |
| `autopilotLeads` | Sales pipeline (name, email, company, score, stage, follow-ups) |
| `autopilotRevenueSnapshots` | Stripe MRR/ARR/churn |
| `autopilotRepoAnalysis` | Onboarding repo analysis |
| `autopilotActivityLog` | Unified event log |
| `autopilotRuns` | Code execution runs (linked to work items) |
| `autopilotAgentThreads` + `autopilotAgentMessages` | CEO chat |
| `autopilotConfig` + `autopilotAdapterCredentials` | Org configuration |
| `autopilotRoutines` | User-defined scheduled tasks |

## How Agents Wake Up

**Purely work-driven.** A heartbeat runs every 3 minutes. For each agent, it checks board state — never time-based fallbacks. Agents wake ONLY when there is actual work on the shared board.

The pipeline is self-sustaining: Growth → documents → PM → stories → CTO → specs → Dev → ships → Growth (content about shipped features).

The company stops ONLY when:
1. Waiting for President approval (items with `needsReview: true`)
2. Plan limits or credits exhausted (guards block execution)
3. Pipeline is full (cap reached, waiting for existing work to complete)

| Agent | Wakes up when (board state) |
|-------|---------------|
| **PM** | No initiatives exist (bootstrap), OR new draft notes from other agents, OR story count below threshold |
| **CTO** | Stories in "todo" status (need specs) |
| **Dev** | Approved specs, OR failed runs to retry |
| **Growth** | No research docs exist (bootstrap), OR shipped features without content |
| **Sales** | Leads in "discovered" status (need outreach), OR leads with overdue follow-ups |
| **CEO** | Items stuck in review > 24h (bottleneck), OR recent agent errors (coordination needed) |
| **Support** | New support_thread documents in draft status |

**Anti-loop protection:** PM checks pipeline capacity before creating work. If the pipeline is full (todo + in_progress >= cap), PM does not wake. Each agent marks its inputs as processed (e.g., PM marks notes as "published") so they don't re-trigger.

## Agent Execution Flow

```
1. GUARDS     — Cost → Autonomy → Rate limit → Circuit breaker
2. KNOWLEDGE  — Load required knowledge docs. If missing → HALT.
3. CONTEXT    — Knowledge summaries + domain work items + recent documents
4. WORK       — LLM call → produce output
5. OUTPUT     — Write work items / documents (with needsReview if needed)
6. LOG        — Record in autopilotActivityLog
```

## Inbox = Filtered View

The inbox queries `autopilotWorkItems` + `autopilotDocuments` where `needsReview === true`. Approving patches `needsReview: false` on the source record. No separate inbox table.

## PM + Growth Pipeline

```
Growth → documents (type: "note", "market_research") → PM reads them
PM → work items (type: "initiative", "story") → CTO reads them
CTO → work items (type: "spec", parent: story) → Dev reads them
Dev → executes code via adapter → updates work item with prUrl
```

## Navigation (8 items)

| Page | Purpose |
|------|---------|
| Dashboard | Stats, agent cards, activity feed, quick actions |
| Board | Unified work items — list/kanban views |
| Documents | All content — research, notes, emails, blog posts, support |
| Knowledge | 7 company wiki docs |
| Inbox | Filtered view of items needing review |
| Growth | Market research + competitors (domain lens on Documents) |
| Sales | Leads pipeline + CRM |
| Settings | Config, adapters, limits, billing |

## Guards

| Guard | Checks | On failure |
|-------|--------|------------|
| Cost Guard | Daily cap remaining? | Skip + log |
| Autonomy Gate | Mode = stopped? | Skip |
| Rate Limiter | Max calls/hour? | Backoff |
| Circuit Breaker | 5+ fails in 10min? | Pause 30min + alert |

## Hard Limits

| Limit | Default | Purpose |
|-------|---------|---------|
| Tasks per day | 10 | Prevent runaway |
| Daily cost cap | $20 | Budget control |
| LLM calls/agent/hour | 10 | Loop prevention |
| Circuit breaker | 5 fails / 10min | Cascade prevention |
| Knowledge versions | 10 | Storage |
| User edit protection | 72h | Respect edits |

## File Structure

```
packages/backend/convex/autopilot/
├── schema/
│   ├── validators.ts         ← workItemType, workItemStatus, documentType, etc.
│   ├── config.tables.ts      ← Config + credentials + routines
│   ├── knowledge.tables.ts   ← Knowledge docs + versions
│   ├── work.tables.ts        ← autopilotWorkItems (unified work)
│   ├── documents.tables.ts   ← autopilotDocuments (unified content)
│   ├── competitors.tables.ts ← Competitor CRM
│   ├── activity.tables.ts    ← Activity log + runs
│   ├── agents.tables.ts      ← CEO chat threads + messages
│   ├── data.tables.ts        ← Revenue, repo analysis, leads
│   └── index.ts              ← Re-export all tables
├── queries/
│   ├── work.ts               ← listWorkItems, getWorkItem, getChildren
│   ├── documents.ts          ← listDocuments (type/tag/status filters)
│   ├── inbox.ts              ← Unified inbox (needsReview items)
│   ├── knowledge.ts          ← Knowledge docs
│   ├── competitors.ts        ← Competitors
│   ├── leads.ts              ← Leads + sales stats
│   ├── dashboard.ts          ← Dashboard stats
│   ├── activity.ts           ← Activity log with filters
│   ├── config.ts, revenue.ts, threads.ts
│   └── auth.ts               ← Auth helpers
├── mutations/
│   ├── work.ts               ← CRUD work items + inline field updates
│   ├── documents.ts          ← CRUD documents
│   ├── inbox.ts              ← Approve/reject (patches source item)
│   ├── knowledge.ts          ← Update knowledge docs
│   └── config.ts             ← Config + credentials
├── agents/
│   ├── ceo/                  ← Reports, coordination, chat
│   ├── pm/                   ← Work items: initiatives + stories
│   ├── cto.ts                ← Work items: specs
│   ├── growth/               ← Documents + competitors
│   ├── sales.ts              ← Leads + outreach documents
│   ├── support.ts            ← Support thread documents
│   ├── models.ts, prompts.ts, shared.ts
│   └── ceo_tools.ts
├── guards.ts, heartbeat.ts, cost_guard.ts
├── execution.ts, gate.ts, autonomy.ts
├── knowledge.ts, company_brief.ts, onboarding.ts
├── config.ts, revenue.ts, billing_gate.ts
├── health.ts, self_heal.ts, maintenance.ts
├── sales_mutations.ts, routines.ts
└── context.ts, agent_context.ts, priorities.ts
```
