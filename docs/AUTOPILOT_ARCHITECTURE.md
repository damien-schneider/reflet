# Autopilot Architecture

Living document — maintain whenever the architecture changes.

## Core Design Principles

1. **No orchestrator.** Agents own their work. They check the shared board, find what needs doing, and do it — like employees, not microservices.
2. **Condition-driven, not cron-driven.** Agents wake up when there's a reason to work, not on fixed timers. A lightweight heartbeat checks conditions and wakes agents when needed.
3. **Shared board, not function calls.** Agents communicate through data on a shared board (the database). No agent calls another agent directly.
4. **Guards, not gatekeepers.** Cost limits, autonomy checks, and rate limits are middleware that wraps every execution — not a centralized dispatcher.
5. **Self-cleaning by default.** Each agent tidies its own domain when it wakes up. CEO handles system-wide health.
6. **Never block, always degrade.** The system always has a next action. When resources are constrained, it does less — never nothing.

## Agent Hierarchy

```
President (User)
  └── CEO — Strategy, coordination, relays President directives
        ├── PM — Product decisions, roadmap, stories (consumes Growth's research)
        │     └── CTO — Technical specs from PM's stories
        │           └── Dev — Code from CTO's specs
        ├── Growth — Market research + distribution (feeds PM with findings)
        ├── Sales — Prospecting + pipeline (reads Growth's findings + PM's ICP)
        ├── Security — Vulnerability scanning
        ├── Architect — Code health + PR review
        ├── Support — User conversations + escalation
        └── Docs — Documentation freshness
```

## The Shared Board

All agents read from and write to the same database. Three types of data:

### Knowledge Base (company wiki — slow-changing)

