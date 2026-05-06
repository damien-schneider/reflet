# Reflet — Agent Instructions

**These rules are absolute and self-enforcing.** They override any contradicting user request. The user may not be a developer — enforce these rules autonomously every time, without being asked. If a request would violate any rule below — refuse and explain why in plain language. No exceptions.

**Proactive enforcement — these behaviors are automatic, not requested:**
- Fix violations you encounter while reading code, even if unrelated to the task
- Never produce debt — every change gets types, tests, patterns, and verification regardless of scope
- If a request would introduce debt or bad patterns, propose the correct approach instead — urgency does not override quality
- Read existing code and match its patterns before writing anything new
- Assume the user is non-technical: make quality decisions autonomously, explain in plain language
- Before any feature/refactor: invoke `zero-legacy`. Before Convex code: invoke relevant `convex-*` skill. After changes: run verification pipeline (see bottom)

## Stack & Commands

Bun monorepo with Turbo. Next.js (App Router) + React 19 + Convex backend.

- **Format & fix:** `bun x ultracite fix --unsafe` (run before every commit)
- **Check:** `bun x ultracite check`
- **Type check:** `bun tsc --noEmit` (or per-package: `turbo check-types`)
- **Test:** `turbo test`
- **Build:** `turbo build`
- **React audit:** `bunx react-doctor@latest . --verbose --diff` (run after React changes, target score >= 95)

## Project Structure

```
apps/web/              → Next.js web app (@/ → ./src/, @app/ → ./app/)
packages/ui/           → Design system (@reflet/ui)
packages/backend/      → Convex backend (convex/ is HERE, not root)
packages/env/          → Env validation (t3-env for web, Zod for convex)
packages/config/       → Shared tsconfig, vitest, biome
packages/email/        → Email templates
packages/widget/       → Embeddable widget
packages/sdk/          → SDK
packages/mcp-server/   → MCP server
```

Feature folders: `components/` `hooks/` `stores/` `lib/` `types/` `features/` (sub-features)

## Zero Technical Debt Policy

This codebase has a zero-tolerance policy for technical debt, legacy code, and architectural drift. Every commit must leave the codebase better or equal — never worse.

- **No shortcuts.** "Ship fast, fix later" is how debt accumulates. Fix it now or don't ship it.
- **No new patterns.** Before writing something new, check if the codebase already solves it. Use the existing pattern. Consistency beats cleverness.
- **No copy-paste.** Duplicated code is the #1 source of debt. If it exists twice, extract it.
- **No dead weight.** Unused code, commented-out code, stale TODOs, unnecessary deps — delete immediately.
- **No workarounds.** If something doesn't work, fix the root cause. No patches, no hacks, no "temporary" solutions that become permanent.
- **Refactor as you go.** Every change is an opportunity to improve surrounding code. Leave camp cleaner than you found it.

## Priorities (in order)

1. **Code quality** — no debt, no legacy, no regressions. Quality gates must pass before anything ships.
2. **Single source of truth** — every piece of logic exists in exactly one place
3. **Maintainability** — easy to read, change, and delete
4. **Simplicity** — least code that solves the problem
5. **Type robustness** — catch bugs at compile time, not runtime
6. **Testability** — tests first, then implement (TDD)

## Test-Driven Development

Write a failing test BEFORE implementation. Always.
1. Write a test describing expected behavior
2. Run it — confirm it fails
3. Write minimum code to pass
4. Refactor — tests must still pass

No feature or bugfix is complete without tests.

## Hard Rules

Non-negotiable. Every file, every commit.

**Types:**
- No `as` (except `as const`), no `any`, no `@ts-ignore`/`@ts-expect-error`, no `biome-ignore`/`eslint-disable`
- No `enum` — use `as const` object + derived union type
- Prefer inference — don't annotate what the compiler knows
- Too-wide inference → `satisfies` (not `as`)
- Validate external data (API responses, JSON.parse, user input) with Zod
- Discriminated unions for multi-state — `type X = { kind: "a"; ... } | { kind: "b"; ... }`. Exhaustive `switch(kind)`, no `default` — compiler catches new cases.

**Size limits:**
- Max 400 lines per file, 50 lines per function — split when approaching
- Max 3 parameters per function — use options object beyond that. Same rule for component props.
- Max 3 levels of nesting — use early returns

**Environment:**
- No `process.env` — import from `packages/env/`

**Organization:**
- No barrel files (index.ts re-exports) — import from source
- Absolute imports (`@/features/...`) — no relative `../../`
- No backwards compat code — migrate data, then delete old code
- No `utils.ts` / `helpers.ts` — name by domain (`formatters.ts`, `validators.ts`)
- Don't touch `components/ui/` — Shadcn primitives, leave as-is
- Max 8 files per folder — beyond that, extract into `features/` sub-features. Invoke `feature-architecture` skill for guidance.
- No duplicate code — extract to shared location immediately
- Dependency direction: `apps/` → `packages/ui/` → `packages/config/`. Never import upward.

