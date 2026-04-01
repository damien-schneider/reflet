---
name: feature-architecture
description: Enforce feature-based (screaming) architecture and folder organization. Use when creating new files/folders, when a directory grows beyond 8 files, when restructuring code, or when asked about folder structure, architecture, or organization. Also use proactively when adding files to any directory — check file count first. Covers segment vocabulary, colocation, shared promotion, and the deletion test.
---

# Feature-Based Architecture

Screaming architecture: folders tell you what the app DOES, not what tech it uses. Organize by business domain, not by file type. Every folder must be small, focused, and deletable.

## Core Principles

1. **Max 8 source files per directory** — When approaching, extract sub-features. Not optional.
2. **Name by domain, never by type** — `booking/` not `modals/`. `search/` not `buttons/`. The folder name should scream the business capability.
3. **Colocate aggressively** — Files that change together live together. Tests, types, constants next to the code that uses them.
4. **Promote to shared only at 2+** — Code stays in the feature until two or more features need it. Then move to `shared/`.
5. **Deletion test** — You should be able to delete an entire feature folder and only break intended consumers. If deleting a folder requires changes in 5+ unrelated places, the coupling is wrong.

## Before Adding Any File

1. Count source files in the target directory
2. If count >= 8: **stop** — extract a sub-feature first, then add your file there
3. If count < 8: check if your file belongs to an existing sub-feature instead of the root
4. Check naming matches the conventions of neighboring files

## Feature Folder Segments

A feature folder can contain these segments. Only create what's needed — not every feature needs all of them.

| Segment | Purpose | File naming |
|---------|---------|-------------|
| `components/` | UI components scoped to this feature | `kebab-case.tsx` |
| `hooks/` | Custom hooks scoped to this feature | `use-kebab-case.ts` |
| `lib/` | Feature-specific logic, API calls, pure functions | `kebab-case.ts` |
| `stores/` | Zustand stores for this feature | `use-kebab-case-store.ts` |
| `types/` | TypeScript types and interfaces | `kebab-case.ts` |
| `schemas/` | Zod validation schemas | `kebab-case.ts` |
| `constants/` | Feature constants and config | `kebab-case.ts` |
| `__tests__/` | Tests colocated with the feature | `kebab-case.test.ts` |

**No junk-drawer folders.** Never create `utils.ts` or `helpers.ts` — name by domain: `formatters.ts`, `validators.ts`, `date-utils.ts`. The file name should tell you what's inside without opening it.

## Structure Examples

### Good: feature with domain-split sub-features

```
calendar/
├── components/
│   ├── analytics/        ← focused sub-feature
│   ├── availability/
│   ├── booking/
│   ├── events/
│   ├── search/
│   ├── settings/
│   ├── sidebar/
│   └── views/
├── hooks/
├── stores/
├── utils/
└── __tests__/
```

A developer working on booking never sees analytics files. Each sub-feature is independently navigable.

### Bad: flat dump (46 files)

```
profile/components/blocks/       ← 46 files dumped flat
├── booking-block.tsx
├── links-block.tsx
├── links-block-constants.ts
├── links-block-context-menu.tsx
├── links-block-derived-state.ts
├── youtube-channel-carousel.tsx
├── youtube-channel-stats.tsx
└── ... (38 more files)
```

Should be:

```
profile/components/blocks/
├── links/
│   ├── links-block.tsx
│   ├── constants.ts              ← scoped to links, no prefix needed
│   ├── context-menu.tsx
│   ├── derived-state.ts
│   ├── display-state.ts
│   ├── empty-state.tsx
│   └── menu-items.tsx
├── youtube/
│   ├── youtube-channel-carousel.tsx
│   ├── youtube-channel-stats.tsx
│   └── youtube-channel-subscribe-button.tsx
├── booking/
│   └── booking-block.tsx
├── shared/
│   ├── render-block.tsx
│   ├── registry.tsx
│   └── drag-handle.tsx
└── ... (each block type gets its own folder)
```

Note: once files are inside `links/`, the `links-block-` prefix is redundant — the folder provides the context. Simplify to `constants.ts`, `context-menu.tsx`, etc.

## How to Split

When a directory exceeds 8 files:

1. **Identify clusters** — Group files by domain/feature prefix. `links-block-*` files belong together.
2. **Create sub-feature folder** — Name by domain: `links/`, not `links-components/`.
3. **Move files** — Move the cluster in. Remove redundant prefixes (folder provides context).
4. **Shared files** — Files used by 2+ sub-features go in `shared/` at the same level.
5. **Update imports** — Use absolute imports (`@/features/...`).
6. **Verify** — `turbo check-types` to catch broken imports.

## Naming Conventions

| What | Convention | Example |
|------|-----------|---------|
| Feature folders | kebab-case, by domain | `booking/`, `analytics/` |
| Component files | kebab-case | `booking-form.tsx` |
| Hook files | `use-` prefix, kebab-case | `use-booking-state.ts` |
| Store files | `use-` prefix + `-store` | `use-calendar-store.ts` |
| Type files | kebab-case | `booking-types.ts` |
| Schema files | kebab-case | `booking-schema.ts` |
| Constant files | kebab-case | `booking-constants.ts` |
| Test files | mirror source + `.test` | `booking-form.test.tsx` |

**Inside a sub-feature folder**, drop the feature prefix — the folder already provides context:
- `booking/form.tsx` not `booking/booking-form.tsx`
- `links/constants.ts` not `links/links-block-constants.ts`

## Dependency Direction

```
apps/ → packages/ui/ → packages/config/
```

Within a feature:
```
components/ → hooks/ → stores/ → lib/ → types/ → constants/
```

- Sub-features may import from `shared/` at the same level
- Sub-features must NOT import from sibling sub-features — extract to `shared/`
- Never import upward in the tree
- No circular dependencies — if A imports B, B must never import A

## The Shared Promotion Rule

Code starts in the feature. When a second feature needs it:

1. Move the file/function to `shared/` at the appropriate level
2. If it's a pure UI component → promote to `packages/ui/`

**Never preemptively create shared code.** Wait until the second usage appears. Premature sharing creates coupling without benefit.

## Backend Organization (Convex)

`packages/backend/convex/` organizes by domain. Same 8-file rule applies. When a domain folder exceeds 8 files, split into sub-domains:

```
convex/pages/
├── pages/
│   ├── queries/
│   ├── mutations/
│   └── actions/
├── blocks/
└── templates/
```

Reserve `_` prefix only for Convex's own `_generated/` directory. Don't use `_queries/`, `_mutations/` — use `queries/`, `mutations/`, `validators/` without the underscore.

## Audit Checklist

When auditing existing structure:
- [ ] No directory has more than 8 source files
- [ ] Every folder is named by domain, not by type
- [ ] No `utils.ts` or `helpers.ts` junk drawers
- [ ] Shared code is only in `shared/` when used by 2+ features
- [ ] Deleting any feature folder only breaks intended consumers
- [ ] No redundant prefixes inside sub-feature folders
- [ ] No sibling sub-feature cross-imports (use `shared/`)
- [ ] No circular dependencies
