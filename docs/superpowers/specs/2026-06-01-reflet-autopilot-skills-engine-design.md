# Reflet Autopilot — Design : skills + prompts, moteur swappable, `.reflet` comme vérité

> Statut : design (brainstorm consolidé), en attente de revue utilisateur avant plan d'implémentation.
> Date : 2026-06-01. Toutes les affirmations techniques ci-dessous ont été vérifiées (recherche + vérif adverse, mai-juin 2026).

## 1. Contexte & pourquoi (table rase)

L'ancienne architecture autopilot (cerveau serveur OpenRouter + orchestration Convex + bridge daemon local) est **hors équation**. On repart de « quel est le produit ». Priorité actuelle du fondateur : **ça marche parfaitement, meilleure UX, autonomie A→Z** pour gérer un SaaS (« 0-employee company ») ; **l'optimisation coût vient après**.

**Insight central :** la valeur de Reflet n'est pas l'infra d'orchestration. C'est **la méthodologie ProductMap encodée en skills Claude + des prompts**, exécutée sur un **moteur interchangeable**, produisant un **cerveau d'entreprise dans `.reflet/` (= source de vérité, dans le repo git du user)**.

## 2. North star + cadre d'autonomie (honnête)

- **Objectif affiché** : boîte 100% autonome, zéro humain requis.
- **Cible d'ingénierie réaliste** : **human-in-the-loop par défaut, autonomie qui se gravit par classe d'action**. L'utilisateur peut toujours vérifier ; mais « ça doit marcher sans lui ».
- **Mécanisme clé = contre-pression** (idée du fondateur) : le système produit en autonomie, MAIS **si > N items (≈5) sont en attente d'approbation, la génération se met en pause** — pour ne pas cramer des crédits à produire ce que personne ne regarde. (Ce guard existe déjà : `packages/harness/src/policy.ts`, `approval_cap_reached`.)
- **Le gate d'impact existe déjà** (`gate.ts`, `classifyImpact` → none/overwrite/external, construit en Phase 4) : `none` = auto (drafts internes, suggestions) ; `external` (poster, email, deploy) = approbation jusqu'à track record prouvé.

## 3. Architecture — 4 éléments

### 3.1 L'IP portable : skills + prompts + contrat `.reflet`
- Skills Claude (`SKILL.md` + frontmatter + ressources), 1 par capacité ProductMap : `codebase-map`, `feature-catalog`, `market-scan`, `competitor-deep-dive`, `personas-icp`, `positioning`, `use-cases`, `content-drafts`, `community-finder`, `outreach-drafts`.
- **Format de skill portable** (vérifié) entre CLI local, Agent SDK, Managed Agents.
- Distribution : marketplace qu'on possède (repo + `marketplace.json`) + listé sur skills.sh. Install en 1 commande.
- `.reflet/` = la **sortie** (le cerveau généré), PAS l'emplacement des skills (les skills vivent dans le plugin / `.claude/skills/`).

### 3.2 Init = prompt à copier-coller, exécuté en LOCAL (décision fondateur)
- Le gros one-shot (codebase understanding, lister TOUTES les features, marché, TOUS les concurrents classés en détail, personas, positionnement) se fait via **un prompt que l'utilisateur copie dans SON CLI** (Claude Code / Codex) **sur son abonnement**.
- Pourquoi : coût ~0 € pour Reflet (tokens sur l'abo user), qualité max (vrai repo + sous-agents), **zéro infra Reflet pour la partie la plus lourde**.
- Forme : pas un méga-prompt monolithique fragile → **commandes orchestrées, reprenables**, chaque sous-agent commit son artefact dans `.reflet/` dès qu'il finit (résiste aux coupures + tient le contexte).
- L'UI Reflet **fournit le prompt** (bouton « copier le prompt d'init ») + les instructions d'install des skills.

### 3.3 Récurrent = Reflet web (métré, zéro setup user)
- Pour le travail continu (suggestions de fixes/features, drafts marketing, opportunités Reddit) qui doit tourner **sans que la machine du user soit allumée**.
- **Moteur par défaut (à confirmer en impl)** : Managed Agents (Anthropic héberge, clone le repo via PAT, ouvre des PR) OU Agent SDK dans un conteneur Reflet. Les deux = métré, Reflet refacture.
- ⚠️ Contrainte vérifiée : **Managed Agents n'a pas de réseau dans les scripts de skill** → les appels web doivent passer par **MCP distant** (ou par un conteneur Reflet à réseau complet).

