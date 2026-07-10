"use client";

import { FormEvent, useMemo, useState } from "react";

import type { TripPaymentMode, TripRequest, TripRequestStatus } from "@/lib/features/admin/types";
import {
  useDeactivateAdminTripRequestMutation,
  useDeleteAdminTripRequestMutation,
  useGetAllTripRequestsQuery,
  useUpdateAdminTripRequestMutation,
  type UpdateTripRequestPayload,
} from "@/lib/features/tripRequests/tripRequestsApi";

import shared from "../styles/page.module.css";

const statusLabel: Record<TripRequestStatus, string> = {
  pending: "En attente",
  offers_received: "Offres recues",
  driver_selected: "Conducteur choisi",
  cancelled: "Annulee",
  expired: "Expiree",
};

const statusClass = (status: TripRequestStatus) => {
  if (status === "driver_selected") return `${shared.badge} ${shared.badgeSuccess}`;
  if (status === "cancelled" || status === "expired") {
    return `${shared.badge} ${shared.badgeDanger}`;
  }
  return `${shared.badge} ${shared.badgeWarning}`;
};

const formatDate = (dateString: string) =>
  new Intl.DateTimeFormat("fr-CD", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString));

const formatAmount = (amount?: number | null) =>
  amount === null || amount === undefined
    ? "-"
    : new Intl.NumberFormat("fr-CD", {
        style: "currency",
        currency: "CDF",
        maximumFractionDigits: 0,
      }).format(Number(amount));

const toDateInput = (dateString: string) => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
};

