# Reflet Sessions — état actuel et prochains développements

Mis à jour le 13 octobre 2026. **Prochaine livraison retenue : P1b + P2 + P4 — revoir le contexte, comprendre les intentions et les faire évoluer par de nouvelles sessions assistées par l'IA.** Le socle Sessions et P1 existent ; ne pas les recommencer. P3, l'enrichissement par source maps, reste une suite indépendante.

Référence inspectée : `main`, commit `982f55cf` (SDK 0.6.8). Les changements locaux annoncés en 0.6.9 sont distingués ci-dessous. « Implémenté » signifie présent dans le code inspecté ; cela ne confirme ni la publication npm ni le déploiement de cette révision. Aucun nouveau parcours en production n'a été exécuté pour cette mise à jour documentaire.

Ce fichier reste la référence du développement Sessions. Les sections 3 à 7 décrivent le contrat à préserver ; la section 9 contient le travail restant, dans l'ordre. Les [décisions et mesures du lot 0](reflet-sessions-lot0.md) constituent le relevé technique initial. La galerie des 17 propositions illustre la vision générale ; elle n'est pas le backlog de cette prochaine livraison.

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

## 2. Ce qui est déjà fait

| Capacité | État constaté dans le code |
| --- | --- |
| Enregistrer dans les devtools | Démarrage, microphone, pause, reprise, fin, marque et sélection explicite d'un élément |
| Enregistrer sur une application déployée | Outils d'équipe via `?reflet-team`, connexion Reflet par popup, origine autorisée et clé du widget ; aucun compte utilisateur hôte requis |
| Transcription | Voix découpée et transcrite dans le cloud, segments avec début/fin, correction et reprise sur échec ; audio temporaire |
| Contexte | Horloge commune, clics, survols prolongés, navigation, scroll, viewport, éléments et captures ciblées ; pas de trajectoire continue du curseur |
| Association parole/contexte | Classement temporel des marques, sélections, clics et survols ; plusieurs candidats et ambiguïté signalée |
| Extraction et revue | Besoin, observation, réponse envisagée, inconnues et sources ; garder, modifier, préciser, différer, écarter, fusionner et annuler une décision |
| Révisions | Corrections humaines protégées et propositions à réexaminer après modification du transcript |
| Confidentialité et reprise | Brouillons privés, partage explicite, stockage local borné et synchronisation, suppression de session et nettoyage de l'audio |
| Transmission | Brief prévisualisé, copie, ZIP avec captures choisies, création explicite de feedbacks internes ; aucun lancement d'agent implicite |
| Retour après changement | Vérification manuelle « Works / Needs more work » avec note sur une proposition transmise |
| Preuve externe | Ajout manuel d'un lien ; pas de connecteur PostHog complet |
| Source de code | Indice React facultatif dans les devtools ; le résolveur de source maps plus complet des notes n'est pas encore branché aux sessions |
| Correctifs 0.6.8 | Suppression d'une capture individuelle et annulation de la capture de navigation en attente lors d'une pause |
| Correctifs 0.6.9 | Captures en file ou encore en rendu après pause/fin enregistrées comme manquantes, focus clavier lors du retrait d'une image, durée réelle des survols |
| Moments et associations (0.7.0) | Vue « Show context » d'un passage, contour élément/pointeur seulement si l'instant correspond, correction humaine ou « contexte inconnu » conservée après nouvelle analyse et utilisée par l'analyse et le brief |
| Intentions (0.7.0) | Onglet Intentions, « Confirm » distinct de la réponse envisagée, origine IA/humaine de la formulation, rattachement proposé à une intention existante, suppression d'une intention |
| Continuation (0.7.0) | « Continue this intention », comparaison IA sourcée à la révision de départ, acceptation/refus par changement, question ciblée, lecture de vérification confirmée par une personne, historique des contributions, changements depuis le dernier brief |

L'accès équipe en production existe déjà ; une expérience mobile complète de gestion des retours n'est pas pour autant validée. La capture reste limitée à la page web équipée du SDK. Aucun accès obligatoire au dépôt, aucune vidéo systématique et aucun moteur de développement dans Reflet.

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
- Une précision textuelle fait évoluer la proposition concernée. La continuation vocale et le rapprochement entre plusieurs sessions restent à construire (P4).
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

Règles de collecte à préserver et limites actuelles :

