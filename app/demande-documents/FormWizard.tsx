"use client";
import { useEffect, useRef, useState } from "react";
import type { Offering } from "@/lib/features/proServices/types";
import { publicServiceRequest } from "@/lib/features/proServices/publicRequest";
import s from "../(admin)/pro-services/services.module.css";

export function FormWizard() {
  const [catalogue, setCatalogue] = useState<Offering[]>([]);
  const [service, setService] = useState("documents");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reference, setReference] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const [reload, setReload] = useState(0);
  const pending = useRef<unknown>(null);
  const abort = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    setError("");
    publicServiceRequest(controller.signal)
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.message);
        if (!controller.signal.aborted) setCatalogue(body);
      })
      .catch((reason) => {
        if (!controller.signal.aborted)
          setError(reason.message || "Catalogue indisponible.");
      });
    return () => controller.abort();
  }, [reload]);
  useEffect(() => () => abort.current?.abort(), []);
  const selected = catalogue.find((item) => item.code === service);
  if (reference)
    return (
      <section className={s.panel} aria-live="polite">
        <h2>Votre demande est enregistrée.</h2>
        <p>
          L’équipe Zwanga vous contactera pour étudier votre besoin. Aucun
          financement n’est engagé.
        </p>
        <p>
          Conservez votre référence : <strong>{reference}</strong>
        </p>
        <p className={s.muted}>
          Pour suivre le dossier dans l’application, l’équipe vérifiera votre
          compte avant de le rattacher.
        </p>
      </section>
    );
  return (
    <section className={s.panel}>
      <p className={s.notice}>
        Vous déposez une demande d’accompagnement, pas une souscription à
        l’abonnement Pro. Les tarifs et conditions seront précisés dans un
        devis. Aucun original ne sera conservé sans conditions validées et
        acceptées.
      </p>
      <form
        className={s.form}
        onSubmit={async (event) => {
          event.preventDefault();
          if (busy) return;
          const data = new FormData(event.currentTarget);
          pending.current ??= {
            submissionKey: crypto.randomUUID(),
            contactConsent: true,
            serviceCode: service,
            application: {
              fullName: data.get("name"),
              phone: data.get("phone"),
              vehicleDescription: data.get("vehicle"),
              plate: data.get("plate"),
              documents: data.getAll("documents"),
              description: data.get("description"),
            },
          };
          setBusy(true);
          setError("");
          const controller = new AbortController();
          abort.current = controller;
          try {
            const response = await publicServiceRequest(controller.signal, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(pending.current),
            });
            const body = await response.json();
            if (!response.ok) {
              const definitive =
                !uncertain && response.status >= 400 && response.status < 500;
              // A rejection on retry cannot cancel a possibly committed first attempt.
              if (definitive) pending.current = null;
              setUncertain(!definitive);
              throw new Error(
                Array.isArray(body.message)
                  ? body.message.join(", ")
                  : body.message,
              );
            }
            setReference(body.id);
            setUncertain(false);
          } catch (reason) {
            if (!controller.signal.aborted) {
              setUncertain(Boolean(pending.current));
              setError(
                reason instanceof Error
                  ? reason.message
                  : "Envoi non confirmé.",
              );
            }
          } finally {
            if (!controller.signal.aborted) setBusy(false);
          }
        }}
      >
        <fieldset
          disabled={busy || uncertain}
          className={s.form}
          style={{ border: 0, padding: 0 }}
        >
          <label>
            Service
            <select
              value={service}
              onChange={(event) => setService(event.target.value)}
            >
              {catalogue.map((item) => (
                <option
                  key={item.code}
                  value={item.code}
                  disabled={item.availability !== "open"}
                >
                  {item.name}
                  {item.availability !== "open" ? " — à venir / en pause" : ""}
                </option>
              ))}
            </select>
          </label>
          <div className={s.columns}>
            <label>
              Nom complet
              <input
                name="name"
                autoComplete="name"
                minLength={3}
                maxLength={180}
                required
              />
            </label>
            <label>
              Téléphone
              <input
                name="phone"
                type="tel"
                autoComplete="tel"
                minLength={8}
                maxLength={20}
                required
              />
            </label>
          </div>
          <div className={s.columns}>
            <label>
              Véhicule (facultatif)
              <input name="vehicle" maxLength={180} />
            </label>
            <label>
              Plaque (facultatif)
              <input name="plate" maxLength={40} />
            </label>
          </div>
          {selected?.documentOptions.length ? (
            <fieldset style={{ border: 0, padding: 0 }}>
              <legend>Documents souhaités</legend>
              {selected.documentOptions.map((doc) => (
                <label className={s.check} key={doc.code}>
                  <input type="checkbox" name="documents" value={doc.code} />
                  {doc.label}
                </label>
              ))}
            </fieldset>
          ) : null}
          <label>
            Votre besoin
            <textarea
              name="description"
              maxLength={2000}
              minLength={service === "documents" ? undefined : 10}
              required={service !== "documents"}
            />
          </label>
          <label className={s.check}>
            <input type="checkbox" required />
            Je souhaite être contacté pour étudier cette demande. Je comprends
            qu’un devis et des conditions validées devront être acceptés avant
            tout engagement.
          </label>
          <a href="/privacy">Utilisation de vos données personnelles</a>
        </fieldset>
        {error && (
          <p role="alert" className={s.error}>
            {error}
          </p>
        )}
        {!catalogue.length && (
          <button
            type="button"
            className={s.button}
            onClick={() => setReload((value) => value + 1)}
          >
            Recharger le catalogue
          </button>
        )}
        {uncertain && (
          <p className={s.muted}>
            L’envoi n’est pas confirmé. Ne recréez pas de demande : réessayez
            ici avec la même référence.
          </p>
        )}
        <button
          className={s.button}
          disabled={busy || selected?.availability !== "open"}
        >
          {busy
            ? "Envoi…"
            : uncertain
              ? "Vérifier mon envoi"
              : "Envoyer ma demande"}
        </button>
      </form>
    </section>
  );
}
