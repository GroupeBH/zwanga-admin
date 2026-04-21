"use client";

import { useMemo, useState } from "react";

import {
  useAcceptBookingMutation,
  useCancelBookingMutation,
  useGetAllBookingsQuery,
  useRejectBookingMutation,
} from "@/lib/features/bookings/bookingsApi";
import type { BookingStatus } from "@/lib/features/admin/types";

import shared from "../styles/page.module.css";

const statusLabel: Record<BookingStatus, string> = {
  pending: "En attente",
  accepted: "Acceptee",
  rejected: "Rejetee",
  cancelled: "Annulee",
  completed: "Terminee",
  expired: "Expiree",
};

const statusClass = (status: BookingStatus) => {
  if (status === "accepted" || status === "completed") {
    return `${shared.badge} ${shared.badgeSuccess}`;
  }
  if (status === "rejected" || status === "cancelled" || status === "expired") {
    return `${shared.badge} ${shared.badgeDanger}`;
  }
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
    const searchTerm = search.trim().toLowerCase();
    return allBookings.filter((booking) => {
      if (searchTerm.length === 0) {
        return true;
      }

      return (
        booking.passenger?.firstName.toLowerCase().includes(searchTerm) ||
        booking.passenger?.lastName.toLowerCase().includes(searchTerm) ||
        booking.passenger?.phone.includes(searchTerm)
      );
    });
  }, [allBookings, search]);

  const handleAccept = async (bookingId: string) => {
    try {
      await acceptBooking(bookingId).unwrap();
      alert("Reservation acceptee avec succes");
    } catch (error) {
      console.error("Failed to accept booking:", error);
      alert("Echec de l'acceptation de la reservation");
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
      alert("Reservation rejetee avec succes");
    } catch (error) {
      console.error("Failed to reject booking:", error);
      alert("Echec du rejet de la reservation");
    }
  };

  const handleCancel = async (bookingId: string) => {
    if (!confirm("Etes-vous sur de vouloir annuler cette reservation ?")) {
      return;
    }

    try {
      await cancelBooking(bookingId).unwrap();
      alert("Reservation annulee avec succes");
    } catch (error) {
      console.error("Failed to cancel booking:", error);
      alert("Echec de l'annulation de la reservation");
    }
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
            <h2>Gestion des reservations</h2>
            <p style={{ margin: 0, color: "var(--color-text-muted)" }}>
              {allBookings.length} reservation(s) au total •{" "}
              {allBookings.filter((booking) => booking.status === "pending").length} en attente
            </p>
          </div>
          <div className={shared.toolbar}>
            <input
              placeholder="Rechercher (passager, telephone)"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="accepted">Acceptees</option>
              <option value="rejected">Rejetees</option>
              <option value="cancelled">Annulees</option>
              <option value="completed">Terminees</option>
              <option value="expired">Expirees</option>
            </select>
          </div>
        </div>

        {isFetching ? (
          <p>Chargement des reservations...</p>
        ) : (
          <>
            <div className={shared.tableWrapper}>
              <table className={shared.table}>
                <thead>
                  <tr>
                    <th>Passager</th>
                    <th>Trajet</th>
                    <th>Places</th>
                    <th>Date reservation</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center" }}>
                        Aucune reservation trouvee
                      </td>
                    </tr>
                  ) : (
                    filtered.map((booking) => {
                      const trip = booking.trip;
                      return (
                        <tr key={booking.id}>
                          <td>
                            <strong>
                              {booking.passenger?.firstName} {booking.passenger?.lastName}
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
                              "Trajet non trouve"
                            )}
                          </td>
                          <td>{booking.numberOfSeats}</td>
                          <td>{formatDate(booking.createdAt)}</td>
                          <td>
                            <span className={statusClass(booking.status)}>
                              {statusLabel[booking.status]}
                            </span>
                            {booking.rejectionReason ? (
                              <>
                                <br />
                                <small style={{ color: "var(--color-danger)" }}>
                                  {booking.rejectionReason}
                                </small>
                              </>
                            ) : null}
                          </td>
                          <td>
                            {booking.status === "pending" ? (
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
                            ) : null}
                            {booking.status === "accepted" ? (
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
                            ) : null}
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
                Page precedente
              </button>
              <span>
                Page {page} • {bookingsData?.total ?? 0} reservation(s)
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

        {selectedBookingId ? (
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
              onClick={(event) => event.stopPropagation()}
            >
              <h3>Motif du rejet</h3>
              <textarea
                placeholder="Entrez le motif du rejet (obligatoire)"
                value={rejectReason}
                onChange={(event) => setRejectReason(event.target.value)}
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
                  style={{ background: "rgba(255, 255, 255, 0.1)" }}
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
        ) : null}
      </section>
    </div>
  );
}
