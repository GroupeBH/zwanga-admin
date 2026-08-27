"use client";

import { useState } from "react";
import { Download, RefreshCw, Search } from "lucide-react";

import {
  useGetAdminReferralAccountsQuery,
  useGetAdminReferralRewardsQuery,
  useGetAdminReferralWithdrawalsQuery,
  useReconcileReferralWithdrawalMutation,
} from "@/lib/features/finance/financeApi";
import {
  exportCsv,
  financeLabel,
  formatDateTime,
  formatMoney,
  formatTokens,
  formatUser,
} from "@/lib/features/finance/format";
import type {
  ReferralAccount,
  ReferralReward,
  ReferralRewardStatus,
  ReferralWithdrawal,
  ReferralWithdrawalStatus,
} from "@/lib/features/finance/types";

import styles from "../finance.module.css";

type View = "accounts" | "rewards" | "withdrawals";

const badgeClass = (status: string) => {
  if (["available", "succeeded"].includes(status)) {
    return `${styles.badge} ${styles.badgeSuccess}`;
  }
  if (["reversed", "failed", "cancelled"].includes(status)) {
    return `${styles.badge} ${styles.badgeDanger}`;
  }
  return `${styles.badge} ${styles.badgeWarning}`;
};

const getApiError = (error: unknown) => {
  const value = error as { status?: number; data?: { message?: string } };
  if (value?.status === 404) {
    return "La version actuellement déployée du backend ne contient pas les routes admin du parrainage. Déployez le lot FIN-REF-006.";
  }
  return value?.data?.message ?? "Impossible de charger les données de parrainage.";
};

