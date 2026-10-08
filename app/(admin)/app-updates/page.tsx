"use client";

import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { useGetAppReleasesQuery, usePublishAppReleaseMutation, useWithdrawAppReleaseMutation } from "@/lib/features/appUpdates/appUpdatesApi";
import { getApiErrorMessage } from "@/lib/utils/apiErrors";
import shared from "../styles/page.module.css";
import styles from "./page.module.css";

const stores = {
  ios: "https://apps.apple.com/app/id6756211830",
  android: "https://play.google.com/store/apps/details?id=com.zwanga",
};
export default function AppUpdatesPage() {
  const { data = [], error: loadError, isFetching, refetch } = useGetAppReleasesQuery();
  const [publish, publishing] = usePublishAppReleaseMutation();
  const [withdraw, withdrawing] = useWithdrawAppReleaseMutation();
  const [platform, setPlatform] = useState<"ios" | "android">("android");
  const [version, setVersion] = useState("");
  const [build, setBuild] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [withdrawId, setWithdrawId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const lock = useRef(false);
  const busy = publishing.isLoading || withdrawing.isLoading;
  const unconfirm = () => { setConfirmed(false); setMessage(""); };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!confirmed || lock.current) return;
    lock.current = true;
    setError(""); setMessage("");
    try {
      const release = await publish({ platform, version: version.trim(), build: build.trim(), notes: notes.trim(), storeAvailabilityConfirmed: true }).unwrap();
      setConfirmed(false);
      setMessage(release.available
        ? "Annonce enregistrée. Les appareils éligibles recevront progressivement la notification."
        : "Cette version avait déjà été retirée. Aucune nouvelle annonce ne sera envoyée.");
    } catch (reason) { setError(getApiErrorMessage(reason, "Impossible d’enregistrer l’annonce.")); }
    finally { lock.current = false; }
  };
  const removeAnnouncement = async (id: string) => {
    if (lock.current) return;
    lock.current = true;
    setError(""); setMessage("");
    try {
      await withdraw(id).unwrap();
      setWithdrawId(null);
      setMessage("Annonce retirée. Les notifications déjà livrées ne peuvent pas être rappelées.");
    } catch (reason) { setError(getApiErrorMessage(reason, "Impossible de retirer l’annonce.")); }
    finally { lock.current = false; }
  };

  return <div className={shared.page}>
    <header><h1>Mises à jour de l’application</h1>
      <p className={shared.mutedText}>Annoncez une version disponible sur le store par un message dans l’app et une notification push.</p>
    </header>
    {error && <p role="alert" className={shared.errorText}>{error}</p>}
    {message && <p role="status" className={shared.successText}>{message}</p>}
    <section className={styles.section} aria-labelledby="publish-title">
      <h2 id="publish-title">Nouvelle annonce</h2>
      <form onSubmit={submit} className={styles.form}>
        <fieldset disabled={busy} className={styles.fields}>
          <div className={styles.grid}>
            <label>Plateforme<select value={platform} onChange={e => { setPlatform(e.target.value as "ios" | "android"); unconfirm(); }}>
              <option value="android">Android · Google Play</option><option value="ios">iOS · App Store</option>
            </select></label>
            <label>Version publique<input required value={version} maxLength={32} pattern="[0-9]+(\.[0-9]+){0,2}" placeholder="1.5.0" onChange={e => { setVersion(e.target.value); unconfirm(); }} /></label>
            <label>Numéro de build<input required value={build} maxLength={32} pattern="[0-9]+(\.[0-9]+){0,2}" placeholder={platform === "ios" ? "12" : "42"} onChange={e => { setBuild(e.target.value); unconfirm(); }} /></label>
          </div>
          <label>Nouveautés à afficher<textarea value={notes} maxLength={500} rows={3} onChange={e => { setNotes(e.target.value); unconfirm(); }} /></label>
          <p className={shared.mutedText}>Cette action ne publie pas l’application sur les stores. Seuls les appareils enregistrés avec une version antérieure sont ciblés.</p>
          <a className={styles.storeLink} href={stores[platform]} target="_blank" rel="noopener noreferrer">Vérifier la fiche {platform === "ios" ? "App Store" : "Google Play"} ↗</a>
          <label className={styles.confirm}>
            <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} required />
            Je confirme que cette version et ce build sont téléchargeables par tous les utilisateurs ciblés, sans déploiement progressif.
          </label>
          <button className={shared.primaryButton} disabled={!confirmed || busy || !!loadError} type="submit">{publishing.isLoading ? "Enregistrement…" : "Annoncer la mise à jour"}</button>
        </fieldset>
      </form>
    </section>
    <section className={styles.section} aria-labelledby="history-title">
      <div className={shared.sectionHeader}><h2 id="history-title">Historique des annonces</h2>
        <button type="button" className={shared.secondaryButton} disabled={isFetching} onClick={() => refetch()}>{isFetching ? "Actualisation…" : "Actualiser"}</button>
      </div>
      {loadError ? <p role="alert" className={shared.errorText}>{getApiErrorMessage(loadError, "Impossible de charger les annonces.")}</p>
        : !data.length ? <p className={shared.emptyState}>{isFetching ? "Chargement…" : "Aucune version annoncée."}</p>
        : <div className={shared.tableWrapper}><table className={shared.table}>
          <thead><tr><th>Plateforme</th><th>Version / build</th><th>Annoncée le</th><th>Statut</th><th>Action</th></tr></thead>
          <tbody>{data.map(item => <tr key={item.id}>
            <td>{item.platform === "ios" ? "iOS" : "Android"}</td><td>{item.version} / {item.build}</td>
            <td>{new Date(item.publishedAt).toLocaleString("fr-CD")}</td><td>{item.available ? "Active" : "Inactive"}</td>
            <td>{item.available && (withdrawId === item.id ? <div className={shared.rowActions}>
              <button type="button" className={shared.dangerButton} disabled={busy} onClick={() => void removeAnnouncement(item.id)}>Confirmer le retrait</button>
              <button type="button" className={shared.secondaryButton} disabled={busy} onClick={() => setWithdrawId(null)}>Annuler</button>
            </div> : <button type="button" className={shared.secondaryButton} disabled={busy} onClick={() => setWithdrawId(item.id)}>Retirer l’annonce</button>)}</td>
          </tr>)}</tbody>
        </table></div>}
    </section>
  </div>;
}
