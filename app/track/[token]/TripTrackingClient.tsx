"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Car,
  CheckCircle2,
  Clock3,
  ExternalLink,
  MapPin,
  Navigation,
  RefreshCw,
  Route,
  ShieldCheck,
} from "lucide-react";

import styles from "./tracking.module.css";

type Coordinate = {
  latitude: number;
  longitude: number;
};

type TrackingLocation = {
  name: string;
  reference: string | null;
  coordinates: Coordinate | null;
};

type PublicTrackingResponse = {
  share: {
    token: string;
    expiresAt: string;
    recipientName: string | null;
  };
  trip: {
    id: string;
    status: "upcoming" | "ongoing" | "completed" | "cancelled" | string;
    departureDate: string;
    startedAt: string | null;
    estimatedArrivalDate: string | null;
    completedAt: string | null;
    currentLocation: Coordinate | null;
    lastLocationUpdateAt: string | null;
    route: {
      departure: TrackingLocation;
      arrival: TrackingLocation;
    };
    driver: {
      name: string;
      profilePicture: string | null;
    };
    vehicle: {
      brand: string;
      model: string;
      color: string;
      licensePlate: string;
    } | null;
  };
  booking: {
    id: string;
    status: string;
    pickedUp: boolean;
    pickedUpAt: string | null;
    pickedUpConfirmedByPassenger: boolean;
    droppedOff: boolean;
    droppedOffAt: string | null;
    droppedOffConfirmedByPassenger: boolean;
    passenger: {
      name: string;
    };
    origin: TrackingLocation;
    destination: TrackingLocation;
  } | null;
  freshness: {
    isLive: boolean;
    polledAt: string;
  };
};

type LoadState = "loading" | "ready" | "error";

const RAW_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_PUBLIC_URL || "http://localhost:5200/api/v1";
const API_BASE_URL = normalizeApiBaseUrl(RAW_API_BASE_URL);
const POLL_INTERVAL_MS = 8000;
const TERMINAL_TRIP_STATUSES = new Set(["completed", "cancelled"]);

const tripStatusLabels: Record<string, string> = {
  upcoming: "A venir",
  ongoing: "En cours",
  completed: "Termine",
  cancelled: "Annule",
};

const bookingStatusLabels: Record<string, string> = {
  pending: "Reservation en attente",
  accepted: "Reservation acceptee",
  completed: "Reservation terminee",
  cancelled: "Reservation annulee",
  rejected: "Reservation refusee",
  expired: "Reservation expiree",
};

interface Props {
  readonly token: string;
}

