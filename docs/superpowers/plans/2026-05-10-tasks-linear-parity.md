# Tasks UI Linear-Parity Implementation Plan

> **For agentic workers:** This plan is the source of truth for tracking progress. Each task uses checkbox (`- [ ]`) syntax. When you complete a task, edit this file and tick the box. Sub-skills: `superpowers:subagent-driven-development` for delegation, `superpowers:test-driven-development` for tests.

**Goal:** Bring `/dashboard/[orgSlug]/tasks` Linear-grade — proper hierarchy, inline edit, keyboard shortcuts, URL state, labels, saved views, robust tests. Backend redesigned for AI-first workflow (agent + human co-assignment, triage state machine, identifier).

**Architecture:** Single Convex `autopilotWorkItems` table extended (additive fields where possible), new tables for labels/views/counters. UI rebuilt around URL state (`nuqs`) + inline popovers + global command palette (`cmdk`). Tests at three levels: Convex unit (`vitest`/`convex-test`), React unit (`vitest`), E2E (`playwright`).

**Tech Stack:** Convex, Next.js 15 App Router, React 19, TypeScript, TailwindCSS, shadcn/ui (Base UI under hood), `nuqs` (URL state), `cmdk` (palette), `react-hotkeys-hook`, Vitest, Playwright, Biome/Ultracite.

**Migration safety:** All schema changes additive first (widen-migrate-narrow). Old `needsReview` boolean kept until UI fully migrated to `triage` status. Counter table seeded per-org on first work item create.

---

## Progress dashboard

| Phase | Owner | Status |
| ----- | ----- | ------ |
| Phase 1 — Backend schema + queries + mutations | backend-agent | ✅ |
| Phase 2 — UI page-client (filters/URL state/group-by/bulk) | ui-list-agent | ⬜ |
| Phase 3 — UI task-card (inline edit + identifier + triage) | ui-card-agent | ⬜ |
| Phase 4 — Detail UI consolidation | ui-detail-agent | ⬜ |
| Phase 5 — Command palette + keyboard shortcuts | ui-shortcuts-agent | ⬜ |
| Phase 6 — Labels CRUD + assignment UI | ui-labels-agent | ⬜ |
| Phase 7 — E2E tests | e2e-agent | ⬜ |
| Phase 8 — Final integration + regression sweep | orchestrator | ⬜ |

**Order of execution:** Phase 1 must land first (schema is dependency). Phases 2–6 can run in parallel after Phase 1 succeeds. Phase 7 starts when 2–6 are complete enough to test. Phase 8 is final QA.

**Deferred (P2 backlog, not in this iteration):** cycles, milestones, estimate points UI (field exists, no editor), bulk action templates, comparison roadmap view. Tracked at end of doc.

---

## Phase 1 — Backend schema + queries + mutations

**Owner:** `backend-agent` (single sequential agent — schema is shared resource)

**Files:**
- Modify: `packages/backend/convex/autopilot/schema/work.tables.ts`
- Modify: `packages/backend/convex/autopilot/schema/validators.ts`
- Modify: `packages/backend/convex/autopilot/queries/work.ts`
- Modify: `packages/backend/convex/autopilot/mutations/work.ts`
- Create: `packages/backend/convex/autopilot/schema/labels.tables.ts`
- Create: `packages/backend/convex/autopilot/schema/views.tables.ts`
- Create: `packages/backend/convex/autopilot/queries/labels.ts`
- Create: `packages/backend/convex/autopilot/mutations/labels.ts`
- Create: `packages/backend/convex/autopilot/queries/views.ts`
- Create: `packages/backend/convex/autopilot/mutations/views.ts`
- Modify: `packages/backend/convex/schema.ts` (register new tables)
- Test: `packages/backend/convex/autopilot/__tests__/work-extensions.test.ts`
- Test: `packages/backend/convex/autopilot/__tests__/labels.test.ts`
- Test: `packages/backend/convex/autopilot/__tests__/views.test.ts`

### Tasks

