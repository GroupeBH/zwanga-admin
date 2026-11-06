"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Info } from "lucide-react";

import {
  useAcceptBookingMutation,
  useCancelBookingMutation,
  useGetAllBookingsQuery,
  useRejectBookingMutation,
} from "@/lib/features/bookings/bookingsApi";
import { useExportAdminXlsMutation } from "@/lib/features/admin/exportApi";
import type { Booking, BookingPaymentStatus, BookingStatus } from "@/lib/features/admin/types";
import { getApiErrorMessage } from "@/lib/utils/apiErrors";
import { datedExportName, downloadBlob } from "@/lib/utils/downloadBlob";
import { bulkSummary, runBulk } from "@/lib/utils/runBulk";
import { useUrlState } from "@/lib/utils/useUrlState";
import { BulkBar, DataTable, type DataColumn } from "@/app/components/ui/DataTable";
import { confirmAction, notify, promptText } from "@/app/components/ui/Feedback";
import { Pagination } from "@/app/components/ui/Pagination";

import shared from "../styles/page.module.css";

const statusLabel: Record<BookingStatus, string> = {
  pending: "En attente",
  accepted: "Acceptée",
  rejected: "Rejetée",
  cancelled: "Annulée",
  completed: "Terminée",
  expired: "Expirée",
};

