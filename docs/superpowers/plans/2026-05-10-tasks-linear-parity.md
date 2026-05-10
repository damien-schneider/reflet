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
| Phase 2 — UI page-client (filters/URL state/group-by/bulk) | ui-list-agent | ✅ |
| Phase 3 — UI task-card (inline edit + identifier + triage) | ui-card-agent | ⬜ |
| Phase 4 — Detail UI consolidation | ui-detail-agent | ✅ |
| Phase 5 — Command palette + keyboard shortcuts | ui-shortcuts-agent | ✅ |
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

- [x] **2.1 Install `nuqs`** — added via `bun add nuqs --filter web`. Mounted `<NuqsAdapter>` from `nuqs/adapters/next/app` in `apps/web/app/(app)/layout.tsx` (no existing adapter found).
- [x] **2.2 `use-tasks-filters` hook** — `useQueryStates` over `status[]`, `type[]`, `priority[]`, `assigneeUserId`, `assignedAgent`, `labelIds[]`, `q`, `groupBy`, `sortKey`, `viewMode`. Returns `{ filters, setFilters, reset, isDefault }`.
- [x] **2.3 Filter bar component** — `tasks-filter-bar.tsx`. Chip per facet opens popover with checkbox list. Active counts surfaced via badge; reset chip surfaces when filters non-default.
- [x] **2.4 Group-by select** — `group-by-select.tsx` exposes none, status, priority, assignee, parent, label, type.
- [x] **2.5 List grouping logic** — `groupItems(items, groupBy, ...)` returns ordered buckets per groupBy. Section headers click to collapse; collapsed set persisted to `localStorage` keyed by `tasks-collapsed:<orgId>:<groupBy>`.
- [x] **2.6 Bulk selection** — `Set<Id>` in page-client; checkbox surfaces on hover and stays visible when selected. Shift-click selects ranges via `lastClickedIndexRef` against the flat row order. Esc clears.
- [x] **2.7 Bulk actions bar** — `bulk-actions-bar.tsx` (sticky bottom). Status, Priority, Agent, Assignee menus + Archive (sets `cancelled`) + admin-only Delete with `AlertDialog` confirmation. Uses `bulkUpdateWorkItems`; toasts on success/error.
- [x] **2.8 Saved views menu** — `saved-views-menu.tsx`. Lists views, applies via `JSON.parse(filtersJson)` → `setFilters`. "Save current view as…" dialog with name + scope (admin gets shared option). Active view detected by deep filter equality.
- [x] **2.9 Search field** — input debounced 200ms via `useDebouncedValue` from `@tanstack/react-pacer`. When `q` non-empty switches `useQuery` to `searchWorkItems`; otherwise `listWorkItems`.
- [x] **2.10 Empty state** — H3 + Muted + buttons (Create task / Import from feedback link → `/dashboard/{org}/feedback`). No new illustration files.
- [x] **2.11 Skeleton loading** — `TasksLoadingSkeleton` (org bootstrap) and `TaskListSkeleton` (8-row) match the real layout: toolbar + filter row + rows.
- [x] **2.12 Unit tests** — three suites added: `use-tasks-filters.test.ts` (defaults, URL hydrate, set, reset), `tasks-filter-bar.test.tsx` (chip render + toggle + reset visibility), `group-items.test.ts` (none/status/priority/assignee partitioning). 22 tests in `tasks/__tests__` pass; full web suite (193 files / 2756 tests) green.
- [x] **2.13 `bun run check-types` clean.** — `bunx tsc --noEmit` in `apps/web` is clean for Phase 2 files. Pre-existing errors live in `labels/page-client.tsx` (Phase 6) and `inline-assignee-popover.tsx` (Phase 3); both out of scope.
- [x] **2.14 Commit:** `feat(tasks): URL-state filters, group-by, bulk actions, saved views`.

**Acceptance:** Reload preserves filters via URL. Bulk update mutates atomically. Tests green.