- [x] **1.1 Extend `workItemStatus` validator** — add `triage` literal alongside existing statuses. Update `STATUS_ORDER` references in UI later.
- [x] **1.2 Add new fields to `autopilotWorkItems`:**
  - `assigneeUserId: v.optional(v.string())` — human assignee. **Deviation:** the codebase stores user ids as opaque strings (better-auth user ids), not as `v.id("users")` — there is no `users` table in the Convex schema. Fields stored as `v.string()`.
  - `dueDate: v.optional(v.number())`
  - `targetDate: v.optional(v.number())`
  - `startDate: v.optional(v.number())`
  - `estimate: v.optional(v.number())` — story points
  - `confidence: v.optional(v.number())` — IA self-rating 0–1
  - `identifier: v.optional(v.string())` — `ORG-123` style; optional during migration, required-on-create after backfill
  - Index `by_org_assignee` on `["organizationId", "assigneeUserId"]`
  - Index `by_org_identifier` on `["organizationId", "identifier"]`
- [x] **1.3 Create `organizationCounters` table** for per-org work item counter (`{organizationId, kind: "work_item", value: number}`).
- [x] **1.4 Update `createWorkItem` mutation** — auto-allocate `identifier` via `allocateWorkItemIdentifier()` helper that derives prefix from slug (first 3-6 alpha chars uppercased, fallback `ORG`) and atomically increments the per-org counter row.
- [x] **1.5 Add `assignWorkItem` mutation** — accepts `assigneeUserId` and/or `assignedAgent`, with `clearAssigneeUser` / `clearAssignedAgent` flags.
- [x] **1.6 Add `setLabels`, `addLabel`, `removeLabel` mutations** + `createLabel`, `updateLabel`, `deleteLabel`.
- [x] **1.7 Create `workItemLabels` table:**
  - `{organizationId, name, color, parentLabelId?, createdBy?, createdAt, updatedAt}`
  - Index `by_organization`, `by_org_parent`
- [x] **1.8 Create `workItemLabelLinks` table:**
  - `{organizationId, workItemId, labelId, createdAt}`
  - Index `by_organization`, `by_work_item`, `by_label`, `by_work_item_label`
- [x] **1.9 Create `userViews` table:**
  - `{organizationId, userId, name, scope: "personal"|"shared", filtersJson: string, sortKey, groupKey, viewMode, createdAt, updatedAt}`
  - Index `by_organization`, `by_org_user`
- [x] **1.10 Backfill migration** — implemented as admin-gated public mutation `migrateNeedsReviewToTriage` (since `@convex-dev/migrations` is not installed). Idempotent: scans `needsReview === true` items via `by_org_review` index, flips non-terminal to `triage`, clears `needsReview` on every pass. Re-runs are no-ops.
- [x] **1.11 Update `listWorkItems` query** — accept `assigneeUserId`, `labelIds[]`, `dueBefore`. `triage` literal supported via the new `workItemStatus`.
- [x] **1.12 Add `searchWorkItems` query** — uses new `search_title` search index for title hits, then augments with identifier + tag substring matches over a `by_organization` scan. Capped at 50 hits.
- [x] **1.13 Add `bulkUpdateWorkItems` mutation** — pre-validates every id belongs to the requested org before any write, capped at 200 items.
- [x] **1.14 Convex unit tests** — 22 tests added across `work-extensions.test.ts`, `labels.test.ts`, `views.test.ts`. Covers: identifier increment + org isolation, triage backfill idempotency, label CRUD + cross-org rejection, bulk update auth, view scope rules. Also fixed a long-standing bug in `createMemberSession` where re-registering the betterAuth component reset the user id sequence — now memoized per `TestContext` via WeakSet.
- [x] **1.15 Run `bun run check-types` from repo root** — zero errors.
- [x] **1.16 Run `bunx convex codegen` to verify schema validates** — passes (no migrations component installed; codegen schema validation suffices).
- [x] **1.17 Commit** message: `feat(autopilot): work item linear parity — identifier, labels, views, triage`.

**Acceptance:** All Phase 1 tests green. `bun run check-types` clean. Schema validates locally.

---

## Phase 2 — UI page-client (filters/URL state/group-by/bulk)

**Owner:** `ui-list-agent`

