"use client";
import { useState } from "react";
import { useProCaseActionMutation } from "@/lib/features/proServices/proServicesApi";
import {
  amount,
  labels,
  minor,
  type ServiceCase,
} from "@/lib/features/proServices/types";
import { getApiErrorMessage } from "@/lib/utils/apiErrors";
import s from "./services.module.css";

const nextStates: Record<string, string[]> = {
  submitted: ["reviewing", "needs_info", "rejected", "cancelled"],
  reviewing: ["needs_info", "rejected", "cancelled"],
  needs_info: ["reviewing", "rejected", "cancelled"],
  quoted: ["reviewing", "rejected", "cancelled"],
  accepted: ["processing"],
  processing: ["ready"],
  ready: ["completed"],
};
export function CaseOperations({ item }: { item: ServiceCase }) {
  const [send, state] = useProCaseActionMutation();
  const [message, setMessage] = useState("");
  const run = async (
    action: "status" | "owner" | "ledger" | `documents/${string}`,
    body: unknown,
  ) => {
    setMessage("");
    try {
      await send({ id: item.id, action, body }).unwrap();
      setMessage("Opération enregistrée.");
    } catch (reason) {
      setMessage(
        getApiErrorMessage(
          reason,
          "Opération non enregistrée. Réessayez avec la même référence.",
        ),
      );
    }
  };
  return (
    <>
      {message && (
        <p role="status" className={s.notice}>
          {message}
        </p>
      )}
      {!!nextStates[item.status]?.length && (
        <details>
          <summary>Faire avancer le dossier</summary>
          <form
            className={s.form}
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              void run("status", {
                status: data.get("status"),
                message: data.get("message"),
              });
            }}
          >
            <label>
              Étape suivante
              <select name="status">
                {nextStates[item.status].map((status) => (
                  <option key={status} value={status}>
                    {labels[status]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Message visible par le titulaire
              <textarea name="message" maxLength={2000} />
            </label>
            <button disabled={state.isLoading} className={s.button}>
              Mettre à jour le suivi
            </button>
          </form>
        </details>
      )}
      {!item.ownerId && (
        <details>
          <summary>Rattacher la demande web à son titulaire</summary>
          <form
            className={s.form}
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              void run("owner", {
                ownerId: data.get("ownerId"),
                evidence: data.get("evidence"),
              });
            }}
          >
            <p className={s.notice}>
              Vérifiez l’identité du demandeur et son compte avant ce
              rattachement. Un numéro déclaré dans un formulaire ne suffit pas.
              Le titulaire acceptera lui-même le devis dans l’application.
            </p>
            <label>
              Identifiant du compte vérifié
              <input name="ownerId" required pattern="[0-9a-fA-F-]{36}" />
            </label>
            <label>
              Preuve de la vérification effectuée
              <textarea
                name="evidence"
                minLength={10}
                maxLength={2000}
                required
              />
            </label>
            <label className={s.check}>
              <input type="checkbox" required />
              J’ai vérifié que ce compte appartient au demandeur.
            </label>
            <button disabled={state.isLoading} className={s.button}>
              Rattacher le titulaire
            </button>
          </form>
        </details>
      )}
      {item.acceptedAt && (
        <>
          <div className={s.section}>
            <h3>Suivi financier</h3>
            <div className={s.summary}>
              <span>
                Apport :{" "}
                {amount(item.finances.depositPaidMinor, item.quote?.currency)}
              </span>
              <span>
                Avance :{" "}
                {amount(item.finances.fundedMinor, item.quote?.currency)}
              </span>
              <strong>
                Solde dû :{" "}
                {amount(item.finances.balanceMinor, item.quote?.currency)}
              </strong>
            </div>
            <p className={s.muted}>
              Une écriture constate un versement déjà effectué et vérifié. Ce
              module ne transfère pas d’argent et ne prélève pas les revenus du
              conducteur.
            </p>
          </div>
          <details>
            <summary>Enregistrer un versement vérifié</summary>
            <form
              className={s.form}
              onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                try {
                  void run("ledger", {
                    kind: data.get("kind"),
                    amountMinor: minor(String(data.get("amount"))),
                    reference: data.get("reference"),
                    evidence: data.get("evidence"),
                  });
                } catch (reason) {
                  setMessage((reason as Error).message);
                }
              }}
            >
              <label>
                Opération
                <select name="kind">
                  <option value="deposit">Apport reçu</option>
                  <option value="funding">Avance versée au prestataire</option>
                  <option value="repayment">Remboursement reçu</option>
                </select>
              </label>
              <label>
                Montant en {item.quote?.currency}
                <input name="amount" inputMode="decimal" required />
              </label>
              <label>
                Référence unique du versement
                <input
                  name="reference"
                  minLength={6}
                  maxLength={160}
                  required
                />
              </label>
              <label>
                Justificatif / référence de preuve
                <textarea
                  name="evidence"
                  required
                  minLength={10}
                  maxLength={2000}
                />
              </label>
              <label className={s.check}>
                <input type="checkbox" required />
                J’ai contrôlé ce versement réellement effectué. Cette écriture
                sera conservée dans l’historique.
              </label>
              <button disabled={state.isLoading} className={s.button}>
                Enregistrer le versement
              </button>
            </form>
          </details>
          {!!item.ledger.length && (
            <table className={s.table}>
              <thead>
                <tr>
                  <th>Opération</th>
                  <th>Montant</th>
                  <th>Référence</th>
                </tr>
              </thead>
              <tbody>
                {item.ledger.map((entry) => (
                  <tr key={entry.id}>
                    <td>{labels[entry.kind]}</td>
                    <td>{amount(entry.amountMinor, entry.currency)}</td>
                    <td>{entry.reference}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!!item.documents.length && (
            <div className={s.section}>
              <h3>Registre des originaux</h3>
              {item.documents.map((doc) => (
                <div key={doc.id}>
                  <strong>{doc.label}</strong> · {labels[doc.status]}
                  <p className={s.muted}>
                    {doc.receipt && `Reçu : ${doc.receipt}`}{" "}
                    {doc.returnReceipt && `Restitution : ${doc.returnReceipt}`}
                  </p>
                  {["expected", "release_ready"].includes(doc.status) && (
                    <form
                      className={s.form}
                      onSubmit={(event) => {
                        event.preventDefault();
                        const data = new FormData(event.currentTarget);
                        void run(`documents/${doc.id}`, {
                          action:
                            doc.status === "expected" ? "receive" : "return",
                          receipt: data.get("receipt"),
                          storageLocation:
                            data.get("storageLocation") ?? undefined,
                        });
                      }}
                    >
                      {doc.status === "expected" && (
                        <label>
                          Lieu sécurisé de conservation
                          <input
                            name="storageLocation"
                            required
                            maxLength={160}
                          />
                        </label>
                      )}
                      <label>
                        Référence du reçu signé de{" "}
                        {doc.status === "expected" ? "remise" : "restitution"}
                        <input
                          name="receipt"
                          minLength={3}
                          maxLength={300}
                          required
                        />
                      </label>
                      <button
                        disabled={state.isLoading}
                        className={`${s.button} ${s.secondary}`}
                      >
                        {doc.status === "expected"
                          ? "Enregistrer la garde"
                          : "Confirmer la restitution physique"}
                      </button>
                    </form>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
