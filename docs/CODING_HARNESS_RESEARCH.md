# Coding Harness Research & Decision

> Living document — état des lieux complet de la recherche menée en mai 2026 sur la lecture / compréhension / modification de code GitHub par des agents LLM, avec recommandation pour Reflet.

**Date:** 2026-05-10
**Stack Reflet:** TypeScript / Next.js / Mastra / Vercel AI SDK / Convex / Vercel hosting
**Cas d'usage actuel:** Utilisateurs connectent leur GitHub (souvent privé). **Phase 1 = comprendre la codebase + générer des prompts** que l'utilisateur copie-colle dans Claude Code / Codex / outil de son choix. **Phase 2 (plus tard) = modifier le code** (commit, push, PR).
**Critères de décision (pondérés):** facilité d'implémentation > robustesse > faible maintenance > meilleure UX. **Pénalité forte sur tout nouveau compte / vendor / infra à opérer.**

---

## 1. Problème

Reflet Autopilot a besoin de donner à ses agents une compréhension fiable d'un repo GitHub arbitraire, parfois privé, parfois grand. Aujourd'hui le code source de Reflet utilise un pipeline naïf qui montre ses limites.

### 1.1 Audit de l'existant (mai 2026)

| Composant | Fichier | Problème |
|---|---|---|
| Fetch repo | `packages/backend/convex/integrations/github/fetch_actions.ts` | Tree cap 100-500 fichiers via REST. Pas de webhook, full re-fetch à chaque query. |
| Code search | `packages/backend/convex/integrations/github/code_search.ts:36-211` | GitHub Code Search API: 10 résultats max, fichier tronqué à 10K char, rate limit 30 req/min. |
| Tools agent | `packages/backend/convex/integrations/github/exploration_tools.ts:70-309` | `readFile` tronque à **4000 char** (ligne 12). Un fichier React typique est mutilé. Keyword-only. |
| Helpers repo | `packages/backend/convex/integrations/github/github_helpers.ts:117-128` | README + package.json + tree raw, pas d'enrichissement. |
| Repo analysis | `packages/backend/convex/autopilot/repo_analysis.ts:8-70` | CRUD pur, pas d'engine d'analyse derrière. |
| Context build | `packages/backend/convex/autopilot/agent_context.ts:14-115` | Concat texte plain, pas de rerank, pas query-aware. |
| Memory agent | `packages/backend/convex/autopilot/agent_memory.ts:106-167` | Scan linéaire, cap 200 entrées, expire 30j. |
| Modèle LLM | `packages/backend/convex/ai/agent.ts` | OpenRouter sans prompt caching → coût Claude Sonnet 4 multiplié par 3-5×. |

**Verdict audit:** Pipeline custom incomplet. Pire des deux mondes — on paye le coût du custom sans bénéfice d'un vrai pipeline RAG ou d'un vrai harness.

### 1.2 Ce qu'on veut atteindre — Phase 1

Cadrage important: **Phase 1 = lecture seule + génération de prompts**, pas exécution de code.

- Lire fichiers de repos privés (50K-500K LOC).
- Naviguer la structure (dossiers, fichiers, dépendances).
- Chercher du code sémantiquement (par nom, par pattern, par concept).
- Comprendre l'architecture, les choix tech, les conventions.
- **Générer des prompts précis** que l'utilisateur copie-colle dans Claude Code / Codex / Cursor pour faire les modifications lui-même.
- Coût prévisible (< $0.20/tâche moyenne).
- Latence acceptable (< 30s pour question simple).
- Code maintenable (pas un projet 6 mois).
- Sécurité: token GitHub jamais exposé à l'agent en clair.
- **Aucun nouveau compte / vendor / infra à opérer si possible.**

### 1.3 Ce qu'on veut atteindre — Phase 2 (plus tard)

- Capacité à exécuter des actions: lancer build/tests, créer branche, commit, push, ouvrir PR.
- **Cela** justifiera un sandbox (Managed Agents Anthropic ou CF Sandbox).
- **Pas avant.**

---

## 2. Convergence de l'état de l'art (mai 2026)

L'industrie a convergé sur un pattern précis pour les harnesses de coding agents qui **modifient le code**. Ce pattern reste pertinent pour Reflet **Phase 2**, à connaître pour préparer la migration.

