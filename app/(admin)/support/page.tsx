"use client";

import {
  useGetSupportTicketsQuery,
  type SupportTicketCategory,
  type SupportTicketPriority,
  type SupportTicketStatus,
} from "@/lib/features/support/supportApi";

import shared from "../styles/page.module.css";

const STATUS_LABEL: Record<SupportTicketStatus, string> = {
  open: "Ouvert",
  in_progress: "En cours",
  waiting_user: "En attente utilisateur",
  resolved: "Resolue",
  closed: "Ferme",
};

const PRIORITY_LABEL: Record<SupportTicketPriority, string> = {
  low: "Basse",
  medium: "Moyenne",
  high: "Haute",
  urgent: "Urgente",
};

const CATEGORY_LABEL: Record<SupportTicketCategory, string> = {
  general: "General",
  account: "Compte",
  payment: "Paiement",
  booking: "Reservation",
  safety: "Securite",
  technical: "Technique",
  other: "Autre",
};

function statusClass(status: SupportTicketStatus): string {
  if (status === "closed" || status === "resolved") {
    return `${shared.badge} ${shared.badgeSuccess}`;
  }

  if (status === "open") {
    return `${shared.badge} ${shared.badgeDanger}`;
  }

  return `${shared.badge} ${shared.badgeWarning}`;
}

function priorityClass(priority: SupportTicketPriority): string {
  if (priority === "urgent" || priority === "high") {
    return `${shared.badge} ${shared.badgeDanger}`;
  }

  if (priority === "medium") {
    return `${shared.badge} ${shared.badgeWarning}`;
  }

  return `${shared.badge} ${shared.badgeSuccess}`;
}

function formatDate(value: string | null): string {
  if (!value) return "-";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SupportPage() {
  const { data: tickets = [], isLoading, isError } = useGetSupportTicketsQuery();

  return (
    <div className={shared.page}>
      <section className={shared.section}>
        <div className={shared.sectionHeader}>
          <div>
            <h2>Support & SLA</h2>
            <p style={{ margin: 0, color: "var(--color-text-muted)" }}>
              Pilotage des tickets support: statut, priorite, categorie et temps de reponse
            </p>
          </div>
          <button type="button" className={shared.primaryButton}>
            Ouvrir un ticket
          </button>
        </div>

        {isLoading ? (
          <p style={{ margin: 0, color: "var(--color-text-muted)" }}>Chargement des tickets...</p>
        ) : null}

        {isError ? (
          <p style={{ margin: 0, color: "var(--color-danger)" }}>
            Impossible de recuperer les tickets pour le moment.
          </p>
        ) : null}

        {!isLoading && !isError ? (
          <div className={shared.grid}>
            {tickets.map((ticket) => {
              const requesterName = ticket.user
                ? `${ticket.user.firstName} ${ticket.user.lastName}`
                : "Utilisateur";
              const assigneeName = ticket.assignedAdmin
                ? `${ticket.assignedAdmin.firstName} ${ticket.assignedAdmin.lastName}`
                : "Non assigne";

              return (
                <article key={ticket.id} className={shared.card}>
                  <small style={{ color: "var(--color-text-muted)" }}>
                    {CATEGORY_LABEL[ticket.category]}
                  </small>
                  <strong>{ticket.subject}</strong>
                  <span>{requesterName}</span>
                  <div className={statusClass(ticket.status)}>{STATUS_LABEL[ticket.status]}</div>
                  <div className={priorityClass(ticket.priority)}>
                    Priorite {PRIORITY_LABEL[ticket.priority]}
                  </div>
                  <span style={{ color: "var(--color-text-muted)", fontSize: "0.8rem" }}>
                    Dernier message {formatDate(ticket.lastMessageAt)}
                  </span>
                  <span style={{ color: "var(--color-text-muted)", fontSize: "0.8rem" }}>
                    1ere reponse {formatDate(ticket.firstResponseAt)}
                  </span>
                  <span style={{ color: "var(--color-text-muted)", fontSize: "0.8rem" }}>
                    Assigne a {assigneeName}
                  </span>
                </article>
              );
            })}
          </div>
        ) : null}
      </section>
    </div>
  );
}
