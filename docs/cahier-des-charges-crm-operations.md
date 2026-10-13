# Zwanga — Documentation exacte de l’existant et cahier des charges CRM & administration des opérations

| | |
|---|---|
| Document | CDC-CRM-OPS-001 |
| Version | 1.1 |
| Date | 10 octobre 2026 |
| Périmètre analysé | Dépôt `zwanga-admin` (back-office Next.js), contrat financier `docs/admin-finance-api-contract.md` |
| Système de référence métier | API Nest `zwanga-backend` (hors de ce dépôt) |
| Statut | Spécification d’exécution. Aucun de ces lots n’est implémenté par ce document. |

Ce document a deux parties. La partie A décrit uniquement ce que le code de ce dépôt fait aujourd’hui. La partie B spécifie le système cible : un CRM et un poste de pilotage des opérations, construits au-dessus de l’API existante, sans deuxième registre comptable et sans deuxième compte utilisateur.

---

# Partie A — Documentation exacte de l’existant

## A.1 Produit

Zwanga est une plateforme de covoiturage à Kinshasa. Le même compte peut être passager, conducteur, ou les deux. Autour du trajet, le produit gère :

- la demande de trajet et les offres conducteur ;
- la réservation et son paiement (électronique, espèces, jetons) ;
- le portefeuille de jetons, le parrainage et les retraits ;
- l’abonnement conducteur et le financement de documents administratifs ;
- Zwanga Services : devis, avance, pièces conservées, remboursement ;
- le KYC (legacy et Didit) ;
- le support, les signalements de sécurité, les notifications critiques ;
- le recrutement d’agents terrain et un formulaire public de démarches documentaires.

Le back-office de ce dépôt est l’interface d’administration. Il ne possède pas le métier du covoiturage : il appelle l’API Nest. Deux collections Mongo locales font exception (section A.4).

Version affichée dans la navigation : **v1.5**.

## A.2 Architecture constatée

| Couche | Constat |
|---|---|
| Interface | Next.js 16, React 18, App Router |
| État distant | Redux Toolkit Query (`lib/features/api/baseApi.ts`), jeton d’accès en cookie |
| Rôles reconnus par l’UI | `admin`, `super_admin` (`lib/features/auth/adminRoles.ts`) |
| Rôles métier API | `driver`, `passenger`, `admin`, `super_admin` |
| Auth admin | Téléphone + mot de passe, rafraîchissement, changement de mot de passe obligatoire possible |
| Protection des pages | Garde client. Le middleware Next ne protège pas l’admin : il redirige seulement `/users/:id` vers `/users?fiche=` |
| Données métier | API Nest, pagination, montants en nombres |
| Données locales | Mongo via Mongoose : `Demande`, `RecrutementAgent` |
| Export | Fichiers XLS via les routes d’export admin déjà branchées |

Règles financières déjà contractuelles, à conserver telles quelles (`docs/admin-finance-api-contract.md`, analyse du 31 août 2026) :

- lecture admin : `admin` ou `super_admin` ;
- mutation financière sensible : `super_admin` ;
- ajustement de jetons : motif, identifiant admin, écriture append-only, `requestId` idempotent ;
- rapprochement FlexPay : le statut `succeeded` n’est jamais forcé à la main ;
- aucune réponse ne contient de secret FlexPay, de jeton de lien ou de jeton d’authentification ;
- pagination `page` / `limit` (maximum 200) sur les listes financières.

## A.3 Navigation actuelle

Groupes définis dans `app/components/admin/Sidebar.tsx`.

### Opérations

| Écran | Route | Ce que l’écran fait vraiment |
|---|---|---|
| Tableau de bord | `/dashboard` | Agrège métriques, tendance des trajets, cycle de vie, alertes, axes populaires, conducteurs en vue, demandes de financement récentes, file KYC courte. Source : `GET` composé dans `dashboardApi`. |
| Utilisateurs | `/users` | Liste, recherche, suspension, réactivation, désactivation, export XLS. La fiche s’ouvre en query `fiche`, pas en URL profonde durable. |
| Fiche utilisateur | contenu de `UserDetails` | Trajets, réservations passager, réservations conducteur, paiements, demandes de trajet, synthèse financière, rattachement d’un parrain. |
| Validation KYC | `/kyc` | File et historique. Décision approuver / rejeter avec motif. |
| Trajets | `/trips` | Réexporte `app/(admin)/rides/page.tsx`. Liste limitée à 100, filtre local, édition, désactivation, suppression, relevé de trajet. |
| Demandes de trajet | `/trip-requests` | Modification des demandes en attente, reprogrammation des expirées, désactivation, suppression. Conflit optimiste via `expectedUpdatedAt`. |
| Réservations | `/bookings` | Liste admin, accepter, refuser avec motif, annuler. |
| Candidatures agents | `/candidatures` | Liste Mongo du recrutement terrain. Filtres, export, suppression. Aucun statut de traitement. |

### Finance

| Écran | Route | Ce que l’écran fait vraiment |
|---|---|---|
| Paiements | `/payments` | Liste, synthèse, rapprochement super-admin, annulation d’un payout en file. Repli documenté : 20 premières fiches utilisateurs si la route globale n’est pas disponible, sous la limite de 30 requêtes/minute. |
| Zwanga Services | `/pro-services` | Catalogue, dossiers, devis, propriétaire, grand livre du dossier, pièces, transitions de statut. |
| Jetons | `/tokens` | Comptes, registre, ajustement super-admin signé et idempotent. |
| Parrainage | `/referrals` | Comptes, récompenses, retraits, rapprochement de retrait, rattachement d’un parrain. |
| Abonnements | `/subscriptions` | Offres et demandes de financement de documents. |

### Assistance

| Écran | Route | Ce que l’écran fait vraiment |
|---|---|---|
| Signalements | `/reports` | File sécurité. Statuts `under_review`, `resolved`, `dismissed`. Retour à `pending` interdit côté types. |
| Support | `/support` | Tickets admin : filtre, assignation, message public, note interne, changement de statut. |
| Mises à jour | `/app-updates` | Publication et retrait d’une version d’application. |

### Compte

| Écran | Route |
|---|---|
| Paramètres | `/settings` — mot de passe, et pour le super-admin : création, activation, désactivation, reset des comptes admin |
| Profil admin | `/profile` |

Pastilles de navigation : les compteurs KYC, signalements, réservations, demandes et financements sont calculés dans le navigateur. Trajets et demandes sont lus avec `limit: 100`. Le badge n’est donc pas une file d’attente serveur.

Le commentaire du code de navigation constate l’absence de carte temps réel. Les notifications admin appellent `/notifications` avec `scope: "critical"`. Le suivi minute par minute des trajets reste sur le mobile.

## A.4 Deux mondes de données

### Monde Nest — source de vérité métier

Objets déjà typés dans `lib/features/admin/types.ts` et les API associées :

- `User` : téléphone, nom, rôle, statut (`active`, `inactive`, `suspended`, `pending_kyc`), drapeaux conducteur (`isDriver`, `hasApprovedKyc`, `hasActiveVehicle`, `isQualifiedDriver`) ;
- `KycDocument` : pièces, statut, fournisseur `legacy` ou `didit` ;
- `Trip`, `Booking`, `TripRequest`, `DriverOffer`, `Vehicle` ;
- `PaymentTransaction` : FlexPay ou PawaPay, objets liés abonnement, réservation, recharge, payout conducteur, payout parrainage ;
- portefeuille et registre ; parrainage en quatre compartiments `pending`, `available`, `reserved`, `withdrawn` ;
- abonnement `pro` / `monthly` / `yearly` ; demande de financement documentaire ;
- ticket support avec assignation, priorité, catégorie, messages internes ;
- signalement avec trajet et réservation optionnels ;
- dossier Zwanga Services : statut, devis, ledger, documents, événements.

