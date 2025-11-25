"use client";

import { useMemo, useState } from "react";
import { useGetAllTripsQuery } from "@/lib/features/trips/tripsApi";
import type { Trip, TripStatus } from "@/lib/features/admin/types";

import shared from "../styles/page.module.css";

const statusLabelMap: Record<TripStatus, string> = {
  upcoming: "À venir",
  ongoing: "En cours",
  completed: "Terminé",
  cancelled: "Annulé",
};

export default function RidesPage() {
  const { data: trips = [], isFetching } = useGetAllTripsQuery({ page: 1, limit: 100 });
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return trips.filter((trip) => {
      const matchesStatus = statusFilter === "all" || trip.status === statusFilter;
      const searchLower = search.toLowerCase();
      const matchesSearch =
        search.trim().length === 0 ||
        trip.departureLocation.toLowerCase().includes(searchLower) ||
        trip.arrivalLocation.toLowerCase().includes(searchLower) ||
        trip.driver?.firstName.toLowerCase().includes(searchLower) ||
        trip.driver?.lastName.toLowerCase().includes(searchLower);
      return matchesStatus && matchesSearch;
    });
  }, [trips, statusFilter, search]);

  const badgeClass = (status: TripStatus) => {
    if (status === "upcoming") return `${shared.badge} ${shared.badgeWarning}`;
    if (status === "ongoing") return `${shared.badge} ${shared.badgeSuccess}`;
    if (status === "completed") return `${shared.badge}`;
    return `${shared.badge} ${shared.badgeDanger}`;
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat("fr-CD", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateString));
  };

  return (
    <div className={shared.page}>
      <section className={shared.section}>
        <div className={shared.sectionHeader}>
          <div>
            <h2>Gestion des trajets</h2>
            <p style={{ margin: 0, color: "var(--color-text-muted)" }}>
              {filtered.length} trajets • Monitoring temps réel
            </p>
          </div>
          <div className={shared.toolbar}>
            <input
              placeholder="Rechercher (lieu, conducteur)..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">Tous les statuts</option>
              <option value="upcoming">À venir</option>
              <option value="ongoing">En cours</option>
              <option value="completed">Terminés</option>
              <option value="cancelled">Annulés</option>
            </select>
          </div>
        </div>

        {isFetching ? (
          <p>Chargement des trajets...</p>
        ) : (
          <div className={shared.tableWrapper}>
            <table className={shared.table}>
              <thead>
                <tr>
                  <th>Conducteur</th>
                  <th>Départ → Arrivée</th>
                  <th>Date départ</th>
                  <th>Places</th>
                  <th>Prix/place</th>
                  <th>Réservations</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((trip) => (
                  <tr key={trip.id}>
                    <td>
                      <strong>
                        {trip.driver
                          ? `${trip.driver.firstName} ${trip.driver.lastName}`
                          : "—"}
                      </strong>
                      <br />
                      <small style={{ color: "var(--color-text-muted)" }}>
                        {trip.driver?.phone}
                      </small>
                    </td>
                    <td>
                      <strong>{trip.departureLocation}</strong>
                      <br />
                      <small style={{ color: "var(--color-text-muted)" }}>
                        → {trip.arrivalLocation}
                      </small>
                    </td>
                    <td>{formatDate(trip.departureDate)}</td>
                    <td>{trip.availableSeats}</td>
                    <td>{trip.pricePerSeat} FC</td>
                    <td>
                      {trip.bookings?.length ?? 0} réservation(s)
                      <br />
                      <small style={{ color: "var(--color-text-muted)" }}>
                        {trip.bookings?.filter((b) => b.status === "accepted").length ?? 0}{" "}
                        acceptée(s)
                      </small>
                    </td>
                    <td>
                      <span className={badgeClass(trip.status)}>
                        {statusLabelMap[trip.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filtered.length === 0 && !isFetching && (
          <p style={{ textAlign: "center", color: "var(--color-text-muted)" }}>
            Aucun trajet trouvé
          </p>
        )}
      </section>
    </div>
  );
}