- Capturer le contexte structuré pendant la session uniquement. Les déplacements sont examinés pour détecter les survols prolongés ; cela ne constitue pas un enregistrement continu de leur trajectoire. Conserver les clics et marques explicites.
- Réutiliser la capture DOM existante. Déclencher une capture initiale, sur marque explicite et sur changements de contexte utiles ; regrouper les captures automatiques rapprochées.
- Ne pas envoyer chaque mouvement de souris à un modèle. Faire l'extraction des propositions à la fin, sur un contexte sélectionné et borné.
- Ne pas collecter le DOM complet, les frappes, les valeurs des champs comme événements, le presse-papiers ou les logs réseau. Les captures vident les champs de formulaire standards et masquent les zones configurées, mots de passe et champs de carte ; le reste du texte affiché, y compris un éditeur riche non masqué, peut rester visible. La promesse affichée doit décrire cette limite.
- Un iframe tiers, un canvas ou une animation peuvent rester mal représentés : montrer cette limite, permettre une note explicite et ne pas inventer la preuve.
- Une navigation SPA reste dans la session. Un rechargement complet ou une fermeture termine la collecte ; proposer la reprise du brouillon durable au retour, sans réactiver le microphone automatiquement.
- Un onglet masqué met la collecte en pause ; aucun enregistrement d'autres onglets ou applications.

Les limites numériques ont été fixées au lot 0 et sont centralisées côté serveur dans `sessions/constants.ts`. Le client reçoit ces limites. À l'approche de la limite, prévenir ; à la limite, arrêter proprement la collecte concernée et garder les données déjà acquittées. Pas de collecte ni de facture non bornées.

## 5. Confidentialité et droits

- « Brouillon privé » signifie accessible à l'auteur, avec traitement technique par Reflet et ses prestataires annoncés. Cela ne signifie pas traitement exclusivement local.
- Partager avec l'équipe est une action explicite. L'appartenance à l'organisation seule ne rend pas tous les brouillons lisibles à tous ses membres.
- Masquer les zones sensibles configurées avant toute capture ou transmission. Le produit ne promet pas de reconnaître automatiquement toutes les données personnelles.
- Le prestataire de transcription et ses règles de rétention doivent correspondre à la promesse affichée. Le choix est documenté au lot 0 ; revalider ces conditions avant de changer de fournisseur ou de routage.
- Supprimer l'audio brut après sauvegarde durable du transcript correspondant. Une simple réponse du prestataire sans sauvegarde n'est pas suffisante.
- Le plafond de récupération audio retenu est de 24 heures à partir de la capture, retries inclus ; l'audio est supprimé plus tôt après sauvegarde du transcript. Préserver le nettoyage côté client et serveur lors des prochains développements.
- Les captures, transcripts et propositions restent corrigeables et supprimables. Les extraits dérivés concernés doivent être effacés ou régénérés sans le contenu supprimé.
- Une suppression de session annule les traitements en attente et empêche un job tardif de recréer son contenu. Les exports déjà téléchargés ou envoyés à un autre outil ne peuvent pas être rappelés ; l'interface doit le dire au moment utile.
- Les logs techniques ne contiennent ni audio, ni transcript, ni contenu de captures. Les métriques de coût et de qualité utilisent des compteurs sans contenu.
- Aucun secret d'administration dans le widget. L'accès équipe en production nécessite son propre parcours d'authentification et des vérifications serveur ; il ne réutilise pas aveuglément un token de développement.

## 6. Domaine et invariants

Responsabilités déjà matérialisées dans le domaine `sessions` ; les nouvelles interfaces doivent réutiliser ces objets :

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

## 8. Points d'appui dans le code

Inspection du 13 octobre 2026. Chemins relatifs à la racine du dépôt ; commencer ici avant d'ajouter un nouveau mécanisme.

