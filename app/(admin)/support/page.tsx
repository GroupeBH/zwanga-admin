"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Info, RotateCcw } from "lucide-react";

import {
  useAddAdminTicketMessageMutation,
  useAssignAdminTicketMutation,
  useGetAdminTicketQuery,
  useListAdminTicketsQuery,
  useUpdateAdminTicketStatusMutation,
  type SupportTicketCategory,
  type SupportTicketPriority,
  type SupportTicketStatus,
  type SupportTicketSummary,
} from "@/lib/features/support/supportApi";
import { useGetCurrentUserProfileQuery } from "@/lib/features/profile/profileApi";
import { getApiErrorMessage } from "@/lib/utils/apiErrors";
import { bulkSummary, runBulk } from "@/lib/utils/runBulk";
import { useUrlState } from "@/lib/utils/useUrlState";
import { BulkBar } from "@/app/components/ui/DataTable";
import { notify } from "@/app/components/ui/Feedback";
import { Pagination } from "@/app/components/ui/Pagination";
import { SkeletonList, SkeletonText } from "@/app/components/ui/Skeleton";
import { QueueEmptyDetail, QueueItem, QueueLayout } from "@/app/components/ui/WorkQueue";

import shared from "../styles/page.module.css";

const STATUS_LABEL: Record<SupportTicketStatus, string> = {
  open: "Ouvert",
  in_progress: "En cours",
  waiting_user: "En attente de l’utilisateur",
  resolved: "Résolu",
  closed: "Fermé",
};

const PRIORITY_LABEL: Record<SupportTicketPriority, string> = {
  low: "Basse",
  medium: "Moyenne",
  high: "Haute",
  urgent: "Urgente",
};

const CATEGORY_LABEL: Record<SupportTicketCategory, string> = {
  general: "Général",
  account: "Compte",
  payment: "Paiement",
  booking: "Réservation",
  safety: "Sécurité",
  technical: "Technique",
  other: "Autre",
};

const statusClass = (status: SupportTicketStatus) => {
  if (status === "closed" || status === "resolved") {
    return `${shared.badge} ${shared.badgeSuccess}`;
  }
  if (status === "open") {
    return `${shared.badge} ${shared.badgeDanger}`;
  }
  return `${shared.badge} ${shared.badgeWarning}`;
};

const priorityClass = (priority: SupportTicketPriority) => {
  if (priority === "urgent" || priority === "high") {
    return `${shared.badge} ${shared.badgeDanger}`;
  }
  if (priority === "medium") {
    return `${shared.badge} ${shared.badgeWarning}`;
  }
  return `${shared.badge} ${shared.badgeSuccess}`;
};

