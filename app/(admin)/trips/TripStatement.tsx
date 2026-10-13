"use client";

import { useEffect, useState } from "react";
import { useGetTripStatementQuery, type StatementPerson, type TripStatement } from "@/lib/features/trips/tripsApi";
import { getApiErrorMessage } from "@/lib/utils/apiErrors";
import shared from "../styles/page.module.css";
import styles from "./TripStatement.module.css";

const tripStatus: Record<string, string> = {
  upcoming: "À venir",
  ongoing: "En course",
  completed: "Terminé",
  cancelled: "Annulé",
};
const bookingStatus: Record<string, string> = {
  pending: "En attente",
  accepted: "Acceptée",
  completed: "Terminée",
  boarding_uncertain: "Embarquement incertain",
};
const paymentMode: Record<string, string> = {
  electronic: "Mobile money",
  points: "Jetons",
  cash: "Espèces",
};
const vehicleType: Record<string, string> = {
  car: "Voiture",
  motorcycle_2_wheels: "Moto",
  motorcycle_3_wheels: "Tricycle",
};
const referralState: Record<string, string> = {
  potential: "estimé",
  recorded: "enregistré",
  reversed: "annulé",
  none: "—",
};

const money = (value: number) =>
  `${new Intl.NumberFormat("fr-CD", { maximumFractionDigits: 2 }).format(value)} CDF`;
const percent = (rate: number) =>
  `${new Intl.NumberFormat("fr-CD", { maximumFractionDigits: 1 }).format(rate * 100)} %`;
const when = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("fr-CD", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value))
    : "—";
const nameOf = (person: StatementPerson | null) =>
  person ? `${person.firstName} ${person.lastName}`.trim() : "Compte indisponible";

export default function TripStatement({ tripId }: { tripId: string }) {
  const valid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tripId);
  const { data, isFetching, error } = useGetTripStatementQuery(tripId, { skip: !valid });
  const [drawn, setDrawn] = useState(false);
  const [focus, setFocus] = useState<string | null>(null);

  useEffect(() => {
    setDrawn(false);
    if (!data) return;
    const frame = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(frame);
  }, [data]);

  return (
    <div className={shared.page}>
      <a className={styles.back} href="/trips">← Trajets</a>
      {!valid ? <p className={shared.errorText} role="alert">Ce trajet est introuvable.</p> : null}
      {valid && isFetching && !data ? <p role="status">Chargement du trajet…</p> : null}
      {error ? <p className={shared.errorText} role="alert">{getApiErrorMessage(error, "Impossible de charger ce trajet.")}</p> : null}
      {data ? <Sheet data={data} drawn={drawn} focus={focus} onFocus={setFocus} /> : null}
    </div>
  );
}

