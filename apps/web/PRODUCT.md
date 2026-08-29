# Product — web app

<!-- impeccable:product-schema 1 -->

Child override. Inherits `/PRODUCT.md` for users, purpose, positioning, principles and accessibility. Only web-specific truth lives here; nothing above is repeated.

## Platform

web

## Operating Context

Next.js App Router, three route groups, three different visitors. Never design them as one surface.

- `app/(marketing)/*` — a stranger deciding. Landing, features, pricing, integrations, security, blog, legal, auth flows, and the docs tree (`/docs` covering SDK, widgets, MCP, API, theming and the `@reflet/ui` component registry with live previews).
- `app/(app)/dashboard/[orgSlug]/*` — the customer's team working. Inbox, feedback and duplicates, roadmap, changelog authoring / new / edit / review-drafts / email-analytics, surveys, intelligence (community, competitors, settings), status, AI, in-app, trash, and project settings (general, members, billing, domains, API keys, GitHub, AI/MCP). Plus `/dashboard/account`, `/dashboard/super-admin`, `/invite/[token]`, `/pending-invitations` and the `setup` onboarding.
- `app/(app)/[orgSlug]/*` and `app/(app)/_custom-domain/*` — the customer's own users, anonymous. Board, feedback detail, roadmap, changelog, shipped, status, support. The two trees render the same surfaces under different hosts and must stay behaviourally identical.

Code sits in `src/features/<domain>/`, one directory per product domain, not per route.

## Capabilities and Constraints

- `_custom-domain` doubles every public surface. A public-page change that lands in one tree and not the other is a bug, not a variant.
- Public surfaces render under customer brand colors and customer-authored CSS. They cannot rely on Reflet's own tokens surviving.
- The incumbent token layer is in `app/globals.css`: an OKLCH olive brand ramp mapped onto shadcn-style semantic tokens (background, foreground, card, popover, primary, secondary, muted, accent, destructive, border, input, ring, sidebar, chart-1…5), a `--radius` scale, `Instrument Sans` for sans, a separate display face, and a paper-grain texture. Light and dark both defined.
- `dashboard-demo` and `test-tiptap` exist as scratch routes. Not product surfaces; do not polish or link them.

## Evidence on Hand

Confirms the root record: everything user-facing on the marketing site is placeholder.

- `src/features/homepage/components/landing/landing-data.ts` — invented board items, authors, votes, comments and ship notes.
- `src/features/homepage/components/landing/sections/pricing.tsx` — Starter / Growth / Business tiers, unconfirmed.
- `/blog` and `/docs` carry the only real written content.
- No customer logos, screenshots of real accounts, or metrics exist anywhere in this app.
