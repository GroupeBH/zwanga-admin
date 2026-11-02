"use client";
import { useRef, useState } from "react";
import type { AppRelease } from "@/lib/features/appUpdates/appUpdatesApi";
import { useCreateUpdateCampaignMutation, useGetUpdateCampaignsQuery, usePreviewUpdateCampaignQuery, useWithdrawUpdateCampaignMutation } from "@/lib/features/appUpdates/appUpdatesApi";
import { getApiErrorMessage } from "@/lib/utils/apiErrors";
import shared from "../styles/page.module.css";
import styles from "./page.module.css";
import { updateCampaignIntent } from "./updateCampaignIntent";

export function UpdateCampaigns({ releases }: { releases: AppRelease[] }) {
  const [releaseId, setReleaseId] = useState("");
  const [title, setTitle] = useState("Une mise à jour de Zwanga est disponible");
  const [body, setBody] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState(""), [message, setMessage] = useState("");
  const lock = useRef(false);
  const { data: preview, isFetching: previewLoading, error: previewError } = usePreviewUpdateCampaignQuery(releaseId, { skip: !releaseId });
  const { data: campaigns = [], error: listError, refetch } = useGetUpdateCampaignsQuery();
  const [create, creating] = useCreateUpdateCampaignMutation();
  const [withdraw, withdrawing] = useWithdrawUpdateCampaignMutation();
  const busy = creating.isLoading || withdrawing.isLoading;
  const edit = () => { setConfirmed(false); setMessage(""); };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (lock.current || !confirmed || previewLoading || previewError || !preview?.eligibleInstallations) return;
    lock.current = true; setError(""); setMessage("");
    const input = { releaseId, title: title.trim(), body: body.trim() }, key = JSON.stringify(input);
    try {
      const id = updateCampaignIntent(key, sessionStorage, () => crypto.randomUUID());
      await create({ ...input, id }).unwrap();
      setMessage("Envoi enregistré. La livraison se fait progressivement aux installations abonnées, avec ou sans compte.");
      setConfirmed(false);
    } catch (reason) { setError(getApiErrorMessage(reason, "Envoi non confirmé. Réessayez : le même message ne sera pas créé deux fois.")); }
    finally { lock.current = false; }
  };
  const cancel = async (id: string) => {
    if (lock.current) return;
    lock.current = true; setError("");
    try { await withdraw(id).unwrap(); setMessage("Envoi arrêté. Les notifications déjà livrées ne peuvent pas être rappelées."); }
    catch (reason) { setError(getApiErrorMessage(reason, "Impossible d’arrêter cet envoi.")); }
    finally { lock.current = false; }
  };
  return <section className={styles.section} aria-labelledby="manual-update-title">
    <h2 id="manual-update-title">Envoyer un message aux installations</h2>
    <p className={shared.mutedText}>En complément de l’annonce automatique, contactez les personnes ayant accepté les annonces, même sans compte. Seules les versions plus anciennes sur la même plateforme sont ciblées.</p>
    {error && <p role="alert" className={shared.errorText}>{error}</p>}
    {message && <p role="status" className={shared.successText}>{message}</p>}
    <form onSubmit={submit} className={styles.form}><fieldset disabled={busy} className={styles.fields}>
      <label>Version disponible<select required value={releaseId} onChange={event => { setReleaseId(event.target.value); edit(); }}>
        <option value="">Choisir une version</option>{releases.filter(item => item.available).map(item => <option key={item.id} value={item.id}>{item.platform} · {item.version} / {item.build}</option>)}
      </select></label>
      <label>Titre<input required minLength={3} maxLength={90} value={title} onChange={event => { setTitle(event.target.value); edit(); }} /></label>
      <label>Message<textarea required minLength={3} maxLength={300} rows={3} value={body} onChange={event => { setBody(event.target.value); edit(); }} /></label>
      {releaseId && <p role="status">{previewError ? "Comptage indisponible. Actualisez avant d’envoyer." : previewLoading ? "Comptage…" : `${preview?.eligibleInstallations ?? 0} installation(s) éligible(s).`}</p>}
      <p className={shared.mutedText}>Aperçu : <strong>{title}</strong><br />{body || "Votre message apparaîtra ici."}</p>
      <label className={styles.confirm}><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />Je valide ce message et son envoi aux installations éligibles.</label>
      <button type="submit" className={shared.primaryButton} disabled={busy || !confirmed || previewLoading || !!previewError || !preview?.eligibleInstallations}>{creating.isLoading ? "Enregistrement…" : "Envoyer la notification"}</button>
    </fieldset></form>
    <div className={shared.sectionHeader}><h3>Derniers envois manuels</h3><button className={shared.secondaryButton} type="button" onClick={() => void refetch()}>Actualiser</button></div>
    {listError ? <p role="alert">Impossible de lire l’historique.</p> : <ul>{campaigns.map(campaign => <li key={campaign.id}>
      <strong>{campaign.title}</strong> · {campaign.queued} préparées · {campaign.sent} acceptées par le service push
      {campaign.active && <button className={shared.secondaryButton} disabled={busy} type="button" onClick={() => void cancel(campaign.id)}>Arrêter l’envoi</button>}
    </li>)}</ul>}
    <p className={shared.mutedText}>Les chiffres ne prouvent pas la lecture. Une personne n’ayant jamais ouvert cette version de Zwanga ou ayant refusé les notifications n’est pas joignable par ce canal.</p>
  </section>;
}