### Monde Mongo de ce dépôt — îlots non rattachés au compte

`models/Demande.ts`, alimenté par le formulaire public (`/demande-documents`, `/enquiry`) :

- identité : nom complet ;
- contact : téléphone ;
- véhicule : marque, plaque ;
- services choisis parmi le barème de `config/form.config.ts` (permis, plaque, carte rose, mutation, attestation de perte, vignette, contrôle technique, autorisation de transport, assurance) ;
- total ;
- horodatage.

Aucun lien `userId`. Aucun statut. Aucune file admin dédiée dans la navigation.

`models/RecrutementAgent.ts`, alimenté par `/recrutement-terrain`, lu par `/candidatures` :

- contact : nom, âge, téléphone, sexe ;
- usage : appareil, application déjà téléchargée, profil ;
- retours : problèmes, compréhension du projet, suggestions ;
- zones parmi les 27 zones de `config/recrutementTerrain.config.ts` (Kinkole, Bibwa, Limete, Victoire, Matete, UPN, Kintambo, etc.).

Aucun propriétaire, aucun statut, aucune conversion en compte conducteur ou passager. La suppression est définitive.

## A.5 Contrats API déjà consommés

Ces chemins sont ceux appelés par ce dépôt. Ils existent comme contrat d’interface ; leur déploiement réel dépend de `zwanga-backend`.

| Domaine | Méthode et chemin | Usage UI |
|---|---|---|
| Utilisateurs | `GET /admin/users`, `GET /admin/users/export`, fiche détail | Liste, export, dossier |
| Comptes | `POST/GET /admin/accounts`, activate, deactivate, password | Paramètres super-admin |
| Modération | `POST /admin/users/:id/suspend`, `activate`, `deactivate` | Fiche et liste |
| Parrain | `GET /admin/referrals/candidates`, `POST /admin/users/:id/referrer` | Rattachement |
| KYC | `GET /admin/kyc/pending`, `GET /admin/kyc`, `POST /admin/kyc/:id/verify` | File |
| Trajets | `GET/PUT/DELETE /admin/trips/:id`, désactivation, relevé | `/trips` |
| Demandes | `GET/PUT/DELETE /admin/trip-requests/:id`, désactivation | `/trip-requests` |
| Réservations | `GET /admin/bookings`, accept, reject, cancel | `/bookings` |
| Paiements | `GET /admin/payments`, `POST .../reconcile` | `/payments` |
| Jetons | `GET /admin/wallets`, `GET /admin/wallets/ledger`, `POST .../adjustments` | `/tokens` |
| Parrainage | accounts, rewards, withdrawals, reconcile | `/referrals` |
| Support | `GET/PATCH /support/admin/tickets/...` assign, messages, status | `/support` |
| Sécurité | `GET /safety/admin/reports`, `PUT /safety/reports/:id/status` | `/reports` |
| Services pro | `/pro-services/admin/catalogue`, `/pro-services/admin/cases/:id/...` | `/pro-services` |
| Notifications | `GET /notifications?scope=critical`, mark-as-read | Compte connecté |
| Véhicules | routes « mes véhicules » | Pas une flotte admin |
| Suivi public | `GET /tracking/public/:token` | Page `/track/[token]` uniquement. Rafraîchissement toutes les 8 secondes. Carte Google d’un seul point. Le jeton de partage expire. Aucune vue admin de la flotte. |

Le dossier KYC Didit, dans `app/(admin)/kyc/page.tsx`, affiche l’identifiant de session, le numéro, le workflow, le statut et la date de synchro. Le texte d’écran dit que les images restent chez Didit et que Zwanga ne conserve que le statut et les identifiants. Les pièces recto, verso et selfie ne s’affichent que pour un dossier legacy dont l’URL est déjà stockée. La décision est binaire : `PUT /admin/kyc/:id/verify` avec `approved` et un motif. Un rejet sans texte part avec la valeur « Motif non précisé ».

## A.6 Ce que l’existant n’est pas

L’admin actuel est une console de listes métier. Il n’est pas un CRM et il n’est pas un poste de commandement.

Constats précis, tirés du code :

1. Une personne existe autant de fois qu’elle a de silos : compte Nest, demande Mongo, candidature Mongo, dossier Services, ticket, signalement. Rien ne les réunit par téléphone.
2. Il n’y a pas de pipeline, d’étape commerciale, de prochaine action, ni de motif de perte.
3. Le support sait assigner un ticket. Le reste des files (KYC, demande, réservation, financement, dossier Services, candidature, paiement bloqué) n’a pas de propriétaire commun ni d’échéance.
4. La fiche utilisateur juxtapose des tableaux. Elle n’a pas de fil chronologique unique, de note d’équipe, ni de tâche.
5. Les compteurs de navigation sont partiels (plafond 100) et calculés dans le client.
6. Il n’existe pas de vue « maintenant » : trajets `ongoing` sans position récente, réservation payée sans départ, offre acceptée sans trajet, paiement `pending` trop vieux, signalement `safety` ouvert. Le suivi GPS existe seulement pour un lien public, un trajet à la fois.
7. Les 27 zones terrain ne pilotent ni l’offre de trajets, ni la couverture conducteurs, ni les objectifs d’agents.
8. Les rôles sont binaires. Un agent support et un employé finance voient la même coque ; seules quelques mutations financières sont réservées au super-admin. Il n’existe pas de profil « agent de validation » ni « agent support ».
9. Il n’y a pas de journal d’audit consultable dans l’UI pour les actions admin (édition de trajet, suspension, décision KYC, message interne).
10. Les formulaires publics Mongo ne créent ni tâche, ni accusé exploitable, ni dédoublonnage.
11. L’argent est réparti en écrans séparés (paiements, jetons, parrainage, relevé de trajet, grand livre Services). Il n’y a pas de journal, de balance, ni de clôture de période.
12. La revue KYC ne reproduit pas le poste Didit : pas de données extraites, pas de scores, pas de visage contre portrait, pas de catalogue de motifs.

---

# Partie B — Cahier des charges

## B.1 Décision d’architecture

Le CRM et le poste opérations sont un module du backend Nest, exposé par ce back-office. Ils ne deviennent pas une troisième base métier dans Next.js.

Règles de dépendance :

1. Le compte `User`, le trajet, la réservation, le paiement, le registre de jetons, le parrainage, le KYC, le ticket, le signalement et le dossier Services restent les systèmes d’enregistrement. Le CRM les référence. Il ne les recopie pas comme vérité.
2. Toute écriture financière continue de passer par les services déjà spécifiés. Le CRM peut ouvrir une tâche « rapprocher ce paiement ». Il ne marque pas un paiement réussi.
3. L’identité CRM est une **partie** (`Party`) rattachée par téléphone normalisé, puis par `userId` dès qu’un compte existe. Une partie a zéro ou un compte. Un compte a une partie.
4. Les collections Mongo `Demande` et `RecrutementAgent` sont migrées vers des dossiers CRM, puis gelées en lecture. Les formulaires publics écrivent ensuite dans l’API Nest.
5. Ce dépôt reste l’interface : nouvelles pages, mêmes garde-fous visuels (français, `fr-CD`, explication sur chaque écran, erreurs métier affichées).
6. Le suivi admin, la console KYC et la comptabilité lisent les services Nest déjà responsables du trajet, de Didit et de l’argent. Le navigateur ne reçoit ni clé Didit, ni secret FlexPay, ni jeton de partage public pour ouvrir une course.

## B.2 Objectif

Donner à une équipe Zwanga, à Kinshasa, une seule place pour :

