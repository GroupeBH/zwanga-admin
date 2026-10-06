"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Coins, Download, Info, SlidersHorizontal, Search } from "lucide-react";

import { isAdminRole } from "@/lib/features/auth/adminRoles";
import { useExportAdminXlsMutation } from "@/lib/features/admin/exportApi";
import {
  useAdjustAdminWalletMutation,
  useGetAdminWalletAccountsQuery,
  useGetAdminWalletLedgerQuery,
} from "@/lib/features/finance/financeApi";
import { useGetCurrentUserProfileQuery } from "@/lib/features/profile/profileApi";
import {
  financeLabel,
  formatDateTime,
  formatTokens,
  formatUser,
} from "@/lib/features/finance/format";
import { getApiErrorMessage } from "@/lib/utils/apiErrors";
import { datedExportName, downloadBlob } from "@/lib/utils/downloadBlob";
import type {
  WalletAccount,
  WalletLedgerEntryType,
} from "@/lib/features/finance/types";

import styles from "../finance.module.css";

const ACCOUNT_PAGE_SIZE = 25;

type BalanceFilter = "all" | "positive" | "negative" | "zero";

const matchesBalance = (balance: number, filter: BalanceFilter) => {
  if (filter === "positive") return balance > 0;
  if (filter === "negative") return balance < 0;
  if (filter === "zero") return balance === 0;
  return true;
};

const getApiError = (error: unknown) => {
  const value = error as { status?: number; data?: { message?: string } };
  if (value?.status === 404) {
    return "Les routes d'administration du portefeuille ne sont pas encore déployées. Contrat attendu : GET /admin/wallets et GET /admin/wallets/ledger.";
  }
  return value?.data?.message ?? "Impossible de charger les portefeuilles de jetons.";
};

