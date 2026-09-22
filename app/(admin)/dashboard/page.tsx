"use client";

import Link from "next/link";
import {
  CreditCard,
  FileText,
  RefreshCw,
  Route,
  ShieldCheck,
  Wallet,
} from "lucide-react";

import {
  formatDocumentType,
  formatFundingStatus,
  formatPaymentMethod,
  formatSubscriptionFeatureList,
  formatSubscriptionPlanLabel,
} from "@/lib/features/admin/insights";
import type {
  DocumentFundingRequest,
  KycDocument,
  MetricCard,
} from "@/lib/features/admin/types";
import { useGetDashboardQuery } from "@/lib/features/dashboard/dashboardApi";
import { getApiErrorMessage, getApiErrorStatus } from "@/lib/utils/apiErrors";

import styles from "./dashboard.module.css";

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("fr-CD", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

const formatCurrency = (value: number, currency: string) =>
  `${new Intl.NumberFormat("fr-CD", { maximumFractionDigits: 0 }).format(value)} ${currency}`;

const metricToneClass = (tone: MetricCard["tone"]) => {
  if (tone === "success") return styles.statusStable;
  if (tone === "warning") return styles.statusWatch;
  if (tone === "danger") return styles.statusCritical;
  return styles.statusNeutral;
};

const fundingStatusClass = (status: DocumentFundingRequest["status"]) => {
  if (status === "funded" || status === "approved") return styles.statusStable;
  if (status === "rejected" || status === "cancelled") return styles.statusCritical;
  return styles.statusWatch;
};

const kycStatusClass = (status: KycDocument["status"]) => {
  if (status === "approved") return styles.statusStable;
  if (status === "rejected") return styles.statusCritical;
  return styles.statusWatch;
};

// Les codes techniques du backend etaient affiches tels quels dans les pastilles.
const KYC_STATUS_LABEL: Record<KycDocument["status"], string> = {
  pending: "En attente",
  approved: "Validé",
  rejected: "Rejeté",
};

const ALERT_SEVERITY_LABEL: Record<string, string> = {
  high: "Priorité haute",
  medium: "Priorité moyenne",
  low: "Priorité basse",
};

export default function DashboardPage() {
  const { data, isLoading, error, refetch, isFetching } = useGetDashboardQuery();

  if (error) {
    const errorStatus = getApiErrorStatus(error);
    const isPermissionIssue = errorStatus === 401 || errorStatus === 403;
    const errorMessage = getApiErrorMessage(
      error,
      isPermissionIssue
        ? "Le compte connecte n'a pas les droits admin necessaires pour afficher le tableau de bord."
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
      <div className={styles.stateCard} aria-busy="true">
        <h2>Chargement du tableau de bord</h2>
        <p>Les chiffres arrivent, cela prend quelques secondes.</p>
      </div>
    );
  }

  const maxTripTrendValue = Math.max(
    1,
    ...data.tripTrends.map((point) => Math.max(point.published, point.completed))
  );

  const toPoints = (key: "published" | "completed") =>
    data.tripTrends
      .map((point, index, array) => {
        const x = array.length === 1 ? 50 : (index / (array.length - 1)) * 100;
        const y = 100 - (point[key] / maxTripTrendValue) * 100;
        return `${x},${y}`;
      })
      .join(" ");

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div>
          <h1>{data.greeting}</h1>
          <span>{data.dateRange}</span>
        </div>
        {/* Le bouton precedent n'etait relie a aucune action: il mene
            maintenant a l'ecran qui contient reellement les signalements. */}
        <Link href="/reports" className={styles.stateButton}>
          <FileText size={16} aria-hidden="true" />
          Voir les signalements
        </Link>
      </div>

      <section className={styles.metrics}>
        {data.metrics.map((metric) => (
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
              <strong>Flux de publication</strong>
              <p className={styles.panelHint}>Publies vs termines sur les 7 derniers jours</p>
            </div>
          </div>
          <svg
            viewBox="0 0 100 100"
            className={styles.chart}
            role="img"
            aria-label="Courbes des trajets publiés et terminés sur les 7 derniers jours. Les chiffres jour par jour sont listés juste en dessous."
          >
            <polyline
              fill="none"
              stroke="#ffb347"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={toPoints("published")}
            />
            <polyline
              fill="none"
              stroke="#3dd598"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={toPoints("completed")}
            />
          </svg>
          <div className={styles.legend}>
            <span className={styles.pill}>Publies</span>
            <span className={`${styles.pill} ${styles.statusStable}`}>Termines</span>
          </div>
          <div className={styles.timeline}>
            {data.tripTrends.map((point) => (
              <div key={point.label} className={styles.timelineItem}>
                <strong>{point.label}</strong>
                <span>
                  {point.published} publies - {point.completed} termines
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <strong>Trajets publies</strong>
              <p className={styles.panelHint}>
                Où en sont les trajets publiés, du départ à venir jusqu’à la
                clôture
              </p>
            </div>
            <Route size={16} aria-hidden="true" />
          </div>
          <div className={styles.lifecycleGrid}>
            {data.tripLifecycle.map((bucket) => (
              <div key={bucket.key} className={styles.lifecycleCard}>
                <span className={styles.pill}>{bucket.label}</span>
                <strong>{bucket.count}</strong>
                <small>{bucket.helper}</small>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className={styles.panels}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <strong>Abonnements premium</strong>
              <p className={styles.panelHint}>
                Formules proposées aux conducteurs et leur tarif
              </p>
            </div>
            <CreditCard size={16} aria-hidden="true" />
          </div>

          <div className={styles.planList}>
            {data.subscriptionPlans.length === 0 ? (
              <p className={styles.emptyState}>Aucun plan premium n'a ete retourne.</p>
            ) : (
              data.subscriptionPlans.map((plan) => (
                <article key={`${plan.plan}-${plan.currency}`} className={styles.planCard}>
                  <div className={styles.planHeader}>
                    <div>
                      <span className={styles.pill}>
                        {formatSubscriptionPlanLabel(plan.plan)}
                      </span>
                      <strong>{formatCurrency(plan.amount, plan.currency)}</strong>
                    </div>
                    <span className={styles.pill}>
                      {plan.paymentMethods.length} moyen(x) de paiement
                    </span>
                  </div>

                  <div className={styles.featureList}>
                    {formatSubscriptionFeatureList(plan).map((feature) => (
                      <span key={feature} className={styles.pill}>
                        {feature}
                      </span>
                    ))}
                    {plan.documentFundingEnabled ? (
                      <span className={`${styles.pill} ${styles.statusWatch}`}>
                        plafond{" "}
                        {formatCurrency(
                          plan.documentFundingLimit ?? 0,
                          plan.documentFundingCurrency
                        )}
                      </span>
                    ) : null}
                  </div>

                  <small className={styles.panelHint}>
                    Paiements: {plan.paymentMethods.map(formatPaymentMethod).join(", ")}
                  </small>
                </article>
              ))
            )}
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <strong>Paiements et financement</strong>
              <p className={styles.panelHint}>
                Demandes de financement de documents et montants en jeu
              </p>
            </div>
            <Wallet size={16} aria-hidden="true" />
          </div>

          <div className={styles.paymentStats}>
            <div className={styles.statCard}>
              <span>En attente</span>
              <strong>{data.paymentOverview.pendingFundingRequests}</strong>
            </div>
            <div className={styles.statCard}>
              <span>Approuvees</span>
              <strong>{data.paymentOverview.approvedFundingRequests}</strong>
            </div>
            <div className={styles.statCard}>
              <span>Financees</span>
              <strong>{data.paymentOverview.fundedRequests}</strong>
            </div>
            <div className={styles.statCard}>
              <span>Rejetees</span>
              <strong>{data.paymentOverview.rejectedRequests}</strong>
            </div>
          </div>

          <div className={styles.paymentBreakdown}>
            <div>
              <strong>Montant demande</strong>
              <p>
                {formatCurrency(
                  data.paymentOverview.totalRequestedAmount,
                  data.paymentOverview.supportedCurrencies[0] ?? "CDF"
                )}
              </p>
            </div>
            <div>
              <strong>A traiter</strong>
              <p>
                {formatCurrency(
                  data.paymentOverview.pendingAmount,
                  data.paymentOverview.supportedCurrencies[0] ?? "CDF"
                )}
              </p>
            </div>
            <div>
              <strong>Moyens actifs</strong>
              <div className={styles.featureList}>
                {data.paymentOverview.supportedMethods.map((method) => (
                  <span key={method} className={styles.pill}>
                    {formatPaymentMethod(method)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className={styles.panels}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <strong>Routes les plus publiees</strong>
              <p className={styles.panelHint}>Volume total et etat de diffusion</p>
            </div>
          </div>
          <div className={styles.routeList}>
            {data.popularRoutes.map((route) => (
              <div key={route.id} className={styles.routeItem}>
                <div>
                  <strong>{route.route}</strong>
                  <p className={styles.panelHint}>
                    {route.total} publication(s) - {route.live} en cours - {route.completed}{" "}
                    terminees
                  </p>
                </div>
                {route.expired > 0 ? (
                  <span className={`${styles.pill} ${styles.statusWatch}`}>
                    {route.expired} expire(s)
                  </span>
                ) : (
                  <span className={`${styles.pill} ${styles.statusStable}`}>stable</span>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <strong>Demandes recentes</strong>
              <p className={styles.panelHint}>Financement de documents conducteurs</p>
            </div>
          </div>
          <div className={styles.requestList}>
            {data.recentFundingRequests.length === 0 ? (
              <p className={styles.emptyState}>Aucune demande recente.</p>
            ) : (
              data.recentFundingRequests.map((request) => (
                <div key={request.id} className={styles.requestItem}>
                  <strong>
                    {request.driver
                      ? `${request.driver.firstName} ${request.driver.lastName}`
                      : "Conducteur inconnu"}
                  </strong>
                  <span>{formatDocumentType(request.documentType)}</span>
                  <div className={styles.inlineMeta}>
                    <span className={`${styles.pill} ${fundingStatusClass(request.status)}`}>
                      {formatFundingStatus(request.status)}
                    </span>
                    <span className={styles.pill}>
                      {formatCurrency(Number(request.amountRequested ?? 0), request.currency)}
                    </span>
                    <span className={styles.pill}>{formatDateTime(request.createdAt)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <div className={styles.panels}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <strong>Alertes en cours</strong>
              <p className={styles.panelHint}>Priorites a traiter par l'equipe admin</p>
            </div>
          </div>
          <div className={styles.alertsList}>
            {data.alerts.map((alert) => (
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

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <strong>Top chauffeurs</strong>
              <p className={styles.panelHint}>Classement base sur les trajets completes</p>
            </div>
          </div>
          <div className={styles.drivers}>
            {data.topDrivers.length === 0 ? (
              <p className={styles.emptyState}>Pas encore assez de trajets completes.</p>
            ) : (
              data.topDrivers.map((driver) => (
                <div key={driver.id} className={styles.driver}>
                  <div>
                    <strong>{driver.name}</strong>
                    <p className={styles.panelHint}>
                      {driver.completed} trajets - note estimee {driver.rating.toFixed(2)}
                    </p>
                  </div>
                  <span className={styles.pill}>{driver.score} pts</span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <div className={styles.panels}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <strong>Queue KYC prioritaire</strong>
              <p className={styles.panelHint}>
                Pièces d’identité à contrôler dans l’onglet KYC
              </p>
            </div>
            <ShieldCheck size={16} aria-hidden="true" />
          </div>
          <div className={styles.kycList}>
            {data.kycQueueShortlist.length === 0 ? (
              <p className={styles.emptyState}>Aucun dossier KYC prioritaire.</p>
            ) : (
              data.kycQueueShortlist.map((request) => (
                <div key={request.id} className={styles.kycItem}>
                  <strong>
                    {request.user
                      ? `${request.user.firstName} ${request.user.lastName}`
                      : "Utilisateur inconnu"}
                  </strong>
                  <span>{request.user?.email ?? request.user?.phone ?? "—"}</span>
                  <div className={styles.inlineMeta}>
                    <span className={`${styles.pill} ${kycStatusClass(request.status)}`}>
                      {KYC_STATUS_LABEL[request.status] ?? request.status}
                    </span>
                    <span className={styles.pill}>Cree {formatDateTime(request.createdAt)}</span>
                    {request.reviewedBy ? (
                      <span className={styles.pill}>Revu par {request.reviewedBy}</span>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