**Files:**
- Modify: `apps/web/app/(app)/dashboard/[orgSlug]/tasks/page-client.tsx`
- Create: `apps/web/src/features/autopilot/components/tasks/tasks-filter-bar.tsx`
- Create: `apps/web/src/features/autopilot/components/tasks/tasks-toolbar.tsx`
- Create: `apps/web/src/features/autopilot/components/tasks/use-tasks-filters.ts`
- Create: `apps/web/src/features/autopilot/components/tasks/group-by-select.tsx`
- Create: `apps/web/src/features/autopilot/components/tasks/saved-views-menu.tsx`
- Create: `apps/web/src/features/autopilot/components/tasks/bulk-actions-bar.tsx`
- Test: `apps/web/src/features/autopilot/components/tasks/__tests__/use-tasks-filters.test.ts`
- Test: `apps/web/src/features/autopilot/components/tasks/__tests__/tasks-filter-bar.test.tsx`

### Tasks

- [ ] **2.1 Install `nuqs`** — `bun add nuqs` at workspace root if missing.
- [ ] **2.2 `use-tasks-filters` hook** — wrap `useQueryStates` for `status[]`, `type[]`, `priority[]`, `assigneeUserId`, `assignedAgent`, `groupBy`, `sortKey`, `viewMode`, `q` (search). Default values + parsers as `parseAsArrayOf(parseAsString)`. Returns typed object + setters.
- [ ] **2.3 Filter bar component** — render multi-select chips per facet. Click chip opens popover with checkbox list. Active filters shown as removable pills.
- [ ] **2.4 Group-by select** — options: none, status, priority, assignee, parent, label.
- [ ] **2.5 List grouping logic** — when `groupBy !== "none"`, group filtered items by key, render section headers with count + collapse toggle (persist collapse state in localStorage by org+groupBy).
- [ ] **2.6 Bulk selection** — checkbox column added on hover/active. State: `Set<Id>`. Shift-click selects range. `Esc` clears.
- [ ] **2.7 Bulk actions bar** — appears when selection > 0: change status, change priority, assign agent/user, add label, archive, delete. Uses `bulkUpdateWorkItems`.
- [ ] **2.8 Saved views menu** — dropdown: list user views, "Save current view as…", switch view (writes filter state). Uses Phase 1 views API.
- [ ] **2.9 Search field** — debounced 200ms, calls `searchWorkItems` if non-empty, otherwise local title filter.
- [ ] **2.10 Empty state** — replace plain text with illustration + CTA "Create task" + "Import from feedback".
- [ ] **2.11 Skeleton loading** — match real layout shape (filter bar + 8 row skeleton).
- [ ] **2.12 Unit tests** — hook decodes URL correctly, filter bar toggles state, group-by partitions items.
- [ ] **2.13 `bun run check-types` clean.**
- [ ] **2.14 Commit:** `feat(tasks): URL-state filters, group-by, bulk actions, saved views`.

**Acceptance:** Reload preserves filters via URL. Bulk update mutates atomically. Tests green.

---

## Phase 3 — UI task-card (inline edit + identifier + triage)

**Owner:** `ui-card-agent`

**Files:**
- Modify: `apps/web/src/features/autopilot/components/task-card.tsx`
- Create: `apps/web/src/features/autopilot/components/tasks/inline-status-popover.tsx`
- Create: `apps/web/src/features/autopilot/components/tasks/inline-priority-popover.tsx`
- Create: `apps/web/src/features/autopilot/components/tasks/inline-assignee-popover.tsx`
- Create: `apps/web/src/features/autopilot/components/tasks/inline-labels-popover.tsx`
- Create: `apps/web/src/features/autopilot/components/tasks/work-item-identifier.tsx`
- Modify: `apps/web/src/features/autopilot/components/views/initiatives-board-constants.ts` (add `triage` to STATUS_ORDER + colors)
- Test: `apps/web/src/features/autopilot/components/tasks/__tests__/inline-status-popover.test.tsx`
- Test: `apps/web/src/features/autopilot/components/tasks/__tests__/work-item-identifier.test.tsx`