- reconnaître une personne à travers le covoiturage, l’argent, les documents et le terrain ;
- traiter chaque file avec un responsable, une échéance et une trace ;
- voir chaque course en cours sur une carte, puis la conduire jusqu’au relevé et à l’écriture comptable ;
- valider un KYC avec le même poste de revue qu’une session Didit ;
- faire travailler la finance, la validation et le support sur des privilèges distincts.

Succès mesurable une fois les lots R, 2, K, C et 3 en place (section B.12) :

- 100 % des nouvelles demandes documentaires et candidatures terrain ont une partie, un dossier, un propriétaire et une prochaine action ;
- toute fiche compte s’ouvre en moins de deux secondes sur la timeline des 50 derniers événements ;
- chaque alerte opérationnelle du lot 2 a un propriétaire ou un état « non assigné » visible dans une seule file ;
- chaque trajet `ongoing` est visible sur la carte admin, avec l’âge de sa dernière position ;
- une session Didit se tranche dans le poste de revue, avec motif catalogué si elle est rejetée ;
- un trajet terminé et payé a une écriture équilibrée, dans sa devise, sans mélange CDF, USD et PTS ;
- un agent de validation, un agent support et un employé finance n’ouvrent que les écrans de leur matrice ;
- un super-admin peut retrouver, pour un identifiant de partie, qui a suspendu, décidé un KYC, assigné un ticket ou ajusté des jetons, avec le motif déjà exigé par le registre.

## B.3 Hors périmètre

- L’application mobile passager et conducteur, hors les événements qu’elle émet déjà.
- Un nouveau moyen de paiement, un nouveau barème, une nouvelle règle de commission ou de parrainage.
- La modification rétroactive des historiques financiers.
- Un centre d’appels téléphonique intégré, un PBX, ou l’envoi massif de SMS marketing dans le lot 1. La communication sortante ciblée est le lot 4, opt-in, journalisée.
- Le remplacement de Didit comme fournisseur, et le remplacement du parcours KYC dans l’application mobile. Zwanga reproduit le poste de revue dans l’admin. La capture des pièces reste dans l’application et chez Didit.
- Une conversion automatique entre CDF, USD et PTS.
- Un plan comptable SYSCOHADA complet au-delà du plan Zwanga de la section B.19. L’export de période permet à un expert-comptable de reprendre les journaux.

## B.4 Acteurs et droits

Les comptes mobile restent `driver` et `passenger`. L’administration ajoute des profils de personnel. Le rôle JWT historique `admin` ou `super_admin` reste le passe-droit d’entrée du back-office. Le profil de personnel, `staffProfile`, porte les privilèges réels. Un conducteur ne reçoit jamais un profil de personnel.

Profils livrés avec le produit :

| Profil | Libellé | Compte JWT | Périmètre |
|---|---|---|---|
| `super_admin` | Super admin | `super_admin` | Tout le flux, y compris les rôles, la clôture comptable et l’ajustement de jetons |
| `operations_lead` | Responsable opérations | `admin` | Courses, demandes, réservations, carte, signalements, terrain, dossiers Services hors écriture d’argent |
| `finance_accountant` | Employé finance et comptabilité | `admin` | Paiements, jetons, parrainage, relevés, journal, rapprochement, balance. Pas de carte flotte, pas de décision KYC, pas de suspension |
| `kyc_agent` | Agent de validation | `admin` | Console KYC uniquement, décision et motifs. Pas d’argent, pas de carte, pas de tickets |
| `support_agent` | Agent support | `admin` | Tickets, notes, fiche limitée du demandeur. Suivi GPS seulement pour le trajet lié au ticket ouvert |

Les comptes `admin` déjà créés reçoivent `operations_lead` à la migration. Les comptes `super_admin` restent `super_admin`.

### Matrice

`oui` = autorisé. `lecture` = consulter sans mutation. vide = route API 403 et entrée de menu absente.

| Capacité | Super admin | Responsable opérations | Finance et comptabilité | Agent de validation | Agent support |
|---|---|---|---|---|---|
| Carte de tous les trajets en cours | oui | oui | | | |
| Suivi d’un trajet lié à un ticket | oui | oui | | | oui |
| Éditer trajet, demande, réservation | oui | oui | | | |
| Relevé de trajet | oui | lecture | oui | | lecture si ticket lié |
| Décision KYC | oui | | | oui | |
| Images et scores KYC | oui | | | oui | |
| Tickets, notes internes, assignation support | oui | lecture | | | oui |
| Signalements | oui | oui | | | lecture |
| Paiements, registre jetons, parrainage | oui | lecture | oui | | lecture du paiement lié au ticket |
| Proposer un ajustement de jetons | oui | | oui | | |
| Poster un ajustement de jetons | oui | | | | |
| Rapprochement FlexPay | oui | | oui | | |
| Journal, balance, clôture | oui | | saisie et rapprochement | | |
| Clôturer une période | oui | | | | |
| Dossiers Services, grand livre du dossier | oui | statut et pièces | écritures d’argent | | lecture si ticket lié |
| Candidatures et zones | oui | oui | | | |
| Créer un compte de personnel, changer un profil | oui | | | | |
| Export avec téléphones | oui, journalisé | oui, journalisé | journal sans téléphone | | |
| Journal d’audit | tout | sa file | sa file | ses décisions | ses tickets |

Un employé finance prépare l’ajustement de jetons (montant signé, motif, `requestId`). Le super-admin le poste. Le même couple vaut pour une écriture manuelle au-dessus du seuil de la section B.19. En dessous du seuil, l’employé finance poste lui-même et le journal cite son identifiant.

### Gestion des rôles

Écran `/settings/roles`, réservé au super-admin.

1. La liste des profils semés est visible, avec le nombre de comptes actifs.
2. Le super-admin crée un compte de personnel : téléphone, prénom, nom, mot de passe temporaire, profil. Le flux reprend `POST /admin/accounts`, complété par `staffProfile`.
3. Il réassigne le profil d’un compte actif. Il ne peut pas retirer le profil `super_admin` du dernier super-admin actif.
4. Il crée un profil supplémentaire en clonant un profil semé, puis en retirant des capacités. Un clone ne gagne aucune capacité absente de sa source. Le profil `super_admin` n’est pas clonable et n’est pas éditable.
5. Désactiver un compte de personnel révoque le JWT au prochain appel. Les dossiers dont il était propriétaire repassent « non assigné ».

Toute mutation CRM ou métier envoie l’identifiant du JWT. Le backend refuse un `actedBy` fourni par le client s’il diffère du jeton. L’interface masque les menus interdits. Le masque n’est pas le contrôle : chaque route vérifie la capacité.

## B.5 Modèle de données cible

Nouveaux agrégats Nest. Identifiants UUID. Dates en UTC, affichage `fr-CD`.

### Partie

```text
Party
  id
  phoneE164            # clé unique, normalisée +243
  displayName
  userId               # nullable, unique si présent
  kinds[]              # passenger, driver, pro_client, field_agent, referrer
  zoneIds[]            # sous-ensemble des 27 zones existantes
  tags[]
  ownerAdminId         # nullable
  stage                # voir pipelines
  nextActionAt         # nullable
  mergedIntoPartyId    # nullable, fusion
  createdAt, updatedAt
```

La normalisation téléphone est une fonction unique, partagée avec l’inscription. Deux écritures du même numéro congolais aboutissent à la même partie. La fusion manuelle de deux parties est une action super-admin : elle déplace les liens, elle ne supprime pas les dossiers sources, elle écrit un événement `party.merged`.

### Dossier

Un dossier est un travail suivi. Il pointe vers un objet métier quand il existe, sinon il est lui-même la demande.

