"use client";

import { FormEvent, useMemo, useState } from "react";

import {
  buildTripLifecycleBuckets,
  getTripLifecycleLabel,
  getTripLifecycleStatus,
} from "@/lib/features/admin/insights";
import type { Trip, TripLifecycleStatus, TripStatus } from "@/lib/features/admin/types";
import {
  useDeactivateAdminTripMutation,
  useDeleteAdminTripMutation,
  useGetAllTripsQuery,
  useUpdateAdminTripMutation,
  type UpdateTripPayload,
} from "@/lib/features/trips/tripsApi";
import { getApiErrorMessage, getApiErrorStatus } from "@/lib/utils/apiErrors";

import shared from "../styles/page.module.css";

const backendStatusLabelMap: Record<TripStatus, string> = {
  upcoming: "API: upcoming",
  ongoing: "API: ongoing",
  completed: "API: completed",
  cancelled: "API: cancelled",
};

export default function RidesPage() {
  const { data: trips = [], isFetching, error } = useGetAllTripsQuery({ page: 1, limit: 100 });
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [tripForm, setTripForm] = useState<UpdateTripPayload>({});
  const [updateTrip, { isLoading: isUpdating }] = useUpdateAdminTripMutation();
  const [deactivateTrip, { isLoading: isDeactivating }] = useDeactivateAdminTripMutation();
  const [deleteTrip, { isLoading: isDeleting }] = useDeleteAdminTripMutation();
  const errorStatus = getApiErrorStatus(error);
  const errorMessage = error
    ? getApiErrorMessage(
        error,
        errorStatus === 401 || errorStatus === 403
          ? "Le compte connecte n'a pas les droits admin necessaires pour lire les trajets."
          : "Impossible de charger les trajets depuis le backend."
      )
    : null;

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

  const toDateInput = (dateString: string) => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString().slice(0, 16);
  };

  const openEditModal = (trip: Trip) => {
    setSelectedTrip(trip);
    setTripForm({
      departureLocation: trip.departureLocation,
      arrivalLocation: trip.arrivalLocation,
      departureDate: toDateInput(trip.departureDate),
      totalSeats: trip.totalSeats ?? trip.availableSeats,
      pricePerSeat: Number(trip.pricePerSeat ?? 0),
      isFree: Boolean(trip.isFree),
      description: trip.description ?? "",
      status: trip.status,
    });
  };

  const closeEditModal = () => {
    setSelectedTrip(null);
    setTripForm({});
  };

  const handleSubmitTrip = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedTrip) return;

    try {
      await updateTrip({
        tripId: selectedTrip.id,
        payload: {
          ...tripForm,
          departureDate: tripForm.departureDate
            ? new Date(tripForm.departureDate).toISOString()
            : undefined,
          totalSeats:
            tripForm.totalSeats === undefined ? undefined : Number(tripForm.totalSeats),
          pricePerSeat: tripForm.isFree ? 0 : Number(tripForm.pricePerSeat ?? 0),
        },
      }).unwrap();
      closeEditModal();
    } catch (submitError) {
      console.error("Failed to update trip:", submitError);
      alert("Impossible de modifier ce trajet.");
    }
  };

  const handleDeactivateTrip = async (trip: Trip) => {
    if (!confirm("Desactiver ce trajet ? Il passera au statut annule.")) return;
    try {
      await deactivateTrip(trip.id).unwrap();
    } catch (deactivateError) {
      console.error("Failed to deactivate trip:", deactivateError);
      alert("Impossible de desactiver ce trajet.");
    }
  };

  const handleDeleteTrip = async (trip: Trip) => {
    if (!confirm("Supprimer definitivement ce trajet ?")) return;
    try {
      await deleteTrip(trip.id).unwrap();
    } catch (deleteError) {
      console.error("Failed to delete trip:", deleteError);
      alert("Impossible de supprimer ce trajet.");
    }
  };

  return (
    <div className={shared.page}>
      <section className={shared.section}>
        <div className={shared.sectionHeader}>
          <div>
            <h2>Gestion des trajets publies</h2>
            <p style={{ margin: 0, color: "var(--color-text-muted)" }}>
              {filtered.length} trajet(s) visibles - lecture admin par cycle de vie
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

        {!error ? (
          <div className={shared.grid}>
            {lifecycleBuckets.map((bucket) => (
              <article key={bucket.key} className={shared.card}>
                <span style={{ color: "var(--color-text-muted)" }}>{bucket.label}</span>
                <strong style={{ fontSize: "1.6rem" }}>{bucket.count}</strong>
                <small style={{ color: "var(--color-text-muted)" }}>{bucket.helper}</small>
              </article>
            ))}
          </div>
        ) : null}

        {isFetching ? (
          <p>Chargement des trajets...</p>
        ) : errorMessage ? (
          <p
            style={{
              padding: "1rem 1.2rem",
              borderRadius: "0.9rem",
              border: "1px solid rgba(255, 163, 26, 0.35)",
              background: "rgba(255, 163, 26, 0.08)",
              color: "var(--color-text)",
            }}
          >
            {errorMessage}
          </p>
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
                  <th>Actions</th>
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
                            : "-"}
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
                          -&gt; {trip.arrivalLocation}
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
                      <td>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button
                            type="button"
                            className={shared.primaryButton}
                            onClick={() => openEditModal(trip)}
                            style={{ fontSize: "0.85rem", padding: "6px 12px" }}
                          >
                            Modifier
                          </button>
                          {trip.status !== "cancelled" ? (
                            <button
                              type="button"
                              className={shared.primaryButton}
                              onClick={() => handleDeactivateTrip(trip)}
                              disabled={isDeactivating}
                              style={{
                                fontSize: "0.85rem",
                                padding: "6px 12px",
                                background: "rgba(255, 208, 71, 0.14)",
                                color: "var(--color-warning)",
                              }}
                            >
                              Desactiver
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className={shared.primaryButton}
                            onClick={() => handleDeleteTrip(trip)}
                            disabled={isDeleting}
                            style={{
                              fontSize: "0.85rem",
                              padding: "6px 12px",
                              background: "rgba(255, 75, 85, 0.15)",
                              color: "var(--color-danger)",
                            }}
                          >
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {filtered.length === 0 && !isFetching && !error && (
          <p style={{ textAlign: "center", color: "var(--color-text-muted)" }}>
            Aucun trajet ne correspond aux filtres
          </p>
        )}
      </section>

      {selectedTrip ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.72)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 16,
          }}
          onClick={closeEditModal}
        >
          <form
            className={shared.card}
            onSubmit={handleSubmitTrip}
            onClick={(event) => event.stopPropagation()}
            style={{ width: "min(720px, 100%)", maxHeight: "90vh", overflowY: "auto" }}
          >
            <h3 style={{ margin: 0 }}>Modifier le trajet</h3>
            <div className={shared.grid}>
              <label>
                Depart
                <input
                  value={tripForm.departureLocation ?? ""}
                  onChange={(event) =>
                    setTripForm((prev) => ({
                      ...prev,
                      departureLocation: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Arrivee
                <input
                  value={tripForm.arrivalLocation ?? ""}
                  onChange={(event) =>
                    setTripForm((prev) => ({
                      ...prev,
                      arrivalLocation: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Date depart
                <input
                  type="datetime-local"
                  value={tripForm.departureDate ?? ""}
                  onChange={(event) =>
                    setTripForm((prev) => ({
                      ...prev,
                      departureDate: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Places totales
                <input
                  type="number"
                  min={1}
                  value={tripForm.totalSeats ?? ""}
                  onChange={(event) =>
                    setTripForm((prev) => ({
                      ...prev,
                      totalSeats: Number(event.target.value),
                    }))
                  }
                />
              </label>
              <label>
                Prix/place
                <input
                  type="number"
                  min={0}
                  value={tripForm.pricePerSeat ?? 0}
                  disabled={Boolean(tripForm.isFree)}
                  onChange={(event) =>
                    setTripForm((prev) => ({
                      ...prev,
                      pricePerSeat: Number(event.target.value),
                    }))
                  }
                />
              </label>
              <label>
                Statut
                <select
                  value={tripForm.status ?? "upcoming"}
                  onChange={(event) =>
                    setTripForm((prev) => ({
                      ...prev,
                      status: event.target.value as TripStatus,
                    }))
                  }
                >
                  <option value="upcoming">upcoming</option>
                  <option value="ongoing">ongoing</option>
                  <option value="completed">completed</option>
                  <option value="cancelled">cancelled</option>
                </select>
              </label>
            </div>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={Boolean(tripForm.isFree)}
                onChange={(event) =>
                  setTripForm((prev) => ({
                    ...prev,
                    isFree: event.target.checked,
                    pricePerSeat: event.target.checked ? 0 : prev.pricePerSeat,
                  }))
                }
              />
              Trajet gratuit
            </label>
            <label>
              Description
              <textarea
                rows={3}
                value={tripForm.description ?? ""}
                onChange={(event) =>
                  setTripForm((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
              />
            </label>
            <div className={shared.toolbar} style={{ justifyContent: "flex-end" }}>
              <button
                type="button"
                className={shared.primaryButton}
                onClick={closeEditModal}
                style={{ background: "rgba(255, 255, 255, 0.1)", color: "var(--color-text)" }}
              >
                Annuler
              </button>
              <button type="submit" className={shared.primaryButton} disabled={isUpdating}>
                {isUpdating ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
