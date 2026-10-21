"use client";
import { useEffect, useState } from "react";
import {
  useGetStoreStatusQuery,
  useGetStoreDashboardQuery,
  useGetStoreRecordsQuery,
  useGetStoreMetricsQuery,
  useGetStoreMetricCatalogQuery,
  useGetStoreJobsQuery,
  useGetStoreAlertsQuery,
  useSyncStoreMutation,
  useRetryStoreSyncMutation,
  useRequestAppleAnalyticsMutation,
  useExportStoreReportMutation,
  type StorePlatform,
  type StoreTask,
} from "@/lib/features/stores/storesApi";
import { getApiErrorMessage } from "@/lib/utils/apiErrors";
import { downloadBlob } from "@/lib/utils/downloadBlob";
import { StoreReview } from "./StoreReview";
import { StoreConfiguration, StoreResources } from "./StoreSettings";
import { StoreTrend } from "./StoreTrend";
import { StoreVersion, StoreVersionComparison } from "./StoreVersions";
import shared from "../styles/page.module.css";

const tabs = [
  ["overview", "Vue d’ensemble", "store.analytics.read"],
  ["metrics", "Statistiques", "store.analytics.read"],
  ["reviews", "Avis", "store.reviews.read"],
  ["versions", "Versions", "store.versions.read"],
  ["builds", "Builds / TestFlight", "store.versions.read"],
  ["vitals", "Performances", "store.vitals.read"],
  ["alerts", "Alertes", "store.alerts.read"],
  ["syncs", "Synchronisations", "store.sync.read"],
  ["configuration", "Configuration", "store.integrations.manage"],
  ["access", "Permissions", "store.access.manage"],
  ["audit", "Audit", "store.audit.read"],
] as const;
const date = (offset = 0) =>
  new Date(Date.now() - offset * 86400000).toISOString().slice(0, 10);