### Tasks

- [x] **3.1 Identifier component** — renders `ORG-123` styled like Linear (mono font, muted). Click copies to clipboard with toast.
- [x] **3.2 Inline status popover** — opens on click of status icon. Lists all statuses including new `triage`. Optimistic mutation via `updateWorkItem`.
- [x] **3.3 Inline priority popover** — same pattern. Critical/High/Medium/Low. **Deviation:** the `priority` validator does not include `none`, so it was omitted from the option list.
- [x] **3.4 Inline assignee popover** — tab toggle "Agent" / "User". User list pulled from org members via `api.organizations.members.list` (the existing query is `members.list`, not `members.listMembers`). Agent list from `assignedAgent` validator.
- [x] **3.5 Inline labels popover** — multi-select label list with search and inline "Create '<query>'" CTA. Wired directly to `setLabels` + `createLabel` mutations; Phase 6 may extend.
- [x] **3.6 Update `STATUS_CONFIG`** — added `triage` row (icon `IconInbox`, color `text-amber-500`, label "Triage"). Lives in `inline-status-popover.tsx` and is the single source of truth for card + dialog rendering. `STATUS_LABELS` / `STATUS_COLORS` in `initiatives-board-constants.ts` updated to match.
- [x] **3.7 Update `STATUS_ORDER`** — now `["triage","backlog","todo","in_progress","in_review","done","cancelled"]`.
- [x] **3.8 TaskCard wiring** — replaced static badges with the four inline popovers, identifier shown next to title, label links queried via `listWorkItemLabels`. Detail dialog still wired here (Phase 4 will migrate).
- [x] **3.9 Unit tests** — `work-item-identifier.test.tsx` (4 cases: render, fallback, copy, copy failure) and `inline-status-popover.test.tsx` (6 cases: render, full option list incl. triage, mutation, no-op on same status, click does not bubble, error toast).
- [x] **3.10 `bun run check-types` clean.**
- [ ] **3.11 Commit:** `feat(tasks): inline editing, identifiers, triage status`.

**Acceptance:** Click status icon → popover updates without dialog. Identifier visible. Triage filterable.

---

## Phase 4 — Detail UI consolidation

**Owner:** `ui-detail-agent`

**Decision:** Keep dialog as fast peek (Linear-style), but make `/tasks/[id]` the canonical full URL. Dialog routes via shallow URL param `?peek=ID`. Direct deep-link goes to full page. Eliminates duplication by extracting shared `TaskDetailContent` component.

**Files:**
- Modify: `apps/web/app/(app)/dashboard/[orgSlug]/tasks/page-client.tsx`
- Create: `apps/web/app/(app)/dashboard/[orgSlug]/tasks/[taskId]/page.tsx`
- Create: `apps/web/app/(app)/dashboard/[orgSlug]/tasks/[taskId]/page-client.tsx`
- Create: `apps/web/src/features/autopilot/components/tasks/task-detail-content.tsx`
- Modify: `apps/web/src/features/autopilot/components/task-card.tsx` (use shared content)
- Modify: `apps/web/app/(app)/dashboard/[orgSlug]/autopilot/tasks/[taskId]/page.tsx` (re-export or redirect)
- Test: `apps/web/src/features/autopilot/components/tasks/__tests__/task-detail-content.test.tsx`

### Tasks

- [ ] **4.1 Extract `TaskDetailContent`** — header (identifier + title + inline edits), description (Tiptap), acceptance criteria, subtasks (with inline create), runs, activity log placeholder, comments placeholder. Pure presentational w/ Convex queries inside.
- [ ] **4.2 Create `/tasks/[taskId]/page.tsx`** — server component returning client wrapper.
- [ ] **4.3 Peek dialog** — `?peek=ID` URL param. `useSearchParams` + `router.push` to set/clear. Dialog uses `TaskDetailContent` inside `Sheet` (right side, 720px).
- [ ] **4.4 TaskCard click handler** — `router.push("?peek=" + id, { scroll: false })`. `Cmd+click` opens full page in new tab.
- [ ] **4.5 Redirect `/autopilot/tasks/[taskId]`** — `redirect()` to `/tasks/[taskId]` to deprecate.
- [ ] **4.6 Breadcrumb** — header shows parent chain (`Initiative › Story › Task`). Click navigates.
- [ ] **4.7 Unit test** — content renders, peek param toggles, breadcrumb resolves.
- [ ] **4.8 `bun run check-types` clean.**
- [ ] **4.9 Commit:** `feat(tasks): unified detail UI with peek/full modes`.