export default function ReferralsPage() {
  const [view, setView] = useState<View>("accounts");
  const [page, setPage] = useState(1);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [rewardStatus, setRewardStatus] = useState<ReferralRewardStatus | "all">("all");
  const [withdrawalStatus, setWithdrawalStatus] = useState<ReferralWithdrawalStatus | "all">("all");

  const accountsQuery = useGetAdminReferralAccountsQuery({ page: view === "accounts" ? page : 1, limit: 25, search });
  const rewardsQuery = useGetAdminReferralRewardsQuery({ page: view === "rewards" ? page : 1, limit: 25, search, status: rewardStatus });
  const withdrawalsQuery = useGetAdminReferralWithdrawalsQuery({ page: view === "withdrawals" ? page : 1, limit: 25, search, status: withdrawalStatus });
  const [reconcileWithdrawal, reconcileState] = useReconcileReferralWithdrawalMutation();

  const summary = accountsQuery.data?.summary;
  const accounts = accountsQuery.data?.accounts ?? [];
  const rewards = rewardsQuery.data?.rewards ?? [];
  const withdrawals = withdrawalsQuery.data?.withdrawals ?? [];
  const activeQuery = view === "accounts" ? accountsQuery : view === "rewards" ? rewardsQuery : withdrawalsQuery;
  const activeTotal = activeQuery.data?.total ?? 0;
  const activeLimit = activeQuery.data?.limit ?? 25;
  const pages = Math.max(1, Math.ceil(activeTotal / activeLimit));
  const firstError = accountsQuery.error ?? rewardsQuery.error ?? withdrawalsQuery.error;

  const switchView = (next: View) => {
    setView(next);
    setPage(1);
  };

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setSearch(searchDraft.trim());
    setPage(1);
  };

  const handleReconcile = async (id: string) => {
    if (!confirm("Relancer la vérification FlexPay de ce retrait ?")) return;
    try {
      await reconcileWithdrawal(id).unwrap();
    } catch {
      // The inline error below keeps the operator on the same work surface.
    }
  };

  const handleExport = () => {
    const day = new Date().toISOString().slice(0, 10);
    if (view === "accounts") {
      exportCsv(
        `zwanga-parrainage-comptes-${day}.csv`,
        ["Utilisateur", "Code", "Filleuls", "En retenue", "Disponible", "Réservé", "Retiré", "Devise"],
        accounts.map((account) => [
          formatUser(account.user),
          account.profile?.code,
          account.directReferralsCount,
          account.pendingTokens,
          account.availableTokens,
          account.reservedTokens,
          account.withdrawnTokens,
          account.currency,
        ])
      );
      return;
    }
    if (view === "rewards") {
      exportCsv(
        `zwanga-parrainage-commissions-${day}.csv`,
        ["Date", "Parrain", "Filleul", "Source", "Brut", "Devise", "Taux", "Jetons", "Statut", "Libération"],
        rewards.map((reward) => [
          reward.createdAt,
          formatUser(reward.referrerUser),
          formatUser(reward.referredUser),
          reward.sourceType,
          reward.grossAmount,
          reward.sourceCurrency,
          reward.rate,
          reward.rewardTokens,
          reward.status,
          reward.holdUntil,
        ])
      );
      return;
    }
    exportCsv(
      `zwanga-parrainage-retraits-${day}.csv`,
      ["Date", "Utilisateur", "Jetons", "Montant", "Devise", "Téléphone", "Statut", "Transaction", "Motif échec"],
      withdrawals.map((withdrawal) => [
        withdrawal.requestedAt,
        formatUser(withdrawal.user),
        withdrawal.tokens,
        withdrawal.amount,
        withdrawal.currency,
        withdrawal.phone,
        withdrawal.status,
        withdrawal.paymentTransactionId,
        withdrawal.failureReason,
      ])
    );
  };

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>Croissance · audit financier</span>
          <h1>Parrainage</h1>
          <p>Attributions ChottuLink, commissions en retenue et retraits FlexPay.</p>
        </div>
        <div className={styles.headingActions}>
          <button type="button" className={styles.secondaryButton} onClick={() => activeQuery.refetch()} disabled={activeQuery.isFetching}>
            <RefreshCw size={15} /> Actualiser
          </button>
          <button type="button" className={styles.button} onClick={handleExport} disabled={activeTotal === 0}>
            <Download size={15} /> Exporter la vue
          </button>
        </div>
      </header>

      <section className={styles.metricStrip} aria-label="Synthèse du parrainage">
        <Metric label="Comptes parrains" value={summary?.accounts ?? accountsQuery.data?.total ?? 0} helper={`${summary?.referredUsers ?? 0} filleul(s) attribué(s)`} />
        <Metric label="En retenue" value={formatTokens(summary?.pendingTokens ?? 0)} helper="libération après 7 jours" />
        <Metric label="Disponible" value={formatTokens(summary?.availableTokens ?? 0)} helper={`${formatTokens(summary?.reservedTokens ?? 0)} réservé(s)`} />
        <Metric label="Déjà retiré" value={formatTokens(summary?.withdrawnTokens ?? 0)} helper={`${summary?.pendingWithdrawals ?? 0} retrait(s) à rapprocher`} />
      </section>

      {firstError ? <div className={styles.error}>{getApiError(firstError)}</div> : null}
      {reconcileState.error ? <div className={styles.error}>La vérification du retrait a échoué. Contrôlez la transaction et la route de rapprochement admin.</div> : null}

      <nav className={styles.tabs} aria-label="Vues du parrainage">
        <button className={`${styles.tab} ${view === "accounts" ? styles.tabActive : ""}`} onClick={() => switchView("accounts")}>Comptes parrains</button>
        <button className={`${styles.tab} ${view === "rewards" ? styles.tabActive : ""}`} onClick={() => switchView("rewards")}>Commissions</button>
        <button className={`${styles.tab} ${view === "withdrawals" ? styles.tabActive : ""}`} onClick={() => switchView("withdrawals")}>Retraits</button>
      </nav>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <h2>{view === "accounts" ? "Comptes et attributions" : view === "rewards" ? "Commissions générées" : "Demandes de retrait"}</h2>
            <p>{activeTotal} élément(s) selon les filtres.</p>
          </div>
          <form className={styles.filters} onSubmit={submitSearch}>
            <input
              aria-label="Rechercher dans le parrainage"
              placeholder="Utilisateur, téléphone, code…"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
            />
            {view === "rewards" ? (
              <select value={rewardStatus} onChange={(event) => { setPage(1); setRewardStatus(event.target.value as ReferralRewardStatus | "all"); }}>
                <option value="all">Tous les statuts</option>
                <option value="pending">En retenue</option>
                <option value="available">Disponibles</option>
                <option value="reversed">Annulées</option>
              </select>
            ) : null}
            {view === "withdrawals" ? (
              <select value={withdrawalStatus} onChange={(event) => { setPage(1); setWithdrawalStatus(event.target.value as ReferralWithdrawalStatus | "all"); }}>
                <option value="all">Tous les statuts</option>
                <option value="pending">En attente</option>
                <option value="initiated">Initiés</option>
                <option value="succeeded">Réussis</option>
                <option value="failed">Échoués</option>
                <option value="cancelled">Annulés</option>
              </select>
            ) : null}
            <button type="submit" className={styles.iconButton} aria-label="Rechercher"><Search size={16} /></button>
          </form>
        </div>

        {activeQuery.isFetching && activeTotal === 0 ? <div className={styles.empty}>Chargement de la vue…</div> : null}
        {!activeQuery.isFetching && activeTotal === 0 ? <div className={styles.empty}>Aucune donnée disponible dans cette vue.</div> : null}

        {view === "accounts" && accounts.length > 0 ? <AccountsTable accounts={accounts} /> : null}
        {view === "rewards" && rewards.length > 0 ? <RewardsTable rewards={rewards} /> : null}
        {view === "withdrawals" && withdrawals.length > 0 ? (
          <WithdrawalsTable withdrawals={withdrawals} onReconcile={handleReconcile} reconciling={reconcileState.isLoading} />
        ) : null}

        <Pagination page={page} pages={pages} total={activeTotal} onChange={setPage} />
      </section>
    </div>
  );
}

