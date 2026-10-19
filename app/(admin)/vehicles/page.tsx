"use client";

import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";

import { useGetAdminVehiclesQuery } from "@/lib/features/vehicles/vehiclesApi";

import shared from "../styles/page.module.css";

const vehicleTypeLabel: Record<string, string> = {
  car: "Voiture",
  motorcycle_2_wheels: "Moto",
  motorcycle_3_wheels: "Tricycle",
};

const formatDate = (value?: string | null) => {
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

export default function VehiclesPage() {
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setAppliedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [search]);

  const { data, isFetching, isError, refetch } = useGetAdminVehiclesQuery({
    page,
    limit,
    vehicleType: type || undefined,
    isActive: status === "active" ? "true" : status === "inactive" ? "false" : undefined,
    search: appliedSearch || undefined,
  });

  const vehicles = data?.vehicles ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className={shared.page}>
      <section className={shared.section}>
        <div className={shared.sectionHeader}>
          <div>
            <h2>Véhicules</h2>
            <p className={shared.filterSummary}>
              {total} véhicule{total > 1 ? "s" : ""} enregistré{total > 1 ? "s" : ""}
            </p>
          </div>
          <div className={shared.toolbar}>
            <div className={shared.filterField}>
              <label className={shared.filterLabel} htmlFor="vehicles-search">
                Rechercher
              </label>
              <input
                id="vehicles-search"
                className={shared.filterSearch}
                placeholder="Plaque, marque ou propriétaire"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className={shared.filterField}>
              <label className={shared.filterLabel} htmlFor="vehicles-type">
                Type de véhicule
              </label>
              <select
                id="vehicles-type"
                value={type}
                onChange={(event) => {
                  setType(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">Tous les types</option>
                {Object.entries(vehicleTypeLabel).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className={shared.filterField}>
              <label className={shared.filterLabel} htmlFor="vehicles-status">
                Statut
              </label>
              <select
                id="vehicles-status"
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">Tous</option>
                <option value="active">Actifs</option>
                <option value="inactive">Inactifs</option>
              </select>
            </div>
            {search || type || status ? (
              <button
                type="button"
                className={shared.secondaryButton}
                onClick={() => {
                  setSearch("");
                  setType("");
                  setStatus("");
                  setPage(1);
                }}
              >
                <RotateCcw size={14} aria-hidden="true" />
                Réinitialiser
              </button>
            ) : null}
          </div>
        </div>

        {isError ? (
          <p className={shared.errorText} role="alert">
            Impossible de charger les véhicules.{" "}
            <button type="button" className={shared.secondaryButton} onClick={() => refetch()}>
              Réessayer
            </button>
          </p>
        ) : null}

        <div className={shared.tableWrapper}>
          <table className={shared.table}>
            <thead>
              <tr>
                <th>Véhicule</th>
                <th>Type</th>
                <th>Plaque</th>
                <th>Propriétaire</th>
                <th>Statut</th>
                <th>Enregistré le</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <p className={shared.emptyState}>
                      {isFetching ? "Chargement des véhicules..." : "Aucun véhicule ne correspond à ces filtres."}
                    </p>
                  </td>
                </tr>
              ) : (
                vehicles.map((vehicle) => (
                  <tr key={vehicle.id}>
                    <td>
                      <strong>
                        {vehicle.brand} {vehicle.model}
                      </strong>
                      <div>
                        <small style={{ color: "var(--color-text-muted)" }}>{vehicle.color}</small>
                      </div>
                    </td>
                    <td>{vehicle.type ? (vehicleTypeLabel[vehicle.type] ?? vehicle.type) : "—"}</td>
                    <td>{vehicle.licensePlate}</td>
                    <td>
                      {vehicle.owner ? (
                        <>
                          <a href={`/users?fiche=${encodeURIComponent(vehicle.owner.id)}`}>
                            {vehicle.owner.firstName} {vehicle.owner.lastName}
                          </a>
                          <div>
                            <small style={{ color: "var(--color-text-muted)" }}>
                              {vehicle.owner.phone ?? vehicle.owner.email ?? "—"}
                            </small>
                          </div>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <span
                        className={`${shared.badge} ${
                          vehicle.isActive ? shared.badgeSuccess : shared.badgeWarning
                        }`}
                      >
                        {vehicle.isActive ? "Actif" : "Inactif"}
                      </span>
                    </td>
                    <td>{formatDate(vehicle.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className={shared.pagination}>
          <p className={shared.paginationInfo}>
            Page {page} sur {totalPages} · {total} résultat{total > 1 ? "s" : ""}
          </p>
          <div className={shared.paginationButtons}>
            <button
              type="button"
              className={shared.secondaryButton}
              onClick={() => setPage((value) => Math.max(value - 1, 1))}
              disabled={page === 1 || isFetching}
            >
              Page précédente
            </button>
            <button
              type="button"
              className={shared.secondaryButton}
              onClick={() => setPage((value) => value + 1)}
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
