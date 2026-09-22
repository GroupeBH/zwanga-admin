"use client";

import { useEffect, useMemo, useState } from "react";
import { Info, RotateCcw } from "lucide-react";

import {
  useGetReportsQuery,
  useUpdateReportStatusMutation,
  type ReportReason,
  type ReportStatus,
  type ReportStatusDecision,
  type UserReport,
  type UserReportParty,
} from "@/lib/features/reports/reportsApi";
import { getApiErrorMessage } from "@/lib/utils/apiErrors";

import shared from "../styles/page.module.css";

const STATUS_LABEL: Record<ReportStatus, string> = {
  pending: "À traiter",
  under_review: "En cours d’examen",
  resolved: "Résolu",
  dismissed: "Classé sans suite",
};

const REASON_LABEL: Record<ReportReason, string> = {
  inappropriate_behavior: "Comportement inapproprié",
  harassment: "Harcèlement",
  safety_concern: "Sécurité",
  fraud: "Fraude",
  other: "Autre",
};

const DECISION_LABEL: Record<ReportStatusDecision, string> = {
  under_review: "Marquer « en cours d’examen »",
  resolved: "Marquer « résolu »",
  dismissed: "Classer sans suite",
};

const formatDate = (value: string | null) => {
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

const formatParty = (party: UserReportParty | null) =>
  party ? `${party.firstName} ${party.lastName}`.trim() : "Compte supprimé";

const statusClass = (status: ReportStatus) => {
  if (status === "resolved") return `${shared.badge} ${shared.badgeSuccess}`;
  if (status === "pending") return `${shared.badge} ${shared.badgeDanger}`;
  return `${shared.badge} ${shared.badgeWarning}`;
};

export default function ReportsPage() {
  const [statusFilter, setStatusFilter] = useState<ReportStatus | "all">("all");
  const [reasonFilter, setReasonFilter] = useState<ReportReason | "all">("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState<UserReport | null>(null);
  const [decision, setDecision] = useState<ReportStatusDecision>("under_review");
  const [adminNotes, setAdminNotes] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const limit = 20;

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const { data, isFetching, isError, error } = useGetReportsQuery({
    page,
    limit,
    status: statusFilter === "all" ? undefined : statusFilter,
    reason: reasonFilter === "all" ? undefined : reasonFilter,
    search: debouncedSearch || undefined,
  });
  const [updateReportStatus, { isLoading: isUpdating }] =
    useUpdateReportStatusMutation();

  const reports = data?.reports ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const hasFilters =
    statusFilter !== "all" || reasonFilter !== "all" || Boolean(debouncedSearch);

  const pendingCount = useMemo(
    () => reports.filter((report) => report.status === "pending").length,
    [reports]
  );

  const resetFilters = () => {
    setStatusFilter("all");
    setReasonFilter("all");
    setSearch("");
    setPage(1);
  };

  const openDecision = (report: UserReport) => {
    setActionError(null);
    setTarget(report);
    setDecision(report.status === "pending" ? "under_review" : "resolved");
    setAdminNotes(report.adminNotes ?? "");
  };

  const closeDecision = () => {
    setTarget(null);
    setAdminNotes("");
    setActionError(null);
  };

  const submitDecision = async () => {
    if (!target) return;
    setActionError(null);
    try {
      await updateReportStatus({
        reportId: target.id,
        body: {
          status: decision,
          adminNotes: adminNotes.trim() ? adminNotes.trim() : undefined,
        },
      }).unwrap();
      closeDecision();
    } catch (mutationError) {
      setActionError(
        getApiErrorMessage(
          mutationError,
          "La décision n’a pas pu être enregistrée."
        )
      );
    }
  };

  return (
    <div className={shared.page}>
      <section className={shared.section}>
        <div className={shared.sectionHeader}>
          <div>
            <h2>Signalements & modération</h2>
            <p className={shared.filterSummary}>
              {total} signalement{total > 1 ? "s" : ""}
              {pendingCount > 0
                ? ` · ${pendingCount} à traiter sur cette page`
                : ""}
            </p>
          </div>
          <div className={shared.toolbar}>
            <div className={shared.filterField}>
              <label className={shared.filterLabel} htmlFor="reports-search">
                Rechercher une personne
              </label>
              <input
                id="reports-search"
                className={shared.filterSearch}
                placeholder="Nom ou téléphone"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className={shared.filterField}>
              <label className={shared.filterLabel} htmlFor="reports-status">
                Filtrer par statut
              </label>
              <select
                id="reports-status"
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value as ReportStatus | "all");
                  setPage(1);
                }}
              >
                <option value="all">Tous les statuts</option>
                <option value="pending">À traiter</option>
                <option value="under_review">En cours d’examen</option>
                <option value="resolved">Résolus</option>
                <option value="dismissed">Classés sans suite</option>
              </select>
            </div>
            <div className={shared.filterField}>
              <label className={shared.filterLabel} htmlFor="reports-reason">
                Filtrer par motif
              </label>
              <select
                id="reports-reason"
                value={reasonFilter}
                onChange={(event) => {
                  setReasonFilter(event.target.value as ReportReason | "all");
                  setPage(1);
                }}
              >
                <option value="all">Tous les motifs</option>
                {(
                  Object.keys(REASON_LABEL) as ReportReason[]
                ).map((reason) => (
                  <option key={reason} value={reason}>
                    {REASON_LABEL[reason]}
                  </option>
                ))}
              </select>
            </div>
            {hasFilters ? (
              <button
                type="button"
                className={shared.secondaryButton}
                onClick={resetFilters}
              >
                <RotateCcw size={14} aria-hidden="true" />
                Réinitialiser
              </button>
            ) : null}
          </div>
        </div>

        <p className={shared.helpText}>
          <Info size={16} aria-hidden="true" />
          <span>
            Ces signalements sont envoyés par les utilisateurs depuis
            l’application. « À traiter » signifie que personne ne s’en est encore
            occupé. Ouvrez « Traiter » pour indiquer où vous en êtes : en cours
            d’examen, résolu, ou classé sans suite quand le signalement n’est pas
            fondé. Votre note reste visible par l’équipe, pas par l’utilisateur.
          </span>
        </p>

        {isError ? (
          <p className={shared.errorText} role="alert">
            {getApiErrorMessage(
              error,
              "Impossible de charger les signalements pour le moment."
            )}
          </p>
        ) : null}

        <div className={shared.tableWrapper}>
          <table className={shared.table}>
            <thead>
              <tr>
                <th>Personne signalée</th>
                <th>Signalée par</th>
                <th>Motif</th>
                <th>Description</th>
                <th>Trajet</th>
                <th>Statut</th>
                <th>Reçu le</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <p className={shared.emptyState}>
                      {isFetching
                        ? "Chargement des signalements..."
                        : hasFilters
                          ? "Aucun signalement ne correspond à ces filtres."
                          : "Aucun signalement pour l’instant. Les signalements envoyés depuis l’application apparaîtront ici."}
                    </p>
                  </td>
                </tr>
              ) : null}
              {reports.map((report) => (
                <tr key={report.id}>
                  <td>
                    <strong>{formatParty(report.reportedUser)}</strong>
                    <br />
                    <small className={shared.mutedText}>
                      {report.reportedUser?.phone ?? "Téléphone indisponible"}
                    </small>
                  </td>
                  <td>
                    {formatParty(report.reporter)}
                    <br />
                    <small className={shared.mutedText}>
                      {report.reporter?.phone ?? "Téléphone indisponible"}
                    </small>
                  </td>
                  <td>{REASON_LABEL[report.reason] ?? report.reason}</td>
                  <td>{report.description}</td>
                  <td>{report.tripRoute ?? "—"}</td>
                  <td>
                    <span className={statusClass(report.status)}>
                      {STATUS_LABEL[report.status] ?? report.status}
                    </span>
                    {report.adminNotes ? (
                      <>
                        <br />
                        <small className={shared.mutedText}>
                          {report.adminNotes}
                        </small>
                      </>
                    ) : null}
                  </td>
                  <td>{formatDate(report.createdAt)}</td>
                  <td>
                    <div className={shared.rowActions}>
                      <button
                        type="button"
                        className={shared.secondaryButton}
                        onClick={() => openDecision(report)}
                      >
                        Traiter
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={shared.pagination}>
          <p className={shared.paginationInfo}>
            Page {page} sur {totalPages} · {total} signalement
            {total > 1 ? "s" : ""}
          </p>
          <div className={shared.paginationButtons}>
            <button
              type="button"
              className={shared.secondaryButton}
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              disabled={page === 1 || isFetching}
            >
              Page précédente
            </button>
            <button
              type="button"
              className={shared.secondaryButton}
              onClick={() => setPage((prev) => prev + 1)}
              disabled={isFetching || page >= totalPages}
            >
              Page suivante
            </button>
          </div>
        </div>
      </section>

      {target ? (
        <div className={shared.modalBackdrop} role="presentation">
          <div className={`${shared.card} ${shared.modalCard} ${shared.modalCompact}`}>
            <h3>Traiter le signalement</h3>
            <p className={shared.mutedText}>
              {formatParty(target.reportedUser)} signalé par{" "}
              {formatParty(target.reporter)} pour «{" "}
              {REASON_LABEL[target.reason] ?? target.reason} ».
            </p>
            <label>
              Décision
              <select
                value={decision}
                onChange={(event) =>
                  setDecision(event.target.value as ReportStatusDecision)
                }
              >
                {(
                  Object.keys(DECISION_LABEL) as ReportStatusDecision[]
                ).map((value) => (
                  <option key={value} value={value}>
                    {DECISION_LABEL[value]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Note interne (facultative)
              <textarea
                rows={4}
                maxLength={1000}
                value={adminNotes}
                onChange={(event) => setAdminNotes(event.target.value)}
                placeholder="Ce que vous avez vérifié, la suite donnée…"
              />
            </label>
            {actionError ? (
              <p className={shared.errorText} role="alert">
                {actionError}
              </p>
            ) : null}
            <div className={shared.modalActions}>
              <button
                type="button"
                className={shared.secondaryButton}
                onClick={closeDecision}
                disabled={isUpdating}
              >
                Annuler
              </button>
              <button
                type="button"
                className={shared.primaryButton}
                onClick={submitDecision}
                disabled={isUpdating}
              >
                {isUpdating ? "Enregistrement..." : "Enregistrer la décision"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