function Sheet({
  data,
  drawn,
  focus,
  onFocus,
}: {
  data: TripStatement;
  drawn: boolean;
  focus: string | null;
  onFocus: (key: string | null) => void;
}) {
  const { trip, booked, openSeats, rates, bookings } = data;
  const parts = [
    { key: "driver", label: "Conducteur", amount: booked.driver },
    { key: "zwanga", label: "Zwanga", amount: Math.max(booked.zwanga, 0) },
    { key: "referral", label: "Parrain", amount: booked.referral },
  ].filter((part) => part.amount > 0);
  const total = parts.reduce((sum, part) => sum + part.amount, 0);
  const referrers = [...new Map(
    bookings.flatMap((line) => (line.referrer ? [[line.referrer.id, line.referrer] as const] : [])),
  ).values()];

  return (
    <article className={styles.sheet}>
      <header className={styles.hero}>
        <p className={styles.kicker}>{tripStatus[trip.status] ?? trip.status}{trip.isPrivate ? " · privé" : ""}</p>
        <h1>{trip.departureLocation} <span aria-hidden="true">→</span> {trip.arrivalLocation}</h1>
        <p className={styles.meta}>
          {when(trip.departureDate)}
          {" · "}
          {trip.driver ? <a href={`/users?fiche=${trip.driver.id}`}>{nameOf(trip.driver)}</a> : "Conducteur indisponible"}
          {trip.driver?.phone ? ` · ${trip.driver.phone}` : ""}
          {trip.vehicle ? ` · ${trip.vehicle.brand} ${trip.vehicle.model}, ${trip.vehicle.licensePlate}` : ""}
          {" · "}
          {trip.availableSeats} libre{trip.availableSeats > 1 ? "s" : ""}
          {typeof trip.totalSeats === "number" ? ` / ${trip.totalSeats}` : ""}
          {" · "}
          {trip.isFree ? "Gratuit" : `${money(trip.pricePerSeat)} / place`}
        </p>
        {trip.description ? <p className={styles.description}>{trip.description}</p> : null}
      </header>

      <section className={styles.gain} aria-labelledby="zwanga-gain">
        <p id="zwanga-gain" className={styles.gainLabel}>Gain Zwanga sur les réservations</p>
        <p className={booked.zwanga < 0 ? styles.gainValueNegative : styles.gainValue}>{money(booked.zwanga)}</p>
        <p className={styles.gainNote}>
          Commission {percent(rates.commissionRate)}, dont {percent(rates.referralRate)} pour le parrain d’un paiement en ligne ou en jetons.
          {booked.tokenDebt > 0 ? ` Les espèces laissent ${booked.tokenDebt} jetons à recouvrer.` : ""}
          {openSeats.zwanga > 0 ? ` Encore ${money(openSeats.zwanga)} si les ${openSeats.seats} place${openSeats.seats > 1 ? "s" : ""} libre${openSeats.seats > 1 ? "s" : ""} partent au prix affiché.` : ""}
        </p>
      </section>

      {total > 0 ? (
        <div
          className={styles.track}
          role="img"
          aria-label={parts.map((part) => `${part.label} ${money(part.amount)}`).join(", ")}
        >
          {parts.map((part) => (
            <span
              key={part.key}
              className={`${styles.segment} ${part.key === "driver" ? styles.driver : part.key === "zwanga" ? styles.zwanga : styles.referral} ${focus && focus !== part.key ? styles.dim : ""}`}
              style={{ width: drawn ? `${(part.amount / total) * 100}%` : 0 }}
            />
          ))}
        </div>
      ) : null}

      <dl className={styles.parties}>
        <Party
          term="Conducteur"
          amount={money(booked.driver)}
          detail={openSeats.driver > 0 ? `+ ${money(openSeats.driver)} si les places libres se vendent` : "Cash conservé, net électronique et subvention."}
          onEnter={() => onFocus("driver")}
          onLeave={() => onFocus(null)}
        />
        <Party
          term="Zwanga"
          amount={money(booked.zwanga)}
          detail={booked.subsidy > 0 ? `Après parrain, moins ${money(booked.subsidy)} de subvention.` : "Commission conservée après la part parrain."}
          onEnter={() => onFocus("zwanga")}
          onLeave={() => onFocus(null)}
        />
        <Party
          term="Parrain"
          amount={money(booked.referral)}
          detail={referrers.length ? referrers.map(nameOf).join(", ") : "Aucun filleul parrainé sur ces réservations."}
          onEnter={() => onFocus("referral")}
          onLeave={() => onFocus(null)}
        />
        <Party
          term="Passagers"
          amount={money(booked.paid)}
          detail={`${booked.seats} place${booked.seats > 1 ? "s" : ""} réservée${booked.seats > 1 ? "s" : ""}. C’est le montant qu’ils règlent.`}
          onEnter={() => onFocus(null)}
          onLeave={() => onFocus(null)}
        />
      </dl>

      {openSeats.note ? <p className={styles.openNote}>{openSeats.note}</p> : null}

      <section aria-labelledby="booking-lines">
        <h2 id="booking-lines">Réservations</h2>
        {bookings.length === 0 ? (
          <p className={shared.emptyState}>Aucune réservation en cours sur ce trajet.</p>
        ) : (
          <div className={shared.tableWrapper}>
            <table className={shared.table}>
              <thead>
                <tr>
                  <th>Passager</th>
                  <th>Paiement</th>
                  <th>Payé</th>
                  <th>Conducteur</th>
                  <th>Zwanga</th>
                  <th>Parrain</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((line) => (
                  <tr key={line.id}>
                    <td>
                      <strong>{line.passenger ? <a href={`/users?fiche=${line.passenger.id}`}>{nameOf(line.passenger)}</a> : nameOf(null)}</strong>
                      <small>
                        {line.seats} place{line.seats > 1 ? "s" : ""} · {bookingStatus[line.status] ?? line.status}
                        {line.passenger?.phone ? ` · ${line.passenger.phone}` : ""}
                      </small>
                    </td>
                    <td>{paymentMode[line.paymentMode] ?? line.paymentMode}{line.subsidy > 0 ? <small>Subvention {money(line.subsidy)}</small> : null}</td>
                    <td>{money(line.paid)}</td>
                    <td>{money(line.driver)}{line.tokenDebt > 0 ? <small>{line.tokenDebt} jetons dus</small> : null}</td>
                    <td>{money(line.zwanga)}</td>
                    <td>
                      {line.referral > 0 ? money(line.referral) : "—"}
                      {line.referrer ? <small>{nameOf(line.referrer)} · {referralState[line.referralState]}</small> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className={styles.facts}>
        Publié le {when(trip.createdAt)}
        {trip.startedAt ? ` · démarré le ${when(trip.startedAt)}` : ""}
        {trip.completedAt ? ` · terminé le ${when(trip.completedAt)}` : ""}
        {trip.vehicle ? ` · ${vehicleType[trip.vehicle.type] ?? trip.vehicle.type} ${trip.vehicle.color}` : ""}
        {trip.acceptedPaymentModes.length
          ? ` · paiements acceptés : ${trip.acceptedPaymentModes.map((mode) => paymentMode[mode] ?? mode).join(", ")}`
          : ""}
      </p>
    </article>
  );
}

function Party({
  term,
  amount,
  detail,
  onEnter,
  onLeave,
}: {
  term: string;
  amount: string;
  detail: string;
  onEnter: () => void;
  onLeave: () => void;
}) {
  return (
    <div className={styles.party} onMouseEnter={onEnter} onMouseLeave={onLeave}>
      <dt>{term}</dt>
      <dd>
        <strong>{amount}</strong>
        <span>{detail}</span>
      </dd>
    </div>
  );
}
