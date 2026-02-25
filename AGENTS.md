# Ultracite Code Standards

This project uses **Ultracite**, a zero-config preset that enforces strict code quality standards through automated formatting and linting.

## 🎯 Priority #1: Scalability, Maintainability & Architecture

**CRITICAL RULE: No file should exceed 400 lines of code.**

When a file approaches or exceeds 400 lines:
1. Split it into smaller, focused modules
2. Extract reusable logic into separate files
3. Create dedicated files for types, constants, and utilities
4. Use composition patterns to combine smaller pieces

**Architecture principles (in order of priority):**
1. **Scalability** - Design for growth; new features should be easy to add
2. **Maintainability** - Code should be easy to understand and modify
3. **Separation of concerns** - Each file/module has a single responsibility
4. **Testability** - Components and functions should be easy to test in isolation
5. **Reusability** - Extract common patterns into shared utilities

## Quick Reference

- **Format code**: `bun x ultracite fix`
- **Check for issues**: `bun x ultracite check`
- **Diagnose setup**: `bun x ultracite doctor`

Biome (the underlying engine) provides robust linting and formatting. Most issues are automatically fixable.

---

## Core Principles

Write code that is **accessible, performant, type-safe, and maintainable**. Focus on clarity and explicit intent over brevity. Prioritize **scalability and robustness** — code should be structured to grow without accumulating debt.

### No Legacy, No Backwards Compatibility

- **Never keep backwards compatibility code.** If a schema, type, or API changes, write a migration and remove the old code entirely.
- Do not leave dead values in union types, dead keys in maps, or commented-out code "just in case."
- When removing a value from a database validator (e.g., removing a union member), write a one-off migration to update existing data first, then remove the value from the schema in the same changeset.
- Convex migrations: use `internalMutation` to batch-update documents, run the migration with `convex run`, then delete the migration file once it's been executed.
- The codebase should always reflect the current state of the system, never a historical one.

### Type Safety & Explicitness

**Inference first** — don't annotate what the compiler already knows. An `as` cast means the data flow is wrong — fix the source, not the symptom.

**Banned patterns (zero tolerance):**
- **`as Type` assertions** (except `as const`) — fix upstream, use `satisfies`, narrow with control flow, or validate with Zod at boundaries
- **`any`** — use `unknown` and narrow, or determine the actual specific type
- **`@ts-ignore` / `@ts-expect-error` / `@ts-nocheck`** — remove the directive, fix the underlying type error
- **`biome-ignore` / `eslint-disable`** — fix the underlying code issue, remove the suppression
- **Non-null assertions `!.`** — add null check, early return, or throw with descriptive message
- **Unsafe `Function` type** — use specific function signature: `(arg: string) => void`
- **Empty object type `{}`** — use `Record<string, never>` (truly empty) or `Record<string, unknown>`

**Preferred fix order when removing `as` casts:**
1. Remove it — often redundant, inference handles it
2. Fix upstream — function returns wrong type, fix the signature
3. Use `satisfies` — for config/literal objects needing validation without widening
4. Zod at boundary — API responses, JSON, user input → runtime validation
5. Null check — nullable value → early return / throw / `if` check
6. Check discriminant — discriminated union → check the tag field
7. Type guard — last resort only

