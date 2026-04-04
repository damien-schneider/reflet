# Reflet — Product Vision

## One sentence

Reflet is the world's first fully autonomous AI company — connect your GitHub repository and a team of specialized agents takes over product management, engineering, security, growth, sales, support, and documentation, running your product as a real company while you sleep.

## The shift

Software companies are human bottlenecks chained together. A user requests a feature. It sits in a backlog for weeks. Someone triages it. Someone specs it. Someone builds it. Someone reviews it. Someone deploys it. Someone announces it. Someone follows up. That loop takes weeks, sometimes months. Most features die in the backlog.

Reflet eliminates the loop entirely. Not by automating a step — by replacing the entire company operation. Connect a GitHub repository. In five minutes, Reflet has analyzed the codebase, researched the market, drafted a product strategy, identified who the users are, and started building. The system doesn't wait for instructions. It doesn't wait for feedback. It discovers what needs to be done, decides the priority, executes the work, ships it, announces it, and finds the next prospect who needs it — all autonomously, all transparently, all with a hard stop button.

This is not a coding assistant. This is not a CI/CD pipeline with AI sprinkled in. This is a company. It has a CEO who coordinates strategy and relays the President's vision. A PM who thinks about use cases, features, and priorities based on market research from the Growth team. A CTO who architects solutions. Engineers who ship code. A growth team that researches the market and finds distribution. A sales agent that discovers and converts prospects. A support agent that closes the loop with users. Every agent reads the company's shared board, acts within its role, and contributes back — exactly like employees in a real organization.

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

The user reviews the Company Brief, edits anything that's off, and approves. Meanwhile, agents have already started working — Growth is researching the market, Security is scanning the codebase. The brief approval unlocks the full pipeline: PM starts creating initiatives and stories, CTO starts writing specs, Dev starts building.

## The shared board

There is no orchestrator. There is no dispatcher. Reflet works like a real company: agents communicate through a **shared board** — the same database that holds all the company's knowledge, work, and conversations. Like a Notion workspace that every employee can see.

### Knowledge Base (company wiki)

Living documents that capture who the company is, what it does, and where it's going. Auto-generated at onboarding, maintained by owning agents, read by all agents before every decision.

