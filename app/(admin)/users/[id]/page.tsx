"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import {
  useActivateUserMutation,
  useDeactivateUserMutation,
  useGetUserDetailsQuery,
} from "@/lib/features/users/usersApi";
import type {
  Booking,
  PaymentTransaction,
  Trip,
  TripRequest,
} from "@/lib/features/admin/types";

import shared from "../../styles/page.module.css";

const formatDate = (dateString?: string | null) => {
  if (!dateString) return "-";
  return new Intl.DateTimeFormat("fr-CD", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString));
};

const formatAmount = (amount?: number | null, currency = "CDF") =>
  new Intl.NumberFormat("fr-CD", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(amount ?? 0));

const statusBadge = (status: string) => {
  if (["active", "accepted", "completed", "succeeded", "driver_selected"].includes(status)) {
    return `${shared.badge} ${shared.badgeSuccess}`;
  }
  if (["suspended", "cancelled", "rejected", "failed", "expired"].includes(status)) {
    return `${shared.badge} ${shared.badgeDanger}`;
  }
  return `${shared.badge} ${shared.badgeWarning}`;
};

export default function UserDetailsPage() {
  const params = useParams<{ id: string }>();
  const userId = params.id;
  const { data, isFetching, error } = useGetUserDetailsQuery(userId, {
    skip: !userId,
  });
  const [deactivateUser, { isLoading: isDeactivating }] = useDeactivateUserMutation();
  const [activateUser, { isLoading: isActivating }] = useActivateUserMutation();

  const handleDeactivate = async () => {
    if (!data?.user || !confirm("Desactiver ce compte utilisateur ?")) return;
    await deactivateUser(data.user.id).unwrap();
  };

  const handleActivate = async () => {
    if (!data?.user) return;
    await activateUser(data.user.id).unwrap();
  };

  if (isFetching) {
    return (
      <div className={shared.page}>
        <section className={shared.section}>Chargement du dossier utilisateur...</section>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={shared.page}>
        <section className={shared.section}>
          <h2>Dossier utilisateur</h2>
          <p>Impossible de charger les details de cet utilisateur.</p>
          <Link href="/users" className={shared.primaryButton}>
            Retour utilisateurs
          </Link>
        </section>
      </div>
    );
  }

  const { user, stats } = data;

  return (
    <div className={shared.page}>
      <section className={shared.section}>
        <div className={shared.sectionHeader}>
          <div>
            <Link href="/users" style={{ color: "var(--color-text-muted)" }}>
              Retour utilisateurs
            </Link>
            <h2>
              {user.firstName} {user.lastName}
            </h2>
            <p style={{ margin: 0, color: "var(--color-text-muted)" }}>
              {user.email ?? "Email absent"} - {user.phone}
            </p>
          </div>
          <div className={shared.toolbar}>
            <span className={statusBadge(user.status)}>{user.status}</span>
            {user.status === "suspended" ? (
              <button
                type="button"
                className={shared.primaryButton}
                onClick={handleActivate}
                disabled={isActivating}
              >
                Reactiver
              </button>
            ) : (
              <button
                type="button"
                className={shared.primaryButton}
                onClick={handleDeactivate}
                disabled={isDeactivating}
                style={{
                  background: "rgba(255, 75, 85, 0.16)",
                  color: "var(--color-danger)",
                }}
              >
                Desactiver
              </button>
            )}
          </div>
        </div>

        <div className={shared.grid}>
          <Metric label="Trajets publies" value={stats.trips} />
          <Metric label="Reservations faites" value={stats.bookingsAsPassenger} />
          <Metric label="Reservations recues" value={stats.bookingsAsDriver} />
          <Metric label="Paiements effectues" value={stats.payments} />
          <Metric
            label="Montant reussi"
            value={formatAmount(stats.succeededPaymentsAmount)}
          />
        </div>
      </section>

      <TripsSection trips={data.trips} />
      <BookingsSection title="Reservations comme passager" bookings={data.bookingsAsPassenger} />
      <BookingsSection title="Reservations recues comme conducteur" bookings={data.bookingsAsDriver} />
      <PaymentsSection payments={data.payments} />
      <TripRequestsSection tripRequests={data.tripRequests} />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <article className={shared.card}>
      <span style={{ color: "var(--color-text-muted)" }}>{label}</span>
      <strong style={{ fontSize: "1.45rem" }}>{value}</strong>
    </article>
  );
}

