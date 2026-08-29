# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: **solo founders and small SaaS teams (1–5 people, no dedicated PM)**. Feedback reaches them scattered across Discord, email, DMs and support threads; nobody owns triage; shipping happens without anyone hearing back. They need one board, a public roadmap they are not ashamed of, and a reason to actually write a changelog.

Secondary: **product managers at 10–50 person SaaS companies**. Real request volume, real duplicates, leadership asking what is next. They need prioritisation signal, private boards for internal discussion, and a custom domain.

Design resolves conflicts in favour of the solo founder and the small team.

Third audience, not a buyer: the **end users of a customer's product**, who land on a public board, roadmap, changelog or status page, or meet the embedded widget inside the customer's app. They arrive with no account, no onboarding and no context.

## Product Purpose

Reflet turns scattered product feedback into a loop that closes: users post and vote, the team triages into a roadmap, releases ship as a changelog, and everyone who voted for a feature hears back the day it ships.

Success is a customer running their public board, roadmap and changelog on Reflet in the open, and a requester receiving the ship notification for something they asked for.

## Positioning

Two positions, in sequence. Future design work must serve the first without contradicting the second.

**Shipping today — the loop that closes itself.** Competitors stop at collection. Reflet links a release back to the requests it fulfils and notifies the people who voted. AI dedup and prioritisation are features inside that loop, not the pitch.

**Confirmed direction, in progress — the autopilot.** An agent that runs on the user's own Claude subscription on a machine they control (local `claude` CLI over `CLAUDE_CODE_OAUTH_TOKEN`, not a metered API key and not pooled cloud tokens). It drafts changelogs, finds real community threads and writes tailored replies. Marketing generation lands before code automation. Nothing is published without the user: discovery and drafting are automated, the paste is manual.

Do not market the autopilot as shipped. Do not design surfaces that make the loop positioning impossible to keep.

## Operating Context

Three distinct usage scenes, which must not be designed as one:

- **Dashboard** (`/dashboard/[orgSlug]`) — the customer's team, logged in, working: inbox, feedback triage, duplicates, roadmap, changelog authoring and review, surveys, intelligence (community, competitors), status, project settings, billing, members, API keys, GitHub and MCP wiring.
- **Public org pages** (`/[orgSlug]/*` and custom domains) — the customer's own users, anonymous, arriving from a link: board, feedback detail, roadmap, changelog, shipped, status, support.
- **Marketing site** (`/`, features, pricing, docs, blog, integrations, security, legal) — a stranger deciding whether to try Reflet.

Reflet also reaches users inside other products: the embedded feedback and changelog widgets, the SDK, the shadcn component registry, the CLI installer and the MCP server.

## Capabilities and Constraints

Confirmed capabilities: feedback with upvotes, comments, tags and full-text search; duplicate detection; kanban roadmap (Backlog → Planned → In Progress → Done); changelog and releases linked back to the requests they fulfil; email notifications and analytics; surveys; status pages; multi-tenant organisations with Owner/Admin/Member roles and invitations; per-org branding, custom CSS and custom domains; public/private boards; API keys; GitHub integration; MCP server for AI agents; embeddable feedback and changelog widgets; React SDK; `@reflet/ui` shadcn registry components; CLI installer.

Binding design constraints:

- **White-label public pages.** Board, feedback, roadmap, changelog, status and support must survive a customer's brand colors, custom CSS and custom domain. No public surface may assume Reflet's own palette or wordmark downstream.
- **Widget isolation.** The feedback and changelog widgets drop into any customer site with no iframe. They inherit the host's type stack and must neither leak styles into the host nor break when the host's CSS is hostile.

Technical context: Bun + Turborepo monorepo, Convex backend, Next.js App Router web app. Real-time multi-user sync is how the product works, though the user did not mark it a binding design constraint. Open source and self-hostable, likewise recorded as fact rather than as a constraint on design.

Undecided, do not invent: launch date, seat limits beyond the published tiers, self-host support commitments, per-org credential storage for the autopilot.

## Brand Commitments

Name **Reflet**. Product domain `reflet.app`, repository `damien-schneider/reflet`.

An incumbent visual world already exists in `apps/web` (olive brand ramp in OKLCH, Instrument Sans plus a display face, paper-grain texture, light and dark). It is evidence, not yet a documented or approved system — `/impeccable document` would record it, `new-work` decides whether to keep it.

Voice on the current marketing site is plain, second-person and concrete ("Ship what your users *actually* asked for"). Not confirmed as binding.

## Evidence on Hand

**There is no real evidence yet. Future work must not fabricate any.**

- No live customers, no logos, no testimonials, no usage metrics, no press.
- Everything on the current landing page is mockup data: the board items, authors (`@sonia`, `@wferrari`, `@mkc`), vote counts, comment counts and ship notes in `apps/web/src/features/homepage/components/landing/landing-data.ts` are invented.
- The pricing tiers shown on `/pricing` (Starter $0, Growth $15/mo or $144/yr, Business $50/mo or $480/yr) are **not confirmed as committed**. Treat them as a draft to check before a surface leans on them.
- Reflet does not yet visibly dogfood its own public board or changelog. If that becomes true it is the first honest proof available; until then, do not claim it.

Real assets that do exist: the product itself, the documentation under `/docs`, the open-source repository, and the published packages (SDK, widgets, CLI, MCP server, `@reflet/ui` registry).

## Product Principles

1. **Close the loop, or it did not happen.** Any surface that collects input without a visible path to a reply, a status, or a shipped note is unfinished.
2. **Design for the team of one.** The solo founder is the tiebreaker. If a screen needs a dedicated PM to be worth using, it is wrong.
3. **The public pages belong to the customer, not to Reflet.** They must look like the customer's product under their colors, their CSS, their domain.
4. **Anonymous arrivals get no onboarding.** A visitor landing on a public board or meeting the widget has no account and no context; the surface must be self-evident on first sight.
5. **Never fabricate proof.** No invented customers, quotes, metrics or logos. Absence of evidence is designed around, not papered over.

## Accessibility & Inclusion

WCAG 2.2 AA is the bar: contrast, full keyboard operation, visible focus, correct semantics and labels. Applies to the dashboard, the public pages and the embedded widgets.

English only. No i18n framework is installed and none is planned.