| À réutiliser | Source |
| --- | --- |
| Horloge et pauses | `packages/sdk/src/sessions/capture/session-clock.ts` |
| Événements, survols et coordonnées | `packages/sdk/src/sessions/capture/page/interaction-recorder.ts` |
| Description des éléments et du viewport | `packages/sdk/src/sessions/capture/element-ref.ts` |
| Captures bornées | `packages/sdk/src/sessions/capture/page/evidence-scheduler.ts` |
| Marques et sélection | `packages/sdk/src/sessions/ui/recording/recording-layer.tsx` et `recording-bar.tsx` |
| Association transcript/contexte | `packages/backend/convex/sessions/linking.ts` |
| Transcript, captures et sources des propositions | `packages/sdk/src/sessions/ui/review/transcript/` et `proposals/` |
| Source maps dans les devtools | `packages/sdk/src/devtools/client/element-source.ts` |
| Indices React actuellement utilisés par Sessions | `packages/sdk/src/feedback/core/react-source.ts` |
| Extraction, clarification et protections de révision | `packages/backend/convex/sessions/ai/` et `review/proposals.ts` |
| Brief et sélection des preuves | `packages/backend/convex/sessions/brief.ts` et `review/handoffs.ts` |
| Accès équipe en production | `packages/sdk/src/sessions/team/` et `packages/backend/convex/team_access/` |
| Barrière vers les agents | `packages/backend/convex/feedback/agent_queue.ts` exclut les feedbacks liés à une proposition de session |

Le transcript est horodaté par segment, pas mot par mot. L'association existante utilise une fenêtre de 6 secondes avant et 2 secondes après le segment, pondère davantage marques/sélections que survols, et signale les candidats proches en score. Ces valeurs décrivent l'implémentation ; les dériver du code, ne pas les recopier en constantes dans une nouvelle vue.

## 9. Prochains développements, dans l'ordre

Les anciens lots 0 à 3 ont produit le socle de la section 2, complété par P1. **P1b, P2 et P4 sont livrés ensemble dans `reflet-sdk` 0.7.0 et le backend associé.** Chaque section ci-dessous indique ce qui est livré et ses limites. P3 n'est ni inclus ni une dépendance de P4. Aucun nouveau module de navigation n'a été ajouté.

**Parcours de validation commun :** je revois « ici, je ne sais pas si c'est enregistré », corrige l'élément associé, confirme l'intention, puis lance « Continuer cette intention ». Après une deuxième session, l'IA me montre ce qu'elle propose d'ajouter ou de changer, avec ses preuves. J'accepte une précision, refuse une solution et exporte un brief qui contient la nouvelle révision du même besoin. La précédente transmission reste identifiable.

**Ordre de travail :**

1. Définir la responsabilité de l'intention durable, de ses révisions et des contributions de session ; réutiliser les objets existants sans dupliquer besoin, décision ou droits. Prévoir P4 avant de figer les contrats de P1b/P2.
2. Livrer les associations corrigibles et la vue synchronisée de P1b dans les surfaces existantes.
3. Brancher la présentation et les actions de P2 sur ces mêmes données.
4. Implémenter la continuation, l'analyse différentielle, la validation et la vérification de P4, puis tester le parcours complet depuis les devtools et les outils d'équipe en production.

### P1 — l'agent comprend ce que « ici » désignait, depuis le brief

**Cas d'usage :** un agent de développement reçoit le brief d'une session. Sous chaque passage cité, il lit ce qui a été cliqué, survolé (et combien de temps), montré, marqué ou ouvert autour de ce moment, sans ouvrir les captures.

**Livré localement :**

- Contexte lié par citation dans le brief : sous chaque `[mm:ss]` cité, les lignes « - » reprennent le même contexte que celui fourni au modèle d'analyse, avec le sélecteur et la source quand elle est connue, et l'alias d'une capture choisie dont les métadonnées d'écran correspondent. Cette correspondance ne garantit pas un état visuel identique. Seules les fenêtres de liaison des passages transmis sont décrites (6 s avant, 2 s après) ; aucun journal complet de la session.
- Un seul format de ligne de contexte (`contextLine` dans `packages/backend/convex/sessions/formatters.ts`) pour le prompt d'analyse et le brief. Le libellé SDK contient déjà le rôle (`button "Enregistrer"`) ; il n'est plus préfixé une deuxième fois.
- Durée réelle des survols : le SDK mesure le temps passé sur l'élément (minimum 700 ms) au lieu d'une durée fixe. Un survol qui couvre le passage s'y rattache même s'il a commencé avant la fenêtre. Un survol en cours lors d'une pause, de la fin ou de la sortie de la fenêtre est émis avec sa durée jusque-là.
- Instant cohérent du survol : heure, pointeur, élément et frame sont relevés au même moment, à l'entrée sur l'élément.
- Clic clavier sans pointeur : un clic déclenché au clavier ou par script enregistre `pointer: null` au lieu d'un faux point (0,0).