**Acceptance:** Single source of detail UI. Deep links work. Peek opens fast.

---

## Phase 5 — Command palette + keyboard shortcuts

**Owner:** `ui-shortcuts-agent`

**Files:**
- Create: `apps/web/src/features/autopilot/components/tasks/command-palette.tsx`
- Create: `apps/web/src/features/autopilot/components/tasks/use-tasks-hotkeys.ts`
- Create: `apps/web/src/features/autopilot/components/tasks/quick-create-dialog.tsx`
- Modify: `apps/web/app/(app)/dashboard/[orgSlug]/tasks/page-client.tsx` (mount palette)
- Test: `apps/web/src/features/autopilot/components/tasks/__tests__/use-tasks-hotkeys.test.ts`

### Tasks

- [ ] **5.1 Install `cmdk` and `react-hotkeys-hook`** if missing.
- [ ] **5.2 Hotkeys hook:**
  - `c` → quick create dialog
  - `j` / `k` → navigate row up/down (focus row, scroll into view)
  - `Enter` → open peek for focused row
  - `Cmd/Ctrl+Enter` → submit forms
  - `Cmd/Ctrl+K` → command palette
  - `g t` → go tasks; `g r` → go roadmap; `g i` → go inbox
  - `Esc` → clear selection / close peek
- [ ] **5.3 Command palette** — `cmdk` based. Sections: Recent tasks, Create new, Switch view, Filters, Navigate. Async fetch tasks via `searchWorkItems`.
- [ ] **5.4 Quick create dialog** — minimal form (title + Tab → type/priority slash menu like Linear). Submits immediately.
- [ ] **5.5 Focus management** — `aria-activedescendant` on list, scroll focused into view. Skip when typing in input.
- [ ] **5.6 Unit tests** — hotkey fires action, ignored in inputs, palette opens via Cmd+K.
- [ ] **5.7 `bun run check-types` clean.**
- [ ] **5.8 Commit:** `feat(tasks): command palette and keyboard shortcuts`.

**Acceptance:** All shortcuts work. Palette searches. Keyboard nav focused row.

---

## Phase 6 — Labels CRUD + assignment UI

**Owner:** `ui-labels-agent`

**Files:**
- Create: `apps/web/app/(app)/dashboard/[orgSlug]/labels/page.tsx`
- Create: `apps/web/app/(app)/dashboard/[orgSlug]/labels/page-client.tsx`
- Create: `apps/web/src/features/autopilot/components/labels/labels-list.tsx`
- Create: `apps/web/src/features/autopilot/components/labels/label-pill.tsx`
- Create: `apps/web/src/features/autopilot/components/labels/create-label-dialog.tsx`
- Test: `apps/web/src/features/autopilot/components/labels/__tests__/label-pill.test.tsx`
- Test: `apps/web/src/features/autopilot/components/labels/__tests__/labels-list.test.tsx`

### Tasks

- [ ] **6.1 Labels page route** — admin-only, lists all org labels with usage counts.
- [ ] **6.2 Label pill component** — colored chip with name + remove "x" if `onRemove` provided.
- [ ] **6.3 Create label dialog** — name + color picker (8 preset colors) + optional parent.
- [ ] **6.4 Inline create from labels popover** — when search matches no label, show "Create '<query>'" CTA.
- [ ] **6.5 Wire `setLabels` mutation** to inline labels popover (Phase 3.5 placeholder).
- [ ] **6.6 Tag migration UI** — admin-only one-click "Convert tags to labels" button calling `migrateTagsToLabels` (Phase 1 helper if added; otherwise client iterates).
- [ ] **6.7 Unit tests** — pill renders color, dialog validates, list shows usage count.
- [ ] **6.8 `bun run check-types` clean.**
- [ ] **6.9 Commit:** `feat(tasks): labels CRUD with hierarchy and assignment`.

