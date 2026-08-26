# Contrat d'administration financière Zwanga

Date d'analyse : 25 août 2026.

## État du backend analysé

Le backend `zwanga-backend` contient déjà les modèles et flux métier suivants :

- `payment_transactions` pour FlexPay, avec les objets `subscription_pro`, `trip_booking`, `wallet_top_up`, `driver_payout` et `referral_payout` ;
- `wallet_accounts` et le registre append-only `wallet_ledger_entries` ;
- achat et transfert de jetons, paiement de réservation/abonnement, remboursements et bonus d'abonnement de 25 jetons ;
- programme de parrainage ChottuLink avec comptes séparés `pending`, `available`, `reserved` et `withdrawn` ;
- commission de 5 %, retenue de sept jours, fenêtre de rémunération de douze mois et retrait FlexPay à partir de 50 jetons.

Les contrôleurs actuels limitent cependant `/payments`, `/wallet` et `/referrals` aux données du compte authentifié. `AdminController` ne publie pour l'instant aucune liste globale de paiements, de portefeuilles ou de parrainages. Seuls les paiements d'un utilisateur sont indirectement visibles via `GET /admin/users/:userId/details`.

L'interface admin utilise donc les contrats ci-dessous. La page Paiements possède temporairement un repli limité aux 20 premières fiches utilisateurs afin de rester sous la limite admin de 30 requêtes par minute ; les pages Jetons et Parrainage signalent explicitement un `404` tant que leurs routes ne sont pas déployées.

## Règles transversales

- Toutes les routes sont protégées par JWT et `UserRole.ADMIN`.
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

```json
{
  "amount": 25,
  "reason": "Régularisation validée sous le ticket SUP-1042"
}
```

`amount` est signé : positif pour un crédit, négatif pour un débit. Le backend verrouille le compte, interdit un montant nul et écrit une ligne `admin_adjustment` avec le motif et l'admin. Une migration doit ajouter ce type au registre si nécessaire.

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

Retrouve la transaction liée, vérifie son statut chez FlexPay, puis appelle la réconciliation idempotente existante. Aucun retrait ne doit être marqué manuellement comme réussi.

## Vérifications backend recommandées

1. Ajouter les entités financières à `AdminModule` et des services de lecture dédiés.
2. Tester les permissions admin et la suppression des champs sensibles.
3. Tester les agrégats avec plusieurs devises sans conversion implicite.
4. Tester l'idempotence des rapprochements et des ajustements.
5. Rapprocher `wallet_accounts` avec le registre et les quatre compartiments de parrainage avant déploiement.
6. Appliquer les migrations `1780000016000`, `1780000018000`, `1780000019000` et `1780000020000` dans l'ordre prévu par le backend.
