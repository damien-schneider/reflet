# Reflet Sessions — spécification de développement

Date : 12 octobre 2026. Statut : cadrage prêt pour démarrer le lot 0 et le socle du lot 1 ; fonctionnalité non implémentée. Le choix de transcription et les mesures de capture du lot 0 conditionnent l'intégration réelle de la voix et la disponibilité publique.

Ce fichier est la référence du premier développement. La galerie des 17 propositions illustre la vision générale ; elle n'est ni le backlog de ce lot ni une spécification exhaustive de Sessions. Une copie datée de ce document accompagne son export.

## 1. Le cas à réussir

Un créateur utilise son application, ouvre Reflet et commence une session. Il parle pendant qu'il navigue et montre des éléments. Reflet relie ses paroles au contexte réellement capturé. À la fin, il revoit quelques propositions, précise celles qui sont ambiguës et choisit celles à transmettre à son agent de développement.

Amélioration attendue : transmettre une intention compréhensible, avec ses preuves, sans rédiger des tickets ni réexpliquer la session.

Exemple de référence :

1. Dans Ostal, le créateur pointe un formulaire : « Il faudrait un historique. »
2. Il modifie une valeur, clique sur Enregistrer, puis précise : « En fait, je veux surtout savoir si c'est enregistré. »
3. Reflet propose un besoin : être certain que les modifications sont enregistrées. L'historique reste une piste évoquée puis mise de côté.
4. Reflet distingue l'observation de l'utilisateur de ce qui est prouvé : il ne prétend pas que la sauvegarde a échoué.
5. Le créateur corrige si nécessaire et confie une demande explicite à son agent.

Deux tickets indépendants créés automatiquement dans cet exemple constituent un échec.

## 2. Périmètre du premier développement

| Inclus | Plus tard |
| --- | --- |
| Session individuelle, réservée à un membre Reflet | Réunions à plusieurs et identification des intervenants |
| Première livraison dans les devtools web | Accès équipe intégré dans l'application en production |
| Voix, transcript horodaté, contexte d'interaction et captures ciblées | Enregistrement vidéo, capture d'autres applications |
| Revue dans un panneau reprenant les composants et le thème actuels | Nouvelle navigation « Intelligence » ou refonte visuelle |
| Clarification qui fait évoluer une proposition existante | Conversation vocale continue avec une IA qui intervient en direct |
| Transmission manuelle d'un brief complet à Codex, Claude ou Factory | Lancement automatique et nouveau moteur d'exécution |
| Source de code facultative quand les devtools la possèdent déjà | Indexation de la codebase par Reflet |
| Champs permettant de rattacher une preuve externe | Nouveau recorder de replay, analytics ou connecteur PostHog complet |

La première livraison dans les devtools valide la boucle avant l'authentification intégrable en production. Elle ne doit pas être présentée comme disponible dans toutes les applications ou sur mobile. Le même domaine de sessions doit pouvoir être appelé depuis une autre surface sans dépendre des routes de lecture du code.

## 3. Parcours et interface

### Commencer

- Point d'entrée « Commencer une session » dans les devtools, proche des notes existantes.
- Connexion Reflet et organisation actives visibles avant la capture. Une session appartient à un seul auteur et une seule organisation.
- Au premier usage, expliquer les données réellement collectées et le traitement cloud de la voix. Ne pas demander une permission de partage d'écran pour la capture DOM.
- Demander le microphone sur action explicite. Tant qu'il n'est pas accordé, aucune session ne doit sembler enregistrer.
- Si le microphone est refusé ou indisponible, proposer de réessayer ou de prendre une note par le parcours existant.
- Aucun onboarding fournisseur, API key ni accès au dépôt exigé de l'utilisateur pour commencer une session configurée par Reflet.

### Pendant la session

- Barre discrète : durée écoulée, « Marquer ce moment », « Mettre en pause », « Terminer ». Pas de panneau de tickets qui s'ouvre pendant la réflexion.
- Les clics et la navigation de l'application continuent normalement ; le curseur n'est pas capturé par une couche qui bloque les interactions.
- « Marquer ce moment » rattache explicitement une capture et le contexte courant à cet instant. La sélection explicite d'un élément reste disponible pour lever une ambiguïté.
- La pause interrompt la collecte du microphone et du contexte. Elle n'est pas un simple changement d'icône. La reprise est explicite et la lacune reste identifiable.
- Le traitement peut avancer en arrière-plan, mais l'IA n'interrompt pas la session dans cette version.
- « Terminer » coupe les pistes et les écouteurs avant de lancer la revue. L'utilisateur peut consulter ce qui est disponible pendant la fin du traitement.