function TripsSection({ trips }: { trips: Trip[] }) {
  return (
    <section className={shared.section}>
      <div className={shared.sectionHeader}>
        <h2>Trajets</h2>
        <span style={{ color: "var(--color-text-muted)" }}>{trips.length} element(s)</span>
      </div>
      <TableEmpty empty={trips.length === 0} message="Aucun trajet publie.">
        <table className={shared.table}>
          <thead>
            <tr>
              <th>Trajet</th>
              <th>Depart</th>
              <th>Places</th>
              <th>Prix</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {trips.map((trip) => (
              <tr key={trip.id}>
                <td>
                  <strong>{trip.departureLocation}</strong>
                  <br />
                  <small style={{ color: "var(--color-text-muted)" }}>
                    vers {trip.arrivalLocation}
                  </small>
                </td>
                <td>{formatDate(trip.departureDate)}</td>
                <td>
                  {trip.availableSeats}
                  {typeof trip.totalSeats === "number" ? ` / ${trip.totalSeats}` : ""}
                </td>
                <td>{trip.isFree ? "Gratuit" : formatAmount(Number(trip.pricePerSeat))}</td>
                <td>
                  <span className={statusBadge(trip.status)}>{trip.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableEmpty>
    </section>
  );
}

function BookingsSection({ title, bookings }: { title: string; bookings: Booking[] }) {
  return (
    <section className={shared.section}>
      <div className={shared.sectionHeader}>
        <h2>{title}</h2>
        <span style={{ color: "var(--color-text-muted)" }}>{bookings.length} element(s)</span>
      </div>
      <TableEmpty empty={bookings.length === 0} message="Aucune reservation.">
        <table className={shared.table}>
          <thead>
            <tr>
              <th>Trajet</th>
              <th>Passager</th>
              <th>Places</th>
              <th>Paiement</th>
              <th>Statut</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking) => (
              <tr key={booking.id}>
                <td>
                  {booking.trip
                    ? `${booking.trip.departureLocation} -> ${booking.trip.arrivalLocation}`
                    : "Trajet absent"}
                </td>
                <td>
                  {booking.passenger
                    ? `${booking.passenger.firstName} ${booking.passenger.lastName}`
                    : "-"}
                </td>
                <td>{booking.numberOfSeats}</td>
                <td>
                  {booking.paymentStatus ?? "not_required"}
                  {booking.paymentAmount ? (
                    <>
                      <br />
                      <small>{formatAmount(booking.paymentAmount, booking.paymentCurrency)}</small>
                    </>
                  ) : null}
                </td>
                <td>
                  <span className={statusBadge(booking.status)}>{booking.status}</span>
                </td>
                <td>{formatDate(booking.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableEmpty>
    </section>
  );
}

function PaymentsSection({ payments }: { payments: PaymentTransaction[] }) {
  return (
    <section className={shared.section}>
      <div className={shared.sectionHeader}>
        <h2>Paiements effectues</h2>
        <span style={{ color: "var(--color-text-muted)" }}>{payments.length} element(s)</span>
      </div>
      <TableEmpty empty={payments.length === 0} message="Aucun paiement.">
        <table className={shared.table}>
          <thead>
            <tr>
              <th>Reference</th>
              <th>Objet</th>
              <th>Methode</th>
              <th>Montant</th>
              <th>Statut</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id}>
                <td>
                  <strong>{payment.reference}</strong>
                  <br />
                  <small style={{ color: "var(--color-text-muted)" }}>
                    {payment.orderNumber ?? "-"}
                  </small>
                </td>
                <td>{payment.purpose}</td>
                <td>{payment.method}</td>
                <td>{formatAmount(payment.amount, payment.currency)}</td>
                <td>
                  <span className={statusBadge(payment.status)}>{payment.status}</span>
                </td>
                <td>{formatDate(payment.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableEmpty>
    </section>
  );
}

function TripRequestsSection({ tripRequests }: { tripRequests: TripRequest[] }) {
  return (
    <section className={shared.section}>
      <div className={shared.sectionHeader}>
        <h2>Demandes de trajet</h2>
        <span style={{ color: "var(--color-text-muted)" }}>
          {tripRequests.length} element(s)
        </span>
      </div>
      <TableEmpty empty={tripRequests.length === 0} message="Aucune demande.">
        <table className={shared.table}>
          <thead>
            <tr>
              <th>Demande</th>
              <th>Fenetre depart</th>
              <th>Places</th>
              <th>Prix max</th>
              <th>Offres</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {tripRequests.map((request) => (
              <tr key={request.id}>
                <td>
                  <strong>{request.departureLocation}</strong>
                  <br />
                  <small style={{ color: "var(--color-text-muted)" }}>
                    vers {request.arrivalLocation}
                  </small>
                </td>
                <td>
                  {formatDate(request.departureDateMin)}
                  <br />
                  <small style={{ color: "var(--color-text-muted)" }}>
                    au plus tard {formatDate(request.departureDateMax)}
                  </small>
                </td>
                <td>{request.numberOfSeats}</td>
                <td>
                  {request.maxPricePerSeat
                    ? formatAmount(request.maxPricePerSeat)
                    : "-"}
                </td>
                <td>{request.driverOffers.length}</td>
                <td>
                  <span className={statusBadge(request.status)}>{request.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableEmpty>
    </section>
  );
}

function TableEmpty({
  empty,
  message,
  children,
}: {
  empty: boolean;
  message: string;
  children: React.ReactNode;
}) {
  if (empty) {
    return <p style={{ color: "var(--color-text-muted)" }}>{message}</p>;
  }

  return <div className={shared.tableWrapper}>{children}</div>;
}
