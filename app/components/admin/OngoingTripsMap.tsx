"use client";

import { useMemo, useState } from "react";
import { MapPin } from "lucide-react";

import { getTripLifecycleStatus } from "@/lib/features/admin/insights";
import type { Trip } from "@/lib/features/admin/types";
import { osmEmbedUrl, osmOpenUrl, toLatLng } from "@/lib/utils/geo";

import { RecordLink, tripFicheHref, userFicheHref } from "./RecordLinks";
import shared from "@/app/(admin)/styles/page.module.css";

interface OngoingTripsMapProps {
  readonly trips: Trip[];
}

export const OngoingTripsMap = ({ trips }: OngoingTripsMapProps) => {
  const located = useMemo(
    () =>
      trips
        .filter((trip) => getTripLifecycleStatus(trip) === "ongoing")
        .map((trip) => ({
          trip,
          point:
            toLatLng(trip.currentLocation) ??
            toLatLng(trip.departureCoordinates),
        }))
        .filter(
          (item): item is { trip: Trip; point: NonNullable<ReturnType<typeof toLatLng>> } =>
            Boolean(item.point)
        ),
    [trips]
  );
  const ongoingCount = trips.filter(
    (trip) => getTripLifecycleStatus(trip) === "ongoing"
  ).length;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected =
    located.find((item) => item.trip.id === selectedId) ?? located[0] ?? null;

  return (
    <section className={shared.section} id="carte">
      <div className={shared.sectionHeader}>
        <div>
          <h2>Carte des trajets en cours</h2>
          <p className={shared.filterSummary}>
            {ongoingCount} trajet{ongoingCount > 1 ? "s" : ""} en cours
            {located.length > 0
              ? ` · ${located.length} avec une position connue`
              : ""}
          </p>
        </div>
      </div>
      <p className={shared.helpText}>
        <MapPin size={16} aria-hidden="true" />
        <span>
          La carte utilise la dernière position reçue, ou le point de départ
          s’il n’y a pas encore de GPS. Ce n’est pas un suivi Socket.io en
          direct : la liste se rafraîchit avec les trajets déjà chargés.
        </span>
      </p>
      {located.length === 0 ? (
        <p className={shared.emptyState}>
          {ongoingCount === 0
            ? "Aucun trajet en cours pour le moment."
            : "Des trajets sont en cours, mais aucune coordonnée n’est encore disponible dans cette liste."}
        </p>
      ) : (
        <div className={shared.mapSplit}>
          <div className={shared.mapFrame}>
            {selected ? (
              <iframe
                title={`Carte du trajet ${selected.trip.departureLocation} vers ${selected.trip.arrivalLocation}`}
                src={osmEmbedUrl(selected.point)}
                loading="lazy"
              />
            ) : null}
          </div>
          <ul className={shared.mapList}>
            {located.map(({ trip, point }) => {
              const driverName = trip.driver
                ? `${trip.driver.firstName} ${trip.driver.lastName}`
                : "Conducteur inconnu";
              const isActive = selected?.trip.id === trip.id;
              return (
                <li
                  key={trip.id}
                  className={isActive ? shared.mapItemActive : shared.mapItem}
                >
                  <button type="button" onClick={() => setSelectedId(trip.id)}>
                    <strong>
                      {trip.departureLocation} → {trip.arrivalLocation}
                    </strong>
                    <span>{driverName}</span>
                  </button>
                  <span>
                    <RecordLink href={userFicheHref(trip.driverId)}>
                      Fiche conducteur
                    </RecordLink>
                    {" · "}
                    <RecordLink href={tripFicheHref(trip.id)}>
                      Fiche trajet
                    </RecordLink>
                    {" · "}
                    <a
                      href={osmOpenUrl(point)}
                      target="_blank"
                      rel="noreferrer"
                      className={shared.textLink}
                    >
                      Carte externe
                    </a>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
};
