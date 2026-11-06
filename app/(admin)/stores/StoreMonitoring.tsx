"use client";
import { useEffect, useState, type ReactNode } from "react";
import {
  Activity,
  Bell,
  Car,
  Download,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";
import {
  useGetStoreAlertsQuery,
  useGetStoreDashboardQuery,
  useGetStoreDownloadsQuery,
  useGetStoreIntegrationsQuery,
  useGetStoreJobsQuery,
  type StorePlatform,
  type StoreStatus,
} from "@/lib/features/stores/storesApi";
import {
  formatStoreCount,
  STORE_DOWNLOAD_REFRESH,
} from "@/lib/features/stores/storePresentation";
import {
  cohortFunnel,
  dayRange,
  freshness,
  integrationTone,
  jobsByDay,
  jobTone,
  relativeTime,
  seriesStats,
  severityTone,
  STORE_TASK_LABEL as TASK_LABEL,
  summarizeJobs,
  type MonitorTone,
} from "@/lib/features/stores/storeMonitoring";
import { dateLabel, stateLabel } from "@/lib/features/mobileOperations/mobilePresentation";
import { getApiErrorMessage } from "@/lib/utils/apiErrors";
import {
  ColumnChart,
  formatCount,
  GapLineChart,
  Meter,
  PLATFORM_COLOR,
  PLATFORM_LABEL,
  SegmentedBar,
  shortDate,
  Sparkline,
  StatusBadge,
  ZWANGA_COLOR,
} from "./StoreCharts";
import { SkeletonCards } from "@/app/components/ui/Skeleton";
import styles from "./monitoring.module.css";

const INTEGRATION_LABEL: Record<string, string> = {
  connected: "Connecté",
  error: "Erreur de connexion",
  unchecked: "À vérifier",
  unconfigured: "Configuration incomplète",
  disabled: "Désactivé",
};
const JOB_SERIES = [
  { key: "good", label: "Réussies", color: "var(--color-success)" },
  { key: "warning", label: "À vérifier / indisponibles", color: "var(--color-warning)" },
  { key: "critical", label: "Échecs", color: "var(--color-danger)" },
  { key: "running", label: "En cours", color: "var(--color-border-strong)" },
];
const SEVERITY: MonitorTone[] = ["critical", "warning", "neutral", "good"];
const worst = (tones: MonitorTone[]) =>
  SEVERITY.find((t) => t !== "neutral" && tones.includes(t)) ?? "good";

const toNumber = (value: string | null | undefined) =>
  value == null || value === "" || !Number.isFinite(Number(value)) ? null : Number(value);
const percent = (value: number | null | undefined) =>
  value == null || !Number.isFinite(value)
    ? "—"
    : `${value.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`;
const rateTone = (value: number | null, good: number, fair: number): MonitorTone =>
  value == null ? "neutral" : value >= good ? "good" : value >= fair ? "warning" : "critical";

type Filters = {
  from: string;
  to: string;
  platform?: StorePlatform;
  country?: string;
  version?: string;
};

function Panel({
  title,
  sub,
  action,
  children,
}: {
  title: string;
  sub?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <div>
          <h3>{title}</h3>
          {sub && <p className={styles.panelSub}>{sub}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Kpi({
  icon,
  label,
  value,
  foot,
  aside,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  foot?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <article className={styles.kpi}>
      <p className={styles.kpiLabel}>
        {icon}
        {label}
      </p>
      <div className={styles.kpiRow}>
        <p className={styles.kpiValue}>{value}</p>
        {aside}
      </div>
      {foot && <p className={styles.kpiFoot}>{foot}</p>}
    </article>
  );
}

function Dot({ platform }: { platform: StorePlatform }) {
  return (
    <span className={styles.cellKey}>
      <i style={{ background: PLATFORM_COLOR[platform] }} />
      {PLATFORM_LABEL[platform]}
    </span>
  );
}

export function StoreMonitoring({
  filters,
  status,
  openTab,
}: {
  filters: Filters;
  status: StoreStatus;
  openTab: (tab: string) => void;
}) {
  const can = (permission: string) => status.permissions.includes(permission);
  const live = {
    pollingInterval: 15000,
    skipPollingIfUnfocused: true,
    refetchOnFocus: true,
  } as const;
  const dashboard = useGetStoreDashboardQuery(filters, STORE_DOWNLOAD_REFRESH);
  const downloads = useGetStoreDownloadsQuery(filters, STORE_DOWNLOAD_REFRESH);
  const jobs = useGetStoreJobsQuery(
    { page: 1, limit: 100, platform: filters.platform },
    { ...live, skip: !can("store.sync.read") },
  );
  const alerts = useGetStoreAlertsQuery(undefined, {
    ...live,
    skip: !can("store.alerts.read"),
  });
  const integrations = useGetStoreIntegrationsQuery(undefined, {
    ...live,
    skip: !can("store.integrations.manage"),
  });
  // Les durées relatives (« il y a 5 min ») doivent vieillir entre deux imports.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  // Pendant un changement de filtres, l'ancien rendu reste visible mais atténué.
  const board = dashboard.currentData ?? dashboard.data;
  const boardStale = !dashboard.currentData && !!dashboard.data;
  const store = downloads.currentData ?? downloads.data;
  const storeStale = !downloads.currentData && !!downloads.data;
  const fetching = [dashboard, downloads, jobs, alerts, integrations].some(
    (q) => q.isFetching,
  );
  const platforms = status.platforms.filter(
    (p) => !filters.platform || p.platform === filters.platform,
  );
  const jobItems = jobs.data?.items ?? [];
  const jobSummary = summarizeJobs(jobItems);
  const jobDays = jobsByDay(
    jobItems,
    14,
    (jobs.data?.total ?? 0) > jobItems.length,
    now,
  );
  const activeAlerts = (alerts.data?.items ?? []).filter(
    (a) => !filters.platform || a.platform === filters.platform,
  );
  const freshRows = (board?.freshness ?? []).map((f) => ({
    ...f,
    fresh: freshness(f.completedAt, f.state, now),
  }));
  const overall = worst([
    ...(integrations.data ?? [])
      .filter((i) => !filters.platform || i.platform === filters.platform)
      .map((i) => integrationTone(i.state)),
    ...freshRows.map((f) => f.fresh.tone),
    ...activeAlerts.map((a) => severityTone(a.severity)),
  ]);
  const downloadSeries = (store?.metrics ?? []).map((m) => {
    const daily = m.daily.map((d) => ({ date: d.date, value: toNumber(d.value) }));
    return { ...m, points: daily, stats: seriesStats(daily) };
  });
  const cohorts = new Map((board?.cohorts ?? []).map((c) => [c.date, c]));
  const days = dayRange(filters.from, filters.to);
  // Cohortes issues de la base Zwanga: un jour absent est un jour sans inscription.
  const registrations = (days.length ? days : [...cohorts.keys()]).map((date) => ({
    date,
    values: { registrations: cohorts.get(date)?.registrations ?? 0 },
  }));
  const funnel = cohortFunnel(board?.cohorts ?? []);
  const reviewTotals = (board?.reviewStats ?? []).reduce(
    (t, r) => ({ reviews: t.reviews + r.reviews, unanswered: t.unanswered + r.unanswered }),
    { reviews: 0, unanswered: 0 },
  );
  const incidents = jobItems
    .filter((j) => ["critical", "warning"].includes(jobTone(j.state)))
    .slice(0, 8);
  const journal = [...(days.length ? days : [...cohorts.keys()])].reverse();
  const columnPeaks = downloadSeries.map((m) => m.stats?.peak.value ?? null);
  const refresh = () => {
    void dashboard.refetch();
    void downloads.refetch();
    if (can("store.sync.read")) void jobs.refetch();
    if (can("store.alerts.read")) void alerts.refetch();
    if (can("store.integrations.manage")) void integrations.refetch();
  };

  return (
    <div className={styles.root} aria-busy={fetching}>
      <div className={styles.headerBar}>
        <div>
          <h2>Supervision des stores</h2>
          <p className={styles.panelSub}>
            Du {shortDate(filters.from)} au {shortDate(filters.to)}
            {filters.platform ? ` · ${PLATFORM_LABEL[filters.platform]}` : ""}
            {filters.country ? ` · ${filters.country}` : ""}
            {filters.version ? ` · v${filters.version}` : ""}
          </p>
        </div>
        <div className={styles.headerMeta}>
          <StatusBadge tone={overall}>
            {overall === "good"
              ? "Tout fonctionne"
              : overall === "warning"
                ? "Points d’attention"
                : "Incident en cours"}
          </StatusBadge>
          <span className={`${styles.live} ${fetching ? styles.liveBusy : ""}`}>
            {fetching
              ? "Actualisation…"
              : `Mis à jour ${relativeTime(board?.generatedAt, now)}`}
          </span>
          <button className={styles.iconButton} onClick={refresh} disabled={fetching}>
            <RefreshCw size={14} aria-hidden className={fetching ? styles.spin : undefined} />
            Actualiser
          </button>
        </div>
      </div>

      {(dashboard.error || downloads.error) && (
        <p role="alert" className={styles.note} style={{ color: "var(--color-danger)" }}>
          {getApiErrorMessage(
            dashboard.error ?? downloads.error,
            "Une partie des données de supervision est indisponible.",
          )}
          {(board || store) && " Les chiffres affichés sont ceux du dernier chargement réussi."}
        </p>
      )}

      {/* ------------------------------------------------ santé par store */}
      <div className={styles.healthGrid}>
        {platforms.map((p) => {
          const integration = integrations.data?.find((i) => i.platform === p.platform);
          const caps = Object.values(integration?.capabilities ?? {});
          const tasks = freshRows.filter((f) => f.platform === p.platform);
          return (
            <article
              key={p.platform}
              className={styles.platformCard}
              style={{ ["--platform" as string]: PLATFORM_COLOR[p.platform] }}
            >
              <div className={styles.platformHead}>
                <span className={styles.platformName}>{PLATFORM_LABEL[p.platform]}</span>
                {integration ? (
                  <StatusBadge tone={integrationTone(integration.state)}>
                    {INTEGRATION_LABEL[integration.state] ?? integration.state}
                  </StatusBadge>
                ) : (
                  <StatusBadge tone={p.configured ? "good" : "warning"}>
                    {p.configured ? "Configuré" : "Configuration incomplète"}
                  </StatusBadge>
                )}
              </div>
              <dl className={styles.facts}>
                <div>
                  <dt>Application</dt>
                  <dd>{p.appId ?? "Non configurée"}</dd>
                </div>
                <div>
                  <dt>Dernier import</dt>
                  <dd title={dateLabel(integration?.lastSync)}>
                    {integration ? relativeTime(integration.lastSync, now) : relativeTime(
                      tasks.map((t) => t.completedAt).filter(Boolean).sort().pop(),
                      now,
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Prochain contrôle</dt>
                  <dd>
                    {!status.scheduled
                      ? "Planification désactivée"
                      : integration?.nextSchedulerCheck
                        ? relativeTime(integration.nextSchedulerCheck, now)
                        : "—"}
                  </dd>
                </div>
                <div>
                  <dt>Capacités disponibles</dt>
                  <dd>
                    {caps.length
                      ? `${caps.filter((c) => c.available).length} / ${caps.length}`
                      : "—"}
                  </dd>
                </div>
              </dl>
              {tasks.length > 0 && (
                <div className={styles.statLine}>
                  {tasks.map((t) => (
                    <StatusBadge key={t.task} tone={t.fresh.tone}>
                      {TASK_LABEL[t.task] ?? t.task} · {t.fresh.label}
                    </StatusBadge>
                  ))}
                </div>
              )}
              {(integration?.errorCode || p.missingVariables.length > 0) && (
                <p className={styles.note} role="alert">
                  {integration?.errorCode && <>Diagnostic : <code>{integration.errorCode}</code>. </>}
                  {p.missingVariables.length > 0 &&
                    `Variables manquantes : ${p.missingVariables.join(", ")}.`}
                </p>
              )}
            </article>
          );
        })}
      </div>

      {!board && !store && (dashboard.isLoading || downloads.isLoading) ? (
        <>
          <SkeletonCards count={4} height={120} />
          <SkeletonCards count={3} height={260} />
        </>
      ) : null}

      {/* --------------------------------------------------------- KPI */}
      <div className={`${styles.kpis} ${storeStale || boardStale ? styles.stale : ""}`}>
        {downloadSeries.map((m) => (
          <Kpi
            key={m.platform + m.metric}
            icon={<Download size={15} aria-hidden style={{ color: PLATFORM_COLOR[m.platform] }} />}
            label={`${m.label} · ${PLATFORM_LABEL[m.platform]}`}
            value={formatStoreCount(m.period.value)}
            aside={<Sparkline values={m.points.map((p) => p.value)} color={PLATFORM_COLOR[m.platform]} />}
            foot={
              <>
                {m.period.observedDays} / {m.period.expectedDays} jours renseignés
                {m.period.availability !== "available" && " · données partielles"}
                {m.stats && ` · pic ${formatCount(m.stats.peak.value)} le ${shortDate(m.stats.peak.date)}`}
              </>
            }
          />
        ))}
        {board && (
          <>
            <Kpi
              icon={<Users size={15} aria-hidden />}
              label="Inscriptions Zwanga"
              value={formatCount(funnel[0].value)}
              foot={`${formatCount(board.cohorts.reduce((s, c) => s + c.drivers, 0))} conducteurs · ${formatCount(board.cohorts.reduce((s, c) => s + c.passengers, 0))} passagers`}
            />
            <Kpi
              icon={<ShieldCheck size={15} aria-hidden />}
              label="KYC approuvés / soumis"
              value={percent(board.conversion.kycApprovalPercent)}
              aside={<Meter value={board.conversion.kycApprovalPercent} tone={rateTone(board.conversion.kycApprovalPercent, 70, 40)} />}
              foot="Cohorte de la période, état actuel du KYC"
            />
            <Kpi
              icon={<Car size={15} aria-hidden />}
              label="Premier trajet des inscrits"
              value={percent(board.conversion.firstTripPercent)}
              aside={<Meter value={board.conversion.firstTripPercent} tone={rateTone(board.conversion.firstTripPercent, 30, 10)} />}
              foot={`${formatCount(board.business.completedTrips)} trajets terminés sur la période`}
            />
            <Kpi
              icon={<MessageSquare size={15} aria-hidden />}
              label="Avis sans réponse"
              value={formatCount(reviewTotals.unanswered)}
              foot={`sur ${formatCount(reviewTotals.reviews)} avis importés`}
            />
          </>
        )}
        {can("store.sync.read") && jobs.data && (
          <Kpi
            icon={<Activity size={15} aria-hidden />}
            label="Synchronisations réussies"
            value={percent(jobSummary.successRate)}
            aside={<Meter value={jobSummary.successRate} tone={rateTone(jobSummary.successRate, 95, 80)} />}
            foot={`${jobSummary.counts.critical} échecs · ${jobSummary.counts.warning} à vérifier sur les ${jobSummary.total} dernières`}
          />
        )}
        {can("store.alerts.read") && alerts.data && (
          <Kpi
            icon={<Bell size={15} aria-hidden />}
            label="Alertes actives"
            value={formatCount(activeAlerts.length)}
            foot={
              activeAlerts.length
                ? `${activeAlerts.filter((a) => a.severity === "critical").length} critiques`
                : "Aucun diagnostic en cours"
            }
          />
        )}
      </div>

      {/* --------------------------------------------- téléchargements */}
      {store && (
        <Panel
          title="Téléchargements et installations"
          sub="Un graphique par indicateur officiel : les définitions Google et Apple diffèrent, elles ne sont ni additionnées ni comparées."
        >
          <div className={`${styles.multiples} ${storeStale ? styles.stale : ""}`}>
            {downloadSeries.map((m) => (
              <div key={m.platform + m.metric} className={styles.multiple}>
                <div className={styles.multipleHead}>
                  <strong>{m.label}</strong>
                  <Dot platform={m.platform} />
                  <span>Indicateur officiel : {m.definition.officialName}</span>
                </div>
                <GapLineChart points={m.points} color={PLATFORM_COLOR[m.platform]} label={`${m.label} ${PLATFORM_LABEL[m.platform]}`} height={220} width={440} />
                {m.stats && (
                  <p className={styles.statLine}>
                    <span>Total <b>{formatStoreCount(m.period.value)}</b></span>
                    <span>Moyenne / jour <b>{formatCount(m.stats.average)}</b></span>
                    <span>Dernier jour <b>{formatCount(m.stats.last.value)}</b> ({shortDate(m.stats.last.date)})</span>
                  </p>
                )}
              </div>
            ))}
          </div>
          <p className={styles.note}>
            Les interruptions de courbe et les repères sur l’axe signalent des jours sans rapport : ce ne sont pas des zéros. Les stores publient avec un à trois jours de retard.
          </p>
        </Panel>
      )}

      {/* ------------------------------------------ inscriptions / entonnoir */}
      {board && (
        <div className={`${styles.panels} ${boardStale ? styles.stale : ""}`}>
          <Panel title="Inscriptions quotidiennes" sub="Comptes créés dans Zwanga, par jour UTC">
            <ColumnChart
              points={registrations}
              series={[{ key: "registrations", label: "Inscriptions", color: ZWANGA_COLOR }]}
              label="Inscriptions quotidiennes"
            />
          </Panel>
          <Panel title="Entonnoir d’activation" sub="Cohorte inscrite sur la période, état actuel de chaque étape">
            <ol className={styles.funnel}>
              {funnel.map((step, i) => (
                <li key={step.label}>
                  <div className={styles.funnelHead}>
                    <span>{step.label}</span>
                    <span>
                      <b>{formatCount(step.value)}</b>
                      <em>{percent(step.ofFirst)}</em>
                    </span>
                  </div>
                  <div className={styles.funnelTrack}>
                    <span style={{ width: `${step.ofFirst ?? 0}%` }} />
                  </div>
                  {i > 0 && (
                    <div className={styles.funnelStep}>
                      {percent(step.ofPrevious)} de l’étape précédente
                    </div>
                  )}
                </li>
              ))}
            </ol>
            <p className={styles.note}>
              Aucun rapprochement individuel avec les téléchargements des stores.
            </p>
          </Panel>
        </div>
      )}

      {/* ------------------------------------------- synchros / avis */}
      <div className={styles.panels}>
        {can("store.sync.read") && (
          <Panel
            title="Activité des synchronisations"
            sub={`14 derniers jours · ${jobSummary.total} dernières exécutions chargées`}
            action={
              <button className={styles.linkButton} onClick={() => openTab("syncs")}>
                Historique complet
              </button>
            }
          >
            {jobs.error ? (
              <p role="alert" className={styles.empty}>
                {getApiErrorMessage(jobs.error, "Historique des synchronisations indisponible.")}
              </p>
            ) : (
              <>
                <ColumnChart
                  points={jobDays.map((d) => ({ date: d.date, values: d.counts }))}
                  series={JOB_SERIES}
                  label="Synchronisations par jour et par résultat"
                  unavailableLabel="Exécutions non chargées pour ce jour"
                />
                <SegmentedBar
                  label="Répartition des dernières exécutions"
                  parts={JOB_SERIES.map((s) => ({
                    label: s.label,
                    value: jobSummary.counts[s.key as keyof typeof jobSummary.counts],
                    color: s.color,
                  }))}
                />
                {(jobs.data?.total ?? 0) > jobItems.length && (
                  <p className={styles.note}>
                    Les jours grisés précèdent la plus ancienne exécution chargée.
                  </p>
                )}
              </>
            )}
          </Panel>
        )}
        {board && (
          <Panel
            title="Avis clients"
            sub="Avis importés sur la période"
            action={
              can("store.reviews.read") && (
                <button className={styles.linkButton} onClick={() => openTab("reviews")}>
                  Traiter les avis
                </button>
              )
            }
          >
            {board.reviewStats.length ? (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Store</th>
                      <th className={styles.num}>Avis</th>
                      <th className={styles.num}>Sans réponse</th>
                      <th>Taux de réponse</th>
                      <th className={styles.num}>Note moy.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {board.reviewStats.map((r) => {
                      const rate = r.reviews ? ((r.reviews - r.unanswered) / r.reviews) * 100 : null;
                      const rating = toNumber(r.sampleAverageRating);
                      return (
                        <tr key={r.platform}>
                          <td><Dot platform={r.platform} /></td>
                          <td className={styles.num}>{formatCount(r.reviews)}</td>
                          <td className={styles.num}>{formatCount(r.unanswered)}</td>
                          <td>
                            <span className={styles.cellKey}>
                              <Meter value={rate} tone={rateTone(rate, 80, 50)} />
                              {percent(rate)}
                            </span>
                          </td>
                          <td className={styles.num}>
                            {rating === null ? (
                              <span className={styles.dash}>—</span>
                            ) : (
                              <span className={styles.cellKey}>
                                <Star size={13} aria-hidden fill="currentColor" style={{ color: "var(--color-warning)" }} />
                                {rating.toFixed(2)} / 5
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className={styles.empty}>Aucun avis importé sur la période.</p>
            )}
            <p className={styles.note}>
              La moyenne porte sur les avis importés, ce n’est pas la note globale affichée sur la fiche.
            </p>
          </Panel>
        )}
      </div>

      {/* --------------------------------------- fraîcheur / incidents */}
      <div className={styles.panels}>
        {board && (
          <Panel title="Fraîcheur des imports" sub="Dernière exécution connue par store et par tâche">
            {freshRows.length ? (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Store</th>
                      <th>Tâche</th>
                      <th>Fraîcheur</th>
                      <th>Dernier import</th>
                    </tr>
                  </thead>
                  <tbody>
                    {freshRows.map((f) => (
                      <tr key={f.platform + f.task}>
                        <td><Dot platform={f.platform} /></td>
                        <td>
                          {TASK_LABEL[f.task] ?? f.task}
                          <small>{stateLabel(f.state)}{f.errorCode ? ` · ${f.errorCode}` : ""}</small>
                        </td>
                        <td><StatusBadge tone={f.fresh.tone}>{f.fresh.label}</StatusBadge></td>
                        <td className={styles.nowrap}>
                          {relativeTime(f.completedAt, now)}
                          <small>{dateLabel(f.completedAt)}</small>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className={styles.empty}>Aucun import enregistré.</p>
            )}
          </Panel>
        )}
        {(can("store.sync.read") || can("store.alerts.read")) && (
          <Panel
            title="Incidents et alertes"
            sub="Diagnostics actifs et dernières exécutions en échec"
            action={
              can("store.alerts.read") && (
                <button className={styles.linkButton} onClick={() => openTab("alerts")}>
                  Gérer les alertes
                </button>
              )
            }
          >
            {activeAlerts.length > 0 && (
              <ul className={styles.alerts}>
                {activeAlerts.map((a) => (
                  <li key={a.id}>
                    <span className={styles.cellKey}>
                      <Dot platform={a.platform} />· {TASK_LABEL[a.task] ?? a.task}
                    </span>
                    <code>{a.code}</code>
                    <StatusBadge tone={severityTone(a.severity)}>{a.severity}</StatusBadge>
                  </li>
                ))}
              </ul>
            )}
            {incidents.length > 0 && (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Quand</th>
                      <th>Store / tâche</th>
                      <th>État</th>
                      <th className={styles.num}>Essais</th>
                      <th>Diagnostic</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incidents.map((j) => (
                      <tr key={j.id}>
                        <td className={styles.nowrap}>
                          {relativeTime(j.createdAt, now)}
                          <small>{dateLabel(j.createdAt)}</small>
                        </td>
                        <td>
                          <Dot platform={j.platform} />
                          <small>{TASK_LABEL[j.task] ?? j.task}</small>
                        </td>
                        <td><StatusBadge tone={jobTone(j.state)}>{stateLabel(j.state)}</StatusBadge></td>
                        <td className={styles.num}>{j.attempts}</td>
                        <td>{j.errorCode ? <code>{j.errorCode}</code> : <span className={styles.dash}>—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {!activeAlerts.length && !incidents.length && (alerts.data || jobs.data) && (
              <p className={styles.allClear}>
                <ShieldCheck size={18} aria-hidden />
                Aucun incident ni alerte active.
              </p>
            )}
          </Panel>
        )}
      </div>

      {/* --------------------------------------------- journal quotidien */}
      {board && store && journal.length > 0 && (
        <Panel
          title="Journal quotidien"
          sub="Vue tabulaire de tous les graphiques, jour par jour (le plus récent en premier). Le pic de chaque colonne est en gras."
        >
          <div className={`${styles.tableWrap} ${styles.tall}`}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  {downloadSeries.map((m) => (
                    <th key={m.platform + m.metric} className={styles.num}>
                      {m.label}
                      <small>{PLATFORM_LABEL[m.platform]}</small>
                    </th>
                  ))}
                  <th className={styles.num}>Inscrits</th>
                  <th className={styles.num}>KYC approuvés</th>
                  <th className={styles.num}>1er trajet</th>
                </tr>
              </thead>
              <tbody>
                {journal.map((date) => {
                  const c = cohorts.get(date);
                  return (
                    <tr key={date}>
                      <td>{shortDate(date)} {date.slice(0, 4)}</td>
                      {downloadSeries.map((m, i) => {
                        const value = m.points.find((p) => p.date === date)?.value ?? null;
                        return (
                          <td
                            key={m.platform + m.metric}
                            className={`${styles.num} ${value !== null && value === columnPeaks[i] ? styles.peak : ""}`}
                          >
                            {value === null ? (
                              <span className={styles.dash} title="Rapport absent ou donnée masquée">—</span>
                            ) : (
                              formatCount(value)
                            )}
                          </td>
                        );
                      })}
                      <td className={styles.num}>{formatCount(c?.registrations ?? 0)}</td>
                      <td className={styles.num}>{formatCount(c?.kycApproved ?? 0)}</td>
                      <td className={styles.num}>{formatCount(c?.firstTripCompleted ?? 0)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td>Total</td>
                  {downloadSeries.map((m) => (
                    <td key={m.platform + m.metric} className={styles.num}>
                      {formatStoreCount(m.period.value)}
                    </td>
                  ))}
                  <td className={styles.num}>{formatCount(funnel[0].value)}</td>
                  <td className={styles.num}>{formatCount(funnel[2].value)}</td>
                  <td className={styles.num}>{formatCount(funnel[3].value)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Panel>
      )}

      {board && board.notes.length > 0 && (
        <details className={styles.panel}>
          <summary>Méthodologie et limites des sources</summary>
          {board.notes.map((note) => (
            <p key={note} className={styles.note}>{note}</p>
          ))}
        </details>
      )}
    </div>
  );
}