export default function TripRequestsPage() {
  const [statusFilter, setStatusFilter] = useState<TripRequestStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedRequest, setSelectedRequest] = useState<TripRequest | null>(null);
  const [requestForm, setRequestForm] = useState<UpdateTripRequestPayload>({});
  const limit = 50;

  const { data, isFetching } = useGetAllTripRequestsQuery({
    page,
    limit,
    status: statusFilter,
  });
  const tripRequests = data?.tripRequests ?? [];

  const [updateTripRequest, { isLoading: isUpdating }] =
    useUpdateAdminTripRequestMutation();
  const [deactivateTripRequest, { isLoading: isDeactivating }] =
    useDeactivateAdminTripRequestMutation();
  const [deleteTripRequest, { isLoading: isDeleting }] =
    useDeleteAdminTripRequestMutation();

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return tripRequests;

    return tripRequests.filter((request) => {
      const passengerName = `${request.passenger.firstName} ${request.passenger.lastName}`.toLowerCase();
      return (
        request.departureLocation.toLowerCase().includes(term) ||
        request.arrivalLocation.toLowerCase().includes(term) ||
        passengerName.includes(term) ||
        request.passenger.phone.includes(term)
      );
    });
  }, [tripRequests, search]);

  const openEditModal = (request: TripRequest) => {
    setSelectedRequest(request);
    setRequestForm({
      departureLocation: request.departureLocation,
      departureReference: request.departureReference ?? "",
      arrivalLocation: request.arrivalLocation,
      arrivalReference: request.arrivalReference ?? "",
      departureDateMin: toDateInput(request.departureDateMin),
      departureDateMax: toDateInput(request.departureDateMax),
      numberOfSeats: request.numberOfSeats,
      maxPricePerSeat: request.maxPricePerSeat,
      paymentMode: request.paymentMode,
      description: request.description ?? "",
    });
  };

  const closeEditModal = () => {
    setSelectedRequest(null);
    setRequestForm({});
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedRequest) return;

    try {
      await updateTripRequest({
        tripRequestId: selectedRequest.id,
        payload: {
          ...requestForm,
          departureDateMin: requestForm.departureDateMin
            ? new Date(requestForm.departureDateMin).toISOString()
            : undefined,
          departureDateMax: requestForm.departureDateMax
            ? new Date(requestForm.departureDateMax).toISOString()
            : undefined,
          numberOfSeats:
            requestForm.numberOfSeats === undefined
              ? undefined
              : Number(requestForm.numberOfSeats),
          maxPricePerSeat:
            requestForm.maxPricePerSeat === null ||
            requestForm.maxPricePerSeat === undefined
              ? null
              : Number(requestForm.maxPricePerSeat),
        },
      }).unwrap();
      closeEditModal();
    } catch (error) {
      console.error("Failed to update trip request:", error);
      alert("Impossible de modifier cette demande de trajet.");
    }
  };

  const handleDeactivate = async (request: TripRequest) => {
    if (!confirm("Desactiver cette demande de trajet ?")) return;
    try {
      await deactivateTripRequest(request.id).unwrap();
    } catch (error) {
      console.error("Failed to deactivate trip request:", error);
      alert("Impossible de desactiver cette demande.");
    }
  };

  const handleDelete = async (request: TripRequest) => {
    if (!confirm("Supprimer definitivement cette demande de trajet ?")) return;
    try {
      await deleteTripRequest(request.id).unwrap();
    } catch (error) {
      console.error("Failed to delete trip request:", error);
      alert("Impossible de supprimer cette demande.");
    }
  };

  return (
    <div className={shared.page}>
      <section className={shared.section}>
        <div className={shared.sectionHeader}>
          <div>
            <h2>Demandes de trajet</h2>
            <p style={{ margin: 0, color: "var(--color-text-muted)" }}>
              {filtered.length} demande(s) visible(s)
            </p>
          </div>
          <div className={shared.toolbar}>
            <input
              placeholder="Rechercher (lieu, passager, telephone)"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as TripRequestStatus | "all");
                setPage(1);
              }}
            >
              <option value="all">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="offers_received">Offres recues</option>
              <option value="driver_selected">Conducteur choisi</option>
              <option value="cancelled">Annulees</option>
              <option value="expired">Expirees</option>
            </select>
          </div>
        </div>

        {isFetching ? (
          <p>Chargement des demandes...</p>
        ) : (
          <div className={shared.tableWrapper}>
            <table className={shared.table}>
              <thead>
                <tr>
                  <th>Passager</th>
                  <th>Demande</th>
                  <th>Fenetre depart</th>
                  <th>Places</th>
                  <th>Prix max</th>
                  <th>Offres</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center" }}>
                      Aucune demande trouvee
                    </td>
                  </tr>
                ) : (
                  filtered.map((request) => (
                    <tr key={request.id}>
                      <td>
                        <strong>
                          {request.passenger.firstName} {request.passenger.lastName}
                        </strong>
                        <br />
                        <small style={{ color: "var(--color-text-muted)" }}>
                          {request.passenger.phone}
                        </small>
                      </td>
                      <td>
                        <strong>{request.departureLocation}</strong>
                        <br />
                        <small style={{ color: "var(--color-text-muted)" }}>
                          -&gt; {request.arrivalLocation}
                        </small>
                      </td>
                      <td>
                        {formatDate(request.departureDateMin)}
                        <br />
                        <small style={{ color: "var(--color-text-muted)" }}>
                          max {formatDate(request.departureDateMax)}
                        </small>
                      </td>
                      <td>{request.numberOfSeats}</td>
                      <td>{formatAmount(request.maxPricePerSeat)}</td>
                      <td>{request.driverOffers.length}</td>
                      <td>
                        <span className={statusClass(request.status)}>
                          {statusLabel[request.status]}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button
                            type="button"
                            className={shared.primaryButton}
                            onClick={() => openEditModal(request)}
                            style={{ fontSize: "0.85rem", padding: "6px 12px" }}
                          >
                            Modifier
                          </button>
                          {request.status !== "cancelled" ? (
                            <button
                              type="button"
                              className={shared.primaryButton}
                              onClick={() => handleDeactivate(request)}
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
                            onClick={() => handleDelete(request)}
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className={shared.pagination}>
          <button
            type="button"
            className={shared.primaryButton}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={isFetching || page === 1}
          >
            Page precedente
          </button>
          <span>
            Page {page} - {data?.total ?? 0} demande(s)
          </span>
          <button
            type="button"
            className={shared.primaryButton}
            onClick={() => setPage((prev) => prev + 1)}
            disabled={isFetching || (data?.total ?? 0) <= page * limit}
          >
            Page suivante
          </button>
        </div>
      </section>

      {selectedRequest ? (
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
            onSubmit={handleSubmit}
            onClick={(event) => event.stopPropagation()}
            style={{ width: "min(760px, 100%)", maxHeight: "90vh", overflowY: "auto" }}
          >
            <h3 style={{ margin: 0 }}>Modifier la demande</h3>
            <div className={shared.grid}>
              <label>
                Depart
                <input
                  value={requestForm.departureLocation ?? ""}
                  onChange={(event) =>
                    setRequestForm((prev) => ({
                      ...prev,
                      departureLocation: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Arrivee
                <input
                  value={requestForm.arrivalLocation ?? ""}
                  onChange={(event) =>
                    setRequestForm((prev) => ({
                      ...prev,
                      arrivalLocation: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Depart minimum
                <input
                  type="datetime-local"
                  value={requestForm.departureDateMin ?? ""}
                  onChange={(event) =>
                    setRequestForm((prev) => ({
                      ...prev,
                      departureDateMin: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Depart maximum
                <input
                  type="datetime-local"
                  value={requestForm.departureDateMax ?? ""}
                  onChange={(event) =>
                    setRequestForm((prev) => ({
                      ...prev,
                      departureDateMax: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Places
                <input
                  type="number"
                  min={1}
                  max={2}
                  value={requestForm.numberOfSeats ?? ""}
                  onChange={(event) =>
                    setRequestForm((prev) => ({
                      ...prev,
                      numberOfSeats: Number(event.target.value),
                    }))
                  }
                />
              </label>
              <label>
                Prix max/place
                <input
                  type="number"
                  min={0}
                  value={requestForm.maxPricePerSeat ?? ""}
                  onChange={(event) =>
                    setRequestForm((prev) => ({
                      ...prev,
                      maxPricePerSeat:
                        event.target.value === "" ? null : Number(event.target.value),
                    }))
                  }
                />
              </label>
              <label>
                Paiement
                <select
                  value={requestForm.paymentMode ?? "cash"}
                  onChange={(event) =>
                    setRequestForm((prev) => ({
                      ...prev,
                      paymentMode: event.target.value as TripPaymentMode,
                    }))
                  }
                >
                  <option value="cash">cash</option>
                  <option value="electronic">electronic</option>
                  <option value="points">points</option>
                </select>
              </label>
            </div>
            <label>
              Description
              <textarea
                rows={3}
                value={requestForm.description ?? ""}
                onChange={(event) =>
                  setRequestForm((prev) => ({
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
