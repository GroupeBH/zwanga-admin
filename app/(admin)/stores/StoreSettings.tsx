"use client";
import { useState } from "react";
import {
  useGetStoreIntegrationsQuery,
  useGetStoreResourceQuery,
  useStoreActionMutation,
  type StoreIntegration,
} from "@/lib/features/stores/storesApi";
import { getApiErrorMessage } from "@/lib/utils/apiErrors";
import shared from "../styles/page.module.css";
const execute = async (
  operation: () => Promise<unknown>,
  done: (m: string) => void,
) => {
  try {
    await operation();
    done("Opération enregistrée.");
  } catch (error) {
    done(getApiErrorMessage(error, "Opération refusée ou indisponible."));
  }
};
function Integration({
  item,
  done,
}: {
  item: StoreIntegration;
  done: (m: string) => void;
}) {
  const [cadence, setCadence] = useState<Record<string, number>>({}),
    [action, state] = useStoreActionMutation();
  return (
    <section className={shared.section}>
      <h2>
        {item.platform} · {item.state}
      </h2>
      <p>
        Application : {item.appId || "Non configurée"} · Dernier test :{" "}
        {item.checkedAt || "Aucun"} · Dernier import :{" "}
        {item.lastSync || "Aucun"}
      </p>
      {!!item.missingVariables.length && (
        <p>
          Variables serveur à renseigner : {item.missingVariables.join(", ")}.
          Ne saisissez aucune clé dans cette interface.
        </p>
      )}
      <div className={shared.toolbar}>
        <button
          disabled={state.isLoading || !item.enabled}
          className={shared.primaryButton}
          onClick={() =>
            execute(
              () =>
                action({
                  path: `integrations/${item.platform}/test`,
                  body: { requestId: crypto.randomUUID() },
                }).unwrap(),
              done,
            )
          }
        >
          Tester la connexion
        </button>
        <button
          disabled={state.isLoading}
          className={shared.secondaryButton}
          onClick={() => {
            if (
              window.confirm(
                `${item.enabled ? "Désactiver" : "Activer"} cette intégration ?`,
              )
            )
              void execute(
                () =>
                  action({
                    path: `integrations/${item.platform}`,
                    method: "PATCH",
                    body: { enabled: !item.enabled },
                  }).unwrap(),
                done,
              );
          }}
        >
          {item.enabled ? "Désactiver" : "Activer"}
        </button>
      </div>
      <div className={shared.toolbar}>
        {Object.entries(item.schedule).map(([task, minutes]) => (
          <label key={task} className={shared.filterField}>
            {task} (minutes)
            <input
              type="number"
              min={["reviews", "catalog"].includes(task) ? 15 : 60}
              max={10080}
              value={cadence[task] ?? minutes}
              onChange={(e) =>
                setCadence({ ...cadence, [task]: Number(e.target.value) })
              }
            />
          </label>
        ))}
      </div>
      <button
        className={shared.secondaryButton}
        disabled={state.isLoading || !Object.keys(cadence).length}
        onClick={() =>
          execute(
            () =>
              action({
                path: `integrations/${item.platform}`,
                method: "PATCH",
                body: Object.fromEntries(
                  Object.entries(cadence).map(([task, value]) => [
                    task + "Minutes",
                    value,
                  ]),
                ),
              }).unwrap(),
            done,
          )
        }
      >
        Enregistrer les cadences
      </button>
      <p>
        Prochain passage du planificateur :{" "}
        {item.nextSchedulerCheck || "Planification désactivée"}. La cadence et
        la file déterminent le début réel des imports.
      </p>
      <ul>
        {Object.entries(item.capabilities ?? {}).map(([name, result]) => (
          <li key={name}>
            {name} :{" "}
            {result.available
              ? "Disponible"
              : result.errorCode || "Indisponible"}
          </li>
        ))}
      </ul>
      <p>
        Un test en lecture ne prouve pas les droits d’écriture. Les permissions
        doivent aussi être accordées dans les consoles officielles.
      </p>
    </section>
  );
}
export function StoreConfiguration({ done }: { done: (m: string) => void }) {
  const query = useGetStoreIntegrationsQuery(undefined, {
    pollingInterval: 15000,
  });
  return (
    <>
      {query.isLoading && <p role="status">Chargement des intégrations…</p>}
      {query.error && (
        <p role="alert">
          {getApiErrorMessage(query.error, "Configuration indisponible.")}
        </p>
      )}
      {query.data?.map((item) => (
        <Integration key={item.platform} item={item} done={done} />
      ))}
    </>
  );
}
export function StoreResources({
  resource,
  permissions,
  done,
}: {
  resource: "audit-logs" | "alerts/events" | "alerts/rules" | "access";
  permissions: string[];
  done: (m: string) => void;
}) {
  const [page, setPage] = useState(1),
    query = useGetStoreResourceQuery({ resource, page });
  const [action, state] = useStoreActionMutation(),
    [userId, setUserId] = useState(""),
    [profile, setProfile] = useState("reader");
  const [name, setName] = useState(""),
    [type, setType] = useState("sync_failed"),
    [platform, setPlatform] = useState(""),
    [metric, setMetric] = useState(""),
    [threshold, setThreshold] = useState(""),
    [recipients, setRecipients] = useState(""),
    [email, setEmail] = useState(false),
    [severity, setSeverity] = useState("warning");
  const items = Array.isArray(query.data)
      ? query.data
      : (query.data?.items ?? []),
    total = Array.isArray(query.data) ? items.length : (query.data?.total ?? 0);
  const title = {
    "audit-logs": "Journal d’audit",
    "alerts/events": "Notifications de l’administration",
    "alerts/rules": "Règles d’alerte",
    access: "Permissions Store",
  }[resource];
  const createRule = () =>
    execute(
      () =>
        action({
          path: "alerts/rules",
          body: {
            name,
            type,
            ...(platform ? { platform } : {}),
            ...(metric ? { metric } : {}),
            ...(threshold !== "" ? { threshold: Number(threshold) } : {}),
            severity,
            enabled: true,
            recipients: recipients
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            email,
          },
        }).unwrap(),
      done,
    );
  return (
    <section className={shared.section}>
      <h2>{title}</h2>
      {query.isFetching && <p role="status">Chargement…</p>}
      {query.error && (
        <p role="alert">
          {getApiErrorMessage(query.error, "Liste indisponible.")}
        </p>
      )}
      {resource === "access" && permissions.includes("store.access.manage") && (
        <>
          <p>
            Le rôle général du compte ne change pas. Un admin sans profil Store
            est lecteur ; un marketeur doit recevoir explicitement un profil.
          </p>
          <div className={shared.toolbar}>
            <label className={shared.filterField}>
              Identifiant administratif
              <input
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="UUID du compte"
              />
            </label>
            <label className={shared.filterField}>
              Profil
              <select
                value={profile}
                onChange={(e) => setProfile(e.target.value)}
              >
                {[
                  "reader",
                  "technical",
                  "product",
                  "marketing",
                  "support",
                  "validator",
                  "custom",
                ].map((p) => (
                  <option key={p} value={p}>
                    {p === "custom" ? "Révoquer tous les accès Store" : p}
                  </option>
                ))}
              </select>
            </label>
            <button
              className={shared.primaryButton}
              disabled={state.isLoading || !userId}
              onClick={() => {
                if (
                  window.confirm(
                    "Modifier les permissions Store de ce compte ?",
                  )
                )
                  void execute(
                    () =>
                      action({
                        path: `access/${encodeURIComponent(userId)}`,
                        method: "PUT",
                        body: {
                          profile,
                          ...(profile === "custom" ? { permissions: [] } : {}),
                        },
                      }).unwrap(),
                    done,
                  );
              }}
            >
              Appliquer le profil
            </button>
          </div>
        </>
      )}
      {resource === "alerts/rules" &&
        permissions.includes("store.alerts.manage") && (
          <details>
            <summary>Créer une règle</summary>
            <div className={shared.toolbar}>
              <label className={shared.filterField}>
                Nom
                <input
                  maxLength={100}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <label className={shared.filterField}>
                Type
                <select value={type} onChange={(e) => setType(e.target.value)}>
                  {[
                    "sync_failed",
                    "data_unavailable",
                    "negative_review",
                    "unanswered_reviews",
                    "metric_above",
                    "metric_drop_percent",
                    "version_changed",
                  ].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
              <label className={shared.filterField}>
                Plateforme
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                >
                  <option value="">Toutes</option>
                  <option>google</option>
                  <option>apple</option>
                </select>
              </label>
              <label className={shared.filterField}>
                Indicateur
                <input
                  value={metric}
                  onChange={(e) => setMetric(e.target.value)}
                  placeholder="google.crashRate, apple.crashes…"
                />
              </label>
              <label className={shared.filterField}>
                Seuil
                <input
                  type="number"
                  min="0"
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                />
              </label>
              <label className={shared.filterField}>
                Gravité
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                >
                  <option>info</option>
                  <option>warning</option>
                  <option>critical</option>
                </select>
              </label>
              <label className={shared.filterField}>
                Destinataires (UUID séparés par virgules)
                <input
                  value={recipients}
                  onChange={(e) => setRecipients(e.target.value)}
                />
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={email}
                  onChange={(e) => setEmail(e.target.checked)}
                />
                E-mail (SMTP serveur nécessaire)
              </label>
              <button
                className={shared.primaryButton}
                disabled={state.isLoading || !name.trim()}
                onClick={createRule}
              >
                Créer la règle
              </button>
            </div>
            <p>
              metric_drop_percent compare deux jours disponibles consécutifs.
              Aucune donnée manquante n’est remplacée par zéro.
            </p>
          </details>
        )}
      {items.map((row, index) => (
        <article key={String(row.id ?? row.userId ?? index)}>
          <details>
            <summary>
              {String(
                row.name ?? row.message ?? row.action ?? row.userId ?? row.id,
              )}{" "}
              · {String(row.createdAt ?? row.updatedAt ?? "")}
            </summary>
            <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
              {JSON.stringify(row, null, 2)}
            </pre>
          </details>
          {resource === "alerts/events" && !row.acknowledgedAt && (
            <button
              disabled={state.isLoading}
              className={shared.secondaryButton}
              onClick={() =>
                execute(
                  () =>
                    action({
                      path: `alerts/events/${row.id}/acknowledge`,
                    }).unwrap(),
                  done,
                )
              }
            >
              Acquitter
            </button>
          )}
          {resource === "alerts/rules" &&
            permissions.includes("store.alerts.manage") && (
              <button
                disabled={state.isLoading}
                className={shared.secondaryButton}
                onClick={() => {
                  const body = Object.fromEntries(
                    [
                      "name",
                      "type",
                      "platform",
                      "metric",
                      "threshold",
                      "severity",
                      "recipients",
                      "email",
                    ]
                      .filter((k) => row[k] != null)
                      .map((k) => [k, row[k]]),
                  );
                  void execute(
                    () =>
                      action({
                        path: `alerts/rules/${row.id}`,
                        method: "PUT",
                        body: { ...body, enabled: !row.enabled },
                      }).unwrap(),
                    done,
                  );
                }}
              >
                {row.enabled ? "Désactiver" : "Activer"}
              </button>
            )}
        </article>
      ))}
      {!query.isFetching && !items.length && (
        <p>Aucun élément pour le moment.</p>
      )}
      {!Array.isArray(query.data) && (
        <div className={shared.pagination}>
          <span>
            {total} éléments · Page {page}
          </span>
          <button
            disabled={page === 1}
            className={shared.secondaryButton}
            onClick={() => setPage(page - 1)}
          >
            Précédent
          </button>
          <button
            disabled={page * 25 >= total}
            className={shared.secondaryButton}
            onClick={() => setPage(page + 1)}
          >
            Suivant
          </button>
        </div>
      )}
    </section>
  );
}