export default function TokensPage() {
  const [accountSearchDraft, setAccountSearchDraft] = useState("");
  const [accountSearch, setAccountSearch] = useState("");
  const [balanceFilter, setBalanceFilter] = useState<BalanceFilter>("all");
  const [accountPage, setAccountPage] = useState(1);
  const [ledgerSearchDraft, setLedgerSearchDraft] = useState("");
  const [ledgerSearch, setLedgerSearch] = useState("");
  const [ledgerPage, setLedgerPage] = useState(1);
  const [entryType, setEntryType] = useState<WalletLedgerEntryType | "all">("all");
  const [adjustedAccount, setAdjustedAccount] = useState<WalletAccount | null>(null);
  const [adjustmentDirection, setAdjustmentDirection] = useState<"credit" | "debit">("credit");
  const [exportAdminXls, { isLoading: isExporting }] = useExportAdminXlsMutation();
  const [exportError, setExportError] = useState<string | null>(null);

  const { data: profile } = useGetCurrentUserProfileQuery();
  const canAdjustWallets = isAdminRole(profile?.user.role);

  const balanceFiltered = balanceFilter !== "all";
  const accountsQuery = useGetAdminWalletAccountsQuery({
    page: balanceFiltered ? 1 : accountPage,
    limit: balanceFiltered ? 200 : ACCOUNT_PAGE_SIZE,
    search: accountSearch,
  });
  const ledgerQuery = useGetAdminWalletLedgerQuery({
    page: ledgerPage,
    limit: 25,
    search: ledgerSearch,
    type: entryType,
  });

  const fetchedAccounts = Array.isArray(accountsQuery.data?.accounts)
    ? accountsQuery.data.accounts
    : [];
  const matchingAccounts = balanceFiltered
    ? fetchedAccounts.filter((account) => matchesBalance(account.balance, balanceFilter))
    : fetchedAccounts;
  const accounts = balanceFiltered
    ? matchingAccounts.slice(
        (accountPage - 1) * ACCOUNT_PAGE_SIZE,
        accountPage * ACCOUNT_PAGE_SIZE,
      )
    : matchingAccounts;
  const entries = Array.isArray(ledgerQuery.data?.entries)
    ? ledgerQuery.data.entries
    : [];
  const summary = accountsQuery.data?.summary;
  const accountTotal = balanceFiltered
    ? matchingAccounts.length
    : (accountsQuery.data?.total ?? 0);
  const accountPages = Math.max(
    1,
    Math.ceil(accountTotal / (balanceFiltered ? ACCOUNT_PAGE_SIZE : (accountsQuery.data?.limit ?? ACCOUNT_PAGE_SIZE)))
  );
  const balanceFilterTruncated =
    balanceFiltered && (accountsQuery.data?.total ?? 0) > fetchedAccounts.length;
  const ledgerPages = Math.max(
    1,
    Math.ceil((ledgerQuery.data?.total ?? 0) / (ledgerQuery.data?.limit ?? 25))
  );

  const visibleMovement = useMemo(
    () => entries.reduce((total, entry) => total + Number(entry.amount ?? 0), 0),
    [entries]
  );

  const submitAccountSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setAccountSearch(accountSearchDraft.trim());
    setAccountPage(1);
  };

  const submitLedgerSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setLedgerSearch(ledgerSearchDraft.trim());
    setLedgerPage(1);
  };

  const exportLedger = async () => {
    setExportError(null);
    try {
      const blob = await exportAdminXls({
        url: "/admin/wallets/ledger/export",
        params: { search: ledgerSearch, type: entryType },
      }).unwrap();
      downloadBlob(blob, datedExportName("jetons-registre-zwanga"));
    } catch (error) {
      setExportError(
        getApiErrorMessage(error, "Impossible d'exporter le registre des jetons.")
      );
    }
  };

  const exportAccounts = async () => {
    setExportError(null);
    try {
      const blob = await exportAdminXls({
        url: "/admin/wallets/export",
        params: { search: accountSearch },
      }).unwrap();
      downloadBlob(blob, datedExportName("jetons-soldes-zwanga"));
    } catch (error) {
      setExportError(
        getApiErrorMessage(error, "Impossible d'exporter les soldes de jetons.")
      );
    }
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
            onClick={exportAccounts}
            disabled={isExporting}
          >
            <Download size={15} /> {isExporting ? "Export..." : "Exporter les soldes"}
          </button>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={exportLedger}
            disabled={isExporting}
          >
            <Download size={15} /> {isExporting ? "Export..." : "Exporter le registre"}
          </button>
        </div>
      </header>

      {exportError ? <div className={styles.error}>{exportError}</div> : null}

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

      {!canAdjustWallets ? (
        <div className={styles.notice}>
          Mode lecture seule : seuls les administrateurs peuvent ajuster un solde de jetons.
        </div>
      ) : null}

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <h2>Soldes utilisateurs</h2>
            <p>Un compte unique par utilisateur, libellé en jetons.</p>
          </div>
          <span className={styles.badge}>{accountTotal} compte(s)</span>
        </div>

        <form className={styles.filters} onSubmit={submitAccountSearch}>
          <div className={styles.filterField}>
            <label className={styles.filterLabel} htmlFor="wallet-user-search">
              Rechercher un utilisateur
            </label>
            <input
              id="wallet-user-search"
              aria-label="Rechercher un utilisateur"
              placeholder="Nom, téléphone, e-mail ou identifiant"
              value={accountSearchDraft}
              onChange={(event) => setAccountSearchDraft(event.target.value)}
            />
          </div>
          <div className={styles.filterField}>
            <label className={styles.filterLabel} htmlFor="wallet-balance-filter">
              Solde
            </label>
            <select
              id="wallet-balance-filter"
              value={balanceFilter}
              onChange={(event) => {
                setAccountPage(1);
                setBalanceFilter(event.target.value as BalanceFilter);
              }}
            >
              <option value="all">Tous les soldes</option>
              <option value="positive">Soldes positifs</option>
              <option value="negative">Soldes négatifs</option>
              <option value="zero">Soldes à zéro</option>
            </select>
          </div>
          <button type="submit" className={styles.button}>
            <Search size={15} /> Rechercher
          </button>
        </form>
        {balanceFilterTruncated ? (
          <p className={styles.helpText}>
            <Info size={16} aria-hidden="true" />
            <span>
              Le filtre de solde porte sur les 200 comptes les plus récemment mis à jour.
              Précisez le nom, le téléphone ou l’e-mail pour cibler un utilisateur.
            </span>
          </p>
        ) : null}

        {accountsQuery.error ? <div className={styles.error}>{getApiError(accountsQuery.error)}</div> : null}
        {accountsQuery.isFetching && accounts.length === 0 ? (
          <div className={styles.empty}>Chargement des portefeuilles…</div>
        ) : accounts.length === 0 ? (
          <div className={styles.empty}>
            {accountSearch || balanceFilter !== "all"
              ? "Aucun utilisateur ne correspond à cette recherche."
              : "Aucun portefeuille disponible."}
          </div>
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
                      {account.user?.email ? <small>{account.user.email}</small> : null}
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
                      <div className={styles.rowActions}>
                        <button
                          type="button"
                          className={styles.secondaryButton}
                          disabled={!canAdjustWallets}
                          title={
                            canAdjustWallets
                              ? "Ajouter des jetons utilisables, non retirables en argent"
                              : "Action réservée aux administrateurs"
                          }
                          onClick={() => {
                            if (!canAdjustWallets) return;
                            setAdjustmentDirection("credit");
                            setAdjustedAccount(account);
                          }}
                        >
                          <SlidersHorizontal size={14} /> Ajouter
                        </button>
                        <button
                          type="button"
                          className={styles.dangerButton}
                          disabled={
                            !canAdjustWallets ||
                            account.balance <= 0 ||
                            account.withdrawalsBlocked
                          }
                          title={
                            !canAdjustWallets
                              ? "Action réservée aux administrateurs"
                              : account.withdrawalsBlocked
                                ? "Les débits sont bloqués sur ce portefeuille"
                                : account.balance <= 0
                                  ? "Aucun jeton à retirer"
                                  : "Retirer des jetons du solde disponible"
                          }
                          onClick={() => {
                            if (!canAdjustWallets || account.balance <= 0 || account.withdrawalsBlocked) return;
                            setAdjustmentDirection("debit");
                            setAdjustedAccount(account);
                          }}
                        >
                          Retirer
                        </button>
                      </div>
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
          total={accountTotal}
          onChange={setAccountPage}
        />
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <h2>Registre des mouvements</h2>
            <p>Écritures signées et solde calculé après chaque opération.</p>
          </div>
        </div>
        <form className={styles.filters} onSubmit={submitLedgerSearch}>
            <div className={styles.filterField}>
              <label className={styles.filterLabel} htmlFor="ledger-user-search">
                Utilisateur
              </label>
              <input
                id="ledger-user-search"
                aria-label="Rechercher dans le registre"
                placeholder="Nom, téléphone ou e-mail"
                value={ledgerSearchDraft}
                onChange={(event) => setLedgerSearchDraft(event.target.value)}
              />
            </div>
            <div className={styles.filterField}>
              <label className={styles.filterLabel} htmlFor="ledger-type">
                Type de mouvement
              </label>
              <select
                id="ledger-type"
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
            <button type="submit" className={styles.button}>
              <Search size={15} /> Filtrer
            </button>
          </form>

        <p className={styles.helpText}>
          <Info size={16} aria-hidden="true" />
          <span>
            Un crédit ajoute des jetons au compte, un débit en retire. Chaque
            ajustement manuel exige un motif et reste tracé dans ce registre.
          </span>
        </p>

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
        <AdjustmentModal
          key={`${adjustedAccount.id}-${adjustmentDirection}`}
          account={adjustedAccount}
          initialDirection={adjustmentDirection}
          onClose={() => setAdjustedAccount(null)}
        />
      ) : null}
    </div>
  );
}

