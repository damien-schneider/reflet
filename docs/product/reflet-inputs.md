# Reflet — nouvelles entrées d'intentions (spec à approuver)

Statut : **proposition, aucun code écrit.** Ce document doit être approuvé (section 9) avant toute implémentation.

## 1. Pourquoi

Reflet devient le lieu où vivent les intentions produit. Aujourd'hui elles naissent d'une seule façon : une personne de l'équipe enregistre une session vocale (devtools ou application) et l'IA propose des intentions.

Deux situations restent sans entrée :

- **Le replay PostHog.** Un utilisateur réel bute sur le checkout : rage clicks sur « Payer », retour au panier, abandon. Le replay existe dans PostHog, personne ne l'a commenté. Aujourd'hui l'équipe le regarde, puis réécrit à la main ce qu'elle a compris. Avec l'import : on choisit l'enregistrement dans Reflet, l'IA propose « Voir le total avant de payer » comme **hypothèse** avec les moments qui la fondent, et l'équipe la confirme ou l'écarte comme toute autre intention.
- **La capture annotée.** Une designer entoure trois zones sur une capture CleanShot avec « trop petit », « on ne comprend pas ce chiffre », une flèche vers un bouton. Aujourd'hui cela finit en feedback brut. Avec l'import : chaque annotation devient une intention proposée, pointée sur sa zone, prête pour le brief.

Ce qui ne change pas : une intention reste une `sessionProposal`. Revue, confirmation, brief pour l'agent, « Add to board », continuation et vérification fonctionnent sans changement sur les nouvelles sources. Les notes devtools restent une entrée séparée (décision prise : deux entrées, mêmes sorties).

## 2. Modèle commun : une source = une session

Chaque import crée une session, pour réutiliser tout le pipeline existant (`sessions/ai/analysis_run.ts`, `analysis_apply.applyAnalysis`, review SDK, `sessionHandoffs`, `materialize`).

Changements de schéma (`packages/backend/convex/sessions/tableFields.ts`) :

| Champ | Valeur | Raison |
|---|---|---|
| `sessions.origin` | `v.optional(v.union("voice", "posthog", "screenshot"))`, absent = `voice` | Distinguer la source sans migrer l'existant |
| `sessions.surface` | ajout de `"dashboard"` | Les imports se font depuis l'application web, ni devtools ni app |
| `sessions.posthog` | `v.optional({ recordingId, projectId, host, distinctIdHash, startedAt, durationMs })` | Dédoublonnage et lien retour |
| `sessionEvidence.annotations` | `v.optional(screenshotAnnotationValidator[])` (réutilisé de `feedback/tableFields.ts`) | Garder les annotations d'une capture importée |
| Index | `sessions.by_org_posthog_recording` sur `(organizationId, posthog.recordingId)` | Réimporter le même replay ouvre la session existante |

Le SDK (`packages/sdk/src/sessions/protocol.ts`) reçoit `origin` en optionnel, comme `image` pour l'identité : un ancien backend ne l'envoie pas. La revue affiche une puce de source : « Voice », « Replay », « Screenshot ».

## 3. Import PostHog

### 3.1 Connexion

- Une connexion par organisation, gérée par un admin.
- Saisie : hôte (`us.posthog.com`, `eu.posthog.com`, ou URL auto-hébergée), identifiant de projet, **personal API key** avec les seuls scopes `session_recording:read` et `query:read`.
- Validation à l'enregistrement : `GET {host}/api/projects/{projectId}/` doit répondre 200, sinon message précis (clé invalide, scope manquant, projet introuvable).
- Stockage : **il n'existe aucun helper de chiffrement dans le backend** (vérifié : rien pour encrypt/cipher/`ENCRYPTION_KEY` dans `packages/backend/convex`). GitHub n'en a pas besoin, ses jetons sont signés à la volée depuis des variables d'environnement. Il faut donc ajouter un chiffrement AES-256-GCM dans une action Node, avec la clé en variable d'environnement `INTEGRATION_SECRETS_KEY`. La clé PostHog n'est jamais renvoyée au client ; seuls ses 4 derniers caractères sont affichés.

Table `posthogConnections` (nouveau dossier `integrations/posthog/`) :

```
organizationId, host, projectId,
encryptedApiKey, keyHint,
status: "active" | "invalid",
lastError?, lastCheckedAt, connectedBy, connectedAt
```

Page de réglages : `apps/web/app/(app)/dashboard/[orgSlug]/project/posthog/page.tsx`, à côté de `project/github`, avec son libellé dans `routeLabels`. Actions : « Connect », « Test connection », « Disconnect ».

### 3.2 Choisir un enregistrement

Action Convex `integrations/posthog/recordings.list({ offset, filters })` → `GET {host}/api/projects/{projectId}/session_recordings?limit=20&offset=…`.

Colonnes affichées : date, durée (`recording_duration`), URL de départ (`start_url`), clics (`click_count`), erreurs console (`console_error_count`), personne (libellé PostHog, jamais stocké tel quel). Filtres v1 : durée minimale, « avec erreurs ». Un enregistrement déjà importé affiche « Imported » et ouvre sa session.

