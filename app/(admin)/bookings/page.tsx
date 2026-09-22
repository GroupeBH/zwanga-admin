"use client";

import { useMemo, useState } from "react";
import { Download, Info } from "lucide-react";

import {
  useAcceptBookingMutation,
  useCancelBookingMutation,
  useGetAllBookingsQuery,
  useRejectBookingMutation,
} from "@/lib/features/bookings/bookingsApi";
import { useExportAdminXlsMutation } from "@/lib/features/admin/exportApi";
import type { BookingStatus } from "@/lib/features/admin/types";
import { getApiErrorMessage } from "@/lib/utils/apiErrors";
import { datedExportName, downloadBlob } from "@/lib/utils/downloadBlob";

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

const formatAmount = (amount?: number | null, currency = "CDF") =>
  amount === null || amount === undefined
    ? "-"
    : new Intl.NumberFormat("fr-CD", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(Number(amount));

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
  const [exportAdminXls, { isLoading: isExporting }] = useExportAdminXlsMutation();
  const [exportError, setExportError] = useState<string | null>(null);

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

  const handleExport = async () => {
    setExportError(null);
    try {
      const blob = await exportAdminXls({
        url: "/admin/bookings/export",
        params: { status: statusFilter },
      }).unwrap();
      downloadBlob(blob, datedExportName("reservations-zwanga"));
    } catch (error) {
      setExportError(
        getApiErrorMessage(error, "Impossible d'exporter les reservations.")
      );
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
            <p className={shared.filterSummary}>
              {allBookings.length} reservation(s) au total •{" "}
              {allBookings.filter((booking) => booking.status === "pending").length} en attente
            </p>
          </div>
          <div className={shared.toolbar}>
            <div className={shared.filterField}>
              <label className={shared.filterLabel} htmlFor="bookings-search">
                Rechercher un passager
              </label>
              <input
                id="bookings-search"
                className={shared.filterSearch}
                placeholder="Nom ou téléphone"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className={shared.filterField}>
              <label className={shared.filterLabel} htmlFor="bookings-status">
                Filtrer par statut
              </label>
              <select
                id="bookings-status"
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setPage(1);
                }}
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
            Une réservation « en attente » attend la réponse du conducteur.
            Les places sont libérées automatiquement lorsqu’elle est rejetée,
            annulée ou expirée.
          </span>
        </p>

        {exportError ? (
          <p className={shared.errorText} role="alert">
            {exportError}
          </p>
        ) : null}

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
                    <th>Paiement</th>
                    <th>Date reservation</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center" }}>
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
                          <td>
                            {booking.paymentStatus ?? "not_required"}
                            <br />
                            <small style={{ color: "var(--color-text-muted)" }}>
                              {formatAmount(
                                booking.paymentAmount,
                                booking.paymentCurrency
                              )}
                            </small>
                          </td>
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
            className={shared.modalBackdrop}
            onClick={() => setSelectedBookingId(null)}
            role="presentation"
          >
            <div
              className={`${shared.card} ${shared.modalCard} ${shared.modalCompact}`}
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="reject-booking-title"
            >
              <h3 id="reject-booking-title">Motif du rejet</h3>
              <textarea
                placeholder="Entrez le motif du rejet (obligatoire)"
                value={rejectReason}
                onChange={(event) => setRejectReason(event.target.value)}
                rows={4}
              />
              <div className={shared.modalActions}>
                <button
                  type="button"
                  className={shared.secondaryButton}
                  onClick={() => {
                    setSelectedBookingId(null);
                    setRejectReason("");
                  }}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  className={shared.dangerButton}
                  onClick={() => handleReject(selectedBookingId)}
                  disabled={isRejecting || !rejectReason.trim()}
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
