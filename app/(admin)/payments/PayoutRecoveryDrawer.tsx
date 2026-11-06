"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { useGetCurrentUserProfileQuery } from "@/lib/features/profile/profileApi";
import {
  useGetPayoutRecoveryDetailQuery,
  useReconcilePayoutRecoveryMutation,
  useResolvePayoutNotPaidMutation,
  useCloseDriverPayoutIncidentMutation,
  useRetryPayoutMutation,
} from "@/lib/features/finance/payoutRecoveryApi";
import {
  canManagePayout,
  canReleasePayout,
  canRetryPayout,
  payoutRetryMessage,
  payoutRetryResultMessage,
  payoutEvidenceError,
  resolutionError,
  type PayoutTarget,
  type RecoveryWithdrawal,
} from "@/lib/features/finance/payoutRecovery";
import { financeLabel, formatDateTime, formatMoney, formatTokens, formatUser } from "@/lib/features/finance/format";
import { getApiErrorMessage, getApiErrorStatus } from "@/lib/utils/apiErrors";
import styles from "../finance.module.css";
import { FinanceOtpConfirmation } from './FinanceOtpConfirmation';

import { confirmAction } from "@/app/components/ui/Feedback";

const eventLabels: Record<string, string> = {
  review_requested: "Vérification demandée",
  released_confirmed_not_paid: "Fonds libérés après confirmation de non-paiement",
  reconciled: "Vérification du prestataire",
  late_success: "Succès tardif après libération",
  late_success_review_closed: "Incident de succès tardif clôturé",
};

