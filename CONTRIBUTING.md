# Contributing to Reflet

Thank you for your interest in contributing to Reflet! This document will help you get set up to contribute effectively.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Project Structure](#project-structure)
- [Architecture Overview](#architecture-overview)
- [Testing](#testing)
- [Code Style](#code-style)
- [Submitting Changes](#submitting-changes)

## Code of Conduct

Be respectful, inclusive, and collaborative. We welcome contributors from all backgrounds and experience levels.

## Getting Started

### Prerequisites

- **Bun** 1.3.5+ (package manager)
- **Node.js** 20+ (for compatibility)
- **Convex account** (free tier works)

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/damien-schneider/reflet.git
cd reflet

# Install dependencies
bun install

# Set up Convex backend
bun run dev:setup
```

The `dev:setup` script will:
1. Prompt you to create or link a Convex project
2. Set up your Convex environment variables
3. Generate the necessary type definitions

### Environment Setup

Copy environment variables from `packages/backend/.env.local` to `apps/web/.env`:

```bash
cp packages/backend/.env.local apps/web/.env
```

### Development Server

Start all applications:

```bash
bun run dev
```

This runs:
- Web app at http://localhost:3003
- Convex dev server

Run individual services:

```bash
bun run dev:web      # Web app only
bun run dev:server   # Convex backend only
```

---

## Development Workflow

### 1. Branching

Create a branch for your feature or fix:

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-fix-name
```

### 2. Making Changes

- Make your changes following the code style guidelines
- Test locally with `bun run dev`
- Run type checking: `bun run check-types`

### 3. Linting & Formatting

Reflet uses **Ultracite** (powered by Biome) for automatic formatting and linting:

```bash
# Auto-fix all issues
bun x ultracite fix

# Check for issues without fixing
bun x ultracite check
```

**Before committing**, always run `bun x ultracite fix` to ensure code compliance.

### 4. Committing

Write clear, descriptive commit messages:

```
feat(feedback): add bulk edit for feedback items
fix(auth): resolve session expiration on page refresh
docs(readme): update getting started instructions
```

Our pre-commit hook (Husky) will automatically run Ultracite on staged files.

---

## Project Structure

```
reflet-v2/
├── apps/
│   └── web/                      # Main web application
│       ├── src/
│       │   ├── components/       # React components
│       │   │   ├── ui/          # shadcn/ui components
│       │   │   ├── homepage/    # Landing page components
│       │   │   └── ...
│       │   ├── lib/             # Utilities and helpers
│       │   ├── routes/          # TanStack Router routes
│       │   │   ├── dashboard/   # Dashboard routes
│       │   │   ├── $orgSlug/    # Organization public pages
│       │   │   └── ...
│       │   ├── store/           # Jotai state management
│       │   ├── router.tsx       # Router configuration
│       │   └── __root.tsx       # Root layout
│       ├── public/              # Static assets
│       └── package.json
│
├── packages/
│   ├── backend/                 # Convex backend
│   │   └── convex/
│   │       ├── schema.ts        # Database schema
│   │       ├── auth.ts          # Auth functions
│   │       ├── feedback.ts      # Feedback queries/mutations
│   │       ├── organizations.ts # Organization functions
│   │       ├── boards.ts        # Board functions
│   │       ├── comments.ts      # Comment functions
│   │       ├── releases.ts      # Changelog/release functions
│   │       └── ...
│   │
│   ├── env/                     # Environment variable handling
│   └── config/                  # Shared configurations
│
├── AGENTS.md                    # AI assistant instructions
├── biome.jsonc                  # Biome config
├── turbo.json                   # Turborepo config
├── tsconfig.json                # TypeScript root config
└── package.json
```

---

## Architecture Overview

### Frontend (TanStack Start + React)

- **Routing**: TanStack Router with file-based routing
- **State Management**: Jotai (atomic state)
- **UI Components**: shadcn/ui (Radix UI + Tailwind)
- **Server Components**: TanStack Start SSR capabilities
- **Client-Server Sync**: Convex React hooks for real-time data

### Backend (Convex)

Convex is a reactive backend-as-a-service with:
- **Real-time subscriptions**: UI updates automatically when data changes
- **Type-safe API**: Generated TypeScript types from schema
- **Edge functions**: Serverless compute close to users
- **Database**: Built-in NoSQL with powerful indexing

#### Key Convex Files:

| File | Purpose |
|------|---------|
| `schema.ts` | Database schema, indexes, and relationships |
| `auth.ts` | Better-Auth integration and user sessions |
| `feedback.ts` | Feedback queries, mutations, and validators |
| `feedback_actions.ts` | Complex feedback operations (bulk actions, status changes) |
| `organizations.ts` | Organization queries and membership management |
| `boards.ts` | Board CRUD and permission checks |
| `comments.ts` | Comment system with threading |
| `releases.ts` | Changelog and release management |
| `votes.ts` | Vote tracking and limits |

### Authentication

Better-Auth provides:
- Email/password authentication
- OAuth providers (Google, GitHub, etc.)
- Session management
- Organization-based access control

#### Auth Flow:

1. User signs in via `lib/auth-client.ts` (client-side)
2. Better-Auth server routes handle credentials (`routes/api/auth/$.ts`)
3. Convex middleware validates sessions (`convex/auth.ts`)
4. Organization membership determines access to boards/features

### Database Schema

The schema is defined in `packages/backend/convex/schema.ts`:

- **Organizations**: Multi-tenant workspace
- **Members**: User roles in organizations (owner/admin/member)
- **Invitations**: Pending team invitations
- **Boards**: Feedback containers with public/private settings
- **Feedback**: Feature requests with status, votes, comments
- **Votes**: User upvotes on feedback
- **Tags**: Categorization labels (including roadmap lanes)
- **Comments**: Threaded discussions on feedback
- **Releases**: Changelog entries linked to completed feedback
- **Notifications**: User notifications for events

---

## Testing

### Running Tests

We use Playwright for end-to-end testing:

```bash
# Run all tests
bunx playwright test

# Run tests in headed mode
bunx playwright test --headed

# Run specific test file
bunx playwright test feedback.spec.ts
```

### Test Structure

```
apps/web/
└── e2e/              # Playwright tests
    ├── auth.spec.ts
    ├── feedback.spec.ts
    └── ...
```

### Writing Tests

```typescript
import { test, expect } from "@playwright/test";

test("user can submit feedback", async ({ page }) => {
  await page.goto("/dashboard/demo/boards/feedback");
  await page.click('button:has-text("New Feedback")');
  await page.fill('[placeholder="Title"]', "Dark mode");
  await page.click('button:has-text("Submit")');
  await expect(page.locator("text=Dark mode")).toBeVisible();
});
```

---

## Code Style

Reflet uses **Ultracite** for consistent code quality. Key principles:

### Type Safety

- Use explicit types for function parameters and return values
- Prefer `unknown` over `any`
- Leverage TypeScript type narrowing
- Avoid type assertions when possible

### React & JSX

- Use function components (no classes)
- Call hooks at top level only
- Include all dependencies in `useEffect`/`useMemo` arrays
- Use semantic HTML and ARIA attributes
- Provide meaningful alt text for images

### Async & Performance

- Always `await` promises in async functions
- Use `async/await` over promise chains
- Avoid spread syntax in accumulators
- Use `const` by default, `let` only when reassigning

### Best Practices

- Extract complex conditions into named variables
- Use early returns to reduce nesting
- Keep functions focused and modular
- Add comments for non-obvious logic

For complete style guidelines, see [AGENTS.md](AGENTS.md).

---

## Submitting Changes

### Pull Request Process

1. **Fork** the repository
2. **Branch** off main: `git checkout -b feature/my-feature`
3. **Commit** your changes with clear messages
4. **Push** to your fork: `git push origin feature/my-feature`
5. **Create PR** on GitHub

### PR Guidelines

- Title should be descriptive: `feat: add bulk edit for feedback items`
- Link related issues in the description
- Add screenshots for UI changes
- Ensure all tests pass
- Run `bun x ultracite fix` before submitting

### Review Process

- Automated checks will run (lint, typecheck, tests)
- Maintainers will review your code
- Address feedback and update your PR
- Once approved, your PR will be merged

---

## Getting Help

- **Discussions**: [GitHub Discussions](https://github.com/damien-schneider/reflet/discussions)
- **Issues**: [GitHub Issues](https://github.com/damien-schneider/reflet/issues)
- **Discord**: Join our community (link coming soon)

---

## Resources

- [TanStack Start Docs](https://tanstack.com/start/latest)
- [Convex Docs](https://docs.convex.dev)
- [shadcn/ui](https://ui.shadcn.com)
- [Biome Docs](https://biomejs.dev)
- [Ultracite Docs](https://ultracite.dev)

---

Happy contributing! 🚀