```text
Case
  id
  partyId
  type                 # kyc, trip_exception, booking_exception, payment_exception,
                       # support, safety, pro_service, document_request,
                       # field_recruitment, funding, subscription
  sourceType           # user, kyc_document, trip, booking, trip_request,
                       # payment, support_ticket, user_report, pro_case,
                       # document_request, recruitment, funding_request
  sourceId
  pipelineId
  stageId
  priority             # low, medium, high, urgent
  status               # open, waiting, done, cancelled
  ownerAdminId         # nullable
  teamId               # nullable
  slaDueAt
  firstResponseAt
  resolvedAt
  closedReason         # nullable
  createdAt, updatedAt
```

Unicité : un couple (`sourceType`, `sourceId`) a au plus un dossier ouvert. Refermer puis rouvrir crée un nouvel épisode, lié par `previousCaseId`.

### Activité

Append-only. Jamais mise à jour sur le fond. Une correction est une nouvelle activité `activity.corrected`.

```text
Activity
  id
  partyId
  caseId               # nullable
  kind                 # note, call, whatsapp, task, system, status_change
  visibility           # internal, customer_visible
  body                 # texte, 2 000 caractères max pour une note
  payload              # json limité aux identifiants et libellés, jamais de secret
  actorAdminId         # nullable si l’événement vient du mobile ou d’un webhook
  occurredAt
```

Les événements métier (paiement réussi, KYC approuvé, trajet démarré, ticket assigné) sont projetés en activités `system` par le backend au moment où le service métier commit. L’UI ne reconstruit pas l’historique en interrogeant dix listes à chaque ouverture après le lot 1 : elle lit `GET /admin/crm/parties/:id/timeline`.

### Tâche

```text
Task
  id
  partyId
  caseId               # nullable
  title
  dueAt
  ownerAdminId
  status               # open, done, cancelled
  completedAt
  completedByAdminId
```

### File, équipe, SLA

```text
Team
  id, name, zoneIds[], memberAdminIds[]

Queue
  id, name, caseTypes[], teamId, defaultPriority

SlaPolicy
  id, caseType, priority, firstResponseMinutes, resolutionMinutes
```

Calendrier SLA : Afrique/Kinshasa, jours calendaires dans le lot 1. Les heures ouvrées (lundi–samedi, plage configurable) arrivent au lot 3. Un dossier ouvert sans politique applicable n’a pas d’échéance inventée : `slaDueAt` reste nul et l’UI affiche « sans échéance ».

### Segment

```text
Segment
  id, name, definitionJson, ownerAdminId, refreshedAt, memberCount
```

La définition est un filtre déclaratif sur des champs autorisés (rôle, zone, stade, KYC, dernier trajet, solde de jetons signe seulement, dossier ouvert). Elle n’est pas une requête SQL saisie par l’admin.

## B.6 Pipelines

Chaque pipeline a des étapes ordonnées, un responsable d’équipe par défaut, et des transitions autorisées. Une transition hors liste est refusée par l’API.

### P1 — Conducteur

Déclencheur : `driverOnboardingRequestedAt` ou passage `isDriver`.

| Étape | Entrée | Sortie attendue |
|---|---|---|
| Intention | demande d’activation | partie créée, tâche « vérifier le dossier » |
| KYC | document `pending` | décision déjà existante via `/admin/kyc/:id/verify` |
| Véhicule | KYC approuvé, pas de véhicule actif | tâche, pas une saisie véhicule à la place du conducteur |
| Premier trajet | `isQualifiedDriver` et aucun trajet publié | relance |
| Actif | au moins un trajet `completed` | dossier clos `done` |
| Suspendu | statut compte `suspended` | dossier sécurité ou modération lié |

Le pipeline lit les drapeaux existants. Il ne crée pas un second statut conducteur.

### P2 — Course à risque

Déclencheur automatique, un dossier par objet source :

| Signal | Source déjà disponible | Priorité par défaut |
|---|---|---|
| Demande `pending` ou `offers_received` dont `departureDateMax` est dans moins de 2 h | `TripRequest` | high |
| Offre acceptée sans `tripId` depuis plus de 30 min | `TripRequest` | high |
| Réservation `pending` dont le départ est dans moins de 3 h | `Booking` | high |
| Trajet `ongoing` sans `lastLocationUpdateAt` depuis plus de 15 min, ou champ absent | `Trip` | urgent |
| Signalement `pending` raison `safety_concern`, `harassment`, `fraud` | `UserReport` | urgent si safety, high sinon |
| Paiement `pending` ou `initiated` depuis plus de 30 min | `PaymentTransaction` | medium |
| Financement documentaire `pending` | `DocumentFundingRequest` | medium |

Les durées sont des constantes de `SlaPolicy`, modifiables par le super-admin, valeurs initiales ci-dessus.

Action admin : assigner, noter, résoudre avec un motif, ou lancer l’action métier déjà existante (accepter la réservation, rapprocher le paiement, trancher le signalement). Résoudre le dossier CRM ne change pas l’objet métier. Changer l’objet métier ferme le dossier si le signal disparaît.

### P3 — Zwanga Services et démarches documents

Les dossiers Services gardent leur machine à états actuelle (`submitted` → `reviewing` → `quoted` → `accepted` → `processing` → `ready` → `completed`, plus `needs_info`, `rejected`, `cancelled`). Le CRM ajoute la partie, le propriétaire d’équipe et le SLA. Il n’ajoute pas un statut parallèle.

Les demandes Mongo migrées entrent au stade `submitted` du type `document_request`, avec le barème historique de `config/form.config.ts` figé dans le payload de l’activité de création. Le prix affiché au public et le devis Services restent deux objets : le formulaire public crée une demande ; seul un admin produit un devis Services.

### P4 — Agent terrain

| Étape | Sens |
|---|---|
| Reçue | candidature migrée ou nouveau formulaire |
| À rappeler | prochaine tâche datée |
| Formée | note obligatoire |
| Déployée | au moins une zone, lien optionnel vers un `userId` si la personne a un compte |
| Écartée | motif obligatoire |

La suppression physique disparaît de l’UI. Un super-admin peut anonymiser (nom retiré, téléphone conservé hashé pour l’unicité) après clôture. L’export XLS actuel reste, journalisé.

### P5 — Support

Le ticket Nest reste le dossier. Les statuts existants (`open`, `in_progress`, `waiting_user`, `resolved`, `closed`) sont les étapes. Le CRM impose :

- première réponse : 2 h en `urgent` et `high`, 8 h sinon, sur le calendrier du lot ;
- note interne déjà supportée (`isInternal`) ;
- à la résolution, `resolutionSummary` obligatoire, comme le permet déjà le contrat UI.

## B.7 Exigences fonctionnelles

Identifiants stables. Priorité : P0 bloque le lot, P1 suit dans le même lot, P2 lot ultérieur.

### Identité — lot 1

| ID | Priorité | Exigence |
|---|---|---|
| CRM-ID-01 | P0 | Créer ou retrouver une partie à partir d’un téléphone, y compris les numéros déjà stockés sans indicatif. |
| CRM-ID-02 | P0 | Lier automatiquement la partie au `User` dont le téléphone normalisé correspond. |
| CRM-ID-03 | P0 | Recherche admin par nom, téléphone, plaque, identifiant trajet, identifiant paiement, identifiant ticket. Un seul champ. Résultats groupés par partie. |
| CRM-ID-04 | P0 | Fiche partie : identité, compte lié, zones, propriétaire, stade, prochaine tâche, liens vers les écrans métier existants. |
| CRM-ID-05 | P1 | Fusion de deux parties, super-admin, motif ≥ 10 caractères, irréversible dans l’UI, compensée seulement par un événement d’audit. |
| CRM-ID-06 | P1 | Étiquettes libres limitées à 20 par partie, 32 caractères, sans effet de droit. |

### Timeline — lot 1

