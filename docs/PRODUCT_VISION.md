# Reflet — Product Vision

## One sentence

Reflet is the world's first fully autonomous AI company — connect your GitHub repository and a team of specialized agents takes over product management, engineering, security, growth, sales, support, and documentation, running your product as a real company while you sleep.

## The shift

Software companies are human bottlenecks chained together. A user requests a feature. It sits in a backlog for weeks. Someone triages it. Someone specs it. Someone builds it. Someone reviews it. Someone deploys it. Someone announces it. Someone follows up. That loop takes weeks, sometimes months. Most features die in the backlog.

Reflet eliminates the loop entirely. Not by automating a step — by replacing the entire company operation. Connect a GitHub repository. In five minutes, Reflet has analyzed the codebase, researched the market, drafted a product strategy, identified who the users are, and started building. The system doesn't wait for instructions. It doesn't wait for feedback. It discovers what needs to be done, decides the priority, executes the work, ships it, announces it, and finds the next prospect who needs it — all autonomously, all transparently, all with a hard stop button.

This is not a coding assistant. This is not a CI/CD pipeline with AI sprinkled in. This is a company. It has a CEO who coordinates strategy. A PM who researches markets and writes product briefs. A CTO who architects solutions. Engineers who ship code. A growth team that finds distribution. A sales agent that discovers and converts prospects. A support agent that closes the loop with users. Every agent reads the company's shared knowledge, acts within its role, and contributes back — exactly like employees in a real organization.

The reference point is NanoCorp — autonomous AI companies that build products from scratch. Reflet does the same thing, but for **existing products**. You already have a codebase, users, feedback, revenue. Reflet takes over the execution. The ambition is simple: connect a codebase, and the company builds the next Spotify — fully autonomously.

## How it works

The user pastes a GitHub repo URL. That's it. That's the entire onboarding.

In the first five minutes, Reflet produces a **Company Brief** — a complete set of founding documents generated from the codebase, README, landing page, and market analysis:

- **Product Definition** — What the product is, its core value proposition, key features
- **User Personas & ICP** — Who uses this product, who would pay for it
- **Competitive Landscape** — Who else solves this problem, their strengths and weaknesses
- **Brand Voice** — How the company communicates, inferred from existing copy
- **Technical Architecture** — Tech stack, patterns, conventions, code health
- **Initial Roadmap** — 3-5 prioritized initiatives based on market gaps and codebase analysis
- **Starter Goals** — Sensible OKRs seeded from product maturity level

The user reviews the Company Brief, edits anything that's off, and approves. The company starts running.

From that moment, every agent reads the shared knowledge base before acting, produces work within its exclusive domain, and contributes signals that other agents consume. The system is proactive — agents don't wait to be told what to do. They research, discover, propose, and execute. When an agent notices something — a trending Reddit thread, a security vulnerability, a support pattern — it raises a signal. The PM triages signals into the roadmap. The cycle never stops.

## The three data layers

Reflet's agents communicate the way real company employees do — through shared knowledge, structured operational data, and informal signals. Not through hardcoded function calls.

### Layer 1: Knowledge Base (company DNA)

Living documents that capture who the company is, what it does, and where it's going. Auto-generated at onboarding, maintained by specific agents, read by all agents before every decision.

- **Product Definition** — maintained by PM
- **User Personas & ICP** — maintained by PM
- **Competitive Landscape** — maintained by PM
- **Brand Voice & Guidelines** — maintained by Growth
- **Technical Architecture** — maintained by CTO + Architect
- **Goals & OKRs** — maintained by CEO
- **Product Roadmap** — maintained by PM

Every agent reads the knowledge base. No agent acts without understanding the company context first. The user can edit any document at any time — user edits are protected for 72 hours, preventing agents from overwriting the President's decisions.

### Layer 2: Structured Records (company tools)

Operational data with strict schemas and exclusive ownership. Like a company's task board, CRM, and issue tracker — everyone can see everything, but only the owner writes.

