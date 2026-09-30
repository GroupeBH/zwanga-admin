"use client";

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

import shared from "../styles/page.module.css";

const formatDate = (dateString?: string | null) => {
  if (!dateString) return "—";
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) return String(dateString);
  return new Intl.DateTimeFormat("fr-CD", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
};

const formatAmount = (amount?: number | null, currency = "CDF") => {
  const value = Number(amount ?? 0);
  const code = currency && /^[A-Z]{3}$/.test(currency) ? currency : "CDF";
  try {
    return new Intl.NumberFormat("fr-CD", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 0,
    }).format(Number.isFinite(value) ? value : 0);
  } catch {
    return `${Number.isFinite(value) ? value : 0} ${code}`;
  }
};

const ATTRIBUTE_LABELS: Record<string, string> = {
  id: "Identifiant",
  email: "Email",
  phone: "Téléphone",
  firstName: "Prénom",
  lastName: "Nom",
  gender: "Genre",
  profilePicture: "Photo de profil",
  hasPublishedTrip: "A déjà publié un trajet",
  role: "Rôle",
  status: "Statut",
  isEmailVerified: "Email vérifié",
  isPhoneVerified: "Téléphone vérifié",
  passwordChangeRequired: "Doit changer son mot de passe",
  isActive: "Compte actif",
  isDriver: "S’est déclaré conducteur",
  driverOnboardingRequestedAt: "Demande conducteur",
  driverActivatedAt: "Activation conducteur",
  hasApprovedKyc: "KYC approuvé",
  hasActiveVehicle: "Véhicule actif",
  isQualifiedDriver: "Conducteur opérationnel",
  lastLoginAt: "Dernière connexion",
  createdAt: "Créé le",
  updatedAt: "Mis à jour le",
  brand: "Marque",
  model: "Modèle",
  color: "Couleur",
  type: "Type",
  licensePlate: "Immatriculation",
  photoUrl: "Photo",
  ownerId: "Propriétaire",
  userId: "Utilisateur",
  documentNumber: "Numéro de document",
  provider: "Prestataire",
  rejectionReason: "Motif de rejet",
  reviewedBy: "Revu par",
  reviewedAt: "Revu le",
  plan: "Offre",
  amount: "Montant",
  currency: "Devise",
  startDate: "Début",
  endDate: "Fin",
  isTrial: "Essai",
  balance: "Solde",
  withdrawableBalance: "Solde retirable",
  reservedWithdrawalBalance: "Retrait réservé",
  withdrawalsBlocked: "Retraits bloqués",
  name: "Nom du lieu",
  address: "Adresse",
  coordinates: "Coordonnées",
  isDefault: "Lieu par défaut",
  notes: "Notes",
};

const HIDDEN_ATTRIBUTE_KEYS = new Set([
  "user",
  "driver",
  "passenger",
  "trip",
  "bookings",
  "vehicle",
  "paymentTransaction",
  "driverOffers",
  "selectedDriver",
  "selectedVehicle",
  "password",
  "accessToken",
  "refreshToken",
  "fcmToken",
  "googleId",
  "appleId",
]);

const formatAttributeValue = (value: unknown): string => {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  if (typeof value === "boolean") {
    return value ? "Oui" : "Non";
  }
  if (Array.isArray(value)) {
    if (value.every((item) => ["string", "number"].includes(typeof item))) {
      return value.length > 0 ? value.join(", ") : "—";
    }
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "—";
    }
  }
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return formatDate(value);
  }
  return String(value);
};

const attributeEntries = (record: object) =>
  Object.entries(record as Record<string, unknown>).filter(
    ([key]) => !HIDDEN_ATTRIBUTE_KEYS.has(key)
  );

const statusBadge = (status: string) => {
  if (["active", "accepted", "completed", "succeeded", "driver_selected"].includes(status)) {
    return `${shared.badge} ${shared.badgeSuccess}`;
  }
  if (["suspended", "cancelled", "rejected", "failed", "expired"].includes(status)) {
    return `${shared.badge} ${shared.badgeDanger}`;
  }
  return `${shared.badge} ${shared.badgeWarning}`;
};

export default function UserDetailsPage({ userId }: { userId: string }) {
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

  if (error || !data?.user || !data.stats) {
    return (
      <div className={shared.page}>
        <section className={shared.section}>
          <h2>Dossier utilisateur</h2>
          <p>Impossible de charger les details de cet utilisateur.</p>
          <a href="/users" className={shared.primaryButton}>
            Retour utilisateurs
          </a>
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
            <a href="/users" style={{ color: "var(--color-text-muted)" }}>
              Retour utilisateurs
            </a>
            <h2>
              {user.firstName} {user.lastName}
            </h2>
            <p style={{ margin: 0, color: "var(--color-text-muted)" }}>
              {user.email ?? "Email absent"} - {user.phone}
            </p>
            <p style={{ margin: "6px 0 0", color: "var(--color-text-muted)" }}>
              Conducteur: {user.isQualifiedDriver ? "Oui (KYC + véhicule)" : "Non"}
              {user.role === "driver" && !user.isQualifiedDriver
                ? " · profil déclaré conducteur"
                : ""}
              {user.hasApprovedKyc === false ? " · KYC non validé" : ""}
              {user.hasApprovedKyc && user.hasActiveVehicle === false
                ? " · aucun véhicule actif"
                : ""}
            </p>
            <p style={{ margin: "6px 0 0", color: "var(--color-text-muted)" }}>
              {user.isQualifiedDriver
                ? "Conducteur opérationnel: KYC validé et véhicule actif"
                : user.role === "driver" || user.isDriver
                  ? `Pas encore conducteur opérationnel${
                      user.hasApprovedKyc ? "" : " · KYC non validé"
                    }${user.hasActiveVehicle ? "" : " · aucun véhicule actif"}`
                  : "Passager"}
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

      <section className={shared.section}>
        <div className={shared.sectionHeader}>
          <div>
            <h2>Attributs du compte</h2>
            <p style={{ margin: 0, color: "var(--color-text-muted)" }}>
              Toutes les colonnes du compte, sauf le mot de passe et les jetons
              de session.
            </p>
          </div>
        </div>
        <AttributeTable record={user} />
      </section>

      <TripsSection trips={data.trips ?? []} />
      <BookingsSection
        title="Reservations comme passager"
        bookings={data.bookingsAsPassenger ?? []}
      />
      <BookingsSection
        title="Reservations recues comme conducteur"
        bookings={data.bookingsAsDriver ?? []}
      />
      <PaymentsSection payments={data.payments ?? []} />
      <TripRequestsSection tripRequests={data.tripRequests ?? []} />
    </div>
  );
}

function AttributeTable({ record }: { record: object }) {
  return (
    <div className={shared.tableWrapper}>
      <table className={shared.table}>
        <tbody>
          {attributeEntries(record).map(([key, value]) => (
            <tr key={key}>
              <th style={{ width: "34%" }}>{ATTRIBUTE_LABELS[key] ?? key}</th>
              <td style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {formatAttributeValue(value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AllAttributes({ record }: { record: object }) {
  return (
    <details>
      <summary style={{ cursor: "pointer", color: "var(--color-text-muted)" }}>
        Tous les attributs
      </summary>
      <AttributeTable record={record} />
    </details>
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
                  <AllAttributes record={trip} />
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
                  <AllAttributes record={booking} />
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
                  <AllAttributes record={payment} />
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
                  <AllAttributes record={request} />
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
                <td>{request.driverOffers?.length ?? 0}</td>
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