export function TripTrackingClient({ token }: Props) {
  const [state, setState] = useState<LoadState>("loading");
  const [tracking, setTracking] = useState<PublicTrackingResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastRefreshAt, setLastRefreshAt] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadTracking = useCallback(
    async (
      showSpinner = false,
      signal?: AbortSignal,
    ): Promise<PublicTrackingResponse | null> => {
      if (showSpinner) {
        setIsRefreshing(true);
      }

      try {
        const response = await fetch(
          `${API_BASE_URL}/tracking/public/${encodeURIComponent(token)}`,
          { cache: "no-store", signal },
        );

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as {
            message?: string | string[];
          } | null;
          const backendMessage = payload?.message;
          const message = Array.isArray(backendMessage)
            ? backendMessage.join(" ")
            : backendMessage || "Lien de suivi indisponible.";
          throw new Error(message);
        }

        const data = (await response.json()) as PublicTrackingResponse;
        if (signal?.aborted) {
          return null;
        }
        setTracking(data);
        setLastRefreshAt(new Date());
        setErrorMessage(null);
        setState("ready");
        return data;
      } catch (error) {
        if (
          signal?.aborted ||
          (error instanceof DOMException && error.name === "AbortError")
        ) {
          return null;
        }
        setErrorMessage(error instanceof Error ? error.message : "Lien de suivi indisponible.");
        setState((current) => (current === "ready" ? current : "error"));
        return null;
      } finally {
        if (!signal?.aborted) {
          setIsRefreshing(false);
        }
      }
    },
    [token],
  );

  useEffect(() => {
    const abortController = new AbortController();
    let timeoutId: number | null = null;
    let terminalStatusReached = false;

    const scheduleNextPoll = () => {
      if (abortController.signal.aborted || terminalStatusReached) {
        return;
      }
      timeoutId = window.setTimeout(() => {
        void run();
      }, POLL_INTERVAL_MS);
    };

    const run = async () => {
      if (abortController.signal.aborted || terminalStatusReached) {
        return;
      }

      const data = await loadTracking(false, abortController.signal);
      terminalStatusReached = Boolean(data && isTerminalTripStatus(data.trip.status));
      scheduleNextPoll();
    };

    void run();

    return () => {
      abortController.abort();
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [loadTracking]);

  const currentCoordinate = useMemo(() => {
    return (
      tracking?.trip.currentLocation ||
      tracking?.booking?.origin.coordinates ||
      tracking?.trip.route.departure.coordinates ||
      null
    );
  }, [tracking]);

  const mapUrl = currentCoordinate
    ? `https://www.google.com/maps?q=${currentCoordinate.latitude},${currentCoordinate.longitude}&z=15&output=embed`
    : null;
  const mapLink = currentCoordinate
    ? `https://www.google.com/maps/search/?api=1&query=${currentCoordinate.latitude},${currentCoordinate.longitude}`
    : null;

  if (state === "loading") {
    return (
      <main className={styles.page}>
        <section className={styles.loadingShell}>
          <RefreshCw className={styles.loadingIcon} />
          <h1>Chargement du suivi</h1>
          <p>Connexion au trajet Zwanga...</p>
        </section>
      </main>
    );
  }

  if (state === "error" || !tracking) {
    return (
      <main className={styles.page}>
        <section className={styles.errorShell}>
          <AlertTriangle size={34} />
          <h1>Lien indisponible</h1>
          <p>{errorMessage || "Ce lien est introuvable, expire ou revoque."}</p>
        </section>
      </main>
    );
  }

  const trip = tracking.trip;
  const booking = tracking.booking;
  const departure = booking?.origin || trip.route.departure;
  const arrival = booking?.destination || trip.route.arrival;
  const statusLabel = tripStatusLabels[trip.status] || trip.status;
  const isLive = tracking.freshness.isLive;
  const isTrackingFinished = isTerminalTripStatus(trip.status);
  const updateLabel = trip.lastLocationUpdateAt
    ? `${isTrackingFinished ? "Derniere position : " : ""}${formatDateTime(trip.lastLocationUpdateAt)}`
    : "Position non encore recue";

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <div className={styles.brandMark}>Z</div>
        <div>
          <p className={styles.brandEyebrow}>Zwanga</p>
          <strong>Suivi de trajet</strong>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <div className={styles.statusRow}>
            <span className={`${styles.liveBadge} ${isLive ? styles.liveBadgeOn : styles.liveBadgeMuted}`}>
              <span className={styles.liveDot} />
              {isLive ? "En direct" : statusLabel}
            </span>
            <span className={styles.refreshLabel}>Maj {lastRefreshAt ? formatTime(lastRefreshAt) : "--:--"}</span>
          </div>
          <h1>{departure.name} vers {arrival.name}</h1>
          <p>{booking ? `${booking.passenger.name} partage sa progression.` : "Le conducteur partage la progression du trajet."}</p>
        </div>
        <button
          type="button"
          className={styles.refreshButton}
          onClick={() => void loadTracking(true)}
          disabled={isRefreshing || isTrackingFinished}
        >
          {isTrackingFinished ? (
            <CheckCircle2 size={17} />
          ) : (
            <RefreshCw size={17} className={isRefreshing ? styles.spinIcon : undefined} />
          )}
          {isTrackingFinished ? "Suivi termine" : "Actualiser"}
        </button>
      </section>

      <section className={styles.mapSection}>
        <div className={styles.mapHeader}>
          <div>
            <p className={styles.sectionKicker}>
              {isTrackingFinished ? "Derniere position connue" : "Position actuelle"}
            </p>
            <h2>{updateLabel}</h2>
          </div>
          {mapLink ? (
            <a href={mapLink} className={styles.mapLink} target="_blank" rel="noreferrer">
              Google Maps
              <ExternalLink size={15} />
            </a>
          ) : null}
        </div>

        <div className={styles.mapFrame}>
          {mapUrl ? (
            <iframe
              title="Carte du suivi Zwanga"
              src={mapUrl}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          ) : (
            <div className={styles.mapFallback}>
              <MapPin size={28} />
              <span>Position en attente</span>
            </div>
          )}
          {currentCoordinate ? (
            <div className={styles.coordinatePill}>
              {currentCoordinate.latitude.toFixed(5)}, {currentCoordinate.longitude.toFixed(5)}
            </div>
          ) : null}
        </div>
      </section>

      <section className={styles.contentGrid}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <Route size={20} />
            <h2>Itineraire</h2>
          </div>
          <div className={styles.routeList}>
            <RoutePoint tone="start" label="Depart" location={departure} />
            <RoutePoint tone="end" label="Arrivee" location={arrival} />
          </div>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <Car size={20} />
            <h2>Conducteur</h2>
          </div>
          <div className={styles.driverLine}>
            <span>{trip.driver.name}</span>
            {trip.vehicle ? (
              <small>{trip.vehicle.color} {trip.vehicle.brand} {trip.vehicle.model}</small>
            ) : (
              <small>Vehicule non renseigne</small>
            )}
          </div>
          {trip.vehicle ? (
            <dl className={styles.metaList}>
              <div>
                <dt>Plaque</dt>
                <dd>{trip.vehicle.licensePlate}</dd>
              </div>
              <div>
                <dt>Depart prevu</dt>
                <dd>{formatDateTime(trip.departureDate)}</dd>
              </div>
            </dl>
          ) : null}
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <ShieldCheck size={20} />
            <h2>Statut</h2>
          </div>
          <ol className={styles.timeline}>
            <TimelineItem done label="Trajet partage" />
            <TimelineItem done={trip.status === "ongoing" || trip.status === "completed"} label="Trajet demarre" />
            <TimelineItem done={Boolean(booking?.pickedUp || booking?.pickedUpConfirmedByPassenger)} label="Passager embarque" />
            <TimelineItem done={Boolean(booking?.droppedOff || trip.status === "completed")} label="Arrivee confirmee" />
          </ol>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <Clock3 size={20} />
            <h2>Acces</h2>
          </div>
          <dl className={styles.metaList}>
            <div>
              <dt>Lien valide jusqu'au</dt>
              <dd>{formatDateTime(tracking.share.expiresAt)}</dd>
            </div>
            <div>
              <dt>Derniere lecture</dt>
              <dd>{lastRefreshAt ? formatDateTime(lastRefreshAt.toISOString()) : "--"}</dd>
            </div>
            {booking ? (
              <div>
                <dt>Reservation</dt>
                <dd>{bookingStatusLabels[booking.status] || booking.status}</dd>
              </div>
            ) : null}
          </dl>
        </article>
      </section>

      <footer className={styles.footer}>
        <Navigation size={16} />
        <span>Suivi public Zwanga</span>
      </footer>
    </main>
  );
}

function RoutePoint({
  label,
  location,
  tone,
}: {
  readonly label: string;
  readonly location: TrackingLocation;
  readonly tone: "start" | "end";
}) {
  return (
    <div className={styles.routePoint}>
      <span className={`${styles.routeMarker} ${tone === "start" ? styles.routeMarkerStart : styles.routeMarkerEnd}`} />
      <div>
        <small>{label}</small>
        <strong>{location.name}</strong>
        {location.reference ? <p>{location.reference}</p> : null}
      </div>
    </div>
  );
}

function TimelineItem({ done, label }: { readonly done: boolean; readonly label: string }) {
  return (
    <li className={done ? styles.timelineDone : undefined}>
      <CheckCircle2 size={18} />
      <span>{label}</span>
    </li>
  );
}

function normalizeApiBaseUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (/\/api\/v\d+$/i.test(trimmed)) {
    return trimmed;
  }
  return `${trimmed}/api/v1`;
}

function isTerminalTripStatus(status: string): boolean {
  return TERMINAL_TRIP_STATUSES.has(status.toLowerCase());
}

function formatDateTime(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }
  return new Intl.DateTimeFormat("fr-CD", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatTime(value: Date): string {
  return new Intl.DateTimeFormat("fr-CD", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(value);
}