export default function StoresPage() {
  const status = useGetStoreStatusQuery();
  const [tab, setTab] = useState("overview"),
    [platform, setPlatform] = useState<StorePlatform | "">(""),
    [from, setFrom] = useState(date(29)),
    [to, setTo] = useState(date()),
    [page, setPage] = useState(1);
  const [metric, setMetric] = useState(""),
    [rating, setRating] = useState(""),
    [search, setSearch] = useState(""),
    [response, setResponse] = useState(""),
    [reviewStatus, setReviewStatus] = useState(""),
    [country, setCountry] = useState(""),
    [version, setVersion] = useState("");
  const [message, setMessage] = useState(""),
    [topic, setTopic] = useState("global");
  const permissions = status.data?.permissions ?? [],
    enabled = !!status.data?.enabled,
    can = (permission: string) => permissions.includes(permission);
  const available = tabs.filter((t) => can(t[2])),
    current = available.find((t) => t[0] === tab)?.[0] ?? available[0]?.[0];
  const reportTopics = [
    ["global", "store.analytics.read"],
    ["google", "store.analytics.read"],
    ["apple", "store.analytics.read"],
    ["acquisition", "store.analytics.read"],
    ["conversion", "store.analytics.read"],
    ["reviews", "store.reviews.read"],
    ["stability", "store.vitals.read"],
    ["versions", "store.versions.read"],
  ]
    .filter(([, permission]) => can(permission))
    .map(([value]) => value);
  const activeTopic = reportTopics.includes(topic) ? topic : reportTopics[0];
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("tab")) setTab(q.get("tab")!);
    if (["google", "apple"].includes(q.get("platform") ?? ""))
      setPlatform(q.get("platform") as StorePlatform);
    for (const [key, set] of [
      ["from", setFrom],
      ["to", setTo],
    ] as const) {
      const value = q.get(key);
      if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) set(value);
    }
  }, []);
  const changeTab = (value: string) => {
    setTab(value);
    setPage(1);
    const q = new URLSearchParams({ tab: value, from, to });
    if (platform) q.set("platform", platform);
    window.history.replaceState(null, "", `/stores?${q}`);
  };
  const params = {
    from,
    to,
    platform: platform || undefined,
    country: country || undefined,
    version: version || undefined,
  };
  const dashboard = useGetStoreDashboardQuery(params, {
    skip: !enabled || current !== "overview",
  });
  const kind =
    current === "reviews"
      ? "review"
      : current === "versions"
        ? "release"
        : current === "builds"
          ? "build"
          : "performance";
  const records = useGetStoreRecordsQuery(
    {
      platform: platform || undefined,
      kind,
      page,
      limit: 25,
      rating: rating ? Number(rating) : undefined,
      search: search || undefined,
      country: country || undefined,
      version: version || undefined,
      responded: response || undefined,
      status: reviewStatus || undefined,
      ...(current === "reviews" ? { from, to } : {}),
    },
    {
      skip:
        !enabled ||
        !["reviews", "versions", "builds", "vitals"].includes(current ?? ""),
    },
  );
  const metrics = useGetStoreMetricsQuery(
    { ...params, page, limit: 100, metric: metric || undefined },
    { skip: !enabled || current !== "metrics" },
  );
  const catalog = useGetStoreMetricCatalogQuery(undefined, {
    skip: !enabled || !can("store.analytics.read"),
  });
  const jobs = useGetStoreJobsQuery(
    { page, limit: 25, platform: platform || undefined },
    {
      skip: !enabled || current !== "syncs",
      pollingInterval: current === "syncs" ? 15000 : 0,
    },
  );
  const alerts = useGetStoreAlertsQuery(undefined, {
    skip: !enabled || current !== "alerts",
  });
  const [sync, syncState] = useSyncStoreMutation(),
    [retry, retryState] = useRetryStoreSyncMutation(),
    [requestApple, appleState] = useRequestAppleAnalyticsMutation(),
    [exportReport, exportState] = useExportStoreReportMutation();
  const run = async (operation: () => Promise<unknown>, success: string) => {
    try {
      await operation();
      setMessage(success);
    } catch (error) {
      setMessage(
        getApiErrorMessage(
          error,
          "Action non confirmée. Consultez le détail avant de recommencer.",
        ),
      );
    }
  };
  const start = (provider: StorePlatform, task: StoreTask) =>
    void run(
      () =>
        sync({
          platform: provider,
          task,
          from,
          to,
          requestId: crypto.randomUUID(),
        }).unwrap(),
      "Synchronisation mise en attente. Consultez son historique.",
    );
  const exportData = (format: "csv" | "xls" | "pdf") =>
    void run(async () => {
      const blob = await exportReport({
        topic: activeTopic,
        format,
        from,
        to,
        platform: platform || undefined,
      }).unwrap();
      downloadBlob(blob, `zwanga-stores-${activeTopic}-${to}.${format}`);
    }, "Rapport exporté.");
  const error =
    current === "overview"
      ? dashboard.error
      : current === "metrics"
        ? metrics.error
        : current === "syncs"
          ? jobs.error
          : current === "alerts"
            ? alerts.error
            : ["reviews", "versions", "builds", "vitals"].includes(
                  current ?? "",
                )
              ? records.error
              : undefined;
  const pagination = (total: number, limit: number) => (
    <div className={shared.pagination}>
      <span>
        {total} résultats · Page {page}
      </span>
      <div className={shared.toolbar}>
        <button
          className={shared.secondaryButton}
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
        >
          Précédent
        </button>
        <button
          className={shared.secondaryButton}
          disabled={page * limit >= total}
          onClick={() => setPage(page + 1)}
        >
          Suivant
        </button>
      </div>
    </div>
  );
  if (status.isLoading)
    return <p role="status">Chargement des autorisations Store…</p>;
  if (status.error)
    return (
      <section className={shared.section}>
        <h1>Stores & Distribution</h1>
        <p role="alert">
          {getApiErrorMessage(
            status.error,
            "Accès Store indisponible ou non autorisé.",
          )}
        </p>
        <button
          onClick={() => status.refetch()}
          className={shared.secondaryButton}
        >
          Réessayer
        </button>
      </section>
    );
  return (
    <div className={shared.page}>
      <header>
        <h1>Stores & Distribution</h1>
        <p>
          Données officielles importées, suivi des avis et qualité mobile.
          Aucune publication de version automatique.
        </p>
      </header>
      {!enabled ? (
        <section className={shared.section}>
          <h2>Module désactivé</h2>
          <p>
            Après les migrations locales, configurez STORE_MANAGEMENT_ENABLED et
            les accès serveur. Les clés ne sont jamais saisies dans le
            navigateur.
          </p>
        </section>
      ) : (
        <>
          <nav className={shared.toolbar} aria-label="Sections Store">
            {available.map(([id, label]) => (
              <button
                key={id}
                className={
                  current === id ? shared.primaryButton : shared.secondaryButton
                }
                aria-current={current === id ? "page" : undefined}
                onClick={() => changeTab(id)}
              >
                {label}
              </button>
            ))}
          </nav>
          <section className={shared.section}>
            <div className={shared.toolbar}>
              <label className={shared.filterField}>
                Plateforme
                <select
                  value={platform}
                  onChange={(e) => {
                    setPlatform(e.target.value as StorePlatform | "");
                    setPage(1);
                  }}
                >
                  <option value="">Toutes</option>
                  <option value="google">Google Play</option>
                  <option value="apple">Apple</option>
                </select>
              </label>
              <label className={shared.filterField}>
                Du
                <input
                  type="date"
                  value={from}
                  max={to}
                  onChange={(e) => {
                    setFrom(e.target.value);
                    setPage(1);
                  }}
                />
              </label>
              <label className={shared.filterField}>
                Au
                <input
                  type="date"
                  value={to}
                  min={from}
                  max={date()}
                  onChange={(e) => {
                    setTo(e.target.value);
                    setPage(1);
                  }}
                />
              </label>
              {[1, 7, 30, 90].map((days) => (
                <button
                  key={days}
                  className={shared.secondaryButton}
                  onClick={() => {
                    setFrom(date(days - 1));
                    setTo(date());
                    setPage(1);
                  }}
                >
                  {days === 1 ? "Aujourd’hui" : `${days} jours`}
                </button>
              ))}
              <button
                className={shared.secondaryButton}
                onClick={() => {
                  setFrom(date(1));
                  setTo(date(1));
                  setPage(1);
                }}
              >
                Hier
              </button>
              {["overview", "metrics", "reviews"].includes(current ?? "") && (
                <>
                  <label className={shared.filterField}>
                    Pays / territoire
                    <input
                      value={country}
                      maxLength={32}
                      placeholder="Code fourni par le store"
                      onChange={(e) => {
                        setCountry(e.target.value);
                        setPage(1);
                      }}
                    />
                  </label>
                  <label className={shared.filterField}>
                    Version
                    <input
                      value={version}
                      maxLength={100}
                      onChange={(e) => {
                        setVersion(e.target.value);
                        setPage(1);
                      }}
                    />
                  </label>
                </>
              )}
            </div>
            <p>
              Les jours absents sont indisponibles, pas nuls. Les filtres
              pays/version dépendent des dimensions exposées par chaque source.
            </p>
          </section>
          {message && (
            <p role="status" className={shared.helpText}>
              {message}
              <button
                onClick={() => setMessage("")}
                aria-label="Fermer le message"
              >
                ×
              </button>
            </p>
          )}
          {error && (
            <p role="alert" className={shared.errorText}>
              {getApiErrorMessage(
                error,
                "Données temporairement indisponibles.",
              )}
            </p>
          )}
          {(dashboard.isFetching ||
            records.isFetching ||
            metrics.isFetching ||
            jobs.isFetching) && <p role="status">Actualisation des données…</p>}
          {current === "overview" && dashboard.data && (
            <>
              <section className={shared.section}>
                <h2>Acquisition et stabilité</h2>
                <label>
                  Indicateur
                  <select
                    value={metric}
                    onChange={(e) => setMetric(e.target.value)}
                  >
                    <option value="">Choisir un indicateur</option>
                    {catalog.data?.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.id}
                      </option>
                    ))}
                  </select>
                </label>
                <StoreTrend
                  from={from}
                  to={to}
                  points={dashboard.data.series.filter(
                    (s) =>
                      s.metric === (metric || "apple.first_time_downloads"),
                  )}
                />
                <p>
                  {
                    catalog.data?.find(
                      (m) => m.id === (metric || "apple.first_time_downloads"),
                    )?.description
                  }
                </p>
                <div className={shared.tableWrapper}>
                  <table className={shared.table}>
                    <thead>
                      <tr>
                        <th>Plateforme</th>
                        <th>Avis importés sur la période</th>
                        <th>Sans réponse</th>
                        <th>Moyenne de cet échantillon</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.data.reviewStats.map((r) => (
                        <tr key={r.platform}>
                          <td>{r.platform}</td>
                          <td>{r.reviews}</td>
                          <td>{r.unanswered}</td>
                          <td>
                            {Number(r.sampleAverageRating).toFixed(2)} / 5
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p>
                  Cette moyenne n’est pas la note globale de la fiche Store.
                </p>
              </section>
              <section className={shared.section}>
                <h2>Parcours des inscrits Zwanga</h2>
                <div className={shared.toolbar}>
                  <p>
                    KYC approuvés / soumis :{" "}
                    {dashboard.data.conversion.kycApprovalPercent?.toFixed(1) ??
                      "Indisponible"}{" "}
                    %
                  </p>
                  <p>
                    Premier trajet des inscrits :{" "}
                    {dashboard.data.conversion.firstTripPercent?.toFixed(1) ??
                      "Indisponible"}{" "}
                    %
                  </p>
                  <p>
                    Trajets terminés sur la période :{" "}
                    {dashboard.data.business.completedTrips}
                  </p>
                </div>
                <p>
                  Comptes dont le dernier login est dans la période :{" "}
                  {dashboard.data.business.accountsWithLatestLoginInPeriod}{" "}
                  (indicateur de substitution, pas un DAU).
                </p>
                <p>
                  Dernier appareil déclaré des inscrits :{" "}
                  {dashboard.data.business.platforms
                    .map((p) => `${p.platform} : ${p.registrations}`)
                    .join(" · ") || "Indisponible"}
                  . Ce n’est pas la plateforme d’inscription.
                </p>
                <p>
                  Cohorte d’inscription UTC ; résultats KYC et premier trajet à
                  leur état actuel. Aucun rapprochement individuel avec les
                  téléchargements.
                </p>
                <div className={shared.tableWrapper}>
                  <table className={shared.table}>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Inscrits</th>
                        <th>Conducteurs</th>
                        <th>Passagers</th>
                        <th>KYC soumis</th>
                        <th>KYC approuvés</th>
                        <th>Premier trajet terminé</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.data.cohorts.map((c) => (
                        <tr key={c.date}>
                          <td>{c.date}</td>
                          <td>{c.registrations}</td>
                          <td>{c.drivers}</td>
                          <td>{c.passengers}</td>
                          <td>{c.kycSubmitted}</td>
                          <td>{c.kycApproved}</td>
                          <td>{c.firstTripCompleted}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
              <section className={shared.section}>
                <h2>Fraîcheur et méthodologie</h2>
                {dashboard.data.freshness.map((f) => (
                  <p key={f.platform + f.task}>
                    {f.platform} / {f.task} : {f.state} ·{" "}
                    {f.completedAt || "Aucun import terminé"} {f.errorCode}
                  </p>
                ))}
                {dashboard.data.notes.map((note) => (
                  <p key={note}>{note}</p>
                ))}
              </section>
            </>
          )}
          {current === "metrics" && (
            <section className={shared.section}>
              <h2>Historique normalisé</h2>
              <label>
                Indicateur
                <select
                  value={metric}
                  onChange={(e) => {
                    setMetric(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">Tous</option>
                  {catalog.data?.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.id} ({m.unit})
                    </option>
                  ))}
                </select>
              </label>
              <div className={shared.tableWrapper}>
                <table className={shared.table}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Source / jeu</th>
                      <th>Métrique</th>
                      <th>Valeur</th>
                      <th>Dimensions</th>
                      <th>Source et fraîcheur</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.data?.items.map((m) => (
                      <tr key={m.id}>
                        <td>{m.date}</td>
                        <td>
                          {m.platform} / {m.dataset}
                        </td>
                        <td>{m.metric}</td>
                        <td>
                          {m.value} {m.definition?.unit}
                        </td>
                        <td>{m.dimension}</td>
                        <td>
                          {m.definition?.source}
                          <br />
                          {m.importedAt}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {metrics.data && pagination(metrics.data.total, 100)}
            </section>
          )}
          {current === "reviews" && (
            <>
              <div className={shared.toolbar}>
                <label>
                  Note
                  <select
                    value={rating}
                    onChange={(e) => {
                      setRating(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="">Toutes</option>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n}>{n}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Recherche
                  <input
                    value={search}
                    maxLength={200}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                  />
                </label>
                <label>
                  Réponse
                  <select
                    value={response}
                    onChange={(e) => {
                      setResponse(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="">Toutes</option>
                    <option value="yes">Avec réponse</option>
                    <option value="no">Sans réponse</option>
                  </select>
                </label>
                <label>
                  État interne
                  <select
                    value={reviewStatus}
                    onChange={(e) => {
                      setReviewStatus(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="">Tous</option>
                    {[
                      "new",
                      "in_progress",
                      "draft",
                      "pending_approval",
                      "approved",
                      "responded",
                      "closed",
                    ].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
              </div>
              {records.data?.items.map((r) => (
                <StoreReview
                  key={r.id}
                  record={r}
                  permissions={permissions}
                  done={setMessage}
                />
              ))}
              {records.data && pagination(records.data.total, 25)}
            </>
          )}
          {["versions", "builds", "vitals"].includes(current ?? "") && (
            <section className={shared.section}>
              <h2>{available.find((t) => t[0] === current)?.[1]}</h2>
              <p>
                Dernier état importé ; les états officiels ne sont pas des
                décisions prises par Zwanga.
              </p>
              {records.data?.items.map((r) =>
                current === "vitals" ? (
                  <details key={r.id}>
                    <summary>
                      {r.platform} · {r.externalId} · Observé le {r.syncedAt}
                    </summary>
                    <pre
                      style={{
                        whiteSpace: "pre-wrap",
                        overflowWrap: "anywhere",
                      }}
                    >
                      {JSON.stringify(r.content, null, 2)}
                    </pre>
                  </details>
                ) : (
                  <StoreVersion
                    key={r.id}
                    record={r}
                    editable={can("store.integrations.manage")}
                    done={setMessage}
                  />
                ),
              )}
              {current === "vitals" && (
                <p>
                  Les taux journaliers Android et les crashes Apple sont
                  consultables dans Statistiques. L’absence d’un diagnostic ne
                  signifie pas absence d’erreur.
                </p>
              )}
              {records.data && pagination(records.data.total, 25)}
            </section>
          )}
          {["versions", "metrics"].includes(current ?? "") &&
            can("store.analytics.read") && (
              <StoreVersionComparison from={from} to={to} />
            )}
          {current === "syncs" && (
            <section className={shared.section}>
              <h2>Synchronisations</h2>
              {can("store.sync.execute") && (
                <div className={shared.toolbar}>
                  {(["google", "apple"] as const)
                    .filter((p) => !platform || p === platform)
                    .map((p) => (
                      <fieldset key={p}>
                        <legend>{p}</legend>
                        {(
                          [
                            "connection",
                            "reviews",
                            "catalog",
                            "reports",
                            "vitals",
                          ] as const
                        ).map((task) => (
                          <button
                            key={task}
                            disabled={syncState.isLoading}
                            className={shared.secondaryButton}
                            onClick={() => start(p, task)}
                          >
                            {task}
                          </button>
                        ))}
                      </fieldset>
                    ))}
                </div>
              )}
              <div className={shared.tableWrapper}>
                <table className={shared.table}>
                  <thead>
                    <tr>
                      <th>Plateforme / tâche</th>
                      <th>État</th>
                      <th>Importés / tentatives</th>
                      <th>Date</th>
                      <th>Diagnostic</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.data?.items.map((j) => (
                      <tr key={j.id}>
                        <td>
                          {j.platform} / {j.task}
                          <small style={{ display: "block" }}>{j.id}</small>
                        </td>
                        <td>{j.state}</td>
                        <td>
                          {j.processed} / {j.attempts}
                        </td>
                        <td>{j.createdAt}</td>
                        <td>{j.errorCode || "—"}</td>
                        <td>
                          {can("store.sync.execute") &&
                            !["reply", "analytics_request"].includes(j.task) &&
                            ["failed", "unavailable", "unknown"].includes(
                              j.state,
                            ) && (
                              <button
                                disabled={retryState.isLoading}
                                className={shared.secondaryButton}
                                onClick={() =>
                                  run(
                                    () =>
                                      retry({
                                        id: j.id,
                                        requestId: crypto.randomUUID(),
                                      }).unwrap(),
                                    "Relance mise en attente.",
                                  )
                                }
                              >
                                Relancer
                              </button>
                            )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p>
                Une écriture « unknown » n’est jamais rejouée automatiquement :
                vérifiez d’abord le résultat dans la console officielle.
              </p>
              {jobs.data && pagination(jobs.data.total, 25)}
            </section>
          )}
          {current === "configuration" && (
            <>
              <StoreConfiguration done={setMessage} />
              <section className={shared.section}>
                <h2>Rapports Apple</h2>
                <p>
                  La génération ONGOING doit être demandée explicitement avec
                  une clé Apple autorisée. La disponibilité peut être différée.
                </p>
                <button
                  className={shared.primaryButton}
                  disabled={appleState.isLoading}
                  onClick={() => {
                    if (
                      window.confirm(
                        "Demander à Apple la génération continue des rapports pour cette application ?",
                      )
                    )
                      void run(
                        () =>
                          requestApple({
                            requestId: crypto.randomUUID(),
                          }).unwrap(),
                        "Demande mise en attente.",
                      );
                  }}
                >
                  Demander les rapports Apple
                </button>
              </section>
            </>
          )}
          {current === "alerts" && (
            <>
              <section className={shared.section}>
                <h2>Diagnostics actuels</h2>
                {alerts.data?.items.map((a) => (
                  <p key={a.id}>
                    {a.platform} / {a.task} : {a.code}
                  </p>
                ))}
              </section>
              <StoreResources
                resource="alerts/events"
                permissions={permissions}
                done={setMessage}
              />
              {can("store.alerts.manage") && (
                <StoreResources
                  resource="alerts/rules"
                  permissions={permissions}
                  done={setMessage}
                />
              )}
            </>
          )}
          {current === "access" && (
            <StoreResources
              resource="access"
              permissions={permissions}
              done={setMessage}
            />
          )}
          {current === "audit" && (
            <StoreResources
              resource="audit-logs"
              permissions={permissions}
              done={setMessage}
            />
          )}
          {records.data?.total === 0 &&
            ["reviews", "versions", "builds", "vitals"].includes(
              current ?? "",
            ) && (
              <p className={shared.emptyState}>
                Aucune donnée importée pour ces filtres.
              </p>
            )}
          {can("store.reports.export") && activeTopic && (
            <section className={shared.section}>
              <h2>Rapports</h2>
              <div className={shared.toolbar}>
                <label>
                  Rapport
                  <select
                    value={activeTopic}
                    onChange={(e) => setTopic(e.target.value)}
                  >
                    {reportTopics.map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
                {(["csv", "xls", "pdf"] as const).map((format) => (
                  <button
                    key={format}
                    className={shared.secondaryButton}
                    disabled={exportState.isLoading}
                    onClick={() => exportData(format)}
                  >
                    {format === "pdf" ? "Synthèse PDF" : format.toUpperCase()}
                  </button>
                ))}
              </div>
              <p>
                Excel utilise le format .xls existant de Zwanga. Les exports
                sont journalisés ; 10 000 lignes maximum.
              </p>
            </section>
          )}
        </>
      )}
    </div>
  );
}