**Limite connue :** le nom de composant n'apparaît que si le build conserve des noms lisibles ; en production minifiée, la ligne n'a souvent que le libellé et le sélecteur. Les survols enregistrés par le SDK ≤ 0.6.9 portent tous 700 ms et s'affichent « for 0.7 s ».

**Hors périmètre :** trajectoire continue du curseur, journal intégral de la session dans le brief, changement du contrat de la revue.

### P1b — overlay et correction humaine de l'association

**Cas d'usage :** après avoir parlé en naviguant, je sélectionne un passage et retrouve l'écran, l'élément et les gestes qui l'expliquent.

**Déjà là :** segments horodatés, candidats de contexte, captures, marques, sélection explicite et liens depuis une proposition vers ses citations.

**À construire :**

- Une vue synchronisée dans la revue existante : passage sélectionné, instant, contexte d'interaction, capture associée et proposition concernée. Réutiliser les données disponibles ; ne pas recréer un recorder.
- Sélectionner une citation ou un événement amène au même moment. Parcourir les moments précédents/suivants reste possible au clavier et dans un panneau étroit.
- Afficher le pointeur et le contour de l'élément sur la capture uniquement si leurs repères correspondent. Conserver les dimensions originales pour adapter l'affichage ; ne pas rechercher le sélecteur dans la page actuelle.
- Corriger une association ambiguë en choisissant un autre événement/capture, ou « contexte inconnu ». Conserver l'association humaine lors d'une nouvelle analyse, avec sa révision et sa provenance.
- Distinguer association automatique, correction humaine et contexte explicitement inconnu. Ce dernier ne déclenche pas un nouveau rattachement automatique ; une action permet de revenir au mode automatique. Une correction concurrente demande de recharger ou de réexaminer le résultat, sans écrasement silencieux.
- Utiliser cette même association corrigée dans la revue, l'analyse et le brief ; aucun deuxième rattachement indépendant dans l'export.
- Différencier « sélectionné explicitement », « cliqué », « survolé » et « associé par proximité temporelle ». Une capture proche dans le temps n'est pas nécessairement le même état visuel.
- Montrer pause, capture manquante/supprimée et changement de page. Un instant sans preuve reste sans preuve ; aucune reconstruction inventée.

**Point technique à traiter avant l'overlay :** le survol enregistre désormais un instant cohérent (P1). Une capture différée peut encore représenter un autre état que l'événement qu'elle illustre. Garantir une association explicite et cohérente ou afficher la preuve comme approximative, sans contour prétendument exact.

**Hors périmètre :** lecteur audio après suppression, vidéo, replay DOM, précision mot à mot, suivi intégral du curseur. Une courte trajectoire bornée autour d'une marque ne sera ajoutée que si des sessions réelles montrent qu'elle apporte une information nécessaire.

**Acceptation :** « ce bouton-là » après scroll puis redimensionnement ouvre la bonne preuve, ou indique clairement l'incertitude ; une correction tient après rechargement et nouvelle analyse. La revue fonctionne sans audio conservé et sans codebase.

**Livré (0.7.0) :** « Show context » sur un passage ou une citation ouvre le moment : texte, capture, contour de l'élément et du pointeur seulement quand la capture correspond à l'instant (sinon « approximative » sans contour), gestes autour, pauses, captures supprimées et intentions qui citent ce passage. Moment précédent/suivant au clavier, Échap pour fermer. La correction choisit un autre événement ou une capture proche, « contexte inconnu » ou le retour à l'automatique ; elle porte la révision du passage, sa provenance (`contextOrigin`), survit à une nouvelle analyse et alimente l'analyse et le brief. Une correction concurrente renvoie un conflit qui demande de recharger.

**Limites :** les choix proposés couvrent 30 s avant à 10 s après le passage, 20 au plus. Une navigation sans événement ni capture n'apparaît pas comme contexte automatique. La correspondance capture/instant repose sur l'horodatage de la capture ; les sessions enregistrées avec un SDK antérieur n'en ont pas et restent « approximatives ».

### P2 — présenter les intentions, avec leurs réponses possibles

**Cas d'usage :** « je veux un historique » puis « en fait, je veux savoir si c'est enregistré » produit un besoin cohérent que je peux corriger.

**Terminologie retenue pour la prochaine interface :**

