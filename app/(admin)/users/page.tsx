"use client";

import { useMemo, useState } from "react";

import {
  useActivateUserMutation,
  useGetUsersQuery,
  useSuspendUserMutation,
} from "@/lib/features/users/usersApi";

import shared from "../styles/page.module.css";

const statusLabel: Record<string, string> = {
  active: "Actif",
  inactive: "Inactif",
  suspended: "Suspendu",
  pending_kyc: "En vérification",
};

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;
  const { data: users = [], isFetching } = useGetUsersQuery({ page, limit });
  const [suspendUser, { isLoading: isSuspending }] = useSuspendUserMutation();
  const [activateUser, { isLoading: isActivating }] = useActivateUserMutation();

  const filtered = useMemo(() => {
    return users.filter((user) => {
      const term = search.toLowerCase();
      return (
        user.firstName.toLowerCase().includes(term) ||
        user.lastName.toLowerCase().includes(term) ||
        (user.email ?? "").toLowerCase().includes(term) ||
        user.phone.includes(term)
      );
    });
  }, [users, search]);

  const statusClass = (status: string) => {
    if (status === "active") return `${shared.badge} ${shared.badgeSuccess}`;
    if (status === "suspended") return `${shared.badge} ${shared.badgeDanger}`;
    return `${shared.badge} ${shared.badgeWarning}`;
  };

  const handleSuspend = async (userId: string) => {
    await suspendUser(userId).unwrap();
  };

  const handleActivate = async (userId: string) => {
    await activateUser(userId).unwrap();
  };

  return (
    <div className={shared.page}>
      <section className={shared.section}>
        <div className={shared.sectionHeader}>
          <div>
            <h2>Gestion utilisateurs</h2>
            <p style={{ margin: 0, color: "var(--color-text-muted)" }}>
              {users.length} utilisateurs chargés
            </p>
          </div>
          <div className={shared.toolbar}>
            <input
              placeholder="Rechercher (nom, email, téléphone)"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>

        <div className={shared.tableWrapper}>
          <table className={shared.table}>
            <thead>
              <tr>
                <th>Utilisateur</th>
                <th>Contact</th>
                <th>Rôle</th>
                <th>Statut</th>
                <th>Dernier login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={user.id}>
                  <td>
                    <strong>
                      {user.firstName} {user.lastName}
                    </strong>
                  </td>
                  <td>
                    <div>{user.email ?? "—"}</div>
                    <small style={{ color: "var(--color-text-muted)" }}>
                      {user.phone}
                    </small>
                  </td>
                  <td>{user.role}</td>
                  <td>
                    <span className={statusClass(user.status)}>
                      {statusLabel[user.status] ?? user.status}
                    </span>
                  </td>
                  <td>
                    {user.lastLoginAt
                      ? new Intl.DateTimeFormat("fr-CD", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        }).format(new Date(user.lastLoginAt))
                      : "—"}
                  </td>
                  <td>
                    {user.status === "suspended" ? (
                      <button
                        type="button"
                        className={shared.primaryButton}
                        onClick={() => handleActivate(user.id)}
                        disabled={isActivating}
                      >
                        Réactiver
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={shared.primaryButton}
                        style={{
                          background: "rgba(255, 75, 85, 0.2)",
                          color: "var(--color-danger)",
                        }}
                        onClick={() => handleSuspend(user.id)}
                        disabled={isSuspending}
                      >
                        Suspendre
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={shared.toolbar} style={{ justifyContent: "flex-end" }}>
          <button
            type="button"
            className={shared.primaryButton}
            onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
            disabled={page === 1 || isFetching}
          >
            Page précédente
          </button>
          <span>Page {page}</span>
          <button
            type="button"
            className={shared.primaryButton}
            onClick={() => setPage((prev) => prev + 1)}
            disabled={isFetching || users.length < limit}
          >
            Page suivante
          </button>
        </div>
      </section>
    </div>
  );
}

