"use client";
import { useState } from "react";
import {
  useProCatalogueQuery,
  useProCasesQuery,
  useProCaseQuery,
} from "@/lib/features/proServices/proServicesApi";
import { useGetCurrentUserProfileQuery } from "@/lib/features/profile/profileApi";
import { amount, labels } from "@/lib/features/proServices/types";
import { getApiErrorMessage } from "@/lib/utils/apiErrors";
import { CaseOperations } from "./CaseOperations";
import { QuoteForm } from "./QuoteForm";
import { ServiceConfiguration } from "./ServiceConfiguration";
import s from "./services.module.css";

export default function ProServicesPage() {
  const [cursor, setCursor] = useState<string>();
  const [status, setStatus] = useState("");
  const [id, setId] = useState("");
  const catalogue = useProCatalogueQuery();
  const list = useProCasesQuery({ cursor, status: status || undefined });
  const detail = useProCaseQuery(id, { skip: !id });
  const profile = useGetCurrentUserProfileQuery();
  const item = detail.currentData;
  return (
    <main className={s.page}>
      <h1>Zwanga Services</h1>
      <p className={s.muted}>
        Démarches, financement et registre des originaux — un suivi commun au
        mobile et au site.
      </p>
      <p className={s.notice}>
        Le financement reste verrouillé sans contrat validé. Une demande n’est
        ni un crédit accordé ni une autorisation de conserver des originaux.
      </p>
      {catalogue.isError && (
        <p role="alert" className={s.error}>
          Catalogue indisponible.{" "}
          <button onClick={() => catalogue.refetch()}>Réessayer</button>
        </p>
      )}
      <div className={s.layout}>
        <aside className={s.panel}>
          <h2>Dossiers</h2>
          <select
            aria-label="Filtrer les dossiers"
            className={s.filter}
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setCursor(undefined);
            }}
          >
            <option value="">Tous les statuts</option>
            {[
              "submitted",
              "reviewing",
              "needs_info",
              "quoted",
              "accepted",
              "processing",
              "ready",
              "completed",
              "rejected",
              "cancelled",
            ].map((key) => (
              <option value={key} key={key}>
                {labels[key]}
              </option>
            ))}
          </select>
          <button
            className={`${s.button} ${s.secondary}`}
            disabled={list.isFetching}
            onClick={() => {
              list.refetch();
              if (id) detail.refetch();
            }}
          >
            Actualiser
          </button>
          {list.isFetching && <p role="status">Chargement…</p>}
          {list.isError && (
            <p role="alert" className={s.error}>
              {getApiErrorMessage(list.error, "Dossiers indisponibles.")}
            </p>
          )}
          <div className={s.list}>
            {list.currentData?.items.map((row) => (
              <button
                className={s.item}
                key={row.id}
                aria-pressed={row.id === id}
                onClick={() => setId(row.id)}
              >
                <strong>{row.fullName}</strong>
                <span>
                  {catalogue.data?.find(
                    (service) => service.code === row.serviceCode,
                  )?.name ?? row.serviceCode}
                </span>
                <span className={s.badge}>
                  {labels[row.status]} ·{" "}
                  {new Date(row.createdAt).toLocaleDateString("fr-FR")}
                </span>
              </button>
            ))}
          </div>
          {!list.isFetching &&
            !list.isError &&
            !list.currentData?.items.length && (
              <p className={s.muted}>Aucun dossier.</p>
            )}
          {list.currentData?.nextCursor && (
            <button
              className={`${s.button} ${s.secondary}`}
              onClick={() =>
                setCursor(list.currentData?.nextCursor ?? undefined)
              }
            >
              Page suivante
            </button>
          )}
          {cursor && (
            <button
              className={`${s.button} ${s.secondary}`}
              onClick={() => setCursor(undefined)}
            >
              Plus récents
            </button>
          )}
        </aside>
        <section className={s.panel}>
          {!id && (
            <>
              <h2>Choisissez un dossier</h2>
              <p className={s.muted}>
                Les nouvelles demandes web et mobile sont réunies ici. Les
                anciennes demandes restent dans leurs systèmes d’origine.
              </p>
            </>
          )}
          {detail.isFetching && <p role="status">Mise à jour du dossier…</p>}
          {detail.isError && (
            <p role="alert" className={s.error}>
              {getApiErrorMessage(detail.error, "Dossier indisponible.")}
            </p>
          )}
          {item && (
            <div key={item.id}>
              <div className={s.summary}>
                <h2>{item.application.fullName}</h2>
                <span className={s.badge}>{labels[item.status]}</span>
              </div>
              <p className={s.muted}>
                {item.application.phone} · Origine :{" "}
                {item.origin === "web" ? "Site web" : "Application"}
              </p>
              <p>
                {item.application.vehicleDescription} {item.application.plate}
              </p>
              <p>
                {item.application.documents
                  .map(
                    (code) =>
                      catalogue.data
                        ?.find((service) => service.code === item.serviceCode)
                        ?.documentOptions.find((doc) => doc.code === code)
                        ?.label ?? code,
                  )
                  .join(", ")}
              </p>
              <p>{item.application.description}</p>
              {!!item.customerMessage && (
                <p className={s.notice}>{item.customerMessage}</p>
              )}
              {item.quote && (
                <div className={s.section}>
                  <h3>
                    Devis v{item.quote.version} ·{" "}
                    {amount(item.quote.totalMinor, item.quote.currency)}
                  </h3>
                  <p>{item.quote.description}</p>
                  <p className={s.muted}>
                    Prestataire : {item.quote.providerName} · Apport :{" "}
                    {amount(item.quote.depositMinor, item.quote.currency)}
                  </p>
                  <p>
                    {item.acceptedAt
                      ? `Accepté le ${new Date(item.acceptedAt).toLocaleString("fr-FR")}`
                      : item.canAccept
                        ? "En attente de l’acceptation du titulaire."
                        : "Acceptation verrouillée (contrat, ouverture ou validité)."}
                  </p>
                </div>
              )}
              {!item.acceptedAt &&
                item.serviceCode === "documents" &&
                ["submitted", "reviewing", "needs_info", "quoted"].includes(
                  item.status,
                ) && (
                  <QuoteForm
                    key={item.quote?.version ?? 0}
                    item={item}
                    offering={catalogue.data?.find(
                      (service) => service.code === item.serviceCode,
                    )}
                  />
                )}
              <CaseOperations item={item} />
              <details>
                <summary>Historique récent</summary>
                {item.events.map((event) => (
                  <p className={s.muted} key={event.id}>
                    {new Date(event.createdAt).toLocaleString("fr-FR")} ·{" "}
                    {event.action}
                  </p>
                ))}
              </details>
            </div>
          )}
        </section>
      </div>
      {profile.data?.user.role === "super_admin" && (
        <section className={`${s.panel} ${s.section}`}>
          <h2>Activation et validation juridique</h2>
          {catalogue.data?.map((service) => (
            <ServiceConfiguration
              key={`${service.code}-${service.availability}-${service.terms?.version}`}
              item={service}
            />
          ))}
        </section>
      )}
    </main>
  );
}