- **Session** : le moment de travail enregistré. Action : « Commencer une session ».
- **Intention** : le résultat souhaité, interprété par l'IA puis confirmé ou corrigé par une personne.
- **Réponse envisagée** : une manière possible d'y répondre, qui peut être modifiée sans rejeter l'intention.
- **Preuves** : paroles, actions et captures ; une erreur reste un signal, pas automatiquement une intention ni une instruction de développement.

**Déjà là :** les propositions portent `need`, `observed`, `response`, `unknowns`, les sources et les révisions. La clarification textuelle fait déjà évoluer une proposition. Réutiliser ces champs ; le changement de vocabulaire ne justifie pas une seconde table ou une migration de tous les identifiants.

**À construire :** une carte orientée intention, avec résultat voulu en premier, réponse envisagée séparée, citation et contexte accessibles en un geste. Renommer les libellés de revue de façon cohérente, sans multiplier les sections. Confirmer un besoin ne valide pas automatiquement sa solution et n'autorise pas un agent.

La citation ouvre le contexte de P1b. « Continuer cette intention » ouvre le parcours P4. Garder, modifier, différer, écarter, clarifier et transmettre conservent leurs règles actuelles. Afficher l'origine humaine ou IA de la formulation et les inconnues utiles ; ne pas fabriquer un score de certitude. Les libellés de l'interface, du brief et des états vides parlent le même langage, avec les traductions du produit ; les identifiants internes n'ont pas à être renommés pour cela.

Exemple illustratif de la carte attendue :

```text
Intention
Savoir que mes modifications ont été enregistrées.

À 00:42–00:49
« Ici, je ne sais jamais si c'est enregistré. »
Paramètres · bouton Enregistrer · voir le contexte

Réponse envisagée
Afficher les états enregistrement / enregistré / échec.

À vérifier
La sauvegarde échoue-t-elle, ou manque-t-il un retour visible ?
```

**Acceptation :** changer la réponse envisagée conserve l'intention, ses preuves et sa décision ; une reformulation ne crée pas une deuxième demande contradictoire. Une intention inférée reste identifiable et corrigeable. Aucun changement purement lexical ne perd une proposition existante ou ne change les droits.

**Livré (0.7.0) :** onglet « Intentions », bouton « Confirm », « Hand off N confirmed ». La réponse envisagée se modifie seule et confirmer l'intention ne la valide pas. La carte indique si la formulation vient de l'IA ou d'une personne ; une précision IA ultérieure la marque de nouveau « IA ». L'IA peut signaler qu'une nouvelle intention correspond à une intention existante accessible, avec sa raison : « Add to this intention » (avec consentement explicite si des extraits privés deviennent visibles de l'équipe), « Keep separate », puis annulation possible. Supprimer une intention retire ce que les sessions suivantes y avaient ajouté et les copies Reflet des briefs qui l'incluaient ; un brief déjà copié ou exporté ne peut pas être rappelé.

**Limites :** les identifiants internes restent `sessionProposals`/`proposal`. Les libellés du SDK sont en anglais.

### P4 — continuer la même intention avec l'IA entre les sessions

**Cas d'usage :** après une modification, j'enregistre « c'est mieux, mais sur mobile le message disparaît trop vite ». Je retrouve l'intention initiale et ce qui reste à améliorer.

**Déjà là :** clarification textuelle, révisions et verdict manuel « Works / Needs more work » avec note. Cela ne constitue pas encore une continuation vocale ni un dossier regroupant plusieurs sessions.

**Parcours à construire :**

1. Depuis la carte P2, « Continuer cette intention » rappelle le résultat voulu, la réponse envisagée et les questions ouvertes, puis lance le recorder existant sur action explicite. L'utilisateur peut préciser ou vérifier le résultat ; aucune nouvelle permission de partage ni remise à un agent implicite.
2. À la fin, l'IA compare les nouveaux passages à la révision de départ et aux seules preuves autorisées utiles. Elle prépare une mise à jour de l'intention existante. Un sujet réellement distinct est proposé séparément, sans rattachement forcé.
3. La revue montre « Ce qui change », les nouvelles preuves, ce qui reste incertain et les réponses possibles. Accepter, modifier, refuser ou répondre à une question reste possible sans perdre l'enregistrement. Tant que rien n'est accepté, l'intention confirmée reste intacte.
4. L'acceptation crée une révision du même besoin, avec l'auteur de la décision et les contributions sources. Les captures s'ouvrent dans P1b ; l'historique montre ce qui a motivé l'évolution, sans recopier des tickets.
5. Après un changement, la nouvelle session peut alimenter la vérification existante. L'IA propose « semble résolu », « encore à améliorer » ou « preuves insuffisantes », avec justification ; une personne confirme le verdict. Réalisé, disponible et effet observé restent distincts.

