"use client";

import { useEffect, useState } from "react";
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

export default function SupportPage() {
  const [statusFilter, setStatusFilter] = useState<SupportTicketStatus | "all">(
    "all"
  );
  const [priorityFilter, setPriorityFilter] = useState<
    SupportTicketPriority | "all"
  >("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [openTicketId, setOpenTicketId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [nextStatus, setNextStatus] = useState<SupportTicketStatus>("in_progress");
  const [actionError, setActionError] = useState<string | null>(null);
  const limit = 20;

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const { data, isFetching, isError, error } = useListAdminTicketsQuery({
    page,
    limit,
    status: statusFilter === "all" ? undefined : statusFilter,
    priority: priorityFilter === "all" ? undefined : priorityFilter,
    search: debouncedSearch || undefined,
  });
  const { data: profile } = useGetCurrentUserProfileQuery();
  const { data: openTicket, isFetching: isFetchingTicket } =
    useGetAdminTicketQuery(openTicketId ?? "", { skip: !openTicketId });

  const [assignTicket, { isLoading: isAssigning }] =
    useAssignAdminTicketMutation();
  const [updateStatus, { isLoading: isUpdatingStatus }] =
    useUpdateAdminTicketStatusMutation();
  const [addMessage, { isLoading: isSendingMessage }] =
    useAddAdminTicketMessageMutation();

  const tickets = data?.data ?? [];
  const total = data?.meta?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentAdminId = profile?.user?.id;
  const hasFilters =
    statusFilter !== "all" || priorityFilter !== "all" || Boolean(debouncedSearch);

  useEffect(() => {
    if (openTicket) {
      setNextStatus(openTicket.status);
    }
  }, [openTicket]);

  const resetFilters = () => {
    setStatusFilter("all");
    setPriorityFilter("all");
    setSearch("");
    setPage(1);
  };

  const closeTicket = () => {
    setOpenTicketId(null);
    setReply("");
    setIsInternalNote(false);
    setActionError(null);
  };

  const handleAssignToMe = async (ticket: SupportTicketSummary) => {
    setActionError(null);
    try {
      await assignTicket({ ticketId: ticket.id, body: {} }).unwrap();
    } catch (mutationError) {
      setActionError(
        getApiErrorMessage(
          mutationError,
          "La prise en charge n’a pas pu être enregistrée."
        )
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
    } catch (mutationError) {
      setActionError(
        getApiErrorMessage(mutationError, "Le message n’a pas pu être envoyé.")
      );
    }
  };

  const handleUpdateStatus = async () => {
    if (!openTicketId) return;
    setActionError(null);
    try {
      await updateStatus({
        ticketId: openTicketId,
        body: { status: nextStatus },
      }).unwrap();
    } catch (mutationError) {
      setActionError(
        getApiErrorMessage(
          mutationError,
          "Le changement de statut n’a pas pu être enregistré."
        )
      );
    }
  };

  return (
    <div className={shared.page}>
      <section className={shared.section}>
        <div className={shared.sectionHeader}>
          <div>
            <h2>Support & SLA</h2>
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
                  setStatusFilter(
                    event.target.value as SupportTicketStatus | "all"
                  );
                  setPage(1);
                }}
              >
                <option value="all">Tous les statuts</option>
                {(Object.keys(STATUS_LABEL) as SupportTicketStatus[]).map(
                  (status) => (
                    <option key={status} value={status}>
                      {STATUS_LABEL[status]}
                    </option>
                  )
                )}
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
                  setPriorityFilter(
                    event.target.value as SupportTicketPriority | "all"
                  );
                  setPage(1);
                }}
              >
                <option value="all">Toutes les priorités</option>
                {(Object.keys(PRIORITY_LABEL) as SupportTicketPriority[]).map(
                  (priority) => (
                    <option key={priority} value={priority}>
                      {PRIORITY_LABEL[priority]}
                    </option>
                  )
                )}
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
            Ces tickets sont ouverts par les utilisateurs depuis l’application.
            « Prendre en charge » vous désigne comme responsable du ticket.
            « Ouvrir » affiche la conversation : vous pouvez y répondre à
            l’utilisateur, ajouter une note interne que lui ne verra pas, et
            changer le statut quand la demande avance.
          </span>
        </p>

        {isError ? (
          <p className={shared.errorText} role="alert">
            {getApiErrorMessage(
              error,
              "Impossible de récupérer les tickets pour le moment."
            )}
          </p>
        ) : null}

        {actionError ? (
          <p className={shared.errorText} role="alert">
            {actionError}
          </p>
        ) : null}

        <div className={shared.tableWrapper}>
          <table className={shared.table}>
            <thead>
              <tr>
                <th>Sujet</th>
                <th>Demandeur</th>
                <th>Catégorie</th>
                <th>Priorité</th>
                <th>Statut</th>
                <th>Pris en charge par</th>
                <th>Dernier message</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <p className={shared.emptyState}>
                      {isFetching
                        ? "Chargement des tickets..."
                        : hasFilters
                          ? "Aucun ticket ne correspond à ces filtres."
                          : "Aucun ticket support pour l’instant. Les demandes créées depuis l’application apparaîtront ici."}
                    </p>
                  </td>
                </tr>
              ) : null}
              {tickets.map((ticket) => (
                <tr key={ticket.id}>
                  <td>
                    <strong>{ticket.subject}</strong>
                  </td>
                  <td>{formatPerson(ticket.user, "Utilisateur supprimé")}</td>
                  <td>{CATEGORY_LABEL[ticket.category] ?? ticket.category}</td>
                  <td>
                    <span className={priorityClass(ticket.priority)}>
                      {PRIORITY_LABEL[ticket.priority] ?? ticket.priority}
                    </span>
                  </td>
                  <td>
                    <span className={statusClass(ticket.status)}>
                      {STATUS_LABEL[ticket.status] ?? ticket.status}
                    </span>
                  </td>
                  <td>
                    {formatPerson(ticket.assignedAdmin, "Personne")}
                    {ticket.assignedAdminId &&
                    ticket.assignedAdminId === currentAdminId ? (
                      <>
                        <br />
                        <small className={shared.mutedText}>vous</small>
                      </>
                    ) : null}
                  </td>
                  <td>{formatDate(ticket.lastMessageAt)}</td>
                  <td>
                    <div className={shared.rowActions}>
                      <button
                        type="button"
                        className={shared.secondaryButton}
                        onClick={() => {
                          setActionError(null);
                          setOpenTicketId(ticket.id);
                        }}
                      >
                        Ouvrir
                      </button>
                      {ticket.assignedAdminId === currentAdminId ? null : (
                        <button
                          type="button"
                          className={shared.primaryButton}
                          onClick={() => void handleAssignToMe(ticket)}
                          disabled={isAssigning}
                        >
                          Prendre en charge
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={shared.pagination}>
          <p className={shared.paginationInfo}>
            Page {page} sur {totalPages} · {total} ticket{total > 1 ? "s" : ""}
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

      {openTicketId ? (
        <div className={shared.modalBackdrop} role="presentation">
          <div className={`${shared.card} ${shared.modalCard}`}>
            {isFetchingTicket && !openTicket ? (
              <p className={shared.emptyState}>Chargement du ticket...</p>
            ) : openTicket ? (
              <>
                <h3>{openTicket.subject}</h3>
                <p className={shared.mutedText}>
                  {formatPerson(openTicket.user, "Utilisateur supprimé")} ·{" "}
                  {CATEGORY_LABEL[openTicket.category] ?? openTicket.category} ·
                  priorité {PRIORITY_LABEL[openTicket.priority]}
                </p>

                <div className={shared.timeline}>
                  {openTicket.messages.length === 0 ? (
                    <p className={shared.emptyState}>
                      Ce ticket n’a encore aucun message.
                    </p>
                  ) : (
                    openTicket.messages.map((message) => (
                      <div key={message.id} className={shared.timelineItem}>
                        <strong>
                          {formatPerson(message.sender, "Auteur inconnu")}
                          {message.isInternal ? " · note interne" : ""}
                        </strong>
                        <span>{message.content}</span>
                        <br />
                        <small className={shared.mutedText}>
                          {formatDate(message.createdAt)}
                        </small>
                      </div>
                    ))
                  )}
                </div>

                <label>
                  Votre message
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
                  <label htmlFor="support-internal">
                    Note interne : l’utilisateur ne la verra pas
                  </label>
                </div>

                <label>
                  Statut du ticket
                  <select
                    value={nextStatus}
                    onChange={(event) =>
                      setNextStatus(event.target.value as SupportTicketStatus)
                    }
                  >
                    {(Object.keys(STATUS_LABEL) as SupportTicketStatus[]).map(
                      (status) => (
                        <option key={status} value={status}>
                          {STATUS_LABEL[status]}
                        </option>
                      )
                    )}
                  </select>
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
                    onClick={closeTicket}
                  >
                    Fermer
                  </button>
                  <button
                    type="button"
                    className={shared.secondaryButton}
                    onClick={() => void handleUpdateStatus()}
                    disabled={isUpdatingStatus || nextStatus === openTicket.status}
                  >
                    {isUpdatingStatus
                      ? "Enregistrement..."
                      : "Enregistrer le statut"}
                  </button>
                  <button
                    type="button"
                    className={shared.primaryButton}
                    onClick={() => void handleSendReply()}
                    disabled={isSendingMessage || !reply.trim()}
                  >
                    {isSendingMessage ? "Envoi..." : "Envoyer le message"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className={shared.errorText} role="alert">
                  Ce ticket n’a pas pu être chargé.
                </p>
                <div className={shared.modalActions}>
                  <button
                    type="button"
                    className={shared.secondaryButton}
                    onClick={closeTicket}
                  >
                    Fermer
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