### Revoir

- Montrer les propositions courtes d'abord ; le transcript et les preuves s'ouvrent à la demande.
- Chaque proposition contient : besoin, situation observée, réponse envisagée si exprimée, inconnues, passages sources et captures disponibles.
- Actions : « Garder », « Modifier », « Plus tard », « Écarter ». Prévoir annulation pour une décision de revue.
- Une précision textuelle fait évoluer la proposition concernée. Une nouvelle contribution vocale réutilise le même parcours de capture après la première boucle fonctionnelle.
- L'IA suggère une fusion ; elle ne fusionne pas silencieusement des propositions déjà revues.
- Une correction du transcript marque les propositions qui en dépendent comme à réexaminer. Une analyse plus ancienne ne remplace jamais une correction humaine plus récente.
- « Garder » conserve une décision dans la session ; cela ne publie pas un feedback et ne permet pas à un agent de le prendre.
- S'il n'y a aucune proposition utile, montrer le transcript et permettre d'en créer une manuellement. Un échec d'analyse n'est pas un résultat vide.

### Confier

- Sélectionner les propositions, puis ouvrir le brief exact à transmettre.
- Le brief inclut le résultat voulu, les observations, les incertitudes, les propositions retenues avec leur révision et uniquement les preuves choisies.
- « Copier le brief » ou exporter son fichier est le premier passage vers un agent. Afficher « Brief copié » ou « Brief exporté », jamais « Agent lancé » sans accusé de réception réel.
- Le brief doit être compréhensible sans accès au chat de conception ni à une URL locale. Une preuve locale nécessaire est jointe à l'export ; un lien privé externe indique son prérequis d'accès.
- Si un utilisateur demande de créer les feedbacks correspondants, l'action doit être explicite et idempotente. Ils restent internes, avec leur lien vers la session et la proposition.
- L'intégration ultérieure à la file d'agents doit vérifier une autorisation dédiée et son périmètre. Une publication approuvée ou un feedback interne ne suffit pas.
- Un changement de besoin après transmission produit une nouvelle révision ; il ne modifie pas silencieusement le mandat déjà exporté ou autorisé.

## 4. Capture et synchronisation

La preuve minimale est une trace horodatée, pas une vidéo intégrale ni une interprétation IA seule.

| Source | Données utiles | Limite à montrer |
| --- | --- | --- |
| Parole | Segments de transcript, début/fin, corrections | Pas de lecteur audio après suppression |
| Page | URL nettoyée, titre, dimensions du viewport, scroll, échelle | Changement de page ou interruption de collecte |
| Pointeur | Coordonnées dans le viewport, instant, élément ciblé | Survol = indice, pas preuve d'intention |
| Élément | Rôle, libellé nettoyé, sélecteur, rectangle | Sélecteur non garanti stable entre versions |
| Action | Clic, navigation, défilement, marque explicite | Une action ne prouve pas son résultat serveur |
| Capture | Image masquée, instant et repère d'élément | Capture absente ou partielle signalée |

Tous les événements et les segments utilisent une origine temporelle de session commune. Le traitement différé ne doit pas changer les instants. Chaque contexte contient son système de coordonnées : des x/y seuls ne suffisent pas après un scroll ou un redimensionnement.

L'association d'une phrase à un élément tient compte des secondes précédentes et suivantes dans la session active. En cas de doute, conserver plusieurs candidats ou demander une précision pendant la revue. Ne jamais remplacer un contexte manquant par l'écran courant.

Décisions pour démarrer l'implémentation :

- Capturer le contexte structuré pendant la session uniquement. Échantillonner les déplacements ; conserver les clics et marques explicites.
- Réutiliser la capture DOM existante. Déclencher une capture initiale, sur marque explicite et sur changements de contexte utiles ; regrouper les captures automatiques rapprochées.
- Ne pas envoyer chaque mouvement de souris à un modèle. Faire l'extraction des propositions à la fin, sur un contexte sélectionné et borné.
- Ne pas stocker le DOM complet, les frappes, les valeurs des champs, les mots de passe, le presse-papiers ou des logs réseau dans ce lot.
- Un iframe tiers, un canvas ou une animation peuvent rester mal représentés : montrer cette limite, permettre une note explicite et ne pas inventer la preuve.
- Une navigation SPA reste dans la session. Un rechargement complet ou une fermeture termine la collecte ; proposer la reprise du brouillon durable au retour, sans réactiver le microphone automatiquement.
- Un onglet masqué met la collecte en pause ; aucun enregistrement d'autres onglets ou applications.

