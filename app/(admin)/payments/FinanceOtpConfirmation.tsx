"use client";

import { useEffect, useRef, useState } from 'react';
import { useSendFinanceOtpMutation, type FinanceOtpIntent } from '@/lib/features/finance/financeOtpApi';
import { getApiErrorMessage } from '@/lib/utils/apiErrors';
import styles from '../finance.module.css';

/** Reuses existing controls/styles. The code is never persisted in storage. */
export function FinanceOtpConfirmation({ intent, code, onCode, disabled }: {
  intent: FinanceOtpIntent; code: string; onCode: (code: string) => void; disabled: boolean;
}) {
  const [send, sending] = useSendFinanceOtpMutation();
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const fingerprint = JSON.stringify(intent);
  const current = useRef(fingerprint); current.current = fingerprint;
  const lock = useRef(false);
  useEffect(() => { onCode(''); setNotice(''); setError(''); }, [fingerprint, onCode]);
  return <div className={styles.formStack}>
    <p className={styles.helpText}>Un code SMS sur votre numéro administrateur confirme cette opération uniquement.</p>
    <button type="button" className={styles.secondaryButton} disabled={disabled || sending.isLoading} onClick={async () => {
      if (lock.current) return;
      lock.current = true; setError(''); onCode('');
      const issuedFor = fingerprint;
      try {
        const result = await send(intent).unwrap();
        if (current.current === issuedFor) setNotice(`Code envoyé au ${result.maskedPhone}.`);
      } catch (failure) {
        if (current.current === issuedFor) setError(getApiErrorMessage(failure, 'Envoi du code indisponible. Aucun argent envoyé.'));
      } finally { lock.current = false; }
    }}>{sending.isLoading ? 'Envoi du code…' : 'Recevoir le code de confirmation'}</button>
    {notice ? <p className={styles.helpText} role="status">{notice}</p> : null}
    {error ? <p className={styles.error} role="alert">{error}</p> : null}
    <label className={styles.field}>Code SMS administrateur
      <input type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code}
        disabled={disabled || sending.isLoading} onChange={event => onCode(event.target.value.replace(/\D/g, '').slice(0, 6))} />
    </label>
  </div>;
}
