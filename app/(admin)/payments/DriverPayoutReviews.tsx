"use client";

import { useState } from "react";
import { RefreshCw, Search } from "lucide-react";
import { useGetDriverPayoutReviewsQuery } from "@/lib/features/finance/payoutRecoveryApi";
import { financeLabel, formatDateTime, formatMoney } from "@/lib/features/finance/format";
import { getApiErrorMessage } from "@/lib/utils/apiErrors";
import { PayoutRecoveryDrawer } from "./PayoutRecoveryDrawer";
import styles from "../finance.module.css";

export function DriverPayoutReviews() {
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lookupId, setLookupId] = useState("");
  const [lookupError, setLookupError] = useState<string | null>(null);
  const query = useGetDriverPayoutReviewsQuery({ limit: 25, offset: (page - 1) * 25 });
  const rows = query.currentData?.data ?? [];
  const total = query.currentData?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / 25));

  return <>
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <div><h2>Retraits de gains à examiner</h2><p>{total} dossier(s) signalé(s), ancien(s), sans commande ou avec incident.</p></div>
        <button type="button" className={styles.secondaryButton} disabled={query.isFetching} onClick={() => query.refetch()}><RefreshCw size={15} /> Actualiser</button>
      </div>
      <p className={styles.helpText}>Cette file ne représente pas tous les retraits. Un dossier récent peut être ouvert avec son identifiant de retrait Zwanga, même s'il n'a pas encore de transaction.</p>
      <form className={styles.filters} onSubmit={(event) => {
        event.preventDefault();
        const id = lookupId.trim();
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
          setLookupError("Saisissez un identifiant UUID de retrait, pas un numéro de commande FlexPaie.");
          return;
        }
        setLookupError(null); setSelectedId(id);
      }}>
        <div className={styles.filterField}>
          <label className={styles.filterLabel} htmlFor="driver-payout-id">Identifiant du retrait Zwanga</label>
          <input id="driver-payout-id" value={lookupId} maxLength={36} onChange={(event) => setLookupId(event.target.value)} required />
        </div>
        <button type="submit" className={styles.secondaryButton}><Search size={16} /> Ouvrir le dossier</button>
      </form>
      {lookupError ? <div className={styles.error} role="alert">{lookupError}</div> : null}
      {query.error ? <div className={styles.error} role="alert">{getApiErrorMessage(query.error, "Impossible de charger la file des retraits. Vérifiez la disponibilité du backend.")}</div> : null}
      {query.isFetching ? <div className={styles.empty}>Chargement des dossiers…</div> : null}
      {!query.isFetching && !query.error && rows.length === 0 ? <div className={styles.empty}>Aucun dossier à examiner sur cette page.</div> : null}
      {rows.length > 0 ? <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead><tr><th>Demandé le</th><th>Conducteur</th><th>Montant</th><th>Téléphone</th><th>Statut</th><th>Vérification</th><th /></tr></thead>
          <tbody>{rows.map((payout) => <tr key={payout.id}>
            <td>{formatDateTime(payout.requestedAt ?? payout.createdAt)}</td>
            <td className={styles.reference}>{payout.driverId}</td>
            <td><strong>{formatMoney(payout.amount, payout.currency)}</strong></td>
            <td>{payout.phone}</td>
            <td><span className={`${styles.badge} ${payout.recoveryBlocked ? styles.badgeDanger : styles.badgeWarning}`}>{financeLabel(payout.status)}</span></td>
            <td>{payout.recoveryBlocked ? "Succès tardif · bloqué" : payout.isStale ? "Retrait ancien" : "À vérifier"}</td>
            <td><button type="button" className={styles.secondaryButton} onClick={() => setSelectedId(payout.id)}>Détails / traiter</button></td>
          </tr>)}</tbody>
        </table>
      </div> : null}
      <div className={styles.pagination}>
        <span>Page {page} sur {pages} · {total} dossier(s)</span>
        <div className={styles.rowActions}>
          <button type="button" className={styles.secondaryButton} disabled={query.isFetching || page <= 1} onClick={() => setPage(page - 1)}>Précédent</button>
          <button type="button" className={styles.secondaryButton} disabled={query.isFetching || !!query.error || page >= pages || page * 25 > 100000} onClick={() => setPage(page + 1)}>Suivant</button>
        </div>
      </div>
    </section>
    {selectedId ? <PayoutRecoveryDrawer key={selectedId} target={{ kind: "driver", id: selectedId }} onClose={() => setSelectedId(null)} /> : null}
  </>;
}