**Travail de l'IA :**

- Repérer précision, contradiction, nouvelle contrainte, changement de solution ou résultat constaté ; citer les passages qui soutiennent chaque proposition. Une hypothèse reste visible comme telle.
- Comprendre le résultat recherché avant de reprendre une demande littérale. Proposer une réponse plus simple si elle répond au besoin, y compris expliquer, simplifier ou ne rien développer ; comparer sans inventer la faisabilité technique.
- Poser une question ciblée quand la réponse change réellement le besoin ou la prochaine action. Réutiliser les clarifications textuelles et la continuation vocale, sans imposer un nouveau chat ni interrompre l'enregistrement.
- Proposer un rapprochement avec une intention existante accessible quand le contexte le justifie. Montrer les raisons, laisser garder séparé et permettre d'annuler un rattachement ; aucune fusion silencieuse de décisions revues.
- Borner le contexte et les appels par continuation avec les quotas existants, étendus seulement si nécessaire et mesurés. Un retry réutilise la même opération ; aucun traitement en boucle ou facture non bornée. Erreur et absence de changement utile ont des états distincts.

**Contrat des données et des décisions :**

- Une intention garde une identité durable et une seule révision courante confirmée ; chaque contribution référence sa session, ses segments et ses preuves. Une proposition de mise à jour IA reste distincte de l'état accepté. Ne pas maintenir deux copies modifiables du même besoin dans sessions et feedbacks.
- Les gardes actuelles limitent les preuves et la fusion à une session. Ajouter un contrat explicite pour les contributions entre sessions, avec contrôle serveur de l'organisation et des droits sur chaque source ; ne pas supprimer les gardes pour contourner cette limite. Les brouillons privés restent privés.
- Supprimer une session retire ses contributions et les dérivés concernés ; cela ne doit pas supprimer par cascade les contributions indépendantes d'autres sessions à la même intention. Définir séparément la suppression de l'intention et l'annulation d'un rattachement.
- Montrer les extraits et preuves qui seront partagés avant d'ajouter une contribution privée à une intention d'équipe. Les résumés et questions IA héritent de la confidentialité de leurs sources. Suppression ou révocation empêche toute nouvelle lecture et tout job tardif de les réintroduire ; nettoyer les dérivés concernés.
- Chaque analyse porte la révision de l'intention et des sources dont elle part. Si une personne les modifie entre-temps, le résultat devient à réexaminer ; il n'écrase jamais la correction récente. Acceptation, reprise et rattachement sont idempotents.
- Un nouveau besoin confirmé peut nécessiter une nouvelle transmission. Montrer les changements depuis le dernier brief ; conserver sa version historique et les révisions envoyées. Accepter une précision n'élargit ni ne relance un mandat d'agent.

**Acceptation :** deux sessions enrichissent un besoin unique sans doublon imposé ; on peut accepter une précision et refuser la réponse suggérée. Une contradiction déclenche une clarification utile, un sujet distinct reste séparé, une réponse IA tardive ne remplace pas une correction humaine. Le parcours fonctionne sans codebase ni audio conservé. Vérifier aussi accès entre comptes, partage, suppression, annulation de rattachement, retry, échec IA et brief déjà exporté.

**Livré (0.7.0) :** « Continue this intention » rappelle besoin, réponse envisagée et questions ouvertes, puis démarre le recorder uniquement sur « Start session ». La session est liée côté serveur à la révision de départ (contribution `sessionContributions`, organisation et droits vérifiés à chaque source). À la fin, l'IA compare les nouveaux passages à cette révision et propose au plus 8 changements typés (précision, contradiction, contrainte, solution, résultat constaté), chacun avec ses citations et captures, hypothèses signalées. Chaque changement s'accepte (tel quel ou reformulé), se refuse ou se rétablit ; une acceptation crée une nouvelle révision avec l'auteur et la session source, et refuse le conflit si l'intention a changé depuis (`expectedRevision`). Une question IA se répond sans nouveau chat ; la lecture « Looks resolved / Still to improve / Not enough evidence » ne devient une vérification qu'après confirmation d'une personne. L'intention montre l'historique de ses contributions ; les captures apportées par d'autres sessions peuvent rejoindre le brief. Le brief indique « Continued in session » et les changements depuis la dernière transmission (révision 1 → 2), et les briefs précédents restent listés avec la révision transmise. Supprimer la session de continuation annule ses changements acceptés ; retirer sa contribution rétablit les champs qu'elle avait posés et que personne n'a modifiés depuis.

