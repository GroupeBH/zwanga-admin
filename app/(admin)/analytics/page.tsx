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

import { useGetAllTripsQuery } from "@/lib/features/trips/tripsApi";
import { useGetUsersQuery } from "@/lib/features/users/usersApi";
import { useGetDashboardQuery } from "@/lib/features/dashboard/dashboardApi";
import { useGetReportsQuery } from "@/lib/features/reports/reportsApi";

import shared from "../styles/page.module.css";

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

// ---------------------------------------------------------------------------
// Sous-composant — Graphique SVG polyline (tendance des trajets)
// ---------------------------------------------------------------------------

interface TrendPoint {
  label: string;
  published: number;
  completed: number;
}

interface TrendChartProps {
  data: TrendPoint[];
}

/**
 * Graphique SVG minimaliste à deux polylines :
 *  - orange (#ff7a00) = trajets publiés
 *  - vert (#3dd598)   = trajets complétés
 * Identique au style du dashboard existant.
 */
function TrendChart({ data }: TrendChartProps) {
  const W = 100;
  const H = 60;
  const PAD = 6;

  // Calcul de l'échelle Y
  const maxVal = Math.max(...data.flatMap((d) => [d.published, d.completed]), 1);

  const toX = (i: number): number =>
    PAD + (i / Math.max(data.length - 1, 1)) * (W - PAD * 2);
  const toY = (v: number): number =>
    H - PAD - ((v / maxVal) * (H - PAD * 2));

  const buildPoints = (key: "published" | "completed"): string =>
    data.map((d, i) => `${toX(i)},${toY(d[key])}`).join(" ");

  if (data.length === 0) {
    return (
      <p className={shared.emptyState} style={{ textAlign: "center", padding: "32px 0" }}>
        Aucune donnée de tendance disponible.
      </p>
    );
  }

  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      {/* Légende */}
      <div
        style={{
          display: "flex",
          gap: 20,
          marginBottom: 10,
          flexWrap: "wrap",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.82rem" }}>
          <span
            style={{ width: 16, height: 3, background: "#ff7a00", borderRadius: 2, display: "inline-block" }}
          />
          Publiés
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.82rem" }}>
          <span
            style={{ width: 16, height: 3, background: "#3dd598", borderRadius: 2, display: "inline-block" }}
          />
          Complétés
        </span>
      </div>

      {/* SVG principal */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`Tendance des trajets sur ${data.length} jours : publiés (orange) et complétés (vert)`}
        style={{
          width: "100%",
          height: 140,
          display: "block",
        }}
      >
        <title>Tendance des trajets sur 7 jours</title>

        {/* Grille horizontale discrète */}
        {[0.25, 0.5, 0.75].map((ratio) => (
          <line
            key={ratio}
            x1={PAD}
            y1={PAD + ratio * (H - PAD * 2)}
            x2={W - PAD}
            y2={PAD + ratio * (H - PAD * 2)}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={0.5}
          />
        ))}

        {/* Zone remplie sous la courbe « publiés » */}
        <polygon
          points={`${buildPoints("published")} ${toX(data.length - 1)},${H - PAD} ${toX(0)},${H - PAD}`}
          fill="rgba(255,122,0,0.08)"
        />

        {/* Polyline publiés */}
        <polyline
          points={buildPoints("published")}
          fill="none"
          stroke="#ff7a00"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Zone remplie sous la courbe « complétés » */}
        <polygon
          points={`${buildPoints("completed")} ${toX(data.length - 1)},${H - PAD} ${toX(0)},${H - PAD}`}
          fill="rgba(61,213,152,0.08)"
        />

        {/* Polyline complétés */}
        <polyline
          points={buildPoints("completed")}
          fill="none"
          stroke="#3dd598"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Points de données publiés */}
        {data.map((d, i) => (
          <circle
            key={`pub-${i}`}
            cx={toX(i)}
            cy={toY(d.published)}
            r={1.8}
            fill="#ff7a00"
          />
        ))}

        {/* Points de données complétés */}
        {data.map((d, i) => (
          <circle
            key={`comp-${i}`}
            cx={toX(i)}
            cy={toY(d.completed)}
            r={1.8}
            fill="#3dd598"
          />
        ))}
      </svg>

      {/* Labels de l'axe X */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 4,
          paddingInline: `${(PAD / W) * 100}%`,
        }}
      >
        {data.map((d, i) => (
          <span
            key={i}
            style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", textAlign: "center" }}
          >
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sous-composant — Pie chart SVG (répartition des motifs de signalement)
// ---------------------------------------------------------------------------

interface PieSlice {
  label: string;
  count: number;
  color: string;
}

interface PieChartProps {
  slices: PieSlice[];
}

/** Génère un arc SVG décrit par startAngle et sweepAngle (en radians). */
function arcPath(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  sweepAngle: number
): string {
  if (sweepAngle >= 2 * Math.PI) {
    // Cercle complet
    return `M ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx + r - 0.001} ${cy} Z`;
  }
  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy + r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(startAngle + sweepAngle);
  const y2 = cy + r * Math.sin(startAngle + sweepAngle);
  const large = sweepAngle > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
}

function PieChart({ slices }: PieChartProps) {
  const total = slices.reduce((sum, s) => sum + s.count, 0);

  if (total === 0 || slices.length === 0) {
    return (
      <p className={shared.emptyState} style={{ textAlign: "center", padding: "32px 0" }}>
        Aucune donnée de signalement disponible.
      </p>
    );
  }

  const CX = 50;
  const CY = 50;
  const R = 38;

  let currentAngle = -Math.PI / 2; // Commence à midi

  return (
    <div
      style={{
        display: "flex",
        gap: 24,
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      {/* Disque SVG */}
      <svg
        viewBox="0 0 100 100"
        role="img"
        aria-label={`Répartition des ${total} signalement(s) par motif`}
        style={{ width: 160, height: 160, flexShrink: 0 }}
      >
        <title>Répartition des signalements par motif</title>
        {slices.map((slice) => {
          const sweep = (slice.count / total) * 2 * Math.PI;
          const path = arcPath(CX, CY, R, currentAngle, sweep);
          currentAngle += sweep;
          return (
            <path
              key={slice.label}
              d={path}
              fill={slice.color}
              stroke="var(--color-surface)"
              strokeWidth={0.8}
            >
              <title>
                {slice.label} : {slice.count} ({pct(slice.count, total)})
              </title>
            </path>
          );
        })}
        {/* Trou central pour effet donut */}
        <circle cx={CX} cy={CY} r={18} fill="var(--color-surface)" />
        {/* Total au centre */}
        <text
          x={CX}
          y={CY + 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="var(--color-text)"
          fontSize="10"
          fontWeight="600"
        >
          {total}
        </text>
      </svg>

      {/* Légende */}
      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {slices.map((slice) => (
          <li
            key={slice.label}
            style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "0.86rem" }}
          >
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: slice.color,
                flexShrink: 0,
              }}
            />
            <span>
              {slice.label}{" "}
              <span style={{ color: "var(--color-text-muted)" }}>
                ({slice.count} — {pct(slice.count, total)})
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
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
    <div className={shared.card} style={{ gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: accentColor }}>{icon}</span>
        <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", fontWeight: 600 }}>
          {label}
        </span>
      </div>
      <p style={{ margin: 0, fontSize: "1.6rem", fontWeight: 700, lineHeight: 1 }}>
        {value}
      </p>
      {helper && (
        <p className={shared.mutedText} style={{ fontSize: "0.78rem" }}>
          {helper}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Composant principal
// ---------------------------------------------------------------------------

/** Couleurs pour les segments du pie chart des signalements. */
const PIE_COLORS = ["#ff7a00", "#3dd598", "#4db8ff", "#ffd047", "#ff4b55", "#b67aff"];

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
  const reportReasonSlices = useMemo<PieSlice[]>(() => {
    const reports = allReportsData?.reports ?? [];
    const counts: Record<string, number> = {};

    for (const report of reports) {
      counts[report.reason] = (counts[report.reason] ?? 0) + 1;
    }

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([reason, count], idx) => ({
        label: REASON_LABELS[reason] ?? reason,
        count,
        color: PIE_COLORS[idx % PIE_COLORS.length],
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
            <h1 style={{ margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
              <BarChart2 size={26} aria-hidden="true" />
              Analytics &amp; Business Intelligence
            </h1>
            <p className={shared.mutedText} style={{ marginTop: 4 }}>
              Rapport agrégé en temps réel depuis les données de la plateforme Zwanga.
            </p>
          </div>

          {/* Bouton Export CSV global (onglet actif) */}
          <button
            type="button"
            className={shared.primaryButton}
            onClick={handleExportCsv}
            disabled={isLoading}
            style={{ gap: 8 }}
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
            utilisateurs, signalements). Aucune donnée n'est stockée dans ce module : chaque
            rechargement reflète l'état courant. L'export CSV produit un fichier adapté à Excel
            ou Google Sheets.
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
        style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
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
              <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                <TrendingUp size={20} aria-hidden="true" />
                KPIs Trajets
              </h2>
              {isLoading && (
                <span className={shared.mutedText} style={{ fontSize: "0.82rem" }}>
                  Chargement…
                </span>
              )}
            </div>

            <div className={shared.grid}>
              <KpiCard
                icon={<Route size={18} />}
                label="Total trajets publiés"
                value={fmt(operationalKpis.total)}
                helper="Tous statuts confondus"
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
                accentColor="#4db8ff"
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
              <h2 style={{ margin: 0 }}>Tendance des trajets — 7 derniers jours</h2>
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
              <TrendChart data={trendData} />
            )}
          </section>

          {/* Routes populaires */}
          <section className={shared.section}>
            <div className={shared.sectionHeader}>
              <h2 style={{ margin: 0 }}>Routes populaires</h2>
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
              <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
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
              <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
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
            <div style={{ marginTop: 8 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: "0.95rem" }}>
                Répartition par motif de signalement
              </h3>
              <PieChart slices={reportReasonSlices} />
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
              <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
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
              className={shared.notice}
              style={{
                background: "rgba(255, 208, 71, 0.08)",
                borderColor: "rgba(255, 208, 71, 0.2)",
                color: "var(--color-warning)",
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
                borderRadius: 14,
                padding: "12px 14px",
                fontSize: "0.86rem",
              }}
            >
              <AlertTriangle size={16} style={{ marginTop: 2, flexShrink: 0 }} aria-hidden="true" />
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
              <h2 style={{ margin: 0 }}>Top 5 conducteurs par trajets complétés</h2>
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