| Data | Owned by | Purpose |
|------|----------|---------|
| Initiatives | PM | Strategic themes with timelines and success metrics |
| User Stories | PM | "As a [persona], I want..." with acceptance criteria |
| Technical Specs | CTO | Implementation plans, API contracts, DB changes |
| Dev Tasks | CTO | Atomic work items linked to specs |
| Pull Requests | Dev | Code changes with CI status |
| Leads & Contacts | Sales | Prospects, pipeline stages, outreach history |
| Security Findings | Security | Vulnerabilities with severity and remediation status |
| Support Threads | Support | User conversations with sentiment and escalation |
| Content Items | Growth | Platform-specific drafts with publish status |
| Architecture Decisions | Architect | ADR-format records of technical choices |
| Doc Pages | Docs | Documentation with staleness tracking |

### Layer 3: Signals (company conversations)

Ephemeral observations that bubble up from any agent — the equivalent of a Slack message saying "hey, I noticed something." Any agent can write signals. The PM triages them into the roadmap or dismisses them.

Signal types: `market_opportunity`, `feature_request_pattern`, `technical_debt`, `security_alert`, `competitive_move`, `user_sentiment_shift`, `growth_insight`, `initiative_proposal`.

This is how agents "dream." A Sales agent notices five prospects asking about the same missing feature. Support sees a pattern in user complaints. Growth spots a viral discussion about the problem space. Each raises a signal. The PM synthesizes them into product decisions. Bottom-up initiative, exactly like a real company where any employee can propose an idea.

## The agents

### Always active (founders)

**CEO** — The strategic layer. Coordinates across all agents, detects bottlenecks and conflicts, relays President directives, generates daily and weekly reports. The CEO reads everything and ensures the company moves in a coherent direction. When the user says "focus on enterprise this quarter," the CEO translates that into updated goals and strategy memos that every agent respects. Runs a coordination loop every 4 hours to catch cross-agent issues.

**PM (Product Manager)** — The brain of the company. Proactively researches the market — scanning Reddit, Hacker News, GitHub trending, competitor repositories, community discussions — not waiting for feedback to arrive. Synthesizes all signals (market research, user feedback, support escalations, competitive moves) into a prioritized roadmap. Creates structured initiatives with user stories and acceptance criteria. Maintains the Product Definition, User Personas, and Competitive Landscape. The PM ensures the company always knows what to build next and why.

**CTO (Chief Technology Officer)** — The technical authority. Converts PM's user stories into self-contained technical specifications detailed enough for autonomous code execution. Understands the codebase architecture, plans migrations, identifies technical risks, and creates dev tasks. Maintains the Technical Architecture document. When PM creates a story, CTO produces the spec. When Architect flags a code health issue, CTO plans the remediation.

**Dev (Developer)** — The builder. Executes technical specs by creating pull requests through the configured coding adapter (GitHub Copilot, OpenAI Codex, Claude Code, or built-in). Handles CI failures, responds to code review feedback, and picks up maintenance work when no specs are pending. Dev never idles — if there's no feature work, there's refactoring, dependency updates, or test improvements.

### Phased activation (hired when relevant)

**Security** — Activates immediately for lightweight daily scans. Continuous vulnerability scanning: dependencies, secrets, OWASP patterns, auth coverage. Raises signals for findings, creates fix specs for critical issues. Distinct from Architect — Security finds vulnerabilities, Architect enforces code health.

**Architect** — Activates after 5+ PRs merged. Enforces codebase health: file size limits, function complexity, test coverage, pattern consistency. Reviews PRs against the Technical Architecture document. Creates architecture decision records and refactoring proposals.

**Growth** — Activates when the first user-facing feature ships. Finds distribution channels. Creates platform-specific content — Reddit replies, LinkedIn posts, Twitter threads, Hacker News comments, blog articles, changelog announcements. Searches for relevant conversations where the product can add value. Maintains the Brand Voice document. Everything is pre-written and goes to the inbox for approval.

**Sales** — Activates when ICP is defined and Growth has published at least one content item. Discovers prospects from GitHub activity (stargazers, forkers of related repos), social mentions, community discussions, and web searches. Manages a pipeline from discovered to converted. Adapts its mode based on product maturity — community building and beta user acquisition early, B2B pipeline management later.

**Support** — Activates when support channels are configured. Triages inbound conversations, drafts responses, escalates bugs and feature requests as signals to PM. Closes the loop with users when their requested features ship. Connects the feedback cycle — users feel heard in minutes, not weeks.

