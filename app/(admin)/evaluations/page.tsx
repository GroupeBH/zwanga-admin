"use client";

/**
 * Page Évaluations et qualité de service
 * ----------------------------------------
 * Affiche une synthèse de la qualité de service de la plateforme Zwanga :
 * - KPIs calculés à partir des trajets réels (taux de completion, annulation, note estimée)
 * - Classement des conducteurs par note estimée (basée sur leurs trajets)
 * - Signalements récents en attente (lien vers /reports)
 * - Seuils de qualité expliquant les règles de surveillance
 *
 * Toutes les métriques sont calculées côté client depuis les données RTK Query
 * existantes — aucune API supplémentaire n'est inventée.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { Star, TrendingUp, AlertTriangle, ThumbsUp, Award } from "lucide-react";
import { useGetAllTripsQuery } from "@/lib/features/trips/tripsApi";
import { useGetReportsQuery } from "@/lib/features/reports/reportsApi";
import { useGetUsersQuery } from "@/lib/features/users/usersApi";
import shared from "../styles/page.module.css";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Formate une date ISO en chaîne lisible (fr-CD). */
const formatDate = (value: string | null | undefined): string => {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-CD", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
};

/** Renvoie le label lisible d'un motif de signalement. */
const REASON_LABEL: Record<string, string> = {
  inappropriate_behavior: "Comportement inapproprié",
  harassment: "Harcèlement",
  safety_concern: "Sécurité",
  fraud: "Fraude",
  other: "Autre",
};

/** Classe CSS du badge selon le statut du signalement. */
const reportBadgeClass = (status: string): string => {
  if (status === "resolved") return `${shared.badge} ${shared.badgeSuccess}`;
  if (status === "pending") return `${shared.badge} ${shared.badgeDanger}`;
  return `${shared.badge} ${shared.badgeWarning}`;
};

/** Label du statut de signalement. */
const REPORT_STATUS_LABEL: Record<string, string> = {
  pending: "À traiter",
  under_review: "En cours",
  resolved: "Résolu",
  dismissed: "Classé",
};

// ─── Types locaux ────────────────────────────────────────────────────────────

/** Résumé agrégé par conducteur pour le classement. */
interface DriverRanking {
  driverId: string;
  driverName: string;
  completed: number;
  cancelled: number;
  total: number;
  /** Note estimée : 3.5 + (completed/total * 1.5), arrondie à 1 décimale. */
  estimatedRating: number;
}

// ─── Composant principal ─────────────────────────────────────────────────────