**Acceptance:** Labels created, assigned, displayed on task cards. Filter by label works.

---

## Phase 7 — E2E tests

**Owner:** `e2e-agent`

**Files:**
- Create: `apps/web/e2e/tasks-list.e2e.ts`
- Create: `apps/web/e2e/tasks-create.e2e.ts`
- Create: `apps/web/e2e/tasks-detail.e2e.ts`
- Create: `apps/web/e2e/tasks-keyboard.e2e.ts`
- Create: `apps/web/e2e/tasks-labels.e2e.ts`
- Create: `apps/web/e2e/tasks-bulk.e2e.ts`
- Create: `apps/web/e2e/helpers/tasks-fixtures.ts`

### Tasks

- [ ] **7.1 Fixtures helper** — `seedWorkItems(page, [{...}, ...])` creates via Convex in test mode.
- [ ] **7.2 List E2E:**
  - Navigates to /tasks
  - Filters via URL: ?status=todo,in_progress
  - Group-by status renders sections
  - Search narrows list
- [ ] **7.3 Create E2E:**
  - Press `c` → quick create dialog
  - Fill title + submit
  - New task appears in list with identifier
- [ ] **7.4 Detail E2E:**
  - Click row → peek opens
  - Inline edit status → row updates
  - Cmd+click → full page opens with same data
- [ ] **7.5 Keyboard E2E:**
  - `j/k` nav, focus visible
  - Cmd+K opens palette, searches, navigates
- [ ] **7.6 Labels E2E:**
  - Visit /labels, create label
  - Assign to task via popover
  - Filter list by label chip
- [ ] **7.7 Bulk E2E:**
  - Select 3 rows via shift-click
  - Bulk change priority to High
  - Verify all 3 updated
- [ ] **7.8 Run `bun run test:e2e` — all green.**
- [ ] **7.9 Commit:** `test(tasks): comprehensive E2E coverage for Linear parity`.

**Acceptance:** All E2E suites pass on CI without flakes.

---

## Phase 8 — Final integration + regression sweep

**Owner:** `orchestrator` (main session)

### Tasks

- [ ] **8.1 `bun run check-types` clean.**
- [ ] **8.2 `bun x ultracite check` clean.**
- [ ] **8.3 `bun run test:unit` clean.**
- [ ] **8.4 `bun run test:e2e` clean.**
- [ ] **8.5 Manual smoke** — load `/tasks`, create, peek, filter, search, palette, label, bulk. No console errors.
- [ ] **8.6 Update `docs/AUTOPILOT_ARCHITECTURE.md`** — add Linear parity section.
- [ ] **8.7 Final commit + open PR.**

---

## Deferred (P2 backlog)

Not in this iteration. File issues if accepted.

- Cycles / sprints (table + planning UI)
- Milestones within projects
- Estimate points editor (field exists, no UI)
- Project entity above stories (current plan keeps story as project surrogate; revisit)
- Comparison roadmap views (timeline + gantt)
- Custom fields per work item type
- Templates per type (bug/story/dev) — quick-create handles minimum

---

## Conventions for executing agents

1. Read this file before starting your phase. Tick boxes as you go.
2. Don't touch files outside your phase's "Files" section unless you note why in the doc.
3. After each task in your phase, edit this doc and tick the checkbox.
4. Conflicts on shared files (`page-client.tsx`, `task-card.tsx`): coordinate via doc — claim file by writing your owner name in this section before editing:

| File | Currently editing |
| ---- | ----------------- |
| `tasks/page-client.tsx` | _free_ |
| `task-card.tsx` | _free_ |
| `views/initiatives-board-constants.ts` | _free_ |

5. Tests-first when feasible (TDD). At minimum: every mutation/query gets a Convex unit test, every new component gets a render test, every user flow gets E2E.
6. Commit message style: `<type>(scope): subject` matching repo convention.
7. Never skip hooks, never add Co-Authored-By for AI/Anthropic in commits.
