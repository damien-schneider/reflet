---
name: zero-legacy
description: Prevent and detect legacy patterns. Use BEFORE implementation (prevention mode) or to audit existing code (audit mode). 20 research-backed anti-patterns AI assistants introduce. Also invoked by clean-code and refactor-code-quality as their legacy detection ruleset.
---

# Zero Legacy

Two modes:
- **Prevention** (default) — Invoke BEFORE writing code. Search codebase for existing solutions first. Reuse > extend > create.
- **Audit** — Invoke on existing code, a directory, or a full codebase to find and fix legacy violations. See "Audit Mode" section below.

## Anti-Patterns

Enforce during implementation. Each pattern appears in 40-100% of AI-generated code.

### AI-Specific

1. **Copy-paste over reuse** — `Grep` for the verb in your function name before writing new ones. If it exists, use it. If it almost exists, extend it. Common: finding five different `useDebounce` hooks in the same project because AI didn't search for existing utilities.

2. **Skipping refactoring** — Every addition must leave surrounding code equal or better. File grows past 400 lines? Split. Function past 50? Extract. AI generates functional code without improving surrounding architecture — refactoring activity dropped to historic lows in AI-heavy codebases.

3. **Over-specification** — Don't create single-use solutions when a generalizable pattern exists. But three similar lines > premature abstraction used once.

4. **Phantom edge cases** — Only validate at system boundaries (user input, API responses, external data). No null checks on non-nullable values, no error handling for guaranteed operations, no re-validation of already-validated data.

5. **Vanilla reimplementation** — Check `package.json` before writing utility code. Don't rewrite date formatting, validation, encryption, or any solved domain.

6. **Fake & brittle tests** — Every test must: (a) assert specific behavior, (b) fail when that behavior changes, (c) cover happy path + 2 edge cases. Delete tests that wouldn't catch a regression. Also: test WHAT the code does, not HOW — tests coupled to implementation details (internal state, specific function calls, render order) break on every refactor, creating fear of changing code.

7. **Comment noise** — Comments explain WHY (business logic, non-obvious decisions), never WHAT. No comments on unchanged code.

8. **Naming convention drift** — AI generates inconsistent names across sessions: `handleClick` vs `onClick` vs `submitForm`, `user-profile.tsx` vs `UserProfile.tsx` vs `userProfile.tsx`. Before naming anything, check how neighboring files name similar things and match exactly. Components: PascalCase. Files: kebab-case. Handlers: `handle` + event. Types: PascalCase, no `I` prefix. Constants: UPPER_SNAKE_CASE.

### Architecture

9. **Backwards-compat shims** — No compat layers, polyfills, or version-checking code. Migrate data, update consumers, delete old code. If migration is too big, break into smaller ones — each completes fully. No "temporary" bridges.

10. **Eternal feature flags** — No feature flags. Ship or keep on a branch — don't merge behind a flag.

11. **God files & fat components** — Max 400 lines/file, 50 lines/function, single responsibility. Component does more than render UI + own state? Extract into hooks, utilities, or sub-components. Especially: no API fetching logic inside UI components — separate data access from presentation.

12. **Dependency creep** — Native APIs first (`structuredClone`, `URL`, `crypto.randomUUID`, `Array.at`), then existing packages, then justify adding new ones.

13. **Abstraction for one** — Don't abstract until 3+ occurrences. Abstraction must make code shorter AND clearer.

14. **Config drift** — Follow existing patterns exactly. Import env from `packages/env/`, validate with Zod, follow existing error shapes. Check how the codebase handles it before adding new config.

15. **`"use client"` sprawl** — Server Components are the default in Next.js App Router. Only add `"use client"` when the component needs interactivity (event handlers, useState, browser APIs). Every unnecessary client directive increases bundle size, prevents SSR, and creates coupling. If only a small part of a component is interactive, extract that part into a separate client component.

16. **Version drift** — All packages in the monorepo must use the same version of shared dependencies (React, TypeScript, etc.). Different versions cause duplicate bundles, context errors, and silent runtime breakage. Check with the existing lockfile before adding or updating any dependency.

### Comprehension & Scale

17. **Comprehension debt** — Every line must be understood by the committer. Read AI-generated code line by line. Can't explain it? Don't ship it.

18. **Monolithic coupling** — Follow dependency direction: `apps/` -> `packages/ui/` -> `packages/config/`. Never import upward. Every module deletable without cascading failures.

19. **Silent error swallowing** — No empty catch blocks. No `console.log`-only error handling. Errors must either be handled with recovery/retry/user feedback, or re-thrown to a boundary that can handle them. `try/catch` that hides failures creates invisible bugs that surface only in production.

20. **Orphaned code after changes** — When removing a feature, route, or component: delete ALL related code — handlers, types, tests, styles, imports, config entries. Don't leave dead paths "just in case." Git has history. Grep for the removed name to find stragglers.

## Pre-Implementation

Before creating files or directories:
- Scan target directory — match existing naming, exports, organization
- Max 8 files per folder — extract into `features/` sub-features beyond that
- No circular deps — if A imports B, B must never import A
- Default to Server Components — only add `"use client"` when interactivity requires it
- Verify: works at 10x data/users? Data model normalized? Queries indexed? No N+1? Lists paginated? Removable without touching unrelated code?

## Audit Mode

When invoked to review existing code (a file, directory, branch diff, or full codebase):

1. **Scope** — Determine what to scan:
   - Specific files/directories provided by user
   - Branch diff: `git diff main...HEAD --name-only` for changed files
   - Full codebase: scan `apps/` and `packages/` source files (skip `node_modules`, `dist`, `.next`, generated files)
2. **Scan** — Read each file and check against all 20 anti-patterns. For each violation found, note the file, line range, pattern number, and what's wrong.
3. **Fix** — Fix every violation autonomously. For each fix:
   - Search the codebase for existing code to reuse before writing new code
   - Ensure the fix doesn't introduce a different anti-pattern
   - Keep changes minimal — fix the violation, don't refactor unrelated code
4. **Verify** — After fixes, run the verification pipeline from AGENTS.md (`bun x ultracite fix --unsafe`, `turbo check-types`, `turbo test`, `turbo build`)
5. **Report** — Summary of violations found and fixed, grouped by anti-pattern

**Integration with other skills:**
- `clean-code` and `refactor-code-quality` should invoke `zero-legacy` audit mode as part of their review process for legacy-specific checks
- This skill focuses on the 20 legacy anti-patterns. For broader code quality (styling, UI library usage, AGENTS.md compliance), defer to `clean-code`

## Litmus Test (pre-commit)

All answers must match. If any doesn't, fix before committing.

| Question | Required Answer |
|----------|----------------|
| Did I search the codebase before writing new code? | Yes |
| Did I reuse existing code or write new? | Reused (or justified why new) |
| Did I add complexity or reduce it? | Reduced or kept equal |
| Can someone unfamiliar understand this in 5 minutes? | Yes |
| Is any of this a "temporary" solution? | No |
| Did I add any backwards-compat code? | No — migrated instead |
| Would I be comfortable deleting this in 6 months? | Yes |
| Does every new test assert specific behavior? | Yes |
| Do my names match the conventions in neighboring files? | Yes |
| Did I clean up ALL code related to anything I removed? | Yes |
