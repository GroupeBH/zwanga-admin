"use client";

import Link from "next/link";
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
import { bulkSummary, runBulk } from "@/lib/utils/runBulk";
import { useUrlState } from "@/lib/utils/useUrlState";
import { BulkBar } from "@/app/components/ui/DataTable";
import { confirmAction, notify, promptText } from "@/app/components/ui/Feedback";
import { Pagination } from "@/app/components/ui/Pagination";
import { SkeletonList } from "@/app/components/ui/Skeleton";
import { QueueEmptyDetail, QueueItem, QueueLayout } from "@/app/components/ui/WorkQueue";

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
  under_review: "En cours d’examen",
  resolved: "Résolu",
  dismissed: "Classé sans suite",
};

const DECISION_HINT: Record<ReportStatusDecision, string> = {
  under_review: "Vous vérifiez les faits ; le signalement reste ouvert.",
  resolved: "Le problème est traité (avertissement, suspension, échange avec les personnes…).",
  dismissed: "Le signalement n’est pas fondé ou ne demande aucune action.",
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

const formatParty = (party: UserReportParty | null, id?: string) =>
  party
    ? `${party.firstName} ${party.lastName}`.trim()
    : `Compte désactivé${id ? ` (réf. ${id.slice(0, 8)})` : ""}`;

const statusClass = (status: ReportStatus) => {
  if (status === "resolved") return `${shared.badge} ${shared.badgeSuccess}`;
  if (status === "pending") return `${shared.badge} ${shared.badgeDanger}`;
  return `${shared.badge} ${shared.badgeWarning}`;
};

const LIMIT = 20;

export default function ReportsPage() {
  const [statusFilter, setStatusFilter] = useUrlState<ReportStatus | "all">("statut", "all");
  const [reasonFilter, setReasonFilter] = useUrlState<ReportReason | "all">("motif", "all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useUrlState<number>("page", 1);
  const [selectedId, setSelectedId] = useUrlState<string>("dossier", "");
  const [mobileDetail, setMobileDetail] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [decision, setDecision] = useState<ReportStatusDecision>("under_review");
  const [adminNotes, setAdminNotes] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const next = search.trim();
    // Sans ce garde, le premier passage ecraserait la page lue dans l'URL.
    if (next === debouncedSearch) return;
    const timeout = setTimeout(() => {
      setDebouncedSearch(next);
      setPage(1);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search, debouncedSearch, setPage]);

  const { data, isFetching, isLoading, isError, error } = useGetReportsQuery({
    page,
    limit: LIMIT,
    status: statusFilter === "all" ? undefined : statusFilter,
    reason: reasonFilter === "all" ? undefined : reasonFilter,
    search: debouncedSearch || undefined,
  });
  const [updateReportStatus, { isLoading: isUpdating }] = useUpdateReportStatusMutation();

  const reports = useMemo(() => data?.reports ?? [], [data]);
  const total = data?.total ?? 0;
  const selected = reports.find((report) => report.id === selectedId) ?? null;
  const hasFilters =
    statusFilter !== "all" || reasonFilter !== "all" || Boolean(debouncedSearch);
  const pendingCount = reports.filter((report) => report.status === "pending").length;

  // Le formulaire de decision suit le dossier affiche.
  useEffect(() => {
    if (!selected) return;
    setActionError(null);
    setDecision(selected.status === "pending" ? "under_review" : "resolved");
    setAdminNotes(selected.adminNotes ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  // Changer de page ou de filtre vide la selection: on n'agit que sur ce qu'on voit.
  useEffect(() => {
    setChecked(new Set());
  }, [page, statusFilter, reasonFilter, debouncedSearch]);

  const resetFilters = () => {
    setStatusFilter("all");
    setReasonFilter("all");
    setSearch("");
    setPage(1);
  };

  const select = (report: UserReport) => {
    setSelectedId(report.id);
    setMobileDetail(true);
  };

  /* Apres une decision, on passe au dossier suivant de la page (ou precedent
     s'il n'y en a plus), comme dans la file KYC. */
  const advanceFrom = (id: string) => {
    const index = reports.findIndex((report) => report.id === id);
    const next = reports[index + 1] ?? reports[index - 1];
    setSelectedId(next && next.id !== id ? next.id : "");
    if (!next) setMobileDetail(false);
  };

  const submitDecision = async () => {
    if (!selected) return;
    setActionError(null);
    try {
      await updateReportStatus({
        reportId: selected.id,
        body: {
          status: decision,
          adminNotes: adminNotes.trim() ? adminNotes.trim() : undefined,
        },
      }).unwrap();
      notify(`Signalement : ${DECISION_LABEL[decision].toLowerCase()}.`, "success");
      advanceFrom(selected.id);
    } catch (mutationError) {
      setActionError(
        getApiErrorMessage(mutationError, "La décision n’a pas pu être enregistrée.")
      );
    }
  };

  const bulkDecide = async (status: ReportStatusDecision) => {
    const targets = reports.filter((report) => checked.has(report.id));
    if (!targets.length) return;
    const note = await promptText({
      title: `${DECISION_LABEL[status]} : ${targets.length} signalement${targets.length > 1 ? "s" : ""}`,
      message: `${DECISION_HINT[status]}\nLa note sera ajoutée à chaque dossier sélectionné.`,
      label: "Note interne commune",
      placeholder: "Ce que vous avez vérifié, la suite donnée…",
      confirmLabel: "Appliquer",
      required: status !== "under_review",
    });
    if (note === null) return;
    const result = await runBulk(
      targets,
      (report) =>
        updateReportStatus({
          reportId: report.id,
          body: { status, adminNotes: note || undefined },
        }).unwrap(),
      (done, count) => setProgress({ done, total: count })
    );
    setProgress(null);
    setChecked(new Set(result.failed.map(({ item }) => item.id)));
    notify(
      bulkSummary(result.succeeded, result.failed.length, "signalement"),
      result.failed.length ? "error" : "success"
    );
  };

  const toggleChecked = (id: string) =>
    setChecked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allChecked = reports.length > 0 && reports.every((report) => checked.has(report.id));

  const list = (
    <>
      {reports.length > 0 ? (
        <label className={shared.checkboxRow} style={{ fontSize: "0.82rem" }}>
          <input
            type="checkbox"
            checked={allChecked}
            onChange={() =>
              setChecked(allChecked ? new Set() : new Set(reports.map((report) => report.id)))
            }
          />
          Tout sélectionner sur cette page
        </label>
      ) : null}
      {isLoading ? (
        <SkeletonList />
      ) : reports.length === 0 ? (
        <p className={shared.emptyState}>
          {hasFilters
            ? "Aucun signalement ne correspond à ces filtres."
            : "Aucun signalement pour l’instant. Les signalements envoyés depuis l’application apparaîtront ici."}
        </p>
      ) : (
        reports.map((report) => (
          <QueueItem
            key={report.id}
            active={report.id === selectedId}
            onSelect={() => select(report)}
            checked={checked.has(report.id)}
            onCheck={() => toggleChecked(report.id)}
            title={formatParty(report.reportedUser, report.reportedUserId)}
            badge={
              <span className={statusClass(report.status)}>
                {STATUS_LABEL[report.status] ?? report.status}
              </span>
            }
            subtitle={`${REASON_LABEL[report.reason] ?? report.reason} · ${report.description}`}
            meta={`Reçu le ${formatDate(report.createdAt)} · par ${formatParty(report.reporter, report.reporterId)}`}
          />
        ))
      )}
    </>
  );

  const detail = selected ? (
    <>
      <div className={shared.sectionHeader}>
        <div>
          <h2>{formatParty(selected.reportedUser, selected.reportedUserId)}</h2>
          <p className={shared.mutedText}>
            {REASON_LABEL[selected.reason] ?? selected.reason} · reçu le{" "}
            {formatDate(selected.createdAt)}
          </p>
        </div>
        <span className={statusClass(selected.status)}>
          {STATUS_LABEL[selected.status] ?? selected.status}
        </span>
      </div>

      <div className={shared.fieldGrid}>
        <div>
          <span className={shared.filterLabel}>Personne signalée</span>
          <p style={{ margin: "4px 0 0" }}>
            {selected.reportedUser ? (
              <Link className={shared.textLink} href={`/users?fiche=${selected.reportedUserId}`}>
                {formatParty(selected.reportedUser)}
              </Link>
            ) : (
              formatParty(null, selected.reportedUserId)
            )}
            <br />
            <small className={shared.mutedText}>
              {selected.reportedUser?.phone ?? "Téléphone indisponible"}
            </small>
          </p>
        </div>
        <div>
          <span className={shared.filterLabel}>Signalée par</span>
          <p style={{ margin: "4px 0 0" }}>
            {selected.reporter ? (
              <Link className={shared.textLink} href={`/users?fiche=${selected.reporterId}`}>
                {formatParty(selected.reporter)}
              </Link>
            ) : (
              formatParty(null, selected.reporterId)
            )}
            <br />
            <small className={shared.mutedText}>
              {selected.reporter?.phone ?? "Téléphone indisponible"}
            </small>
          </p>
        </div>
      </div>

      <div>
        <span className={shared.filterLabel}>Description</span>
        <p style={{ margin: "4px 0 0", whiteSpace: "pre-line" }}>{selected.description}</p>
      </div>

      {selected.tripRoute || selected.tripId ? (
        <p className={shared.mutedText}>
          Trajet concerné :{" "}
          {selected.tripId ? (
            <Link className={shared.textLink} href={`/trips?fiche=${selected.tripId}`}>
              {selected.tripRoute ?? "voir le trajet"}
            </Link>
          ) : (
            selected.tripRoute
          )}
        </p>
      ) : null}

      {selected.reviewedAt ? (
        <p className={shared.mutedText}>Dernière décision le {formatDate(selected.reviewedAt)}.</p>
      ) : null}

      <fieldset className={shared.decisionGroup}>
        <legend className={shared.filterLabel}>Décision</legend>
        {(Object.keys(DECISION_LABEL) as ReportStatusDecision[]).map((value) => (
          <label key={value} className={shared.decisionOption}>
            <input
              type="radio"
              name="report-decision"
              value={value}
              checked={decision === value}
              onChange={() => setDecision(value)}
            />
            <span>
              <strong>{DECISION_LABEL[value]}</strong>
              <small className={shared.mutedText}>{DECISION_HINT[value]}</small>
            </span>
          </label>
        ))}
      </fieldset>

      <label className={shared.filterField}>
        <span className={shared.filterLabel}>Note interne (visible par l’équipe, pas par l’utilisateur)</span>
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
          className={shared.primaryButton}
          onClick={() => void submitDecision()}
          disabled={isUpdating}
        >
          {isUpdating ? "Enregistrement…" : "Enregistrer et passer au suivant"}
        </button>
      </div>
    </>
  ) : (
    <QueueEmptyDetail>
      {reports.length
        ? "Choisissez un signalement dans la liste pour le traiter."
        : "Rien à afficher pour ces filtres."}
    </QueueEmptyDetail>
  );

  return (
    <div className={shared.page}>
      <section className={shared.section}>
        <div className={shared.sectionHeader}>
          <div>
            <h1>Signalements</h1>
            <p className={shared.filterSummary}>
              {total} signalement{total > 1 ? "s" : ""}
              {pendingCount > 0 ? ` · ${pendingCount} à traiter sur cette page` : ""}
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
                {(Object.keys(REASON_LABEL) as ReportReason[]).map((reason) => (
                  <option key={reason} value={reason}>
                    {REASON_LABEL[reason]}
                  </option>
                ))}
              </select>
            </div>
            {hasFilters ? (
              <button type="button" className={shared.secondaryButton} onClick={resetFilters}>
                <RotateCcw size={14} aria-hidden="true" />
                Réinitialiser
              </button>
            ) : null}
          </div>
        </div>

        <p className={shared.helpText}>
          <Info size={16} aria-hidden="true" />
          <span>
            Choisissez un signalement à gauche, décidez à droite : le suivant s’ouvre
            tout seul. Cochez plusieurs signalements pour les traiter en une fois.
            Votre note reste visible par l’équipe, pas par l’utilisateur.
          </span>
        </p>

        {isError ? (
          <p className={shared.errorText} role="alert">
            {getApiErrorMessage(error, "Impossible de charger les signalements pour le moment.")}
          </p>
        ) : null}

        <BulkBar count={checked.size} onClear={() => setChecked(new Set())} progress={progress}>
          <button type="button" className={shared.secondaryButton} onClick={() => void bulkDecide("under_review")}>
            Passer en examen
          </button>
          <button type="button" className={shared.secondaryButton} onClick={() => void bulkDecide("resolved")}>
            Marquer résolus
          </button>
          <button
            type="button"
            className={shared.secondaryButton}
            onClick={async () => {
              if (
                await confirmAction({
                  title: "Classer sans suite ?",
                  message: `${checked.size} signalement(s) seront fermés sans action. Vérifiez qu’aucun ne concerne la sécurité d’un passager.`,
                  confirmLabel: "Continuer",
                  tone: "danger",
                })
              )
                void bulkDecide("dismissed");
            }}
          >
            Classer sans suite
          </button>
        </BulkBar>

        <div style={{ opacity: isFetching && !isLoading ? 0.6 : 1, transition: "opacity .2s" }}>
          <QueueLayout
            list={list}
            detail={detail}
            showDetailOnMobile={mobileDetail && Boolean(selected)}
            onBack={() => setMobileDetail(false)}
          />
        </div>

        <Pagination
          page={page}
          limit={LIMIT}
          total={total}
          pageCount={reports.length}
          onChange={setPage}
          disabled={isFetching}
          noun="signalements"
        />
      </section>
    </div>
  );
}