function AdjustmentModal({
  account,
  initialDirection,
  onClose,
}: {
  account: WalletAccount;
  initialDirection: "credit" | "debit";
  onClose: () => void;
}) {
  const [direction, setDirection] = useState<"credit" | "debit">(initialDirection);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [requestId] = useState(() => globalThis.crypto.randomUUID());
  const [adjustWallet, state] = useAdjustAdminWalletMutation();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0 || reason.trim().length < 10) {
      return;
    }
    const signedAmount = direction === "credit" ? numericAmount : -numericAmount;
    if (signedAmount < 0 && numericAmount > account.balance) return;
    if (!confirm(`${direction === "credit" ? "Ajouter" : "Retirer"} ${formatTokens(numericAmount)} ${direction === "credit" ? "à" : "de"} ${formatUser(account.user)} ?`)) {
      return;
    }
    try {
      await adjustWallet({
        userId: account.userId,
        amount: signedAmount,
        reason: reason.trim(),
        requestId,
      }).unwrap();
      onClose();
    } catch {
      // Error is rendered below.
    }
  };

  const invalid = Number(amount) <= 0 || reason.trim().length < 10;

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className={styles.modalBackdrop} role="presentation" onMouseDown={() => onCloseRef.current()}>
      <form
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="wallet-adjustment-title"
        onSubmit={submit}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <span className={styles.eyebrow}><Coins size={14} /> Ajustement audité</span>
        <h2 id="wallet-adjustment-title">
          {direction === "credit" ? "Ajouter des jetons" : "Retirer des jetons"}
        </h2>
        <p>
          {formatUser(account.user)} dispose actuellement de {formatTokens(account.balance)}.
          {direction === "credit"
            ? " Les jetons ajoutés ici sont utilisables dans l’application, mais ne sont pas retirables en argent."
            : " Le retrait ne peut pas dépasser le solde actuel."}
        </p>
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
        {direction === "debit" && Number(amount) > account.balance ? (
          <div className={styles.formError}>Le nombre de jetons à retirer dépasse le solde disponible.</div>
        ) : null}
        {state.error ? (
          <div className={styles.formError}>
            {getApiErrorMessage(state.error, "L’ajustement a échoué.")}
          </div>
        ) : null}
        <div className={styles.modalActions}>
          <button type="button" className={styles.secondaryButton} onClick={() => onCloseRef.current()}>Annuler</button>
          <button type="submit" className={direction === "debit" ? styles.dangerButton : styles.button} disabled={invalid || state.isLoading || (direction === "debit" && Number(amount) > account.balance)}>
            {state.isLoading ? "Enregistrement…" : direction === "credit" ? "Créditer" : "Débiter"}
          </button>
        </div>
      </form>
    </div>,
    document.body,
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
