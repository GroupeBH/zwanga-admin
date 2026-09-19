"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Download } from "lucide-react";

import {
  useActivateUserMutation,
  useExportUsersXlsMutation,
  useGetUsersQuery,
  useSuspendUserMutation,
  type AdminUserRoleFilter,
} from "@/lib/features/users/usersApi";
import { getApiErrorMessage } from "@/lib/utils/apiErrors";
import type { User } from "@/lib/features/admin/types";

import shared from "../styles/page.module.css";

const statusLabel: Record<string, string> = {
  active: "Actif",
  inactive: "Inactif",
  suspended: "Suspendu",
  pending_kyc: "En vérification",
};

const roleLabel: Record<string, string> = {
  driver: "Conducteur",
  passenger: "Passager",
  admin: "Admin",
  super_admin: "Super admin",
};

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const matchesUserSegment = (
  user: User,
  roleFilter: AdminUserRoleFilter | "all"
) => {
  if (roleFilter === "all") return true;
  if (roleFilter === "driver") return Boolean(user.isQualifiedDriver);
  if (roleFilter === "passenger") return user.hasApprovedKyc === false;
  return Boolean(user.hasApprovedKyc) && !user.hasActiveVehicle;
};

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<AdminUserRoleFilter | "all">("all");
  const [page, setPage] = useState(1);
  const [exportError, setExportError] = useState<string | null>(null);
  const limit = 10;
  const role = roleFilter === "all" ? undefined : roleFilter;
  const { data, isFetching } = useGetUsersQuery(
    { page, limit, role },
    { refetchOnMountOrArgChange: true }
  );
  const users = data?.users ?? [];
  const total = data?.total ?? 0;
  const [suspendUser, { isLoading: isSuspending }] = useSuspendUserMutation();
  const [activateUser, { isLoading: isActivating }] = useActivateUserMutation();
  const [exportUsersXls, { isLoading: isExporting }] = useExportUsersXlsMutation();

  const filtered = useMemo(() => {
    return users.filter((user) => {
      if (!matchesUserSegment(user, roleFilter)) {
        return false;
      }
      const term = search.toLowerCase();
      return (
        user.firstName.toLowerCase().includes(term) ||
        user.lastName.toLowerCase().includes(term) ||
        (user.email ?? "").toLowerCase().includes(term) ||
        user.phone.includes(term)
      );
    });
  }, [users, search, roleFilter]);

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

  const handleRoleFilterChange = (value: AdminUserRoleFilter | "all") => {
    setRoleFilter(value);
    setPage(1);
  };

  const handleExport = async () => {
    setExportError(null);
    try {
      const blob = await exportUsersXls({ role }).unwrap();
      const suffix =
        roleFilter === "driver"
          ? "conducteurs"
          : roleFilter === "passenger"
            ? "passagers"
            : roleFilter === "verified_passenger"
              ? "passagers-kyc"
              : "tous";
      downloadBlob(
        blob,
        `utilisateurs-zwanga-${suffix}-${new Date().toISOString().slice(0, 10)}.xls`
      );
    } catch (error) {
      setExportError(
        getApiErrorMessage(error, "Impossible d'exporter les utilisateurs.")
      );
    }
  };

  return (
    <div className={shared.page}>
      <section className={shared.section}>
        <div className={shared.sectionHeader}>
          <div>
            <h2>Gestion utilisateurs</h2>
            <p style={{ margin: 0, color: "var(--color-text-muted)" }}>
              {roleFilter === "driver"
                ? `${total} conducteur${total > 1 ? "s" : ""}`
                : roleFilter === "passenger"
                  ? `${total} passager${total > 1 ? "s" : ""}`
                  : roleFilter === "verified_passenger"
                    ? `${total} passager${total > 1 ? "s" : ""} KYC sans véhicule`
                    : `${total} utilisateur${total > 1 ? "s" : ""}`}
            </p>
          </div>
          <div className={shared.toolbar}>
            <input
              placeholder="Rechercher (nom, email, téléphone)"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <select
              aria-label="Filtrer les utilisateurs"
              value={roleFilter}
              onChange={(event) =>
                handleRoleFilterChange(event.target.value as AdminUserRoleFilter | "all")
              }
            >
              <option value="all">Tous les utilisateurs</option>
              <option value="driver">Conducteurs</option>
              <option value="passenger">Passagers</option>
              <option value="verified_passenger">Passagers KYC sans véhicule</option>
            </select>
            <button
              type="button"
              className={shared.primaryButton}
              onClick={handleExport}
              disabled={isExporting}
            >
              <Download size={16} style={{ marginRight: 8 }} />
              {isExporting ? "Export..." : "Exporter XLS"}
            </button>
          </div>
        </div>

        {exportError ? (
          <p className={shared.errorText} role="alert">
            {exportError}
          </p>
        ) : null}

        <div className={shared.tableWrapper}>
          <table className={shared.table}>
            <thead>
              <tr>
                <th>Utilisateur</th>
                <th>Contact</th>
                <th>Conducteur</th>
                <th>Statut</th>
                <th>Dernier login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody key={`${roleFilter}-${page}`}>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <p className={shared.emptyState}>
                      {isFetching
                        ? "Chargement des utilisateurs..."
                        : "Aucun utilisateur ne correspond à ce filtre."}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((user) => (
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
                  <td>
                    <span
                      className={
                        user.isQualifiedDriver
                          ? `${shared.badge} ${shared.badgeSuccess}`
                          : `${shared.badge} ${shared.badgeWarning}`
                      }
                    >
                      {user.isQualifiedDriver ? "Oui" : "Non"}
                    </span>
                    {user.role === "driver" && !user.isQualifiedDriver ? (
                      <div>
                        <small style={{ color: "var(--color-text-muted)" }}>
                          Profil déclaré: conducteur
                        </small>
                      </div>
                    ) : user.role === "admin" || user.role === "super_admin" ? (
                      <div>
                        <small style={{ color: "var(--color-text-muted)" }}>
                          {roleLabel[user.role]}
                        </small>
                      </div>
                    ) : null}
                  </td>
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
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <Link
                        href={`/users/${user.id}`}
                        className={shared.primaryButton}
                        style={{
                          background: "rgba(255, 255, 255, 0.1)",
                          color: "var(--color-text)",
                          textDecoration: "none",
                        }}
                      >
                        Details
                      </Link>
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
                    </div>
                  </td>
                </tr>
                ))
              )}
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
