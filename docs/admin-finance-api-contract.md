# Contrat d'administration financière Zwanga

Date d'analyse : 31 août 2026.

## Complément du 23 octobre 2026 : retraits bloqués

Le parcours de résolution est raccordé aux composants et classes CSS financiers
existants, sans modification du thème ni des fichiers de style.

- **Parrainage → Retraits → Détails / traiter** : accès au dossier même si
  aucune transaction n'a été créée. Lecture admin/super-admin ; vérification et
  libération réservées au super-admin.
- **Paiements → Retraits de gains à examiner** : liste paginée des dossiers
  signalés, anciens, sans commande ou avec incident. Cette liste n'est pas la
  liste exhaustive des retraits. Un identifiant UUID de retrait permet d'ouvrir
  un dossier récent. Actions autorisées aux admins et super-admins.
- Dans le détail d'un paiement conducteur/parrainage lié, **Ouvrir le dossier de
  retrait** utilise `relatedEntityId`, jamais l'identifiant du paiement.

Les appels réutilisent `baseApi` et le JWT existant. Toutes les routes sont
relatives à `NEXT_PUBLIC_API_PUBLIC_URL`, comme le reste de l'admin.

| Route | Fonction |
| --- | --- |
| `GET /admin/driver-payouts?limit=25&offset=0` | File des gains à examiner |
| `GET /admin/driver-payouts/:id` | Dossier et historique d'interventions |
| `GET /admin/referrals/withdrawals/:id` | Dossier et preuve de résolution |
| `POST /admin/driver-payouts/:id/reconcile` | Vérifier sans renvoyer, avec `{}` ou `{"orderNumber":"REFERENCE_RETROUVEE"}` |
| `POST /admin/referrals/withdrawals/:id/reconcile` | Vérifier sans renvoyer, y compris sans transaction créée |
| `POST /admin/driver-payouts/:id/resolve-not-paid` | Libérer après confirmation définitive externe |
| `POST /admin/referrals/withdrawals/:id/resolve-not-paid` | Libérer les jetons de parrainage après confirmation définitive externe |
| `POST /admin/driver-payouts/:id/close-late-success` | Clôturer l'incident après rapprochement financier, sans rembourser |

Les deux résolutions transmettent `expectedReference` issue du dossier relu,
`reason` (5–500 caractères), `evidenceReference` (5–200 caractères) et
`confirmedNotPaid: true`. Le motif et la preuve sont obligatoires, la confirmation
reste décochée par défaut. La clôture d'incident transmet seulement le motif et
la référence du rapprochement financier.

**Une libération locale n'annule pas un virement chez FlexPaie.** Une absence de
provision, l'âge du retrait, un ticket ouvert ou une réponse « introuvable » ne
constituent pas une confirmation définitive de non-exécution. Le backend reste
l'autorité, impose notamment le délai de sécurité de 15 minutes et garde l'audit.
L'interface distingue le statut du retrait de celui de la transaction prestataire.
Un succès tardif est visible : restitution redébitée côté parrainage, incident à
rapprocher côté gains conducteur.

Le dossier est relu avant toute mutation ; les doubles clics sont bloqués. Les
comptes, paiements, utilisateurs et synthèses financières sont invalidés après
traitement, même si la réponse réseau est incertaine. Aucune réémission de retrait
n'est déclenchée par ces actions. Une actualisation échouée après une mutation
acceptée laisse le message d'acceptation visible et bloque les actions suivantes.
Sans `canResolveNotPaid`, `expectedReference` et
`resolutionRequiresProviderConfirmation`, aucune libération n'est proposée.

Prérequis : déployer le correctif backend et exécuter la migration
`1780000090000-ReferralWithdrawalResolution` avant d'utiliser le détail/résolution
du parrainage. Une route absente est signalée et n'entraîne aucun contournement.
Les garanties serveur et la procédure sont détaillées dans
`zwanga-backend/docs/finance/driver-payout-corrections.md`.

Validation locale : `node --test lib/features/finance/payoutRecovery.test.cjs`
(18 tests : règles, contrats, rendu React et gestionnaires simulés), ainsi que
les quatre autres suites `.test.cjs` existantes, soit 30 tests réussis.
`node node_modules/typescript/bin/tsc --noEmit --incremental false` et
`npm run build` réussissent. Aucun appel financier réel ni recette navigateur
authentifiée n'a été exécuté. Aucun déploiement, changement AWS/CI/CD ou ajout de
dépendance n'est inclus.

## État du backend analysé

Le backend `zwanga-backend` contient déjà les modèles et flux métier suivants :

- `payment_transactions` pour FlexPay, avec les objets `subscription_pro`, `trip_booking`, `wallet_top_up`, `driver_payout` et `referral_payout` ;
- `wallet_accounts` et le registre append-only `wallet_ledger_entries` ;
- achat et transfert de jetons, paiement de réservation/abonnement, remboursements et bonus d'abonnement de 25 jetons ;
- programme de parrainage ChottuLink avec comptes séparés `pending`, `available`, `reserved` et `withdrawn` ;
- commission de 5 %, retenue de sept jours, fenêtre de rémunération de douze mois et retrait FlexPay à partir de 50 jetons.

Les contrôleurs utilisateur limitent `/payments`, `/wallet` et `/referrals` aux données du compte authentifié. Les lots `FIN-WALLET-ADMIN-001` et `FIN-REF-006` ajoutent maintenant les vues globales des portefeuilles et du parrainage dans `AdminController`. Le contrat global des paiements décrit plus bas reste à déployer séparément.