function AccountsTable({ accounts }: { accounts: ReferralAccount[] }) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead><tr><th>Parrain</th><th>Code et attribution</th><th>Filleuls</th><th>En retenue</th><th>Disponible</th><th>Réservé</th><th>Retiré</th></tr></thead>
        <tbody>
          {accounts.map((account) => (
            <tr key={account.id}>
              <td className={styles.userCell}><strong>{formatUser(account.user)}</strong><small>{account.user?.phone ?? account.userId}</small></td>
              <td className={styles.stack}><strong className={styles.reference}>{account.profile?.code ?? "—"}</strong><small>{account.profile?.attributionProvider ? `Attribué via ${account.profile.attributionProvider}` : "Lien personnel"}</small></td>
              <td>{account.directReferralsCount ?? 0}</td>
              <td>{formatTokens(account.pendingTokens)}</td>
              <td><strong className={styles.amountPositive}>{formatTokens(account.availableTokens)}</strong></td>
              <td>{formatTokens(account.reservedTokens)}</td>
              <td>{formatTokens(account.withdrawnTokens)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RewardsTable({ rewards }: { rewards: ReferralReward[] }) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead><tr><th>Date</th><th>Parrain</th><th>Filleul</th><th>Source</th><th>Base</th><th>Commission</th><th>Jetons</th><th>Statut</th><th>Libération</th></tr></thead>
        <tbody>
          {rewards.map((reward) => (
            <tr key={reward.id}>
              <td>{formatDateTime(reward.createdAt)}</td>
              <td className={styles.userCell}><strong>{formatUser(reward.referrerUser)}</strong><small>{reward.referrerUserId}</small></td>
              <td>{formatUser(reward.referredUser)}</td>
              <td>{financeLabel(reward.sourceType)}</td>
              <td>{formatMoney(reward.grossAmount, reward.sourceCurrency)}</td>
              <td>{formatMoney(reward.rewardAmount, reward.sourceCurrency)} <small className={styles.muted}>({Number(reward.rate) * 100} %)</small></td>
              <td><strong>{formatTokens(reward.rewardTokens)}</strong></td>
              <td><span className={badgeClass(reward.status)}>{financeLabel(reward.status)}</span></td>
              <td>{reward.status === "pending" ? formatDateTime(reward.holdUntil) : formatDateTime(reward.availableAt ?? reward.reversedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WithdrawalsTable({
  withdrawals,
  onReconcile,
  reconciling,
}: {
  withdrawals: ReferralWithdrawal[];
  onReconcile: (id: string) => void;
  reconciling: boolean;
}) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead><tr><th>Demandé le</th><th>Utilisateur</th><th>Jetons</th><th>Montant</th><th>Téléphone</th><th>Statut</th><th>Transaction</th><th>Traitement</th><th /></tr></thead>
        <tbody>
          {withdrawals.map((withdrawal) => (
            <tr key={withdrawal.id}>
              <td>{formatDateTime(withdrawal.requestedAt)}</td>
              <td className={styles.userCell}><strong>{formatUser(withdrawal.user)}</strong><small>{withdrawal.userId}</small></td>
              <td>{formatTokens(withdrawal.tokens)}</td>
              <td><strong>{formatMoney(withdrawal.amount, withdrawal.currency)}</strong></td>
              <td>{withdrawal.phone}</td>
              <td><span className={badgeClass(withdrawal.status)}>{financeLabel(withdrawal.status)}</span>{withdrawal.failureReason ? <small className={styles.amountNegative}>{withdrawal.failureReason}</small> : null}</td>
              <td className={styles.reference}>{withdrawal.paymentTransactionId ?? "—"}</td>
              <td>{formatDateTime(withdrawal.processedAt)}</td>
              <td>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  disabled={reconciling || withdrawal.status === "succeeded" || !withdrawal.paymentTransactionId}
                  onClick={() => onReconcile(withdrawal.id)}
                >
                  <RefreshCw size={14} /> Vérifier
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Metric({ label, value, helper }: { label: string; value: string | number; helper: string }) {
  return <div className={styles.metric}><span>{label}</span><strong>{value}</strong><small>{helper}</small></div>;
}

function Pagination({ page, pages, total, onChange }: { page: number; pages: number; total: number; onChange: (page: number) => void }) {
  return (
    <div className={styles.pagination}>
      <span>Page {page} sur {pages} · {total} élément(s)</span>
      <div className={styles.rowActions}>
        <button className={styles.secondaryButton} disabled={page <= 1} onClick={() => onChange(page - 1)}>Précédent</button>
        <button className={styles.secondaryButton} disabled={page >= pages} onClick={() => onChange(page + 1)}>Suivant</button>
      </div>
    </div>
  );
}
