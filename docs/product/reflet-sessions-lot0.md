# Reflet Sessions — décisions du lot 0

Ce document fige les choix techniques pris avant de construire les sessions, avec les mesures qui les justifient. Il complète `reflet-sessions.md`.

## Transcription

Fournisseur retenu : **ElevenLabs Scribe v2 via OpenRouter, routage `provider.zdr: true`** (zero data retention). Modèle : `TRANSCRIPTION_MODEL` dans `convex/ai/models.ts`.

Pourquoi :

- La clé `OPENROUTER_API_KEY` existe déjà sur les déploiements Reflet : aucun nouveau contrat à ajouter.
- Le routage ZDR garantit que le fournisseur n'entraîne rien sur l'audio et ne le conserve pas.
- Facturation à la seconde, sans minimum par morceau : environ 0,0018 $ par minute d'audio.
- Les termes anglais dits en français (« border radius », « save bar », « preview ») sont ceux sur lesquels les autres modèles se trompent.

Mesures du 18/10/2026 (appels réels, WAV 16 kHz mono, voix de synthèse française ; 6 termes tech à reconnaître) :

| Modèle (ZDR) | Termes justes | Latence | Prix / heure |
|---|---|---|---|
| ElevenLabs Scribe v2 | 5/6 | 0,5–0,8 s | 0,11 $ |
| Deepgram Nova-3 (`language: multi`) | 4/6 | 0,8–1,4 s | 0,31 $ |
| Whisper large v3 | 1/6 (« bord des radios », « Refinade ») | 0,6–4,9 s | 0,027 $ |
| Whisper large v3 turbo, Qwen3 ASR 1.7B, Parakeet v3 | 1/6 | 0,3–1,6 s | 0,012–0,09 $ |

Sans ZDR sur OpenRouter au 18/10, donc écartés : `gpt-4o-transcribe`, `gpt-4o-mini-transcribe`, `gemini-3.5-transcribe`, Grok STT. Voxtral figurait dans cette liste ; Voxtral 3 est depuis disponible en ZDR sur OpenRouter, mais sans diarisation ni liste de termes (voir « Détection des voix »).

Scribe ne renvoie pas de probabilité de silence et marque les événements sonores entre crochets (« [pause] ») : ces étiquettes sont retirées, et un passage qui n'en contient que devient vide.

Le découpage de la parole se fait dans le navigateur : les horodatages ne dépendent donc pas du fournisseur, et on peut en changer sans toucher au reste.

## Détection des voix

Décision du 23/10/2026 : **le texte reste sur Scribe ; qui parle quand vient de Mistral, `voxtral-mini-transcribe-realtime-3` avec `diarize`, en direct depuis le navigateur**, seulement quand la personne qui démarre la session coche « Several people are talking ».

Voxtral 3 évalué avant ce choix :

- Mini et Small en lot : sans liste de termes, Scribe est plus juste ; avec la liste, le texte est parfait. Sur OpenRouter, Voxtral 3 a le ZDR mais ni diarisation ni liste de termes.
- Temps réel (`voxtral-mini-transcribe-realtime-3`) : libellés stables, 10 tours sur 10 attribués à la bonne voix sur un extrait à 3 voix de synthèse. Des noms sont possibles en fournissant des extraits de référence de chaque voix. Le texte est moins bon que Scribe (20 % d'erreurs sur le même extrait) : il n'est pas utilisé.

Fonctionnement :

- Une connexion WebSocket par tranche de collecte (entre deux pauses), qui reçoit le même audio 16 kHz que le découpage de la parole. Les événements de Mistral, sans horodatage, sont convertis en tours de parole sur l'horloge de session et envoyés à Reflet.
- Le navigateur se connecte avec un jeton `rt_…` de 120 s émis par Convex avec la clé serveur. Le jeton n'a besoin d'être valide qu'à la connexion : une connexion de 17 min lui a survécu.
- Les locuteurs sont attribués à la lecture, mot par mot, à partir des instants de mots renvoyés par Scribe ; un même libellé reste la même personne pendant toute la session.
- Après une pause, la nouvelle connexion reçoit 3 à 6 s de chaque voix déjà entendue (`speaker_references`) pour reprendre les mêmes libellés. Les extraits sont pris dans la partie de chaque tour qui tombe dans un passage, et plusieurs tours d'une même voix sont joints : dans une vraie réunion, un tour long déborde souvent sur plusieurs passages. Un passage n'est découpé qu'une fois que Mistral a entendu 1 s au-delà de sa fin (ou à la pause, après ses derniers mots), pour que les derniers mots de chaque tour comptent. Ces extraits sont gardés dans le brouillon local (IndexedDB) : effacés avec lui une fois la session synchronisée, et retirés d'un brouillon inactif depuis plus longtemps que la conservation de l'audio (24 h) au passage de synchronisation suivant. Après un rechargement de la page, la reprise du brouillon garde aussi les libellés.
- Vérifié dans le navigateur : sur une discussion produit à 3 voix de synthèse, 18 tours sur 18 gardent leur libellé à travers une pause ; sur un extrait de vraie réunion (AMI ES2002a), la personne qui parlait le plus garde son libellé à travers une pause puis un rechargement. Une voix entendue moins de 3 s au total avant la pause (le minimum de Mistral pour un extrait) revient sous un nouveau libellé.
- Les tours sont envoyés avant chaque passage, puis 2,5 s après, le temps que Mistral ait rendu les derniers mots du passage : le suivi en direct reçoit ainsi le bon locuteur jusqu'à la fin du passage.
- Précision : l'horloge des tours est juste à ±0,25 s (jusqu'à 0,4 s au premier changement de voix après une connexion, le temps que le retard d'envoi se résorbe). Un ou deux mots à la frontière entre deux voix peuvent donc être attribués à la mauvaise.

Coût : 0,008 $ par minute, seulement quand la case est cochée, soit environ 0,70 $ par heure de session au total contre 0,22 $ sans.

Rétention : Mistral conserve les entrées de l'API jusqu'à 30 jours et ne s'en sert pas pour entraîner. Le ZDR n'a pas été demandé : choix produit, annoncé dans la liste « What a session records » et la documentation. L'audio reste supprimé par Reflet dès la transcription, 24 h au plus.

## Analyse

Modèle : `sessionAnalysisModel` dans `convex/ai/openrouter.ts` (routage ZDR).

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
