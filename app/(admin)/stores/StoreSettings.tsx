"use client";
import { useEffect, useRef, useState } from "react";
import {
  useGetStoreIntegrationsQuery,
  useGetStoreStatusQuery,
  useGetStoreJobQuery,
  useGetStoreResourceQuery,
  useStoreActionMutation,
  type StoreIntegration,
  type StoreJob,
  type StoreStatus,
} from "@/lib/features/stores/storesApi";
import { getApiErrorMessage } from "@/lib/utils/apiErrors";
import shared from "../styles/page.module.css";
import {
  createRequestIntent,
  dateLabel,
  stateLabel,
} from "@/lib/features/mobileOperations/mobilePresentation";
import { confirmAction } from "@/app/components/ui/Feedback";

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
  status,
  refresh,
}: {
  item: StoreIntegration;
  done: (m: string) => void;
  status?: StoreStatus;
  refresh: () => unknown;
}) {
  const [cadence, setCadence] = useState<Record<string, number>>({}),
    [action, state] = useStoreActionMutation();
  const [jobId, setJobId] = useState(""),
    [poll, setPoll] = useState(false);
  const intent = useRef(createRequestIntent()),
    pending = useRef(false);
  const canReadJobs = status?.permissions.includes("store.sync.read") === true;
  const job = useGetStoreJobQuery(jobId, {
    skip: !jobId || !canReadJobs,
    pollingInterval: poll ? 2000 : 0,
    skipPollingIfUnfocused: true,
  });
  const terminal =
    job.currentData &&
    !["pending", "queued", "running"].includes(job.currentData.state);
  useEffect(() => {
    if (terminal && poll) {
      setPoll(false);
      refresh();
    }
  }, [terminal, poll, refresh]);
  const mode = status?.platforms.find(
    (p) => p.platform === item.platform,
  )?.authMode;
  const authentication = (
    {
      aws_wif:
        "Workload Identity Federation AWS → Google (sans clé privée Google)",
      adc: "Identité Google ADC",
      service_account: "Compte de service Google",
      apple_team_key: "Clé d’équipe Apple — JWT ES256",
      invalid: "Mode invalide à corriger sur le serveur",
    } as Record<string, string>
  )[mode ?? ""];
  const testConnection = async () => {
    if (pending.current) return;
    pending.current = true;
    try {
      const result = (await action({
        path: `integrations/${item.platform}/test`,
        body: { requestId: intent.current.id("connection") },
      }).unwrap()) as StoreJob;
      intent.current.complete("connection");
      setJobId(result.id);
      setPoll(canReadJobs);
      done(
        "Test mis en file. La connexion sera confirmée uniquement après son exécution.",
      );
    } catch (error) {
      done(
        getApiErrorMessage(
          error,
          "Test non confirmé. Réessayer conserve la même demande.",
        ),
      );
    } finally {
      pending.current = false;
    }
  };
  return (
    <section className={shared.section}>
      <h2>
        {item.platform === "google" ? "Google Play" : "Apple App Store"} ·{" "}
        {(
          {
            connected: "Connecté",
            error: "Erreur de connexion",
            unchecked: "À vérifier",
            unconfigured: "Configuration incomplète",
            disabled: "Désactivé",
          } as Record<string, string>
        )[item.state] ?? item.state}
      </h2>
      <p>
        Application : {item.appId || "Non configurée"} · Dernier test :{" "}
        {dateLabel(item.checkedAt)} · Dernier import :{" "}
        {dateLabel(item.lastSync)}
      </p>
      {authentication && <p>Authentification : {authentication}.</p>}
      {item.errorCode && <p role="alert">Diagnostic : {item.errorCode}</p>}
      {jobId && (
        <p role="status">
          Dernier test :{" "}
          {job.currentData ? stateLabel(job.currentData.state) : "Mis en file"}{" "}
          {job.currentData?.errorCode ? `· ${job.currentData.errorCode}` : ""}.
          Référence : {jobId}
        </p>
      )}
      {job.error && (
        <p role="alert">
          Le résultat du test n’est pas accessible. Consultez Synchronisations
          avant de recommencer.
        </p>
      )}
      {!!item.missingVariables.length && (
        <p>
          Variables serveur à renseigner : {item.missingVariables.join(", ")}.
          Ne saisissez aucune clé dans cette interface.
        </p>
      )}
      <div className={shared.toolbar}>
        <button
          disabled={
            state.isLoading ||
            poll ||
            !item.enabled ||
            !!item.missingVariables.length
          }
          className={shared.primaryButton}
          onClick={testConnection}
        >
          Tester la connexion
        </button>
        <button
          disabled={state.isLoading}
          className={shared.secondaryButton}
          onClick={async () => {
            if (
              await confirmAction(
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
  const status = useGetStoreStatusQuery();
  const query = useGetStoreIntegrationsQuery(undefined, {
    pollingInterval: 15000,
    skipPollingIfUnfocused: true,
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
        <Integration
          key={item.platform}
          item={item}
          done={done}
          status={status.data}
          refresh={query.refetch}
        />
      ))}
      <section className={shared.section}>
        <h2>Fonctions activées sur le serveur</h2>
        <p>
          Synchronisation automatique :{" "}
          {status.data?.scheduled ? "activée" : "désactivée"}.
        </p>
        <p>
          Réponses publiques aux avis :{" "}
          {status.data?.features?.reviewReplies
            ? "activées"
            : "non activées ou non annoncées"}
          .
        </p>
        <p>
          Lecture des tracks Google par édition temporaire non publiée :{" "}
          {status.data?.features?.googleTemporaryEdits
            ? "activée"
            : "non activée ou non annoncée"}
          .
        </p>
        <p>
          Les identifiants restent dans la configuration du backend. Aucun
          secret n’est demandé ni retourné ici.
        </p>
      </section>
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
  const [customPermissions, setCustomPermissions] = useState<string[]>([]);
  const [windowMinutes, setWindowMinutes] = useState(60),
    [confirmationMinutes, setConfirmationMinutes] = useState(5);
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
    access: "Permissions Stores et supervision mobile",
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
            ...(type.startsWith("mobile_")
              ? { windowMinutes, confirmationMinutes }
              : {}),
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
                  "revoke",
                ].map((p) => (
                  <option key={p} value={p}>
                    {p === "revoke"
                      ? "Révoquer tous les accès"
                      : p === "custom"
                        ? "Permissions personnalisées"
                        : p}
                  </option>
                ))}
              </select>
            </label>
            <button
              className={shared.primaryButton}
              disabled={state.isLoading || !userId}
              onClick={async () => {
                if (
                  await confirmAction(
                    "Modifier les permissions Store de ce compte ?",
                  )
                )
                  void execute(
                    () =>
                      action({
                        path: `access/${encodeURIComponent(userId)}`,
                        method: "PUT",
                        body: {
                          profile: profile === "revoke" ? "custom" : profile,
                          ...(profile === "custom"
                            ? { permissions: customPermissions }
                            : profile === "revoke"
                              ? { permissions: [] }
                              : {}),
                        },
                      }).unwrap(),
                    done,
                  );
              }}
            >
              Appliquer le profil
            </button>
          </div>
          {profile === "custom" && (
            <fieldset>
              <legend>Permissions attribuées</legend>
              <div className={shared.grid}>
                {permissions.map((permission) => (
                  <label key={permission} className={shared.checkboxRow}>
                    <input
                      type="checkbox"
                      checked={customPermissions.includes(permission)}
                      onChange={(e) =>
                        setCustomPermissions(
                          e.target.checked
                            ? [...customPermissions, permission]
                            : customPermissions.filter((p) => p !== permission),
                        )
                      }
                    />
                    {permission}
                  </label>
                ))}
              </div>
              <p>
                Pour valider une campagne : mobile.campaigns.read +
                mobile.campaigns.approve. Pour la lancer : mobile.campaigns.read
                + mobile.campaigns.launch. L’auteur ne peut pas l’approuver
                lui-même.
              </p>
            </fieldset>
          )}
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
                    "mobile_push_failure_percent",
                    "mobile_registration_drop_percent",
                    "mobile_required_policy_conflict",
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
              {type.startsWith("mobile_") && (
                <>
                  <label className={shared.filterField}>
                    Fenêtre (minutes)
                    <input
                      type="number"
                      min={5}
                      max={10080}
                      value={windowMinutes}
                      onChange={(e) => setWindowMinutes(Number(e.target.value))}
                    />
                  </label>
                  <label className={shared.filterField}>
                    Confirmation (minutes)
                    <input
                      type="number"
                      min={0}
                      max={1440}
                      value={confirmationMinutes}
                      onChange={(e) =>
                        setConfirmationMinutes(Number(e.target.value))
                      }
                    />
                  </label>
                </>
              )}
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
          {resource === "access" &&
            permissions.includes("store.access.manage") && (
              <button
                className={shared.secondaryButton}
                disabled={state.isLoading}
                onClick={() => {
                  setUserId(String(row.userId));
                  setProfile("custom");
                  setCustomPermissions(
                    Array.isArray(row.permissions)
                      ? row.permissions.filter(
                          (p): p is string =>
                            typeof p === "string" && permissions.includes(p),
                        )
                      : [],
                  );
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                Modifier les accès de ce compte
              </button>
            )}
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
                  void execute(
                    () =>
                      action({
                        path: `alerts/rules/${row.id}`,
                        method: "PATCH",
                        body: { enabled: !row.enabled },
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