**Docs** — Activates after 3+ features shipped. Detects stale documentation, generates user guides from shipped features, maintains FAQ from support patterns. Creates documentation PRs through the coding adapter. Docs never lag behind the product.

## The feature lifecycle

Every feature follows a clear path through the company, with specific handoffs and artifacts at each step:

```
1. DISCOVER  (PM)        → Market signal or user feedback detected
2. DEFINE    (PM)        → Initiative created with user stories and acceptance criteria
3. SPEC      (CTO)       → Technical specification with implementation plan
4. BUILD     (Dev)       → Pull request with code changes
5. REVIEW    (Architect) → Code quality review + Security scan
6. SHIP      (Dev)       → Merged and deployed
7. ANNOUNCE  (Growth)    → Distribution content across channels
8. SELL      (Sales)     → Prospects contacted about new capability
9. SUPPORT   (Support)   → User questions handled, feedback collected
10. MEASURE  (PM)        → Success metrics evaluated, roadmap adjusted
```

The UI shows this lifecycle visually. The user sees exactly where every initiative is, what's blocked, what's progressing, and what's next.

## The inbox

Every agent output that needs human attention flows to a central inbox:

- PR ready for review (Dev)
- Content ready to publish (Growth)
- Outreach draft to approve (Sales)
- Support reply to send (Support)
- Security vulnerability found (Security)
- Architecture violation flagged (Architect)
- New initiative proposed (PM)
- CEO weekly report (CEO)
- Revenue alert (system)

Each item supports approve / edit / reject / snooze. Batch actions for efficiency ("approve all Growth posts for Initiative X"). Smart auto-expire based on priority (5 days for low, 30 days for critical).

### Inbox pressure management

The system monitors inbox size and throttles agent output to prevent overwhelm:
- \>20 pending: Agents reduce low-priority output by 50%
- \>40 pending: Only critical items (security, bugs) get created
- \>60 pending: CEO sends a summary with suggested bulk actions

The system never floods the user. It degrades gracefully.

## Autonomy modes

Three modes, configurable per organization:

**Supervised (default)** — Agents work autonomously on analysis, research, planning, and drafting. Anything that affects the outside world — PRs, emails, outreach, published content — goes to the inbox for approval.

**Full Auto** — Everything runs autonomously with a 15-minute delay on external actions (PRs, emails, content). The inbox exists for transparency, not gatekeeping. The user can cancel anything during the delay window.

**Stopped** — All agent activity paused immediately. Preserves all state for resume. The hard stop button.

## Safeguards and limits

The system is designed around the principle: **never block, always degrade.**

### Hard limits

| Limit | Default | Purpose |
|-------|---------|---------|
| Active initiatives | 3 | Focus — finish before starting new work |
| User stories per initiative | 20 | Split if bigger |
| Active stories per initiative (WIP) | 5 | Prevent overload |
| Open PRs | 3 | Review bottleneck prevention |
| Concurrent agent executions | 3 | Resource control |
| Pending tasks per agent | 3 | No agent hogs the queue |
| Pending tasks total | 15 | Bounded backlog |
| Signals per agent per day | 20 | Prevent signal spam |
| Signals total per day | 100 | Hard ceiling on noise |
| Sales outreach per day | 10 | Reputation protection |
| Content items per day | 5 | Quality over quantity |
| LLM calls per agent per hour | 10 | Loop prevention |
| Daily cost cap | $20 | Budget control |
| 5-minute cost rate | $2 max | Runaway prevention |
| Task retries | 3 | Exponential backoff: 1min, 5min, 30min |
| Circuit breaker | 5 failures in 10min → pause 30min | Cascade prevention |

### Priority and ordering

Priorities follow a strict hierarchy:
1. **President directives** — user commands override everything
2. **Goal alignment** — tasks contributing to current OKRs rank higher
3. **Urgency** — security critical > user-facing bug > feature > refactoring
4. **Initiative completion** — tasks for nearly-done initiatives get a boost (+20% at >60% complete)
5. **Age** — pending tasks gain +5% priority per day to prevent starvation

### Graceful degradation