Le lot 0 fixe les limites numériques (durée, octets, événements et captures) à partir de mesures. Elles sont centralisées et contrôlées côté serveur aussi. À l'approche de la limite, prévenir ; à la limite, arrêter proprement la collecte concernée et garder les données déjà acquittées. Pas de collecte ni de facture non bornées.

## 5. Confidentialité et droits

- « Brouillon privé » signifie accessible à l'auteur, avec traitement technique par Reflet et ses prestataires annoncés. Cela ne signifie pas traitement exclusivement local.
- Partager avec l'équipe est une action explicite. L'appartenance à l'organisation seule ne rend pas tous les brouillons lisibles à tous ses membres.
- Masquer les zones sensibles configurées avant toute capture ou transmission. Le produit ne promet pas de reconnaître automatiquement toutes les données personnelles.
- Le prestataire de transcription et ses règles de rétention doivent correspondre à la promesse affichée. Le choix est un livrable du lot 0 ; aucune promesse de suppression immédiate chez un tiers n'est présumée.
- Supprimer l'audio brut après sauvegarde durable du transcript correspondant. Une simple réponse du prestataire sans sauvegarde n'est pas suffisante.
- Pour le pilote, plafond proposé de récupération audio : 24 heures à partir de la capture, retries inclus. Le lot 0 vérifie qu'il est réalisable de bout en bout ; sinon choisir un autre mode ou corriger explicitement la promesse avant livraison.
- Les captures, transcripts et propositions restent corrigeables et supprimables. Les extraits dérivés concernés doivent être effacés ou régénérés sans le contenu supprimé.
- Une suppression de session annule les traitements en attente et empêche un job tardif de recréer son contenu. Les exports déjà téléchargés ou envoyés à un autre outil ne peuvent pas être rappelés ; l'interface doit le dire au moment utile.
- Les logs techniques ne contiennent ni audio, ni transcript, ni contenu de captures. Les métriques de coût et de qualité utilisent des compteurs sans contenu.
- Aucun secret d'administration dans le widget. L'accès équipe en production nécessite son propre parcours d'authentification et des vérifications serveur ; il ne réutilise pas aveuglément un token de développement.

## 6. Domaine et invariants

Noms conceptuels, à raccorder aux conventions du dépôt avant de créer des tables :

| Objet | Responsabilité |
| --- | --- |
| Session | Auteur, organisation, visibilité, état de collecte, limites et origine temporelle |
| Segment | Contribution transcrite ou saisie, instants, révision, état de traitement |
| Preuve | Contexte ou capture, provenance, instant, disponibilité et droits |
| Proposition | Besoin, observations, hypothèses, sources, révision et décision humaine |
| Transmission | Sélection et révisions exactes, brief, destination, état réel de remise |

Séparer collecte, traitement, revue et remise : une session terminée peut encore avoir un segment en traitement. Une proposition gardée peut n'avoir jamais été transmise. Ne pas créer un statut unique qui confond ces états.

Invariants à tester avant les interfaces :

1. Toutes les lectures, écritures et pièces jointes appliquent l'organisation et les droits de la session, y compris par identifiant direct.
2. Les brouillons de session sont inaccessibles aux listes publiques et aux outils d'agents. Ne pas les encoder comme des feedbacks internes déjà éligibles.
3. Upload, transcription, analyse, création de feedback et transmission sont idempotents sur leur opération et révision. Un retry ne crée aucun doublon.
4. Un résultat IA portant sur une ancienne révision ne remplace pas une correction récente. Garder l'état humain comme autorité.
5. Une interruption conserve les données acquittées ; ce qui n'est pas sauvegardé apparaît comme tel. Une erreur n'est jamais affichée comme « Enregistré ».
6. Pause, fin, expiration et suppression ferment les ressources ; reprise explicite seulement.
7. Les données capturées et paroles transcrites sont des sources à analyser, jamais des instructions privilégiées pour l'IA ou l'agent destinataire.
8. Aucun traitement de développement n'est autorisé par le seul fait qu'un besoin soit validé, interne ou publiable.
9. Une suppression est terminale pour les jobs en cours. Un document exporté peut conserver une référence supprimée, mais pas recharger son contenu via une ancienne URL.