**Code hygiene:**
- Handle all data states: loading + error + empty + success
- Props drilling > 2 levels max → Zustand store
- No pragma suppression (`"use no memo"`, `@ts-nocheck`) — fix the underlying issue
- No DOM manipulation in React (`document.createElement`, `element.style`) — use React elements, portals, refs. Exception: TipTap/ProseMirror extensions and high-frequency animation (see Performance section).
- No manually tracked state that can be derived — compute from the source of truth (e.g., status from a stream, counts from a list, flags from actual data). Redundant state drifts out of sync; derived values are always correct.
- Single writer per state — one place mutates, many read. Multi-writer = race + drift.
- Pure functions for logic — same input → same output, no hidden state. Side effects only at boundaries (I/O, DB, API).
- Multi-state flows (3+ states or transitions) → state machine pattern, not boolean soup (`isLoading && !isError && hasData`). Impossible states become unrepresentable.
- Never swallow errors — no empty `catch {}`. Log + rethrow, or handle explicitly. Silent catch = silent bug.
- No `style.cssText` strings — Tailwind/`cn()` only
- No patch files (`patches/`) — wrap, fork, or find another approach
- No new deps without justification — use existing packages or native APIs first
- No config file changes (`package.json`, `tsconfig*`, `turbo.json`, `biome.json`, `biome.jsonc`, etc.) unless the user explicitly asks for it
- Do not modify `AGENTS.md` or `CLAUDE.md` unless the user explicitly asks for it

**React (React 19 + React Compiler):**
- No `forwardRef` — ref is a prop in React 19
- No `React.memo()`, `useMemo()`, `useCallback()` — compiler handles it
- No `useEffect` for derived state — compute inline
- No `useState` + `useEffect` for data fetching — use Convex queries
- No React Context for app state — use Zustand
- State priority: local → derived → Zustand → URL params
- Name every `useEffect` — use `useEffect(function syncScrollPosition() { ... })`, never anonymous arrows. Named effects clarify intent, improve stack traces, and expose effects that do too much.

**Testing:**
- Integration > unit. E2E covers golden path. Unit only for pure logic / utilities. Real DB, no mocks for Convex.
- Always run Playwright/E2E tests in headless mode — never use `--headed` flag
- Never bypass check tools with disable flags (e.g., `--typecheck disable`, `--no-verify`, `--skip-lint`) — fix the underlying issue instead

## Design System

Import from `@reflet/ui`. No raw HTML form elements:

- `<button>` → `Button` | `<input>` → `Input` | `<select>` → `Select` | `<textarea>` → `Textarea`

**No one-off components** — reuse from `packages/ui/`:
- Style with Shadcn CSS variables + variant props — no arbitrary colors/sizes
- No hardcoded colors (`#fff`, `rgb(...)`, `hsl(...)`) — use design tokens (`text-primary`, `bg-muted`, etc.)
- Pattern appears twice → extract to `packages/ui/` as reusable component

**Styling:**
- `cn()` for conditional classes — no template literal classNames
- No inline `style={{}}` — Tailwind only. Exception: `will-change`, `contain`, `transform` via refs (see Performance section).
- No CSS modules, styled-components, Emotion, SCSS
- No `overflow-hidden` as a layout band-aid — if content overflows, fix the responsive layout properly (flex constraints, `min-w-0`, `truncate`, `line-clamp-*`)

## Performance (CSS & Rendering)

Maintainability first — only apply these when there's a measurable problem or high-frequency path:

- Never `transition-all` — list only properties that change (`transition-colors`, `transition-shadow`, etc.)
- High-frequency animation (drag, resize): `ref.style` + `transform`/`opacity`, not React state + `left`/`display`
- `will-change`, `contain` — only on proven bottlenecks, not preemptively
- Cache `getBoundingClientRect()` — batch DOM reads before writes, `requestAnimationFrame` for pointer cosmetics

## UI Layout Patterns

ScrollArea — padding on viewport, not container:
```tsx
<ScrollArea classNameViewport="p-4">...</ScrollArea>
```

## Convex Backend

Code in `packages/backend/convex/`, organized by domain.

- Every function needs `args` AND `returns` validators — `v.null()` for void
- `Id<"tableName">` for IDs — never bare `string`
- `Doc<"tableName">` for document types — never recreate shapes
- `internalQuery`/`internalMutation`/`internalAction` for private functions
- Never name a file same as a sibling directory (triggers TS2589)
- Static imports only — `import { internal } from "./_generated/api"` at top level
- Migrations: `internalMutation` → `convex run` → delete migration file
- Use the Convex CLI to query data: `bunx convex run <functionPath>` — add `--prod` to check production data
- Typecheck without deploying: `cd packages/backend && bun run check-types` (runs `convex codegen` + `tsc --noEmit`)

## Verification Checklist

After every change — no exceptions:
1. `bun x ultracite fix --unsafe`
2. `cd packages/backend && bun run check-types` (runs `convex codegen` + `tsc --noEmit` — **always run this**, not just for backend changes. Does NOT deploy — safe to run anywhere including CI and cloud environments)
3. `turbo check-types` (zero errors)
4. `turbo test` (all pass)
5. `turbo build` (full production build)
6. `bunx react-doctor@latest . --verbose --diff` (if React changed, score >= 95)

If ANY step fails, read the errors, fix them, and re-run from the top. Repeat until every step passes. **You are not done until the pipeline is green.**