### 3.3 Importer les événements

Action `sessions/imports/posthog.importRecording({ recordingId })` :

1. Refuse si une session existe déjà pour ce `recordingId` : renvoie son id.
2. Requête HogQL : `POST {host}/api/projects/{projectId}/query`

```json
{
  "query": {
    "kind": "HogQLQuery",
    "query": "SELECT timestamp, event, properties.$current_url, properties.$pathname, properties.$event_type, properties.$el_text, elements_chain, properties.$exception_message FROM events WHERE properties.$session_id = {recordingId} ORDER BY timestamp LIMIT 2000",
    "values": { "recordingId": "…" }
  }
}
```

3. Conversion vers `sessionEventBatches` ; temps relatif = `timestamp − début de l'enregistrement` :

| PostHog | Événement Reflet |
|---|---|
| `$pageview` | `navigation` (url, titre absent) |
| `$autocapture` avec `$event_type = click` | `click`, `element.label` depuis `$el_text`, sélecteur reconstruit depuis `elements_chain` (tag, `attr__aria-label`, `attr__id`) au mieux |
| `$rageclick` | `click` + `signal: "rage"` |
| `$dead_click` | `click` + `signal: "dead"` |
| `$exception` | nouvel événement `error` (`message` tronqué à 300 caractères, url) |
| autres | ignorés |

Schéma : `click` reçoit `signal?: "rage" | "dead"`, et `sessionEventValidator` gagne le genre `error`. Pas de capture d'écran : chaque signal crée une preuve `link` vers `{host}/project/{projectId}/replay/{recordingId}?t={secondes}`, libellée « Rage click on “Pay” at 01:12 ».

4. Création de la session (`origin: "posthog"`, `surface: "dashboard"`, `visibility: "team"`, titre « Replay · {chemin de départ} · {date} »), puis planification de l'analyse.

Limites : 2 000 événements par import ; 40 preuves (déjà `MAX_PROMPT_EVIDENCE`) ; un nouveau rate limit `posthogImportPerOrg` à 30 par heure, à côté de `sessionAnalysisPerUser` dans `shared/rate_limits.ts`.

### 3.4 Analyse sans voix

Nouvelle fonction `prepareBehaviorPrompt` dans `sessions/ai/analysis_prompt.ts`, même schéma de sortie (`analysisOutputSchema`), même modèle (`sessionAnalysisModel` dans `ai/openrouter.ts`, routage ZDR).

Règles du prompt :

- Personne n'a parlé : il n'y a que des comportements. Chaque intention est une **hypothèse** : `certainty` forcée à `"uncertain"` côté serveur, quelle que soit la sortie du modèle.
- `observed` décrit uniquement ce qui s'est passé (« 4 clics rapides sur “Pay”, puis retour au panier ») ; `need` formule le besoin probable ; `unknowns` dit ce qu'il faudrait vérifier auprès d'utilisateurs.
- Chaque intention cite au moins un événement (alias `A1…`) ; une intention sans événement cité est rejetée.
- Au plus 6 intentions par replay. Une navigation ordinaire sans signal ne produit rien : « aucune intention » est une réponse valide.

La revue affiche pour ces sessions l'onglet « Events » à la place de « Transcript » ; les cartes montrent la puce « Hypothesis ».

### 3.5 Hors v1

- Images tirées du replay (rendu rrweb en tâche serveur) : phase 2, après mesure de l'utilité des hypothèses sans image.
- Import automatique (« tous les replays avec rage click ») : phase 2, demande une politique de coût.
- Requêtes PostHog depuis le SDK : jamais ; la clé ne quitte pas le backend.

## 4. Capture annotée → intentions

### 4.1 Entrées

1. **Dashboard** : déposer ou coller une image (png/jpeg/webp, 2,5 Mo max, déjà `SESSION_LIMITS.maxImageBytes`), l'annoter avec l'annotateur existant du widget (`feedback/ui/annotator.tsx` et `ui/annotation/*`), ajouter un commentaire facultatif.
2. **Feedback existant** : action « Extract intentions » sur un feedback qui a une capture annotée (`feedbackScreenshots` avec `annotations`). Aucune nouvelle saisie.

### 4.2 Création

Action `sessions/imports/screenshot.importScreenshot({ storageId, annotatedStorageId, annotations, comment?, pageUrl?, feedbackId? })` :

- Session `origin: "screenshot"`, une preuve `screenshot` avec `annotations`, le commentaire en segment `source: "typed"`.
- Les flous (`blur`) sont déjà pixellisés par `renderAnnotatedImage` : **seule l'image rendue part au modèle**, jamais l'image brute, pour que rien de masqué ne fuie.

### 4.3 Vision

`ai/structured_output.ts` n'accepte qu'un `prompt` texte. Il faut l'étendre pour accepter des messages avec des parties image (`{ type: "image", image: Uint8Array, mediaType }` du SDK `ai`), sans changer les appelants existants.

