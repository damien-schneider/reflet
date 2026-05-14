# Coding Harness — Build Doc

> Concrete implementation guide. Référence: [`CODING_HARNESS_RESEARCH.md`](./CODING_HARNESS_RESEARCH.md) pour le pourquoi.

**Date:** 2026-05-10
**Phase ciblée:** 1.0 — **deep codebase analysis (read-only)** pour produire un brief produit marketing-ready + Knowledge docs autopilot. Pas de modify code (Phase 2). Pas de sandbox.
**Stack:** Mastra (agent + tools) + OpenRouter (multi-model) + Convex (storage + streaming) + Octokit (GitHub).
**État infra:** GitHub App **déjà existante** dans Reflet (`GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, JWT custom dans `node_actions.ts:75-141`). Pas besoin de créer une nouvelle App.

## Pourquoi cette phase

Le pipeline legacy (`exploration_tools.ts` + `repoAnalysisAgent`) a 3 limitations:
- Lecture fichier capée à **4 000 chars** → manque la moitié des features dans des fichiers longs.
- Code search capé à **10 résultats** sans dédup multi-query.
- Pas de cache, pas de prompt-cache → coût et latence inutiles.

Phase 1 = **remplacer ce pipeline** par un agent Mastra plus profond, multi-model swap-friendly, avec cache, qui produit un product brief si détaillé que **marketing/Growth peut s'en servir directement** (feature catalog complet, brand voice quoté, personas dérivées, value props).

Phase 2 (plus tard) ajoute des tools `applyPatch` + sandbox sans toucher à l'architecture: les tools read-only restent.

---

## 1. Décisions tranchées

| Question | Décision | Pourquoi |
|---|---|---|
| Agent framework | **Mastra** (`@mastra/core`) | Multi-model trivial via providers, primitives tools/agents/workflows propres, équipe Mastra friendly. |
| Model provider | **OpenRouter** (`@openrouter/ai-sdk-provider`) | Déjà installé. Switch model = changer 1 string. Claude / GPT / Gemini interchangeables. |
| Default model | `anthropic/claude-sonnet-4-6` via OpenRouter | 1M context flat-rate, $3/$15, prompt cache supporté. |
| Escalation model | `anthropic/claude-opus-4-7` | Reasoning complexe uniquement. |
| GitHub auth | **GitHub App existante** (custom JWT in `node_actions.ts`) | Déjà en prod, pas de migration. Phase 1 réutilise. |
| GitHub client | **Octokit** (`octokit`) wrappe le token existant | Standard, full REST + GraphQL. Plus propre que `fetch` direct. |
| Default model | `openai/gpt-5.1-mini` via OpenRouter | Choix utilisateur. Cheap + bon multi-step. |
| Fallback model | `anthropic/claude-sonnet-4-6` | Escalade si gpt-5.1-mini cale (rate limit/qualité). |
| MCP server | **Pas de MCP server externe.** Tools custom Mastra qui wrappent Octokit. | Plus de contrôle, moins de couches, ~50 lignes. |
| Thread/message persistence | Garder `@convex-dev/agent` existant | Déjà wired, fonctionne. |
| Storage cache | **Convex tables** + Convex storage (Phase 1.5) | Reactive, transactional, déjà payé. |
| Streaming UI | Convex subscriptions sur `agentRuns` table | Pattern Reflet existant. |
| MCP exposition externe | **Skip Phase 1.** Reflet n'expose pas son agent en MCP pour le moment. | Plus tard si IDE integration demandée. |

### Non-décisions volontaires

- **Pas de sandbox v1.** Justifié par cas d'usage read-only. Phase 2 = ajout, pas refactor.
- **Pas de RAG / embeddings.** Agentic grep + repo metadata cached suffisent.
- **Pas de tarball download Phase 1.0.** Ajouté en 1.5 si benchmark révèle besoin.
- **Pas de `github/github-mcp-server` officiel.** Trop de surface (issues, repo creation, etc.) qu'on n'utilise pas.

---

## 2. Dépendances à installer

```jsonc
// packages/backend/package.json (ajouts)
{
  "dependencies": {
    "@mastra/core": "^1.31.0",
    "octokit": "^4.0.2",
    "@octokit/auth-app": "^7.1.3",
    "zod": "^3.23.8" // probablement déjà
  }
}
```

```bash
cd packages/backend && bun add @mastra/core octokit @octokit/auth-app zod
```

**Déjà présents (à réutiliser):**
- `@convex-dev/agent` — thread/message persistence
- `@openrouter/ai-sdk-provider` — model provider
- Convex SDK

---

## 3. Variables d'environnement

**Toutes déjà setées en prod** (cf `packages/env/src/server.ts`):
```bash
GITHUB_APP_ID
GITHUB_APP_SLUG
GITHUB_APP_PRIVATE_KEY
GITHUB_WEBHOOK_SECRET    # per-connection storé en DB, pas global
OPENROUTER_API_KEY
```

Aucune nouvelle variable Phase 1.

---

## 4. Schéma Convex

`githubConnections` existe déjà avec `installationId` — pas de table `githubInstallations` à créer. On ajoute 3 tables sous `autopilot/schema/codebase.tables.ts`:

```ts
// packages/backend/convex/autopilot/schema/codebase.tables.ts
import { defineTable } from "convex/server";
import { v } from "convex/values";

export const codebaseTables = {
  codebaseFileCache: defineTable({
    installationId: v.string(),
    repoFullName: v.string(),
    sha: v.string(),
    path: v.string(),
    content: v.string(),
    fetchedAt: v.number(),
  }).index("by_key", ["installationId", "repoFullName", "sha", "path"]),

  codebaseRepoMetadata: defineTable({
    installationId: v.string(),
    repoFullName: v.string(),
    languages: v.array(v.object({ name: v.string(), bytes: v.number() })),
    topics: v.array(v.string()),
    description: v.optional(v.string()),
    defaultBranch: v.string(),
    latestSha: v.optional(v.string()),
    refreshedAt: v.number(),
  }).index("by_repo", ["installationId", "repoFullName"]),

  codebaseAgentRuns: defineTable({
    organizationId: v.id("organizations"),
    repoFullName: v.string(),
    status: v.union(
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    purpose: v.union(v.literal("deep_analysis"), v.literal("ask")),
    userQuestion: v.optional(v.string()),
    assistantText: v.optional(v.string()),
    toolCallCount: v.number(),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    costUsd: v.optional(v.number()),
    error: v.optional(v.string()),
    startedAt: v.number(),
    finishedAt: v.optional(v.number()),
  }).index("by_org", ["organizationId"]),
};
```

Register dans `autopilot/schema/index.ts`.

`installationId` reste en `string` partout (le schéma existant l'utilise déjà ainsi pour rester homogène avec `githubConnections.installationId`).

---

## 5. Layout des fichiers

```
packages/backend/convex/
├── autopilot/
│   ├── codebase/                  # NEW
│   │   ├── agent.ts               # Mastra agent (multi-model via OpenRouter)
│   │   ├── tools.ts               # Mastra tools (Octokit-wrapped, read-only)
│   │   ├── prompts.ts             # Exploration + synthesis prompts (marketing-ready)
│   │   ├── octokit_helpers.ts     # Octokit factory réutilise getInstallationTokenInternal
│   │   ├── queries.ts             # cache lookup, repo metadata
│   │   ├── mutations.ts           # cache write, agent run lifecycle
│   │   └── actions.ts             # runDeepAnalysis (replaces runProductExploration)
│   └── schema/
│       ├── codebase.tables.ts     # NEW — codebaseFileCache + codebaseRepoMetadata + codebaseAgentRuns
│       └── index.ts               # MODIFIÉ — register codebaseTables
└── integrations/github/
    ├── repo_analysis.ts           # MODIFIÉ — runAnalysis schedules new action
    ├── exploration_tools.ts       # CONSERVÉ Phase 1 (legacy, à supprimer Phase 1.b)
    ├── product_exploration.ts     # CONSERVÉ Phase 1
    ├── product_exploration_helpers.ts # CONSERVÉ Phase 1
    └── code_search.ts             # CONSERVÉ Phase 1
```

**Stratégie sans big-bang:** la nouvelle pipeline coexiste avec l'ancienne. `runAnalysis` route vers la nouvelle. L'ancienne reste compilable. Cleanup post-validation benchmark.

---

## 6. Implémentation jour-par-jour

### Jour 1 — GitHub App + Octokit factory

**`convex/integrations/github/app_auth.ts`**

```ts
import { App } from "@octokit/auth-app";
import { Octokit } from "octokit";

let cachedApp: ReturnType<typeof App> | null = null;

function getAppAuth() {
  if (cachedApp) return cachedApp;
  const appId = process.env.GITHUB_APP_ID;
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;
  if (!appId || !privateKey) {
    throw new Error("GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY must be set");
  }
  cachedApp = App({ appId, privateKey });
  return cachedApp;
}

const tokenCache = new Map<number, { token: string; expiresAt: number }>();

export async function getInstallationToken(installationId: number): Promise<string> {
  const cached = tokenCache.get(installationId);
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

  const auth = getAppAuth();
  const { token, expiresAt } = await auth({
    type: "installation",
    installationId,
  });

  tokenCache.set(installationId, {
    token,
    expiresAt: new Date(expiresAt).getTime(),
  });
  return token;
}

export async function getInstallationOctokit(installationId: number): Promise<Octokit> {
  const token = await getInstallationToken(installationId);
  return new Octokit({ auth: token });
}
```

**`convex/integrations/github/webhooks.ts`** (HTTP handler pour push events)

```ts
import { httpAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { createHmac, timingSafeEqual } from "node:crypto";

export const handleWebhook = httpAction(async (ctx, request) => {
  const signature = request.headers.get("x-hub-signature-256");
  const event = request.headers.get("x-github-event");
  const body = await request.text();

  if (!verifySignature(body, signature)) {
    return new Response("Invalid signature", { status: 401 });
  }

  const payload = JSON.parse(body);

  if (event === "push") {
    await ctx.runMutation(internal.integrations.github.cache_invalidation.invalidateRepo, {
      installationId: payload.installation.id,
      repoFullName: payload.repository.full_name,
      newSha: payload.after,
    });
  }

  return new Response("ok", { status: 200 });
});

function verifySignature(body: string, signature: string | null): boolean {
  if (!signature) return false;
  const secret = process.env.GITHUB_APP_WEBHOOK_SECRET;
  if (!secret) return false;
  const computed =
    "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
  return timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
}
```

Register dans `convex/http.ts`:
```ts
http.route({
  path: "/webhooks/github",
  method: "POST",
  handler: handleWebhook,
});
```

### Jour 2 — Mastra tools (Octokit-wrapped)

**`convex/autopilot/codebase/tools.ts`**

```ts
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import type { Octokit } from "octokit";
import type { ActionCtx } from "../../_generated/server";

// RuntimeContext shape — passed by Convex action when invoking agent
export type CodebaseRuntimeContext = {
  ctx: ActionCtx;
  octokit: Octokit;
  installationId: number;
  repoFullName: string; // "owner/repo"
};

export const getFileContents = createTool({
  id: "get_file_contents",
  description:
    "Read full content of a file from the connected repository. Returns the raw text content.",
  inputSchema: z.object({
    path: z.string().describe("File path from repo root, e.g. 'src/index.ts'"),
    ref: z
      .string()
      .optional()
      .describe("Optional branch/sha. Defaults to main branch."),
  }),
  outputSchema: z.object({
    path: z.string(),
    content: z.string(),
    sha: z.string(),
  }),
  execute: async ({ context, runtimeContext }) => {
    const rt = runtimeContext as CodebaseRuntimeContext;
    const [owner, repo] = rt.repoFullName.split("/");

    // Cache lookup
    if (context.ref) {
      const cached = await rt.ctx.runQuery(
        internal.autopilot.codebase.queries.getCachedFile,
        {
          installationId: rt.installationId,
          repoFullName: rt.repoFullName,
          sha: context.ref,
          path: context.path,
        },
      );
      if (cached) {
        return { path: context.path, content: cached.content, sha: context.ref };
      }
    }

    const { data } = await rt.octokit.rest.repos.getContent({
      owner,
      repo,
      path: context.path,
      ref: context.ref,
    });

    if (Array.isArray(data) || data.type !== "file") {
      throw new Error(`Path ${context.path} is not a file`);
    }

    const content = Buffer.from(data.content, data.encoding as BufferEncoding).toString(
      "utf-8",
    );

    await rt.ctx.runMutation(internal.autopilot.codebase.mutations.cacheFile, {
      installationId: rt.installationId,
      repoFullName: rt.repoFullName,
      sha: data.sha,
      path: context.path,
      content,
    });

    return { path: context.path, content, sha: data.sha };
  },
});

export const listDirectory = createTool({
  id: "list_directory",
  description: "List files and folders at a given path in the repo.",
  inputSchema: z.object({
    path: z.string().default("").describe("Directory path. Empty = repo root."),
    ref: z.string().optional(),
  }),
  outputSchema: z.array(
    z.object({
      name: z.string(),
      type: z.enum(["file", "dir", "submodule", "symlink"]),
      path: z.string(),
      size: z.number().optional(),
    }),
  ),
  execute: async ({ context, runtimeContext }) => {
    const rt = runtimeContext as CodebaseRuntimeContext;
    const [owner, repo] = rt.repoFullName.split("/");

    const { data } = await rt.octokit.rest.repos.getContent({
      owner,
      repo,
      path: context.path,
      ref: context.ref,
    });

    if (!Array.isArray(data)) {
      throw new Error(`Path ${context.path} is not a directory`);
    }

    return data.map((item) => ({
      name: item.name,
      type: item.type as any,
      path: item.path,
      size: item.size,
    }));
  },
});

export const searchCode = createTool({
  id: "search_code",
  description:
    "Search code across the repo using GitHub Code Search. Returns up to 10 best matches. Use this to find where a symbol/string is used. For deep grep-style search across all files, request grep_repo.",
  inputSchema: z.object({
    query: z.string().describe("Search query, e.g. 'function authenticateUser'"),
  }),
  outputSchema: z.array(
    z.object({
      path: z.string(),
      score: z.number(),
      textMatches: z.array(z.string()).optional(),
    }),
  ),
  execute: async ({ context, runtimeContext }) => {
    const rt = runtimeContext as CodebaseRuntimeContext;
    const { data } = await rt.octokit.rest.search.code({
      q: `${context.query} repo:${rt.repoFullName}`,
      per_page: 10,
    });
    return data.items.map((i) => ({
      path: i.path,
      score: i.score,
      textMatches: i.text_matches?.map((m) => m.fragment ?? "") ?? [],
    }));
  },
});

export const getRepoInfo = createTool({
  id: "get_repo_info",
  description:
    "Get repo metadata: description, languages, topics, default branch, latest commit.",
  inputSchema: z.object({}),
  outputSchema: z.object({
    fullName: z.string(),
    description: z.string().nullable(),
    languages: z.record(z.string(), z.number()),
    topics: z.array(z.string()),
    defaultBranch: z.string(),
    latestSha: z.string(),
  }),
  execute: async ({ runtimeContext }) => {
    const rt = runtimeContext as CodebaseRuntimeContext;
    const [owner, repo] = rt.repoFullName.split("/");

    const [{ data: info }, { data: langs }, { data: branch }] = await Promise.all([
      rt.octokit.rest.repos.get({ owner, repo }),
      rt.octokit.rest.repos.listLanguages({ owner, repo }),
      rt.octokit.rest.repos.getBranch({
        owner,
        repo,
        branch: "main", // overridden below if different
      }).catch(async () => {
        const { data: r } = await rt.octokit.rest.repos.get({ owner, repo });
        return await rt.octokit.rest.repos.getBranch({
          owner,
          repo,
          branch: r.default_branch,
        });
      }),
    ]);

    return {
      fullName: info.full_name,
      description: info.description,
      languages: langs,
      topics: info.topics ?? [],
      defaultBranch: info.default_branch,
      latestSha: branch.commit.sha,
    };
  },
});

export const listRecentPullRequests = createTool({
  id: "list_recent_pull_requests",
  description: "List recent pull requests (open + closed). Useful for context on active work.",
  inputSchema: z.object({
    state: z.enum(["open", "closed", "all"]).default("open"),
    limit: z.number().min(1).max(30).default(10),
  }),
  outputSchema: z.array(
    z.object({
      number: z.number(),
      title: z.string(),
      state: z.string(),
      author: z.string().nullable(),
      createdAt: z.string(),
      mergedAt: z.string().nullable(),
    }),
  ),
  execute: async ({ context, runtimeContext }) => {
    const rt = runtimeContext as CodebaseRuntimeContext;
    const [owner, repo] = rt.repoFullName.split("/");
    const { data } = await rt.octokit.rest.pulls.list({
      owner,
      repo,
      state: context.state,
      per_page: context.limit,
      sort: "updated",
      direction: "desc",
    });
    return data.map((pr) => ({
      number: pr.number,
      title: pr.title,
      state: pr.state,
      author: pr.user?.login ?? null,
      createdAt: pr.created_at,
      mergedAt: pr.merged_at,
    }));
  },
});

export const codebaseTools = {
  get_file_contents: getFileContents,
  list_directory: listDirectory,
  search_code: searchCode,
  get_repo_info: getRepoInfo,
  list_recent_pull_requests: listRecentPullRequests,
};
```

**`convex/autopilot/codebase/queries.ts` + `mutations.ts`** (cache layer)

```ts
// queries.ts
import { internalQuery } from "../../_generated/server";
import { v } from "convex/values";

export const getCachedFile = internalQuery({
  args: {
    installationId: v.number(),
    repoFullName: v.string(),
    sha: v.string(),
    path: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("fileCache")
      .withIndex("by_key", (q) =>
        q
          .eq("installationId", args.installationId)
          .eq("repoFullName", args.repoFullName)
          .eq("sha", args.sha)
          .eq("path", args.path),
      )
      .first();
  },
});

// mutations.ts
import { internalMutation } from "../../_generated/server";

export const cacheFile = internalMutation({
  args: {
    installationId: v.number(),
    repoFullName: v.string(),
    sha: v.string(),
    path: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("fileCache", { ...args, fetchedAt: Date.now() });
  },
});
```

### Jour 3 — Mastra agent + system prompt

**`convex/autopilot/codebase/prompts.ts`**

```ts
export const CODEBASE_AGENT_INSTRUCTIONS = `You are Reflet's codebase reading assistant.

Your job: help the user understand a GitHub repository by reading and searching code.

Output goal: at the end of your investigation, generate a precise, actionable PROMPT that the user can paste into Claude Code, Codex, or Cursor to make the requested change. You do NOT modify code yourself in this phase.

Tools available:
- get_file_contents: read a specific file
- list_directory: list contents of a folder
- search_code: GitHub Code Search (10 results max, use targeted queries)
- get_repo_info: metadata, languages, topics, latest sha
- list_recent_pull_requests: recent PRs for context on active work

Strategy:
1. Always start with get_repo_info to understand the project.
2. Read AGENTS.md or CLAUDE.md if present (root) for project conventions.
3. Use list_directory + get_file_contents to navigate. Don't try to read every file — be strategic.
4. Use search_code only for targeted symbol lookups, not exploratory browsing.
5. When you have enough context, synthesize:
   - A concise explanation of what's going on
   - A copy-paste-ready prompt for Claude Code / Codex with file paths and specific instructions

Output format:
\`\`\`markdown
## What I found
<2-4 paragraphs explaining what you discovered>

## Files relevant to your task
- path/to/file.ts:42 — <reason>
- ...

## Prompt for Claude Code / Codex
<a single, well-formed prompt the user can paste verbatim>
\`\`\`

Constraints:
- Never invent file paths or code that you didn't read.
- If a file is too large to read fully, read in chunks via get_file_contents and summarize.
- If GitHub Code Search hits the 10-result cap, ask for more specific queries.
- Cite file paths and line numbers when referencing code.
- Output the final prompt in a fenced code block so the user can copy it cleanly.`;

export function buildSystemPrompt(repoMetadata: {
  fullName: string;
  description: string | null;
  languages: Record<string, number>;
  topics: string[];
  agentsMd?: string;
}): string {
  const langsList = Object.keys(repoMetadata.languages).join(", ");
  return `${CODEBASE_AGENT_INSTRUCTIONS}

---
Connected repository: ${repoMetadata.fullName}
Description: ${repoMetadata.description ?? "(none)"}
Languages: ${langsList}
Topics: ${repoMetadata.topics.join(", ") || "(none)"}

${repoMetadata.agentsMd ? `Project conventions (AGENTS.md):\n${repoMetadata.agentsMd}` : ""}`;
}
```

**`convex/autopilot/codebase/agent.ts`**

```ts
import { Agent } from "@mastra/core/agent";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { codebaseTools } from "./tools";
import { CODEBASE_AGENT_INSTRUCTIONS } from "./prompts";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export const codebaseAgent = new Agent({
  name: "Codebase Reader",
  instructions: CODEBASE_AGENT_INSTRUCTIONS,
  model: openrouter("anthropic/claude-sonnet-4-6"),
  tools: codebaseTools,
});

// Escalation agent for harder reasoning (use sparingly — Opus is 5x cost)
export const codebaseAgentOpus = new Agent({
  name: "Codebase Reader (Opus)",
  instructions: CODEBASE_AGENT_INSTRUCTIONS,
  model: openrouter("anthropic/claude-opus-4-7"),
  tools: codebaseTools,
});
```

### Jour 4 — Convex action + streaming UI

**`convex/autopilot/codebase/actions.ts`**

```ts
import { action } from "../../_generated/server";
import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { codebaseAgent, codebaseAgentOpus } from "./agent";
import { getInstallationOctokit } from "../../integrations/github/app_auth";
import { buildSystemPrompt } from "./prompts";

export const askCodebase = action({
  args: {
    installationId: v.number(),
    repoFullName: v.string(),
    question: v.string(),
    threadId: v.string(),
    useOpus: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const startedAt = Date.now();
    const runId = await ctx.runMutation(
      internal.autopilot.codebase.mutations.startAgentRun,
      {
        threadId: args.threadId,
        repoFullName: args.repoFullName,
        userQuestion: args.question,
        startedAt,
      },
    );

    try {
      const octokit = await getInstallationOctokit(args.installationId);

      const metadata = await ctx.runQuery(
        internal.autopilot.codebase.queries.getRepoMetadata,
        { installationId: args.installationId, repoFullName: args.repoFullName },
      );

      const agent = args.useOpus ? codebaseAgentOpus : codebaseAgent;

      const result = await agent.generate(args.question, {
        runtimeContext: {
          ctx,
          octokit,
          installationId: args.installationId,
          repoFullName: args.repoFullName,
        },
        instructions: buildSystemPrompt(metadata),
        maxSteps: 20,
        // Capture tool calls for observability
        onStepFinish: async (step) => {
          await ctx.runMutation(
            internal.autopilot.codebase.mutations.appendToolCalls,
            {
              runId,
              toolCalls: step.toolCalls?.map((tc) => ({
                name: tc.toolName,
                input: tc.args,
                result: tc.result,
                durationMs: 0, // Mastra doesn't expose per-call duration yet
              })) ?? [],
            },
          );
        },
      });

      const finishedAt = Date.now();
      const cost = estimateCost(result.usage, args.useOpus);

      await ctx.runMutation(
        internal.autopilot.codebase.mutations.completeAgentRun,
        {
          runId,
          assistantText: result.text,
          tokensUsed: {
            input: result.usage?.promptTokens ?? 0,
            output: result.usage?.completionTokens ?? 0,
            cacheRead: 0, // OpenRouter passthrough — populate from response headers if exposed
            cacheWrite: 0,
          },
          costUsd: cost,
          finishedAt,
        },
      );

      return { runId, text: result.text };
    } catch (error) {
      await ctx.runMutation(
        internal.autopilot.codebase.mutations.failAgentRun,
        {
          runId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  },
});

function estimateCost(
  usage: { promptTokens?: number; completionTokens?: number } | undefined,
  useOpus: boolean,
): number {
  if (!usage) return 0;
  const inputRate = useOpus ? 5 : 3; // $/MTok
  const outputRate = useOpus ? 25 : 15;
  return (
    ((usage.promptTokens ?? 0) * inputRate +
      (usage.completionTokens ?? 0) * outputRate) /
    1_000_000
  );
}
```

**Frontend: streaming via Convex subscriptions**

```tsx
// apps/web/app/(app)/dashboard/[orgSlug]/codebase/page-client.tsx
"use client";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";

export function CodebaseChat({ installationId, repoFullName }: Props) {
  const [question, setQuestion] = useState("");
  const [threadId] = useState(() => crypto.randomUUID());

  const run = useQuery(api.autopilot.codebase.queries.getLatestRun, { threadId });
  const askCodebase = useAction(api.autopilot.codebase.actions.askCodebase);

  const onSubmit = async () => {
    await askCodebase({ installationId, repoFullName, question, threadId });
  };

  return (
    <div>
      <textarea value={question} onChange={(e) => setQuestion(e.target.value)} />
      <button onClick={onSubmit}>Ask</button>
      {run && (
        <div>
          <ToolCallList calls={run.toolCalls} />
          <Markdown>{run.assistantText ?? "Thinking..."}</Markdown>
        </div>
      )}
    </div>
  );
}
```

### Jour 5 — Migration + benchmark + cleanup

**Migration des callers existants:**

```ts
// AVANT (convex/ai/agent.ts)
export const repoAnalysisAgent = new Agent(components.agent, {
  name: "Repository Analysis Agent",
  languageModel: openrouter("anthropic/claude-sonnet-4"),
  instructions: `You are an expert software architect ...`,
});

// APRÈS — supprimer repoAnalysisAgent, callers utilisent codebaseAgent + askCodebase action
```

**Fichiers à supprimer:**
- `convex/integrations/github/exploration_tools.ts`
- `convex/integrations/github/code_search.ts`

**Fichiers à simplifier:**
- `convex/integrations/github/github_helpers.ts` → garder seulement metadata helpers, supprimer fetchRepoData

**Benchmark à exécuter (5-10 repos test):**

| Métrique | Cible Phase 1.0 |
|---|---|
| Latence moyenne réponse | < 30s |
| Coût moyen par tâche | < $0.20 |
| Tool calls moyens par tâche | 5-15 |
| Taux d'échec rate limit | < 5% |
| Qualité réponse (eval manuelle) | "useful for prompt generation" sur 8/10 |

Si rate limit > 5% → déclencher Phase 1.5.

---

## 7. Phase 1.5 — Tarball cache + grep JS (escape valve)

**Quand activer:** benchmark Jour 5 montre rate limit GitHub Code Search ou latence > 30s.

**Ajouts (~150 lignes, +2 jours):**

### 7.1 Schéma

```ts
// schema.ts ajout
repoTarballs: defineTable({
  installationId: v.number(),
  repoFullName: v.string(),
  sha: v.string(),
  storageId: v.id("_storage"),
  fileCount: v.number(),
  fetchedAt: v.number(),
}).index("by_repo", ["installationId", "repoFullName"]),
```

### 7.2 Fetch + cache action

```ts
// convex/autopilot/codebase/tarball.ts
import { action } from "../../_generated/server";
import { v } from "convex/values";

export const fetchRepoTarball = action({
  args: { installationId: v.number(), repoFullName: v.string(), sha: v.string() },
  handler: async (ctx, args) => {
    const octokit = await getInstallationOctokit(args.installationId);
    const [owner, repo] = args.repoFullName.split("/");

    const { url } = await octokit.rest.repos.downloadTarballArchive({
      owner, repo, ref: args.sha,
    });
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();

    const storageId = await ctx.storage.store(new Blob([buffer]));

    await ctx.runMutation(internal.autopilot.codebase.mutations.cacheTarball, {
      installationId: args.installationId,
      repoFullName: args.repoFullName,
      sha: args.sha,
      storageId,
      fileCount: 0, // populated after first grep
    });

    return storageId;
  },
});
```

### 7.3 Grep tool

```ts
// convex/autopilot/codebase/tools.ts — addition
import * as tar from "tar-stream";
import { gunzipSync } from "node:zlib";

export const grepRepo = createTool({
  id: "grep_repo",
  description:
    "Run a regex pattern across all files in the repo. Returns matches with file path and line numbers. Use this when search_code's 10-result cap is too restrictive.",
  inputSchema: z.object({
    pattern: z.string().describe("JavaScript regex pattern"),
    glob: z.string().optional().describe("File path glob, e.g. '**/*.ts'"),
    maxResults: z.number().default(50),
  }),
  outputSchema: z.array(
    z.object({
      path: z.string(),
      line: z.number(),
      match: z.string(),
    }),
  ),
  execute: async ({ context, runtimeContext }) => {
    const rt = runtimeContext as CodebaseRuntimeContext;

    // Get latest sha
    const meta = await rt.ctx.runQuery(
      internal.autopilot.codebase.queries.getRepoMetadata,
      { installationId: rt.installationId, repoFullName: rt.repoFullName },
    );

    // Fetch tarball if not cached
    let storageId = await rt.ctx.runQuery(
      internal.autopilot.codebase.queries.getCachedTarball,
      { installationId: rt.installationId, repoFullName: rt.repoFullName, sha: meta.latestSha },
    );
    if (!storageId) {
      storageId = await rt.ctx.runAction(
        internal.autopilot.codebase.tarball.fetchRepoTarball,
        { installationId: rt.installationId, repoFullName: rt.repoFullName, sha: meta.latestSha },
      );
    }

    const blob = await rt.ctx.storage.get(storageId);
    if (!blob) throw new Error("Tarball not found in storage");
    const tarballBuffer = await blob.arrayBuffer();
    const tarBuffer = gunzipSync(Buffer.from(tarballBuffer));

    const regex = new RegExp(context.pattern, "gm");
    const results: Array<{ path: string; line: number; match: string }> = [];
    const globRegex = context.glob ? globToRegex(context.glob) : null;

    await new Promise<void>((resolve, reject) => {
      const extract = tar.extract();
      extract.on("entry", (header, stream, next) => {
        if (header.type !== "file" || results.length >= context.maxResults) {
          stream.resume();
          return next();
        }
        const cleanPath = header.name.split("/").slice(1).join("/");
        if (globRegex && !globRegex.test(cleanPath)) {
          stream.resume();
          return next();
        }
        const chunks: Buffer[] = [];
        stream.on("data", (c) => chunks.push(c));
        stream.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf-8");
          const lines = text.split("\n");
          for (let i = 0; i < lines.length && results.length < context.maxResults; i++) {
            if (regex.test(lines[i])) {
              results.push({ path: cleanPath, line: i + 1, match: lines[i] });
            }
            regex.lastIndex = 0;
          }
          next();
        });
      });
      extract.on("finish", resolve);
      extract.on("error", reject);
      extract.end(Buffer.from(tarBuffer));
    });

    return results;
  },
});

function globToRegex(glob: string): RegExp {
  const escaped = glob
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, ".+")
    .replace(/\*/g, "[^/]+")
    .replace(/\?/g, ".");
  return new RegExp(`^${escaped}$`);
}
```

Add to `codebaseTools` map. Update system prompt to mention `grep_repo` as fallback.

**Limites Convex action:** 256 MB RAM, 10s timeout. Si tarball > 50 MB ou repo > 200K LOC → chunked grep ou trigger Phase 2.

---

## 8. Phase 2 — Sandbox add (skeleton, plus tard)

Quand le user demande "applique cette modif et ouvre une PR":

### 8.1 Choix sandbox

Top 1: **Anthropic Managed Agents** — minimum effort, harness inclus.
Top 2: **Cloudflare Sandbox + Claude Agent SDK** — data sovereignty, multi-model.

### 8.2 Tools additionnels

```ts
export const applyPatch = createTool({...});      // structured diff
export const runShell = createTool({...});         // bash dans sandbox
export const gitCommit = createTool({...});
export const gitPush = createTool({...});
export const createPullRequest = createTool({...});
```

### 8.3 Architecture

L'agent Mastra reste le même. Les tools delegates au sandbox via SDK. Tools Phase 1 + Phase 2 coexistent — l'agent décide selon la tâche.

---

## 9. Tests

### 9.1 Unit tests tools

```ts
// packages/backend/convex/autopilot/codebase/tools.test.ts
import { describe, it, expect, vi } from "vitest";
import { getFileContents } from "./tools";

describe("get_file_contents", () => {
  it("returns content from cache when available", async () => {
    const mockCtx = {
      runQuery: vi.fn().mockResolvedValue({ content: "cached!" }),
      runMutation: vi.fn(),
    };
    const result = await getFileContents.execute({
      context: { path: "src/x.ts", ref: "abc" },
      runtimeContext: { ctx: mockCtx, installationId: 1, repoFullName: "a/b", octokit: {} },
    });
    expect(result.content).toBe("cached!");
  });
});
```

### 9.2 Integration tests

5-10 repos publics réels (Reflet test org), 10 questions par repo, eval manuelle de la qualité.

### 9.3 Smoke tests CI

GitHub Action qui run `askCodebase` sur 1 repo public + assert output non-vide + tool count < 20.

---

## 10. Observabilité

### 10.1 Logs Convex
Tous les tool calls + tokens + cost sont stockés dans `agentRuns` table. Dashboard query simple:

```ts
// Cost per day per org
ctx.db.query("agentRuns")
  .filter(q => q.gte(q.field("startedAt"), startOfDay))
  .collect()
  .then(runs => sumBy(runs, r => r.costUsd ?? 0));
```

### 10.2 Mastra traces
Mastra émet des traces OpenTelemetry. Configurer export vers ton backend OTel (déjà en place ou non — à check).

### 10.3 Alerting
- Cost > $X par tâche → alerte Slack.
- Rate limit GitHub > 5% → trigger upgrade Phase 1.5.
- Latence p95 > 60s → investigate.

---

## 11. Coût estimé

100 tâches/jour × 30 jours, modèle = Sonnet 4.6:

- Compute Convex: ~$0 (déjà inclus).
- GitHub API: gratuit (limit 12.5K/h, jamais atteint avec cache).
- LLM tokens (sans cache): ~$600/mo.
- LLM tokens (avec prompt cache 90% off sur system+AGENTS.md): **~$300/mo**.
- Opus escalation 10%: +$80/mo.
- **Total Phase 1.0: ~$380/mo.**

Phase 1.5 ajoute Convex storage (50 MB tarball × 100 repos = 5 GB) ≈ $0.50/mo négligeable.

---

## 12. Checklist Go-Live

- [ ] GitHub App créée + privacy policy + branding Reflet
- [ ] Webhook URL configurée + secret en env Convex
- [ ] Onboarding UI: bouton "Connect GitHub" → install flow
- [ ] Schema deployed (4 nouvelles tables)
- [ ] Tools + agent + actions deployed
- [ ] Frontend codebase chat UI
- [ ] AGENTS.md template editor
- [ ] Cost dashboard
- [ ] Rate limit alerting
- [ ] Doc utilisateur "Comment connecter ton repo" + "Comment utiliser les prompts générés"
- [ ] Migration users existants OAuth → GitHub App (si applicable)
- [ ] Cleanup `exploration_tools.ts`, `code_search.ts`
- [ ] Benchmark passé sur 5+ repos test

---

## 13. Décisions à valider avant Jour 1

1. **GitHub App naming** — "Reflet" simple ? "Reflet Autopilot" ? (UI users verront ça).
2. **Permissions GitHub App requises** Phase 1: `contents: read`, `metadata: read`, `pull_requests: read`, `issues: read`. Pas plus.
3. **Migration OAuth users existants** — combien sont concernés ? Plan progressif ou cutover ?
4. **Modèle default OpenRouter** — `anthropic/claude-sonnet-4-6` confirmé ? Ou test `anthropic/claude-sonnet-4-5` pour économie ?
5. **Quota par user** — limit en $/mois ou en tâches/jour pour MVP ?

---

## 14. Sources

- [Mastra Agents docs](https://mastra.ai/docs/agents/overview)
- [Mastra Tools docs](https://mastra.ai/docs/tools/overview)
- [Mastra + AI SDK integration](https://mastra.ai/docs/getting-started/ai-sdk)
- [OpenRouter AI SDK provider](https://openrouter.ai/docs/quickstart#using-ai-sdk)
- [Octokit App authentication](https://github.com/octokit/auth-app.js)
- [GitHub App webhook signatures](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries)
- [Convex actions docs](https://docs.convex.dev/functions/actions)
- [Convex storage docs](https://docs.convex.dev/file-storage)
- [Anthropic prompt caching](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching)
- [Research doc](./CODING_HARNESS_RESEARCH.md)
