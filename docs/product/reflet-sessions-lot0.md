# Reflet Sessions — décisions du lot 0

Ce document fige les choix techniques pris avant de construire les sessions, avec les mesures qui les justifient. Il complète `reflet-sessions.md`.

## Transcription

Fournisseur retenu : **OpenRouter, modèle `openai/whisper-large-v3`, routage `provider.zdr: true`** (zero data retention).

Pourquoi :

- La clé `OPENROUTER_API_KEY` existe déjà sur les déploiements Reflet : aucun nouveau contrat ni sous-traitant à ajouter.
- Le routage ZDR garantit que le fournisseur n'entraîne rien sur l'audio et ne le conserve pas.
- Facturation à la seconde, environ 0,00045 $ par minute d'audio.

Mesures (appels réels, WAV 16 kHz mono 16 bits) :

| Échantillon | Latence | Durée facturée | Résultat |
|---|---|---|---|
| Français, 5 s | 1,29 s | 5,07 s | « Il faudrait un historique. En fait, je veux surtout savoir si c'est enregistré. » |
| Anglais, 5 s | 1,43 s | 5 s | exact |
| Bruit seul, 3 s | < 1 s | 3 s | texte vide |

Écartés :

- `whisper-large-v3-turbo` : plus rapide (0,45 s) mais facture 10 s minimum par morceau, soit plus du double pour des phrases courtes.
- `gpt-4o-mini-transcribe` : aucun point d'accès ZDR disponible.

Le découpage de la parole se fait dans le navigateur : les horodatages ne dépendent donc pas du fournisseur, et on peut en changer sans toucher au reste.

## Analyse

Modèle : `anthropic/claude-sonnet-4.5` via OpenRouter, routage ZDR (servi par Amazon Bedrock). `claude-haiku-4.5` et `gemini-2.5-flash` sont aussi disponibles en ZDR si le coût devient un sujet.

## Limites

Les limites vivent côté serveur et sont renvoyées au client avec l'identité ; le client n'en code aucune en dur.

| Limite | Valeur |
|---|---|
| Durée maximale d'une session | 30 min (avertissement 5 min avant) |
| Morceau de parole | 30 s, 1,1 Mo |
| Morceaux par session | 400 |
| Événements par session | 5 000 (200 par envoi) |
| Captures par session | 60, 2,5 Mo chacune |
| Intervalle minimal entre captures automatiques | 10 s |
| Tampon local avant envoi | 60 Mo |
| Conservation de l'audio | 24 h, supprimé dès la transcription |

## Suppression

- Supprimer une session la marque supprimée et efface dans la même transaction ses morceaux, événements, captures, propositions, briefs et fichiers.
- Un traitement en retard (transcription, analyse, reformulation) qui arrive après la suppression ne fait rien.
- Les marques de suppression sont purgées après 30 jours.
- Les sessions abandonnées (onglet fermé, crash) sont terminées automatiquement au-delà de la durée maximale plus 30 minutes.
- Les briefs déjà copiés ou exportés ne peuvent pas être rappelés ; l'interface le dit avant de supprimer.

## Mesures sur une session longue

Session de 10 min enregistrée dans l'onglet Sessions des devtools, sur le tableau de bord de Reflet (page Clés d'API, ~7 000 nœuds DOM), Chromium headless, micro simulé (tonalité continue), backend de dev réel. Toutes les 3,5 s : déplacement de souris et défilement ; un clic toutes les 17 s ; une marque toutes les 70 s.

| Mesure | Valeur |
|---|---|
| Tas JS | 41–43 Mo du début à la fin, pas de croissance |
| Nœuds DOM | 7 027 stables (la barre d'enregistrement n'en ajoute pas au fil du temps) |
| Temps du thread principal | 3,4 % de la durée, page du tableau de bord comprise |
| Morceaux de parole | 20 (un par 30 s) |
| Captures | 10 (début + 9 marques) |
| Envois d'événements | 116 requêtes, 81 Ko au total |
| Métadonnées (morceaux, captures, URL d'envoi) | 61 requêtes, < 10 Ko |
| Envois vers le stockage | 30 fichiers (20 audios, 10 captures) |

Le harnais ne voit pas la taille des corps binaires envoyés au stockage. Pour l'audio, le format la borne : WAV 16 kHz mono 16 bits, soit au plus 0,96 Mo par morceau de 30 s et ~19 Mo pour 10 min de parole continue, sous la limite de 1,1 Mo par morceau.

Navigateurs vérifiés par la suite E2E simulée (`apps/web/e2e/sdk-sessions.e2e.ts`) : Chromium, Firefox, WebKit. Bout en bout réel sur le backend de dev (transcription, analyse, brief, connexion des outils d'équipe par popup) : Chromium.

WebKit refuse les `Blob` dans IndexedDB : l'audio et les captures y sont stockés en octets (`ArrayBuffer` + type).
