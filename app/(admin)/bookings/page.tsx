"use client";

import { useMemo, useState } from "react";
import {
  useGetAllBookingsQuery,
  useAcceptBookingMutation,
  useRejectBookingMutation,
  useCancelBookingMutation,
} from "@/lib/features/bookings/bookingsApi";
import type { Booking, BookingStatus } from "@/lib/features/admin/types";
import shared from "../styles/page.module.css";

const statusLabel: Record<BookingStatus, string> = {
  pending: "En attente",
  accepted: "Acceptée",
  rejected: "Rejetée",
  cancelled: "Annulée",
  completed: "Terminée",
};

const statusClass = (status: BookingStatus) => {
  if (status === "accepted" || status === "completed")
    return `${shared.badge} ${shared.badgeSuccess}`;
  if (status === "rejected" || status === "cancelled")
    return `${shared.badge} ${shared.badgeDanger}`;
  return `${shared.badge} ${shared.badgeWarning}`;
};

export default function BookingsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const limit = 50;

  const { data: bookingsData, isFetching } = useGetAllBookingsQuery({
    page,
    limit,
    status: statusFilter,
  });
  const allBookings = bookingsData?.bookings ?? [];

  const [acceptBooking, { isLoading: isAccepting }] = useAcceptBookingMutation();
  const [rejectBooking, { isLoading: isRejecting }] = useRejectBookingMutation();
  const [cancelBooking, { isLoading: isCancelling }] = useCancelBookingMutation();

  const filtered = useMemo(() => {
    return allBookings.filter((booking) => {
      const searchTerm = search.toLowerCase();
      const matchesSearch =
        booking.passenger?.firstName.toLowerCase().includes(searchTerm) ||
        booking.passenger?.lastName.toLowerCase().includes(searchTerm) ||
        booking.passenger?.phone.includes(searchTerm);
      return matchesSearch;
    });
  }, [allBookings, search]);

  const handleAccept = async (bookingId: string) => {
    try {
      await acceptBooking(bookingId).unwrap();
      alert("Réservation acceptée avec succès");
    } catch (error) {
      console.error("Failed to accept booking:", error);
      alert("Échec de l'acceptation de la réservation");
    }
  };

  const handleReject = async (bookingId: string) => {
    if (!rejectReason.trim()) {
      alert("Veuillez entrer un motif de rejet");
      return;
    }
    try {
      await rejectBooking({ bookingId, reason: rejectReason }).unwrap();
      setRejectReason("");
      setSelectedBookingId(null);
      alert("Réservation rejetée avec succès");
    } catch (error) {
      console.error("Failed to reject booking:", error);
      alert("Échec du rejet de la réservation");
    }
  };

  const handleCancel = async (bookingId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir annuler cette réservation ?")) {
      return;
    }
    try {
      await cancelBooking(bookingId).unwrap();
      alert("Réservation annulée avec succès");
    } catch (error) {
      console.error("Failed to cancel booking:", error);
      alert("Échec de l'annulation de la réservation");
    }
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
            <h2>Gestion des réservations</h2>
            <p style={{ margin: 0, color: "var(--color-text-muted)" }}>
              {allBookings.length} réservations au total •{" "}
              {allBookings.filter((b) => b.status === "pending").length} en attente
            </p>
          </div>
          <div className={shared.toolbar}>
            <input
              placeholder="Rechercher (passager, téléphone)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="accepted">Acceptées</option>
              <option value="rejected">Rejetées</option>
              <option value="cancelled">Annulées</option>
              <option value="completed">Terminées</option>
            </select>
          </div>
        </div>

        {isFetching ? (
          <p>Chargement des réservations...</p>
        ) : (
          <>
            <div className={shared.tableWrapper}>
              <table className={shared.table}>
                <thead>
                  <tr>
                    <th>Passager</th>
                    <th>Trajet</th>
                    <th>Places</th>
                    <th>Date réservation</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center" }}>
                        Aucune réservation trouvée
                      </td>
                    </tr>
                  ) : (
                    filtered.map((booking) => {
                      const trip = booking.trip;
                      return (
                        <tr key={booking.id}>
                          <td>
                            <strong>
                              {booking.passenger?.firstName}{" "}
                              {booking.passenger?.lastName}
                            </strong>
                            <br />
                            <small style={{ color: "var(--color-text-muted)" }}>
                              {booking.passenger?.phone}
                            </small>
                          </td>
                          <td>
                            {trip ? (
                              <>
                                {trip.departureLocation} → {trip.arrivalLocation}
                                <br />
                                <small style={{ color: "var(--color-text-muted)" }}>
                                  {formatDate(trip.departureDate)}
                                </small>
                              </>
                            ) : (
                              "Trajet non trouvé"
                            )}
                          </td>
                          <td>{booking.numberOfSeats}</td>
                          <td>{formatDate(booking.createdAt)}</td>
                          <td>
                            <span className={statusClass(booking.status)}>
                              {statusLabel[booking.status]}
                            </span>
                            {booking.rejectionReason && (
                              <>
                                <br />
                                <small style={{ color: "var(--color-danger)" }}>
                                  {booking.rejectionReason}
                                </small>
                              </>
                            )}
                          </td>
                          <td>
                            {booking.status === "pending" && (
                              <div style={{ display: "flex", gap: 8 }}>
                                <button
                                  type="button"
                                  className={shared.primaryButton}
                                  onClick={() => handleAccept(booking.id)}
                                  disabled={isAccepting}
                                  style={{ fontSize: "0.85rem", padding: "6px 12px" }}
                                >
                                  Accepter
                                </button>
                                <button
                                  type="button"
                                  className={shared.primaryButton}
                                  onClick={() => setSelectedBookingId(booking.id)}
                                  disabled={isRejecting}
                                  style={{
                                    fontSize: "0.85rem",
                                    padding: "6px 12px",
                                    background: "rgba(255, 75, 85, 0.15)",
                                    color: "var(--color-danger)",
                                  }}
                                >
                                  Rejeter
                                </button>
                              </div>
                            )}
                            {booking.status === "accepted" && (
                              <button
                                type="button"
                                className={shared.primaryButton}
                                onClick={() => handleCancel(booking.id)}
                                disabled={isCancelling}
                                style={{
                                  fontSize: "0.85rem",
                                  padding: "6px 12px",
                                  background: "rgba(255, 75, 85, 0.15)",
                                  color: "var(--color-danger)",
                                }}
                              >
                                Annuler
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className={shared.pagination}>
              <button
                type="button"
                className={shared.primaryButton}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={isFetching || page === 1}
              >
                Page précédente
              </button>
              <span>
                Page {page} • {bookingsData?.total ?? 0} réservations
              </span>
              <button
                type="button"
                className={shared.primaryButton}
                onClick={() => setPage((prev) => prev + 1)}
                disabled={isFetching || (bookingsData?.total ?? 0) <= page * limit}
              >
                Page suivante
              </button>
            </div>
          </>
        )}

        {/* Reject reason modal */}
        {selectedBookingId && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0, 0, 0, 0.7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
            }}
            onClick={() => setSelectedBookingId(null)}
          >
            <div
              className={shared.card}
              style={{ maxWidth: 500, width: "90%" }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3>Motif du rejet</h3>
              <textarea
                placeholder="Entrez le motif du rejet (obligatoire)"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                style={{
                  width: "100%",
                  borderRadius: 16,
                  border: "1px solid var(--color-border)",
                  background: "transparent",
                  color: "var(--color-text)",
                  padding: "12px 14px",
                  marginBottom: 16,
                }}
              />
              <div className={shared.toolbar}>
                <button
                  type="button"
                  className={shared.primaryButton}
                  onClick={() => {
                    setSelectedBookingId(null);
                    setRejectReason("");
                  }}
                  style={{
                    background: "rgba(255, 255, 255, 0.1)",
                  }}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  className={shared.primaryButton}
                  onClick={() => handleReject(selectedBookingId)}
                  disabled={isRejecting || !rejectReason.trim()}
                  style={{
                    background: "rgba(255, 75, 85, 0.15)",
                    color: "var(--color-danger)",
                  }}
                >
                  {isRejecting ? "Rejet..." : "Confirmer le rejet"}
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

