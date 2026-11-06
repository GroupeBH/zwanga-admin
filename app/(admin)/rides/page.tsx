"use client";

import { FormEvent, Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Download, Info } from "lucide-react";

import {
  buildTripLifecycleBuckets,
  getTripLifecycleLabel,
  getTripLifecycleStatus,
} from "@/lib/features/admin/insights";
import type { Trip, TripLifecycleStatus, TripStatus } from "@/lib/features/admin/types";
import { useExportAdminXlsMutation } from "@/lib/features/admin/exportApi";
import {
  useDeactivateAdminTripMutation,
  useDeleteAdminTripMutation,
  useGetTripsPageQuery,
  useUpdateAdminTripMutation,
  type UpdateTripPayload,
} from "@/lib/features/trips/tripsApi";
import { confirmAction, notify } from "@/app/components/ui/Feedback";
import { Pagination } from "@/app/components/ui/Pagination";
import { getApiErrorMessage, getApiErrorStatus } from "@/lib/utils/apiErrors";
import { datedExportName, downloadBlob } from "@/lib/utils/downloadBlob";

import TripStatement from "../trips/TripStatement";
import shared from "../styles/page.module.css";

import { SkeletonList } from "@/app/components/ui/Skeleton";

/* Statut enregistre par le conducteur; il peut differer de la lecture admin
   (ex. « à venir » cote base mais expire car le depart est passe). */
const backendStatusLabelMap: Record<TripStatus, string> = {
  upcoming: "Statut enregistré : à venir",
  ongoing: "Statut enregistré : en cours",
  completed: "Statut enregistré : terminé",
  cancelled: "Statut enregistré : annulé",
};

const tripStatusOptions: Array<[TripStatus, string]> = [
  ["upcoming", "À venir"],
  ["ongoing", "En cours"],
  ["completed", "Terminé"],
  ["cancelled", "Annulé"],
];

const PAGE_SIZE = 50;

