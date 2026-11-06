"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleHelp,
  LifeBuoy,
  RefreshCw,
  ShieldCheck,
  Wallet,
} from "lucide-react";

import {
  BarList,
  CHART_COLORS,
  DonutChart,
  TrendChart,
} from "@/app/components/charts/Charts";
import type { MetricCard } from "@/lib/features/admin/types";
import { isMarketerRole } from "@/lib/features/auth/adminRoles";
import {
  useGetDashboardQuery,
  useGetMarketingStatsQuery,
} from "@/lib/features/dashboard/dashboardApi";
import { useGetCurrentUserProfileQuery } from "@/lib/features/profile/profileApi";
import { getApiErrorMessage, getApiErrorStatus } from "@/lib/utils/apiErrors";

import { Skeleton, SkeletonCards } from "@/app/components/ui/Skeleton";
import shared from "../styles/page.module.css";
import styles from "./dashboard.module.css";

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("fr-CD", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

const metricToneClass = (tone: MetricCard["tone"]) => {
  if (tone === "success") return styles.statusStable;
  if (tone === "warning") return styles.statusWatch;
  if (tone === "danger") return styles.statusCritical;
  return styles.statusNeutral;
};

const ALERT_SEVERITY_LABEL: Record<string, string> = {
  high: "Priorité haute",
  medium: "Priorité moyenne",
  low: "Priorité basse",
};

const formatCount = (value: number) =>
  new Intl.NumberFormat("fr-CD").format(Number.isFinite(value) ? value : 0);

const DashboardSkeleton = ({ label }: { label: string }) => (
  <div className={styles.page} aria-busy="true">
    <span className="sr-only" role="status">{label}</span>
    <Skeleton width="min(320px, 60%)" height={34} />
    <SkeletonCards count={4} height={72} />
    <SkeletonCards count={4} />
    <SkeletonCards count={2} height={300} />
  </div>
);

export default function DashboardPage() {
  const { data: profile, isLoading: isProfileLoading } = useGetCurrentUserProfileQuery();
  const marketer = isMarketerRole(profile?.user.role);
  const roleReady = Boolean(profile?.user.role);
  const marketing = useGetMarketingStatsQuery(undefined, { skip: !marketer });
  const { data, isLoading, error, refetch, isFetching } = useGetDashboardQuery(undefined, {
    skip: !roleReady || marketer,
  });

  if (!roleReady || isProfileLoading) {
    return (
<DashboardSkeleton label="Chargement du tableau de bord" />
    );
  }

  if (marketer) {
    if (marketing.error) {
      return (
        <div className={`${styles.stateCard} ${styles.stateError}`} role="alert">
          <h2>Les statistiques n’ont pas pu s’afficher</h2>
          <p>{getApiErrorMessage(marketing.error, "Impossible de charger les statistiques.")}</p>
          <button
            type="button"
            className={styles.stateButton}
            onClick={() => marketing.refetch()}
            disabled={marketing.isFetching}
          >
            <RefreshCw size={16} aria-hidden="true" />
            {marketing.isFetching ? "Nouvelle tentative..." : "Réessayer"}
          </button>
        </div>
      );
    }

    if (marketing.isLoading || !marketing.data) {
      return (
<DashboardSkeleton label="Chargement des statistiques" />
      );
    }

    const figures = [
      {
        id: "users",
        label: "Utilisateurs",
        value: marketing.data.users,
        helper: "Passagers et conducteurs",
      },
      {
        id: "trips",
        label: "Trajets",
        value: marketing.data.trips,
        helper: "Tous les trajets",
      },
      {
        id: "subscriptions",
        label: "Abonnements",
        value: marketing.data.subscriptions,
        helper: "Abonnements pro encore valides",
      },
      {
        id: "tripRequests",
        label: "Demandes de trajet",
        value: marketing.data.tripRequests,
        helper: "Toutes les demandes",
      },
    ];

    return (
      <div className={styles.page}>
        <div className={styles.hero}>
          <div>
            <h1>Statistiques</h1>
            <span>Vue d’ensemble de la plateforme</span>
          </div>
        </div>
        <section className={styles.metrics}>
          {figures.map((figure) => (
            <article key={figure.id} className={styles.metric}>
              <span>{figure.label}</span>
              <div className={styles.metricValue}>{formatCount(figure.value)}</div>
              <div className={`${styles.metricMeta} ${styles.statusNeutral}`}>
                <strong>{figure.helper}</strong>
              </div>
            </article>
          ))}
        </section>
      </div>
    );
  }

  if (error) {
    const errorStatus = getApiErrorStatus(error);
    const isPermissionIssue = errorStatus === 401 || errorStatus === 403;
    const errorMessage = getApiErrorMessage(
      error,
      isPermissionIssue
        ? "Le compte connecté n’a pas les droits admin nécessaires pour afficher le tableau de bord."
        : "Impossible de charger le tableau de bord depuis le backend."
    );

    return (
      <div className={`${styles.stateCard} ${styles.stateError}`} role="alert">
        <h2>Le tableau de bord n’a pas pu s’afficher</h2>
        <p>{errorMessage}</p>
        {isPermissionIssue ? (
          <p>Demandez à un super administrateur de vérifier vos droits.</p>
        ) : (
          <button
            type="button"
            className={styles.stateButton}
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw size={16} aria-hidden="true" />
            {isFetching ? "Nouvelle tentative..." : "Réessayer"}
          </button>
        )}
      </div>
    );
  }

  if (isLoading || !data) {
    return (
<DashboardSkeleton label="Chargement du tableau de bord" />
    );
  }

  const lifecycleColor: Record<string, string> = {
    upcoming: CHART_COLORS.blue,
    ongoing: CHART_COLORS.orange,
    completed: CHART_COLORS.green,
    cancelled: CHART_COLORS.red,
    expired: CHART_COLORS.grey,
  };

  const pendingFunding = data.paymentOverview.pendingFundingRequests;
  /* Courbes et classements reposent sur les trajets les plus recents: on le dit
     des que le serveur en compte davantage. */
  const sampleNote =
    data.tripSample.total !== null && data.tripSample.total > data.tripSample.loaded
      ? ` · calculé sur les ${formatCount(data.tripSample.loaded)} trajets les plus récents (sur ${formatCount(data.tripSample.total)})`
      : "";

  /* Ce que l'admin doit faire maintenant: un chiffre, un verbe, un lien. */
  const todo = [
    {
      id: "kyc",
      icon: ShieldCheck,
      count: data.queues.pendingKyc,
      title: "Identités à vérifier",
      hint: "Dossiers KYC en attente de décision",
      href: "/kyc",
      cta: "Vérifier",
    },
    {
      id: "funding",
      icon: Wallet,
      count: pendingFunding,
      title: "Demandes de financement",
      hint: "Documents conducteurs à approuver",
      href: "/subscriptions",
      cta: "Traiter",
    },
    {
      id: "reports",
      icon: AlertTriangle,
      count: data.queues.pendingReports,
      title: "Signalements à traiter",
      hint: "Incidents en attente de décision",
      href: "/reports",
      cta: "Examiner",
    },
    {
      id: "support",
      icon: LifeBuoy,
      count: data.queues.openSupportTickets,
      title: "Tickets support ouverts",
      hint: "Demandes sans prise en charge",
      href: "/support",
      cta: "Répondre",
    },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div>
          <h1>{data.greeting}</h1>
          <span>{data.dateRange}</span>
        </div>
        <button
          type="button"
          className={styles.stateButton}
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw size={16} aria-hidden="true" />
          {isFetching ? "Actualisation..." : "Actualiser"}
        </button>
      </div>

      <section aria-label="À traiter" className={styles.todoGrid}>
        {todo.map((item) => {
          const Icon = item.count === null ? CircleHelp : item.icon;
          const clear = item.count === 0;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`${styles.todo} ${clear ? styles.todoClear : styles.todoActive}`}
            >
              <span className={styles.todoIcon}>
                {clear ? <CheckCircle2 size={18} aria-hidden="true" /> : <Icon size={18} aria-hidden="true" />}
              </span>
              <span className={styles.todoText}>
                <strong>
                  {item.count === null
                    ? "Compteur indisponible"
                    : clear
                      ? "Rien à traiter"
                      : formatCount(item.count)}{" "}
                  · {item.title}
                </strong>
                <small>
                  {item.count === null
                    ? "Ouvrez la page pour vérifier la file"
                    : clear
                      ? `${item.title} : tout est à jour`
                      : item.hint}
                </small>
              </span>
              {clear ? null : (
                <span className={styles.todoCta}>
                  {item.cta} <ArrowRight size={14} aria-hidden="true" />
                </span>
              )}
            </Link>
          );
        })}
      </section>

      <section className={styles.metrics}>
        {data.metrics.slice(0, 4).map((metric) => (
          <article key={metric.id} className={styles.metric}>
            <span>{metric.label}</span>
            <div className={styles.metricValue}>{metric.value}</div>
            <div className={`${styles.metricMeta} ${metricToneClass(metric.tone)}`}>
              <strong>{metric.helper}</strong>
            </div>
          </article>
        ))}
      </section>

      <div className={styles.panels}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <strong>Activité des trajets</strong>
              <p className={styles.panelHint}>
                Trajets publiés et trajets terminés, jour par jour{sampleNote}
              </p>
            </div>
          </div>
          <TrendChart
            ariaLabel="Courbes des trajets publiés et terminés par jour."
            points={data.tripTrends.map((point) => ({
              label: point.label,
              values: [point.published, point.completed],
            }))}
            series={[
              { label: "Publiés", color: CHART_COLORS.orange },
              { label: "Terminés", color: CHART_COLORS.blue },
            ]}
          />
          <details>
            <summary className={styles.panelHint}>Voir les données</summary>
            <div className={shared.tableWrapper}>
              <table className={shared.table} style={{ minWidth: 0 }}>
                <thead>
                  <tr>
                    <th>Jour</th>
                    <th>Publiés</th>
                    <th>Terminés</th>
                  </tr>
                </thead>
                <tbody>
                  {data.tripTrends.map((point) => (
                    <tr key={point.label}>
                      <td>{point.label}</td>
                      <td>{formatCount(point.published)}</td>
                      <td>{formatCount(point.completed)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <strong>Où en sont les trajets</strong>
              <p className={styles.panelHint}>Répartition des trajets publiés{sampleNote}</p>
            </div>
          </div>
          <DonutChart
            centerLabel="trajets"
            ariaLabel="Répartition des trajets par état."
            slices={data.tripLifecycle.map((bucket) => ({
              label: bucket.label,
              value: bucket.count,
              color: lifecycleColor[bucket.key] ?? CHART_COLORS.grey,
              helper: bucket.helper,
            }))}
          />
        </section>
      </div>

      <div className={styles.panelsEven}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <strong>Trajets les plus publiés</strong>
              <p className={styles.panelHint}>Les 5 liaisons les plus demandées{sampleNote}</p>
            </div>
          </div>
          <BarList
            emptyLabel="Aucune liaison publiée pour le moment."
            items={data.popularRoutes.slice(0, 5).map((route) => ({
              label: route.route,
              value: route.total,
              valueLabel: `${formatCount(route.total)} publication${route.total > 1 ? "s" : ""}`,
              sub: `${route.completed} terminée${route.completed > 1 ? "s" : ""} · ${route.live} en cours${
                route.expired > 0 ? ` · ${route.expired} expirée${route.expired > 1 ? "s" : ""}` : ""
              }`,
            }))}
          />
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <strong>Conducteurs les plus actifs</strong>
              <p className={styles.panelHint}>Classés par nombre de trajets terminés{sampleNote}</p>
            </div>
          </div>
          <BarList
            emptyLabel="Pas encore assez de trajets terminés."
            items={data.topDrivers.slice(0, 5).map((driver) => ({
              label: driver.name,
              value: driver.completed,
              valueLabel: `${formatCount(driver.completed)} trajet${driver.completed > 1 ? "s" : ""}`,
            }))}
          />
        </section>
      </div>

      {data.alerts.length > 0 ? (
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <strong>Dernières alertes</strong>
              <p className={styles.panelHint}>Ce qui mérite l’attention de l’équipe</p>
            </div>
            <Link href="/reports" className={styles.panelLink}>
              Tout voir <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
          <div className={styles.alertsList}>
            {data.alerts.slice(0, 4).map((alert) => (
              <div key={alert.id} className={styles.alert}>
                <div>
                  <strong>{alert.message}</strong>
                  <p className={styles.panelHint}>{formatDateTime(alert.timestamp)}</p>
                </div>
                <span
                  className={`${styles.pill} ${
                    alert.severity === "high"
                      ? styles.statusCritical
                      : alert.severity === "medium"
                        ? styles.statusWatch
                        : styles.statusStable
                  }`}
                >
                  {ALERT_SEVERITY_LABEL[alert.severity] ?? alert.severity}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
