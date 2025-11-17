"use client";

import { useGetSupportTicketsQuery } from "@/lib/features/support/supportApi";

import shared from "../styles/page.module.css";

export default function SupportPage() {
  const { data: tickets = [] } = useGetSupportTicketsQuery();

  const statusClass = (status: typeof tickets[number]["status"]) => {
    if (status === "clos") return `${shared.badge} ${shared.badgeSuccess}`;
    if (status === "nouveau") return `${shared.badge} ${shared.badgeDanger}`;
    return `${shared.badge} ${shared.badgeWarning}`;
  };

  return (
    <div className={shared.page}>
      <section className={shared.section}>
        <div className={shared.sectionHeader}>
          <div>
            <h2>Support & SLA</h2>
            <p style={{ margin: 0, color: "var(--color-text-muted)" }}>
              Monitoring des tickets multi-canaux
            </p>
          </div>
          <button type="button" className={shared.primaryButton}>
            Ouvrir un ticket
          </button>
        </div>

        <div className={shared.grid}>
          {tickets.map((ticket) => (
            <article key={ticket.id} className={shared.card}>
              <small style={{ color: "var(--color-text-muted)" }}>
                {ticket.channel}
              </small>
              <strong>{ticket.topic}</strong>
              <span>{ticket.requester}</span>
              <div className={statusClass(ticket.status)}>{ticket.status}</div>
              <span style={{ color: "var(--color-text-muted)", fontSize: "0.8rem" }}>
                Dernière maj {ticket.lastUpdate}
              </span>
              <strong>SLA {ticket.sla}</strong>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