export function RidesPage() {
  const [page, setPage] = useState(1);
  const { data, isFetching, error } = useGetTripsPageQuery({ page, limit: PAGE_SIZE });
  const trips = useMemo(() => data?.trips ?? [], [data]);
  const total = data?.total ?? null;
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [tripForm, setTripForm] = useState<UpdateTripPayload>({});
  const [updateTrip, { isLoading: isUpdating }] = useUpdateAdminTripMutation();
  const [deactivateTrip, { isLoading: isDeactivating }] = useDeactivateAdminTripMutation();
  const [deleteTrip, { isLoading: isDeleting }] = useDeleteAdminTripMutation();
  const [exportAdminXls, { isLoading: isExporting }] = useExportAdminXlsMutation();
  const [exportError, setExportError] = useState<string | null>(null);
  const errorStatus = getApiErrorStatus(error);
  const errorMessage = error
    ? getApiErrorMessage(
        error,
        errorStatus === 401 || errorStatus === 403
          ? "Le compte connecté n’a pas les droits admin nécessaires pour lire les trajets."
          : "Impossible de charger les trajets depuis le backend."
      )
    : null;

  const lifecycleBuckets = useMemo(() => buildTripLifecycleBuckets(trips), [trips]);

  const filtered = useMemo(() => {
    const searchLower = search.trim().toLowerCase();

    return trips.filter((trip) => {
      const lifecycle = getTripLifecycleStatus(trip);
      const matchesStatus = statusFilter === "all" || lifecycle === statusFilter;
      const matchesSearch =
        searchLower.length === 0 ||
        trip.departureLocation.toLowerCase().includes(searchLower) ||
        trip.arrivalLocation.toLowerCase().includes(searchLower) ||
        trip.driver?.firstName.toLowerCase().includes(searchLower) ||
        trip.driver?.lastName.toLowerCase().includes(searchLower) ||
        trip.driver?.phone.toLowerCase().includes(searchLower);

      return matchesStatus && matchesSearch;
    });
  }, [trips, statusFilter, search]);

  const badgeClass = (status: TripLifecycleStatus) => {
    if (status === "ongoing" || status === "completed") {
      return `${shared.badge} ${shared.badgeSuccess}`;
    }
    if (status === "expired" || status === "cancelled") {
      return `${shared.badge} ${shared.badgeDanger}`;
    }
    return `${shared.badge} ${shared.badgeWarning}`;
  };

  const formatDate = (dateString: string) =>
    new Intl.DateTimeFormat("fr-CD", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateString));

  const toDateInput = (dateString: string) => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString().slice(0, 16);
  };

  const openEditModal = (trip: Trip) => {
    setSelectedTrip(trip);
    setTripForm({
      departureLocation: trip.departureLocation,
      arrivalLocation: trip.arrivalLocation,
      departureDate: toDateInput(trip.departureDate),
      totalSeats: trip.totalSeats ?? trip.availableSeats,
      pricePerSeat: Number(trip.pricePerSeat ?? 0),
      isFree: Boolean(trip.isFree),
      description: trip.description ?? "",
      status: trip.status,
    });
  };

  const closeEditModal = () => {
    setSelectedTrip(null);
    setTripForm({});
  };

  const handleSubmitTrip = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedTrip) return;

    try {
      await updateTrip({
        tripId: selectedTrip.id,
        payload: {
          ...tripForm,
          departureDate: tripForm.departureDate
            ? new Date(tripForm.departureDate).toISOString()
            : undefined,
          totalSeats:
            tripForm.totalSeats === undefined ? undefined : Number(tripForm.totalSeats),
          pricePerSeat: tripForm.isFree ? 0 : Number(tripForm.pricePerSeat ?? 0),
        },
      }).unwrap();
      closeEditModal();
    } catch (submitError) {
      console.error("Failed to update trip:", submitError);
      notify(getApiErrorMessage(submitError, "Impossible de modifier ce trajet."), "error");
      return;
    }
    notify("Trajet modifié.", "success");
  };

  const handleDeactivateTrip = async (trip: Trip) => {
    const confirmed = await confirmAction({
      title: "Désactiver ce trajet ?",
      message: `${trip.departureLocation} → ${trip.arrivalLocation}\nLe trajet passera au statut annulé et ne sera plus proposé aux passagers.`,
      confirmLabel: "Désactiver",
      tone: "danger",
    });
    if (!confirmed) return;
    try {
      await deactivateTrip(trip.id).unwrap();
      notify("Trajet désactivé.", "success");
    } catch (deactivateError) {
      console.error("Failed to deactivate trip:", deactivateError);
      notify(getApiErrorMessage(deactivateError, "Impossible de désactiver ce trajet."), "error");
    }
  };

  const handleDeleteTrip = async (trip: Trip) => {
    const confirmed = await confirmAction({
      title: "Supprimer définitivement ce trajet ?",
      message: `${trip.departureLocation} → ${trip.arrivalLocation}\nCette action est irréversible. Pour simplement retirer le trajet de l’application, préférez « Désactiver ».`,
      confirmLabel: "Supprimer",
      tone: "danger",
    });
    if (!confirmed) return;
    try {
      await deleteTrip(trip.id).unwrap();
      notify("Trajet supprimé.", "success");
    } catch (deleteError) {
      console.error("Failed to delete trip:", deleteError);
      notify(getApiErrorMessage(deleteError, "Impossible de supprimer ce trajet."), "error");
    }
  };

  const handleExport = async () => {
    setExportError(null);
    try {
      const blob = await exportAdminXls({ url: "/admin/trips/export" }).unwrap();
      downloadBlob(blob, datedExportName("trajets-zwanga"));
    } catch (error) {
      setExportError(getApiErrorMessage(error, "Impossible d'exporter les trajets."));
    }
  };

  return (
    <div className={shared.page}>
      <section className={shared.section}>
        <div className={shared.sectionHeader}>
          <div>
            <h1>Trajets publiés</h1>
            <p className={shared.filterSummary}>
              {total !== null
                ? `${total.toLocaleString("fr-FR")} trajet${total > 1 ? "s" : ""} au total · `
                : ""}
              {filtered.length} affiché{filtered.length > 1 ? "s" : ""} sur cette page
            </p>
          </div>
          <div className={shared.toolbar}>
            <div className={shared.filterField}>
              <label className={shared.filterLabel} htmlFor="trips-search">
                Rechercher dans cette page
              </label>
              <input
                id="trips-search"
                className={shared.filterSearch}
                placeholder="Lieu, conducteur ou téléphone"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className={shared.filterField}>
              <label className={shared.filterLabel} htmlFor="trips-status">
                Filtrer par état
              </label>
              <select
                id="trips-status"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="all">Tous les états</option>
                <option value="ongoing">En cours</option>
                <option value="upcoming">À venir</option>
                <option value="completed">Terminés</option>
                <option value="expired">Expirés</option>
                <option value="cancelled">Annulés</option>
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
            « Expiré » signifie que l’heure de départ est dépassée de plus de
            2 heures sans clôture par le conducteur. La recherche, le filtre et
            les compteurs portent sur la page affichée ({PAGE_SIZE} trajets les
            plus récents par page).
          </span>
        </p>

        {exportError ? (
          <p className={shared.errorText} role="alert">
            {exportError}
          </p>
        ) : null}

        {!error ? (
          <div className={shared.grid}>
            {lifecycleBuckets.map((bucket) => (
              <article key={bucket.key} className={shared.card}>
                <span style={{ color: "var(--color-text-muted)" }}>{bucket.label}</span>
                <strong style={{ fontSize: "1.6rem" }}>{bucket.count}</strong>
                <small style={{ color: "var(--color-text-muted)" }}>{bucket.helper}</small>
              </article>
            ))}
          </div>
        ) : null}

        {isFetching && !data ? (
          <SkeletonList count={8} />
        ) : errorMessage ? (
          <p
            style={{
              padding: "1rem 1.2rem",
              borderRadius: "0.9rem",
              border: "1px solid rgba(255, 163, 26, 0.35)",
              background: "rgba(255, 163, 26, 0.08)",
              color: "var(--color-text)",
            }}
          >
            {errorMessage}
          </p>
        ) : (
          <div
            className={shared.tableWrapper}
            style={{ opacity: isFetching ? 0.55 : 1, transition: "opacity .2s" }}
            aria-busy={isFetching}
          >
            <table className={shared.table}>
              <thead>
                <tr>
                  <th>Conducteur</th>
                  <th>Trajet</th>
                  <th>Publié le</th>
                  <th>Départ</th>
                  <th>Places</th>
                  <th>Prix/place</th>
                  <th>Lecture admin</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((trip) => {
                  const lifecycle = getTripLifecycleStatus(trip);
                  return (
                    <tr key={trip.id}>
                      <td>
                        <strong>
                          {trip.driver
                            ? `${trip.driver.firstName} ${trip.driver.lastName}`
                            : "-"}
                        </strong>
                        <br />
                        <small style={{ color: "var(--color-text-muted)" }}>
                          {trip.driver?.phone ?? "Téléphone indisponible"}
                        </small>
                      </td>
                      <td>
                        <strong>{trip.departureLocation}</strong>
                        <br />
                        <small style={{ color: "var(--color-text-muted)" }}>
                          → {trip.arrivalLocation}
                        </small>
                      </td>
                      <td>{formatDate(trip.createdAt)}</td>
                      <td>{formatDate(trip.departureDate)}</td>
                      <td>
                        {trip.availableSeats}
                        {typeof trip.totalSeats === "number" ? ` / ${trip.totalSeats}` : ""}
                      </td>
                      <td>{trip.isFree ? "Gratuit" : `${trip.pricePerSeat} FC`}</td>
                      <td>
                        <span className={badgeClass(lifecycle)}>
                          {getTripLifecycleLabel(lifecycle)}
                        </span>
                        <br />
                        <small style={{ color: "var(--color-text-muted)" }}>
                          {backendStatusLabelMap[trip.status]}
                        </small>
                        {trip.isPrivate ? (
                          <>
                            <br />
                            <small style={{ color: "var(--color-text-muted)" }}>Trajet privé</small>
                          </>
                        ) : null}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <a
                            className={shared.secondaryButton}
                            href={`/trips?fiche=${encodeURIComponent(trip.id)}`}
                            style={{ fontSize: "0.85rem", padding: "6px 12px" }}
                          >
                            Voir le détail
                          </a>
                          <button
                            type="button"
                            className={shared.primaryButton}
                            onClick={() => openEditModal(trip)}
                            style={{ fontSize: "0.85rem", padding: "6px 12px" }}
                          >
                            Modifier
                          </button>
                          {trip.status !== "cancelled" ? (
                            <button
                              type="button"
                              className={shared.primaryButton}
                              onClick={() => handleDeactivateTrip(trip)}
                              disabled={isDeactivating}
                              style={{
                                fontSize: "0.85rem",
                                padding: "6px 12px",
                                background: "rgba(255, 208, 71, 0.14)",
                                color: "var(--color-warning)",
                              }}
                            >
                              Désactiver
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className={shared.primaryButton}
                            onClick={() => handleDeleteTrip(trip)}
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {filtered.length === 0 && !isFetching && !error && (
          <p style={{ textAlign: "center", color: "var(--color-text-muted)" }}>
            Aucun trajet ne correspond aux filtres sur cette page
          </p>
        )}

        {!error ? (
          <Pagination
            page={page}
            limit={PAGE_SIZE}
            total={total}
            pageCount={trips.length}
            disabled={isFetching}
            noun="trajets"
            onChange={(next) => {
              setPage(next);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        ) : null}
      </section>

      {selectedTrip ? (
        <div
          className={shared.modalBackdrop}
          onClick={closeEditModal}
          role="presentation"
        >
          <form
            className={`${shared.card} ${shared.modalCard}`}
            onSubmit={handleSubmitTrip}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-trip-title"
          >
            <h3 id="edit-trip-title">Modifier le trajet</h3>
            <div className={shared.grid}>
              <label>
                Départ
                <input
                  value={tripForm.departureLocation ?? ""}
                  onChange={(event) =>
                    setTripForm((prev) => ({
                      ...prev,
                      departureLocation: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Arrivée
                <input
                  value={tripForm.arrivalLocation ?? ""}
                  onChange={(event) =>
                    setTripForm((prev) => ({
                      ...prev,
                      arrivalLocation: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Date de départ
                <input
                  type="datetime-local"
                  value={tripForm.departureDate ?? ""}
                  onChange={(event) =>
                    setTripForm((prev) => ({
                      ...prev,
                      departureDate: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Places totales
                <input
                  type="number"
                  min={1}
                  value={tripForm.totalSeats ?? ""}
                  onChange={(event) =>
                    setTripForm((prev) => ({
                      ...prev,
                      totalSeats: Number(event.target.value),
                    }))
                  }
                />
              </label>
              <label>
                Prix/place
                <input
                  type="number"
                  min={0}
                  value={tripForm.pricePerSeat ?? 0}
                  disabled={Boolean(tripForm.isFree)}
                  onChange={(event) =>
                    setTripForm((prev) => ({
                      ...prev,
                      pricePerSeat: Number(event.target.value),
                    }))
                  }
                />
              </label>
              <label>
                Statut
                <select
                  value={tripForm.status ?? "upcoming"}
                  onChange={(event) =>
                    setTripForm((prev) => ({
                      ...prev,
                      status: event.target.value as TripStatus,
                    }))
                  }
                >
                  {tripStatusOptions.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className={shared.checkboxRow}>
              <input
                type="checkbox"
                checked={Boolean(tripForm.isFree)}
                onChange={(event) =>
                  setTripForm((prev) => ({
                    ...prev,
                    isFree: event.target.checked,
                    pricePerSeat: event.target.checked ? 0 : prev.pricePerSeat,
                  }))
                }
              />
              Trajet gratuit
            </label>
            <label>
              Description
              <textarea
                rows={3}
                value={tripForm.description ?? ""}
                onChange={(event) =>
                  setTripForm((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
              />
            </label>
            <div className={shared.modalActions}>
              <button
                type="button"
                className={shared.secondaryButton}
                onClick={closeEditModal}
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

function RidesRoute() {
  const fiche = useSearchParams().get("fiche");
  if (fiche) return <TripStatement tripId={fiche} />;
  return <RidesPage />;
}

export default function RidesPageRoute() {
  return (
    <Suspense fallback={null}>
      <RidesRoute />
    </Suspense>
  );
}