**When explicit types ARE needed:**
- Function parameters (can't infer from body)
- Exported public API return types (prevents accidental API changes)
- Complex objects where inference produces overly wide types
- Use `satisfies` over `as` to validate a value matches a type while preserving the narrower inferred type
- Use `as const` for immutable literal types

**Additional banned types (zero tolerance):**
- **`object` type** — use `Record<string, unknown>` or specific interface
- **`String`, `Number`, `Boolean`, `Object`, `Symbol`** wrapper types — use lowercase primitives: `string`, `number`, `boolean`
- **`<T = any>`** generic defaults — use `<T = unknown>` or a meaningful constraint like `<T extends Record<string, unknown>>`
- **`Record<string, any>`** — always `Record<string, unknown>` and narrow
- **Untyped `catch (error: any)`** — catch is `unknown` in strict mode; narrow with `instanceof Error` before `.message`

**Strict narrowing — never bypass the type system:**
- Use `typeof`, `instanceof`, `in` operator, and discriminant checks — not type guards when control flow suffices
- Early return narrows: `if (!user) return null;` — after this line, `user` is non-nullable
- `JSON.parse()` returns `unknown` — always pipe through Zod schema, never cast with `as`
- Array indexing with `noUncheckedIndexedAccess` returns `T | undefined` — always check before using
- Prefer narrowing over type guards; prefer type guards over `as`; `as` is always last resort

**Immutability by default:**
- Use `Readonly<T>` for function parameters that must not be mutated
- Use `readonly T[]` or `ReadonlyArray<T>` for array params that are not modified
- Prefer `as const` for literal objects and tuples — prevents type widening
- Update objects via spread `{ ...existing, field: newValue }` — never mutate directly

**Generic constraints — be specific:**
- `<T extends Record<string, unknown>>` not `<T extends object>` or `<T extends {}>`
- Constrain generics tightly: `<T extends { id: string }>` not bare `<T>` when structure is known
- Use `satisfies` to validate return values without widening the type

**Strict function signatures:**
- Every exported function must have explicit parameter types and return type
- Use `readonly` modifier on array/object params not mutated: `(items: readonly Item[]) => Result`
- Prefer explicit `undefined` over optional for required-but-nullable: `(value: string | undefined)` forces caller to be explicit
- Functions that always throw must return `never`
- Type event handlers precisely: `React.MouseEvent<HTMLButtonElement>`, `React.ChangeEvent<HTMLInputElement>` — not generic `Event`

**Discriminated unions over boolean flags:**
- Ban `{ isLoading: boolean; isError: boolean; data: T | null }` — creates impossible states
- Use discriminated unions: `{ status: "idle" } | { status: "loading" } | { status: "success"; data: T } | { status: "error"; error: Error }`
- Prevents representing invalid states at the type level

**Exhaustive switch — never miss a case:**
- Use `assertNever` helper: `function assertNever(x: never): never { throw new Error("Unexpected value"); }`
- Every `switch` on a discriminated union must have `default: return assertNever(value)` — compile error if case missed

**Zod at boundaries — schema-first types:**
- Define schema first, derive type with `z.infer<typeof Schema>` — never maintain both manually
- Validate all API responses, `JSON.parse()`, and user input with Zod — not `as Type`
- Schemas live in `features/<name>/schemas/` or `shared/schemas/`

### TSConfig — Non-Negotiable Flags

```jsonc
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

### Naming Conventions

**Files:** kebab-case — `booking-card.tsx`, `use-booking.ts`, `price-calculator.ts`
- **Banned file names:** `utils.ts`, `helpers.ts`, `misc.ts` — name by domain

**Functions:** verb + noun — `fetchUser()`, `calculateTotal()`, `formatCurrency()`, `parseDate()`, `validateEmail()`, `handleSubmit()`
- Event handlers: props use `on` + Event, implementation uses `handle` + Event

**Booleans:** predicate prefix — `isLoading`, `hasError`, `canEdit`, `shouldRedirect`
- **Banned:** bare `loading`, `visible`, `active`, `disabled`, `error`, `valid` as boolean names

**Constants:** `SCREAMING_SNAKE_CASE` for primitive config — `MAX_RETRIES`, `DEFAULT_TIMEOUT_MS`

**No magic values** — extract to named constants: `if (retries > 3)` → `if (retries > MAX_RETRIES)`

**Components:** PascalCase — `BookingCard`. **Types:** no `I`/`T` prefix — `User` not `IUser`

### Async & Promises

- Always `await` promises in async functions - don't forget to use the return value
- Use `async/await` syntax instead of promise chains for better readability
- Handle errors appropriately in async code with try-catch blocks
- Don't use async functions as Promise executors
- **Never fire-and-forget promises** — `saveData(data)` without `await` is banned; use `void saveData(data).catch(reportError)` if intentionally fire-and-forget
- Use `AbortController` for cleanup in `useEffect` — or prefer a data fetching library (TanStack Query, SWR, Convex)
- Use `Promise.allSettled` when partial failure is acceptable, `Promise.all` when all must succeed
- Use `AbortSignal.timeout(ms)` for request timeouts — not manual `setTimeout`

### React & JSX

**Components are functions of state.** Keep them pure, side-effects minimal, and state close to where it's used. Prefer composition over configuration.

**React 19 / React Compiler — remove legacy patterns:**
- **Remove `forwardRef`** — `ref` is a regular prop in React 19
- **Remove `React.memo()`, `useMemo()`, `useCallback()`** — the React Compiler handles memoization automatically. Only keep if there's a proven, profiled reason (e.g., referential identity for third-party libs)
- Extract truly static values (objects, arrays) as constants outside the component. Dynamic values → write naturally, trust the compiler.
- **Don't break the rules of React** — the compiler requires: pure render functions (no side effects during render), no mutating variables after render, hooks at top level only

**Server Components (Next.js App Router):**
- **Default to Server Components** — zero client JS, direct `await` in component body
- `"use client"` only when needed: hooks, browser APIs, event handlers, interactivity
- Don't pass non-serializable props (functions, classes, Date objects) from Server → Client components
- Composition: keep Client Components small, pass Server Components as `children`

**Suspense boundaries — progressive loading:**
- Every async data boundary needs `<Suspense fallback={<Skeleton />}>`
- Nest Suspense for independent loading: sidebar, main content, header load separately
- Don't Suspense-wrap leaf components — too granular, clutters the tree

**Anti-patterns to fix immediately:**
- **`useEffect` for derived state** — compute inline instead of `useState` + `useEffect` sync
- **`useEffect` for event responses** — call directly in the event handler
- **`useState` + `useEffect` for data fetching** — use a data fetching library (TanStack Query, SWR, or Convex's reactive queries)
- **Monolithic components** with 4+ config props — split into compound components
- **State that should be derived** — if it can be computed from other state, don't store it
- **Direct DOM manipulation** — use React's event system, refs, and portals instead of `document.querySelector` / `window.addEventListener`

**State management hierarchy:**
1. Local state first — `useState` for component-specific state
2. Derived values — compute, don't store
3. Feature store — Zustand for shared state within a feature
4. Server state — data fetching library, NOT `useState` + `useEffect`
5. URL state — searchParams for filters, pagination, tabs
6. Global state — minimal, only for truly app-wide concerns (auth, theme)

**Component rules:**
- Use function components over class components
- Call hooks at the top level only, never conditionally
- Use the `key` prop for elements in iterables (prefer unique IDs over array indices)
- Don't define components inside other components
- Prefer early returns over nested ternaries for conditional rendering

### Error Handling

- **Never swallow errors** — empty `catch {}` blocks are banned; every catch must handle, log, or rethrow with context
- Use `cause` for error chains: `throw new Error("Context", { cause: originalError })`
- **Error boundaries** — wrap route-level features with `react-error-boundary`; always provide recovery (retry button)
- **Handle all data states** — loading + error + empty + success; never render only the success path
- **Form validation:** Zod + react-hook-form + `@hookform/resolvers/zod` — no manual validation

### Dead Code & Cleanup

Git has the history — delete aggressively. Every dead line is cognitive load.

- **Commented-out code** — delete all. Use `git log` if you need it later
- **Unused exports/imports/variables** — delete. Use `knip` for detection
- **Stale TODOs** (>3 months old) — do it now or delete. Format: `// TODO(@owner): actionable task`
- **Unused dependencies** — remove from `package.json` (check config files first)
- **Dead feature flags** (always true/false) — remove the flag and dead branch
- **Empty files** — delete

### Code Organization, Splitting & Feature Structure

**Hard limits:**
- **Files**: prefer ~230 lines; **hard limit 400 lines** (exception: test files, story files)
- **Functions**: prefer ≤30 lines; **hard limit 50 lines**
- **Parameters**: max 2-3 — use options object beyond that
- **Nesting**: max 3 levels — use early returns
- **Single responsibility**: if you need "and" to describe it, split it

**Splitting protocol** — when a file exceeds 400 lines:
1. Extract types/schemas → `types/` or `schemas/` subfolder
2. Extract constants/config → `config/` subfolder
3. Extract hooks → `hooks/` subfolder
4. Extract logic → `lib/` subfolder (domain-named: `parsers/`, `validators/`, etc.)
5. Keep the component lean — only JSX and minimal glue logic
6. Update imports everywhere with absolute paths

**Feature folder structure** — colocate related files by feature:
```
features/
├─ booking-flow/
│  ├─ components/         # max ~8 files per components folder otherwise -> sub feature
│  ├─ hooks/
│  ├─ types/
│  ├─ stores/             # feature-scoped state (Zustand)
│  ├─ lib/                # domain logic (parsers, pricing, mappers)
│  ├─ features/           # sub-features (fractal nesting)
│  │  └─ seat-selector/
│  └─ __tests__/
```

- If `components/` grows past ~8 files, extract a **sub-feature** under `features/`
- **No barrel files** (`index.ts` re-exports) — import directly from source files
- **Direct imports with absolute paths** — `@/features/...` over `../../`
- Use `import type { X }` for type-only imports

**Props drilling** — fix when props pass through 3+ component levels:
- Create a feature-scoped store in `stores/`
- Move state from parent to the store
- Subscribe directly in consuming components
- Remove the prop chain from all intermediate components

**Duplicated code — eliminate aggressively:**
- Repeated pure logic → extract to `lib/` (feature) or `shared/lib/` (cross-feature), named by domain
- Shared layouts/wrappers → extract to layout components in feature or `shared/ui/`
- Two components with similar state/effect logic → extract a custom hook
- Shared types across packages → put in a dedicated shared package, never duplicate type definitions
- Copy-pasted test setup → extract to `beforeEach` or shared test helpers per feature
- If an abstraction only has one consumer after cleanup, inline it — don't keep unnecessary indirection
- **Same problem → same solution.** One approach per concern across the codebase. When you find two patterns for the same thing (e.g., two different data fetching patterns, two date formatting approaches), consolidate to one.
- **Never have `utils.ts`** — name by what it does: `formatters.ts`, `validators.ts`, `parsers.ts`
- **Never duplicate what can be derived.** If a value can be computed from existing state or data, compute it — don't store a second copy (applies to both React state and data structures)

**General organization:**
- Extract complex conditions into well-named boolean variables
- Prefer simple conditionals over nested ternary operators
- Keep components focused on rendering. Business logic, data fetching, and transformations belong in hooks or utilities.
- Do NOT refactor Shadcn UI components (`components/ui/`) — they are primitives

**Dependency direction (unidirectional, enforced):**
- `app/` → `features/` → `shared/` → `lib/` — never backwards
- Features NEVER import other features' internals — go through `shared/` or events
- Shared code NEVER imports from features

**Composition over configuration:**
- Prefer compound components over monolithic components with 5+ config props
- Split monolithic: `<Card><CardHeader /><CardContent /><CardFooter /></Card>`

### Security

- Validate URL redirects against allowlist — never `router.push(searchParams.get("next"))` without validation
- Validate file uploads: type + size on client AND server
- Client validation is UX — server validation is security; always re-validate on server

### Environment & Configuration

- **Validate all env vars at startup** with Zod or T3 Env — fail fast on boot, not at runtime
- **Never access `process.env` directly** in application code — import from validated `env.ts`
- **Client-exposed vars** (`NEXT_PUBLIC_*`, `VITE_*`) — public values only, never secrets
- **Configuration objects** — centralize in `config.ts`, derive from validated env, use `as const`

### UI Components

**Never use raw HTML form elements — always use `@the-cloud/ui` components:**

**Banned native elements (zero tolerance):**
- **`<button>`** — use `Button` (with appropriate `variant` and `size`)
- **`<input>`** — use `Input` (with appropriate `variant` and `size`)
- **`<select>`** — use `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`
- **`<textarea>`** — use `Textarea`
- **Exception:** color swatches, file inputs, or other highly specialized elements where the design system component doesn't apply

**Component mapping:**
- `Button` — all clickable actions, with variants: `default`, `outline`, `secondary`, `ghost`, `soft`, `destructive`, `accent`, `muted`, `nav`, `dashed`, `link`, `link-muted`
- `Input` — all text/number/email/password inputs, with variants: `default`, `ghost`, `filled` and sizes: `xs`, `sm`, `default`, `lg`, `xl`
- `Select` + compound parts — all dropdown menus (supports groups via `SelectGroup` + `SelectLabel`)
- `Textarea` — multi-line text input
- `Badge` — tags, labels, and status indicators
- `Label` — form labels
- `Separator` — visual dividers
- `Card`, `CardHeader`, `CardContent`, `CardFooter` — card layouts
- `Toggle` or `ToggleGroup` — selectable options
- `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` — tabbed interfaces
- `Slider` — range inputs
- `Checkbox`, `RadioGroup`, `Switch` — selection controls
- `Dialog` — only when a true modal is needed (prefer inline forms)

Import from `@the-cloud/ui` directly:
```typescript
import { Button, Input, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@the-cloud/ui";
```

This ensures visual consistency, accessibility, and maintainability across the codebase. When running code quality checks, flag any raw `<button>`, `<input>`, `<select>`, or `<textarea>` elements that should be replaced with design system components.

### Convex Development

**This project uses Convex as its backend. Convex code must be written with the same rigor as the rest of the codebase.**

**Always use Convex skills before implementing or modifying Convex code:**
- Invoke the relevant `convex-*` skill (e.g., `convex-functions`, `convex-schema-validator`, `convex-realtime`, `convex-file-storage`, `convex-agents`, `convex-best-practices`, `convex-security-check`, `convex-eslint`) before writing any Convex backend code
- When unsure which skill applies, invoke `convex` (the umbrella skill) to get routed to the right one
- After implementing Convex code, invoke `convex-security-check` to verify authorization, argument validation, and access control
- Invoke `convex-eslint` to ensure code passes `@convex-dev/eslint-plugin` rules

**Type safety in Convex code — same zero-tolerance policy:**
- **Never use `@ts-ignore`, `@ts-expect-error`, `any`, or `as Type`** in Convex functions — fix the actual type error
- **Always include `args` and `returns` validators** on every Convex function (`query`, `mutation`, `action`, `internalQuery`, `internalMutation`, `internalAction`)
- Use `Id<"tableName">` from `_generated/dataModel` — never use bare `string` for document IDs
- Use `Doc<"tableName">` for document types — never manually recreate document shapes
- Use `v.null()` for functions that return nothing — never omit the return validator

**Convex file organization — apply the same splitting rules:**
- Convex files follow the same 400-line hard limit as the rest of the codebase
- Organize by domain: `convex/files/`, `convex/calendar/`, `convex/teams/` — not a single monolithic file
- Separate queries, mutations, and actions into focused files when a domain grows
- Extract shared validators and helper types into dedicated files (e.g., `convex/shared/validators.ts`)
- Use `internalQuery`/`internalMutation`/`internalAction` for private functions — never expose internal logic via `query`/`mutation`/`action`

**Verification after Convex changes:**
- Invoke `convex-security-check` after any change touching authorization or data access
- Invoke `convex-eslint` to catch Convex-specific lint issues
- Invoke `refactor-code-quality` to audit for `any`, `as`, `ts-ignore` in the changed files
- Run `bun x ultracite fix` to ensure formatting compliance

---

## Testing

- Write assertions inside `it()` or `test()` blocks
- Avoid done callbacks in async tests - use async/await instead
- Don't use `.only` or `.skip` in committed code
- Keep test suites reasonably flat - avoid excessive `describe` nesting
- **ALWAYS run Playwright/E2E tests in headless mode** - never use `--headed` flag

Run `bun x ultracite fix` before committing.
