"use client";
import { useState } from "react";
import { useConfigureProServiceMutation } from "@/lib/features/proServices/proServicesApi";
import type { Offering } from "@/lib/features/proServices/types";
import { getApiErrorMessage } from "@/lib/utils/apiErrors";
import s from "./services.module.css";
export function ServiceConfiguration({ item }: { item: Offering }) {
  const [save, state] = useConfigureProServiceMutation();
  const [message, setMessage] = useState("");
  return (
    <details className={s.section}>
      <summary>{item.name} · configuration</summary>
      <form
        className={s.form}
        onSubmit={async (event) => {
          event.preventDefault();
          setMessage("");
          const data = new FormData(event.currentTarget);
          try {
            await save({
              code: item.code,
              body: {
                availability: data.get("availability"),
                legalValidated: data.get("legal") === "on",
                termsVersion: data.get("version") ?? "",
                termsText: data.get("terms") ?? "",
                validationReference: data.get("reference") ?? "",
                custodyCodes: data.getAll("custody"),
              },
            }).unwrap();
            setMessage("Configuration enregistrée.");
          } catch (reason) {
            setMessage(
              getApiErrorMessage(reason, "Configuration non enregistrée."),
            );
          }
        }}
      >
        <label>
          Ouverture des demandes
          <select name="availability" defaultValue={item.availability}>
            <option value="coming_soon">À venir</option>
            <option value="paused">En pause</option>
            <option value="open">Demandes ouvertes</option>
          </select>
        </label>
        {item.code === "documents" ? (
          <>
            <p className={s.notice}>
              Ne cochez pas cette validation avant la revue juridique réelle.
              L’ouverture des demandes ne nécessite aucun contrat. Une nouvelle
              version invalide les devis non encore acceptés.
            </p>
            <label className={s.check}>
              <input
                type="checkbox"
                name="legal"
                defaultChecked={Boolean(item.terms)}
              />
              Je confirme que ce contrat et la liste des originaux conservables
              ont été validés juridiquement.
            </label>
            <label>
              Version du contrat
              <input
                name="version"
                maxLength={80}
                defaultValue={item.terms?.version}
              />
            </label>
            <label>
              Texte intégral communiqué au demandeur
              <textarea
                name="terms"
                maxLength={20000}
                defaultValue={item.terms?.text}
              />
            </label>
            <label>
              Référence de validation juridique
              <input
                name="reference"
                maxLength={300}
                defaultValue={item.terms?.validationReference}
              />
            </label>
            <p className={s.muted}>
              Originaux autorisés explicitement. Ne pas retenir les pièces
              nécessaires à l’identité ou à la circulation sans base légale
              applicable et solution licite pour leur usage.
            </p>
            {item.documentOptions.map((doc) => (
              <label className={s.check} key={doc.code}>
                <input
                  type="checkbox"
                  name="custody"
                  value={doc.code}
                  defaultChecked={item.terms?.custodyCodes.includes(doc.code)}
                />
                {doc.label}
              </label>
            ))}
          </>
        ) : (
          <p className={s.notice}>
            Seule la collecte des besoins peut être activée. Le financement et
            les opérations propres à ce service restent bloqués jusqu’à leur
            implémentation.
          </p>
        )}
        {!!message && <p role="status">{message}</p>}
        <button className={s.button} disabled={state.isLoading}>
          Enregistrer la configuration
        </button>
      </form>
    </details>
  );
}