Prompt `prepareScreenshotPrompt` :

- L'image rendue, avec chaque annotation numérotée (`#1`, `#2`…) ; le rendu dessine le numéro, le texte liste chaque annotation (outil, rectangle en pixels, texte saisi).
- Une intention par annotation ou groupe d'annotations ; chaque intention cite ses numéros.
- `calloutTarget` est rempli directement depuis le rectangle de l'annotation : pas besoin du localisateur `locate/run.ts`.
- `certainty` : `"clear"` si l'annotation porte un texte explicite, sinon `"uncertain"`.

Coût : image redimensionnée à 1 568 px de côté maximum avant envoi ; une image par appel ; rate limit `screenshotAnalysisPerUser` à 20 par heure.

## 5. La maison des intentions (web)

Les intentions ne sont aujourd'hui visibles que dans les devtools. Pour qu'un import depuis le dashboard serve à quelque chose, il faut une page `dashboard/[orgSlug]/intentions` :

- Liste de toutes les intentions de l'organisation visibles par la personne, toutes sources confondues : besoin, puce de source, décision, « On the board », « In a brief ».
- Filtres : source, décision, sur le tableau ou non.
- Menu « Import » : « From a PostHog replay », « From a screenshot ».
- Ouvrir une intention mène à sa session en revue.

Point ouvert majeur (section 8, question 1) : la revue existe seulement dans le SDK, rendue dans un shadow DOM avec ses propres styles.

## 6. Confidentialité

- PostHog : on ne stocke ni email ni propriétés de personne, seulement un hash du `distinct_id`. `$el_text` vient de l'autocapture, qui n'enregistre pas les valeurs de champs ; il est tronqué à 80 caractères.
- Les sessions importées suivent la suppression existante (`deletedAt`, `by_deleted_at`) ; supprimer la connexion PostHog ne supprime pas les sessions déjà importées, mais rend leurs liens de replay inaccessibles sans accès PostHog.
- Tous les appels modèle passent par OpenRouter avec `zdr: true`, comme l'analyse et la transcription des sessions. Seule la détection des voix d'une session à plusieurs passe par Mistral, hors OpenRouter et sans ZDR (voir `reflet-sessions-lot0.md`).

## 7. Critères d'acceptation

- [ ] Un admin connecte PostHog EU avec une clé limitée à `session_recording:read` + `query:read` ; une clé sans `query:read` affiche « This key can't run queries: add the query:read scope ».
- [ ] La clé n'apparaît dans aucune réponse Convex ni aucun log.
- [ ] Importer deux fois le même replay ouvre la même session.
- [ ] Un replay avec rage clicks produit au moins une intention « Hypothesis » qui cite l'événement, avec un lien qui ouvre PostHog au bon instant.
- [ ] Un replay sans signal produit « No intentions found » sans erreur.
- [ ] Une capture avec 3 annotations textuelles produit 3 intentions pointées sur leurs zones ; une zone floutée n'apparaît pas dans l'image envoyée.
- [ ] Les intentions importées passent par Confirm, Prepare brief, Add to board sans code spécifique à leur source.
- [ ] Rate limits atteints : message clair, aucune session à moitié créée.

## 8. Questions ouvertes

1. **Revue côté web.** Trois options :
   - réutiliser les composants SDK dans le dashboard (rapide, styles devtools dans l'app) ;
   - réécrire la revue en composants web (cohérent, coûteux) ;
   - commencer par une liste web, la revue complète restant dans les devtools.

   Recommandation : la troisième pour la v1, en mesurant si l'équipe revoit vraiment depuis le web.
2. **Clé de chiffrement.** `INTEGRATION_SECRETS_KEY` en variable d'environnement Convex, avec rotation manuelle. Acceptable, ou faut-il un service de secrets ?
3. **Clé PostHog par organisation ou par personne.** Par organisation est plus simple, mais tout membre importe avec les droits de l'admin qui a connecté. Par personne respecte les droits PostHog de chacun.
4. **Visibilité par défaut.** `team` pour un replay (aucune personne de l'équipe n'y parle), `private` pour une capture ?
5. **Contradiction avec `reflet-sessions.md`.** La section 9 (« Aucun replay ou moteur d'analytics Reflet à construire ») et la section 11 (« Les intégrations PostHog/agents restent hors périmètre ») excluent ce travail. Cette spec ne construit ni replay ni analytics : elle lit des événements PostHog. Les deux passages seront mis à jour si la spec est approuvée.

## 9. Approbation

- [ ] Modèle « une source = une session » et champs de la section 2
- [ ] Connexion PostHog et chiffrement (3.1, question 2)
- [ ] Correspondance des événements et plafonds (3.3)
- [ ] Hypothèses forcées pour l'analyse sans voix (3.4)
- [ ] Vision : image rendue uniquement, une image par appel (4.3)
- [ ] Choix de la revue web (question 1)
- [ ] Ordre de livraison : capture annotée d'abord (moins de dépendances : pas de secret externe), puis PostHog