| Dimension | Choix dominant | Justification publique |
|---|---|---|
| **Sandbox** | Container/microVM par tâche | Isolation, exécution réelle, reproductibilité — **nécessaire si modify code** |
| **Retrieval** | Agentic grep + repo map léger | Anthropic (Boris Cherny): "RAG perdu vs agentic search. Par beaucoup." |
| **Tools** | `read_file`, `glob`, `grep` (rg), `apply_patch`, `shell`, `update_plan` | Tous identiques entre vendors |
| **Edit format** | `apply_patch` structuré ou string-replace `Edit` | Modèles entraînés dessus |
| **Steering** | `AGENTS.md` (+ `CLAUDE.md` symlink) | Standard 2026 cross-tool |
| **Memory** | 4 couches: `CLAUDE.md` / `AGENTS.md` / `MEMORY.md` auto / per-subagent | Pattern Claude Code v2.1.33+ |
| **Auth GitHub** | GitHub App (≠ OAuth App) | Rate limits scalent par installation |
| **Clone** | `git clone --filter=blob:none --depth=1` | Gain 88-99% |

### 2.1 Pas de RAG / vector DB en v1 — vrai en lecture-seule comme en modify

Position publique de chaque vendor majeur:
- **Anthropic** ([Effective Context Engineering, sept 2025](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)): "Just-in-time retrieval — agents carry lightweight identifiers, load on demand."
- **OpenAI Codex**: "Semantic search peut marcher mais demande tuning." Default = `apply_patch` + `shell`.
- **Cursor** = exception (Turbopuffer + Merkle), mais en **complément** de grep, pas en remplacement.