| Condition | System behavior |
|-----------|----------------|
| LLM provider down | Queue tasks, exponential backoff, switch to fallback model chain |
| Budget 80% used | Skip non-critical agents, keep PM + Dev + Security |
| Budget 100% used | Stop all agents, CEO sends summary |
| Inbox overflowing | Throttle agent output progressively |
| Agent repeatedly failing | Disable after 3 consecutive failures, alert CEO |
| CTO bottleneck detected | Dev picks up maintenance work |
| No signals or feedback | PM shifts to proactive market research |
| User inactive 7+ days | Reduce to essentials (security, cost tracking), CEO sends email digest |

### Data integrity

- Knowledge docs keep version history (max 10 versions per doc)
- User edits are protected for 72 hours — agents can't overwrite
- Authority hierarchy: President > CEO > PM > individual agents
- Signals deduplicate by content similarity within 7-day windows
- Initiatives deduplicate by title/description overlap >70%

## Provider-agnostic coding

The user chooses how code gets written:

- **Built-in** — AI SDK + GitHub API. Cheapest, uses free models first.
- **GitHub Copilot** — Creates issues, assigns to `copilot-swe-agent[bot]`.
- **OpenAI Codex** — Dispatches workflow, OpenAI manages the container.
- **Claude Code** — Creates issues with `@claude`, triggers GitHub Action.

All adapters implement the same interface. The orchestrator doesn't care which one runs.

## The orchestrator

A Convex cron running every 2 minutes. Pure state machine, no LLM. Scans organizations with pending work, respects the task DAG, checks daily throttles, allocates the 3 concurrent execution slots by priority, and dispatches to the right agent. The PM refills the queue through market research and signal triage. The orchestrator drains it. The cycle never stops.

### Bottleneck and starvation detection

The CEO coordination loop (every 4 hours) monitors the full pipeline:
- If any lifecycle stage has >3x items compared to the next stage, it's a bottleneck — alert generated
- If any task has been pending >3 days, it's starving — priority boost applied
- If any initiative hasn't progressed in 3 days, it's stuck — CEO investigates

## Revenue and costs

Stripe Connect integration captures daily revenue snapshots (MRR, ARR, churn, subscriptions). Revenue alerts fire on significant MRR changes.

Every task and run tracks tokens used and estimated cost. The dashboard shows daily cost, per-agent cost, and trends. Per-agent daily budgets prevent any single agent from burning the global cap.

## The full loop

This is what makes Reflet different from every AI coding tool. It's not a point solution. It's every function of a product company, connected and proactive:

```
Market research discovers opportunity → PM creates initiative → CTO writes spec
→ Dev builds PR → Architect reviews → Security scans → Merged and deployed
→ Growth announces across channels → Sales contacts discovered prospects
→ Support handles user questions → PM measures impact → Roadmap adjusts
→ Agents raise new signals → PM synthesizes → Next cycle begins
```

Meanwhile: CEO oversees everything, Docs stay in sync, revenue is tracked, knowledge base evolves, and the President steers from the inbox and CEO chat.

Every agent is proactive. Every agent reads the company's shared knowledge. Every agent contributes back. Bottom-up signals flow from any agent to PM. Top-down directives flow from the President through CEO to everyone. The company runs itself — discovering, building, shipping, growing, selling — 24 hours a day, 7 days a week.

NanoCorp creates businesses from scratch. Reflet runs existing ones. That's a larger market — every product with a GitHub repo is a potential customer. And because Reflet generates its own founding knowledge from the codebase, the company has real context from minute one.

## Tech stack

Next.js 16, React 19, Convex (real-time backend + orchestration), AI SDK v6 with OpenRouter (model fallback chains, free models first), Resend (email), Stripe (billing + revenue tracking), TailwindCSS + shadcn/ui, Turborepo + Bun, Better-Auth. Zero self-hosted infrastructure — everything runs on managed services.

## Future: The Reflet SDK

Today, agents that need production data (error tracking, analytics, performance monitoring) are deferred until the product matures. The long-term vision: a `@reflet/sdk` package that the CTO agent installs into the codebase via a normal PR. This SDK captures errors, user events, and performance metrics — sending them directly back to Convex where the Analytics and Ops agents consume them natively. No PostHog setup. No Sentry configuration. The company sets up its own monitoring infrastructure, the way a real engineering team would — except the CTO does it autonomously.
