"use client";

import { useRef, useState } from "react";
import {
  Ban,
  CheckCircle2,
  Download,
  Info,
  RefreshCw,
  Search,
  X,
} from "lucide-react";

import { useExportAdminXlsMutation } from "@/lib/features/admin/exportApi";
import {
  useCancelEnqueuedPayoutMutation,
  useGetAdminPaymentsQuery,
  useReconcileAdminPaymentMutation,
} from "@/lib/features/finance/financeApi";
import { isSuperAdminRole } from "@/lib/features/auth/adminRoles";
import { useGetCurrentUserProfileQuery } from "@/lib/features/profile/profileApi";
import {
  financeLabel,
  formatDateTime,
  formatMoney,
  formatUser,
  formatVolumes,
} from "@/lib/features/finance/format";
import { getApiErrorMessage } from "@/lib/utils/apiErrors";
import { paymentReconciliationError, paymentReconciliationMessage } from "@/lib/features/finance/paymentReconciliation";
import { datedExportName, downloadBlob } from "@/lib/utils/downloadBlob";
import type {
  AdminPaymentTransaction,
  PaymentPurpose,
} from "@/lib/features/finance/types";
import type { PaymentStatus } from "@/lib/features/admin/types";

import { SegmentedBar } from "@/app/components/charts/DataCharts";
import styles from "../finance.module.css";
import { DriverPayoutReviews } from "./DriverPayoutReviews";
import { PayoutRecoveryDrawer } from "./PayoutRecoveryDrawer";
import { DirectPayoutDrawer } from "./DirectPayoutDrawer";
import type { PayoutTarget } from "@/lib/features/finance/payoutRecovery";

import { confirmAction } from "@/app/components/ui/Feedback";

import { useUrlState } from "@/lib/utils/useUrlState";

import { SkeletonList } from "@/app/components/ui/Skeleton";

const statusClass = (status: PaymentStatus) => {
  if (status === "succeeded") return `${styles.badge} ${styles.badgeSuccess}`;
  if (["failed", "cancelled"].includes(status)) {
    return `${styles.badge} ${styles.badgeDanger}`;
  }
  return `${styles.badge} ${styles.badgeWarning}`;
};

const PAYOUT_PURPOSES: PaymentPurpose[] = [
  "driver_payout",
  "wallet_payout",
  "referral_payout",
];

const errorMessage = (error: unknown) => {
  const candidate = error as { status?: number; data?: { message?: string } };
  if (candidate?.status === 404) {
    return "Le contrat GET /admin/payments n'est pas encore disponible sur le backend.";
  }
  return candidate?.data?.message ?? "Impossible de charger les transactions.";
};

