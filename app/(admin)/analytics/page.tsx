"use client";

/**
 * Page Analytics — Rapport Business Intelligence agrégé
 *
 * Organise les données existantes (trajets, utilisateurs, signalements, dashboard)
 * en trois onglets thématiques : Opérationnel, Qualité et Marketing.
 * Chaque onglet expose un bouton d'export CSV calculé côté client.
 */

import { useMemo, useState } from "react";
import {
  BarChart2,
  Download,
  TrendingUp,
  Users,
  Route,
  CreditCard,
  Info,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";

import { BarList, CHART_COLORS, TrendChart } from "@/app/components/charts/Charts";
import { useGetAllTripsQuery } from "@/lib/features/trips/tripsApi";
import { useGetUsersQuery } from "@/lib/features/users/usersApi";
import { useGetDashboardQuery } from "@/lib/features/dashboard/dashboardApi";
import { useGetReportsQuery } from "@/lib/features/reports/reportsApi";

import shared from "../styles/page.module.css";

import local from "./analytics.module.css";

// ---------------------------------------------------------------------------
// Types locaux
// ---------------------------------------------------------------------------

type TabKey = "operational" | "quality" | "marketing";

interface TabDef {
  key: TabKey;
  label: string;
}

const TABS: TabDef[] = [
  { key: "operational", label: "Opérationnel" },
  { key: "quality", label: "Qualité" },
  { key: "marketing", label: "Marketing" },
];

// ---------------------------------------------------------------------------
// Helpers — formatage
// ---------------------------------------------------------------------------

/** Formate un nombre entier en notation française. */
const fmt = (n: number): string =>
  new Intl.NumberFormat("fr-CD").format(Number.isFinite(n) ? Math.round(n) : 0);

/** Calcule un pourcentage en chaîne (ex: "73,4 %"). */
const pct = (num: number, denom: number): string => {
  if (!denom) return "—";
  return `${((num / denom) * 100).toFixed(1)} %`;
};

// ---------------------------------------------------------------------------
// Helpers — export CSV côté client
// ---------------------------------------------------------------------------

/**
 * Déclenche le téléchargement d'un fichier CSV depuis un tableau de lignes.
 * Utilise uniquement des APIs navigateur (Blob + URL.createObjectURL).
 */
const downloadCsv = (rows: string[][], filename: string): void => {
  const content = rows
    .map((row) =>
      row
        .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
        .join(",")
    )
    .join("\r\n");

  const blob = new Blob(["\uFEFF" + content], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

interface TrendPoint {
  label: string;
  published: number;
  completed: number;
}

interface ReasonSlice {
  label: string;
  count: number;
}

// ---------------------------------------------------------------------------
// Sous-composant — Carte KPI simple
// ---------------------------------------------------------------------------

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  helper?: string;
  accentColor?: string;
}

function KpiCard({ icon, label, value, helper, accentColor = "var(--color-primary)" }: KpiCardProps) {
  return (
    <div className={`${shared.card} ${local.gap10}`}>
      <div className={local.flexCenterGap8}>
        <span style={{ color: accentColor }}>{icon}</span>
        <span className={local.text8MutedSemibold}>
          {label}
        </span>
      </div>
      <p className={local.m0Text16BoldLh1}>
        {value}
      </p>
      {helper && (
        <p className={`${shared.mutedText} ${local.text78}`}>
          {helper}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Composant principal
// ---------------------------------------------------------------------------

/** Labels français des motifs de signalement. */
const REASON_LABELS: Record<string, string> = {
  inappropriate_behavior: "Comportement inapproprié",
  harassment: "Harcèlement",
  safety_concern: "Sécurité",
  fraud: "Fraude",
  other: "Autre",
};

export default function AnalyticsPage() {
  // -------------------------------------------------------------------------
  // État local
  // -------------------------------------------------------------------------
  const [activeTab, setActiveTab] = useState<TabKey>("operational");

  // -------------------------------------------------------------------------
  // Requêtes RTK Query
  // -------------------------------------------------------------------------

  /** Trajets : utilisés pour les KPIs opérationnels */
  const {
    data: trips = [],
    isFetching: tripsFetching,
    isError: tripsError,
  } = useGetAllTripsQuery({ page: 1, limit: 1000 });

  /** Utilisateurs : total pour la page 1 (on n'a besoin que du total) */
  const { data: usersData, isFetching: usersFetching } = useGetUsersQuery({
    page: 1,
    limit: 1,
  });

  /** Dashboard : métriques agrégées, tendances, routes populaires, top conducteurs */
  const {
    data: dashboard,
    isFetching: dashboardFetching,
    isError: dashboardError,
  } = useGetDashboardQuery();

  /** Signalements en attente */
  const { data: pendingReportsData } = useGetReportsQuery({
    status: "pending",
    page: 1,
    limit: 1,
  });

  /** Signalements résolus */
  const { data: resolvedReportsData } = useGetReportsQuery({
    status: "resolved",
    page: 1,
    limit: 1,
  });

  /** Signalements classés sans suite */
  const { data: dismissedReportsData } = useGetReportsQuery({
    status: "dismissed",
    page: 1,
    limit: 1,
  });

  /** Tous les signalements (pour la répartition par motif, max 200) */
  const { data: allReportsData } = useGetReportsQuery({
    page: 1,
    limit: 200,
  });

  // -------------------------------------------------------------------------
  // Calculs dérivés — Onglet Opérationnel
  // -------------------------------------------------------------------------

  /* Les trajets sont charges par lot de 1000 au plus: le total vient du
     serveur, les repartitions portent sur l'echantillon et le disent. */
  const tripsTotal = dashboard?.tripSample.total ?? null;
  const tripsTruncated = tripsTotal !== null && tripsTotal > trips.length;
  const reportSampleSize = allReportsData?.reports?.length ?? 0;
  const reportsTruncated = (allReportsData?.total ?? 0) > reportSampleSize;

  const operationalKpis = useMemo(() => {
    const total = trips.length;
    const completed = trips.filter((t) => t.status === "completed").length;
    const ongoing = trips.filter((t) => t.status === "ongoing").length;
    const cancelled = trips.filter((t) => t.status === "cancelled").length;
    const upcoming = trips.filter((t) => t.status === "upcoming").length;

    return { total, completed, ongoing, cancelled, upcoming };
  }, [trips]);

  /** Données de tendance issues du dashboard (7 derniers jours). */
  const trendData = useMemo<TrendPoint[]>(() => {
    return dashboard?.tripTrends ?? [];
  }, [dashboard]);

  /** Routes populaires issues du dashboard. */
  const popularRoutes = useMemo(() => {
    return dashboard?.popularRoutes ?? [];
  }, [dashboard]);

  // -------------------------------------------------------------------------
  // Calculs dérivés — Onglet Qualité
  // -------------------------------------------------------------------------

  const qualityKpis = useMemo(() => {
    const total = trips.length || 1; // évite la division par zéro
    const completed = trips.filter((t) => t.status === "completed").length;
    const cancelled = trips.filter((t) => t.status === "cancelled").length;

    const completionRate = (completed / total) * 100;
    const cancellationRate = (cancelled / total) * 100;

    const pendingReports = pendingReportsData?.total ?? 0;
    const resolvedReports = resolvedReportsData?.total ?? 0;
    const dismissedReports = dismissedReportsData?.total ?? 0;
    const totalReports = pendingReports + resolvedReports + dismissedReports;

    return {
      completionRate,
      cancellationRate,
      pendingReports,
      resolvedReports,
      dismissedReports,
      totalReports,
    };
  }, [trips, pendingReportsData, resolvedReportsData, dismissedReportsData]);

  /** Répartition des motifs de signalement pour le pie chart. */
  const reportReasonSlices = useMemo<ReasonSlice[]>(() => {
    const reports = allReportsData?.reports ?? [];
    const counts: Record<string, number> = {};

    for (const report of reports) {
      counts[report.reason] = (counts[report.reason] ?? 0) + 1;
    }

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([reason, count]) => ({
        label: REASON_LABELS[reason] ?? reason,
        count,
      }));
  }, [allReportsData]);

  // -------------------------------------------------------------------------
  // Calculs dérivés — Onglet Marketing
  // -------------------------------------------------------------------------

  const marketingKpis = useMemo(() => {
    // Métriques utilisateurs depuis le dashboard
    const metrics = dashboard?.metrics ?? [];
    const usersMetric = metrics.find((m) => m.id === "users");
    const driversMetric = metrics.find((m) => m.id === "drivers");
    const passengersMetric = metrics.find((m) => m.id === "passengers");

    // Valeurs numériques brutes depuis la liste des trips pour le ratio
    const drivers = trips.filter((t) => t.driver).length;
    const totalUsers = usersData?.total ?? 0;

    // Top conducteurs du dashboard
    const topDrivers = dashboard?.topDrivers ?? [];

    return {
      totalUsersLabel: usersMetric?.value ?? fmt(totalUsers),
      driversLabel: driversMetric?.value ?? "—",
      passengersLabel: passengersMetric?.value ?? "—",
      topDrivers,
    };
  }, [dashboard, trips, usersData]);

  // -------------------------------------------------------------------------
  // Exports CSV par onglet
  // -------------------------------------------------------------------------

  const handleExportCsv = () => {
    const ts = new Date().toISOString().slice(0, 10);

    if (activeTab === "operational") {
      // Lignes KPIs
      const kpiRows: string[][] = [
        ["Indicateur", "Valeur"],
        ["Total trajets", String(operationalKpis.total)],
        ["Complétés", String(operationalKpis.completed)],
        ["En cours", String(operationalKpis.ongoing)],
        ["Annulés", String(operationalKpis.cancelled)],
        ["À venir", String(operationalKpis.upcoming)],
        [],
        ["Tendance (7 jours)", "Publiés", "Complétés"],
        ...trendData.map((d) => [d.label, String(d.published), String(d.completed)]),
        [],
        ["Routes populaires", "Total trajets", "En direct", "Complétés", "Expirés"],
        ...popularRoutes.map((r) => [
          r.route,
          String(r.total),
          String(r.live),
          String(r.completed),
          String(r.expired),
        ]),
      ];
      downloadCsv(kpiRows, `zwanga_analytics_operationnel_${ts}.csv`);
    } else if (activeTab === "quality") {
      const rows: string[][] = [
        ["Indicateur", "Valeur"],
        ["Taux de complétion", pct(operationalKpis.completed, trips.length)],
        ["Taux d'annulation", pct(operationalKpis.cancelled, trips.length)],
        ["Signalements en attente", String(qualityKpis.pendingReports)],
        ["Signalements résolus", String(qualityKpis.resolvedReports)],
        ["Signalements classés sans suite", String(qualityKpis.dismissedReports)],
        [],
        ["Motif de signalement", "Nombre", "Pourcentage"],
        ...reportReasonSlices.map((s) => [
          s.label,
          String(s.count),
          pct(s.count, qualityKpis.totalReports),
        ]),
      ];
      downloadCsv(rows, `zwanga_analytics_qualite_${ts}.csv`);
    } else {
      // Marketing
      const rows: string[][] = [
        ["Indicateur", "Valeur"],
        ["Total utilisateurs", marketingKpis.totalUsersLabel],
        ["Conducteurs", marketingKpis.driversLabel],
        ["Passagers", marketingKpis.passengersLabel],
        [],
        ["Top conducteurs", "Trajets complétés", "Score"],
        ...marketingKpis.topDrivers.map((d) => [
          d.name,
          String(d.completed),
          String(d.score),
        ]),
      ];
      downloadCsv(rows, `zwanga_analytics_marketing_${ts}.csv`);
    }
  };

  // -------------------------------------------------------------------------
  // Rendu
  // -------------------------------------------------------------------------

  const isLoading = tripsFetching || dashboardFetching || usersFetching;

  return (
    <div className={shared.page}>
      {/* ------------------------------------------------------------------ */}
      {/* En-tête de la page                                                   */}
      {/* ------------------------------------------------------------------ */}
      <section className={shared.section}>
        <div className={shared.sectionHeader}>
          <div>
            <h1 className={local.m0FlexCenterGap10}>
              <BarChart2 size={26} aria-hidden="true" />
              Analytics &amp; Business Intelligence
            </h1>
            <p className={`${shared.mutedText} ${local.mt4}`}>
              Rapport agrégé en temps réel depuis les données de la plateforme Zwanga.
            </p>
          </div>

          {/* Bouton Export CSV global (onglet actif) */}
          <button
            type="button"
            className={`${shared.primaryButton} ${local.gap8}`}
            onClick={handleExportCsv}
            disabled={isLoading}

          >
            <Download size={16} aria-hidden="true" />
            Exporter CSV — {TABS.find((t) => t.key === activeTab)?.label}
          </button>
        </div>

        {/* Message d'aide contextuel */}
        <p className={shared.helpText}>
          <Info size={16} aria-hidden="true" />
          <span>
            Ces métriques sont calculées en direct depuis les données de la plateforme (trajets,
            utilisateurs, signalements). L'export CSV produit un fichier adapté à Excel ou
            Google Sheets.
            {tripsTruncated &&
              ` Attention : les taux et répartitions portent sur les ${fmt(trips.length)} trajets les plus récents, sur ${fmt(tripsTotal ?? 0)} au total.`}
          </span>
        </p>

        {/* Erreurs de chargement */}
        {(tripsError || dashboardError) && (
          <p className={shared.errorText} role="alert">
            Certaines données n'ont pas pu être chargées. Les métriques affichées peuvent être
            partielles.
          </p>
        )}
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Navigation par onglets                                               */}
      {/* ------------------------------------------------------------------ */}
      <div
        role="tablist"
        aria-label="Onglets Analytics"
        className={local.flexGap10WrapWrap}
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            aria-controls={`tabpanel-${tab.key}`}
            id={`tab-${tab.key}`}
            type="button"
            className={
              activeTab === tab.key ? shared.primaryButton : shared.secondaryButton
            }
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ================================================================== */}
      {/* ONGLET — OPÉRATIONNEL                                               */}
      {/* ================================================================== */}
      {activeTab === "operational" && (
        <div
          id="tabpanel-operational"
          role="tabpanel"
          aria-labelledby="tab-operational"
        >
          {/* KPIs principaux */}
          <section className={shared.section}>
            <div className={shared.sectionHeader}>
              <h2 className={local.m0FlexCenterGap8}>
                <TrendingUp size={20} aria-hidden="true" />
                KPIs Trajets
              </h2>
              {isLoading && (
                <span className={`${shared.mutedText} ${local.text82}`}>
                  Chargement…
                </span>
              )}
            </div>

            <div className={shared.grid}>
              <KpiCard
                icon={<Route size={18} />}
                label="Total trajets publiés"
                value={fmt(tripsTotal ?? operationalKpis.total)}
                helper={
                  tripsTruncated
                    ? `Tous statuts · répartition ci-dessous sur les ${fmt(trips.length)} plus récents`
                    : "Tous statuts confondus"
                }
              />
              <KpiCard
                icon={<CheckCircle size={18} />}
                label="Trajets complétés"
                value={fmt(operationalKpis.completed)}
                helper={pct(operationalKpis.completed, operationalKpis.total) + " du total"}
                accentColor="var(--color-success)"
              />
              <KpiCard
                icon={<Clock size={18} />}
                label="Trajets en cours"
                value={fmt(operationalKpis.ongoing)}
                helper="Actuellement actifs sur la plateforme"
                accentColor="var(--chart-blue)"
              />
              <KpiCard
                icon={<XCircle size={18} />}
                label="Trajets annulés"
                value={fmt(operationalKpis.cancelled)}
                helper={pct(operationalKpis.cancelled, operationalKpis.total) + " du total"}
                accentColor="var(--color-danger)"
              />
            </div>
          </section>

          {/* Graphique de tendance */}
          <section className={shared.section}>
            <div className={shared.sectionHeader}>
              <h2 className={local.m0}>Tendance des trajets — 7 derniers jours</h2>
            </div>

            {dashboardError ? (
              <p className={shared.errorText} role="alert">
                Impossible de charger les données de tendance.
              </p>
            ) : trendData.length === 0 && !dashboardFetching ? (
              <p className={shared.emptyState}>
                Aucune donnée de tendance disponible pour le moment.
              </p>
            ) : (
              <TrendChart
                ariaLabel="Trajets publiés et terminés par jour."
                points={trendData.map((d) => ({
                  label: d.label,
                  values: [d.published, d.completed],
                }))}
                series={[
                  { label: "Publiés", color: CHART_COLORS.orange },
                  { label: "Terminés", color: CHART_COLORS.blue },
                ]}
              />
            )}
          </section>

          {/* Routes populaires */}
          <section className={shared.section}>
            <div className={shared.sectionHeader}>
              <h2 className={local.m0}>Routes populaires</h2>
            </div>

            {popularRoutes.length === 0 ? (
              <p className={shared.emptyState}>
                {dashboardFetching
                  ? "Chargement des routes…"
                  : "Aucune route populaire identifiée pour le moment."}
              </p>
            ) : (
              <div className={shared.tableWrapper}>
                <table className={shared.table}>
                  <thead>
                    <tr>
                      <th>Route</th>
                      <th>Total trajets</th>
                      <th>En direct</th>
                      <th>Complétés</th>
                      <th>Expirés</th>
                    </tr>
                  </thead>
                  <tbody>
                    {popularRoutes.map((route) => (
                      <tr key={route.id}>
                        <td>
                          <strong>{route.route}</strong>
                        </td>
                        <td>{fmt(route.total)}</td>
                        <td>
                          <span
                            className={`${shared.badge} ${
                              route.live > 0 ? shared.badgeSuccess : ""
                            }`}
                          >
                            {fmt(route.live)}
                          </span>
                        </td>
                        <td>{fmt(route.completed)}</td>
                        <td>
                          {route.expired > 0 ? (
                            <span className={`${shared.badge} ${shared.badgeWarning}`}>
                              {fmt(route.expired)}
                            </span>
                          ) : (
                            fmt(route.expired)
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {/* ================================================================== */}
      {/* ONGLET — QUALITÉ                                                    */}
      {/* ================================================================== */}
      {activeTab === "quality" && (
        <div
          id="tabpanel-quality"
          role="tabpanel"
          aria-labelledby="tab-quality"
        >
          {/* Taux de service */}
          <section className={shared.section}>
            <div className={shared.sectionHeader}>
              <h2 className={local.m0FlexCenterGap8}>
                <CheckCircle size={20} aria-hidden="true" />
                Taux de service
              </h2>
            </div>

            <div className={shared.grid}>
              <KpiCard
                icon={<CheckCircle size={18} />}
                label="Taux de complétion global"
                value={pct(operationalKpis.completed, trips.length)}
                helper={`${fmt(operationalKpis.completed)} trajets complétés sur ${fmt(trips.length)}`}
                accentColor="var(--color-success)"
              />
              <KpiCard
                icon={<XCircle size={18} />}
                label="Taux d'annulation global"
                value={pct(operationalKpis.cancelled, trips.length)}
                helper={`${fmt(operationalKpis.cancelled)} trajets annulés sur ${fmt(trips.length)}`}
                accentColor="var(--color-danger)"
              />
            </div>
          </section>

          {/* Signalements */}
          <section className={shared.section}>
            <div className={shared.sectionHeader}>
              <h2 className={local.m0FlexCenterGap8}>
                <AlertTriangle size={20} aria-hidden="true" />
                Signalements utilisateurs
              </h2>
            </div>

            <div className={shared.grid}>
              <KpiCard
                icon={<AlertTriangle size={18} />}
                label="En attente de traitement"
                value={fmt(qualityKpis.pendingReports)}
                helper="Signalements sans décision admin"
                accentColor="var(--color-danger)"
              />
              <KpiCard
                icon={<CheckCircle size={18} />}
                label="Résolus"
                value={fmt(qualityKpis.resolvedReports)}
                helper="Signalements traités et clôturés"
                accentColor="var(--color-success)"
              />
              <KpiCard
                icon={<XCircle size={18} />}
                label="Classés sans suite"
                value={fmt(qualityKpis.dismissedReports)}
                helper="Non fondés ou non actionnables"
                accentColor="var(--color-text-muted)"
              />
            </div>

            {/* Pie chart des motifs */}
            <div className={local.mt8}>
              <h3 className={local.m0016Text95}>
                Répartition par motif de signalement
              </h3>
              <BarList
                emptyLabel="Aucun signalement enregistré."
                items={reportReasonSlices.map((slice) => ({
                  label: slice.label,
                  value: slice.count,
                  valueLabel: `${fmt(slice.count)} · ${pct(slice.count, reportSampleSize)}`,
                }))}
              />
              {reportsTruncated && (
                <p className={`${shared.mutedText} ${local.mt10Text8}`}>
                  Répartition calculée sur les {fmt(reportSampleSize)} signalements les plus
                  récents (sur {fmt(allReportsData?.total ?? 0)}).
                </p>
              )}
            </div>
          </section>

          {/* Aide qualité */}
          <section className={shared.section}>
            <p className={shared.helpText}>
              <Info size={16} aria-hidden="true" />
              <span>
                Le taux de complétion mesure la fiabilité opérationnelle de la plateforme :
                un trajet complété signifie que le conducteur a bien effectué le déplacement
                et qu'aucune annulation n'est survenue. Le taux d'annulation inclut les
                annulations volontaires (conducteur ou passager) et les expirations forcées
                par le système.
              </span>
            </p>
          </section>
        </div>
      )}

      {/* ================================================================== */}
      {/* ONGLET — MARKETING                                                  */}
      {/* ================================================================== */}
      {activeTab === "marketing" && (
        <div
          id="tabpanel-marketing"
          role="tabpanel"
          aria-labelledby="tab-marketing"
        >
          {/* KPIs utilisateurs */}
          <section className={shared.section}>
            <div className={shared.sectionHeader}>
              <h2 className={local.m0FlexCenterGap8}>
                <Users size={20} aria-hidden="true" />
                Base utilisateurs
              </h2>
            </div>

            <div className={shared.grid}>
              <KpiCard
                icon={<Users size={18} />}
                label="Total utilisateurs"
                value={marketingKpis.totalUsersLabel}
                helper="Hors comptes administrateurs"
              />
              <KpiCard
                icon={<CreditCard size={18} />}
                label="Conducteurs actifs"
                value={marketingKpis.driversLabel}
                helper="KYC validé, véhicule actif"
                accentColor="#4db8ff"
              />
              <KpiCard
                icon={<Users size={18} />}
                label="Passagers"
                value={marketingKpis.passengersLabel}
                helper="Sans profil conducteur validé"
                accentColor="var(--color-success)"
              />
            </div>

            {/* Avertissement UTM */}
            <div
              className={`${shared.notice} ${local.backgroundRgba25520871008BorderColorRgba2552087102WarningFle}`}

            >
              <AlertTriangle size={16} className={local.mt2Shrink0} aria-hidden="true" />
              <span>
                <strong>Données de conversion et d'acquisition :</strong> les métriques
                d'acquisition (canaux, UTM, entonnoir d'inscription) nécessitent un suivi UTM
                intégré côté application mobile et web. Ces données ne sont pas encore
                disponibles dans le back-office.
              </span>
            </div>
          </section>

          {/* Top conducteurs */}
          <section className={shared.section}>
            <div className={shared.sectionHeader}>
              <h2 className={local.m0}>Top 5 conducteurs par trajets complétés</h2>
            </div>

            {marketingKpis.topDrivers.length === 0 ? (
              <p className={shared.emptyState}>
                {dashboardFetching
                  ? "Chargement des conducteurs…"
                  : "Aucun conducteur avec des trajets complétés pour le moment."}
              </p>
            ) : (
              <div className={shared.tableWrapper}>
                <table className={shared.table}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Conducteur</th>
                      <th>Trajets complétés</th>
                      <th>Score activité</th>
                    </tr>
                  </thead>
                  <tbody>
                    {marketingKpis.topDrivers.map((driver, idx) => (
                      <tr key={driver.id}>
                        <td>
                          <span
                            className={shared.badge}
                            style={{
                              background:
                                idx === 0
                                  ? "rgba(255,208,71,0.2)"
                                  : "rgba(255,255,255,0.06)",
                              color:
                                idx === 0 ? "var(--color-warning)" : "var(--color-text-muted)",
                              fontWeight: 700,
                            }}
                          >
                            #{idx + 1}
                          </span>
                        </td>
                        <td>
                          <strong>{driver.name}</strong>
                        </td>
                        <td>
                          <span className={`${shared.badge} ${shared.badgeSuccess}`}>
                            {fmt(driver.completed)}
                          </span>
                        </td>
                        <td>{fmt(driver.score)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Aide marketing */}
          <section className={shared.section}>
            <p className={shared.helpText}>
              <Info size={16} aria-hidden="true" />
              <span>
                Le ratio conducteurs / passagers est un indicateur de tension de l'offre : un
                ratio faible (peu de conducteurs pour beaucoup de passagers) peut signifier des
                délais d'attente plus longs et une opportunité de recrutement conducteurs. Le
                score d'activité est calculé en combinant le nombre de trajets complétés et les
                sièges disponibles moyens.
              </span>
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