**Évidences académiques récentes:**
- "Keyword Search Is All You Need" (Amazon, AAAI 2026, [arXiv 2602.23368](https://arxiv.org/abs/2602.23368)): grep agentique = **>90% perf RAG** sans vector DB.
- "Beyond Semantic Similarity" (mai 2026): grep+shell bat sparse/dense/rerank de **+11% à +30.7%** sur 13 benchmarks.
- ETH Zurich (Gloaguen 2026): `AGENTS.md` LLM-generated **réduit succès -3% +20% coût**. Hand-written +4%.

### 2.2 Pour Phase 1 lecture-seule, on peut faire encore plus simple

Tous les exemples ci-dessus parlent d'agents qui **exécutent**. Si l'objectif est uniquement **lire + comprendre + générer prompts**, on peut se passer de:
- Sandbox (pas d'exécution).
- Repo map sophistiqué (l'agent peut explorer via API GitHub directement).
- Apply patch / shell tools.

→ **Voir Approche G ci-dessous.**

---

## 3. Approches comparées

### Approche G — AI SDK + GitHub MCP (RECOMMANDÉE Phase 1)

**Quoi:** Agent LLM (Claude Sonnet 4.6 par défaut, fallback GPT-5.5) avec accès aux tools du GitHub MCP server. L'agent lit fichiers, cherche du code, navigue le repo via les API GitHub natives — sans cloner, sans sandbox.

**Stack:**
- **LLM client:** Anthropic SDK direct (`@anthropic-ai/sdk`) pour prompt caching natif explicite **OU** Vercel AI SDK 6 (déjà installé) pour multi-model facile.
- **MCP server:** [`github/github-mcp-server`](https://github.com/github/github-mcp-server) officiel (Go, runnable in-process via Anthropic SDK MCP integration) **OU** server custom maison ~50 lignes via `@modelcontextprotocol/sdk` qui wrappe Octokit.
- **Auth:** GitHub App + installation tokens (utilisateur accepte une fois au onboarding).
- **Orchestration:** Mastra (déjà installé) pour multi-step + memory.
- **Storage:** Convex (déjà installé) pour cache file contents et conversation history.

**Tools exposés à l'agent:**
- `get_file_contents(path)` — full content, pas de troncature artificielle
- `list_directory(path)` — arborescence
- `search_code(query)` — GitHub Code Search API (avec mitigation rate limit)
- `get_repository_info()` — metadata, languages, topics
- `list_pull_requests(state)` / `list_issues(state)` — contexte
- `get_commit(sha)` / `list_commits(branch)` — historique

**Pour:**
- ✅ **Time-to-prod 3-5 jours.** Tout est déjà en place sauf la wire MCP.
- ✅ **Zéro nouveau compte / vendor / infra.** Pas de Cloudflare, pas d'Anthropic Managed billing, pas de sandbox.
- ✅ **Pas de vendor lock.** MCP est un standard cross-tool. Le code agent reste portable.
- ✅ **Multi-model via AI SDK.** Claude / GPT-5.5 / Gemini interchangeables.
- ✅ **Coût compute = $0.** Tout tourne dans Convex/Vercel déjà payés.
- ✅ **Maintenance near-zero.** GitHub gère l'API, MCP server est stateless.
- ✅ **Sécurité claire.** Token GitHub injecté dans le MCP server côté backend, jamais visible par l'agent ni le frontend.
- ✅ **Adapté au cas d'usage exact** (read-only + prompt generation).
- ✅ **Composable Phase 2:** ajouter un sandbox plus tard alongside, le code agent reste 90% identique.

**Contre:**
- ❌ **GitHub Code Search caps:** 30 req/min, 10 résultats max par query. Mitigation: cache + dedup queries.
- ❌ **N appels API par fichier** quand l'agent explore. Mitigation: tarball download 1× / cache `get_file_contents` par `(repo_sha, path)` dans Convex.
- ❌ **Pas d'exécution code.** OK pour Phase 1, justifie sandbox en Phase 2.
- ❌ **Latence par tool call** ~200-500ms (round-trip API GitHub). Mitigation: prompt caching Anthropic pour réduire le nombre de turns.

**Effort dev:** ⭐⭐⭐⭐⭐ (3-5 jours).
**Robustesse:** ⭐⭐⭐⭐ (GitHub API stable, MCP standard).
**Maintenance:** ⭐⭐⭐⭐⭐ (rien à opérer).
**UX:** ⭐⭐⭐⭐ (excellent pour read-only, latence acceptable avec cache).
**Phase 2 ready:** ⭐⭐⭐⭐⭐ (orchestrateur portable).

**Mitigations rate limit / latence (toujours pas de sandbox):**
1. **Tarball download au connect du repo** → cache dans Convex storage. Refresh sur webhook push.
2. **Cache `get_file_contents`** par `(installation_id, repo_id, sha, path)` dans Convex table.
3. **Prompt caching Anthropic** sur system + AGENTS.md + repo metadata = 90% off cache reads.
4. **Hand-written `AGENTS.md`** par repo (généré au onboarding, éditable user) injecté en cached prefix → l'agent oriente sans explorer.

---

### Approche A — Anthropic Managed Agents

**Quoi:** Anthropic gère le harness ET le sandbox. Tu fournis: agent + environment + session. Tools built-in: `bash`, `read/write/edit/glob/grep`, `web_search`, `web_fetch`, MCP. Streaming SSE. Beta header `managed-agents-2026-04-01`.

**Pertinent quand:** Phase 2 — modify code, run tests, build verify.

**Pour:**
- ✅ Time-to-prod ~1 semaine pour modify code.
- ✅ Tools matchent exactement la SOTA.
- ✅ Streaming SSE intégré, event history persistée.
- ✅ Networking `limited` + `allowed_hosts` HTTPS.
- ✅ Packages pré-install avec cache cross-session.
- ✅ Multiagent + outcomes disponibles (research preview).

**Contre:**
- ❌ **Code passe par infra Anthropic** — sensibilité repos privés à valider.
- ❌ **Vendor lock Anthropic** — pas de fallback Codex/GPT-5.
- ❌ **Sessions ne partagent pas le filesystem** — re-clone à chaque tâche.
- ❌ Beta — "behaviors may be refined."
- ❌ Pricing additionnel ~$0.08/session-hour.
- ❌ **Nouveau compte / billing relationship Anthropic** (vs OpenRouter actuel).
- ❌ **Overkill pour Phase 1 read-only.**

**Effort dev:** ⭐⭐⭐⭐ (simple mais nouveau setup).
**Robustesse:** ⭐⭐⭐⭐ (prod-grade, mais beta).
**Maintenance:** ⭐⭐⭐⭐⭐ (rien à opérer).
**UX:** ⭐⭐⭐⭐ (re-clone latence acceptable).

---

### Approche B — Cloudflare Sandboxes + Claude Agent SDK

**Quoi:** Sandbox Cloudflare (GA 13 avril 2026) qui exécute Claude Agent SDK en subprocess. Durable Object stable par `(installation, repo)` pour warm clone.

**Pertinent quand:** Phase 2 — modify code + besoin data sovereignty / multi-model / coût optimisé.

**Pour:**
- ✅ **Data sovereignty:** code sur ton infra.
- ✅ Multi-model: Claude + GPT-5.5 + Gemini.
- ✅ Warm clone par DO stable → latence minimale.
- ✅ Egress proxy CF zero-trust pour token injection.
- ✅ Coût compute ~$10/mo.

**Contre:**
- ❌ **Nouveau compte Cloudflare** (Workers + Containers).
- ❌ **3-4 semaines** d'effort initial.
- ❌ Stack à opérer: GitHub App + CF Sandbox + Mastra + Convex bridge.
- ❌ Project Think (CF) en preview.
- ❌ `@convex-dev/mastra` reste alpha.4.
- ❌ **Overkill pour Phase 1 read-only.**

**Effort dev:** ⭐⭐ (plus complexe).
**Robustesse:** ⭐⭐⭐⭐ (CF GA).
**Maintenance:** ⭐⭐⭐ (sandbox + harness à monitorer).
**UX:** ⭐⭐⭐⭐⭐ (warm clone).

---

### Approche C — Vercel Open Agents pattern

**Quoi:** Fork [`vercel-labs/open-agents`](https://github.com/vercel-labs/open-agents). Three-layer: Next.js + workflow + Vercel Sandbox (Firecracker).

**Pertinent quand:** Phase 2, si tu veux rester 100% Vercel.

**Contre majeurs:**
- ❌ **Vercel Sandbox iad1 only** (latence EU).
- ❌ Cap session 5h Pro / 45 min tier inférieur.
- ❌ Pricing $0.128/hr Active CPU (plus cher que CF/Daytona).

---

### Approche D — Greptile API

**Pertinent quand:** Tu veux un service hosted "code Q&A as a service".

**Contre majeurs:**
- ❌ Lecture seule (bouché Phase 2).
- ❌ Coût par requête ($0.15-$0.45).
- ❌ Vendor lock + nouveau compte.

---

### Approche E — DeepWiki MCP

**Pertinent quand:** Repos publics, Q&A high-level uniquement.

**Contre majeurs:**
- ❌ Cache lag (pas frais).
- ❌ Privés = Devin tier ($$$).
- ❌ Pas suffisant seul.

---

### Approche F — Garder l'existant + l'améliorer

**À éviter.** Pipeline custom incomplet, pas de bénéfice écosystème, scale mal.

---

## 4. Matrice de décision

Notation 1-5 (5 = meilleur). Pondération reflète les critères utilisateur (facilité > robustesse > maintenance > UX, pénalité forte sur nouveaux comptes).

| Critère (poids) | **G. AI SDK + GitHub MCP** | A. Managed Agents | B. CF + SDK | C. Vercel Open Agents | D. Greptile | E. DeepWiki | F. Statu quo |
|---|---|---|---|---|---|---|---|
| **Facilité dev (3×)** | **5** | 4 | 2 | 3 | 5 | 5 | 5 |
| **Robustesse (3×)** | **4** | 4 | 4 | 3 | 4 | 3 | 1 |
| **Faible maintenance (3×)** | **5** | 5 | 3 | 4 | 5 | 5 | 2 |
| **UX Phase 1 (3×)** | **4** | 4 | 5 | 3 | 3 | 2 | 2 |
| **Pas de nouveau compte (2×)** | **5** | 2 | 1 | 4 | 1 | 3 | 5 |
| **Phase 2 ready (2×)** | **5** | 5 | 5 | 5 | 1 | 1 | 1 |
| **Multi-model (1×)** | **5** | 1 | 5 | 5 | 1 | 1 | 5 |
| **Coût Phase 1 (1×)** | **5** | 3 | 4 | 4 | 2 | 4 | 5 |
| **Score pondéré** | **76** | 60 | 56 | 56 | 49 | 47 | 47 |

**Top 1 sans contestation: G** (76 vs 60 pour A).

G gagne parce que:
- 0 nouveau compte / vendor / infra
- 3-5 jours de dev (vs 1-4 semaines)
- Adapté **exactement** au cas d'usage Phase 1 (read-only + prompt generation)
- Composable: Phase 2 ajoute un sandbox alongside, l'orchestrateur reste

---

## 5. Recommandation

### Phase 1 (NOW, 3-5 jours) — Approche G: AI SDK + GitHub MCP

**Architecture:**

```
                       UTILISATEUR
                           │
                  Reflet web (Next.js / Vercel)
                           │
                  Convex backend
                  ├─ tasks / threads / messages
                  ├─ installations GitHub
                  ├─ file_contents_cache (sha+path → content)
                  └─ Mastra workflows
                           │
              ┌────────────┴────────────┐
              │ Mastra agent            │
              │ (Anthropic SDK direct,  │
              │  prompt caching ON)     │
              │                         │
              │ Tools = MCP wire to:    │
              │  ┌────────────────────┐ │
              │  │ GitHub MCP Server  │ │
              │  │ (in-process or     │ │
              │  │  Convex action)    │ │
              │  │                    │ │
              │  │ - get_file_contents│ │
              │  │ - list_directory   │ │
              │  │ - search_code      │ │
              │  │ - get_repo_info    │ │
              │  │ - list_prs / issues│ │
              │  └─────────┬──────────┘ │
              └────────────┼────────────┘
                           │ Octokit
                           ▼
                  GitHub API
                  (private repo via
                   installation token)
```

**Implémentation minimum:**

```typescript
// packages/backend/convex/autopilot/codebase_agent.ts
import Anthropic from "@anthropic-ai/sdk";
import { Octokit } from "octokit";

const anthropic = new Anthropic();

// MCP-style tool definitions (compatible with Anthropic native tools format)
const tools = [
  {
    name: "get_file_contents",
    description: "Read full content of a file from the repo",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "File path from repo root" },
        ref: { type: "string", description: "Optional branch/sha, defaults to main" },
      },
      required: ["path"],
    },
  },
  {
    name: "list_directory",
    description: "List files and folders at a path",
    input_schema: {
      type: "object",
      properties: { path: { type: "string", default: "" } },
    },
  },
  {
    name: "search_code",
    description: "Search code across the repo using GitHub Code Search",
    input_schema: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    },
  },
];

async function executeTool(
  name: string,
  input: any,
  octokit: Octokit,
  owner: string,
  repo: string,
) {
  switch (name) {
    case "get_file_contents": {
      const cached = await ctx.db.query("fileCache")
        .withIndex("by_key", q => q.eq("repo", `${owner}/${repo}`).eq("path", input.path))
        .first();
      if (cached) return cached.content;
      const { data } = await octokit.rest.repos.getContent({
        owner, repo, path: input.path, ref: input.ref,
      });
      const content = Buffer.from((data as any).content, "base64").toString();
      await ctx.db.insert("fileCache", { repo: `${owner}/${repo}`, path: input.path, content });
      return content;
    }
    case "list_directory": {
      const { data } = await octokit.rest.repos.getContent({
        owner, repo, path: input.path ?? "",
      });
      return (data as any[]).map(f => ({ name: f.name, type: f.type, path: f.path }));
    }
    case "search_code": {
      const { data } = await octokit.rest.search.code({
        q: `${input.query} repo:${owner}/${repo}`,
      });
      return data.items.slice(0, 10).map(i => ({ path: i.path, score: i.score }));
    }
  }
}

// Agent loop
async function runCodebaseAgent(userQuestion: string, repoFullName: string) {
  const [owner, repo] = repoFullName.split("/");
  const octokit = await getInstallationOctokit(repoFullName);

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userQuestion },
  ];

  while (true) {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: [
        {
          type: "text",
          text: await buildSystemPrompt(repoFullName), // includes AGENTS.md
          cache_control: { type: "ephemeral" }, // 90% off on cache reads
        },
      ],
      tools,
      messages,
    });

    if (response.stop_reason === "end_turn") {
      return response.content.find(b => b.type === "text")?.text;
    }

    // Execute tool calls
    const toolUses = response.content.filter(b => b.type === "tool_use");
    const toolResults = await Promise.all(
      toolUses.map(async (use: any) => ({
        type: "tool_result" as const,
        tool_use_id: use.id,
        content: JSON.stringify(await executeTool(use.name, use.input, octokit, owner, repo)),
      })),
    );

    messages.push({ role: "assistant", content: response.content });
    messages.push({ role: "user", content: toolResults });
  }
}
```

**Travail concret à faire:**
1. Créer GitHub App Reflet (remplace OAuth actuel pour scaling rate limits).
2. Implémenter MCP server / tools wrapper (~100 lignes Octokit + Anthropic SDK).
3. Créer table Convex `fileCache` + `repoMetadata`.
4. Migrer `repoAnalysisAgent` actuel vers la nouvelle stack.
5. Activer prompt caching Anthropic (passer SDK direct ou OpenRouter avec cache headers).
6. Hand-write template `AGENTS.md` généré au onboarding (éditable user).
7. UI: streaming réponse temps réel via Convex subscriptions.

**Ce qu'on supprime:**
- `exploration_tools.ts` (cap 4K, remplacé par MCP tools)
- `code_search.ts` (intégré dans MCP)
- `github_helpers.ts` partie content fetch (intégré dans MCP)

**Ce qui reste:**
- `fetch_actions.ts` pour metadata repo (ou migré dans MCP).
- `agent_memory.ts` (Convex-side, cross-session).
- `agent_context.ts` pour knowledge docs / initiatives.

### Phase 1.5 (escape valve, +2 jours si benchmark montre limites) — Tarball cache + grep JS

**Pourquoi:** GitHub Code Search a deux caps durs (10 résultats max, 30 req/min) et chaque `get_file_contents` = 1 round-trip API. Pour repos > 50K LOC ou questions deep ("où X est utilisé partout"), MCP plafonne.

**Solution sans sandbox:**
1. **Au connect du repo:** download tarball via `GET /repos/{o}/{r}/tarball/{ref}` (1 call API).
2. **Cache dans Convex storage** (blob) keyed `(installation_id, repo_id, sha)`.
3. **Refresh sur webhook push** (auto-invalidate).
4. **Nouveaux tools:**
   - `grep_repo(pattern, glob?)` — Convex action streame le tarball, unzip in-memory, JS regex sur tous fichiers, renvoie `{path, line, match}[]`.
   - `glob(pattern)` — match path patterns sur le tree.
5. **Quand grep > N résultats** → renvoyer les top hits + agent peut affiner.

**Limites Convex actions:** 256 MB RAM, 10s timeout. Suffisant pour repos jusqu'à ~200K LOC. Au-delà → soit chunking par sous-arbre, soit Phase 2 sandbox.

**Comparaison perf vs Claude Code local:**

| Tool | Phase 1.0 MCP only | Phase 1.5 +tarball+grep | Claude Code local |
|---|---|---|---|
| Lire fichier ciblé | 200-500ms (REST) | <50ms (cache) | <50ms |
| Grep cross-files | 10 max, 30/min cap | unlimited, ~200ms | unlimited, ~50ms |
| Glob | N appels list_directory | <10ms | <10ms |
| 30 tool calls/tâche | 6-15s + risque rate limit | 1-3s | <1s |
| Couverture cas d'usage read-only | **70%** | **95%** | 100% |

**Décision Phase 1.0 vs 1.5:** Ship Phase 1.0 (MCP only) en 5 jours, benchmark sur 5-10 repos test. Si rate limit / latence ressort en feedback utilisateur → ajouter Phase 1.5 en 2 jours (tools backward-compatible avec Phase 2 sandbox).

### Phase 2 (3-6 mois plus tard, quand modify code) — Ajouter sandbox

**Quand pivoter:**
- Demande utilisateur "applique cette modif et ouvre une PR" arrive.
- Premier client enterprise demande données off-Anthropic + SOC2.

**Choix sandbox (par ordre de préférence):**
1. **Anthropic Managed Agents** — si OK avec data through Anthropic, le plus simple.
2. **Cloudflare Sandbox + Claude Agent SDK** — si data sovereignty / multi-model.
3. **Vercel Sandbox** — si tu veux rester 100% Vercel (mais iad1 only).

**Migration:**
- L'orchestrateur Mastra reste 95% identique.
- Ajout: tools `apply_patch`, `bash`, `git_commit`, `git_push`, `create_pr`.
- Même `AGENTS.md`, même memory, même prompt caching.
- L'agent peut alterner read-only mode (Phase 1) et modify mode (Phase 2) selon la tâche.

---

## 6. À éviter (anti-patterns)

| Pattern | Pourquoi pas |
|---|---|
| Sourcegraph Cody | Déprécié 23 juillet 2025. |
| Bloop | Fermé 10 avril 2026. |
| Cursor index API | Pas d'API publique pour l'index. |
| Construire pgvector pipeline custom | Pas de bénéfice vs agentic grep. |
| Sandbox en Phase 1 | Over-engineering — pas d'exécution requise. |
| Naive 1M context "shove le repo entier" | 50K LOC ≈ 10M tokens > 1M ctx. |
| HyDE pour code | Hallucinations dominent. |
| AGENTS.md généré par LLM | -3% succès, +20% coût (Gloaguen 2026). |
| OAuth GitHub Apps pour scaling | Rate limit flat 5K/h shared. Utiliser GitHub App. |
| Codespaces API | Pas de vrai API programmatique. |

---

## 7. Détails techniques convergés

### 7.1 GitHub auth (Phase 1 ET Phase 2)
- **GitHub App, pas OAuth App.** Rate limits scalent: 5K/h base + 50/h per repo > 20 + 50/h per user > 20, cap 12.5K/h non-Enterprise.
- Installation tokens TTL 1h, cache keyed by `installation_id`, refresh via JWT.
- Webhooks pour freshness (ne consomme pas le rate limit). Subscribe: `push`, `pull_request`, `issues`, `installation`.
- Secrets: clé privée GitHub App jamais exposée à l'agent. Token court-lived injecté côté backend uniquement.

### 7.2 Tool surface Phase 1 (lecture seule)
- `get_file_contents(path, ref?)` — full content.
- `list_directory(path)`.
- `search_code(query)` — wrapper GitHub Code Search.
- `get_repository_info()` — metadata.
- `list_pull_requests(state)` / `list_issues(state)` — contexte.
- `get_commit(sha)` / `list_commits(branch)` — historique.

### 7.3 Tool surface Phase 2 (modify code)
- Tout ci-dessus +
- `apply_patch(file, patch)` — structured diff.
- `bash(cmd)` — pour tests/builds dans sandbox.
- `git_commit(branch, message)` / `git_push(branch)`.
- `create_pull_request(branch, title, body)`.

### 7.4 Models et caching
- **Default Phase 1: Claude Sonnet 4.6** ($3/$15, $0.30 cached, 1M ctx flat-rate).
- **Escalation: Claude Opus 4.7** ($5/$25, $0.50 cached) — réserver à reasoning complexe.
- **Prompt caching ON** sur system + AGENTS.md + repo metadata = 90% discount sur cache reads.
- **Anthropic > OpenAI** pour caching agent: cache breakpoints explicites = 100% hit rate.
- ⚠️ Opus 4.7 nouveau tokenizer ~35% tokens en plus vs 4.6 — surveille.

### 7.5 Memory architecture (4 couches)
1. **`CLAUDE.md`** (project root, < 300 lignes, hard rules).
2. **`AGENTS.md`** (universal, multi-tool).
3. **`MEMORY.md`** auto-géré (premier 200 lignes / 25 KB).
4. **Per-subagent memory** (Mastra side).

Pour Reflet: stocker dans **Convex**, pas dans le sandbox.

### 7.6 Cache stratégie Phase 1
- **`fileCache` table Convex** keyed `(installation_id, repo_id, sha, path)`.
- **`repoMetadata` table** keyed `(installation_id, repo_id)` avec languages, topics, AGENTS.md.
- **TTL:** invalidation sur webhook push.
- **Tarball pre-fetch:** au connect du repo, télécharger tarball complet et indexer dans `fileCache` en batch (1 call API au lieu de N).

---

## 8. Coût estimé

### Phase 1 (G — AI SDK + GitHub MCP)

100 tâches/jour × 5 min × 30 jours ≈ 250h conversation/mo.

- **Compute:** $0 (Convex/Vercel déjà payés).
- **GitHub API:** gratuit jusqu'aux rate limits (jamais atteint en pratique avec cache).
- **LLM Sonnet 4.6 cache ON (90% off reads):** ~$300-450/mo.
  - Cold cache write 1×/repo/jour: ~$2/repo en Sonnet.
  - Cache reads 90% off: ~$0.15/tâche.
- **LLM Opus 4.7 escalation (10% des tâches):** ~$100/mo.
- **Total: ~$400-550/mo.**

### Phase 2 (G + sandbox A ou B)

- Tout ci-dessus +
- Sandbox compute: $10-30/mo.
- LLM légèrement plus (apply_patch + verification): +20%.
- **Total: ~$500-700/mo.**

LLM domine 25-30× le compute. Le choix d'infra impacte ~$10-20/mo, pas $200/mo.

---

## 9. Questions ouvertes Phase 1

1. **Rate limit GitHub Code Search (30/min)** — assez en pratique ? Plan B = ripgrep sur tarball cached.
2. **Coût prompt caching Anthropic** — exact cost à 1M tokens cached prefix par repo ?
3. **GitHub App migration users existants** — si on en a déjà via OAuth, plan de migration ?
4. **MCP server officiel vs maison** — `github/github-mcp-server` (Go, plus complet) vs ~50 lignes Octokit (TS, plus contrôle) ?
5. **AI SDK Vercel vs Anthropic SDK direct** — AI SDK = multi-model facile mais cache control un peu indirect. SDK direct = caching natif clair mais Claude only.

---

## 10. Plan d'action 5 jours

### Jour 1 — Setup
- [ ] Créer GitHub App Reflet (côté setup, pas migration users encore).
- [ ] Créer table Convex `fileCache`, `repoMetadata`, `agentRuns`.
- [ ] Decision: Anthropic SDK direct OR AI SDK Vercel (recommandation: SDK direct pour Phase 1 — cache control plus simple).
- [ ] Installer `@anthropic-ai/sdk` + `octokit` + `@octokit/auth-app`.

### Jour 2 — MCP tools
- [ ] Implémenter `executeTool()` avec 6 tools: `get_file_contents`, `list_directory`, `search_code`, `get_repository_info`, `list_pull_requests`, `list_issues`.
- [ ] Ajouter cache layer Convex sur `get_file_contents`.
- [ ] Tests unitaires sur chaque tool.

### Jour 3 — Agent loop
- [ ] Implémenter agent loop avec tool execution + Anthropic prompt caching.
- [ ] Hand-write template `AGENTS.md` initial (architecture, conventions, points d'entrée).
- [ ] Migrer `repoAnalysisAgent` vers la nouvelle stack.

### Jour 4 — UI streaming
- [ ] Streamer events vers Convex subscriptions.
- [ ] UI: panneau conversation + indicateur tool use.
- [ ] Token budget ceiling per task.

### Jour 5 — Hardening + benchmark
- [ ] Benchmark vs current sur 5 repos test (latence, coût, qualité).
- [ ] Logs/observabilité Convex + Mastra traces.
- [ ] Déprécier `exploration_tools.ts`, `code_search.ts`.
- [ ] Doc onboarding utilisateur (GitHub App installation).

---

## 11. Sources clés (mai 2026)

### Anthropic
- [Effective Context Engineering for AI Agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- [Effective Harnesses for Long-Running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- [Managed Agents Overview](https://platform.claude.com/docs/en/managed-agents/overview) (Phase 2)
- [Hosting the Agent SDK](https://platform.claude.com/docs/en/agent-sdk/hosting) (Phase 2)
- [Prompt Caching Docs](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching)
- [Claude Agent SDK TypeScript](https://github.com/anthropics/claude-agent-sdk-typescript)

### GitHub MCP
- [github/github-mcp-server](https://github.com/github/github-mcp-server) — official Go server
- [Model Context Protocol spec](https://modelcontextprotocol.io/)
- [@modelcontextprotocol/sdk](https://www.npmjs.com/package/@modelcontextprotocol/sdk) — TS SDK
- [GitHub App rate limits](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/rate-limits-for-github-apps)

### Vercel / Mastra / Convex
- [AI SDK 6](https://vercel.com/blog/ai-sdk-6)
- [Mastra Releases](https://github.com/mastra-ai/mastra/releases)
- [@convex-dev/agent CHANGELOG](https://github.com/get-convex/agent/blob/main/CHANGELOG.md)

### Sandbox (Phase 2)
- [Cloudflare Sandboxes GA (13 avril 2026)](https://blog.cloudflare.com/sandbox-ga/)
- [Vercel Open Agents](https://github.com/vercel-labs/open-agents)
- [Vercel Sandbox Pricing](https://vercel.com/docs/vercel-sandbox/pricing)

### Recherche
- [Keyword Search Is All You Need (AAAI 2026, arXiv 2602.23368)](https://arxiv.org/abs/2602.23368)
- [SWE-bench Pro Leaderboard](https://labs.scale.com/leaderboard/swe_bench_pro_public)
- [AGENTS.md Spec](https://agents.md/)
- [Aider Repo Map](https://aider.chat/2023/10/22/repomap.html) (pour Phase 2 si besoin)

---

## 12. TL;DR

**État actuel:** pipeline custom incomplet (`readFile` cap 4K, no caching, GitHub Search 10/query).

**Cas d'usage Phase 1:** lecture + compréhension + génération de prompts. Pas d'exécution. **Sandbox = over-engineering.**

**Recommandation Phase 1.0: Mastra + OpenRouter + tools custom Octokit.** 3-5 jours dev, 0 nouveau compte, 0 nouvelle infra, ~$400-550/mo, parfaitement composable Phase 2.

**Phase 1.5 (escape valve, +2 jours):** ajouter tarball cache + `grep_repo` JS dans Convex action quand benchmark montre limites MCP. Couvre 95% cas d'usage Claude Code-like en read-only.

**Phase 2 (modify code, plus tard):** ajouter sandbox alongside (Anthropic Managed Agents en premier, Cloudflare en alternative). L'orchestrateur reste 95% identique.

**À éviter en Phase 1:** Managed Agents, Cloudflare Sandbox, Vercel Sandbox, RAG/embeddings, custom pgvector — tous over-engineered pour read-only.

**SOTA convergée 2026** (sandbox + structured tools + agentic grep + AGENTS.md): pertinente pour Phase 2, pas pour Phase 1.