## 7. États visibles et reprise

| Situation | Comportement attendu |
| --- | --- |
| Session vide | Invitation à parler ou marquer un moment ; aucune proposition fictive |
| Microphone refusé | Explication locale, réessayer ou note textuelle |
| Traitement en cours | Segments déjà acquis visibles ; état du traitement restant |
| Réseau perdu | Brouillon local borné, distinction local/synchronisé, reprise sans doublons |
| Stockage local indisponible ou plein | Arrêt sûr de la collecte affectée, possibilité de terminer avec les données déjà sauvegardées |
| Transcription échouée | Réessayer avant expiration ou saisir/corriger le texte ; aucune analyse inventée |
| Capture échouée | Transcript utilisable, preuve manquante signalée ; sélection ou note possible |
| Analyse ambiguë | Question ciblée ou proposition explicitement incertaine |
| Analyse échouée | Transcript conservé et action de relance ; ne pas afficher zéro besoin comme un succès |
| Session interrompue | Au retour, proposer de revoir/reprendre le brouillon existant ; microphone arrêté |
| Accès révoqué | Arrêt de la collecte et des transferts ; purge des caches privés du compte concerné, aucune fuite vers le compte suivant |
| Brief exporté | Confirmation de l'export ; pas d'agent actif supposé |

Clavier : démarrage, pause, marque, fin, revue et copie accessibles sans souris. Fermer un panneau rend le focus au contrôle d'ouverture. La sélection d'élément ne doit pas être le seul moyen d'ajouter un contexte. Respecter le mouvement réduit et tester un panneau étroit avec des textes longs.

## 8. Points d'appui vérifiés dans le dépôt

Inspection du 12 octobre 2026 ; comportement déduit du code, sans validation fonctionnelle de Sessions, qui n'existe pas encore.

- `packages/sdk/src/devtools/client/notes/capture-note.ts` : brouillon avec sélection et contexte de page, enrichissement facultatif par le code et une capture.
- `packages/sdk/src/devtools/client/notes/element-snapshot.ts` : capture ciblée autour d'un élément.
- `packages/sdk/src/devtools/client/notes/note-store.ts` : persistance locale des notes et de leurs pièces. Réutiliser les mécanismes pertinents ; ne pas dupliquer silencieusement une vérité entre notes et sessions.
- `packages/sdk/src/feedback/core/element-selector.ts` et `page-context.ts` : sélection, contexte de page et nettoyage existants.
- `packages/sdk/src/feedback/core/capture.ts` : capture DOM existante, sans demande de partage d'écran.
- `packages/sdk/src/devtools/client/notes/agent-prompt.ts` : construction de contexte pour les agents. Le nouveau brief doit préserver les inconnues et fonctionner sans emplacement de source.
- `packages/backend/convex/http/__tests__/devtools_auth.test.ts` : identité membre, notes internes et permissions spécifiques des tokens devtools.
- `packages/backend/convex/feedback/agent_queue.ts` : `pickNext` accepte actuellement `isApproved || isInternal` ; `claimFeedback` vérifie l'organisation et la réservation, sans autorisation de développement distincte. Avant de matérialiser des feedbacks de session, traiter ce couplage sur toutes les entrées, y compris la prise par identifiant.
- `docs/operations/feedback-properties.md` : publication, audience et cycle de vie actuels. La revue d'une proposition ne doit pas les détourner.

Pas de module de transcription identifié dans la recherche ciblée SDK/backend/web. Le lot 0 doit confirmer le point d'intégration et le prestataire au lieu de supposer une capacité disponible.

## 9. Ordre de réalisation

### Lot 0 — vérifier les deux inconnues techniques

- Prototyper une session locale de 10 minutes sur une vraie application : clics, scroll, changement de route, redimensionnement, pause et arrêt.
- Mesurer coût CPU, réactivité, mémoire, volume des événements et captures, qualité du masquage et justesse du rattachement parole/élément.
- Évaluer la transcription français/anglais, les horodatages, latence, coût par minute, rétention et comportement sur échec. Pas d'abonnement payant ni de nouveau contrat à souscrire implicitement.
- Écrire une décision courte dans ce dossier : un prestataire retenu, les limites de collecte, la politique de suppression réellement réalisable et les navigateurs vérifiés.
- Si l'association implicite manque de fiabilité, privilégier les marques et sélections explicites pour le pilote. Ne pas prétendre suivre parfaitement l'intention.