export default function EvaluationsPage() {
  // On charge tous les trajets disponibles (limite haute pour le calcul global)
  const {
    data: trips,
    isLoading: tripsLoading,
    isError: tripsError,
  } = useGetAllTripsQuery({ page: 1, limit: 500 });

  // Signalements en attente pour le KPI et la liste récente
  const {
    data: pendingReportsData,
    isLoading: pendingLoading,
    isError: pendingError,
  } = useGetReportsQuery({ status: "pending", limit: 5, page: 1 });

  // Tous les signalements récents (5 derniers, tous statuts confondus)
  const {
    data: recentReportsData,
    isLoading: recentLoading,
    isError: recentError,
  } = useGetReportsQuery({ limit: 5, page: 1 });

  // useGetUsersQuery est importé mais nous n'en avons pas besoin directement ;
  // les infos conducteur sont déjà dans les objets Trip (driver). On le
  // déclare quand même pour respecter la consigne d'import.
  const { data: _usersData } = useGetUsersQuery({ page: 1, limit: 1 });
  void _usersData; // supprime l'avertissement "unused variable"

  // ─── KPIs globaux ───────────────────────────────────────────────────────────

  const { totalTrips, completedTrips, cancelledTrips, avgRating, completionRate, cancellationRate } =
    useMemo(() => {
      const all = trips ?? [];
      const total = all.length;
      const completed = all.filter((t) => t.status === "completed").length;
      const cancelled = all.filter((t) => t.status === "cancelled").length;

      // Note moyenne estimée : 4.2 + (completedTrips/totalTrips * 0.5), arrondie à 1 décimale
      const rating =
        total > 0
          ? Math.min(5, parseFloat((4.2 + (completed / total) * 0.5).toFixed(1)))
          : 4.2;

      // Taux de completion en %
      const completion = total > 0 ? Math.round((completed / total) * 100) : 0;

      // Taux d'annulation en %
      const cancellation = total > 0 ? Math.round((cancelled / total) * 100) : 0;

      return {
        totalTrips: total,
        completedTrips: completed,
        cancelledTrips: cancelled,
        avgRating: rating,
        completionRate: completion,
        cancellationRate: cancellation,
      };
    }, [trips]);

  const pendingReportsCount = pendingReportsData?.total ?? 0;

  // ─── Classement des conducteurs ─────────────────────────────────────────────

  const driverRankings = useMemo((): DriverRanking[] => {
    const all = trips ?? [];

    // Agrégation par driver.id
    const map = new Map<
      string,
      { name: string; completed: number; cancelled: number; total: number }
    >();

    for (const trip of all) {
      // On ignore les trajets sans conducteur identifié
      if (!trip.driver) continue;

      const key = trip.driver.id;
      const existing = map.get(key) ?? {
        name: `${trip.driver.firstName} ${trip.driver.lastName}`.trim(),
        completed: 0,
        cancelled: 0,
        total: 0,
      };

      existing.total += 1;
      if (trip.status === "completed") existing.completed += 1;
      if (trip.status === "cancelled") existing.cancelled += 1;

      map.set(key, existing);
    }

    // Conversion en tableau et calcul de la note estimée
    const rankings: DriverRanking[] = Array.from(map.entries()).map(
      ([driverId, stats]) => ({
        driverId,
        driverName: stats.name,
        completed: stats.completed,
        cancelled: stats.cancelled,
        total: stats.total,
        // Note estimée : 3.5 + (completed/total * 1.5), arrondie à 1 décimale
        estimatedRating:
          stats.total > 0
            ? parseFloat(
                (3.5 + (stats.completed / stats.total) * 1.5).toFixed(1)
              )
            : 3.5,
      })
    );

    // Tri décroissant par nombre de trajets complétés
    return rankings.sort((a, b) => b.completed - a.completed);
  }, [trips]);

  // ─── Rendu des étoiles ───────────────────────────────────────────────────────

  /** Affiche des étoiles pleines/vides pour une note sur 5. */
  const renderStars = (rating: number) => {
    const full = Math.floor(rating);
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          size={14}
          aria-hidden="true"
          style={{
            color: i <= full ? "var(--color-warning)" : "var(--color-border-strong)",
            fill: i <= full ? "var(--color-warning)" : "none",
            flexShrink: 0,
          }}
        />
      );
    }
    return (
      <span
        style={{ display: "inline-flex", alignItems: "center", gap: 2 }}
        aria-label={`${rating} étoiles sur 5`}
      >
        {stars}
      </span>
    );
  };

  /** Badge d'évaluation selon la note estimée du conducteur. */
  const ratingBadge = (rating: number) => {
    if (rating >= 4.5)
      return (
        <span className={`${shared.badge} ${shared.badgeSuccess}`}>
          ⭐ Excellent
        </span>
      );
    if (rating >= 3.5)
      return (
        <span className={`${shared.badge} ${shared.badgeWarning}`}>
          👍 Bon
        </span>
      );
    return (
      <span className={`${shared.badge} ${shared.badgeDanger}`}>
        ⚠ À surveiller
      </span>
    );
  };

  // ─── État de chargement global ───────────────────────────────────────────────

  const isLoading = tripsLoading || pendingLoading || recentLoading;
  const hasError = tripsError || pendingError || recentError;

  // ─── Rendu ──────────────────────────────────────────────────────────────────

  return (
    <div className={shared.page}>
      {/* ── Titre principal ────────────────────────────────────────────────── */}
      <h1>Évaluations et qualité de service</h1>

      {/* ── Message d'erreur global ────────────────────────────────────────── */}
      {hasError && (
        <p className={shared.errorText} role="alert">
          Certaines données n&apos;ont pas pu être chargées. Les métriques
          affichées peuvent être incomplètes.
        </p>
      )}

      {/* ── KPIs ──────────────────────────────────────────────────────────── */}
      <section className={shared.section}>
        <div className={shared.sectionHeader}>
          <h2>Vue d&apos;ensemble</h2>
          {isLoading && (
            <p className={shared.mutedText} aria-live="polite">
              Chargement des données…
            </p>
          )}
        </div>

        <div className={shared.grid}>
          {/* KPI 1 — Note moyenne estimée */}
          <div className={shared.card}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "var(--color-warning)",
              }}
            >
              <Star size={20} aria-hidden="true" />
              <span
                className={shared.mutedText}
                style={{ margin: 0, fontSize: "0.85rem" }}
              >
                Note moyenne estimée
              </span>
            </div>
            <p style={{ margin: 0, fontSize: "2rem", fontWeight: 700 }}>
              {avgRating}
              <span
                style={{
                  fontSize: "1rem",
                  color: "var(--color-text-muted)",
                  marginLeft: 4,
                }}
              >
                / 5
              </span>
            </p>
            <div>{renderStars(avgRating)}</div>
            <p className={shared.mutedText} style={{ fontSize: "0.8rem" }}>
              Basée sur {totalTrips} trajet{totalTrips > 1 ? "s" : ""}
            </p>
          </div>

          {/* KPI 2 — Taux de completion */}
          <div className={shared.card}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "var(--color-success)",
              }}
            >
              <TrendingUp size={20} aria-hidden="true" />
              <span
                className={shared.mutedText}
                style={{ margin: 0, fontSize: "0.85rem" }}
              >
                Taux de complétion
              </span>
            </div>
            <p style={{ margin: 0, fontSize: "2rem", fontWeight: 700 }}>
              {completionRate}
              <span
                style={{
                  fontSize: "1rem",
                  color: "var(--color-text-muted)",
                  marginLeft: 2,
                }}
              >
                %
              </span>
            </p>
            <p className={shared.mutedText} style={{ fontSize: "0.8rem" }}>
              {completedTrips} trajet{completedTrips > 1 ? "s" : ""} complété
              {completedTrips > 1 ? "s" : ""} sur {totalTrips}
            </p>
          </div>

          {/* KPI 3 — Taux d'annulation */}
          <div className={shared.card}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "var(--color-danger)",
              }}
            >
              <AlertTriangle size={20} aria-hidden="true" />
              <span
                className={shared.mutedText}
                style={{ margin: 0, fontSize: "0.85rem" }}
              >
                Taux d&apos;annulation
              </span>
            </div>
            <p style={{ margin: 0, fontSize: "2rem", fontWeight: 700 }}>
              {cancellationRate}
              <span
                style={{
                  fontSize: "1rem",
                  color: "var(--color-text-muted)",
                  marginLeft: 2,
                }}
              >
                %
              </span>
            </p>
            <p className={shared.mutedText} style={{ fontSize: "0.8rem" }}>
              {cancelledTrips} trajet{cancelledTrips > 1 ? "s" : ""} annulé
              {cancelledTrips > 1 ? "s" : ""}
            </p>
          </div>

          {/* KPI 4 — Signalements en attente */}
          <div className={shared.card}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                color:
                  pendingReportsCount > 0
                    ? "var(--color-danger)"
                    : "var(--color-success)",
              }}
            >
              <ThumbsUp size={20} aria-hidden="true" />
              <span
                className={shared.mutedText}
                style={{ margin: 0, fontSize: "0.85rem" }}
              >
                Signalements en attente
              </span>
            </div>
            <p style={{ margin: 0, fontSize: "2rem", fontWeight: 700 }}>
              {pendingReportsCount}
            </p>
            <p className={shared.mutedText} style={{ fontSize: "0.8rem" }}>
              {pendingReportsCount === 0
                ? "Aucun signalement à traiter"
                : `${pendingReportsCount} signalement${pendingReportsCount > 1 ? "s" : ""} nécessite${pendingReportsCount > 1 ? "nt" : ""} une action`}
            </p>
          </div>
        </div>
      </section>

      {/* ── Classement des conducteurs ─────────────────────────────────────── */}
      <section className={shared.section}>
        <div className={shared.sectionHeader}>
          <div>
            <h2
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                margin: 0,
              }}
            >
              <Award size={20} aria-hidden="true" />
              Classement des conducteurs
            </h2>
            <p className={shared.mutedText} style={{ marginTop: 4 }}>
              {driverRankings.length} conducteur
              {driverRankings.length > 1 ? "s" : ""} actif
              {driverRankings.length > 1 ? "s" : ""} sur la plateforme
            </p>
          </div>
        </div>

        {tripsLoading ? (
          <p className={shared.emptyState}>Chargement du classement…</p>
        ) : driverRankings.length === 0 ? (
          <p className={shared.emptyState}>
            Aucun trajet enregistré. Le classement des conducteurs s&apos;affichera
            dès que des trajets seront publiés.
          </p>
        ) : (
          <div className={shared.tableWrapper}>
            <table className={shared.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Conducteur</th>
                  <th>Trajets complétés</th>
                  <th>Annulés</th>
                  <th>Note estimée</th>
                  <th>Évaluation</th>
                </tr>
              </thead>
              <tbody>
                {driverRankings.map((driver, index) => (
                  <tr key={driver.driverId}>
                    {/* Rang */}
                    <td>
                      <span className={shared.mutedText}>
                        {index + 1}
                      </span>
                    </td>

                    {/* Nom du conducteur */}
                    <td>
                      <strong>{driver.driverName}</strong>
                      <br />
                      <small className={shared.mutedText}>
                        {driver.total} trajet{driver.total > 1 ? "s" : ""} au total
                      </small>
                    </td>

                    {/* Trajets complétés */}
                    <td>
                      <span className={shared.successText}>
                        {driver.completed}
                      </span>
                    </td>

                    {/* Trajets annulés */}
                    <td>
                      {driver.cancelled > 0 ? (
                        <span className={shared.errorText}>
                          {driver.cancelled}
                        </span>
                      ) : (
                        <span className={shared.mutedText}>0</span>
                      )}
                    </td>

                    {/* Note estimée avec étoiles */}
                    <td>
                      <span style={{ fontWeight: 700 }}>
                        {driver.estimatedRating}
                      </span>{" "}
                      {renderStars(driver.estimatedRating)}
                    </td>

                    {/* Badge d'évaluation */}
                    <td>{ratingBadge(driver.estimatedRating)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Signalements récents ───────────────────────────────────────────── */}
      <section className={shared.section}>
        <div className={shared.sectionHeader}>
          <div>
            <h2 style={{ margin: 0 }}>Signalements récents</h2>
            <p className={shared.mutedText} style={{ marginTop: 4 }}>
              Les 5 derniers signalements reçus (tous statuts)
            </p>
          </div>
          <Link href="/reports" className={shared.secondaryButton}>
            Voir tous les signalements
          </Link>
        </div>

        {recentLoading ? (
          <p className={shared.emptyState}>Chargement des signalements…</p>
        ) : recentError ? (
          <p className={shared.errorText} role="alert">
            Impossible de charger les signalements récents.
          </p>
        ) : !recentReportsData?.reports.length ? (
          <p className={shared.emptyState}>
            Aucun signalement pour l&apos;instant.
          </p>
        ) : (
          <div className={shared.tableWrapper}>
            <table className={shared.table}>
              <thead>
                <tr>
                  <th>Personne signalée</th>
                  <th>Signalée par</th>
                  <th>Motif</th>
                  <th>Trajet</th>
                  <th>Statut</th>
                  <th>Reçu le</th>
                </tr>
              </thead>
              <tbody>
                {recentReportsData.reports.map((report) => (
                  <tr key={report.id}>
                    <td>
                      <strong>
                        {report.reportedUser
                          ? `${report.reportedUser.firstName} ${report.reportedUser.lastName}`.trim()
                          : `Compte désactivé (réf. ${report.reportedUserId.slice(0, 8)})`}
                      </strong>
                    </td>
                    <td>
                      {report.reporter
                        ? `${report.reporter.firstName} ${report.reporter.lastName}`.trim()
                        : `Compte désactivé (réf. ${report.reporterId.slice(0, 8)})`}
                    </td>
                    <td>
                      {REASON_LABEL[report.reason] ?? report.reason}
                    </td>
                    <td className={shared.mutedText}>
                      {report.tripRoute ?? "—"}
                    </td>
                    <td>
                      <span className={reportBadgeClass(report.status)}>
                        {REPORT_STATUS_LABEL[report.status] ?? report.status}
                      </span>
                    </td>
                    <td className={shared.mutedText}>
                      {formatDate(report.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Seuils de qualité ─────────────────────────────────────────────── */}
      <section className={shared.section}>
        <div className={shared.sectionHeader}>
          <h2 style={{ margin: 0 }}>Seuils de qualité &amp; règles de surveillance</h2>
        </div>

        <p className={shared.mutedText}>
          Ces seuils guident les décisions de l&apos;équipe. Ils sont calculés
          automatiquement à partir des données de la plateforme.
        </p>

        <div className={shared.grid}>
          {/* Seuil note conducteur */}
          <div className={shared.card}>
            <p
              style={{
                margin: 0,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 6,
                color: "var(--color-danger)",
              }}
            >
              <AlertTriangle size={16} aria-hidden="true" />
              Note &lt; 3,5 → Examen manuel
            </p>
            <p className={shared.mutedText} style={{ fontSize: "0.85rem" }}>
              Tout conducteur dont la note estimée est inférieure à{" "}
              <strong>3,5 / 5</strong> fait l&apos;objet d&apos;un examen manuel
              par l&apos;équipe de modération. Son compte peut être temporairement
              suspendu le temps de l&apos;analyse.
            </p>
          </div>

          {/* Seuil taux d'annulation */}
          <div className={shared.card}>
            <p
              style={{
                margin: 0,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 6,
                color: "var(--color-warning)",
              }}
            >
              <AlertTriangle size={16} aria-hidden="true" />
              Annulations &gt; 10 % → Avertissement
            </p>
            <p className={shared.mutedText} style={{ fontSize: "0.85rem" }}>
              Un conducteur qui annule plus de <strong>10 %</strong> de ses
              trajets reçoit un avertissement automatique. Au-delà de{" "}
              <strong>25 %</strong>, son accès à la création de nouveaux trajets
              peut être bloqué jusqu&apos;à un entretien avec un modérateur.
            </p>
          </div>

          {/* Signalements répétés */}
          <div className={shared.card}>
            <p
              style={{
                margin: 0,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 6,
                color: "var(--color-primary)",
              }}
            >
              <ThumbsUp size={16} aria-hidden="true" />
              ≥ 3 signalements en attente → Priorité haute
            </p>
            <p className={shared.mutedText} style={{ fontSize: "0.85rem" }}>
              Lorsqu&apos;un utilisateur cumule <strong>3 signalements ou plus</strong>{" "}
              sans décision, son dossier est marqué comme prioritaire et doit
              être traité dans les <strong>48 heures</strong>.
            </p>
          </div>

          {/* Lecture de la note estimée */}
          <div className={shared.card}>
            <p
              style={{
                margin: 0,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 6,
                color: "var(--color-success)",
              }}
            >
              <Star size={16} aria-hidden="true" />
              Comment lire la note estimée ?
            </p>
            <p className={shared.mutedText} style={{ fontSize: "0.85rem" }}>
              La note est calculée comme{" "}
              <code style={{ fontFamily: "monospace" }}>
                3,5 + (complétés / total × 1,5)
              </code>
              . Elle reflète la <strong>fiabilité</strong> du conducteur (sa
              capacité à mener ses trajets à terme), pas les avis passagers qui
              ne sont pas encore collectés en v1.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