| ID | Priorité | Exigence |
|---|---|---|
| CRM-TL-01 | P0 | La fiche affiche une timeline paginée, 50 événements, du plus récent au plus ancien. |
| CRM-TL-02 | P0 | La timeline inclut, quand ils existent : notes, tâches, changements de stade, tickets, signalements, KYC, paiements réussis ou échoués, trajets, réservations, dossiers Services, demandes documents, candidatures. |
| CRM-TL-03 | P0 | Une note interne n’est jamais renvoyée à l’application mobile ni au formulaire public. |
| CRM-TL-04 | P1 | Filtre de timeline par domaine : argent, course, identité, support, terrain. |

### Files de travail — lot 1 et 2

| ID | Priorité | Exigence |
|---|---|---|
| CRM-WK-01 | P0 | Page `/operations` : une file unique des dossiers ouverts, colonnes partie, type, priorité, propriétaire, échéance, âge. |
| CRM-WK-02 | P0 | Filtres serveur : type, priorité, propriétaire, non assigné, équipe, zone, échéance dépassée. Pagination `limit` max 100. |
| CRM-WK-03 | P0 | Les pastilles de navigation lisent `GET /admin/crm/queues/counts`. Elles n’agrègent plus 100 trajets dans le client. |
| CRM-WK-04 | P0 | Prendre un dossier, le rendre, l’assigner à un admin actif. |
| CRM-WK-05 | P0 | Créer une tâche avec échéance. Une tâche échue reste visible jusqu’à clôture. |
| CRM-WK-06 | P1 | Raccourci depuis chaque ligne vers l’écran métier déjà existant (KYC, trajet, paiement, ticket, dossier Services). |
| CRM-WK-07 | P1 | File « Mes tâches du jour » sur le tableau de bord, à la place d’un second tableau de chiffres sans propriétaire. |

### Poste course — lot 2

| ID | Priorité | Exigence |
|---|---|---|
| OPS-LV-01 | P0 | Vue « En ce moment » : trajets `ongoing` et `upcoming` dont le départ est dans les 3 prochaines heures. |
| OPS-LV-02 | P0 | Chaque ligne montre conducteur, axe, places, réservations non terminales, dernier horodatage de position, relevé de trajet déjà construit (`TripStatement`). |
| OPS-LV-03 | P0 | Les signaux P2 ouvrent ou rafraîchissent un dossier sans doublon. |
| OPS-LV-04 | P1 | Action groupée interdite sur les mutations métier. L’assignation CRM peut être groupée, plafond 50. |
| OPS-LV-05 | P1 | Le relevé de trajet reste la pièce financière de la course. Le CRM y ajoute les notes et les signalements liés, pas une seconde ventilation d’argent. |

### Terrain — lot 3

| ID | Priorité | Exigence |
|---|---|---|
| OPS-ZN-01 | P0 | Les 27 zones actuelles sont la liste fermée. Ajouter une zone est une donnée de configuration super-admin, pas un texte libre en base candidature. |
| OPS-ZN-02 | P0 | Tableau de zone : candidatures par étape, conducteurs qualifiés dont la partie porte la zone, demandes de trajet des 7 derniers jours dont le libellé de départ contient la zone (approximation assumée tant qu’il n’y a pas de `zoneId` sur le trajet). |
| OPS-ZN-03 | P1 | Le backend peut ensuite accepter `departureZoneId` sur la demande et le trajet. Jusque-là, l’UI affiche « zone estimée par le texte » et ne présente pas le chiffre comme exact. |
| OPS-ZN-04 | P0 | Pipeline P4 complet, sans suppression physique. |

### Relation et recontact — lot 4

| ID | Priorité | Exigence |
|---|---|---|
| CRM-OUT-01 | P0 | Segment enregistré, nombre de membres visible avant tout envoi. |
| CRM-OUT-02 | P0 | Un envoi est un objet `Outreach` : segment, canal `push` uniquement dans ce lot, texte, auteur, horodatage, compteurs envoyés / échoués. |
| CRM-OUT-03 | P0 | Pas d’envoi à un compte `suspended` ou `inactive`. Pas d’envoi sans `userId`. |
| CRM-OUT-04 | P1 | Plafond 500 destinataires par envoi, second écran de confirmation affichant le texte exact. |
| CRM-OUT-05 | P2 | Canal SMS, seulement après un fournisseur et une preuve de consentement stockée sur la partie. |

### Pilotage — lot 3

| ID | Priorité | Exigence |
|---|---|---|
| CRM-KPI-01 | P0 | Tableau : dossiers ouverts, échéances dépassées, délai médian de première réponse support, KYC en attente, courses à risque ouvertes, candidatures sans contact depuis 48 h. |
| CRM-KPI-02 | P1 | Charge par admin : dossiers ouverts et tâches échues. |
| CRM-KPI-03 | P1 | Export CSV des indicateurs, pas des téléphones. L’export nominatif reste l’export utilisateurs déjà existant, journalisé. |

## B.8 Écrans à ajouter dans ce dépôt

La navigation gagne un groupe **Relation** au-dessus d’Opérations.

| Route | Rôle de l’écran |
|---|---|
| `/operations` | File unique, prise en charge, tâches |
| `/operations/live` | Carte de tous les trajets suivis, détail d’une course, relevé |
| `/kyc` | Poste de revue refondu (section B.18), à la place de la liste actuelle |
| `/accounting` | Journal, rapprochement, balance, clôture |
| `/settings/roles` | Profils et comptes de personnel |
| `/crm` | Recherche de parties |
| `/crm/[partyId]` | Fiche 360 et timeline |
| `/crm/pipelines` | Kanban par pipeline, une colonne par étape, limite 50 cartes par colonne |
| `/zones` | Couverture des 27 zones |
| `/crm/segments` | Segments et, au lot 4, envois push |

Écrans existants conservés. Changements obligatoires sur l’existant :

1. La fiche utilisateur embarque le bandeau partie (propriétaire, prochaine tâche, lien timeline) sans retirer les tableaux métier.
2. Support, signalements, KYC, Services, candidatures affichent le dossier CRM s’il existe.
3. Les pastilles appellent les compteurs serveur.
4. `/trips` interroge le serveur avec le filtre de statut et la recherche, au lieu de couper à 100 puis filtrer localement.
5. Le tableau de bord garde ses métriques actuelles et ajoute « Mes tâches » et « Échéances dépassées ».

## B.9 Contrat API à ajouter

Préfixe `/admin/crm`. JWT admin. Mutations financières : aucun nouveau verbe ici.

### Lecture

```http
GET /admin/crm/search?q=&limit=
GET /admin/crm/parties/:partyId
GET /admin/crm/parties/:partyId/timeline?cursor=&domain=
GET /admin/crm/cases?type=&priority=&ownerAdminId=&unassigned=&teamId=&zoneId=&overdue=&page=&limit=
GET /admin/crm/queues/counts
GET /admin/crm/tasks?ownerAdminId=&status=&dueBefore=
GET /admin/crm/live-trips?windowHours=3
GET /admin/crm/zones
GET /admin/crm/metrics?from=&to=
```

`GET /admin/crm/live-trips` sert la liste opérationnelle (section B.7). Le flux GPS complet est décrit en B.17 et n’emprunte pas le jeton public `/tracking/public/:token`.

### Écriture

```http
POST /admin/crm/parties/:partyId/notes
  { "body": "...", "caseId": null }

POST /admin/crm/tasks
  { "partyId", "caseId", "title", "dueAt", "ownerAdminId" }

POST /admin/crm/tasks/:taskId/complete

POST /admin/crm/cases/:caseId/assign
  { "ownerAdminId": null }

POST /admin/crm/cases/:caseId/transition
  { "stageId", "reason" }

POST /admin/crm/parties/merge
  { "sourcePartyId", "targetPartyId", "reason" }
```

