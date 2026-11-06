"use client";
import {
  useGetStoreDownloadsQuery,
  type StorePlatform,
} from "@/lib/features/stores/storesApi";
import {
  formatStoreCount,
  STORE_DOWNLOAD_REFRESH,
} from "@/lib/features/stores/storePresentation";
import { getApiErrorMessage } from "@/lib/utils/apiErrors";
import shared from "../styles/page.module.css";

export function StoreDownloads({
  filters,
  selectDay,
}: {
  filters: {
    from: string;
    to: string;
    platform?: StorePlatform;
    country?: string;
    version?: string;
  };
  selectDay: (date: string) => void;
}) {
  const result = useGetStoreDownloadsQuery(filters, STORE_DOWNLOAD_REFRESH);
  // Do not display data for the previous dates/country while new filters load.
  const data = result.currentData;
  return (
    <section
      className={shared.section}
      aria-label="Téléchargements des stores"
      aria-busy={result.isFetching}
    >
      <div className={shared.sectionHeader}>
        <h2>Téléchargements et installations</h2>
        <button
          className={shared.secondaryButton}
          disabled={result.isFetching}
          onClick={() => result.refetch()}
        >
          Actualiser
        </button>
      </div>
      <p className={shared.mutedText}>
        Dernier jour disponible dans les rapports importés, même hors de la
        période choisie. Les filtres plateforme, pays et version restent
        appliqués.
      </p>
      {result.error && (
        <p role="alert" className={shared.errorText}>
          {getApiErrorMessage(
            result.error,
            "Statistiques indisponibles. Vérifiez que le backend est à jour.",
          )}
          {data && " Les données affichées n’ont pas pu être actualisées."}
        </p>
      )}
      {!data && result.isFetching && (
        <p role="status">Chargement des derniers rapports…</p>
      )}
      {data && (
        <>
          <div className={shared.grid}>
            {data.metrics.map((m) => (
              <article key={m.metric} className={shared.card}>
                <h3 className={shared.cardTitle}>{m.label}</h3>
                <h2>{formatStoreCount(m.latest?.value)}</h2>
                {m.latest ? (
                  <>
                    <p>
                      Journée du{" "}
                      <time dateTime={m.latest.date}>{m.latest.date}</time>
                    </p>
                    <small className={shared.mutedText}>
                      Importé le{" "}
                      {new Date(m.latest.importedAt).toLocaleString("fr-CD")}
                    </small>
                    <button
                      className={shared.secondaryButton}
                      onClick={() => selectDay(m.latest!.date)}
                    >
                      Voir ce jour
                    </button>
                  </>
                ) : (
                  <p>Aucun chiffre disponible pour ces filtres.</p>
                )}
                <p>
                  <strong>
                    Période du {data.from} au {data.to}
                  </strong>
                  <br />
                  Total des jours disponibles :{" "}
                  {formatStoreCount(m.period.value)}
                </p>
                <p className={shared.mutedText}>
                  {m.period.observedDays} / {m.period.expectedDays} jours
                  renseignés
                  {m.period.availability === "partial"
                    ? " · Données partielles"
                    : ""}
                  .
                </p>
                <small>
                  {m.definition.source} · {m.definition.officialName}
                </small>
              </article>
            ))}
          </div>
          <p className={shared.helpText}>
            Android compte les installations, iOS distingue les premiers
            téléchargements des retéléchargements. Aucun total commun ni cumul
            depuis le lancement. Les mises à jour ne sont pas incluses ici.
          </p>
          <details open>
            <summary>
              Détail quotidien du {data.from} au {data.to}
            </summary>
            <div className={shared.tableWrapper}>
              <table className={shared.table}>
                <thead>
                  <tr>
                    <th>Date du rapport</th>
                    {data.metrics.map((m) => (
                      <th key={m.metric}>{m.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.metrics[0]?.daily.map((day, index) => (
                    <tr key={day.date}>
                      <td>{day.date}</td>
                      {data.metrics.map((m) => (
                        <td
                          key={m.metric}
                          title={
                            m.daily[index]?.importedAt
                              ? `Importé le ${m.daily[index].importedAt}`
                              : "Rapport absent ou donnée masquée"
                          }
                        >
                          {formatStoreCount(m.daily[index]?.value)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
      <p className={shared.mutedText}>
        Actualisation toutes les 15 secondes lorsque la page est active, après
        import d’un rapport. Une donnée absente ou masquée n’est pas un zéro ;
        les stores peuvent publier avec retard.
      </p>
    </section>
  );
}
