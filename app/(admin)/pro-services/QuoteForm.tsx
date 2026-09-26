"use client";
import { useState } from "react";
import { useProCaseActionMutation } from "@/lib/features/proServices/proServicesApi";
import {
  minor,
  type Offering,
  type ServiceCase,
} from "@/lib/features/proServices/types";
import { getApiErrorMessage } from "@/lib/utils/apiErrors";
import s from "./services.module.css";

export function QuoteForm({
  item,
  offering,
}: {
  item: ServiceCase;
  offering?: Offering;
}) {
  const [send, state] = useProCaseActionMutation();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  return (
    <details>
      <summary>Préparer ou remplacer le devis</summary>
      <form
        className={s.form}
        onSubmit={async (event) => {
          event.preventDefault();
          setError("");
          setSuccess("");
          const data = new FormData(event.currentTarget);
          try {
            const installments = String(data.get("installments") || "")
              .split("\n")
              .filter((line) => line.trim())
              .map((line) => {
                const [dueDate, value] = line.split(";");
                return {
                  dueDate: new Date(
                    `${dueDate.trim()}T12:00:00Z`,
                  ).toISOString(),
                  amountMinor: minor(value ?? ""),
                };
              });
            const retainedDocuments = data
              .getAll("retained")
              .map((code) => ({
                code: String(code),
                label:
                  offering?.documentOptions.find((doc) => doc.code === code)
                    ?.label ?? String(code),
              }));
            await send({
              id: item.id,
              action: "quote",
              body: {
                currency: data.get("currency"),
                totalMinor: minor(String(data.get("total"))),
                depositMinor: minor(String(data.get("deposit"))),
                providerName: data.get("provider"),
                description: data.get("description"),
                validUntil: new Date(
                  String(data.get("validUntil")),
                ).toISOString(),
                installments,
                retainedDocuments,
              },
            }).unwrap();
            setSuccess(
              "Devis proposé au titulaire. Son acceptation reste indispensable.",
            );
          } catch (reason) {
            setError(
              reason instanceof Error
                ? reason.message
                : getApiErrorMessage(
                    reason,
                    "Impossible de proposer le devis.",
                  ),
            );
          }
        }}
      >
        <p className={s.muted}>
          Le total doit comprendre tous les coûts convenus. L’échéancier doit
          couvrir exactement le total moins l’apport. Aucun intérêt automatique
          ni frais caché.
        </p>
        {!offering?.terms && (
          <p className={s.notice}>
            Contrat non configuré : le devis peut être préparé, mais ni accepté
            ni financé.
          </p>
        )}
        <div className={s.columns}>
          <label>
            Total
            <input
              name="total"
              inputMode="decimal"
              required
              defaultValue={
                item.quote ? String(item.quote.totalMinor / 100) : ""
              }
            />
          </label>
          <label>
            Apport
            <input
              name="deposit"
              inputMode="decimal"
              required
              defaultValue={
                item.quote ? String(item.quote.depositMinor / 100) : "0"
              }
            />
          </label>
        </div>
        <label>
          Devise
          <select name="currency" defaultValue={item.quote?.currency ?? "CDF"}>
            <option>CDF</option>
            <option>USD</option>
          </select>
        </label>
        <label>
          Prestataire payé
          <input
            name="provider"
            minLength={3}
            maxLength={200}
            required
            defaultValue={item.quote?.providerName}
          />
        </label>
        <label>
          Détail des prestations et coûts
          <textarea
            name="description"
            minLength={10}
            maxLength={3000}
            required
            defaultValue={item.quote?.description}
          />
        </label>
        <label>
          Date limite d’acceptation
          <input name="validUntil" type="datetime-local" required />
        </label>
        <label>
          Échéances : une ligne « AAAA-MM-JJ ; montant »
          <textarea
            name="installments"
            placeholder="2027-01-15 ; 25000"
            defaultValue={item.quote?.installments
              .map(
                (line) =>
                  `${line.dueDate.slice(0, 10)} ; ${line.amountMinor / 100}`,
              )
              .join("\n")}
          />
        </label>
        <p className={s.muted}>
          Chaque échéance doit être postérieure à la validité du devis. Seuls
          les originaux autorisés par le contrat sont sélectionnables.
        </p>
        {offering?.terms?.custodyCodes.map((code) => (
          <label key={code} className={s.check}>
            <input
              type="checkbox"
              name="retained"
              value={code}
              defaultChecked={item.quote?.retainedDocuments.some(
                (doc) => doc.code === code,
              )}
            />
            {offering.documentOptions.find((doc) => doc.code === code)?.label ??
              code}
          </label>
        ))}
        {error && (
          <p role="alert" className={s.error}>
            {error}
          </p>
        )}
        {success && <p role="status">{success}</p>}
        <button className={s.button} disabled={state.isLoading}>
          {state.isLoading ? "Enregistrement…" : "Proposer le devis"}
        </button>
      </form>
    </details>
  );
}