export function PayoutRecoveryDrawer({ target, onClose, onOpen }: {
  target: PayoutTarget;
  onClose: () => void;
  onOpen?: (target: PayoutTarget) => void;
}) {
  const query = useGetPayoutRecoveryDetailQuery(target, { refetchOnMountOrArgChange: true });
  const { data: profile } = useGetCurrentUserProfileQuery();
  const [reconcile] = useReconcilePayoutRecoveryMutation();
  const [resolveNotPaid] = useResolvePayoutNotPaidMutation();
  const [closeIncident] = useCloseDriverPayoutIncidentMutation();
  const [retryPayout] = useRetryPayoutMutation();
  const [reason, setReason] = useState("");
  const [evidenceReference, setEvidenceReference] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [notReceived, setNotReceived] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [orderNumber, setOrderNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [replacement, setReplacement] = useState<RecoveryWithdrawal | null>(null);
  const actionLock = useRef(false);
  const drawerRef = useRef<HTMLElement>(null);
  const data = query.currentData;
  const payout = data?.payout;
  const authorized = canManagePayout(target.kind, profile?.user.role);
  const unavailable = busy || query.isFetching || !!query.error || !payout;
  const canRelease = payout && !replacement && canReleasePayout(payout);
  const canRetry = payout && !replacement && canRetryPayout(payout, profile?.user.role);
  const replacementId = payout?.retry?.replacementId ?? replacement?.id;
  const retryLabel = payout && ["pending", "initiated"].includes(payout.status)
    ? "Débloquer et relancer au même numéro" : "Relancer au même numéro";
  const retryError = payoutEvidenceError(reason, evidenceReference) || (!confirmed || !notReceived ? "Confirmez la non-réception et la non-exécution définitive." : null);
  const closingIncident = target.kind === "driver" && payout?.recoveryBlocked === true && payout.status === "succeeded";
  const formError = payout && (closingIncident
    ? payoutEvidenceError(reason, evidenceReference) || (!confirmed ? "Confirmez le rapprochement financier." : null)
    : resolutionError(payout, reason, evidenceReference, confirmed));

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    drawerRef.current?.focus();
    return () => { previous?.focus(); };
  }, []);

  const close = () => { if (!actionLock.current) onClose(); };

  const refresh = async () => {
    if (actionLock.current) return;
    actionLock.current = true;
    setBusy(true);
    setError(null);
    setConfirmed(false);
    setNotReceived(false);
    try { await query.refetch().unwrap(); }
    catch { /* The query error is shown separately from mutation results. */ }
    finally { actionLock.current = false; setBusy(false); }
  };

  const perform = async (action: "reconcile" | "release" | "close" | "retry") => {
    if (actionLock.current || unavailable || !authorized || !payout) return;
    if (action === "retry" && (!canRetry || retryError)) { setError(retryError || "Relance non autorisée."); return; }
    if (action === 'retry' && !/^\d{6}$/.test(otpCode)) { setError('Saisissez le code SMS de confirmation.'); return; }
    if (action !== "reconcile" && action !== "retry" && formError) { setError(formError); return; }
    if (action === "reconcile" && orderNumber.trim().length > 120) {
      setError("Le numéro de commande ne doit pas dépasser 120 caractères.");
      return;
    }
    // Verrou pris avant la confirmation: elle est asynchrone, un second clic ne doit pas passer.
    actionLock.current = true;
    if (!(await confirmAction(action === "retry"
      ? `Clôturer le retrait non payé et envoyer ${formatMoney(payout.amount, payout.currency)} au ${payout.phone} ? Le prestataire doit avoir confirmé définitivement la non-exécution initiale. Le nouvel envoi aura son propre statut et ne sera pas marqué payé sans confirmation.`
      : action === "release"
      ? "Libérer les fonds réservés après confirmation définitive du prestataire ? Cette action n'annule pas le virement chez FlexPaie."
      : action === "close"
        ? "Clôturer cet incident après rapprochement financier ? Le versement réussi restera déduit du solde."
        : "Vérifier ce retrait sans renvoyer d'argent ?"))) {
      actionLock.current = false;
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      // Always re-read the canonical record, never release from a table snapshot.
      const fresh = await query.refetch().unwrap();
      if (fresh.payout.id !== target.id) throw new Error("Le dossier a changé. Rouvrez-le avant de continuer.");
      if (action === "retry") {
        if (!canRetryPayout(fresh.payout, profile?.user.role) || fresh.payout.expectedReference !== payout.expectedReference ||
            Number(fresh.payout.amount) !== Number(payout.amount) || fresh.payout.currency !== payout.currency || fresh.payout.phone !== payout.phone)
          throw new Error("Le dossier a changé. Vérifiez à nouveau le retrait avant de relancer.");
        const next = await retryPayout({ ...target, body: {
          expectedReference: fresh.payout.expectedReference!, reason: reason.trim(),
          evidenceReference: evidenceReference.trim(), confirmedNotPaid: true, confirmedNotReceived: true, otpCode,
        } }).unwrap();
        setReplacement(next);
        setNotice(payoutRetryResultMessage(next));
      } else if (action === "release") {
        const invalid = resolutionError(fresh.payout, reason, evidenceReference, confirmed);
        if (invalid) throw new Error(invalid);
        if (fresh.payout.expectedReference !== payout.expectedReference)
          throw new Error("La référence du retrait a changé. Vérifiez à nouveau la preuve avant de continuer.");
        await resolveNotPaid({ ...target, body: {
          expectedReference: fresh.payout.expectedReference!,
          reason: reason.trim(), evidenceReference: evidenceReference.trim(), confirmedNotPaid: true,
        } }).unwrap();
      } else if (action === "close") {
        if (target.kind !== "driver" || !fresh.payout.recoveryBlocked || fresh.payout.status !== "succeeded")
          throw new Error("Cet incident n'est plus ouvert. Le dossier a été actualisé.");
        await closeIncident({ id: target.id, body: {
          reason: reason.trim(), evidenceReference: evidenceReference.trim(),
        } }).unwrap();
      } else {
        if (fresh.payout.status === "succeeded") throw new Error("Ce versement est déjà confirmé comme réussi.");
        await reconcile({ ...target, orderNumber }).unwrap();
      }
      if (action !== "retry") setNotice(action === "reconcile"
        ? "Vérification enregistrée. Consultez le statut actualisé ci-dessous ; aucun nouvel envoi n'a été demandé."
        : "Opération enregistrée par le serveur. Consultez le dossier actualisé ci-dessous.");
      setReason(""); setEvidenceReference(""); setConfirmed(false); setNotReceived(false); setOrderNumber("");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : getApiErrorMessage(failure,
        "Résultat non confirmé. Actualisez le dossier avant toute nouvelle action."));
      setConfirmed(false);
      setNotReceived(false);
    } finally {
      setOtpCode('');
      // A refresh failure must not be reported as a rejected, already accepted operation.
      try { await query.refetch().unwrap(); } catch { /* query.error disables further writes */ }
      actionLock.current = false;
      setBusy(false);
    }
  };

  return (
    <div className={styles.drawerBackdrop} role="presentation" onMouseDown={close}>
      <aside className={styles.drawer} ref={drawerRef} tabIndex={-1} role="dialog" aria-modal="true"
        aria-label={target.kind === "driver" ? "Dossier de retrait des gains" : "Dossier de retrait parrainage"}
        aria-busy={busy || query.isFetching} onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === "Escape") { event.preventDefault(); close(); }
          if (event.key !== "Tab") return;
          const focusable = Array.from(drawerRef.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]',
          ) ?? []);
          const first = focusable[0], last = focusable[focusable.length - 1];
          if (!first) { event.preventDefault(); return; }
          if (event.shiftKey && (document.activeElement === first || document.activeElement === drawerRef.current)) {
            event.preventDefault(); last.focus();
          } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }}>
        <div className={styles.drawerHeader}>
          <div><span className={styles.eyebrow}>Retrait · {target.kind === "driver" ? "Gains conducteur" : "Parrainage"}</span><h2>Suivi et résolution</h2></div>
          <button type="button" className={styles.iconButton} onClick={close} disabled={busy} aria-label="Fermer"><X size={18} /></button>
        </div>
        <div className={styles.formStack}>
          <button type="button" className={styles.secondaryButton} disabled={busy || query.isFetching} onClick={refresh}>
            <RefreshCw size={15} /> Actualiser le dossier
          </button>
          {notice ? <div className={styles.notice} role="status">{notice}</div> : null}
          {error ? <div className={styles.error} role="alert">{error}</div> : null}
          {query.error ? <div className={styles.error} role="alert">{getApiErrorStatus(query.error) === 404
            ? "Dossier introuvable ou route de résolution absente du backend. Vérifiez l'identifiant et le déploiement du correctif ; aucune libération ne peut être effectuée ici."
            : getApiErrorMessage(query.error, "Impossible d'actualiser le dossier. Les actions sont bloquées.")}</div> : null}
          {query.isFetching ? <div className={styles.empty}>Actualisation du dossier…</div> : null}
        </div>
        {payout ? <>
          <dl className={styles.detailList}>
            <dt>Retrait</dt><dd className={styles.reference}>{payout.id}</dd>
            <dt>Bénéficiaire</dt><dd>{payout.user ? formatUser(payout.user) : payout.driverId ?? payout.userId ?? "—"}</dd>
            <dt>Téléphone</dt><dd>{payout.phone}</dd>
            <dt>Montant</dt><dd>{formatMoney(payout.amount, payout.currency)}</dd>
            {payout.tokens !== undefined ? <><dt>Montant en jetons</dt><dd>{formatTokens(payout.tokens)}</dd></> : null}
            <dt>Statut du retrait Zwanga</dt><dd>{financeLabel(payout.status)}</dd>
            <dt>Statut transaction prestataire</dt><dd>{financeLabel(payout.paymentTransaction?.status)}</dd>
            <dt>Référence attendue</dt><dd className={styles.reference}>{payout.expectedReference ?? "Non fournie"}</dd>
            <dt>Commande prestataire</dt><dd className={styles.reference}>{payout.paymentTransaction?.orderNumber ?? "Non disponible"}</dd>
            <dt>Demandé le</dt><dd>{formatDateTime(payout.requestedAt ?? payout.createdAt)}</dd>
            <dt>Traité le</dt><dd>{formatDateTime(payout.processedAt)}</dd>
            <dt>Dernier message</dt><dd>{payout.failureReason ?? payout.paymentTransaction?.providerMessage ?? "—"}</dd>
            {payout.retry ? <><dt>Versement de remplacement</dt><dd className={styles.reference}>{payout.retry.replacementId}<br />Preuve : {payout.retry.evidenceReference}</dd></> : null}
            {payout.retryOf ? <><dt>Relance du retrait</dt><dd className={styles.reference}>{payout.retryOf.sourceId}</dd></> : null}
          </dl>
          {profile?.user.role === "super_admin" ? <section className={styles.formStack}>
            <h3>Relance du versement</h3>
            <p className={styles.notice}>{replacementId
              ? "Une relance existe déjà. Suivez le nouveau versement ; ne renvoyez pas l’ancien retrait."
              : payoutRetryMessage(payout)}
              {payout.adminRetry?.code === "SAFETY_DELAY" && payout.adminRetry.availableAt
                ? <> Disponible au plus tôt le {formatDateTime(payout.adminRetry.availableAt)}.</> : null}
            </p>
            {!canRetry ? <button type="button" className={styles.secondaryButton} disabled title={payoutRetryMessage(payout)}>{retryLabel}</button> : null}
            {replacementId && onOpen ? <button type="button" className={styles.secondaryButton} disabled={busy || query.isFetching}
              onClick={() => { if (!actionLock.current) onOpen({ ...target, id: replacementId }); }}>Suivre le versement de remplacement</button> : null}
            {payout.retryOf && onOpen ? <button type="button" className={styles.secondaryButton} disabled={unavailable}
              onClick={() => { if (!actionLock.current) onOpen({ ...target, id: payout.retryOf!.sourceId }); }}>Voir le retrait d’origine</button> : null}
          </section> : null}
          {data?.lateSuccessAfterRelease || payout.recoveryBlocked ? <div className={styles.error}>
            Paiement confirmé après libération locale. Un rapprochement financier est nécessaire.
            {target.kind === "referral" ? " Les jetons restitués ont été redébités ; vérifiez le compte de parrainage." : " Les nouveaux retraits sont bloqués jusqu'à la clôture de l'incident."}
          </div> : null}
          <p className={styles.helpText}>Le statut local peut différer de celui du prestataire. Libérer la réservation dans Zwanga n'annule pas un virement chez FlexPaie.</p>
          {!authorized ? <div className={styles.notice}>Lecture seule : {target.kind === "referral" ? "action réservée au super administrateur" : "action réservée aux administrateurs"}.</div> : <>
            {payout.status !== "succeeded" ? <div className={styles.formStack}>
              {target.kind === "driver" ? <label className={styles.field}>N° de commande retrouvé (facultatif)
                <input value={orderNumber} maxLength={120} disabled={unavailable} onChange={(event) => setOrderNumber(event.target.value)} />
              </label> : null}
              <button type="button" className={styles.secondaryButton} disabled={unavailable} onClick={() => perform("reconcile")}>
                <RefreshCw size={15} /> Vérifier sans renvoyer d'argent
              </button>
            </div> : null}
            {canRelease || closingIncident || canRetry ? <form onSubmit={(event) => { event.preventDefault(); if (closingIncident || canRelease) void perform(closingIncident ? "close" : "release"); }}>
              <h3>{closingIncident ? "Clôturer l'incident" : canRetry ? "Confirmer et relancer le retrait non reçu" : "Résoudre le retrait non reçu"}</h3>
              <p className={styles.notice}>{closingIncident
                ? "Clôturez uniquement après rapprochement financier. Le versement reste réussi et déduit du solde : aucun remboursement n'est créé."
                : "Obtenez d'abord une confirmation définitive de non-exécution ou d'annulation auprès de FlexPaie. Un manque de provision, un ticket ouvert, un délai dépassé ou une transaction introuvable ne suffisent pas."}</p>
              {canRetry ? <p className={styles.helpText}>« {retryLabel} » clôture l’ancien retrait non payé et demande un nouveau versement de {formatMoney(payout.amount, payout.currency)} au {payout.phone}. Le numéro et le montant ne changent pas. « Confirmer la libération » n’envoie pas d’argent.</p> : null}
              <div className={styles.formStack}>
                <label className={styles.field}>Motif (5 à 500 caractères)
                  <textarea required minLength={5} maxLength={500} value={reason} disabled={unavailable} onChange={(event) => { setReason(event.target.value); setConfirmed(false); }} />
                </label>
                <label className={styles.field}>Référence de la preuve (5 à 200 caractères)
                  <input required minLength={5} maxLength={200} value={evidenceReference} disabled={unavailable} onChange={(event) => { setEvidenceReference(event.target.value); setConfirmed(false); }} />
                </label>
              </div>
              <label className={styles.candidate}>
                <input type="checkbox" checked={confirmed} disabled={unavailable} onChange={(event) => setConfirmed(event.target.checked)} />
                <span>{closingIncident ? "J'atteste avoir terminé le rapprochement financier de ce succès tardif." : "J'atteste que le prestataire a confirmé définitivement la non-exécution de ce retrait."}</span>
              </label>
              {canRetry ? <label className={styles.candidate}>
                <input type="checkbox" checked={notReceived} disabled={unavailable} onChange={(event) => setNotReceived(event.target.checked)} />
                <span>Le bénéficiaire confirme ne pas avoir reçu cet argent.</span>
              </label> : null}
              <div className={styles.modalActions}>
                {canRelease || closingIncident ? <button type="submit" className={styles.dangerButton} disabled={unavailable || !!formError}>
                  {busy ? "Traitement…" : closingIncident ? "Clôturer l'incident" : "Confirmer la libération"}
                </button> : null}
                {canRetry && !retryError ? <FinanceOtpConfirmation
                  intent={{ action: target.kind === 'driver' ? 'driver_payout_retry' : 'referral_withdrawal_retry', targetId: target.id,
                    payload: { expectedReference: payout.expectedReference!, reason: reason.trim(), evidenceReference: evidenceReference.trim(), confirmedNotPaid: true, confirmedNotReceived: true } }}
                  code={otpCode} onCode={setOtpCode} disabled={unavailable} /> : null}
                {canRetry ? <button type="button" className={styles.secondaryButton} disabled={unavailable || !!retryError || !/^\d{6}$/.test(otpCode)} onClick={() => perform("retry")}>
                  {busy ? "Traitement…" : retryLabel}
                </button> : null}
              </div>
            </form> : ["pending", "initiated"].includes(payout.status) ? <div className={styles.notice}>
              La libération n'est pas autorisée dans l'état actuel. Le backend impose notamment un délai de sécurité de 15 minutes et contrôle la cohérence du dossier. Sans les nouvelles capacités du backend, seule la vérification reste proposée.
            </div> : null}
          </>}
          {data?.resolution ? <>
            <h3>Preuve de résolution enregistrée</h3>
            <dl className={styles.detailList}>
              <dt>Date</dt><dd>{formatDateTime(data.resolution.createdAt)}</dd>
              <dt>Administrateur</dt><dd className={styles.reference}>{data.resolution.actorId}</dd>
              <dt>Référence</dt><dd className={styles.reference}>{data.resolution.expectedReference}</dd>
              <dt>Motif</dt><dd>{data.resolution.reason}</dd>
              <dt>Preuve</dt><dd>{data.resolution.evidenceReference}</dd>
            </dl>
          </> : null}
          {data?.events ? <>
            <h3>Historique des interventions</h3>
            {data.events.length === 0 ? <p className={styles.empty}>Aucune intervention enregistrée.</p> : null}
            {data.events.map((event) => <div key={event.id} className={styles.helpText}><div>
              <strong>{eventLabels[event.action] ?? financeLabel(event.action)}</strong><br />
              {formatDateTime(event.createdAt)} · {event.actorId ?? "Système"}<br />
              {event.reason ?? "Sans motif"}{event.evidenceReference ? <><br />Preuve : {event.evidenceReference}</> : null}
            </div></div>)}
          </> : null}
        </> : null}
      </aside>
    </div>
  );
}