### 3.4 Couche recherche = Exa (via MCP), Reddit v1
- **Exa** : découverte de threads/sociétés (sémantique + filtres de date). Prix **à la requête** (~0,007 $/recherche, ~0,001 $/contenu, **1000 req/mois gratuit**) — PAS à l'heure. Serveur **MCP officiel** (`exa-labs/exa-mcp-server`) → marche sur les 3 moteurs.
- **Reddit v1** : découverte via Exa `includeDomains:['reddit.com']` ; contenu via Exa `/contents` (⚠️ fiabilité contestée — à smoke-tester ; Firecrawl en fallback d'extraction si Exa cale). Reflet a **déjà** ce code (`shared_search.ts`, `content_enricher.ts`).
- **X/Twitter : descopé v1** (login wall + API ~42k$/an + crawl bloqué). Best-effort opportuniste plus tard.
- Le réseau passe par **MCP** (typé, clé Exa au niveau MCP pas dans le prompt, portable A/B).

## 4. La vérité + l'UI

- **`.reflet/` dans le repo git = source de vérité unique.** Versionné, possédé par l'user, pas enfermé dans un SaaS.
- **Canal de remontée vers Reflet web = l'app GitHub déjà connectée** (décision) : l'user commit/push `.reflet`, Reflet le lit (réutilise la connexion repo existante). Pas de bridge, pas d'upload manuel, zéro nouveau setup.
- **L'UI web Reflet = cockpit + couche d'action** : rend `.reflet` (board, concurrents, personas, drafts), affiche la file d'approbation (inbox), et exécute les actions externes derrière le gate. (Réutilise `content-tab`, `autopilotDocuments`, l'inbox — agnostiques du moteur.)
- **Édition → PR** : modifier un doc dans l'UI crée un commit/PR sur une branche `reflet/*`.

## 5. Séquencement

- **Phase A — Le wedge (prompt d'init + skills).** Aucune infra. Dogfood sur le repo Reflet. **Question make-or-break : le cerveau `.reflet` généré est-il excellent ?** (TOUS les concurrents classés en profondeur, positionnement tranchant, personas réels, sourcé). Si oui → produit démontrable, coût ~0.
- **Phase B — Ingestion + cockpit web.** Reflet lit `.reflet` (app GitHub), le rend dans l'UI, file d'approbation.
- **Phase C — Récurrent (Reflet web métré).** Marketing/suggestions en continu via le moteur cloud + Exa MCP, derrière le gate + la contre-pression (>5 → pause).
- **Phase D — Les mains + 24/7.** Actions externes (post Reddit via lien à copier-coller d'abord, puis auto ; outreach ; PR de code), promotion progressive en full-auto par classe. Stripe/PostHog branchés ici (boucle de feedback métrique).

## 6. Ce qu'on RETIRE (nettoyage, séquencé dans le plan — PAS encore fait)

- **`packages/bridge`** (daemon local, ~2371 LOC) — remplacé par le prompt copier-coller + app GitHub.
- **Surface backend du bridge** devenue inutile sans daemon : routes HTTP `bridge_api` (register/heartbeat/claim/complete/fail), file de jobs `autopilotBridgeJobs` + `enqueue*`, l'UI `harness/` (page + dashboard + nav). ⚠️ À séquencer : vérifier ce qu'on garde (`refletArtifacts` peut devenir la projection de `.reflet` ; le gate `classifyImpact` reste).
- Le `.tgz` du bridge servi en download + `setup-panel`.
- **À NE PAS casser** : `gate.ts`/`classifyImpact` (Phase 4), `autopilotDocuments` + inbox + content-tab (UI marketing), la connexion GitHub/analyse repo.

## 7. Modèle coût / auth

- **Init** : abonnement du user (local), ~0 € pour Reflet ; + quelques requêtes Exa.
- **Récurrent** : métré (Managed Agents/Agent SDK conteneur), Reflet refacture ; Exa à la requête.
- **Auth** : le token d'abonnement reste **chez le user** (mode local init). Côté serveur = clé API Reflet (métré). **Jamais** router le token d'abonnement côté serveur (ban ToS fév. 2026).

## 8. Risques (honnête)

- **Qualité du cerveau d'init** = tout le pari. À prouver en dogfood AVANT de construire le reste.
- **Reddit contenu via Exa** = fiabilité contestée → smoke-test réel + fallback Firecrawl.
- **X = descopé** (assumer).
- **Plateforme** : Anthropic pourrait shipper un template « company » natif → différenciateur = profondeur méthodo + UX cockpit + vitesse.
- **Dual-engine QA** : un prompt nickel en local peut dériver sur le moteur cloud → tester les deux.
- **Cohérence portabilité** : les appels réseau DOIVENT être en MCP (pas dans les scripts de skill) pour que cloud + local se comportent pareil.
- **« Lister TOUS les concurrents »** jamais garanti → sources visibles + expansion itérative + dédup.

## 9. Questions ouvertes (à trancher avant/pendant le plan)

1. Moteur cloud récurrent : Managed Agents (zéro infra) vs Agent SDK conteneur (réseau complet) — trancher en Phase C.
2. `refletArtifacts` : on le garde comme projection de `.reflet` pour l'UI, ou l'UI lit le repo directement via l'app GitHub ?
3. Forme exacte du prompt d'init (1 commande orchestratrice vs quelques `/reflet-*`).
4. Repo séparé pour l'autopilot, ou rester dans le monorepo Reflet ?
