# Reflet Autopilot V4 — Audit Results & Improvement Plan

> **Purpose:** Full audit of all implemented code against the V3 vision. Identifies bugs, gaps, and improvements needed to make Autopilot production-ready with a clean, gamified UX.
>
> **Scope:** 23 backend files (8,167 lines), 11 frontend pages, 8 components, 2 public API files. Every line reviewed.
>
> **Status:** Phases 1-3 BUILT. Frontend exists and is polished. This document is the roadmap from "built" to "production-ready."

---

## Table of Contents

1. [What's Built & Working](#1-whats-built--working)
2. [Critical Bugs (Must Fix Before Any Deploy)](#2-critical-bugs)
3. [High Priority Fixes](#3-high-priority-fixes)
4. [Medium Priority Improvements](#4-medium-priority-improvements)
5. [Missing Feature: CEO Chat Panel](#5-missing-feature-ceo-chat-panel)
6. [UX & UI Polish](#6-ux--ui-polish)
7. [Phase 5 Remaining Work](#7-phase-5-remaining-work)
8. [Fix Implementation Guide](#8-fix-implementation-guide)

---

## 1. What's Built & Working

### Backend (23 files, 8,167 lines)

| Module | Files | Status |
|--------|-------|--------|
| Coding Adapters | 6 files (types, builtin, copilot, codex, claude_code, registry) | Working |
| Task Engine | tasks.ts, execution.ts, config.ts | Working (with bugs — see section 2) |
| Orchestrator | crons.ts | Working — routes to all 6 agents |
| Email System | email.ts, email_sending.ts, email_receiving.ts | Working (with gaps) |
| Inbox | inbox.ts | Working |
| Growth | growthItems.ts | Working |
| Revenue | revenue.ts | Working |
| Agents | ceo.ts, pm.ts, cto.ts, security.ts, architect.ts, growth.ts | Working (with bugs) |
| Schema | tableFields.ts (10 tables, 12 validators) | Working |
| Public API | queries.ts, mutations.ts (auth-gated) | Working |
| Crons | 7 cron entries in main crons.ts | Working |

### Frontend (11 pages, 8 components)

| Page | Route | Status |
|------|-------|--------|
| Dashboard | `/autopilot` | Functional — stats, agent cards, activity feed |
| Inbox | `/autopilot/inbox` | Functional — approve/reject/snooze/bulk |
| Tasks | `/autopilot/tasks` | Functional — list, filter, create |
| Task Detail | `/autopilot/tasks/[taskId]` | Functional — subtasks, runs, cancel |
| Agents | `/autopilot/agents` | Functional — 6 agent cards with status |
| Email | `/autopilot/email` | Functional — inbound/outbound, threads |
| Email Detail | `/autopilot/email/[emailId]` | Functional — full email view |
| Growth | `/autopilot/growth` | Functional — copy/approve content |
| Costs | `/autopilot/costs` | Functional — per-agent breakdown |
| Settings | `/autopilot/settings` | Functional — adapter, autonomy, credentials |
| Layout | Layout + nav + emergency stop | Polished — responsive, animated nav |

**Tech stack confirmed:** Next.js App Router, Convex real-time queries, shadcn/ui, Tailwind, Tabler icons, motion/react animations, Jotai state, sonner toasts.

---

## 2. Critical Bugs

These will cause runtime failures or data corruption. Must fix before any testing.

### BUG-1: Infinite Retry Loop (execution.ts:184-192)

**Problem:** When a task fails and `retryCount < maxRetries`, the code sets status back to `"pending"` but never increments `retryCount`. The task will retry forever.

**Also:** `updateTaskStatus` in tasks.ts doesn't accept a `retryCount` parameter, so even if we tried to increment, it would fail.

**Fix:**
1. Add `retryCount` as an optional param to `updateTaskStatus` mutation
2. Pass `retryCount: task.retryCount + 1` in the retry branch of execution.ts

### BUG-2: Growth Agent API Call (growth.ts:110)

**Problem:** Uses `openrouter.chat(model)` instead of `openrouter(model)`. The `.chat()` method doesn't exist on the OpenRouter provider — all other agents correctly use `openrouter(model)` directly.

**Impact:** Growth agent will throw a TypeError on every execution.

**Fix:** Replace `openrouter.chat(model)` with `openrouter(model)` in the `generateObjectWithFallback` helper.

### BUG-3: Race Condition in Task Counter (config.ts:194-205)

**Problem:** If two tasks dispatch simultaneously, both read the same `tasksUsedToday` value, causing lost counter updates. One dispatch won't be counted.

**Impact:** Daily throttle can be exceeded under concurrent load.

**Fix:** Use Convex's deterministic mutation ordering (mutations are serialized per-table in Convex, so this may already be safe if both go through mutations — verify). If not, restructure to use a single atomic increment pattern.

### BUG-4: Invalid Model Names Across Agents

**Problem:** Several agents reference models that don't exist or use inconsistent naming:

| File | Model | Issue |
|------|-------|-------|
| security.ts | `openai/gpt-5.4-mini` | Doesn't exist |
| architect.ts | `openai/gpt-5.4-mini` | Doesn't exist |
| growth.ts | `openai/gpt-5.4-mini` | Doesn't exist |
| growth.ts | `openai/gpt-5.4-mini:online` | Doesn't exist |
| growth.ts | `qwen/qwen3.6-plus-preview:free` | Inconsistent naming (pm.ts uses different format) |

**Fix:** Standardize all model references. Create a shared `models.ts` constants file:
```typescript
export const MODELS = {
  FREE: "qwen/qwen3-235b-a22b:free",
  FAST: "openai/gpt-4.1-mini",
  SMART: "anthropic/claude-sonnet-4",
  SEARCH_FREE: "qwen/qwen3-235b-a22b:free:online",
  SEARCH_PAID: "openai/gpt-4.1-mini:online",
} as const;
```

### BUG-5: Duplicate Email Sending Implementations

**Problem:** Two separate functions claim to send emails:
- `email.ts:sendApprovedEmail` — a **TODO stub** that marks emails as "sent" without actually sending
- `email_sending.ts:sendAutopilotEmail` — the real implementation using Resend

If any code path accidentally calls the stub, emails get marked "sent" but never leave the system.

**Fix:** Delete `sendApprovedEmail` from email.ts entirely. Keep only `email_sending.ts:sendAutopilotEmail`.

---

## 3. High Priority Fixes

### FIX-1: AGENTS.md Never Loaded (execution.ts:129)

The `agentsMdContent` field is always empty string `""`. The execution layer never reads AGENTS.md from the repo before passing to adapters.

**Impact:** Coding agents don't follow project-specific conventions. PRs will violate coding standards.

**Fix:** In `executeTask`, before calling `adapter.executeTask`, load AGENTS.md via the GitHub API:
```typescript
const agentsMd = await readFileFromGitHub(repoUrl, "AGENTS.md", githubToken);
```

### FIX-2: Empty externalRef Handling (execution.ts:181)

When `result.externalRef` is undefined, it falls back to `""`. The polling function then tries to parse this empty string as `"adapter:owner/repo#number"`, which fails silently.

**Fix:** Throw an error if externalRef is missing for async adapters (copilot, codex, claude_code). Only builtin is synchronous and doesn't need it.

### FIX-3: Missing Credentials Pre-Validation (execution.ts:79-91)

Credentials are loaded but never validated before use. If they're stale or revoked, the execution fails mid-task.

**Fix:** Call `adapter.validateCredentials(creds)` before executing. If invalid, fail the task immediately with a clear "Invalid credentials — update in Settings" message.

### FIX-4: CI Status Logic Flaw (builtin.ts:265-283)

If check_runs exist but none have a `conclusion` yet (all still running), the code incorrectly returns `"passed"` because `hasFailed` is false.

**Fix:** Check for `run.status !== "completed"` first (already done), but also check for empty check_runs array returning "passed" when no runs exist yet.

### FIX-5: Inconsistent CI Failure Detection

`codex.ts` only checks `conclusion === "failure"` while `builtin.ts` also checks `"cancelled"`. All adapters should be consistent.

**Fix:** Standardize: check for `conclusion === "failure" || conclusion === "cancelled" || conclusion === "timed_out"` in all adapters.

### FIX-6: CC Field Ignored in Email Sending (email_sending.ts)

The `cc` field from the email record is never passed to Resend. CC recipients are silently dropped.

**Fix:** Include `cc: email.cc` in the `resend.sendEmail()` call.

### FIX-7: isEmailBlocked Never Called (email_sending.ts)

The blocklist check function exists but is never invoked before sending. Blocked domains can receive emails.

**Fix:** Call `isEmailBlocked` in `sendAutopilotEmail` before sending. Reject with clear error if blocked.

### FIX-8: Revenue Snapshot Deduplication (revenue.ts)

If the cron runs twice in a day, duplicate snapshots are created for the same date.

**Fix:** Check for existing snapshot on the same date before inserting. Skip or update if exists.

### FIX-9: Hard-coded Product Info in Growth Agent (growth.ts:301-304)

Product name, description, tech stack, and competitor context are all hard-coded as "Reflet Autopilot". Every org will get growth content about Reflet.

**Fix:** Load product info from repo analysis data and org settings. Fall back to generic prompts if no data available.

### FIX-10: CTO getAgentsMd Always Returns Null (cto.ts:102-106)

The `getAgentsMd` query is a stub that always returns null. This means CTO specs miss project-specific coding guidelines.

**Fix:** Load from the GitHub repo via the stored repo URL in org config, or from a `documentContent` table if one exists.

---

## 4. Medium Priority Improvements

### IMP-1: Shared generateObjectWithFallback Helper

Every agent has its own copy of `generateObjectWithFallback`. This should be a shared utility.

**Create:** `packages/backend/convex/autopilot/agents/shared.ts`
```typescript
export const generateObjectWithFallback = async <T>({
  models, schema, prompt, systemPrompt
}: { models: readonly string[]; schema: ZodType<T>; prompt: string; systemPrompt: string }): Promise<T> => {
  // Single implementation used by all agents
};
```

### IMP-2: JSON Credential Validation (execution.ts)

`JSON.parse(creds.credentials)` has no schema validation. Malformed JSON or wrong structure causes untyped runtime errors.

**Fix:** Parse with a Zod schema per adapter type.

### IMP-3: Status Field Type Validation (tasks.ts:313)

`updateRun` accepts `status: v.optional(v.string())` — any string. Should use `runStatus` validator from tableFields.

### IMP-4: Builtin Adapter cancelTask Is a No-Op (builtin.ts:515-518)

Users think cancellation works but it silently does nothing. The PR stays as a draft.

**Fix:** Implement actual PR closing via GitHub API, or at minimum log a warning and create an inbox item telling the user to close the PR manually.

### IMP-5: Stripe Pagination (revenue.ts)

`getStripeMetrics` fetches max 100 subscriptions. Orgs with 100+ subscriptions will get incomplete data.

**Fix:** Use Stripe's `auto_paging` or loop with `starting_after` cursor.

### IMP-6: Security/Architect Fallback Logic

Both agents pass the first model to `generateObjectWithFallback`, which tries it, and on failure tries the next. But both models are currently invalid names (BUG-4). Even after fixing the names, the pattern should be: pass the full model array rather than a single model + retry logic.

### IMP-7: Return Type Inconsistencies

Some actions declare `returns: v.null()` but implicitly return undefined. Standardize all action return validators.

---

## 5. Missing Feature: CEO Chat Panel

This is the single biggest gap between the V3 vision and current implementation. The CEO Agent backend exists (thread-based Convex Agent + report generation), but there's no chat UI.

### What's Needed

A persistent right-side panel on all `/autopilot/*` pages where users can chat with the CEO agent in real-time.

### Implementation Plan

**Backend additions:**
- Public query: `api.autopilot.queries.getCEOThread` — get or create CEO thread for org
- Public query: `api.autopilot.queries.getCEOMessages` — list messages in thread
- Public mutation: `api.autopilot.mutations.sendCEOMessage` — send user message + trigger AI response
- Wire the ceoAgent's `streamText` for real-time streaming responses

**Frontend components to create:**
- `src/features/autopilot/components/ceo-chat-panel.tsx` — the main panel (resizable right sidebar)
- `src/features/autopilot/components/ceo-message-bubble.tsx` — styled message (reuse inbox MessageBubble pattern)
- `src/features/autopilot/components/ceo-input.tsx` — message input with Cmd+Enter send

**UI behavior:**
- Panel is collapsible (default: open on desktop, closed on mobile)
- Shows streaming responses with typing indicator
- Messages persist across page navigation within autopilot
- CEO can reference tasks, PRs, inbox items by name
- "Generate Report" quick action button at top of chat
- Panel width stored in Jotai atom for persistence

**Reusable from existing codebase:**
- `MessageBubble` from `/features/inbox/components/` — adapt for CEO chat
- `MessageInput` from `/features/inbox/components/` — reuse with modifications
- Convex `useQuery` for real-time message subscription

---

## 6. UX & UI Polish

### Current State

The frontend is polished and production-quality. Using shadcn/ui, Tailwind, motion/react animations, proper loading states, responsive design, and real-time Convex subscriptions. The autopilot layout has an animated nav, emergency stop button, and org context.

### Recommended Improvements

**Dashboard page:**
- Add a "Get Started" onboarding wizard when autopilot is first enabled (no tasks yet)
- Show cost-per-day sparkline in the stats bar
- Add "Agent of the Day" highlight — which agent did the most today

**Inbox page:**
- Add keyboard shortcuts (j/k to navigate, a to approve, r to reject)
- Show estimated cost savings per approved task
- Add "Smart filters" — e.g., "Show me everything from Security agent this week"

**Task board:**
- Add Kanban view option (columns: pending, in_progress, waiting_review, completed)
- Show task DAG visualization — which tasks block which
- Inline subtask expansion (already shows subtasks but could be more visual)

**Email page:**
- Add compose button for new drafts (currently only agent-drafted)
- Show email thread count badges
- Add "Reply" action on received emails that creates a draft

**Growth page:**
- Preview mode — show how a post would look on Reddit/LinkedIn/X
- Add "Schedule" option (post at optimal time)
- Content quality score badge

**Settings page:**
- Credential validation with live status indicator (green checkmark when valid)
- "Test Connection" button that runs validateCredentials and shows result
- Cost estimator — "At your current rate, expect ~$X/month"

**Activity feed:**
- Agent avatars/emojis per agent type (already has status cards, extend to feed)
- Collapsible time groups ("2 hours ago", "Yesterday", "This week")
- Click-to-navigate — clicking a feed item takes you to the relevant task/PR/email

---

## 7. Phase 5 Remaining Work

From V3 plan, not yet started:

| Task | File(s) | Priority | Notes |
|------|---------|----------|-------|
| GitHub webhook handler (PR merge triggers) | `autopilot/webhooks.ts` | High | Triggers security + architect scans on PR merge |
| Auto-onboarding flow | `autopilot/onboarding.ts` | High | Paste repo → analyze → enable autopilot |
| Cost cap enforcement | `autopilot/cost_guard.ts` | High | Stop dispatching when daily cost cap hit |
| Premium gating middleware | `autopilot/billing_gate.ts` | Medium | Free/Pro/Business/Enterprise limits |
| E2E tests for full pipeline | `autopilot/__tests__/` | Medium | At minimum: task create → CTO spec → dev dispatch |

---

## 8. Fix Implementation Guide

### Priority Order

**Batch 1 — Critical (blocks all testing):**
1. BUG-1: Fix infinite retry loop
2. BUG-2: Fix growth agent API call
3. BUG-4: Standardize model names (create shared models.ts)
4. BUG-5: Delete duplicate email sending stub

**Batch 2 — High (blocks production):**
5. FIX-1: Load AGENTS.md in execution
6. FIX-2: Validate externalRef for async adapters
7. FIX-3: Pre-validate credentials
8. FIX-7: Wire isEmailBlocked into sending flow
9. FIX-9: Load product info dynamically in growth agent
10. FIX-6: Pass CC field to Resend

**Batch 3 — Quality (before launch):**
11. IMP-1: Shared generateObjectWithFallback
12. IMP-2: Zod validation for credential JSON
13. IMP-3: Typed status validators
14. FIX-4: Fix CI status logic
15. FIX-5: Consistent CI failure detection
16. FIX-8: Revenue snapshot deduplication

**Batch 4 — Features:**
17. CEO Chat Panel (see section 5)
18. Phase 5 items (webhooks, onboarding, cost cap, billing gate)
19. UX polish items (section 6)

### Files to Create

```
packages/backend/convex/autopilot/
├── agents/
│   └── shared.ts          # Shared generateObjectWithFallback + model constants
├── cost_guard.ts          # Cost cap enforcement
├── webhooks.ts            # GitHub webhook handler
├── onboarding.ts          # Auto-onboarding flow
├── billing_gate.ts        # Premium gating
└── __tests__/             # E2E tests
    ├── pipeline.test.ts
    ├── adapters.test.ts
    └── inbox.test.ts

apps/web/src/features/autopilot/components/
├── ceo-chat-panel.tsx     # CEO chat right panel
├── ceo-message-bubble.tsx # Chat message component
└── ceo-input.tsx          # Chat input component
```

### Files to Modify

```
execution.ts        — BUG-1 (retry), FIX-1 (AGENTS.md), FIX-2 (externalRef), FIX-3 (credentials)
growth.ts           — BUG-2 (API call), FIX-9 (product info)
email.ts            — BUG-5 (delete stub)
email_sending.ts    — FIX-6 (CC), FIX-7 (blocklist)
revenue.ts          — FIX-8 (dedup), IMP-5 (pagination)
tasks.ts            — BUG-1 (retryCount param), IMP-3 (status types)
security.ts         — BUG-4 (models), IMP-6 (fallback)
architect.ts        — BUG-4 (models), IMP-6 (fallback)
cto.ts              — FIX-10 (AGENTS.md)
builtin.ts          — FIX-4 (CI status), IMP-4 (cancel)
codex.ts            — FIX-5 (CI failure detection)
config.ts           — BUG-3 (race condition)
```

---

## Appendix: Audit Stats

| Metric | Value |
|--------|-------|
| Backend files audited | 23 |
| Frontend pages audited | 11 |
| Frontend components audited | 8 |
| Critical bugs found | 5 |
| High priority fixes | 10 |
| Medium improvements | 7 |
| Total lines of backend code | 8,167 |
| Missing features | CEO Chat Panel, Phase 5 items |
| Frontend status | Polished, production-quality |
| Backend status | Architecturally sound, has runtime bugs |