const formatDate = (value: string | null) => {
  if (!value) return "pas encore";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "pas encore";
  return new Intl.DateTimeFormat("fr-CD", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
};

const formatPerson = (
  person: { firstName: string; lastName: string } | null,
  fallback: string
) => (person ? `${person.firstName} ${person.lastName}`.trim() : fallback);

const LIMIT = 20;

export default function SupportPage() {
  const [statusFilter, setStatusFilter] = useUrlState<SupportTicketStatus | "all">("statut", "all");
  const [priorityFilter, setPriorityFilter] = useUrlState<SupportTicketPriority | "all">(
    "priorite",
    "all"
  );
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useUrlState<number>("page", 1);
  const [openTicketId, setOpenTicketId] = useUrlState<string>("ticket", "");
  const [mobileDetail, setMobileDetail] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [bulkStatus, setBulkStatus] = useState<SupportTicketStatus>("in_progress");
  const [reply, setReply] = useState("");
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [nextStatus, setNextStatus] = useState<SupportTicketStatus>("in_progress");
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

  const { data, isFetching, isLoading, isError, error } = useListAdminTicketsQuery({
    page,
    limit: LIMIT,
    status: statusFilter === "all" ? undefined : statusFilter,
    priority: priorityFilter === "all" ? undefined : priorityFilter,
    search: debouncedSearch || undefined,
  });
  const { data: profile } = useGetCurrentUserProfileQuery();
  const {
    data: openTicket,
    isFetching: isFetchingTicket,
    isError: ticketError,
  } = useGetAdminTicketQuery(openTicketId, { skip: !openTicketId });

  const [assignTicket, { isLoading: isAssigning }] = useAssignAdminTicketMutation();
  const [updateStatus, { isLoading: isUpdatingStatus }] = useUpdateAdminTicketStatusMutation();
  const [addMessage, { isLoading: isSendingMessage }] = useAddAdminTicketMessageMutation();

  const tickets = useMemo(() => data?.data ?? [], [data]);
  const total = data?.meta?.total ?? 0;
  const currentAdminId = profile?.user?.id;
  const hasFilters =
    statusFilter !== "all" || priorityFilter !== "all" || Boolean(debouncedSearch);
  const ticket = openTicket?.id === openTicketId ? openTicket : null;

  useEffect(() => {
    if (ticket) setNextStatus(ticket.status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket?.id, ticket?.status]);

  useEffect(() => {
    setReply("");
    setIsInternalNote(false);
    setActionError(null);
  }, [openTicketId]);

  useEffect(() => {
    setChecked(new Set());
  }, [page, statusFilter, priorityFilter, debouncedSearch]);

  const resetFilters = () => {
    setStatusFilter("all");
    setPriorityFilter("all");
    setSearch("");
    setPage(1);
  };

  const handleAssignToMe = async (target: SupportTicketSummary) => {
    setActionError(null);
    try {
      await assignTicket({ ticketId: target.id, body: {} }).unwrap();
      notify("Ticket pris en charge.", "success");
    } catch (mutationError) {
      setActionError(
        getApiErrorMessage(mutationError, "La prise en charge n’a pas pu être enregistrée.")
      );
    }
  };

  const handleSendReply = async () => {
    if (!openTicketId || !reply.trim()) return;
    setActionError(null);
    try {
      await addMessage({
        ticketId: openTicketId,
        body: { content: reply.trim(), isInternal: isInternalNote },
      }).unwrap();
      setReply("");
      notify(isInternalNote ? "Note interne ajoutée." : "Réponse envoyée.", "success");
    } catch (mutationError) {
      setActionError(getApiErrorMessage(mutationError, "Le message n’a pas pu être envoyé."));
    }
  };

  const handleUpdateStatus = async () => {
    if (!openTicketId) return;
    setActionError(null);
    try {
      await updateStatus({ ticketId: openTicketId, body: { status: nextStatus } }).unwrap();
      notify(`Statut : ${STATUS_LABEL[nextStatus].toLowerCase()}.`, "success");
    } catch (mutationError) {
      setActionError(
        getApiErrorMessage(mutationError, "Le changement de statut n’a pas pu être enregistré.")
      );
    }
  };

  const runOnChecked = async (
    action: (target: SupportTicketSummary) => Promise<unknown>
  ) => {
    const targets = tickets.filter((item) => checked.has(item.id));
    if (!targets.length) return;
    const result = await runBulk(targets, action, (done, count) =>
      setProgress({ done, total: count })
    );
    setProgress(null);
    setChecked(new Set(result.failed.map(({ item }) => item.id)));
    notify(
      bulkSummary(result.succeeded, result.failed.length, "ticket"),
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

  const allChecked = tickets.length > 0 && tickets.every((item) => checked.has(item.id));

  const list = (
    <>
      {tickets.length > 0 ? (
        <label className={shared.checkboxRow} style={{ fontSize: "0.82rem" }}>
          <input
            type="checkbox"
            checked={allChecked}
            onChange={() =>
              setChecked(allChecked ? new Set() : new Set(tickets.map((item) => item.id)))
            }
          />
          Tout sélectionner sur cette page
        </label>
      ) : null}
      {isLoading ? (
        <SkeletonList />
      ) : tickets.length === 0 ? (
        <p className={shared.emptyState}>
          {hasFilters
            ? "Aucun ticket ne correspond à ces filtres."
            : "Aucun ticket support pour l’instant. Les demandes créées depuis l’application apparaîtront ici."}
        </p>
      ) : (
        tickets.map((item) => (
          <QueueItem
            key={item.id}
            active={item.id === openTicketId}
            onSelect={() => {
              setOpenTicketId(item.id);
              setMobileDetail(true);
            }}
            checked={checked.has(item.id)}
            onCheck={() => toggleChecked(item.id)}
            title={item.subject}
            badge={<span className={priorityClass(item.priority)}>{PRIORITY_LABEL[item.priority]}</span>}
            subtitle={`${formatPerson(item.user, "Utilisateur supprimé")} · ${CATEGORY_LABEL[item.category] ?? item.category}`}
            meta={
              <>
                <span className={statusClass(item.status)}>{STATUS_LABEL[item.status] ?? item.status}</span>{" "}
                {item.assignedAdminId
                  ? item.assignedAdminId === currentAdminId
                    ? "· pris en charge par vous"
                    : `· ${formatPerson(item.assignedAdmin, "un admin")}`
                  : "· personne ne s’en occupe"}{" "}
                · {formatDate(item.lastMessageAt)}
              </>
            }
          />
        ))
      )}
    </>
  );

  const detail = !openTicketId ? (
    <QueueEmptyDetail>
      {tickets.length
        ? "Choisissez un ticket dans la liste pour lire la conversation et répondre."
        : "Rien à afficher pour ces filtres."}
    </QueueEmptyDetail>
  ) : isFetchingTicket && !ticket ? (
    <SkeletonText lines={6} />
  ) : ticket ? (
    <>
      <div className={shared.sectionHeader}>
        <div>
          <h2>{ticket.subject}</h2>
          <p className={shared.mutedText}>
            {ticket.user ? (
              <Link className={shared.textLink} href={`/users?fiche=${ticket.userId}`}>
                {formatPerson(ticket.user, "Utilisateur supprimé")}
              </Link>
            ) : (
              "Utilisateur supprimé"
            )}{" "}
            · {CATEGORY_LABEL[ticket.category] ?? ticket.category} · ouvert le{" "}
            {formatDate(ticket.createdAt)}
          </p>
        </div>
        <div className={shared.toolbar}>
          <span className={priorityClass(ticket.priority)}>
            Priorité {PRIORITY_LABEL[ticket.priority].toLowerCase()}
          </span>
          <span className={statusClass(ticket.status)}>{STATUS_LABEL[ticket.status]}</span>
        </div>
      </div>

      <p className={shared.mutedText}>
        {ticket.assignedAdminId
          ? ticket.assignedAdminId === currentAdminId
            ? "Vous êtes responsable de ce ticket."
            : `Pris en charge par ${formatPerson(ticket.assignedAdmin, "un autre admin")}.`
          : "Personne ne s’occupe encore de ce ticket."}{" "}
        Première réponse : {formatDate(ticket.firstResponseAt)}.
        {ticket.assignedAdminId !== currentAdminId ? (
          <>
            {" "}
            <button
              type="button"
              className={shared.secondaryButton}
              onClick={() => void handleAssignToMe(ticket)}
              disabled={isAssigning}
              style={{ marginLeft: 6 }}
            >
              Prendre en charge
            </button>
          </>
        ) : null}
      </p>

      <div className={shared.timeline}>
        {ticket.messages.length === 0 ? (
          <p className={shared.emptyState}>Ce ticket n’a encore aucun message.</p>
        ) : (
          ticket.messages.map((message) => (
            <div key={message.id} className={shared.timelineItem}>
              <strong>
                {formatPerson(message.sender, "Auteur inconnu")}
                {message.isInternal ? " · note interne" : ""}
              </strong>
              <span style={{ whiteSpace: "pre-line" }}>{message.content}</span>
              <br />
              <small className={shared.mutedText}>{formatDate(message.createdAt)}</small>
            </div>
          ))
        )}
      </div>

      <label className={shared.filterField}>
        <span className={shared.filterLabel}>Votre message</span>
        <textarea
          rows={4}
          value={reply}
          onChange={(event) => setReply(event.target.value)}
          placeholder="Réponse à l’utilisateur ou note pour l’équipe…"
        />
      </label>
      <div className={shared.checkboxRow}>
        <input
          id="support-internal"
          type="checkbox"
          checked={isInternalNote}
          onChange={(event) => setIsInternalNote(event.target.checked)}
        />
        <label htmlFor="support-internal">Note interne : l’utilisateur ne la verra pas</label>
      </div>

      {actionError ? (
        <p className={shared.errorText} role="alert">
          {actionError}
        </p>
      ) : null}

      <div className={shared.modalActions} style={{ flexWrap: "wrap", justifyContent: "space-between" }}>
        <div className={shared.toolbar}>
          <label className={shared.filterField}>
            <span className={shared.filterLabel}>Statut du ticket</span>
            <select
              value={nextStatus}
              onChange={(event) => setNextStatus(event.target.value as SupportTicketStatus)}
            >
              {(Object.keys(STATUS_LABEL) as SupportTicketStatus[]).map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABEL[status]}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className={shared.secondaryButton}
            onClick={() => void handleUpdateStatus()}
            disabled={isUpdatingStatus || nextStatus === ticket.status}
          >
            {isUpdatingStatus ? "Enregistrement…" : "Enregistrer le statut"}
          </button>
        </div>
        <button
          type="button"
          className={shared.primaryButton}
          onClick={() => void handleSendReply()}
          disabled={isSendingMessage || !reply.trim()}
        >
          {isSendingMessage ? "Envoi…" : isInternalNote ? "Ajouter la note" : "Envoyer la réponse"}
        </button>
      </div>
    </>
  ) : (
    <p className={shared.errorText} role="alert">
      {ticketError ? "Ce ticket n’a pas pu être chargé." : "Ticket introuvable."}
    </p>
  );

  return (
    <div className={shared.page}>
      <section className={shared.section}>
        <div className={shared.sectionHeader}>
          <div>
            <h1>Support</h1>
            <p className={shared.filterSummary}>
              {total} ticket{total > 1 ? "s" : ""} au total
            </p>
          </div>
          <div className={shared.toolbar}>
            <div className={shared.filterField}>
              <label className={shared.filterLabel} htmlFor="support-search">
                Rechercher un ticket
              </label>
              <input
                id="support-search"
                className={shared.filterSearch}
                placeholder="Sujet du ticket"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className={shared.filterField}>
              <label className={shared.filterLabel} htmlFor="support-status">
                Filtrer par statut
              </label>
              <select
                id="support-status"
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value as SupportTicketStatus | "all");
                  setPage(1);
                }}
              >
                <option value="all">Tous les statuts</option>
                {(Object.keys(STATUS_LABEL) as SupportTicketStatus[]).map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABEL[status]}
                  </option>
                ))}
              </select>
            </div>
            <div className={shared.filterField}>
              <label className={shared.filterLabel} htmlFor="support-priority">
                Filtrer par priorité
              </label>
              <select
                id="support-priority"
                value={priorityFilter}
                onChange={(event) => {
                  setPriorityFilter(event.target.value as SupportTicketPriority | "all");
                  setPage(1);
                }}
              >
                <option value="all">Toutes les priorités</option>
                {(Object.keys(PRIORITY_LABEL) as SupportTicketPriority[]).map((priority) => (
                  <option key={priority} value={priority}>
                    {PRIORITY_LABEL[priority]}
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
            Choisissez un ticket à gauche pour lire la conversation et répondre à droite.
            Une note interne n’est pas visible par l’utilisateur. Cochez plusieurs tickets
            pour les prendre en charge ou changer leur statut en une fois.
          </span>
        </p>

        {isError ? (
          <p className={shared.errorText} role="alert">
            {getApiErrorMessage(error, "Impossible de récupérer les tickets pour le moment.")}
          </p>
        ) : null}

        <BulkBar count={checked.size} onClear={() => setChecked(new Set())} progress={progress}>
          <button
            type="button"
            className={shared.secondaryButton}
            onClick={() =>
              void runOnChecked((item) => assignTicket({ ticketId: item.id, body: {} }).unwrap())
            }
          >
            Prendre en charge
          </button>
          <select
            aria-label="Nouveau statut pour la sélection"
            value={bulkStatus}
            onChange={(event) => setBulkStatus(event.target.value as SupportTicketStatus)}
          >
            {(Object.keys(STATUS_LABEL) as SupportTicketStatus[]).map((status) => (
              <option key={status} value={status}>
                {STATUS_LABEL[status]}
              </option>
            ))}
          </select>
          <button
            type="button"
            className={shared.secondaryButton}
            onClick={() =>
              void runOnChecked((item) =>
                updateStatus({ ticketId: item.id, body: { status: bulkStatus } }).unwrap()
              )
            }
          >
            Appliquer ce statut
          </button>
        </BulkBar>

        <div style={{ opacity: isFetching && !isLoading ? 0.6 : 1, transition: "opacity .2s" }}>
          <QueueLayout
            list={list}
            detail={detail}
            showDetailOnMobile={mobileDetail && Boolean(openTicketId)}
            onBack={() => setMobileDetail(false)}
          />
        </div>

        <Pagination
          page={page}
          limit={LIMIT}
          total={total}
          pageCount={tickets.length}
          onChange={setPage}
          disabled={isFetching}
          noun="tickets"
        />
      </section>
    </div>
  );
}
