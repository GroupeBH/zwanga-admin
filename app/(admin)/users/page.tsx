"use client";

import { useMemo, useState } from "react";

import { useGetUsersQuery } from "@/lib/features/users/usersApi";

import shared from "../styles/page.module.css";

export default function UsersPage() {
  const { data: users = [] } = useGetUsersQuery();
  const [query, setQuery] = useState("");
  const [plan, setPlan] = useState("all");

  const filtered = useMemo(() => {
    return users.filter((user) => {
      const matchesQuery =
        user.name.toLowerCase().includes(query.toLowerCase()) ||
        user.email.toLowerCase().includes(query.toLowerCase());
      const matchesPlan = plan === "all" || user.plan === plan;
      return matchesQuery && matchesPlan;
    });
  }, [users, query, plan]);

  const statusClass = (status: typeof users[number]["status"]) => {
    if (status === "actif") return `${shared.badge} ${shared.badgeSuccess}`;
    if (status === "suspendu") return `${shared.badge} ${shared.badgeDanger}`;
    return `${shared.badge} ${shared.badgeWarning}`;
  };

  return (
    <div className={shared.page}>
      <section className={shared.section}>
        <div className={shared.sectionHeader}>
          <div>
            <h2>Gestion utilisateurs</h2>
            <p style={{ margin: 0, color: "var(--color-text-muted)" }}>
              {filtered.length} utilisateurs visibles • synchronisé en temps réel
            </p>
          </div>
          <div className={shared.toolbar}>
            <input
              placeholder="Rechercher nom ou email..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <select value={plan} onChange={(event) => setPlan(event.target.value)}>
              <option value="all">Tous les plans</option>
              <option value="Essai">Essai</option>
              <option value="Actif">Actif</option>
              <option value="Expiré">Expiré</option>
            </select>
          </div>
        </div>

        <div className={shared.tableWrapper}>
          <table className={shared.table}>
            <thead>
              <tr>
                <th>utilisateur</th>
                <th>contact</th>
                <th>plan</th>
                <th>trajets</th>
                <th>note</th>
                <th>statut</th>
                <th>dernière course</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={user.id}>
                  <td>
                    <strong>{user.name}</strong>
                  </td>
                  <td>
                    <div>{user.email}</div>
                    <small style={{ color: "var(--color-text-muted)" }}>
                      {user.phone}
                    </small>
                  </td>
                  <td>{user.plan}</td>
                  <td>{user.rides}</td>
                  <td>{user.rating.toFixed(2)}</td>
                  <td>
                    <span className={statusClass(user.status)}>{user.status}</span>
                  </td>
                  <td>
                    {new Intl.DateTimeFormat("fr-CD", {
                      hour: "2-digit",
                      minute: "2-digit",
                      day: "2-digit",
                      month: "short",
                    }).format(new Date(user.lastRide))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