Réponses d’erreur stables, déjà dans le style du back-office :

| Code | Cas |
|---|---|
| 403 | capacité absente |
| 404 | partie ou dossier inconnu |
| 409 | transition interdite, dossier déjà pris, fusion vers une partie déjà fusionnée, `expectedUpdatedAt` dépassé |
| 422 | téléphone impossible à normaliser, motif trop court, plafond d’envoi |

idempotence : `Idempotency-Key` obligatoire sur merge, transition et outreach. Le serveur stocke la clé 24 h et renvoie la même réponse.

### Projection

Le backend émet une activité `system` après commit réussi de : vérification KYC, changement de statut de ticket, changement de statut de signalement, changement de statut de dossier Services, succès ou échec de paiement, création de demande de trajet, création de réservation. Le lot 1 peut démarrer avec une projection nocturne de rattrapage plus les événements nouveaux. L’UI indique « historique complet depuis {date} » tant que le rattrapage n’a pas fini.

### Formulaires publics

`POST /api/demandes` et `POST /api/recrutement-terrain` deviennent des proxy vers :

```http
POST /public/crm/document-requests
POST /public/crm/field-applications
```

Corps identiques aux formulaires actuels. Réponse : `{ "reference": "ZW-..." }`. Rate limit par IP et par téléphone : 5 créations / heure. Le téléphone est stocké normalisé. La réponse publique ne contient pas d’identifiant interne de partie.

## B.10 Journal d’audit

Chaque mutation admin déjà existante qui sera touchée (suspension, KYC, édition de trajet, édition de demande, décision de réservation, assignation de ticket, ajustement de jetons, rapprochement) écrit :

```text
AuditEvent
  id, actorAdminId, action, objectType, objectId, partyId nullable,
  reason nullable, requestId nullable, createdAt, ip tronquée /24
```

L’UI `/settings` pour le super-admin, et la timeline de partie, lisent ce journal. Les secrets, URL de paiement et corps FlexPay en sont exclus, conformément au contrat financier.

## B.11 Exigences non fonctionnelles

| Sujet | Seuil |
|---|---|
| Recherche partie | p95 < 500 ms pour 100 000 parties, index sur `phoneE164`, `userId`, nom |
| File `/operations` | p95 < 700 ms page de 50 |
| Compteurs pastilles | cache 15 s, une requête, pas une requête par onglet |
| Carte admin | un point GPS affiché en moins de 5 s après réception par l’API ; 200 trajets `ongoing` sur une carte |
| Console KYC | ouverture d’une session Didit déjà synchronisée en moins de 2 s hors chargement des images |
| Disponibilité des écritures CRM | même engagement que l’API admin actuelle |
| Langue | français, dates `fr-CD`, montants jamais convertis entre CDF, USD et PTS |
| Accessibilité | mêmes règles que les pages admin actuelles : libellé de bouton, alerte `role="alert"`, pastille avec `aria-label` |
| Mobile admin | les files et la fiche restent utilisables à 390 px, comme la coque actuelle |
| Rétention | notes et audit conservés 24 mois, puis anonymisation du corps libre, conservation de l’action et de l’acteur |
| Tests | contrat API du module CRM ; tests UI des transitions interdites ; test de non-régression des 3 tests `requestEdit` et du relevé de trajet |

## B.12 Lots de livraison

Chaque lot est livrable seul. Le lot N suppose le lot N−1 en production.

### Lot R — Profils de personnel

Livré avant les écrans des lots 2, K et C.

- `staffProfile` sur les comptes admin, migration `admin` → `operations_lead`.
- Matrice de la section B.4 appliquée sur chaque route existante et nouvelle.
- Écran `/settings/roles` : création, réassignation, clone restrictif, interdiction de retirer le dernier super-admin.
- Critère : un agent support ouvre un ticket et reçoit 403 sur `/admin/kyc`, `/admin/wallets` et la carte flotte ; un agent de validation décide un KYC et reçoit 403 sur `/admin/payments` ; un employé finance lit un relevé et reçoit 403 sur `PUT /admin/kyc/:id/verify`.

### Lot 0 — Fondation identité (backend)

- Table `Party`, normalisation téléphone, rattachement `userId`.
- Reprise : tous les `User` ; toutes les `Demande` ; tous les `RecrutementAgent`.
- Rapport de reprise : créées, liées, collisions de nom à téléphone égal, téléphones illisibles.
- Formulaires publics encore sur Mongo, double écriture vers Nest, comparaison quotidienne.
- Critère : zéro téléphone valide laissé sans partie ; les téléphones illisibles listés, non inventés.

### Lot 1 — Fiche et file

- Timeline, notes, tâches, dossier manuel, `/crm`, `/operations`, pastilles serveur.
- Support et KYC apparaissent dans la timeline.
- Critère d’acceptation UI : ouvrir un compte connu, voir ses paiements et ses tickets dans le même fil, ajouter une note, créer une tâche, la retrouver après rechargement, la voir sur le compte d’un autre admin.

### Lot 2 — Carte et courses à risque

- Exigences B.17, signaux P2, assignation.
- Pagination serveur de `/trips` et `/trip-requests`.
- Critère : deux trajets `ongoing` de test apparaissent ensemble sur la carte, bougent sans rechargement de page, et un troisième trajet `completed` n’y est plus. Un agent finance ne voit pas cette carte. Traiter la réservation dans l’écran existant ferme le dossier de réservation.

### Lot K — Poste de validation KYC

- Exigences B.18.
- Critère : une session Didit de test affiche pièces, selfie, données extraites et contrôles ; Approuver met le dossier Zwanga à `approved` ; Rejeter sans motif est refusé ; un dossier legacy s’ouvre dans le même poste avec ses trois images.

### Lot C — Comptabilité

- Exigences B.19.
- Critère : un trajet terminé avec paiement réussi produit une écriture équilibrée dans la devise du paiement ; un rapprochement ne force pas `succeeded` ; la clôture refuse une nouvelle écriture sur la période ; CDF, USD et PTS restent sur trois balances.

### Lot 3 — Terrain, Services, pilotage

- Pipeline P4, gel de la suppression des candidatures, proxy des formulaires, arrêt de la double écriture, tableau de zones honnête sur l’approximation texte.
- Dossiers Services rattachés à une partie par téléphone du dossier.
- KPI CRM-KPI-01.
- Critère : une candidature soumise sur `/recrutement-terrain` apparaît dans la file en moins d’une minute, avec zone et tâche « rappeler ».

### Lot 4 — Segments et push

- CRM-OUT-01 à 04.
- Critère : un segment de test de 2 comptes reçoit le texte confirmé ; un compte suspendu du même segment ne le reçoit pas ; l’envoi est visible dans les deux timelines.

### Lot 5 — Durcissement

- Heures ouvrées SLA, fusion de parties, anonymisation, `departureZoneId` si le mobile est prêt.
- Critère : un profil cloné sans export ni assignation reçoit 403 sur ces deux actions, et le dernier super-admin ne peut pas être retiré.

## B.17 Traçage en temps réel de chaque trajet

Le suivi public `/track/[token]` reste le lien partagé au passager : un jeton, une course, un rafraîchissement de 8 secondes, une carte d’un point. Le poste admin est un autre canal.

### Ce que l’admin doit montrer

Page `/operations/live`, une seule carte pour Kinshasa et les courses hors ville.

- Tous les trajets `ongoing`.
- Tous les trajets `upcoming` dont le départ tombe dans les 3 prochaines heures et qui ont déjà une position.
- Un trajet `completed` ou `cancelled` quitte la carte. Il reste ouvrable depuis `/trips` en rejeu.

