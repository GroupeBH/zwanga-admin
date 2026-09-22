"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Download, Info, RotateCcw } from "lucide-react";

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

const segmentLabel: Record<AdminUserRoleFilter | "all", string> = {
  all: "Tous les utilisateurs",
  driver: "Conducteurs verifies",
  passenger: "Passagers sans KYC valide",
  verified_passenger: "Passagers KYC sans vehicule",
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
  /* La recherche de la barre superieure arrive par ?q=. La page est souvent
     deja ouverte quand ce parametre change: il faut le suivre, sinon la
     recherche resterait sans effet. */
  const urlSearch = useSearchParams().get("q") ?? "";
  const [search, setSearch] = useState(urlSearch);
  const [roleFilter, setRoleFilter] = useState<AdminUserRoleFilter | "all">("all");
  const [page, setPage] = useState(1);
  const [exportError, setExportError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const limit = 10;
  const role = roleFilter === "all" ? undefined : roleFilter;

  useEffect(() => {
    setSearch(urlSearch);
    setPage(1);
  }, [urlSearch]);
  const { data, isFetching } = useGetUsersQuery(
    { page, limit, role },
    { refetchOnMountOrArgChange: true }
  );
  const users = data?.users ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
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

  // Suspendre coupe l'acces au compte: l'action demande une confirmation
  // explicite et rapporte son echec au lieu d'echouer en silence.
  const handleSuspend = async (user: User) => {
    setActionError(null);
    const confirmed = window.confirm(
      `Suspendre le compte de ${user.firstName} ${user.lastName} ?\n\nLa personne ne pourra plus se connecter jusqu'a sa reactivation.`
    );
    if (!confirmed) {
      return;
    }

    try {
      await suspendUser(user.id).unwrap();
    } catch (error) {
      setActionError(
        getApiErrorMessage(error, "Impossible de suspendre ce compte.")
      );
    }
  };

  const handleActivate = async (user: User) => {
    setActionError(null);
    try {
      await activateUser(user.id).unwrap();
    } catch (error) {
      setActionError(
        getApiErrorMessage(error, "Impossible de reactiver ce compte.")
      );
    }
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
            <p className={shared.filterSummary}>
              {total} compte{total > 1 ? "s" : ""} · {segmentLabel[roleFilter]}
            </p>
          </div>
          <div className={shared.toolbar}>
            <div className={shared.filterField}>
              <label className={shared.filterLabel} htmlFor="users-search">
                Rechercher une personne
              </label>
              <input
                id="users-search"
                className={shared.filterSearch}
                placeholder="Nom, email ou téléphone"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className={shared.filterField}>
              <label className={shared.filterLabel} htmlFor="users-segment">
                Filtrer par profil
              </label>
              <select
                id="users-segment"
                value={roleFilter}
                onChange={(event) =>
                  handleRoleFilterChange(event.target.value as AdminUserRoleFilter | "all")
                }
              >
                <option value="all">{segmentLabel.all}</option>
                <option value="driver">{segmentLabel.driver}</option>
                <option value="passenger">{segmentLabel.passenger}</option>
                <option value="verified_passenger">
                  {segmentLabel.verified_passenger}
                </option>
              </select>
            </div>
            {search || roleFilter !== "all" ? (
              <button
                type="button"
                className={shared.secondaryButton}
                onClick={() => {
                  setSearch("");
                  handleRoleFilterChange("all");
                }}
              >
                <RotateCcw size={14} aria-hidden="true" />
                Réinitialiser
              </button>
            ) : null}
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

        <p className={shared.helpText}>
          <Info size={16} aria-hidden="true" />
          <span>
            Un compte est « conducteur » seulement si son KYC est validé et
            qu’un véhicule actif est enregistré. « Suspendre » bloque la
            connexion, « Réactiver » la rétablit. L’export reprend exactement le
            filtre choisi ci-dessus.
          </span>
        </p>

        {exportError ? (
          <p className={shared.errorText} role="alert">
            {exportError}
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
                        : "Aucun utilisateur ne correspond à cette recherche. Effacez le texte saisi ou repassez sur « Tous les utilisateurs »."}
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
                    <div className={shared.rowActions}>
                      <Link
                        href={`/users/${user.id}`}
                        className={shared.secondaryButton}
                      >
                        Voir la fiche
                      </Link>
                      {user.status === "suspended" ? (
                        <button
                          type="button"
                          className={shared.primaryButton}
                          onClick={() => handleActivate(user)}
                          disabled={isActivating}
                        >
                          Réactiver
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={shared.dangerButton}
                          onClick={() => handleSuspend(user)}
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

        <div className={shared.pagination}>
          <p className={shared.paginationInfo}>
            Page {page} sur {totalPages} · {total} résultat
            {total > 1 ? "s" : ""} pour « {segmentLabel[roleFilter]} »
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
    </div>
  );
}