const paymentLabel: Record<BookingPaymentStatus, string> = {
  not_required: "Sans paiement en ligne",
  pending: "Paiement en attente",
  initiated: "Paiement lancé",
  succeeded: "Payé",
  failed: "Paiement échoué",
  cancelled: "Paiement annulé",
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
    ? "—"
    : new Intl.NumberFormat("fr-CD", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(Number(amount));

const formatDate = (dateString: string) =>
  new Intl.DateTimeFormat("fr-CD", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString));

const passengerName = (booking: Booking) =>
  booking.passenger
    ? `${booking.passenger.firstName} ${booking.passenger.lastName}`.trim()
    : "Passager supprimé";

const LIMIT = 50;

export default function BookingsPage() {
  const [statusFilter, setStatusFilter] = useUrlState<string>("statut", "all");
  const [search, setSearch] = useUrlState<string>("q", "");
  const [page, setPage] = useUrlState<number>("page", 1);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const { data: bookingsData, isFetching, isLoading, isError, error } = useGetAllBookingsQuery({
    page,
    limit: LIMIT,
    status: statusFilter,
  });
  const allBookings = useMemo(() => bookingsData?.bookings ?? [], [bookingsData]);
  const total = bookingsData?.total ?? null;

  const [acceptBooking, { isLoading: isAccepting }] = useAcceptBookingMutation();
  const [rejectBooking, { isLoading: isRejecting }] = useRejectBookingMutation();
  const [cancelBooking, { isLoading: isCancelling }] = useCancelBookingMutation();
  const [exportAdminXls, { isLoading: isExporting }] = useExportAdminXlsMutation();
  const [exportError, setExportError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();
    if (!searchTerm) return allBookings;
    return allBookings.filter(
      (booking) =>
        booking.passenger?.firstName.toLowerCase().includes(searchTerm) ||
        booking.passenger?.lastName.toLowerCase().includes(searchTerm) ||
        booking.passenger?.phone.includes(searchTerm)
    );
  }, [allBookings, search]);

  useEffect(() => {
    setChecked(new Set());
  }, [page, statusFilter]);

  const pendingOnPage = allBookings.filter((booking) => booking.status === "pending").length;
  const checkedBookings = filtered.filter((booking) => checked.has(booking.id));
  const checkedPending = checkedBookings.filter((booking) => booking.status === "pending");

  const handleAccept = async (booking: Booking) => {
    try {
      await acceptBooking(booking.id).unwrap();
      notify(`Réservation de ${passengerName(booking)} acceptée.`, "success");
    } catch (failure) {
      notify(getApiErrorMessage(failure, "Échec de l’acceptation de la réservation."), "error");
    }
  };

  const handleReject = async (booking: Booking) => {
    const reason = await promptText({
      title: "Rejeter cette réservation ?",
      message: `${passengerName(booking)} · ${booking.numberOfSeats} place(s). Le passager verra ce motif et les places seront libérées.`,
      label: "Motif du rejet (obligatoire)",
      confirmLabel: "Rejeter",
      tone: "danger",
    });
    if (!reason) return;
    try {
      await rejectBooking({ bookingId: booking.id, reason }).unwrap();
      notify("Réservation rejetée.", "success");
    } catch (failure) {
      notify(getApiErrorMessage(failure, "Échec du rejet de la réservation."), "error");
    }
  };

  const handleCancel = async (booking: Booking) => {
    const confirmed = await confirmAction({
      title: "Annuler cette réservation ?",
      message: `${passengerName(booking)} · ${booking.numberOfSeats} place(s). Les places seront libérées pour d’autres passagers.`,
      confirmLabel: "Annuler la réservation",
      cancelLabel: "Garder",
      tone: "danger",
    });
    if (!confirmed) return;
    try {
      await cancelBooking(booking.id).unwrap();
      notify("Réservation annulée.", "success");
    } catch (failure) {
      notify(getApiErrorMessage(failure, "Échec de l’annulation de la réservation."), "error");
    }
  };

  const bulk = async (kind: "accept" | "reject") => {
    if (!checkedPending.length) return;
    let reason = "";
    if (kind === "reject") {
      const answer = await promptText({
        title: `Rejeter ${checkedPending.length} réservation(s) ?`,
        message: "Le même motif sera envoyé à chaque passager concerné.",
        label: "Motif du rejet (obligatoire)",
        confirmLabel: "Rejeter",
        tone: "danger",
      });
      if (!answer) return;
      reason = answer;
    } else if (
      !(await confirmAction({
        title: `Accepter ${checkedPending.length} réservation(s) ?`,
        message: "Chaque passager sera notifié et ses places réservées.",
        confirmLabel: "Accepter",
      }))
    ) {
      return;
    }
    const result = await runBulk(
      checkedPending,
      (booking) =>
        kind === "accept"
          ? acceptBooking(booking.id).unwrap()
          : rejectBooking({ bookingId: booking.id, reason }).unwrap(),
      (done, count) => setProgress({ done, total: count })
    );
    setProgress(null);
    setChecked(new Set(result.failed.map(({ item }) => item.id)));
    notify(
      bulkSummary(result.succeeded, result.failed.length, "réservation"),
      result.failed.length ? "error" : "success"
    );
  };

  const handleExport = async () => {
    setExportError(null);
    try {
      const blob = await exportAdminXls({
        url: "/admin/bookings/export",
        params: { status: statusFilter },
      }).unwrap();
      downloadBlob(blob, datedExportName("reservations-zwanga"));
    } catch (failure) {
      setExportError(getApiErrorMessage(failure, "Impossible d’exporter les réservations."));
    }
  };

  const columns: DataColumn<Booking>[] = [
    {
      key: "passenger",
      header: "Passager",
      sortValue: passengerName,
      cell: (booking) => (
        <>
          <strong>{passengerName(booking)}</strong>
          <br />
          <small className={shared.mutedText}>{booking.passenger?.phone}</small>
        </>
      ),
    },
    {
      key: "trip",
      header: "Trajet",
      sortValue: (booking) => booking.trip?.departureDate,
      cell: (booking) =>
        booking.trip ? (
          <>
            {booking.trip.departureLocation} → {booking.trip.arrivalLocation}
            <br />
            <small className={shared.mutedText}>Départ {formatDate(booking.trip.departureDate)}</small>
          </>
        ) : (
          <span className={shared.mutedText}>Trajet introuvable</span>
        ),
    },
    {
      key: "seats",
      header: "Places",
      align: "right",
      sortValue: (booking) => booking.numberOfSeats,
      cell: (booking) => booking.numberOfSeats,
    },
    {
      key: "payment",
      header: "Paiement",
      sortValue: (booking) => booking.paymentAmount ?? null,
      cell: (booking) => (
        <>
          {paymentLabel[booking.paymentStatus ?? "not_required"] ?? booking.paymentStatus}
          <br />
          <small className={shared.mutedText}>
            {formatAmount(booking.paymentAmount, booking.paymentCurrency)}
          </small>
        </>
      ),
    },
    {
      key: "createdAt",
      header: "Réservée le",
      sortValue: (booking) => booking.createdAt,
      cell: (booking) => formatDate(booking.createdAt),
    },
    {
      key: "status",
      header: "Statut",
      sortValue: (booking) => statusLabel[booking.status],
      cell: (booking) => (
        <>
          <span className={statusClass(booking.status)}>{statusLabel[booking.status]}</span>
          {booking.rejectionReason ? (
            <>
              <br />
              <small style={{ color: "var(--color-danger)" }}>{booking.rejectionReason}</small>
            </>
          ) : null}
        </>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (booking) =>
        booking.status === "pending" ? (
          <div className={shared.rowActions}>
            <button
              type="button"
              className={shared.secondaryButton}
              onClick={() => void handleAccept(booking)}
              disabled={isAccepting}
            >
              Accepter
            </button>
            <button
              type="button"
              className={shared.dangerButton}
              onClick={() => void handleReject(booking)}
              disabled={isRejecting}
            >
              Rejeter
            </button>
          </div>
        ) : booking.status === "accepted" ? (
          <button
            type="button"
            className={shared.dangerButton}
            onClick={() => void handleCancel(booking)}
            disabled={isCancelling}
          >
            Annuler
          </button>
        ) : null,
    },
  ];

  return (
    <div className={shared.page}>
      <section className={shared.section}>
        <div className={shared.sectionHeader}>
          <div>
            <h1>Réservations</h1>
            <p className={shared.filterSummary}>
              {total !== null ? `${total} réservation${total > 1 ? "s" : ""} au total · ` : ""}
              {pendingOnPage} en attente sur cette page
            </p>
          </div>
          <div className={shared.toolbar}>
            <div className={shared.filterField}>
              <label className={shared.filterLabel} htmlFor="bookings-search">
                Rechercher un passager (page affichée)
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
                {(Object.keys(statusLabel) as BookingStatus[]).map((status) => (
                  <option key={status} value={status}>
                    {statusLabel[status]}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className={shared.primaryButton}
              onClick={handleExport}
              disabled={isExporting}
            >
              <Download size={16} aria-hidden="true" />
              {isExporting ? "Export…" : "Exporter XLS"}
            </button>
          </div>
        </div>

        <p className={shared.helpText}>
          <Info size={16} aria-hidden="true" />
          <span>
            Une réservation « en attente » attend la réponse du conducteur. Les places
            sont libérées automatiquement lorsqu’elle est rejetée, annulée ou expirée.
            Cochez plusieurs réservations en attente pour les accepter ou les rejeter
            ensemble ; cliquez sur un en-tête pour trier la page.
          </span>
        </p>

        {exportError || isError ? (
          <p className={shared.errorText} role="alert">
            {exportError ?? getApiErrorMessage(error, "Impossible de charger les réservations.")}
          </p>
        ) : null}

        <BulkBar count={checked.size} onClear={() => setChecked(new Set())} progress={progress}>
          <button
            type="button"
            className={shared.secondaryButton}
            onClick={() => void bulk("accept")}
            disabled={!checkedPending.length}
          >
            Accepter ({checkedPending.length})
          </button>
          <button
            type="button"
            className={shared.dangerButton}
            onClick={() => void bulk("reject")}
            disabled={!checkedPending.length}
          >
            Rejeter ({checkedPending.length})
          </button>
          {checkedPending.length < checked.size ? (
            <span className={shared.mutedText} style={{ alignSelf: "center", fontSize: "0.8rem" }}>
              Seules les réservations en attente sont concernées.
            </span>
          ) : null}
        </BulkBar>

        <DataTable
          caption="Réservations"
          rows={filtered}
          columns={columns}
          rowKey={(booking) => booking.id}
          loading={isLoading}
          refreshing={isFetching && !isLoading}
          selected={checked}
          onSelectedChange={setChecked}
          empty={
            search.trim()
              ? "Aucune réservation de cette page ne correspond à la recherche."
              : "Aucune réservation pour ce filtre."
          }
        />

        <Pagination
          page={page}
          limit={LIMIT}
          total={total}
          pageCount={allBookings.length}
          onChange={setPage}
          disabled={isFetching}
          noun="réservations"
        />
      </section>
    </div>
  );
}