- **Product Definition** — maintained by PM
- **User Personas & ICP** — maintained by PM
- **Competitive Landscape** — maintained by PM (from Growth's research)
- **Brand Voice & Guidelines** — maintained by Growth
- **Technical Architecture** — maintained by CTO + Architect
- **Goals & OKRs** — maintained by CEO
- **Product Roadmap** — maintained by PM

Every agent reads the knowledge base. No agent acts without understanding the company context first. The user can edit any document at any time — user edits are protected for 72 hours, preventing agents from overwriting the President's decisions.

### Work Board (structured records)

Operational data with strict schemas and exclusive ownership. Like a company's task board, CRM, and issue tracker — everyone can see everything, but only the owner writes.

| Data | Owned by | Purpose |
|------|----------|---------|
| Initiatives | PM | Strategic themes with timelines and success metrics |
| User Stories | PM | "As a [persona], I want..." with acceptance criteria |
| Technical Specs | CTO | Implementation plans, API contracts, DB changes |
| Pull Requests | Dev | Code changes with CI status |
| Competitors | Growth | Structured CRM of competitors (name, URL, pricing, strengths, weaknesses) |
| Leads & Contacts | Sales | Prospects, pipeline stages, outreach history |
| Security Findings | Security | Vulnerabilities with severity and remediation status |
| Support Threads | Support | User conversations with sentiment and escalation |
| Content Items | Growth | Platform-specific drafts with publish status |
| Architecture Decisions | Architect | ADR-format records of technical choices |
| Doc Pages | Docs | Documentation with staleness tracking |

### Documents (Notion-like flexible content)

Any agent can create documents of any type — research reports, analysis, proposals, battlecards, briefs. Like Notion pages that can be tagged, searched, and linked to structured records.

- **Type** is freeform (agents choose or create: "market_research", "prospect_brief", "sales_battlecard", "architecture_analysis", etc.)
- **Tags** are freeform (agents create tags as needed)
- **Linked** to any structured record (a market research doc linked to a competitor, a prospect brief linked to a lead)
- **Status**: draft → published → archived

This is where Growth's market research reports live, Sales' battlecards, PM's analysis notes, and anything else agents produce that doesn't fit a structured table. The Documents page in the UI provides a Notion-like browsing experience with filtering by type, tags, and source agent.

### Notes (informal communication)

Agents leave notes on the board — quick observations, findings, ideas. Like dropping a message in a shared Slack channel. Each agent can only write notes **within its own domain of expertise**, keeping the information clean and trustworthy.

| Agent | Can write notes about |
|-------|----------------------|
| Growth | Market findings, competitor moves, distribution angles, content opportunities |
| Sales | Prospect patterns, feature requests from prospects, pipeline observations |
| Support | User patterns, repeated questions, sentiment shifts |
| Security | Vulnerabilities, CVEs, security risks |
| Architect | Tech debt, code health observations, pattern violations |
| CTO | Technical risks, architecture concerns, migration needs |
| Dev | Bugs found during coding, code quality observations |
| CEO | Cross-agent observations, President directives relayed to team |
| PM | Product priorities, roadmap decisions, triage outcomes |
| Docs | Documentation gaps, stale content |

Notes are ephemeral and lightweight — they feed into PM's triage cycle. For longer-form analysis, agents create Documents instead.

## The agents

### How agents work

There is no cron telling agents when to run. Agents are **condition-driven** — they wake up when there's a reason to work, like real employees who check the board and act when something needs attention.

A lightweight heartbeat (every few minutes) checks each agent's wake conditions. If conditions are met, the agent runs. If not, it sleeps. This means:

- PM wakes up when: planned stories are running low, OR new notes from other agents, OR roadmap is stale, OR the President asked for something
- CTO wakes up when: user stories exist without specs
- Dev wakes up when: specs exist without PRs
- Growth wakes up when: shipped features lack content, OR market research is older than a few days
- Sales wakes up when: new prospects discovered, OR follow-ups are due
- Security wakes up when: daily scan is due, OR new dependency added
- CEO wakes up when: coordination check is due, OR President sent a message

No fixed timers. No "every 6 hours." Agents work when there's work to do and rest when there isn't — exactly like a well-run team.

### Agent roles

**CEO** — The strategic layer. Coordinates across all agents, detects bottlenecks and conflicts, relays President directives to the right employees. When the user says "focus on enterprise this quarter" in the CEO chat, the CEO immediately updates the Goals document and tells PM to reprioritize. Generates daily and weekly reports. The CEO is the President's relay to the team — and the team's relay to the President.

**PM (Product Manager)** — The brain of the company. Doesn't do market research — that's Growth's job. Instead, PM reads Growth's market research notes, user feedback, support patterns, and the knowledge base, then thinks about **what to build**: use cases, features, improvements, fixes. Creates well-structured initiatives with user stories and acceptance criteria. Maintains the roadmap. Ensures the pipeline never runs dry — when planned work is getting low, PM proactively fills it from the roadmap and Growth's latest findings.

**CTO (Chief Technology Officer)** — The technical authority. Checks the board for user stories that need specs. Converts them into self-contained technical specifications detailed enough for autonomous code execution. Understands the codebase architecture, plans migrations, identifies technical risks. When no stories need speccing, reviews architecture and checks for tech debt.

**Dev (Developer)** — The builder. Checks the board for specs ready to build. Creates pull requests through the configured coding adapter (GitHub Copilot, OpenAI Codex, Claude Code, or built-in). Handles CI failures, responds to code review feedback. When no specs are ready, picks up refactoring, dependency updates, or test improvements. Dev never idles.

**Growth** — The market researcher and content creator. Proactively scans the market — Reddit, Hacker News, GitHub trending, competitor activity, community discussions. Leaves notes about what it finds for PM to consume. Also creates distribution content when features ship — posts, replies, articles, changelog announcements. Growth feeds PM with market intelligence and turns shipped work into reach.

**Sales** — Discovers prospects from Growth's market findings, GitHub activity (stargazers, forkers of related repos), social mentions, and community discussions. Manages a pipeline from discovered to converted. Adapts mode based on product maturity — community building and beta user acquisition early, B2B pipeline management later.

**Security** — Continuous vulnerability scanning: dependencies, secrets, OWASP patterns, auth coverage. Leaves notes about findings. Creates fix specs for critical issues. Distinct from Architect — Security finds vulnerabilities, Architect enforces code health.

**Architect** — Enforces codebase health: file size limits, function complexity, test coverage, pattern consistency. Reviews PRs against the Technical Architecture document. Creates architecture decision records and refactoring proposals. Activates after the codebase has enough PRs to review.

**Support** — Triages inbound conversations, drafts responses, escalates bugs and feature requests as notes to PM. Closes the loop with users when their requested features ship. Connects the feedback cycle.

**Docs** — Detects stale documentation, generates user guides from shipped features, maintains FAQ from support patterns. Creates documentation PRs through the coding adapter.

### Phased activation

Not every agent runs from day 1. Like a startup that hires as it grows:

- **Always active**: CEO, PM, CTO, Dev
- **Immediate**: Security (lightweight scans)
- **After 5+ PRs**: Architect
- **After first feature ships**: Growth
- **After ICP defined + content published**: Sales
- **After support channel configured**: Support
- **After 3+ features shipped**: Docs

The user can manually activate any agent early via a "Hire" button.

## The feature lifecycle

Every feature follows a clear path through the company:

```
1. DISCOVER  (Growth)    → Market research finds opportunity, leaves note
2. DEFINE    (PM)        → Reads note, creates initiative + user stories
3. SPEC      (CTO)       → Writes technical specification
4. BUILD     (Dev)       → Creates pull request
5. REVIEW    (Architect) → Code quality review + Security scan
6. SHIP      (Dev)       → Merged and deployed
7. ANNOUNCE  (Growth)    → Distribution content across channels
8. SELL      (Sales)     → Prospects contacted about new capability
9. SUPPORT   (Support)   → User questions handled, feedback collected
10. MEASURE  (PM)        → Reads impact, adjusts roadmap
```

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

Each item supports approve / edit / reject / snooze. Batch actions for efficiency. Smart auto-expire based on priority.

The system monitors inbox size and throttles agent output to prevent overwhelm. The system never floods the user. It degrades gracefully.

## Autonomy modes

Three modes, configurable per organization:

**Supervised (default)** — Agents work autonomously on analysis, research, planning, and drafting. Anything that affects the outside world — PRs, emails, outreach, published content — goes to the inbox for approval.

**Full Auto** — Everything runs autonomously with a delay on external actions. The inbox exists for transparency, not gatekeeping. The user can cancel anything during the delay window.

**Stopped** — All agent activity paused immediately. Preserves all state for resume.

## Safeguards

Every agent execution passes through guards — lightweight middleware checks, not an orchestrator:

- **Cost guard** — per-agent daily budgets, global daily cap, rate limiter (prevents runaway spending)
- **Autonomy gate** — checks if the action needs inbox approval based on the current mode
- **Rate limiter** — max calls per agent per hour (prevents loops)
- **Circuit breaker** — if too many agents fail in a short window, pause everything and alert the President

### Hard limits

| Limit | Default | Purpose |
|-------|---------|---------|
| Active initiatives | 3 | Focus — finish before starting new work |
| User stories per initiative | 20 | Split if bigger |
| Active stories per initiative (WIP) | 5 | Prevent overload |
| Open PRs | 3 | Review bottleneck prevention |
| Pending tasks per agent | 3 | No agent hogs the queue |
| Sales outreach per day | 10 | Reputation protection |
| Content items per day | 5 | Quality over quantity |
| Daily cost cap | $20 | Budget control |
| Task retries | 3 | Exponential backoff |

### Self-correcting company (no manual cleanup needed)

The company corrects itself when things change — like real employees who notice when the product pivots and adjust their work accordingly. No one needs to manually archive old research or cancel outdated tasks.

**Fail loud, never guess.** If an agent can't find the Product Definition or any critical knowledge doc, it stops and alerts the CEO — it doesn't fall back to generic text. Missing knowledge means the company doesn't know what it's building. That's a CEO-level problem, not a "use default" situation. No silent fallbacks anywhere.

**Knowledge change cascading.** Every knowledge doc tracks what depends on it. When the Product Definition changes (user edits it, or PM updates it based on new research), all downstream data gets automatically flagged as stale:
- Product Definition changes → Competitive Landscape, ICP, Brand Voice, Roadmap all flagged
- Competitive Landscape changes → Growth content items reviewed, Sales battlecards flagged
- Goals/OKRs change → PM reprioritizes roadmap, existing initiatives re-evaluated

Agents see the staleness flags on their next wake and act: re-research competitors, re-evaluate initiatives, archive content that's off-brand. The company naturally realigns without anyone telling it to.

**Bottom-up change propagation.** When an agent discovers something that contradicts the knowledge base — Growth finds the market has shifted, Sales discovers users want something different, Support sees a pattern that doesn't match the ICP — the agent doesn't just leave a note. It proposes a knowledge doc update. PM or CEO reviews and approves the change, which then cascades downstream. The company evolves from both top-down (President directives) and bottom-up (agent discoveries).

**Automatic archival.** When a knowledge doc changes significantly (> threshold of content change), agents automatically:
- Archive documents that reference the old version (market research, battlecards)
- Cancel pending tasks that were based on outdated context
- Flag in_progress work for review ("the Product Definition changed — does this task still make sense?")
- Re-queue discovery work (Growth researches the new market position, Sales re-evaluates prospects)

The result: the President can say "we're pivoting from recording to live streaming" in the CEO chat, CEO updates the Product Definition, and within hours every agent has realigned — old competitors archived, new market research running, existing tasks reviewed, new initiatives created. No manual cleanup.

### Self-cleaning (per-agent hygiene)

Each agent cleans its own domain when it wakes up — cancels stale work, retries failed items, archives old completed work. The CEO coordination check detects system-wide issues: bottlenecks, starvation, conflicts between agents.

### Graceful degradation

The system never fully stops (except on explicit President stop or budget exhaustion):

| Condition | Behavior |
|-----------|----------|
| Budget 80% used | Skip non-critical agents, keep PM + Dev + Security |
| Budget exhausted | Stop all, CEO sends summary |
| Agent repeatedly failing | Disable that agent, alert CEO |
| User inactive 7+ days | Essential mode only, CEO sends email digest |

## Provider-agnostic coding

The user chooses how code gets written:

- **Built-in** — AI SDK + GitHub API. Cheapest, uses free models first.
- **GitHub Copilot** — Creates issues, assigns to `copilot-swe-agent[bot]`.
- **OpenAI Codex** — Dispatches workflow, OpenAI manages the container.
- **Claude Code** — Creates issues with `@claude`, triggers GitHub Action.

All adapters implement the same interface.

## Revenue and costs

Stripe Connect integration captures daily revenue snapshots (MRR, ARR, churn, subscriptions). Revenue alerts fire on significant MRR changes.

Every agent execution tracks tokens used and estimated cost. The dashboard shows daily cost, per-agent cost, and trends. Per-agent daily budgets prevent any single agent from burning the global cap.

## The full loop

This is what makes Reflet different from every AI coding tool. It's not a point solution. It's every function of a product company, connected and proactive:

```
Growth researches the market → PM reads findings and creates use cases
→ CTO specs them → Dev builds PRs → Architect reviews → Security scans
→ Shipped → Growth announces → Sales contacts prospects
→ Support handles users → PM reads impact → Roadmap adjusts
→ Growth researches again → next cycle
```

Meanwhile: CEO coordinates, Docs stay in sync, revenue is tracked, knowledge base evolves, and the President steers from the inbox and CEO chat.

Every agent is proactive. Every agent reads the company's shared board. Every agent contributes back. Notes flow from any agent to PM. Directives flow from the President through CEO to everyone. The company runs itself — discovering, building, shipping, growing, selling — 24 hours a day, 7 days a week.

## Future: The Reflet SDK

Today, agents that need production data (error tracking, analytics, performance monitoring) are deferred until the product matures. The long-term vision: a `@reflet/sdk` package that the CTO agent installs into the codebase via a normal PR. This SDK captures errors, user events, and performance metrics — sending them directly back to Convex where future Analytics and Ops agents consume them natively. The company sets up its own monitoring infrastructure, the way a real engineering team would.

## Tech stack

Next.js 16, React 19, Convex (real-time backend), AI SDK v6 with OpenRouter (model fallback chains, free models first), Resend (email), Stripe (billing + revenue tracking), TailwindCSS + shadcn/ui, Turborepo + Bun, Better-Auth. Zero self-hosted infrastructure — everything runs on managed services.
