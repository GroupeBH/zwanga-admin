"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
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

import UserDetailsPage from "./UserDetails";

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

const formatRegistrationDay = (value: string) => {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
};

const registrationPeriodLabel = (from: string, to: string) => {
  if (from && to) {
    return `enregistrés du ${formatRegistrationDay(from)} au ${formatRegistrationDay(to)}`;
  }
  if (from) return `enregistrés à partir du ${formatRegistrationDay(from)}`;
  if (to) return `enregistrés jusqu'au ${formatRegistrationDay(to)}`;
  return "";
};

const formatRecordedAt = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-CD", {
    timeZone: "Africa/Kinshasa",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
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

function UsersPageContent() {
  const ficheId = useSearchParams().get("fiche");
  if (ficheId) {
    return <UserDetailsPage userId={ficheId} />;
  }
  return <UsersList />;
}

function UsersList() {
  /* La recherche de la barre supérieure arrive par ?q=. La page est souvent
     déjà ouverte quand ce paramètre change : il faut le suivre, sinon la
     recherche resterait sans effet. */
  const urlSearch = useSearchParams().get("q") ?? "";
  const [search, setSearch] = useState(urlSearch);
  const [roleFilter, setRoleFilter] = useState<AdminUserRoleFilter | "all">("all");
  const [registeredFrom, setRegisteredFrom] = useState("");
  const [registeredTo, setRegisteredTo] = useState("");
  const [page, setPage] = useState(1);
  const [exportError, setExportError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const limit = 10;
  const role = roleFilter === "all" ? undefined : roleFilter;
  const registrationRangeInvalid = Boolean(
    registeredFrom && registeredTo && registeredFrom > registeredTo
  );
  const periodLabel = registrationPeriodLabel(registeredFrom, registeredTo);

  useEffect(() => {
    setSearch(urlSearch);
    setPage(1);
  }, [urlSearch]);
  const { data, isFetching } = useGetUsersQuery(
    {
      page,
      limit,
      role,
      registeredFrom: registeredFrom || undefined,
      registeredTo: registeredTo || undefined,
    },
    { skip: registrationRangeInvalid, refetchOnMountOrArgChange: true }
  );
  const users = registrationRangeInvalid ? [] : (data?.users ?? []);
  const total = registrationRangeInvalid ? 0 : (data?.total ?? 0);
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
      const includesTerm = (value?: string | null) =>
        (value ?? "").toLowerCase().includes(term);
      return (
        includesTerm(user.firstName) ||
        includesTerm(user.lastName) ||
        includesTerm(user.email) ||
        includesTerm(user.phone)
      );
    });
  }, [users, search, roleFilter]);

  const statusClass = (status: string) => {
    if (status === "active") return `${shared.badge} ${shared.badgeSuccess}`;
    if (status === "suspended") return `${shared.badge} ${shared.badgeDanger}`;
    return `${shared.badge} ${shared.badgeWarning}`;
  };

  // Suspendre coupe l'acces au compte: l'action demande une confirmation
  // explicite et rapporte son échec au lieu d'échouer en silence.
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
      const blob = await exportUsersXls({
        role,
        registeredFrom: registeredFrom || undefined,
        registeredTo: registeredTo || undefined,
      }).unwrap();
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
              {periodLabel ? ` · ${periodLabel}` : ""}
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
            <div className={shared.filterField}>
              <label className={shared.filterLabel} htmlFor="users-registered-from">
                Enregistré du
              </label>
              <input
                id="users-registered-from"
                type="date"
                value={registeredFrom}
                max={registeredTo || undefined}
                onChange={(event) => {
                  setRegisteredFrom(event.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className={shared.filterField}>
              <label className={shared.filterLabel} htmlFor="users-registered-to">
                au
              </label>
              <input
                id="users-registered-to"
                type="date"
                value={registeredTo}
                min={registeredFrom || undefined}
                onChange={(event) => {
                  setRegisteredTo(event.target.value);
                  setPage(1);
                }}
              />
            </div>
            {search || roleFilter !== "all" || registeredFrom || registeredTo ? (
              <button
                type="button"
                className={shared.secondaryButton}
                onClick={() => {
                  setSearch("");
                  setRegisteredFrom("");
                  setRegisteredTo("");
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
              disabled={isExporting || registrationRangeInvalid}
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
            connexion, « Réactiver » la rétablit. Les dates portent sur le jour
            d’enregistrement du compte, à Kinshasa. L’export reprend exactement
            le filtre choisi ci-dessus.
          </span>
        </p>

        {registrationRangeInvalid ? (
          <p className={shared.errorText} role="alert">
            La date de début doit être antérieure ou égale à la date de fin.
          </p>
        ) : null}

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
                <th>Enregistré le</th>
                <th>Dernière connexion</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody key={`${roleFilter}-${registeredFrom}-${registeredTo}-${page}`}>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <p className={shared.emptyState}>
                      {isFetching
                        ? "Chargement des utilisateurs..."
                        : registrationRangeInvalid
                          ? "Corrigez la période d’enregistrement pour afficher les comptes."
                          : registeredFrom || registeredTo
                            ? "Aucun utilisateur enregistré sur cette période."
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
                  <td>{formatRecordedAt(user.createdAt)}</td>
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
                      <a
                        href={
                          user.id
                            ? `/users?fiche=${encodeURIComponent(user.id)}`
                            : "/users"
                        }
                        className={shared.secondaryButton}
                      >
                        Voir la fiche
                      </a>
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
            {periodLabel ? ` · ${periodLabel}` : ""}
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

export default function UsersPage() {
  return (
    <Suspense fallback={null}>
      <UsersPageContent />
    </Suspense>
  );
}