Chaque marqueur affiche : axe, conducteur, plaque, places restantes, âge de la dernière position, pastille « en direct » si le point a moins de 30 secondes, « en retard » au-delà de 2 minutes, « position en attente » si `currentLocation` est vide.

Le clic ouvre le panneau déjà connu du suivi public, en version admin :

- départ, arrivée, statut, véhicule, conducteur ;
- pour chaque réservation acceptée : passager, embarqué, déposé, mode de paiement ;
- lien vers le relevé `TripStatement` ;
- lien vers le dossier CRM s’il est ouvert ;
- action métier déjà existante (désactiver le trajet) seulement pour le responsable opérations et le super-admin.

Le tracé du trajet sélectionné est la suite des points stockés depuis `startedAt`, pas seulement le dernier point.

### Canal

```http
GET /admin/tracking/trips?status=ongoing
GET /admin/tracking/trips/:tripId
GET /admin/tracking/trips/:tripId/trail
```

`GET /admin/tracking/stream` est un flux SSE authentifié. Chaque événement est `{ tripId, latitude, longitude, recordedAt }`. Si le flux tombe, l’écran repasse en lecture toutes les 5 secondes et l’indique.

Le mobile continue d’envoyer sa position au backend comme il le fait déjà pour le suivi public. Le backend :

1. met à jour `currentLocation` et `lastLocationUpdateAt` ;
2. ajoute un point d’historique au plus une fois toutes les 5 secondes, et à chaque changement de cap supérieur à 15 degrés ;
3. publie l’événement aux admins abonnés.

L’historique est conservé 90 jours, puis réduit au premier point, au dernier point et aux événements embarquement / dépose.

Capacité requise : `tracking.fleet` pour la carte entière, `tracking.case` pour un trajet ouvert depuis un ticket. L’agent support n’a que `tracking.case`. La finance et la validation n’ont ni l’une ni l’autre.

| ID | Priorité | Exigence |
|---|---|---|
| TRK-01 | P0 | La carte affiche chaque trajet `ongoing`, y compris ceux sans lien public. |
| TRK-02 | P0 | Deux courses bougent sur la même carte sans recharger la page. |
| TRK-03 | P0 | L’âge du point est visible. Un point de plus de 15 minutes ouvre le signal P2 déjà spécifié. |
| TRK-04 | P0 | Le rejeu d’un trajet terminé montre le tracé stocké et le relevé. |
| TRK-05 | P0 | Un profil sans capacité reçoit 403 et ne voit pas le menu. |
| TRK-06 | P1 | Le marqueur d’une course à risque ouverte est distingué des autres. |

## B.18 Poste de validation KYC, aligné sur Didit

Didit reste le fournisseur. L’application mobile reste l’endroit où la personne photographie ses pièces. L’admin remplace la liste actuelle par le poste de revue qu’un opérateur Didit utilise pour trancher une session.

### Poste

La page `/kyc` est en trois zones.

1. **File.** Sessions à traiter, filtre par statut Zwanga (`pending`, `approved`, `rejected`) et par statut de session Didit (`Not Started`, `In Progress`, `In Review`, `Approved`, `Declined`, `Abandoned`, `Expired`). Recherche nom, téléphone, numéro de session.
2. **Pièces.** Visionneuse : recto, verso, selfie, image de vivacité si Didit l’envoie. Zoom, rotation, plein écran. Portrait du document à côté du selfie.
3. **Décision.** Identité déclarée dans Zwanga (prénom, nom, téléphone) en regard des champs extraits (nom, date de naissance, numéro de document, expiration, nationalité, sexe). Contrôles Didit affichés un par un : document reconnu, document non expiré, correspondance du visage, vivacité, cohérence du nom. Chaque contrôle montre réussi, échoué ou non fourni. Avertissements Didit en liste. Décision automatique Didit distincte de la décision Zwanga.

Actions, réservées à `kyc.decide` :

- **Approuver.** Disponible si le dossier Zwanga est `pending`. Appelle `PUT /admin/kyc/:id/verify` avec `approved: true`.
- **Rejeter.** Motif obligatoire, choisi dans le catalogue : document illisible, document expiré, visage non correspondant, document non accepté, suspicion de fraude, informations incohérentes avec le profil. Le texte libre complète le code, il ne le remplace pas. La valeur « Motif non précisé » est interdite.
- **Ressaisir.** Statut Zwanga inchangé, message au conducteur, session Didit laissée à son statut. Réservé aux dossiers encore `pending`.

Le bouton **Synchroniser** relance la lecture de la session Didit. `diditLastSyncedAt` s’affiche. Un dossier legacy (`provider` différent de `didit`) utilise le même poste avec les trois images déjà stockées (`cniFrontUrl`, `cniBackUrl`, `selfieUrl`) et la mention « Legacy Zwanga ». Les scores absents restent « non fourni ».

### Données

Le backend appelle l’API session Didit avec la clé serveur. Réponse admin :

```text
KycReview
  document          # KycDocument déjà typé
  extracted         # nom, date de naissance, numéro, expiration, nationalité, sexe, nullable
  checks[]          # code, label, passed | failed | missing
  warnings[]        # code, label
  media             # url courte recto, verso, selfie, liveness, expiration ≤ 5 minutes
  vendorDecision    # approved | declined | in_review | unknown
```

`providerMetadata` brut n’est pas renvoyé tel quel s’il contient un secret. Les URL de médias ne sont pas réécrites dans le dossier permanent. L’ouverture d’une visionneuse écrit un `AuditEvent` `kyc.media_viewed`.

| ID | Priorité | Exigence |
|---|---|---|
| KYC-01 | P0 | Le poste montre, pour une session Didit, les pièces, le selfie, les champs extraits et les contrôles. |
| KYC-02 | P0 | Approuver et rejeter passent par la route de vérification existante. |
| KYC-03 | P0 | Un rejet sans code de motif est refusé en 422. |
| KYC-04 | P0 | Seuls le super-admin et l’agent de validation voient les images et décident. |
| KYC-05 | P1 | La décision Zwanga et la décision Didit restent lisibles côte à côte après traitement. |
| KYC-06 | P1 | Le dossier legacy s’affiche dans le même poste, sans scores inventés. |

## B.19 Flux complet de comptabilité

Les écrans Paiements, Jetons, Parrainage, Abonnements, relevé de trajet et grand livre Services restent les pièces. La comptabilité les transforme en journal. Elle ne crée pas un second solde de jetons et ne force pas un paiement à `succeeded`.

### Plan Zwanga

Trois balances séparées : CDF, USD, PTS. Aucune ligne ne mélange deux devises. Les PTS sont un journal mémo, hors résultat en francs.

| Compte | Sens |
|---|---|
| 5121 Mobile money CDF | Encaissements et décaissements FlexPay / PawaPay en francs |
| 5122 Mobile money USD | Même chose en dollars |
| 5123 Espèces à justifier | Réservations `cash` déclarées sur le relevé, tant qu’elles ne sont pas versées |
| 411 Passagers | Créance de course tant que le paiement n’est pas `succeeded` |
| 401 Conducteurs | Net conducteur du relevé, à payer |
| 4671 Parrainage | Jetons de parrainage devenus payables, puis retrait |
| 4672 Jetons en circulation | Solde PTS du registre, compte mémo |
| 706 Commissions courses | Part Zwanga du relevé (`zwanga`) |
| 708 Services professionnels | Apports, avances et remboursements du dossier Services, dans leur devise |

Le taux de commission, la retenue de sept jours et le seuil de retrait de 50 jetons restent ceux du contrat financier. Ce plan ne les recalcule pas.

### Cycle