L'interface admin utilise donc les contrats ci-dessous. La page Paiements possède temporairement un repli limité aux 20 premières fiches utilisateurs afin de rester sous la limite admin de 30 requêtes par minute. Les pages Jetons et Parrainage sont raccordées à leurs routes backend dédiées.

## Règles transversales

- Les routes de lecture sont protégées par JWT et acceptent `UserRole.ADMIN` ou `UserRole.SUPER_ADMIN`.
- Les mutations financières sensibles exigent `UserRole.SUPER_ADMIN`, sauf les
  routes de résolution conducteur décrites ci-dessus, également ouvertes à
  `UserRole.ADMIN` conformément au backend.
- La pagination accepte `page`, `limit` (maximum 200), `search` et les filtres indiqués.
- Chaque réponse paginée contient `total`, `page` et `limit`.
- Les montants numériques sont sérialisés en nombres, pas en chaînes PostgreSQL `numeric`.
- Aucune réponse ne contient de payload FlexPay brut, de secret, de token de lien opaque ou de jeton d'authentification.
- Les modifications financières exigent un motif, l'identifiant de l'admin et une écriture comptable append-only.
- Un rapprochement consulte FlexPay et applique les services métier existants ; il ne force jamais directement un statut `succeeded`.

## Paiements

### `GET /admin/payments`

Filtres : `status`, `purpose`, `method`, `search`, `page`, `limit`.

```json
{
  "payments": [],
  "total": 0,
  "page": 1,
  "limit": 25,
  "summary": {
    "total": 0,
    "pending": 0,
    "succeeded": 0,
    "failed": 0,
    "succeededVolume": [{ "currency": "CDF", "amount": 0 }]
  }
}
```

Chaque paiement reprend la vue assainie de `PaymentTransaction` et ajoute `user` avec `id`, `firstName`, `lastName`, `phone`, `email`, `role`, `status` et `isDriver`.

### `POST /admin/payments/:paymentId/reconcile`

Relance `PaymentsService.checkPaymentStatus` avec le propriétaire de la transaction, puis les raccordements métier existants (abonnement, portefeuille ou retrait). La réponse ne contient que le paiement assaini et un éventuel message.

Cette action est réservée au super administrateur dans l'interface.

## Jetons

### `GET /admin/wallets`

Retour : `accounts`, pagination et synthèse globale.

```json
{
  "accounts": [],
  "total": 0,
  "page": 1,
  "limit": 25,
  "summary": {
    "accounts": 0,
    "totalBalance": 0,
    "positiveBalances": 0,
    "negativeBalances": 0,
    "currency": "PTS"
  }
}
```

Chaque compte inclut l'utilisateur assaini.

### `GET /admin/wallets/ledger`

Filtres supplémentaires : `type`. Retour : `entries`, `total`, `page`, `limit`. Chaque écriture inclut l'utilisateur assaini, mais pas les réponses FlexPay brutes.

### `POST /admin/wallets/:userId/adjustments`

Route réservée au super administrateur.

```json
{
  "requestId": "123e4567-e89b-12d3-a456-426614174000",
  "amount": 25,
  "reason": "Régularisation validée sous le ticket SUP-1042"
}
```

`amount` est signé : positif pour un crédit, négatif pour un débit. Le backend verrouille le compte, interdit un montant nul et écrit une ligne `admin_adjustment` avec le motif et l'admin. `requestId` est stable pendant toute tentative et garantit l'idempotence grâce à un index unique. La migration `1780000023000` ajoute ce type au registre.

## Parrainage

### `GET /admin/referrals/accounts`

Retour : `accounts`, pagination et synthèse globale. Chaque ligne regroupe le profil, le compte, l'utilisateur assaini et `directReferralsCount`. Le champ public `shareLinkUrl` peut être inclus ; `linkToken` et `attributionLinkToken` doivent rester absents.

```json
{
  "accounts": [],
  "total": 0,
  "page": 1,
  "limit": 25,
  "summary": {
    "accounts": 0,
    "referredUsers": 0,
    "pendingTokens": 0,
    "availableTokens": 0,
    "reservedTokens": 0,
    "withdrawnTokens": 0,
    "pendingWithdrawals": 0,
    "currency": "PTS"
  }
}
```

### `GET /admin/referrals/rewards`

Filtres supplémentaires : `status`. Retour : `rewards`, pagination, parrain et filleul assainis. Le taux, le brut, la valeur historique du jeton, les jetons, la retenue et l'éventuelle inversion restent visibles pour l'audit.

### `GET /admin/referrals/withdrawals`

Filtres supplémentaires : `status`. Retour : `withdrawals`, pagination, utilisateur et transaction de paiement assainis.

### `POST /admin/referrals/withdrawals/:withdrawalId/reconcile`

Route réservée au super administrateur.

Retrouve la transaction liée, vérifie son statut chez FlexPay, puis appelle la réconciliation idempotente existante. Aucun retrait ne doit être marqué manuellement comme réussi.

## Vérifications backend recommandées

1. Ajouter les entités financières à `AdminModule` et des services de lecture dédiés.
2. Tester les permissions admin et la suppression des champs sensibles.
3. Tester les agrégats avec plusieurs devises sans conversion implicite.
4. Tester l'idempotence des rapprochements et des ajustements.
5. Rapprocher `wallet_accounts` avec le registre et les quatre compartiments de parrainage avant déploiement.
6. Appliquer les migrations jusqu'à `1780000024000` dans l'ordre prévu par le backend.
