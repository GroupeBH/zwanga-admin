"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Download,
  RefreshCw,
  Search,
  X,
} from "lucide-react";

import {
  useGetAdminPaymentsQuery,
  useReconcileAdminPaymentMutation,
} from "@/lib/features/finance/financeApi";
import {
  exportCsv,
  financeLabel,
  formatDateTime,
  formatMoney,
  formatUser,
  formatVolumes,
} from "@/lib/features/finance/format";
import type {
  AdminPaymentTransaction,
  PaymentPurpose,
} from "@/lib/features/finance/types";
import type { PaymentStatus } from "@/lib/features/admin/types";

import styles from "../finance.module.css";

const statusClass = (status: PaymentStatus) => {
  if (status === "succeeded") return `${styles.badge} ${styles.badgeSuccess}`;
  if (["failed", "cancelled"].includes(status)) {
    return `${styles.badge} ${styles.badgeDanger}`;
  }
  return `${styles.badge} ${styles.badgeWarning}`;
};

const errorMessage = (error: unknown) => {
  const candidate = error as { status?: number; data?: { message?: string } };
  if (candidate?.status === 404) {
    return "Le contrat GET /admin/payments n'est pas encore disponible sur le backend.";
  }
  return candidate?.data?.message ?? "Impossible de charger les transactions.";
};

export default function PaymentsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<PaymentStatus | "all">("all");
  const [purpose, setPurpose] = useState<PaymentPurpose | "all">("all");
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AdminPaymentTransaction | null>(null);

  const { data, error, isFetching, refetch } = useGetAdminPaymentsQuery({
    page,
    limit: 25,
    status,
    purpose,
    search,
  });
  const [reconcile, reconcileState] = useReconcileAdminPaymentMutation();

  const payments = data?.payments ?? [];
  const summary = data?.summary;
  const pages = Math.max(1, Math.ceil((data?.total ?? 0) / (data?.limit ?? 25)));

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchDraft.trim());
  };

  const handleExport = () => {
    exportCsv(
      `zwanga-paiements-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        "Référence",
        "Utilisateur",
        "Objet",
        "Méthode",
        "Montant",
        "Devise",
        "Statut",
        "Commande",
        "Créé le",
        "Payé le",
      ],
      payments.map((payment) => [
        payment.reference,
        formatUser(payment.user),
        financeLabel(payment.purpose),
        financeLabel(payment.method),
        payment.amount,
        payment.currency,
        financeLabel(payment.status),
        payment.orderNumber,
        payment.createdAt,
        payment.paidAt,
      ])
    );
  };

  const handleReconcile = async () => {
    if (!selected || data?.source !== "admin-api") return;
    if (!confirm(`Vérifier la transaction ${selected.reference} auprès de FlexPay ?`)) {
      return;
    }
    try {
      await reconcile(selected.id).unwrap();
      setSelected(null);
    } catch {
      // RTK Query exposes the failure below in the drawer.
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>Finance · registre central</span>
          <h1>Paiements</h1>
          <p>Suivi de tous les encaissements et décaissements FlexPay.</p>
        </div>
        <div className={styles.headingActions}>
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
            disabled={payments.length === 0}
          >
            <Download size={15} aria-hidden="true" /> Exporter la page
          </button>
        </div>
      </header>

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

      {data?.notice ? <div className={styles.notice}>{data.notice}</div> : null}

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <h2>Transactions</h2>
            <p>{data?.total ?? 0} résultat(s) selon les filtres.</p>
          </div>
          <form className={styles.filters} onSubmit={handleSearch}>
            <input
              aria-label="Rechercher une transaction"
              placeholder="Référence, commande, utilisateur…"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
            />
            <select
              aria-label="Filtrer par objet"
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
              <option value="driver_payout">Versements conducteurs</option>
              <option value="referral_payout">Retraits parrainage</option>
            </select>
            <select
              aria-label="Filtrer par statut"
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
            <button type="submit" className={styles.iconButton} aria-label="Rechercher">
              <Search size={16} />
            </button>
          </form>
        </div>

        {error ? <div className={styles.error}>{errorMessage(error)}</div> : null}
        {isFetching && payments.length === 0 ? (
          <div className={styles.empty}>Chargement du registre…</div>
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
                        onClick={() => setSelected(payment)}
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

      {selected ? (
        <div className={styles.drawerBackdrop} role="presentation" onMouseDown={() => setSelected(null)}>
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
              <button className={styles.iconButton} onClick={() => setSelected(null)} aria-label="Fermer">
                <X size={18} />
              </button>
            </div>
            <dl className={styles.detailList}>
              <dt>Statut</dt><dd><span className={statusClass(selected.status)}>{financeLabel(selected.status)}</span></dd>
              <dt>Utilisateur</dt><dd>{formatUser(selected.user)}</dd>
              <dt>Montant</dt><dd>{formatMoney(selected.amount, selected.currency)}</dd>
              <dt>Objet</dt><dd>{financeLabel(selected.purpose)}</dd>
              <dt>Méthode</dt><dd>{financeLabel(selected.method)}</dd>
              <dt>Commande FlexPay</dt><dd className={styles.reference}>{selected.orderNumber ?? "—"}</dd>
              <dt>Référence fournisseur</dt><dd className={styles.reference}>{selected.providerReference ?? "—"}</dd>
              <dt>Code fournisseur</dt><dd>{selected.providerStatusCode ?? "—"}</dd>
              <dt>Message</dt><dd>{selected.providerMessage ?? "—"}</dd>
              <dt>Entité liée</dt><dd>{selected.relatedEntityType ?? "—"}</dd>
              <dt>Créée le</dt><dd>{formatDateTime(selected.createdAt)}</dd>
              <dt>Payée le</dt><dd>{formatDateTime(selected.paidAt)}</dd>
            </dl>
            {reconcileState.error ? (
              <div className={styles.error} style={{ marginTop: 18 }}>
                Le rapprochement n’a pas abouti. Vérifiez que la route admin est déployée.
              </div>
            ) : null}
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.button}
                onClick={handleReconcile}
                disabled={
                  reconcileState.isLoading ||
                  data?.source !== "admin-api" ||
                  selected.status === "succeeded"
                }
                title={data?.source !== "admin-api" ? "Nécessite le contrat admin dédié" : undefined}
              >
                <CheckCircle2 size={16} /> Vérifier chez FlexPay
              </button>
            </div>
          </aside>
        </div>
      ) : null}
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