### Lot 1 — une session durable dans les devtools

- Tests d'accès, de pause, d'interruption, de suppression et d'idempotence avant implémentation.
- Domaine de session, stockage borné, collecte structurée et réutilisation des captures existantes.
- Brancher la transcription validée au lot 0, avec segmentation horodatée et suppression de l'audio.
- Session terminable et récupérable, transcript lisible et corrigeable, aucune création de feedback implicite.

### Lot 2 — extraction et revue

- Extraire besoin, observation, hypothèse et solution envisagée avec références aux segments et preuves.
- Réussir l'exemple de l'historique puis de la confirmation de sauvegarde.
- Correction, précision, fusion proposée, report, écart et annulation ; protection des révisions humaines.
- Évaluer les formulations sur des sessions réelles consenties, en plus des tests automatisés.

### Lot 3 — première boucle complète vers l'agent

- Brief prévisualisé puis copiable/exportable avec ses pièces choisies.
- Création facultative de feedbacks retenus seulement après traitement du couplage avec la file d'agents.
- Pour ce premier lot, remise manuelle à l'agent et retour manuel de vérification suffisent. Une copie ne devient pas un signal de prise en charge.
- Refaire le parcours initial après la réalisation et ajouter le résultat au même besoin.

### Suite, après usage répété

Accès équipe en production, adaptation mobile, lien temporel PostHog, clips vidéo choisis, reprise vocale d'une réflexion, clarification interactive et transmission intégrée. Chaque extension doit conserver les mêmes sources, révisions et autorisations.

## 10. Critères de validation du premier lot complet

- [ ] Un membre commence depuis les devtools sans ouvrir un autre outil de prise de notes.
- [ ] L'application reste utilisable pendant la session ; mesure de performance et limites documentées.
- [ ] « Ce bouton-là » après un scroll pointe vers la bonne preuve, ou l'ambiguïté est affichée.
- [ ] La correction « pas un historique, une confirmation » fait évoluer le besoin sans créer deux demandes contradictoires.
- [ ] Le transcript reste corrigeable après suppression de l'audio ; les révisions affectées sont signalées.
- [ ] Une pause ne collecte rien ; un rechargement ne réactive jamais le microphone.
- [ ] Refus de micro, perte réseau, capture manquante, quota et échec IA ont une sortie utile et ne perdent pas les données acquittées.
- [ ] Aucun brouillon ni élément écarté n'est accessible à un autre membre, au public ou à un agent non autorisé.
- [ ] Une même opération rejouée ne duplique ni session, ni segment, ni proposition, ni feedback.
- [ ] Supprimer pendant un traitement ne permet pas au job de recréer les données.
- [ ] « Garder » ne lance pas de développement ; « Copier » ne dit pas qu'un agent travaille.
- [ ] Une personne ou un agent disposant seulement du brief et des pièces comprend le résultat voulu sans réexplication orale.
- [ ] L'interface reprend les composants, couleurs et panneaux actuels de Reflet ; clavier et largeur étroite vérifiés.

Mesures du pilote : nombre de propositions correctement comprises sans reformulation, associations à corriger, idées en double, temps de revue, coût par session et perte de contexte. Le nombre de tickets générés n'est pas un critère de réussite.

## 11. Consigne de démarrage pour l'agent de développement

> Implémente Reflet Sessions à partir de `docs/product/reflet-sessions.md`. Commence par le lot 0 et les tests/invariants du lot 1, puis progresse dans l'ordre des lots 1 à 3. Réutilise les notes, captures, contexte et surfaces des devtools. La première livraison est réservée à l'équipe dans les devtools web. Préserve le parcours sans codebase, les brouillons privés, la suppression audio et la séparation entre revue et autorisation de développement. Ne transforme pas les 17 maquettes de la galerie en périmètre de ce travail. Documente les choix techniques mesurés avant d'intégrer un service externe. Respecte les instructions du dépôt et ses validations, sans commit ni push non demandés.

Les vérifications applicatives à exécuter pendant l'implémentation sont celles d'`AGENTS.md`, avec tests de comportement et E2E headless. Ce document et les aperçus ne constituent pas la preuve que la fonctionnalité fonctionne.