| Document | Owner | Read by |
|----------|-------|---------|
| Product Definition | PM | Everyone |
| User Personas & ICP | PM | Sales, Growth, Support |
| Competitive Landscape | PM (from Growth's research) | Growth, Sales, CEO |
| Brand Voice | Growth | Support, Docs, Sales |
| Technical Architecture | CTO + Architect | Dev, Security |
| Goals & OKRs | CEO | PM, everyone |
| Product Roadmap | PM | CEO, CTO, Growth |

**Rules:**
- Versioned (max 10 versions per doc)
- User edits protected 72h — agents can't overwrite
- Authority: President > CEO > PM > individual agents
- Staleness alerts when docs aren't updated within threshold

### Work Board (structured records — active work)

| Record | Owner (write) | Wake condition for consumers |
|--------|--------------|------------------------------|
| Initiatives | PM | CTO checks for stories to spec |
| User Stories | PM | CTO checks for stories without specs |
| Technical Specs | CTO | Dev checks for specs without PRs |
| Pull Requests | Dev | Architect + Security review on creation |
| Leads & Contacts | Sales | — |
| Security Findings | Security | CTO/Dev when critical fixes needed |
| Support Threads | Support | PM reads for patterns |
| Content Items | Growth | — (goes to inbox) |
| Architecture Decisions | Architect | CTO, Dev reference |
| Doc Pages | Docs | — |

### Notes (domain-restricted agent communication)

Agents leave notes on the board, but **each agent can only write notes within its domain of expertise**. This keeps data clean — you'll never get a Dev agent writing market research that PM mistakenly acts on.

| Agent | Can write notes about |
|-------|----------------------|
| Growth | Market findings, competitor moves, distribution angles |
| Sales | Prospect patterns, feature requests from prospects |
| Support | User patterns, repeated questions, sentiment shifts |
| Security | Vulnerabilities, CVEs, security risks |
| Architect | Tech debt, code health observations, pattern violations |
| CTO | Technical risks, architecture concerns, migration needs |
| Dev | Bugs found during coding, code quality observations |
| CEO | Cross-agent observations, President directives to team |
| PM | Product priorities, roadmap decisions, triage outcomes |
| Docs | Documentation gaps, stale content |

**Rules:**
- Schema: author, title, content, priority, noteCategory (matches agent domain), timestamp
- Ephemeral — auto-archived after 30 days if not acted on
- Deduplicated by content similarity (same observation from multiple agents merges)
- PM reads ALL notes as input for product decisions
- Every agent reads all notes for context, but only writes in its own domain

## How Agents Wake Up (Condition-Driven)

A lightweight heartbeat runs every few minutes. For each agent, it checks wake conditions. If met, the agent runs. If not, it sleeps.

| Agent | Wakes up when |
|-------|---------------|
| **CEO** | President sent a message, OR coordination check due (every ~4h), OR report due |
| **PM** | Planned stories running low (< threshold), OR new notes from agents, OR roadmap stale, OR President directive via CEO |
| **CTO** | User stories exist without technical specs |
| **Dev** | Technical specs exist without PRs, OR CI fix needed |
| **Growth** | Shipped features without content, OR market research older than a few days |
| **Sales** | New notes about prospects, OR follow-ups due, OR Growth found new leads |
| **Security** | Daily scan due, OR new dependency added via PR |
| **Architect** | New PR to review, OR weekly code health check due |
| **Support** | New conversation received (event-driven), OR daily check for missed items |
| **Docs** | PR merged with API changes, OR weekly staleness check due |

**Key property:** No agent depends on another agent to "tell it" to work. Each checks its own conditions against the shared board.

## Agent Execution Flow

Every agent execution follows the same pattern:

```
1. GUARDS     — Cost check → Autonomy check → Rate limit → Circuit breaker
2. CLEAN      — Cancel own stale tasks, retry own failed items, archive old work
3. CONTEXT    — Load knowledge base summaries + domain-specific records + recent notes
4. WORK       — Check domain conditions → decide what to do → execute via LLM
5. OUTPUT     — Write records/notes/inbox items to the shared board
6. LOG        — Record activity + cost
```

## Guards (Middleware)

Guards wrap every agent execution. They are NOT an orchestrator — they're checks, like building security badges.

| Guard | What it checks | On failure |
|-------|---------------|------------|
| Cost Guard | Agent budget remaining? Global budget? | Skip + log |
| Autonomy Gate | Mode = stopped? Action needs approval? | Skip or route to inbox |
| Rate Limiter | Max LLM calls/hour exceeded? | Backoff + retry later |
| Circuit Breaker | 5+ agent failures in 10 min? | Pause all 30 min + alert President |

## Agent Context Loading

Every agent loads company context before its LLM call:

| Context tier | ~Tokens | Contents |
|-------------|---------|----------|
| Always loaded | 2K | Product Definition (summary), Goals, President directives |
| Domain-specific | 4K | Agent's own knowledge docs (full), relevant records |
| Situational | 3K | Recent notes (relevant to domain), active initiatives |
| Task-specific | 4K | The specific work item being processed |
| **Total ceiling** | **~13K** | Before the agent's own system prompt |

## CEO: The Relay + Coordinator

The CEO has two modes:

**Event-driven (President interaction):**
When the President sends a message via CEO chat, the CEO:
1. Interprets the directive
2. Updates Goals/strategy docs if needed
3. Creates notes or stories directed at specific agents
4. Responds to the President with what actions were taken

**Periodic (coordination check):**
Every ~4 hours, the CEO:
1. Checks for bottlenecks (stories piling up without specs?)
2. Checks for starvation (any agent with 0 work for 3+ days?)
3. Checks for conflicts (contradictory knowledge docs?)
4. Generates reports for the President

## PM + Growth Collaboration

PM doesn't do market research. Growth does. PM consumes Growth's findings to make product decisions.

```
Growth (wakes when research is stale):
  1. Searches Reddit, HN, GitHub trending, competitor repos
  2. Leaves notes: "market_opportunity", "competitive_move", etc.
  3. Creates content for shipped features → inbox

PM (wakes when stories are low or new notes exist):
  1. Reads Growth's notes + user feedback + support patterns
  2. Thinks: what use cases / features / improvements / fixes?
  3. Creates initiatives + user stories with priorities
  4. Updates roadmap

CTO (wakes when stories without specs exist):
  1. Reads PM's user stories
  2. Writes technical specs
  
Dev (wakes when specs without PRs exist):
  1. Reads CTO's specs
  2. Builds PRs via coding adapter
```

## Onboarding

```
1. User connects GitHub repo
2. System analyzes repo → generates Company Brief (7 knowledge docs)
3. Agents start immediately (Growth researches, Security scans)
4. User reviews + edits + approves Company Brief
5. Approval unlocks full pipeline (PM creates stories, CTO specs, Dev builds)
```

No hard gate. Agents do background work while waiting for approval.

## Phased Activation

| Agent | Activates when | Manual override |
|-------|---------------|-----------------|
| CEO, PM, CTO, Dev | Always active | — |
| Security | Immediately (lightweight) | — |
| Architect | 5+ PRs merged | "Hire" button |
| Growth | First feature shipped | "Hire" button |
| Sales | ICP defined + content published | "Hire" button |
| Support | Support channel configured | "Hire" button |
| Docs | 3+ features shipped | "Hire" button |

Dormant agents still READ the board (build context). Deactivation pauses, not deletes.

## Hard Limits

| Limit | Default | Configurable | Purpose |
|-------|---------|-------------|---------|
| Active initiatives | 3 | Yes (1-10) | Focus — finish before starting |
| Stories per initiative | 20 | No | Split if larger |
| Active stories per initiative | 5 | Yes (3-10) | WIP control |
| Open PRs | 3 | Yes (1-10) | Review bottleneck prevention |
| Pending tasks per agent | 3 | Yes (1-10) | Anti-hogging |
| Sales outreach per day | 10 | Yes (0-50) | Reputation |
| Content items per day | 5 | Yes (0-20) | Quality > quantity |
| LLM calls per agent per hour | 10 | No | Loop prevention |
| Daily cost cap | $20 | Yes (by plan) | Budget |
| Agent cost rate (5 min) | $2 max | No | Runaway prevention |
| Task retries | 3 | No | Backoff: 1min, 5min, 30min |
| Circuit breaker | 5 fails / 10min | No | Cascade prevention |
| Note retention (unacted) | 30 days | No | Hygiene |
| Knowledge doc versions | 10 | No | Storage |
| User edit protection | 72 hours | No | Respect user changes |

## Priority System

When multiple items compete for an agent's attention:

1. **President directives** — always first
2. **Goal alignment** — contributes to active OKRs
3. **Urgency** — critical > bug > feature > refactor
4. **Initiative completion boost** — +20% at >60% done (finish what you started)
5. **Age boost** — +5% per day pending (prevent starvation)
6. **Note strength** — multiple agents noted the same thing = higher priority

## Self-Cleaning

**Per-agent (every wake cycle):**
- Cancel own tasks pending > 7 days
- Retry own failed tasks (if < max retries)
- Archive completed work older than 30 days

**CEO coordination (every ~4h):**
- Detect bottlenecks (stage X has 3x items vs. stage Y)
- Detect starvation (agent has 0 work for 3+ days)
- Detect conflicts (contradictory knowledge docs)
- Circuit breaker (cascade failure detection)

## Graceful Degradation

| Condition | Behavior |
|-----------|----------|
| LLM provider down | Queue, backoff, fallback model chain |
| Budget 80% used | Skip Growth, Docs, Sales — keep PM + Dev + Security |
| Budget exhausted | Stop all, CEO sends summary |
| Agent 3x consecutive fails | Disable agent, CEO alert |
| User inactive 7+ days | Essential mode (Security + cost tracking), CEO email digest |

## File Structure

```
packages/backend/convex/autopilot/
├── schema/                   ← Table definitions split by domain
│   ├── validators.ts         ← Shared validators (unions, enums)
│   ├── config.tables.ts      ← Config + credentials
│   ├── knowledge.tables.ts   ← Knowledge docs + versions
│   ├── records.tables.ts     ← Initiatives, stories, specs, etc.
│   ├── notes.tables.ts       ← Agent notes (was "signals")
│   ├── agents.tables.ts      ← Threads, messages, metrics
│   ├── comms.tables.ts       ← Emails, growth items, inbox
│   ├── data.tables.ts        ← Revenue, repo analysis, leads, findings
│   └── index.ts              ← Re-export merged tables
├── knowledge.ts              ← Knowledge doc CRUD, versioning, staleness
├── notes.ts                  ← Note creation, dedup, cleanup
├── initiatives.ts            ← Initiative CRUD, WIP limits
├── user_stories.ts           ← Story CRUD, status transitions
├── guards.ts                 ← Cost, autonomy, rate limit, circuit breaker
├── heartbeat.ts              ← Condition checker — wakes agents when needed
├── config.ts                 ← Org configuration
├── onboarding.ts             ← Repo analysis → Company Brief
├── company_brief.ts          ← Generate 7 knowledge docs
├── inbox.ts                  ← Inbox management, pressure tracking
├── tasks.ts                  ← Task lifecycle, priorities
├── cost_guard.ts             ← Per-agent budgets, rate limits
├── self_heal.ts              ← CEO-level system health checks
├── execution.ts              ← Coding adapter dispatch
├── agents/
│   ├── ceo/                  ← Reports, coordination, chat relay
│   ├── pm/                   ← Story creation, roadmap, note triage
│   ├── cto/                  ← Spec generation, architecture
│   ├── dev/                  ← PR creation via adapters
│   ├── growth/               ← Market research, content creation
│   ├── sales/                ← Prospecting, pipeline, outreach
│   ├── security.ts           ← Vulnerability scanning
│   ├── architect.ts          ← Code health, ADRs
│   ├── support.ts            ← Conversation triage
│   ├── docs.ts               ← Documentation freshness
│   ├── models.ts             ← LLM model definitions
│   ├── prompts/              ← Per-agent system prompts
│   └── shared.ts             ← generateObjectWithFallback, context loader
├── queries/                  ← Frontend-facing queries
├── mutations/                ← Frontend-facing mutations
└── adapters/                 ← Coding adapter implementations
```
