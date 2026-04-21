"use client";

import { useMemo, useState } from "react";

import {
  buildTripLifecycleBuckets,
  getTripLifecycleLabel,
  getTripLifecycleStatus,
} from "@/lib/features/admin/insights";
import type { Trip, TripLifecycleStatus, TripStatus } from "@/lib/features/admin/types";
import { useGetAllTripsQuery } from "@/lib/features/trips/tripsApi";

import shared from "../styles/page.module.css";

const backendStatusLabelMap: Record<TripStatus, string> = {
  upcoming: "API: upcoming",
  ongoing: "API: ongoing",
  completed: "API: completed",
  cancelled: "API: cancelled",
};

export default function RidesPage() {
  const { data: trips = [], isFetching } = useGetAllTripsQuery({ page: 1, limit: 100 });
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const lifecycleBuckets = useMemo(() => buildTripLifecycleBuckets(trips), [trips]);

  const filtered = useMemo(() => {
    const searchLower = search.trim().toLowerCase();

    return trips.filter((trip) => {
      const lifecycle = getTripLifecycleStatus(trip);
      const matchesStatus = statusFilter === "all" || lifecycle === statusFilter;
      const matchesSearch =
        searchLower.length === 0 ||
        trip.departureLocation.toLowerCase().includes(searchLower) ||
        trip.arrivalLocation.toLowerCase().includes(searchLower) ||
        trip.driver?.firstName.toLowerCase().includes(searchLower) ||
        trip.driver?.lastName.toLowerCase().includes(searchLower) ||
        trip.driver?.phone.toLowerCase().includes(searchLower);

      return matchesStatus && matchesSearch;
    });
  }, [trips, statusFilter, search]);

  const badgeClass = (status: TripLifecycleStatus) => {
    if (status === "ongoing" || status === "completed") {
      return `${shared.badge} ${shared.badgeSuccess}`;
    }
    if (status === "expired" || status === "cancelled") {
      return `${shared.badge} ${shared.badgeDanger}`;
    }
    return `${shared.badge} ${shared.badgeWarning}`;
  };

  const formatDate = (dateString: string) =>
    new Intl.DateTimeFormat("fr-CD", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateString));

  return (
    <div className={shared.page}>
      <section className={shared.section}>
        <div className={shared.sectionHeader}>
          <div>
            <h2>Gestion des trajets publies</h2>
            <p style={{ margin: 0, color: "var(--color-text-muted)" }}>
              {filtered.length} trajet(s) visibles • lecture admin par cycle de vie
            </p>
          </div>
          <div className={shared.toolbar}>
            <input
              placeholder="Rechercher (lieu, conducteur, telephone)..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">Tous les statuts</option>
              <option value="ongoing">En cours</option>
              <option value="upcoming">A venir</option>
              <option value="completed">Termines</option>
              <option value="expired">Expires</option>
              <option value="cancelled">Annules</option>
            </select>
          </div>
        </div>

        <div className={shared.grid}>
          {lifecycleBuckets.map((bucket) => (
            <article key={bucket.key} className={shared.card}>
              <span style={{ color: "var(--color-text-muted)" }}>{bucket.label}</span>
              <strong style={{ fontSize: "1.6rem" }}>{bucket.count}</strong>
              <small style={{ color: "var(--color-text-muted)" }}>{bucket.helper}</small>
            </article>
          ))}
        </div>

        {isFetching ? (
          <p>Chargement des trajets...</p>
        ) : (
          <div className={shared.tableWrapper}>
            <table className={shared.table}>
              <thead>
                <tr>
                  <th>Conducteur</th>
                  <th>Trajet</th>
                  <th>Publie le</th>
                  <th>Depart</th>
                  <th>Places</th>
                  <th>Prix/place</th>
                  <th>Lecture admin</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((trip) => {
                  const lifecycle = getTripLifecycleStatus(trip);
                  return (
                    <tr key={trip.id}>
                      <td>
                        <strong>
                          {trip.driver
                            ? `${trip.driver.firstName} ${trip.driver.lastName}`
                            : "—"}
                        </strong>
                        <br />
                        <small style={{ color: "var(--color-text-muted)" }}>
                          {trip.driver?.phone ?? "Telephone indisponible"}
                        </small>
                      </td>
                      <td>
                        <strong>{trip.departureLocation}</strong>
                        <br />
                        <small style={{ color: "var(--color-text-muted)" }}>
                          → {trip.arrivalLocation}
                        </small>
                      </td>
                      <td>{formatDate(trip.createdAt)}</td>
                      <td>{formatDate(trip.departureDate)}</td>
                      <td>
                        {trip.availableSeats}
                        {typeof trip.totalSeats === "number" ? ` / ${trip.totalSeats}` : ""}
                      </td>
                      <td>{trip.isFree ? "Gratuit" : `${trip.pricePerSeat} FC`}</td>
                      <td>
                        <span className={badgeClass(lifecycle)}>
                          {getTripLifecycleLabel(lifecycle)}
                        </span>
                        <br />
                        <small style={{ color: "var(--color-text-muted)" }}>
                          {backendStatusLabelMap[trip.status]}
                        </small>
                        {trip.isPrivate ? (
                          <>
                            <br />
                            <small style={{ color: "var(--color-text-muted)" }}>Trajet prive</small>
                          </>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {filtered.length === 0 && !isFetching && (
          <p style={{ textAlign: "center", color: "var(--color-text-muted)" }}>
            Aucun trajet ne correspond aux filtres
          </p>
        )}
      </section>
    </div>
  );
}