**Limites :** une continuation d'une intention écartée, fusionnée, rattachée ou supprimée avant le démarrage est enregistrée comme session indépendante. Un résultat IA calculé sur une révision dépassée est marqué à réexaminer, jamais appliqué. Les extraits d'une contribution privée restent masqués pour l'équipe tant que leur partage n'est pas accepté. La comparaison utilise le quota d'analyse existant ; aucun quota spécifique n'a été ajouté.

### P3 — suite séparée : repère de code facultatif

**Cas d'usage :** dans les devtools, l'agent reçoit le besoin et peut retrouver plus vite le composant de l'élément montré, sans que Reflet indexe le dépôt.

**Déjà là :** `describeElementRef` récupère des indices React et inclut une source sur la surface devtools ; les notes disposent d'un résolveur plus complet. Source maps et repérage du composant sont deux opérations distinctes : une source map relie une position de code généré à une position du code original, pas directement un pixel à la cause d'un bug.

**À construire :**

- Brancher le résolveur existant sur les éléments sélectionnés et les moments retenus. Résolution asynchrone, bornée et mise en cache par build ; aucun calcul de source map sur chaque mouvement de souris.
- Conserver un repère compact : composant si connu, chemin relatif, ligne/colonne, identifiant de build/version/commit si disponible, méthode de résolution et état « résolu / indisponible ». Une version inconnue est affichée, pas inventée.
- Montrer ce repère dans un détail technique replié et l'inclure dans le brief choisi. Une localisation représente le composant observé, pas une preuve de cause ou une garantie sur le fichier à modifier.
- Résoudre côté devtools ou laisser l'agent destinataire utiliser son accès au dépôt et aux artefacts du build. L'enregistrement en production et l'analyse des intentions restent utilisables sans ces données.
- Ne pas téléverser automatiquement les fichiers source, chemins personnels absolus ou source maps brutes. Ne pas demander de rendre les maps publiques pour activer Sessions.

**Acceptation :** source disponible dans les devtools → repère versionné si la version est connue ; absence de map, composant non React, timeout ou build différent → aucune collecte bloquée, aucune fausse localisation. Un brief sans source permet toujours de comprendre et reproduire le besoin. Mesurer coût, latence et volume avant tout connecteur de symbolication en production.

**Plus tard seulement :** un connecteur optionnel vers des artefacts privés si l'usage le justifie. Reflet ne devient ni un indexeur de code ni un service de gestion de source maps obligatoire.

### Ensuite — connecter la boucle au reste de Reflet

Ces extensions ne font pas partie de P1 à P4. Les fonctionnalités générales de support, feedback et roadmap existent déjà dans Reflet ; le travail futur est leur raccordement au même besoin et à ses preuves, pas leur reconstruction.

1. **Sources communes :** relier feedback in-app, conversations support et sessions d'équipe au même besoin, puis proposer les regroupements à confirmer.
2. **PostHog :** enrichir les liens manuels existants avec session/erreur/version et fraîcheur des données ; respecter les accès et ouvrir les preuves dans PostHog. Aucun replay ou moteur d'analytics Reflet à construire.
3. **Délégation intégrée :** mandat explicite sur une sélection et une révision, accusé de prise en charge, questions et résultat de l'agent. Aujourd'hui le passage est manuel ; ne pas retirer la barrière de la file d'agents avant cette autorisation.
4. **Décision et résultat :** cap du produit, options, raisons du choix, observations après livraison et réponses préparées aux personnes concernées. La faisabilité technique reste à l'agent qui possède le code.
5. **Autres surfaces :** gestion mobile, ChatGPT et outils conversationnels, puis investigations récurrentes bornées. Réutiliser les mêmes objets, permissions et actions ; leur disponibilité n'est pas confirmée par les maquettes.

## 10. Ce qui reste à vérifier avant de parler de boucle validée

