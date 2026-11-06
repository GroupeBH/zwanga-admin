"use client";

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useGetCurrentUserProfileQuery } from '@/lib/features/profile/profileApi';
import { useCreateDirectPayoutMutation, useLazyGetDirectPayoutQuery, type DirectPayoutResult } from '@/lib/features/finance/directPayoutApi';
import { directPayoutInputError, directPayoutStatusMessage, directPayoutStorageKey } from '@/lib/features/finance/directPayout';
import { useReconcileAdminPaymentMutation } from '@/lib/features/finance/financeApi';
import { formatMoney, financeLabel } from '@/lib/features/finance/format';
import { getApiErrorMessage } from '@/lib/utils/apiErrors';
import styles from '../finance.module.css';
import { FinanceOtpConfirmation } from './FinanceOtpConfirmation';

import { confirmAction } from "@/app/components/ui/Feedback";

export function DirectPayoutDrawer({ onClose }: { onClose: () => void }) {
  const { data: profile } = useGetCurrentUserProfileQuery();
  const actor = profile?.user;
  const authorized = actor?.role === 'super_admin';
  const [create] = useCreateDirectPayoutMutation();
  const [lookup] = useLazyGetDirectPayoutQuery();
  const [reconcile] = useReconcileAdminPaymentMutation();
  const [key, setKey] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [result, setResult] = useState<DirectPayoutResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false);
  const drawer = useRef<HTMLElement>(null);
  const storageKey = actor?.id ? directPayoutStorageKey(actor.id) : null;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    drawer.current?.focus();
    return () => previous?.focus();
  }, []);
  useEffect(() => {
    if (!authorized || !storageKey) return;
    let active = true;
    setReady(false);
    setKey(null); setResult(null); setAttempted(false); setError(null);
    setPhone(''); setAmount(''); setReason(''); setConfirmed(false);
    (async () => {
      try {
        const saved = sessionStorage.getItem(storageKey);
        if (saved) {
          setKey(saved); setAttempted(true);
          try { const found = await lookup(saved, false).unwrap(); if (active) setResult(found); }
          catch { if (active) setError('Ordre à vérifier. Conservez cet identifiant ; aucun nouvel envoi automatique.'); }
        } else if (active) setKey(crypto.randomUUID());
        if (active) setReady(true);
      } catch { if (active) setError('Stockage de session indisponible. Envoi bloqué pour éviter les doublons.'); }
    })();
    return () => { active = false; };
  }, [authorized, storageKey, lookup]);

  const close = () => { if (!lock.current) onClose(); };
  const submit = async () => {
    if (!authorized || !storageKey || !ready || lock.current || attempted || result || !key) return;
    if (!/^\d{6}$/.test(otpCode)) { setError('Saisissez le code SMS de confirmation.'); return; }
    const invalid = directPayoutInputError(phone, amount, reason);
    if (invalid || !confirmed) { setError(invalid || 'Confirmez le décaissement des fonds Zwanga.'); return; }
    // Verrou pris avant la confirmation: elle est asynchrone, un second clic ne doit pas passer.
    lock.current = true;
    if (!(await confirmAction(`Envoyer ${formatMoney(Number(amount), 'CDF')} au ${phone.trim()} avec les fonds Zwanga ? Ce virement ne clôture aucun retrait existant.`))) { lock.current = false; return; }
    setBusy(true); setError(null);
    try {
      const intent = key ?? crypto.randomUUID();
      // Store only the durable order key, never the recipient or financial form.
      sessionStorage.setItem(storageKey, intent);
      setKey(intent); setAttempted(true);
      setResult(await create({ idempotencyKey: intent, phone: phone.trim(), amount: Number(amount), currency: 'CDF', reason: reason.trim(), confirmed: true, otpCode }).unwrap());
    } catch (failure) {
      setError(getApiErrorMessage(failure, 'Résultat incertain. Vérifiez le même ordre ; ne recréez pas le virement.'));
    } finally { setOtpCode(''); setConfirmed(false); lock.current = false; setBusy(false); }
  };
  const refresh = async () => {
    if (!authorized || !key || lock.current) return;
    lock.current = true; setBusy(true); setError(null);
    try {
      const found = await lookup(key, false).unwrap();
      setResult(found);
      if (['pending', 'initiated'].includes(found.status)) {
        await reconcile(found.id).unwrap();
        setResult(await lookup(key, false).unwrap());
      }
    } catch (failure) { setError(getApiErrorMessage(failure, 'Vérification indisponible. Aucun nouvel envoi effectué.')); }
    finally { lock.current = false; setBusy(false); }
  };
  const newOrder = async () => {
    if (!authorized || !storageKey || lock.current || !result || !['succeeded', 'failed', 'cancelled'].includes(result.status)) return;
    if (!(await confirmAction('Créer un virement distinct ? Pour un retrait utilisateur non reçu, utilisez son dossier de relance afin de conserver son solde et son historique.'))) return;
    try {
      sessionStorage.removeItem(storageKey); setKey(crypto.randomUUID()); setResult(null); setAttempted(false); setOtpCode('');
      setPhone(''); setAmount(''); setReason(''); setConfirmed(false); setError(null);
    } catch { setError('Impossible de conserver un nouvel ordre de façon fiable.'); }
  };

  return <div className={styles.drawerBackdrop} onMouseDown={close} role="presentation">
    <aside className={styles.drawer} ref={drawer} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Virement libre Mobile Money" aria-busy={busy}
      onMouseDown={event => event.stopPropagation()} onKeyDown={event => {
        if (event.key === 'Escape') { event.preventDefault(); close(); }
        if (event.key !== 'Tab') return;
        const nodes = Array.from(drawer.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), [tabindex="0"]') ?? []);
        const first = nodes[0], last = nodes[nodes.length - 1];
        if (!first) { event.preventDefault(); return; }
        if (event.shiftKey && (document.activeElement === first || document.activeElement === drawer.current)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }}>
      <div className={styles.drawerHeader}><h2>Virement libre Mobile Money</h2><button type="button" className={styles.iconButton} onClick={close} disabled={busy} aria-label="Fermer"><X size={18} /></button></div>
      <p className={styles.notice}>Fonds du compte FlexPaie Zwanga. Aucun gain ni jeton utilisateur n’est débité. Pour débloquer un retrait existant, utilisez « Suivi / relance » ; ce virement libre ne le remplace pas.</p>
      {error ? <div className={styles.error} role="alert">{error}</div> : null}
      {!authorized ? <p className={styles.notice}>Action réservée au super administrateur.</p> : <>
        {result ? <><p className={styles.notice} role="status">{directPayoutStatusMessage(result.status)}</p><dl className={styles.detailList}>
          <dt>Numéro Mobile Money</dt><dd>{result.phone}</dd><dt>Montant</dt><dd>{formatMoney(result.amount, result.currency)}</dd>
          <dt>Statut</dt><dd>{financeLabel(result.status)}</dd><dt>Motif</dt><dd>{result.reason}</dd>
          <dt>Transaction Zwanga</dt><dd className={styles.reference}>{result.id}</dd><dt>Référence</dt><dd className={styles.reference}>{result.reference}</dd>
        </dl></> : !attempted ? <form className={styles.formStack} onSubmit={event => { event.preventDefault(); void submit(); }}>
          <label className={styles.field}>Numéro Mobile Money<input required value={phone} maxLength={13} placeholder="+243…" disabled={busy || !ready} onChange={event => { setPhone(event.target.value); setConfirmed(false); }} /></label>
          <label className={styles.field}>Montant (CDF)<input required type="number" min="1" max="99999999.99" step="0.01" value={amount} disabled={busy || !ready} onChange={event => { setAmount(event.target.value); setConfirmed(false); }} /></label>
          <label className={styles.field}>Motif<textarea required minLength={5} maxLength={500} value={reason} disabled={busy || !ready} onChange={event => { setReason(event.target.value); setConfirmed(false); }} /></label>
          <label className={styles.candidate}><input type="checkbox" checked={confirmed} disabled={busy || !ready} onChange={event => setConfirmed(event.target.checked)} /><span>Je confirme le numéro, le montant et le décaissement des fonds Zwanga.</span></label>
          {key && !directPayoutInputError(phone, amount, reason) && confirmed ? <FinanceOtpConfirmation
            intent={{ action: 'direct_payout', payload: { idempotencyKey: key, phone: phone.trim(), amount: Number(amount), currency: 'CDF', reason: reason.trim(), confirmed: true } }}
            code={otpCode} onCode={setOtpCode} disabled={busy || !ready} /> : null}
          <button type="submit" className={styles.button} disabled={busy || !ready || !confirmed || !/^\d{6}$/.test(otpCode) || !!directPayoutInputError(phone, amount, reason)}>{busy ? 'Traitement…' : 'Confirmer et envoyer'}</button>
        </form> : <p className={styles.notice}>Un envoi a été tenté. Vérifiez cet ordre avant toute autre opération.</p>}
        {key ? <p className={styles.helpText}>Identifiant de l’ordre : {key}</p> : null}
        {attempted ? <div className={styles.modalActions}><button type="button" className={styles.secondaryButton} disabled={busy || !ready} onClick={refresh}>Vérifier sans renvoyer d’argent</button>
          {!result ? <button type="button" className={styles.secondaryButton} disabled={busy || !ready} onClick={async () => {
            if (lock.current || !authorized || !key) return;
            if (await confirmAction('Reprendre le même ordre, avec le même identifiant ? Saisissez le numéro, le montant et le motif initiaux. Le serveur refusera toute modification d’un ordre déjà enregistré.')) {
              setAttempted(false); setConfirmed(false); setError(null);
            }
          }}>Reprendre le même ordre</button> : null}
          {result && ['succeeded', 'failed', 'cancelled'].includes(result.status) ? <button type="button" className={styles.secondaryButton} disabled={busy} onClick={newOrder}>Nouveau virement distinct</button> : null}</div> : null}
      </>}
    </aside>
  </div>;
}