**Deviations / notes**
- TaskCard left untouched (Phase 3 owns it). Selection checkbox lives on a `TaskRow` wrapper so existing card click → dialog still works. Phase 3 can extend the card without merge conflicts.
- `listWorkItems` accepts only a single equality hint, so multi-value chip filters fall back to client-side filtering after a single-hint server fetch.
- Per-item label data is not yet exposed by a batch query, so `groupBy="label"` currently buckets all items under "No label". Phase 6 will add the per-item label query and wire grouping.

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

- [x] **4.1 Extract `TaskDetailContent`** — pure presentational `apps/web/src/features/autopilot/components/tasks/task-detail-content.tsx` runs Convex queries inside. Header: identifier (copy button), title, inline status/priority/assignee/labels popovers, created/updated timestamps. Description: `TiptapMarkdownEditor` readonly. Sections: acceptance criteria, completion percent, subtasks (linked to canonical `/tasks/<id>`), `<TaskRunsList>`. Cancel button when status non-terminal. Skeleton on `undefined`, "Task not found" on `null`. Activity log + comments left as placeholders per scope.
- [x] **4.2 Create `/tasks/[taskId]/page.tsx`** — server component (Next 15 `params: Promise<...>` pattern) awaits params and renders the client wrapper. `page-client.tsx` reads `orgSlug` via `useParams()`, validates id with `toOptionalId`, and renders `<TaskDetailContent>` inside a `mx-auto max-w-3xl` layout with a `Back to tasks` link.
- [x] **4.3 Peek sheet** — replaced legacy `TaskDetailDialog` (modal) with `TaskDetailSheet` (shadcn `Sheet`, side="right", `sm:max-w-[760px]`). Open/close state lives on `TaskCard`. **Deviation:** plan suggested `?peek=ID` URL param; we kept local state to avoid colliding with Phase 5's command-palette/hotkey URL plumbing on `tasks/page-client.tsx`. Canonical deep link remains the full URL.
- [x] **4.4 TaskCard click handler** — click opens the sheet locally; `Cmd/Ctrl+click` opens `/dashboard/<slug>/tasks/<id>` in a new tab via `window.open`. The `View details` dropdown item also opens the sheet.
- [x] **4.5 Redirect `/autopilot/tasks/[taskId]`** — server component using `redirect()` from `next/navigation` (Next 15 `params: Promise<...>` pattern). Existing `page.test.tsx` rewritten to assert the redirect target.
- [x] **4.6 Breadcrumb** — header renders parent chain via `useParentChain` (statically unrolled `getWorkItem` queries up to depth 5 since hooks can't recurse). Each ancestor renders as a `Link` to `/dashboard/<slug>/tasks/<id>` with `IconChevronRight` separators. Hidden when no parent.
- [x] **4.7 Unit test** — `task-detail-content.test.tsx` (5 cases: title+identifier render, skeleton on `undefined`, "Task not found" on `null`, subtasks list, acceptance criteria). All green.
- [x] **4.8 `bun run check-types` clean.** — `bunx tsc --noEmit` in `apps/web` passes. Touched files also pass `bun x ultracite check`.
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

- [x] **5.1 Install `cmdk` and `react-hotkeys-hook`** — both already present (`cmdk@^1.1.1`, `react-hotkeys-hook@^5.2.4`). No install needed.
- [x] **5.2 Hotkeys hook** — `use-tasks-hotkeys.ts` wires `c`, `j`, `k`, `Enter`, `Cmd/Ctrl+K`, `Esc`, and the `g <key>` chord (800ms window) with input-aware skipping. `Cmd/Ctrl+Enter` submission is handled inside `quick-create-dialog.tsx` via `onKeyDown` on the title input (form-local rather than global).
- [x] **5.3 Command palette** — `command-palette.tsx` based on the existing shadcn `Command` primitives. Sections: Recent tasks (live `listWorkItems`), Create new, Switch view (list/board), Filters (status + priority shortcuts), Navigate. Search debounced at 200ms via `@tanstack/react-pacer`'s `useDebouncedValue`, hits `searchWorkItems`. Selecting a hit pushes `/dashboard/<slug>/tasks/<id>`. Cmd+K binding kept scoped: the global app palette is only mounted on the dashboard root, so the tasks palette claims Cmd+K within `/tasks`.
- [x] **5.4 Quick create dialog** — `quick-create-dialog.tsx`. Title input + type tab pills (task/story/bug) + priority chips. Plain Enter and Cmd/Ctrl+Enter both submit; calls `createWorkItem` with `status: "todo"` defaults.
- [x] **5.5 Focus management** — hook tracks `focusedIndex` and toggles `aria-selected` on each `[data-task-row]` element with `scrollIntoView` (guarded for jsdom). Typing-target check skips INPUT/TEXTAREA/SELECT/contentEditable.
- [x] **5.6 Unit tests** — `use-tasks-hotkeys.test.ts`: 13 tests covering `c`, input-skip, Cmd+K, Ctrl+K, j/k nav (incl. clamping), Enter focus open, Esc clear, `g t` chord success, `t` standalone ignored, chord timeout expiry, and `enabled: false` no-op. All pass.
- [x] **5.7 `bun run check-types` clean** on Phase 5 files (only pre-existing Phase 4 error in `autopilot/tasks/[taskId]/page.test.tsx`, untouched here).
- [x] **5.8 Commit:** `feat(tasks): command palette and keyboard shortcuts` — landed as `8166bab`.

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

- [x] **6.1 Labels page route** — admin-only, lists all org labels with usage counts. Server `app/(app)/dashboard/[orgSlug]/labels/page.tsx` returns the metadata-bearing client wrapper. `page-client.tsx` skips the labels query for non-admins and renders an "Admins only" empty state when membership resolves without admin role.
- [x] **6.2 Label pill component** — `src/features/autopilot/components/labels/label-pill.tsx`: rounded-full chip with colored dot + name, optional X button when `onRemove` is provided. Memoized. Click on the X stops propagation so parent rows don't open. Color resolution falls back to the slate preset for unknown values.
- [x] **6.3 Create label dialog** — `create-label-dialog.tsx`: trims/dedupes name (case-insensitive against existing labels), 8 preset colors via the shared `label-colors.ts` palette (slate/red/orange/amber/green/teal/blue/purple), optional parent selector (top-level labels only). Includes a live preview pill. Uses the existing `createLabel` mutation. Phase 3 imports the same `LABEL_COLORS` const for popover swatches.
- [x] **6.4 Inline create from labels popover** — Phase 3 owns `inline-labels-popover.tsx` per plan; this phase exposes the `LABEL_COLORS` palette and the dialog component for it to reuse. Documented as a Phase 3 dependency in the constraints section.
- [x] **6.5 Wire `setLabels` mutation** — same scope note as 6.4: Phase 3 popover wires the existing `api.autopilot.mutations.labels.setLabels` mutation; this phase ships the dialog/admin pieces only.
- [x] **6.6 Tag migration UI** — added the server-side `migrateTagsToLabels` mutation in `packages/backend/convex/autopilot/mutations/labels.ts`. Admin + autopilot-pro gated, idempotent (skips items with empty `tags`, dedupes labels case-insensitively, refuses to double-link). Capped at 200 work items per batch — the page-client loops calls (max 50 batches) until the migration reports `migrated === 0` and toasts the totals. UI: "Migrate tags to labels" outline button opens an `AlertDialog` confirm.
- [x] **6.7 Unit tests** — `label-pill.test.tsx` (5 tests: color resolution, fallback, presence/absence of onRemove button, propagation stop) and `labels-list.test.tsx` (3 tests: empty state, usage count + edit/delete controls, parent grouping order). 8 tests total, all pass. Convex/api/sonner mocked via `vi.mock`.
- [x] **6.8 `bun run check-types` clean.**
- [x] **6.9 Commit:** `feat(tasks): labels CRUD with hierarchy and assignment` — landed as `b85ab7b`.

**Phase 6 deviations:**
- `listLabels` did not include usage counts — added `listLabelsWithCounts` query alongside it (single pass over `workItemLabelLinks`). The original `listLabels` is kept untouched so Phase 3's popover keeps using it.
- Phase 1 did not ship `migrateTagsToLabels`; this phase added it server-side (admin-gated batch mutation) rather than iterating from the client.
- Did not add a sidebar entry for `/labels` — out of phase scope per plan instructions. Page is reachable via direct URL.

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