Les tests existants couvrent SDK, backend et E2E headless. Le lot 0 rapporte une mesure de 10 minutes avec microphone simulé, des essais courts de transcription réelle et un parcours sur backend de développement. Ce sont des preuves techniques, pas une mesure d'adoption ni une garantie pour toutes les applications.

Contrôle de la livraison 0.7.0 (13 octobre) : tests unitaires SDK 425, backend 899 (dont continuation, comparaison IA simulée, rattachement, brief, correction de contexte, droits entre comptes, suppression) et web 1 941 réussis ; typecheck et builds réussis (builds widgets avec URLs Convex fictives). L'E2E headless `apps/web/e2e/sdk-sessions.e2e.ts` déroule le parcours commun complet sur serveur simulé, en bureau à la souris et en 390 px au clavier. La comparaison IA y est simulée : la qualité des changements proposés sur des sessions réelles reste à mesurer.

Correctif 0.7.1 : l'état de la comparaison d'une continuation (en cours, échec avec sa raison, non analysée) n'apparaît plus qu'une fois dans la revue, sur la ligne d'état ; un échec de comparaison suivi d'une relance est testé côté backend (intention inchangée, puis changements proposés) et SDK. Une capture encore en rendu à la fin ou à la pause est signalée manquante immédiatement, au lieu d'attendre jusqu'à 20 s la fin d'un rendu qui sera écarté ; les captures restent sérialisées. La revue se rafraîchit aussi quand un envoi en attente aboutit après l'analyse ; avant, elle ne l'affichait qu'après rechargement. L'E2E termine la session juste après la marque et passe en Chromium, Firefox et WebKit. Production vérifiée le 13 octobre : `reflet-sdk` 0.7.0 publié sur npm, déploiement Vercel/Convex réussi, et les nouvelles routes (`/sessions/intentions/accept`, `/answer`, `/segments/context`, `/segments/context-choices`) répondent 401 sans authentification au lieu de 404.

Pour les prochaines livraisons :

- [ ] Valider séparément les correctifs locaux 0.6.9, notamment capture en file après pause/fin, capture terminée après la pause et focus après suppression.
- [ ] Valider P1 sur une session réelle : le brief d'un passage « ce bouton-là » permet à l'agent d'identifier l'élément sans ouvrir les captures ; survol long, clic clavier et build minifié inclus.
- [ ] Réussir P1b avec scroll, resize, changement de route, animation/décalage de capture, pause, preuve supprimée et correction humaine de l'association.
- [ ] Réussir P2 sur une session française et anglaise où la personne change d'avis ; mesurer doublons, associations corrigées et temps de revue.
- [ ] Réussir P3 avec et sans source maps, avec build inconnu/différent et sans accès au dépôt.
- [ ] Réussir P4 entre plusieurs sessions et comptes, avec partage, suppression, annulation de regroupement et brief déjà exporté.
- [ ] Réussir le parcours P1b + P2 + P4 complet sur un backend réel avec transcription et analyse réelles. Réussi en E2E headless sur serveur simulé (0.7.0).
- [ ] Effectuer des sessions réelles consenties sur une application de développement et une application déployée ; transmettre le seul brief et ses pièces à un agent, puis revenir vérifier le résultat.
- [ ] Confirmer permissions, reprise, coût, performance, clavier et affichage étroit avec les nouvelles capacités, puis vérifier les versions effectivement publiées/déployées.

Le critère produit reste : une personne ou un agent comprend le résultat voulu sans réexplication orale. Le nombre de tickets générés n'est pas un critère de réussite.

## 11. Consigne pour le prochain agent de développement

> P1b, P2 et P4 sont livrés dans `reflet-sdk` 0.7.0. Valide-les maintenant sur des sessions réelles consenties (section 10) : qualité des changements proposés par l'IA, associations corrigées, temps de revue, droits entre comptes et briefs déjà exportés. Corrige ce que ces sessions révèlent avant d'ajouter des capacités.
>
> P3 vient ensuite, séparément, sans en faire une dépendance des intentions. Les intégrations PostHog/agents restent hors périmètre. Aucun accès obligatoire à la codebase, vidéo, audio permanent, trajectoire continue du curseur ou nouveau chat imposé. L'IA ne fusionne, ne publie et ne lance aucun travail de développement silencieusement.

Les vérifications applicatives à exécuter pendant l'implémentation sont celles d'`AGENTS.md`, avec tests de comportement et E2E headless. Le document et les aperçus ne constituent pas à eux seuls une preuve de fonctionnement.