1. **Pièce.** Paiement `succeeded` ou `failed`, ligne du registre jetons, ligne du relevé de trajet à la complétion, ligne du grand livre Services, demande de financement `funded`.
2. **Journal automatique.** Une écriture équilibrée par pièce et par devise, `sourceType` + `sourceId` uniques. Rejouer l’événement ne crée pas une seconde écriture.
3. **Rapprochement.** L’employé finance lance le rapprochement déjà spécifié. L’écran montre : statut prestataire, statut Zwanga, écriture liée ou « en attente de pièce ». Il ne contient pas le payload FlexPay brut.
4. **Opération diverse.** Saisie manuelle : date, devise, deux lignes minimum, motif ≥ 10 caractères, pièce jointe facultative hors secret. Montant strictement inférieur à 50 000 CDF, ou 20 USD, ou 100 PTS : l’employé finance poste. Au-dessus : le super-admin poste, l’employé ne fait que préparer.
5. **Ajustement de jetons.** Inchangé dans le registre (`admin_adjustment`, `requestId`). L’employé prépare, le super-admin poste, le journal mémo PTS suit la ligne de registre.
6. **Balance et résultat.** Totaux par compte et par devise sur une période. Le résultat en francs additionne 706 et 708 et ne convertit pas les PTS.
7. **Clôture.** Le super-admin clôture un mois. Toute écriture dont la date tombe dans le mois clos est refusée en 409. Une réouverture est un événement d’audit, réservée au super-admin, et n’efface pas les écritures.

Écran `/accounting` : onglets Journal, Rapprochement, Balance, Clôture. Chaque ligne de journal ouvre la pièce d’origine (paiement, relevé, dossier Services, ligne de registre).

| ID | Priorité | Exigence |
|---|---|---|
| ACC-01 | P0 | Chaque paiement `succeeded` et chaque relevé de trajet terminé ont exactement une écriture équilibrée. |
| ACC-02 | P0 | CDF, USD et PTS ne se compensent pas entre eux. |
| ACC-03 | P0 | Le rapprochement réutilise le service existant et n’écrit pas `succeeded` à la main. |
| ACC-04 | P0 | Une période close refuse les écritures datées dedans. |
| ACC-05 | P0 | L’agent de validation et l’agent support reçoivent 403 sur `/accounting`. |
| ACC-06 | P1 | L’export de période reprend le journal et la balance, sans téléphone et sans payload prestataire. |
| ACC-07 | P1 | Une opération diverse au-dessus du seuil reste en brouillon tant que le super-admin ne l’a pas postée. |

## B.20 Flux opérationnel de bout en bout

L’admin devient le circuit unique d’une course et d’un dossier, de l’entrée jusqu’à l’argent et à la clôture. Chaque étape a un écran déjà nommé et un profil responsable.

| Étape | Écran | Profil qui agit |
|---|---|---|
| Entrée terrain ou demande documentaire | `/candidatures`, `/operations` | Responsable opérations |
| Compte et identité | `/crm/[partyId]`, `/users` | Responsable opérations |
| Validation conducteur | `/kyc` | Agent de validation |
| Demande, offre, réservation | `/trip-requests`, `/bookings` | Responsable opérations |
| Course en direct | `/operations/live` | Responsable opérations |
| Incident ou question | `/reports`, `/support` | Responsable opérations, agent support |
| Relevé de la course | `/trips` | Finance en lecture et écriture comptable, opérations en lecture |
| Encaissement, jetons, parrainage | `/payments`, `/tokens`, `/referrals` | Employé finance ; ajustement posté par le super-admin |
| Services et documents | `/pro-services` | Opérations pour le statut, finance pour les écritures |
| Journal et clôture du mois | `/accounting` | Employé finance, clôture par le super-admin |
| Qui a le droit de faire l’étape | `/settings/roles` | Super-admin |

Un objet ne change de mains que par l’assignation du dossier CRM. Le profil qui n’a pas la capacité voit l’étape comme absente, pas comme un bouton désactivé sans explication : le menu ne la propose pas.

## B.13 Critères de recette transverses

1. Aucune nouvelle page n’écrit un solde, un statut de paiement ou un compartiment de parrainage autrement que par les routes déjà contractuelles.
2. Deux admins qui assignent le même dossier : le second reçoit 409 et voit le propriétaire actuel sans perdre sa saisie de note.
3. Les écrans `/payments`, `/tokens`, `/referrals`, `/trips` (relevé), `/trip-requests` (édition avec `expectedUpdatedAt`) passent la même recette qu’avant le lot.
4. Un dossier Mongo historique reste consultable après migration, avec sa date d’origine dans la timeline.
5. La recherche d’un téléphone saisi `099…`, `+243…` ou `243…` ouvre la même partie.
6. Vérification navigateur de chaque lot : file, fiche, une mutation, un refus 403, un 409, viewport bureau et 390 px.
7. Avec un compte de chaque profil : la carte, le poste KYC et le journal n’apparaissent que dans les menus de la matrice B.4, et l’URL directe des autres répond 403.

## B.14 Risques et décisions

| Risque | Décision |
|---|---|
| Téléphones sales dans Mongo et Nest | Rapport de lot 0 bloquant. Pas de fusion automatique si deux `userId` partagent un numéro : file super-admin. |
| Badge actuel sous-estime la charge | Remplacé au lot 1. Jusque-là, le document d’exploitation rappelle le plafond de 100. |
| Position mobile absente ou ancienne | La carte affiche le trajet avec l’état « position en attente » ou l’âge du dernier point. Elle n’invente pas de coordonnées. |
| Images Didit | Le backend récupère la session côté serveur. Le navigateur reçoit des URL courtes, jamais la clé Didit. Zwanga ne constitue pas une seconde copie biométrique permanente. |
| Zone déduite du texte de lieu | Affichée comme estimation. Aucun objectif chiffré d’agent ne s’appuie dessus avant `departureZoneId`. |
| Droits trop larges des comptes `admin` | Le lot R pose `staffProfile` avant les nouveaux écrans. Un `admin` migré devient responsable opérations, sans ajustement de jetons ni décision KYC. |
| Double source pendant la reprise | Mongo passe en lecture seule seulement après sept jours de double écriture sans écart de volume. |

## B.15 Ordre de travail recommandé pour l’équipe

1. Geler ce document comme référence de recette.
2. Implémenter le lot 0 dans `zwanga-backend`, avec le rapport de téléphones.
3. Brancher ce dépôt au lot 1 sans retirer les pages actuelles.
4. Recetter le lot 1 sur un compte réel de staging : un conducteur, un passager, un ticket, un paiement.
5. Enchaîner le lot R, puis le lot 2 (carte), le lot K (KYC) et le lot C (comptabilité). Le lot 4 attend une décision explicite sur le push.

## B.16 Glossaire

| Terme | Sens dans Zwanga |
|---|---|
| Partie | Personne suivie par l’équipe, avec ou sans compte application |
| Dossier | Travail ouvert, lié à un objet métier ou à une demande entrante |
| Activité | Ligne de timeline, immuable |
| File | Liste serveur des dossiers à traiter |
| Course à risque | Signal P2, pas un jugement automatique de fraude |
| Relevé de trajet | `TripStatement` déjà calculé : recettes, commission, parrainage, dette de jetons |
| Jeton | Unité du portefeuille `PTS`, distincte du franc congolais |
| Zone | Une des 27 zones de déploiement déjà codées |
| Super-admin | Profil qui crée les comptes de personnel, clôture une période et poste les ajustements de jetons |
| Profil de personnel | `staffProfile` : super admin, responsable opérations, finance et comptabilité, agent de validation, agent support |
| Poste Didit | Écran de revue d’une session : pièces, visage, contrôles, décision |
| Journal | Écritures comptables produites depuis les pièces Zwanga, une devise à la fois |

---

Fin du CDC-CRM-OPS-001. Toute évolution de règle financière prime sur ce document et doit d’abord mettre à jour `docs/admin-finance-api-contract.md`.
