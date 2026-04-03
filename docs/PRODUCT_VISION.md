# Reflet — Product Vision

## One sentence

Reflet is an autonomous AI company running your existing product — paste your GitHub repo, get a full team of 12 specialized agents handling product management, engineering, security, support, analytics, documentation, ops, and growth while you sleep.

## The shift

Reflet started as a feedback and roadmap platform: collect user feedback, prioritize features, publish changelogs. That foundation stays — it's the signal layer. What changes is what happens after the signal arrives.

Today, a feedback item gets upvoted, sits in a backlog, waits for a human to spec it, assign it, build it, review it, merge it, announce it. That loop takes weeks. With Autopilot, that loop runs in hours, autonomously, with full transparency and a hard stop button.

The reference point is NanoCorp — autonomous AI companies that build products from scratch. Reflet does the same thing, but for **existing products**. You already have a codebase, users, feedback, revenue. Reflet takes over the execution.

## How it works

The user pastes a GitHub repo URL. Reflet analyzes the codebase (tech stack, architecture, patterns, conventions) and spins up a team of specialized AI agents:

**CEO** — always-on chat panel. Strategic advisor with access to everything: feedback, tasks, revenue, agent activity. Sends periodic reports to the inbox. The human's primary interface for steering the product.

**PM** — watches feedback signals (votes, AI-assessed priority, competitor gaps, revenue impact) and produces a prioritized, auto-filled task board. No manual triage. New feedback comes in, tasks appear.

**CTO** — converts PM tasks into self-contained technical specs. Reads the codebase, understands the architecture, produces implementation prompts detailed enough for a coding agent to execute autonomously.

**Dev** — executes code changes. The user picks their coding backend: GitHub Copilot, OpenAI Codex, Claude Code, or a built-in adapter using AI SDK + GitHub API. Each adapter handles its own sandbox and tooling. PRs appear automatically.

**Security** — continuous vulnerability scanning. Checks dependencies, secrets, OWASP patterns, auth coverage. Auto-creates fix PRs for issues it can resolve.

**Architect** — enforces AGENTS.md rules and codebase health. Reviews every PR. Flags files over 400 lines, functions over 50 lines, barrel files, type safety issues, test coverage gaps. Creates refactoring PRs.

**Growth** — turns shipped work into distribution. Finds relevant Reddit/HN/LinkedIn threads, generates platform-specific content (replies, posts, tweets, blog articles, changelog announcements). Everything pre-written, one click to publish.

**Support** — the user-facing loop. Watches inbound emails, support conversations, and feedback threads. Drafts responses to common questions, escalates bugs to PM as tasks, and closes the loop with users when their feature ships ("Hey, the dark mode you requested just went live"). Connects the existing support inbox and feedback module — users feel heard in minutes, not days.

**Analytics** — the data-driven loop. Connects to PostHog (already integrated), pulls user behavior data: feature adoption, activation rates, retention curves, funnel drop-offs. Surfaces insights like "dark mode shipped 2 weeks ago but only 3% of users enabled it" and feeds them back to PM for re-prioritization. Turns implicit signals (what users do) into explicit tasks alongside explicit signals (what users say).

**Docs** — keeps documentation in sync with the product. Watches merged PRs, detects API surface changes, generates or updates user guides and API docs. Maintains an auto-generated FAQ from support interactions. Creates documentation PRs via the coding adapter. Docs never lag behind the product again.

**QA** — tests the product as a user would. Generates test scenarios from acceptance criteria, creates E2E test files via the coding adapter, runs regression checks after every merged PR. Catches the bugs that pass CI but break in production. Distinct from Security (vulnerabilities) and Architect (code health) — QA validates behavior.

**Ops** — keeps the lights on. Monitors deployment health, error rates, performance regressions. Connects to Vercel deployment logs and PostHog error tracking. When error rates spike after a deploy, creates a rollback task or alerts the CEO. The agent that ensures uptime while everyone else builds.

All agent activity is visible in a real-time gamified feed. Users see exactly what each agent is doing, thinking, and producing. Nothing is hidden.

## The inbox

Inspired by NanoCorp. Every agent output that needs attention flows to a central inbox:

- PR ready for review (from Dev)
- Email draft to send (from Growth/CEO)
- Inbound email from a customer (forwarded to CEO)
- LinkedIn post ready to publish (from Growth)
- CEO weekly report (from CEO)
- Security vulnerability found (from Security)
- Architecture violation flagged (from Architect)
- New task needing approval (from PM)
- Revenue alert — MRR changed significantly (from system)
- Support reply drafted for a user (from Support)
- "Feature X has low adoption" insight (from Analytics)
- API docs out of date after PR merge (from Docs)
- E2E test failing after deploy (from QA)
- Error rate spike detected (from Ops)

Each item has approve / edit / reject / snooze. Bulk actions ("approve all growth posts"). In full-auto mode, items auto-approve based on rules.

## Autonomy levels

Three modes, configurable per org and overridable per task:

**Full Auto** — everything runs autonomously. PRs auto-merge after CI + architect review. Emails auto-send. Growth posts auto-approve. The inbox exists for transparency, not gatekeeping.

**Review Required** (default) — agents work autonomously but outputs go to the inbox for human approval. PRs need a human merge. Emails need a human send.

**Manual** — agents only act when explicitly triggered by the user or CEO chat. No automatic dispatch.

## Email integration

Each org gets an email address (`{slug}@autopilot.reflet.app` via Resend, or the user connects their own domain). Agents can draft and send emails. Inbound emails appear in the inbox with AI summaries. The CEO agent reads and routes them.

## Provider-agnostic coding

The user chooses how code gets written. No vendor lock-in:

- **Built-in** — AI SDK + GitHub API. Cheapest, uses free models, limited to simpler tasks.
- **GitHub Copilot** — creates issues, assigns to `copilot-swe-agent[bot]`. GitHub manages the sandbox.
- **OpenAI Codex** — dispatches workflow, OpenAI manages the container.
- **Claude Code** — creates issues with `@claude`, triggers GitHub Action. Anthropic models.

All adapters implement the same interface. The orchestrator doesn't care which one runs — it dispatches tasks and polls for results.

## The orchestrator

A Convex cron running every 2 minutes. Pure state machine, no LLM. Scans orgs with pending tasks, respects the DAG (tasks can block each other), checks daily throttles, dispatches to the right agent. As long as there are unblocked pending tasks, the pipeline keeps moving.

The PM refills the queue periodically. The orchestrator drains it. The cycle never stops.

## Revenue & costs

Stripe Connect integration captures daily revenue snapshots (MRR, ARR, churn, new/cancelled subscriptions). Revenue alerts fire when MRR changes by more than 10%.

Every task and run tracks tokens used and estimated cost. The dashboard shows daily cost, per-agent cost, per-adapter cost, and 30-day trends. Daily cost caps prevent runaway spending.

## Safeguards

- Protected files: schema.ts, package.json, tsconfig, auth, billing, migrations — agents can't touch them.
- All PRs created as drafts. CI must pass before any auto-merge.
- Architect reviews every PR (configurable).
- Max 3 retries per task before hard fail.
- Daily task limit (default 10, configurable by plan).
- Daily email limit (default 20) with domain blocklist.
- Daily cost cap with 80% warning.
- Emergency stop button: sets `enabled: false`, cancels all active runs, preserves pending tasks for resume.

## Premium tiers

| Plan | Access |
|------|--------|
| Free | No autopilot |
| Pro | 5 tasks/day, review required only, built-in adapter only |
| Business | 50 tasks/day, all autonomy levels, all adapters |
| Enterprise | Unlimited, custom limits, priority support |

## The full loop

This is what makes Reflet different from every AI coding tool. It's not a point solution — it's every function of a product company, connected:

```
User gives feedback → PM creates task → CTO writes spec → Dev builds PR
→ Architect reviews → Security scans → QA tests → Ops monitors deploy
→ Growth announces → Support tells the user it shipped
→ Analytics measures adoption → PM adjusts priorities → cycle continues
```

Meanwhile: CEO oversees everything, Docs stay in sync, revenue is tracked, and the human steers from the inbox and CEO chat.

NanoCorp creates businesses from scratch. Reflet runs existing ones. That's a larger market — every SaaS with a GitHub repo is a potential customer. And because Reflet already has the signal layer (feedback, changelogs, intelligence, support), the agents have real data to work with from day one.

## Tech stack

Next.js 16, React 19, Convex (real-time backend + orchestration), AI SDK v6 with OpenRouter (model fallback chains, free models first), Resend (email), Stripe (billing + revenue tracking), TailwindCSS + shadcn/ui, Turborepo + Bun, Better-Auth. Zero self-hosted infrastructure — everything runs on managed services.
