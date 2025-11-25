"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  FileText,
} from "lucide-react";

import { useGetDashboardQuery } from "@/lib/features/dashboard/dashboardApi";
import type { KycDocument, MetricCard } from "@/lib/features/admin/types";

import styles from "./dashboard.module.css";

const TrendIcon = ({ trend }: { trend: MetricCard["trend"] }) => {
  if (trend === "down") return <ArrowDownRight size={14} aria-hidden="true" />;
  return <ArrowUpRight size={14} aria-hidden="true" />;
};

const formatKycDate = (value: string) =>
  new Intl.DateTimeFormat("fr-CD", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

const kycStatusClass = (status: KycDocument["status"]) => {
  if (status === "approved") return styles.statusStable;
  if (status === "rejected") return styles.statusCritical;
  return styles.statusWatch;
};

export default function DashboardPage() {
  const { data, isLoading } = useGetDashboardQuery();

  if (isLoading || !data) {
    return <p>Chargement du tableau de bord...</p>;
  }

  const maxRideValue = Math.max(
    ...data.rideTrends.map((point) =>
      Math.max(point.completed, point.cancelled)
    )
  );

  const toPoints = (key: "completed" | "cancelled") => {
    return data.rideTrends
      .map((point, index, array) => {
        const x = (index / (array.length - 1)) * 100;
        const y = 100 - (point[key] / maxRideValue) * 100;
        return `${x},${y}`;
      })
      .join(" ");
  };

  const maxSubscribers = Math.max(
    ...data.subscriptionHealth.map((plan) => plan.users)
  );

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div>
          <h1>{data.greeting}</h1>
          <span>{data.dateRange}</span>
        </div>
        <button type="button" className={styles.delta}>
          <FileText size={16} aria-hidden="true" />
          Exporter le rapport
        </button>
      </div>

      <section className={styles.metrics}>
        {data.metrics.map((metric) => (
          <article key={metric.id} className={styles.metric}>
            <span>{metric.label}</span>
            <div className={styles.metricValue}>{metric.value}</div>
            <div className={`${styles.delta} ${styles[metric.trend]}`}>
              <TrendIcon trend={metric.trend} />
              <strong>
                {metric.delta > 0 ? `+${metric.delta}%` : `${metric.delta}%`}
              </strong>
              <span>{metric.helper}</span>
            </div>
          </article>
        ))}
      </section>

      <div className={styles.panels}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <strong>Flux trajets</strong>
              <p style={{ margin: 0, color: "var(--color-text-muted)" }}>
                Complétés vs annulés (7 derniers mois)
              </p>
            </div>
          </div>
          <svg viewBox="0 0 100 100" className={styles.chart} role="img">
            <polyline
              fill="none"
              stroke="#3dd598"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={toPoints("completed")}
            />
            <polyline
              fill="none"
              stroke="#ff4b55"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={toPoints("cancelled")}
            />
          </svg>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            {data.rideTrends.map((point) => (
              <span key={point.month} className={styles.pill}>
                {point.month}
              </span>
            ))}
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <strong>Plans & abonnements</strong>
            <span style={{ color: "var(--color-text-muted)" }}>ARPU</span>
          </div>
          <div className={styles.subscriptions}>
            {data.subscriptionHealth.map((plan) => (
              <div key={plan.plan} className={styles.subscriptionRow}>
                <span>{plan.plan}</span>
                <div className={styles.subscriptionBar}>
                  <div
                    className={styles.subscriptionFill}
                    style={{
                      width: `${(plan.users / maxSubscribers) * 100}%`,
                    }}
                  />
                </div>
                <strong>{plan.arpu} $</strong>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className={styles.panels}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <strong>Zones actives Kinshasa</strong>
            <span style={{ color: "var(--color-text-muted)" }}>
              Occupation
            </span>
          </div>
          <div className={styles.zones}>
            {data.activeZones.map((zone) => (
              <div key={zone.id} className={styles.zone}>
                <div>
                  <strong>{zone.name}</strong>
                  <p style={{ margin: 0, color: "var(--color-text-muted)" }}>
                    {zone.rides} trajets aujourd&apos;hui
                  </p>
                </div>
                <div>
                  <span
                    className={`${styles.pill} ${
                      zone.status === "critical"
                        ? styles.statusCritical
                        : zone.status === "watch"
                          ? styles.statusWatch
                          : styles.statusStable
                    }`}
                  >
                    {zone.occupancy}% • {zone.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <strong>Alertes en cours</strong>
            <span style={{ color: "var(--color-text-muted)" }}>
              Sévérité
            </span>
          </div>
          <div className={styles.alertsList}>
            {data.alerts.map((alert) => (
              <div key={alert.id} className={styles.alert}>
                <div>
                  <strong>{alert.message}</strong>
                  <p style={{ margin: 0, color: "var(--color-text-muted)" }}>
                    {new Intl.DateTimeFormat("fr-CD", {
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(alert.timestamp))}
                  </p>
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
                  {alert.severity}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className={styles.panels}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <strong>Top chauffeurs</strong>
            <span style={{ color: "var(--color-text-muted)" }}>
              Score & avis
            </span>
          </div>
          <div className={styles.drivers}>
            {data.topDrivers.map((driver) => (
              <div key={driver.id} className={styles.driver}>
                <div>
                  <strong>{driver.name}</strong>
                  <p style={{ margin: 0, color: "var(--color-text-muted)" }}>
                    {driver.completed} trajets • {driver.rating.toFixed(2)} ★
                  </p>
                </div>
                <span className={styles.pill}>{driver.score} pts</span>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <strong>Queue KYC prioritaire</strong>
            <span style={{ color: "var(--color-text-muted)" }}>
              {data.kycQueueShortlist.length} dossiers
            </span>
          </div>
          <div className={styles.kycList}>
            {data.kycQueueShortlist.map((request) => (
              <div key={request.id} className={styles.kycItem}>
                <strong>
                  {request.user.firstName} {request.user.lastName}
                </strong>
                <span>{request.user.email ?? request.user.phone}</span>
                <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span className={`${styles.pill} ${kycStatusClass(request.status)}`}>
                    {request.status}
                  </span>
                  <span className={styles.pill}>
                    Créé {formatKycDate(request.createdAt)}
                  </span>
                  {request.reviewedBy ? (
                    <span className={styles.pill}>
                      Revu par {request.reviewedBy}
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

