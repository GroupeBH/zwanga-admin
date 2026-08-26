"use client";

import { useMemo, useState } from "react";
import { Coins, Download, SlidersHorizontal, Search } from "lucide-react";

import {
  useAdjustAdminWalletMutation,
  useGetAdminWalletAccountsQuery,
  useGetAdminWalletLedgerQuery,
} from "@/lib/features/finance/financeApi";
import {
  exportCsv,
  financeLabel,
  formatDateTime,
  formatTokens,
  formatUser,
} from "@/lib/features/finance/format";
import type {
  WalletAccount,
  WalletLedgerEntryType,
} from "@/lib/features/finance/types";

import styles from "../finance.module.css";

const getApiError = (error: unknown) => {
  const value = error as { status?: number; data?: { message?: string } };
  if (value?.status === 404) {
    return "Les routes d'administration du portefeuille ne sont pas encore déployées. Contrat attendu : GET /admin/wallets et GET /admin/wallets/ledger.";
  }
  return value?.data?.message ?? "Impossible de charger les portefeuilles de jetons.";
};

export default function TokensPage() {
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [accountPage, setAccountPage] = useState(1);
  const [ledgerPage, setLedgerPage] = useState(1);
  const [entryType, setEntryType] = useState<WalletLedgerEntryType | "all">("all");
  const [adjustedAccount, setAdjustedAccount] = useState<WalletAccount | null>(null);

  const accountsQuery = useGetAdminWalletAccountsQuery({
    page: accountPage,
    limit: 25,
    search,
  });
  const ledgerQuery = useGetAdminWalletLedgerQuery({
    page: ledgerPage,
    limit: 25,
    search,
    type: entryType,
  });

  const accounts = accountsQuery.data?.accounts ?? [];
  const entries = ledgerQuery.data?.entries ?? [];
  const summary = accountsQuery.data?.summary;
  const accountPages = Math.max(
    1,
    Math.ceil((accountsQuery.data?.total ?? 0) / (accountsQuery.data?.limit ?? 25))
  );
  const ledgerPages = Math.max(
    1,
    Math.ceil((ledgerQuery.data?.total ?? 0) / (ledgerQuery.data?.limit ?? 25))
  );

  const visibleMovement = useMemo(
    () => entries.reduce((total, entry) => total + Number(entry.amount ?? 0), 0),
    [entries]
  );

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setSearch(searchDraft.trim());
    setAccountPage(1);
    setLedgerPage(1);
  };

  const exportLedger = () => {
    exportCsv(
      `zwanga-registre-jetons-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Date", "Utilisateur", "Type", "Mouvement", "Solde après", "Devise", "Description"],
      entries.map((entry) => [
        entry.createdAt,
        formatUser(entry.user),
        financeLabel(entry.type),
        entry.amount,
        entry.balanceAfter,
        entry.currency,
        entry.description,
      ])
    );
  };

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>Finance · monnaie interne</span>
          <h1>Jetons Zwanga</h1>
          <p>Soldes utilisateurs, transferts, récompenses et registre comptable.</p>
        </div>
        <div className={styles.headingActions}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={exportLedger}
            disabled={entries.length === 0}
          >
            <Download size={15} /> Exporter le registre
          </button>
        </div>
      </header>

      <section className={styles.metricStrip} aria-label="Synthèse des jetons">
        <Metric
          label="Jetons en circulation"
          value={formatTokens(summary?.totalBalance ?? 0)}
          helper={`${summary?.accounts ?? accountsQuery.data?.total ?? 0} portefeuille(s)`}
        />
        <Metric
          label="Soldes positifs"
          value={summary?.positiveBalances ?? 0}
          helper="comptes crédités"
        />
        <Metric
          label="Soldes négatifs"
          value={summary?.negativeBalances ?? 0}
          helper="anomalies à rapprocher"
        />
        <Metric
          label="Mouvement de la page"
          value={formatTokens(visibleMovement)}
          helper={`${entries.length} écriture(s)`}
        />
      </section>

      <form className={styles.filters} onSubmit={submitSearch}>
        <input
          aria-label="Rechercher un portefeuille"
          placeholder="Nom, téléphone ou identifiant utilisateur…"
          value={searchDraft}
          onChange={(event) => setSearchDraft(event.target.value)}
        />
        <button type="submit" className={styles.button}>
          <Search size={15} /> Rechercher
        </button>
      </form>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <h2>Soldes utilisateurs</h2>
            <p>Un compte unique par utilisateur, libellé en points.</p>
          </div>
          <span className={styles.badge}>{accountsQuery.data?.total ?? 0} compte(s)</span>
        </div>

        {accountsQuery.error ? <div className={styles.error}>{getApiError(accountsQuery.error)}</div> : null}
        {accountsQuery.isFetching && accounts.length === 0 ? (
          <div className={styles.empty}>Chargement des portefeuilles…</div>
        ) : accounts.length === 0 ? (
          <div className={styles.empty}>Aucun portefeuille disponible.</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Utilisateur</th>
                  <th>Solde</th>
                  <th>Type</th>
                  <th>Dernière mise à jour</th>
                  <th>Identifiant compte</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.id}>
                    <td className={styles.userCell}>
                      <strong>{formatUser(account.user)}</strong>
                      <small>{account.user?.phone ?? account.userId}</small>
                    </td>
                    <td>
                      <strong className={account.balance < 0 ? styles.amountNegative : styles.amountPositive}>
                        {formatTokens(account.balance)}
                      </strong>
                    </td>
                    <td><span className={styles.badge}>Jetons</span></td>
                    <td>{formatDateTime(account.updatedAt)}</td>
                    <td className={styles.reference}>{account.id}</td>
                    <td>
                      <button
                        type="button"
                        className={styles.secondaryButton}
                        onClick={() => setAdjustedAccount(account)}
                      >
                        <SlidersHorizontal size={14} /> Ajuster
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination
          page={accountPage}
          pages={accountPages}
          total={accountsQuery.data?.total ?? 0}
          onChange={setAccountPage}
        />
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <h2>Registre des mouvements</h2>
            <p>Écritures signées et solde calculé après chaque opération.</p>
          </div>
          <div className={styles.filters}>
            <select
              aria-label="Filtrer les écritures"
              value={entryType}
              onChange={(event) => {
                setLedgerPage(1);
                setEntryType(event.target.value as WalletLedgerEntryType | "all");
              }}
            >
              <option value="all">Tous les mouvements</option>
              <option value="top_up">Achats</option>
              <option value="loyalty_reward">Fidélité</option>
              <option value="booking_payment">Réservations</option>
              <option value="subscription_payment">Abonnements</option>
              <option value="subscription_reward">Récompenses abonnement</option>
              <option value="transfer_out">Transferts sortants</option>
              <option value="transfer_in">Transferts entrants</option>
              <option value="admin_adjustment">Ajustements admin</option>
            </select>
          </div>
        </div>

        {ledgerQuery.error ? <div className={styles.error}>{getApiError(ledgerQuery.error)}</div> : null}
        {ledgerQuery.isFetching && entries.length === 0 ? (
          <div className={styles.empty}>Chargement du registre…</div>
        ) : entries.length === 0 ? (
          <div className={styles.empty}>Aucune écriture disponible.</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Utilisateur</th>
                  <th>Type</th>
                  <th>Mouvement</th>
                  <th>Solde après</th>
                  <th>Source</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td>{formatDateTime(entry.createdAt)}</td>
                    <td className={styles.userCell}>
                      <strong>{formatUser(entry.user)}</strong>
                      <small>{entry.userId}</small>
                    </td>
                    <td>{financeLabel(entry.type)}</td>
                    <td>
                      <strong className={entry.amount < 0 ? styles.amountNegative : styles.amountPositive}>
                        {entry.amount > 0 ? "+" : ""}{formatTokens(entry.amount)}
                      </strong>
                    </td>
                    <td>{formatTokens(entry.balanceAfter)}</td>
                    <td className={styles.stack}>
                      <strong>{entry.relatedEntityType ?? "—"}</strong>
                      <small className={styles.reference}>{entry.relatedEntityId ?? entry.paymentTransactionId ?? "—"}</small>
                    </td>
                    <td>{entry.description ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination
          page={ledgerPage}
          pages={ledgerPages}
          total={ledgerQuery.data?.total ?? 0}
          onChange={setLedgerPage}
        />
      </section>

      {adjustedAccount ? (
        <AdjustmentModal account={adjustedAccount} onClose={() => setAdjustedAccount(null)} />
      ) : null}
    </div>
  );
}

function AdjustmentModal({ account, onClose }: { account: WalletAccount; onClose: () => void }) {
  const [direction, setDirection] = useState<"credit" | "debit">("credit");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [adjustWallet, state] = useAdjustAdminWalletMutation();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0 || reason.trim().length < 10) {
      return;
    }
    const signedAmount = direction === "credit" ? numericAmount : -numericAmount;
    if (!confirm(`${direction === "credit" ? "Créditer" : "Débiter"} ${formatTokens(numericAmount)} pour ${formatUser(account.user)} ?`)) {
      return;
    }
    try {
      await adjustWallet({ userId: account.userId, amount: signedAmount, reason: reason.trim() }).unwrap();
      onClose();
    } catch {
      // Error is rendered below.
    }
  };

  const invalid = Number(amount) <= 0 || reason.trim().length < 10;

  return (
    <div className={styles.modalBackdrop} role="presentation" onMouseDown={onClose}>
      <form className={styles.modal} onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
        <span className={styles.eyebrow}><Coins size={14} /> Ajustement audité</span>
        <h2>Modifier le solde</h2>
        <p>{formatUser(account.user)} dispose actuellement de {formatTokens(account.balance)}.</p>
        <div className={styles.formGrid}>
          <label className={styles.field}>
            Opération
            <select value={direction} onChange={(event) => setDirection(event.target.value as "credit" | "debit")}>
              <option value="credit">Crédit manuel</option>
              <option value="debit">Débit manuel</option>
            </select>
          </label>
          <label className={styles.field}>
            Nombre de jetons
            <input type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required />
          </label>
          <label className={`${styles.field} ${styles.fieldWide}`}>
            Motif d’audit
            <textarea maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Minimum 10 caractères : correction, geste commercial, régularisation…" required />
          </label>
        </div>
        {state.error ? <div className={styles.formError}>L’ajustement a échoué. Vérifiez le contrat POST /admin/wallets/:userId/adjustments.</div> : null}
        <div className={styles.modalActions}>
          <button type="button" className={styles.secondaryButton} onClick={onClose}>Annuler</button>
          <button type="submit" className={direction === "debit" ? styles.dangerButton : styles.button} disabled={invalid || state.isLoading}>
            {state.isLoading ? "Enregistrement…" : direction === "credit" ? "Créditer" : "Débiter"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Metric({ label, value, helper }: { label: string; value: string | number; helper: string }) {
  return <div className={styles.metric}><span>{label}</span><strong>{value}</strong><small>{helper}</small></div>;
}

function Pagination({ page, pages, total, onChange }: { page: number; pages: number; total: number; onChange: (value: number) => void }) {
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