export default function PaymentsPage() {
  const [view, setView] = useUrlState<"transactions" | "driver-payouts">("vue", "transactions");
  const [directPayoutOpen, setDirectPayoutOpen] = useState(false);
  const [recoveryTarget, setRecoveryTarget] = useState<PayoutTarget | null>(null);
  const [page, setPage] = useUrlState<number>("page", 1);
  const [status, setStatus] = useUrlState<PaymentStatus | "all">("statut", "all");
  const [purpose, setPurpose] = useUrlState<PaymentPurpose | "all">("objet", "all");
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AdminPaymentTransaction | null>(null);
  const paymentActionLock = useRef(false);

  const { data: profile } = useGetCurrentUserProfileQuery();
  const canReconcilePayments = isSuperAdminRole(profile?.user.role);

  const { data, error, isFetching, refetch } = useGetAdminPaymentsQuery({
    page,
    limit: 25,
    status,
    purpose,
    search,
  }, { skip: view !== "transactions" });
  const [reconcile, reconcileState] = useReconcileAdminPaymentMutation();
  const [cancelPayout, cancelState] = useCancelEnqueuedPayoutMutation();
  const [cancelNotice, setCancelNotice] = useState<string | null>(null);
  const [reconcileNotice, setReconcileNotice] = useState<{ paymentId: string; message: string } | null>(null);
  const [exportAdminXls, { isLoading: isExporting }] = useExportAdminXlsMutation();
  const [exportError, setExportError] = useState<string | null>(null);

  const payments = data?.payments ?? [];
  const summary = data?.summary;
  const pages = Math.max(1, Math.ceil((data?.total ?? 0) / (data?.limit ?? 25)));

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchDraft.trim());
  };

  const handleExport = async () => {
    setExportError(null);
    try {
      const blob = await exportAdminXls({
        url: "/admin/payments/export",
        params: { status, purpose, search },
      }).unwrap();
      downloadBlob(blob, datedExportName("paiements-zwanga"));
    } catch (error) {
      setExportError(
        getApiErrorMessage(error, "Impossible d'exporter les paiements.")
      );
    }
  };

  const openPayment = (payment: AdminPaymentTransaction) => {
    if (paymentActionLock.current) return;
    setCancelNotice(null);
    setReconcileNotice(null);
    cancelState.reset();
    reconcileState.reset();
    setSelected(payment);
  };

  const closePayment = () => {
    if (!paymentActionLock.current) setSelected(null);
  };

  const handleCancelPayout = async () => {
    if (!selected || !canReconcilePayments || paymentActionLock.current ||
      data?.source !== "admin-api" || selected.provider !== "pawapay" || !selected.orderNumber ||
      !PAYOUT_PURPOSES.includes(selected.purpose as PaymentPurpose) ||
      !["pending", "initiated"].includes(selected.status)) return;
    const label =
      selected.purpose === "driver_payout"
        ? "ce versement de gains"
        : "ce retrait";
    // Verrou pris avant la confirmation: elle est asynchrone, un second clic ne doit pas passer.
    paymentActionLock.current = true;
    if (
      !(await confirmAction(
        `Annuler ${label} encore en file chez PawaPay ? Le montant réservé redevient disponible. Si l’opérateur a déjà envoyé l’argent, l’annulation est refusée.`
      ))
    ) {
      paymentActionLock.current = false;
      return;
    }
    const paymentId = selected.id;
    setReconcileNotice(null);
    reconcileState.reset();
    try {
      const updated = await cancelPayout(paymentId).unwrap();
      setSelected((current) =>
        current?.id === paymentId ? { ...current, ...updated, user: current.user ?? updated.user } : current
      );
      setCancelNotice(
        "Le versement a été annulé. Le montant réservé est de nouveau disponible."
      );
    } catch {
      setCancelNotice(null);
    } finally {
      paymentActionLock.current = false;
    }
  };

  const handleReconcile = async () => {
    if (!selected || data?.source !== "admin-api" || !canReconcilePayments || paymentActionLock.current ||
      reconcileState.isLoading || cancelState.isLoading || selected.status === "succeeded") return;
    paymentActionLock.current = true;
    if (!(await confirmAction(`Vérifier la transaction ${selected.reference} auprès de ${selected.provider === "pawapay" ? "PawaPay" : "FlexPay"}, sans envoyer à nouveau d’argent ?`))) {
      paymentActionLock.current = false;
      return;
    }
    setReconcileNotice(null);
    setCancelNotice(null);
    cancelState.reset();
    const paymentId = selected.id;
    try {
      const result = await reconcile(paymentId).unwrap();
      setSelected((current) => current?.id === paymentId ? {
        ...current,
        ...(result.status ? { status: result.status } : {}),
        ...(result.paidAt !== undefined ? { paidAt: result.paidAt } : {}),
        ...(result.updatedAt ? { updatedAt: result.updatedAt } : {}),
      } : current);
      setReconcileNotice({ paymentId, message: paymentReconciliationMessage(result) });
    } catch {
      // RTK Query exposes the failure below in the drawer.
    } finally {
      paymentActionLock.current = false;
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>Finance · registre central</span>
          <h1>Paiements</h1>
          <p>Suivi des encaissements et décaissements FlexPay et PawaPay.</p>
        </div>
        {view === "transactions" ? <div className={styles.headingActions}>
          {canReconcilePayments ? <button type="button" className={styles.secondaryButton} onClick={() => setDirectPayoutOpen(true)}>Virement libre</button> : null}
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw size={15} aria-hidden="true" /> Actualiser
          </button>
          <button
            type="button"
            className={styles.button}
            onClick={handleExport}
            disabled={isExporting}
          >
            <Download size={15} aria-hidden="true" /> {isExporting ? "Export..." : "Exporter XLS"}
          </button>
        </div> : null}
      </header>

      <nav className={styles.tabs} aria-label="Vues des paiements">
        <button type="button" className={`${styles.tab} ${view === "transactions" ? styles.tabActive : ""}`} onClick={() => setView("transactions")}>Transactions</button>
        <button type="button" className={`${styles.tab} ${view === "driver-payouts" ? styles.tabActive : ""}`} onClick={() => setView("driver-payouts")}>Retraits de gains à examiner</button>
      </nav>

      {view === "driver-payouts" ? <DriverPayoutReviews /> : <>

      {exportError ? <div className={styles.error}>{exportError}</div> : null}

      <section className={styles.metricStrip} aria-label="Synthèse des paiements">
        <Metric label="Transactions" value={summary?.total ?? 0} helper="périmètre chargé" />
        <Metric
          label="Volume encaissé"
          value={formatVolumes(summary?.succeededVolume ?? [])}
          helper={`${summary?.succeeded ?? 0} transaction(s) réussie(s)`}
        />
        <Metric
          label="À rapprocher"
          value={summary?.pending ?? 0}
          helper="en attente ou initiées"
        />
        <Metric
          label="Échecs et annulations"
          value={summary?.failed ?? 0}
          helper="à surveiller"
        />
      </section>

      {summary && summary.total > 0 ? (
        <section className={styles.panel} aria-label="Répartition des transactions">
          <div className={styles.panelHeader}>
            <div>
              <h2>Santé des encaissements</h2>
              <p>
                {(() => {
                  const finished = summary.succeeded + summary.failed;
                  return finished
                    ? `${Math.round((summary.succeeded / finished) * 1000) / 10} % de réussite parmi les transactions terminées`
                    : "Aucune transaction terminée sur ce périmètre";
                })()}
              </p>
            </div>
          </div>
          <SegmentedBar
            label="Répartition des transactions"
            parts={[
              { label: "Réussies", value: summary.succeeded, color: "var(--color-success)" },
              { label: "À rapprocher", value: summary.pending, color: "var(--color-warning)" },
              { label: "Échecs et annulations", value: summary.failed, color: "var(--color-danger)" },
            ]}
          />
          <div className={styles.healthLegend}>
            {[
              ["Réussies", summary.succeeded, "var(--color-success)"],
              ["À rapprocher", summary.pending, "var(--color-warning)"],
              ["Échecs et annulations", summary.failed, "var(--color-danger)"],
            ].map(([label, value, color]) => (
              <span key={label as string}>
                <i style={{ background: color as string }} />
                {label} <b>{Number(value).toLocaleString("fr-FR")}</b>{" "}
                <em>{Math.round((Number(value) / summary.total) * 100)} %</em>
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {data?.notice ? <div className={styles.notice}>{data.notice}</div> : null}

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <h2>Transactions</h2>
            <p>{data?.total ?? 0} résultat(s) selon les filtres.</p>
          </div>
          <form className={styles.filters} onSubmit={handleSearch}>
            <div className={styles.filterField}>
              <label className={styles.filterLabel} htmlFor="payments-search">
                Rechercher
              </label>
              <input
                id="payments-search"
                placeholder="Référence, commande, utilisateur…"
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
              />
            </div>
            <div className={styles.filterField}>
              <label className={styles.filterLabel} htmlFor="payments-purpose">
                Type d’opération
              </label>
              <select
                id="payments-purpose"
                value={purpose}
                onChange={(event) => {
                  setPage(1);
                  setPurpose(event.target.value as PaymentPurpose | "all");
                }}
              >
                <option value="all">Tous les objets</option>
                <option value="subscription_pro">Abonnements</option>
                <option value="trip_booking">Réservations</option>
                <option value="wallet_top_up">Achats de jetons</option>
                <option value="driver_payout">Versements de gains</option>
                <option value="wallet_payout">Retraits de jetons</option>
                <option value="referral_payout">Retraits parrainage</option>
                <option value="admin_payout">Virements libres Zwanga</option>
              </select>
            </div>
            <div className={styles.filterField}>
              <label className={styles.filterLabel} htmlFor="payments-status">
                Statut
              </label>
              <select
                id="payments-status"
                value={status}
                onChange={(event) => {
                  setPage(1);
                  setStatus(event.target.value as PaymentStatus | "all");
                }}
              >
                <option value="all">Tous les statuts</option>
                <option value="pending">En attente</option>
                <option value="initiated">Initiés</option>
                <option value="succeeded">Réussis</option>
                <option value="failed">Échoués</option>
                <option value="cancelled">Annulés</option>
              </select>
            </div>
            <button type="submit" className={styles.secondaryButton}>
              <Search size={16} aria-hidden="true" />
              Rechercher
            </button>
          </form>
        </div>

        <p className={styles.helpText}>
          <Info size={16} aria-hidden="true" />
          <span>
            La recherche se lance avec le bouton « Rechercher » ou la touche
            Entrée. « Initié » signifie que l’opérateur mobile a été appelé mais
            n’a pas encore confirmé le paiement.
          </span>
        </p>

        {error ? <div className={styles.error}>{errorMessage(error)}</div> : null}
        {isFetching && payments.length === 0 ? (
          <SkeletonList count={6} />
        ) : payments.length === 0 ? (
          <div className={styles.empty}>Aucune transaction ne correspond aux filtres.</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Référence</th>
                  <th>Utilisateur</th>
                  <th>Objet</th>
                  <th>Méthode</th>
                  <th>Montant</th>
                  <th>Statut</th>
                  <th>Date</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className={styles.stack}>
                      <strong className={styles.reference}>{payment.reference}</strong>
                      <small>{payment.orderNumber ?? "Sans n° de commande"}</small>
                    </td>
                    <td className={styles.userCell}>
                      <strong>{formatUser(payment.user)}</strong>
                      <small>{payment.user?.phone ?? payment.phone ?? "—"}</small>
                    </td>
                    <td>{financeLabel(payment.purpose)}</td>
                    <td>{financeLabel(payment.method)}</td>
                    <td><strong>{formatMoney(payment.amount, payment.currency)}</strong></td>
                    <td><span className={statusClass(payment.status)}>{financeLabel(payment.status)}</span></td>
                    <td>{formatDateTime(payment.createdAt)}</td>
                    <td>
                      <button
                        type="button"
                        className={styles.secondaryButton}
                        disabled={reconcileState.isLoading || cancelState.isLoading}
                        onClick={() => openPayment(payment)}
                      >
                        Détails
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination page={page} pages={pages} total={data?.total ?? 0} onChange={setPage} />
      </section>
      </>}

      {selected ? (
        <div className={styles.drawerBackdrop} role="presentation" onMouseDown={closePayment}>
          <aside
            className={styles.drawer}
            role="dialog"
            aria-modal="true"
            aria-label="Détail de la transaction"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className={styles.drawerHeader}>
              <div>
                <span className={styles.eyebrow}>Transaction</span>
                <h2>{selected.reference}</h2>
              </div>
              <button className={styles.iconButton} onClick={closePayment} disabled={reconcileState.isLoading || cancelState.isLoading} aria-label="Fermer">
                <X size={18} />
              </button>
            </div>
            <dl className={styles.detailList}>
              <dt>Statut</dt><dd><span className={statusClass(selected.status)}>{financeLabel(selected.status)}</span></dd>
              <dt>{selected.purpose === "admin_payout" ? "Super admin initiateur" : "Utilisateur"}</dt><dd>{formatUser(selected.user)}</dd>
              {selected.purpose === "admin_payout" ? <>
                <dt>Numéro destinataire</dt><dd>{selected.phone ?? "—"}</dd>
                <dt>Motif du virement</dt><dd>{selected.description ?? "—"}</dd>
              </> : null}
              <dt>Montant</dt><dd>{formatMoney(selected.amount, selected.currency)}</dd>
              <dt>Objet</dt><dd>{financeLabel(selected.purpose)}</dd>
              <dt>Méthode</dt><dd>{financeLabel(selected.method)}</dd>
              <dt>Prestataire</dt><dd>{financeLabel(selected.provider)}</dd>
              <dt>Référence prestataire</dt><dd className={styles.reference}>{selected.orderNumber ?? "—"}</dd>
              <dt>Référence fournisseur</dt><dd className={styles.reference}>{selected.providerReference ?? "—"}</dd>
              <dt>Code fournisseur</dt><dd>{selected.providerStatusCode ?? "—"}</dd>
              <dt>Message</dt><dd>{selected.providerMessage ?? "—"}</dd>
              <dt>Entité liée</dt><dd>{selected.relatedEntityType ?? "—"}</dd>
              <dt>Créée le</dt><dd>{formatDateTime(selected.createdAt)}</dd>
              <dt>Payée le</dt><dd>{formatDateTime(selected.paidAt)}</dd>
            </dl>
            {cancelNotice ? (
              <div className={styles.notice} style={{ marginTop: 18 }}>
                {cancelNotice}
              </div>
            ) : null}
            {cancelState.error ? (
              <div className={styles.error} style={{ marginTop: 18 }}>
                {getApiErrorMessage(
                  cancelState.error,
                  "L’annulation n’a pas abouti. Le versement doit encore être en file chez PawaPay."
                )}
              </div>
            ) : null}
            {reconcileNotice?.paymentId === selected.id ? (
              <p className={styles.helpText} role="status">{reconcileNotice.message}</p>
            ) : null}
            {reconcileState.error && reconcileState.originalArgs === selected.id ? (
              <div className={styles.error} style={{ marginTop: 18 }}>
                {paymentReconciliationError(reconcileState.error)}
              </div>
            ) : null}
            {selected &&
            PAYOUT_PURPOSES.includes(selected.purpose as PaymentPurpose) &&
            (selected.status === "pending" || selected.status === "initiated") ? (
              <p className={styles.helpText}>
                <Info size={16} aria-hidden="true" />
                <span>
                  {selected.provider === "pawapay" && selected.orderNumber
                    ? "Le super admin peut annuler ce versement tant que PawaPay le garde en file. Le montant réservé redevient alors disponible."
                    : "Pour FlexPaie, ouvrez le dossier de retrait : le super admin peut débloquer et relancer le versement au même numéro après confirmation de non-réception et preuve définitive de non-exécution."}
                </span>
              </p>
            ) : null}
            <div className={styles.modalActions}>
              {selected.relatedEntityId && (
                (selected.purpose === "driver_payout" && selected.relatedEntityType === "driver_payout") ||
                (selected.purpose === "referral_payout" && selected.relatedEntityType === "referral_withdrawal")
              ) ? <button type="button" className={styles.secondaryButton}
                disabled={reconcileState.isLoading || cancelState.isLoading}
                onClick={() => {
                  if (paymentActionLock.current) return;
                  setRecoveryTarget({ kind: selected.purpose === "driver_payout" ? "driver" : "referral", id: selected.relatedEntityId! });
                  setSelected(null);
                }}>Suivi / relance du retrait</button> : null}
              {canReconcilePayments &&
              selected.provider === "pawapay" &&
              selected.orderNumber &&
              PAYOUT_PURPOSES.includes(selected.purpose as PaymentPurpose) &&
              (selected.status === "pending" || selected.status === "initiated") ? (
                <button
                  type="button"
                  className={styles.dangerButton}
                  onClick={handleCancelPayout}
                  disabled={cancelState.isLoading || reconcileState.isLoading || data?.source !== "admin-api" || Boolean(cancelNotice)}
                  title={data?.source !== "admin-api" ? "Nécessite le contrat admin dédié" : undefined}
                >
                  <Ban size={16} />{" "}
                  {cancelState.isLoading
                    ? "Annulation..."
                    : selected.purpose === "driver_payout"
                      ? "Annuler le versement de gains"
                      : "Annuler le retrait en attente"}
                </button>
              ) : null}
              <button
                type="button"
                className={styles.button}
                onClick={handleReconcile}
                disabled={
                  reconcileState.isLoading ||
                  cancelState.isLoading ||
                  !canReconcilePayments ||
                  data?.source !== "admin-api" ||
                  selected.status === "succeeded"
                }
                title={
                  !canReconcilePayments
                    ? "Action réservée au super administrateur"
                    : data?.source !== "admin-api"
                      ? "Nécessite le contrat admin dédié"
                      : undefined
                }
              >
                <CheckCircle2 size={16} /> {reconcileState.isLoading ? "Vérification..." : "Vérifier chez le prestataire"}
              </button>
            </div>
          </aside>
        </div>
      ) : null}
      {directPayoutOpen ? <DirectPayoutDrawer onClose={() => setDirectPayoutOpen(false)} /> : null}
      {recoveryTarget ? <PayoutRecoveryDrawer key={`${recoveryTarget.kind}:${recoveryTarget.id}`} target={recoveryTarget} onClose={() => setRecoveryTarget(null)} onOpen={setRecoveryTarget} /> : null}
    </div>
  );
}

function Metric({ label, value, helper }: { label: string; value: string | number; helper: string }) {
  return (
    <div className={styles.metric}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{helper}</small>
    </div>
  );
}

function Pagination({
  page,
  pages,
  total,
  onChange,
}: {
  page: number;
  pages: number;
  total: number;
  onChange: (page: number) => void;
}) {
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
