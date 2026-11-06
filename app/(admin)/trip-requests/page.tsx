"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import type { TripPaymentMode, TripRequest, TripRequestStatus } from "@/lib/features/admin/types";
import { useExportAdminXlsMutation } from "@/lib/features/admin/exportApi";
import {
  useDeactivateAdminTripRequestMutation,
  useDeleteAdminTripRequestMutation,
  useGetAllTripRequestsQuery,
  useUpdateAdminTripRequestMutation,
  type UpdateTripRequestPayload,
} from "@/lib/features/tripRequests/tripRequestsApi";
import { getApiErrorMessage } from "@/lib/utils/apiErrors";
import { toDateInput, canEditRequest, buildRequestPatch } from "@/lib/features/tripRequests/requestEdit";
import { datedExportName, downloadBlob } from "@/lib/utils/downloadBlob";
import { Download, Info } from "lucide-react";

import shared from "../styles/page.module.css";

import { confirmAction, notify } from "@/app/components/ui/Feedback";
import { BulkBar, DataTable, type DataColumn } from "@/app/components/ui/DataTable";
import { Pagination } from "@/app/components/ui/Pagination";
import { bulkSummary, runBulk } from "@/lib/utils/runBulk";

import { useUrlState } from "@/lib/utils/useUrlState";

const statusLabel: Record<TripRequestStatus, string> = {
  pending: "En attente",
  offers_received: "Offres reçues",
  driver_selected: "Conducteur choisi",
  cancelled: "Annulée",
  expired: "Expirée",
};

const statusClass = (status: TripRequestStatus) => {
  if (status === "driver_selected") return `${shared.badge} ${shared.badgeSuccess}`;
  if (status === "cancelled" || status === "expired") {
    return `${shared.badge} ${shared.badgeDanger}`;
  }
  return `${shared.badge} ${shared.badgeWarning}`;
};

const formatDate = (dateString: string) =>
  new Intl.DateTimeFormat("fr-CD", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString));

const formatAmount = (amount?: number | null) =>
  amount === null || amount === undefined
    ? "—"
    : new Intl.NumberFormat("fr-CD", {
        style: "currency",
        currency: "CDF",
        maximumFractionDigits: 0,
      }).format(Number(amount));

export default function TripRequestsPage() {
  const [statusFilter, setStatusFilter] = useUrlState<TripRequestStatus | "all">("statut", "all");
  const [search, setSearch] = useUrlState<string>("q", "");
  const [page, setPage] = useUrlState<number>("page", 1);
  const [selectedRequest, setSelectedRequest] = useState<TripRequest | null>(null);
  const [requestForm, setRequestForm] = useState<UpdateTripRequestPayload>({});
  const limit = 50;

  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const { data, isFetching, isLoading } = useGetAllTripRequestsQuery({
    page,
    limit,
    status: statusFilter,
  });
  const tripRequests = useMemo(() => data?.tripRequests ?? [], [data]);

  const [updateTripRequest, { isLoading: isUpdating }] =
    useUpdateAdminTripRequestMutation();
  const [deactivateTripRequest, { isLoading: isDeactivating }] =
    useDeactivateAdminTripRequestMutation();
  const [deleteTripRequest, { isLoading: isDeleting }] =
    useDeleteAdminTripRequestMutation();
  const [exportAdminXls, { isLoading: isExporting }] = useExportAdminXlsMutation();
  const [exportError, setExportError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return tripRequests;

    return tripRequests.filter((request) => {
      const passengerName = `${request.passenger.firstName} ${request.passenger.lastName}`.toLowerCase();
      return (
        request.departureLocation.toLowerCase().includes(term) ||
        request.arrivalLocation.toLowerCase().includes(term) ||
        passengerName.includes(term) ||
        request.passenger.phone.includes(term)
      );
    });
  }, [tripRequests, search]);

  const openEditModal = (request: TripRequest) => {
    if (!canEditRequest(request)) return;
    setSelectedRequest(request);
    setRequestForm({
      departureLocation: request.departureLocation,
      departureReference: request.departureReference ?? "",
      arrivalLocation: request.arrivalLocation,
      arrivalReference: request.arrivalReference ?? "",
      departureDateMin: toDateInput(request.departureDateMin),
      departureDateMax: toDateInput(request.departureDateMax),
      numberOfSeats: request.numberOfSeats,
      maxPricePerSeat: request.maxPricePerSeat,
      paymentMode: request.paymentMode,
      description: request.description ?? "",
    });
  };

  const closeEditModal = () => {
    setSelectedRequest(null);
    setRequestForm({});
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedRequest || isUpdating) return;

    try {
      await updateTripRequest({
        tripRequestId: selectedRequest.id,
        payload: buildRequestPatch(selectedRequest, requestForm),
      }).unwrap();
      closeEditModal();
    } catch (error) {
      console.error("Failed to update trip request:", error);
      notify(error instanceof Error ? error.message : getApiErrorMessage(error, "Impossible de modifier cette demande de trajet."));
    }
  };

  const route = (request: TripRequest) =>
    `${request.departureLocation} → ${request.arrivalLocation}`;
  const passengerName = (request: TripRequest) =>
    `${request.passenger.firstName} ${request.passenger.lastName}`.trim();

  const handleDeactivate = async (request: TripRequest) => {
    const confirmed = await confirmAction({
      title: "Désactiver cette demande ?",
      message: `${passengerName(request)} · ${route(request)}\nLes conducteurs ne pourront plus faire d’offre.`,
      confirmLabel: "Désactiver",
      tone: "danger",
    });
    if (!confirmed) return;
    try {
      await deactivateTripRequest(request.id).unwrap();
      notify("Demande désactivée.", "success");
    } catch (error) {
      console.error("Failed to deactivate trip request:", error);
      notify(getApiErrorMessage(error, "Impossible de désactiver cette demande."), "error");
    }
  };

  const handleDelete = async (request: TripRequest) => {
    const confirmed = await confirmAction({
      title: "Supprimer définitivement cette demande ?",
      message: `${passengerName(request)} · ${route(request)}\nCette action est irréversible ; préférez « Désactiver » pour simplement la retirer.`,
      confirmLabel: "Supprimer",
      tone: "danger",
    });
    if (!confirmed) return;
    try {
      await deleteTripRequest(request.id).unwrap();
      notify("Demande supprimée.", "success");
    } catch (error) {
      console.error("Failed to delete trip request:", error);
      notify(getApiErrorMessage(error, "Impossible de supprimer cette demande."), "error");
    }
  };

  useEffect(() => {
    setChecked(new Set());
  }, [page, statusFilter]);

  const checkedRequests = filtered.filter((request) => checked.has(request.id));
  const checkedActive = checkedRequests.filter((request) => request.status !== "cancelled");

  const bulkDeactivate = async () => {
    if (!checkedActive.length) return;
    const confirmed = await confirmAction({
      title: `Désactiver ${checkedActive.length} demande(s) ?`,
      message: "Les conducteurs ne pourront plus faire d’offre sur ces demandes.",
      confirmLabel: "Désactiver",
      tone: "danger",
    });
    if (!confirmed) return;
    const result = await runBulk(
      checkedActive,
      (request) => deactivateTripRequest(request.id).unwrap(),
      (done, count) => setProgress({ done, total: count })
    );
    setProgress(null);
    setChecked(new Set(result.failed.map(({ item }) => item.id)));
    notify(
      bulkSummary(result.succeeded, result.failed.length, "demande"),
      result.failed.length ? "error" : "success"
    );
  };

  const columns: DataColumn<TripRequest>[] = [
    {
      key: "passenger",
      header: "Passager",
      sortValue: passengerName,
      cell: (request) => (
        <>
          <strong>{passengerName(request)}</strong>
          <br />
          <small className={shared.mutedText}>{request.passenger.phone}</small>
        </>
      ),
    },
    {
      key: "route",
      header: "Demande",
      sortValue: (request) => request.departureLocation,
      cell: (request) => (
        <>
          <strong>{request.departureLocation}</strong>
          <br />
          <small className={shared.mutedText}>→ {request.arrivalLocation}</small>
        </>
      ),
    },
    {
      key: "window",
      header: "Fenêtre de départ",
      sortValue: (request) => request.departureDateMin,
      cell: (request) => (
        <>
          {formatDate(request.departureDateMin)}
          <br />
          <small className={shared.mutedText}>au plus tard {formatDate(request.departureDateMax)}</small>
        </>
      ),
    },
    {
      key: "seats",
      header: "Places",
      align: "right",
      sortValue: (request) => request.numberOfSeats,
      cell: (request) => request.numberOfSeats,
    },
    {
      key: "price",
      header: "Prix max",
      align: "right",
      sortValue: (request) => request.maxPricePerSeat ?? null,
      cell: (request) => formatAmount(request.maxPricePerSeat),
    },
    {
      key: "offers",
      header: "Offres",
      align: "right",
      sortValue: (request) => request.driverOffers.length,
      cell: (request) => request.driverOffers.length,
    },
    {
      key: "status",
      header: "Statut",
      sortValue: (request) => statusLabel[request.status],
      cell: (request) => (
        <span className={statusClass(request.status)}>{statusLabel[request.status]}</span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (request) => (
        <div className={shared.rowActions}>
          <button
            type="button"
            className={shared.secondaryButton}
            onClick={() => openEditModal(request)}
            disabled={!canEditRequest(request)}
          >
            {request.status === "expired" ? "Reprogrammer" : "Modifier"}
          </button>
          {request.status !== "cancelled" ? (
            <button
              type="button"
              className={shared.secondaryButton}
              onClick={() => void handleDeactivate(request)}
              disabled={isDeactivating}
            >
              Désactiver
            </button>
          ) : null}
          <button
            type="button"
            className={shared.dangerButton}
            onClick={() => void handleDelete(request)}
            disabled={isDeleting}
          >
            Supprimer
          </button>
        </div>
      ),
    },
  ];

  const handleExport = async () => {
    setExportError(null);
    try {
      const blob = await exportAdminXls({
        url: "/admin/trip-requests/export",
        params: { status: statusFilter },
      }).unwrap();
      downloadBlob(blob, datedExportName("demandes-trajets-zwanga"));
    } catch (error) {
      setExportError(
        getApiErrorMessage(error, "Impossible d'exporter les demandes de trajet.")
      );
    }
  };

  return (
    <div className={shared.page}>
      <section className={shared.section}>
        <div className={shared.sectionHeader}>
          <div>
            <h1>Demandes de trajet</h1>
            <p className={shared.filterSummary}>
              {typeof data?.total === "number" ? `${data.total} au total · ` : ""}
              {filtered.length} affichée{filtered.length > 1 ? "s" : ""} sur cette page
            </p>
          </div>
          <div className={shared.toolbar}>
            <div className={shared.filterField}>
              <label className={shared.filterLabel} htmlFor="requests-search">
                Rechercher (page affichée)
              </label>
              <input
                id="requests-search"
                className={shared.filterSearch}
                placeholder="Lieu, passager ou téléphone"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className={shared.filterField}>
              <label className={shared.filterLabel} htmlFor="requests-status">
                Filtrer par statut
              </label>
              <select
                id="requests-status"
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value as TripRequestStatus | "all");
                  setPage(1);
                }}
              >
                <option value="all">Tous les statuts</option>
                <option value="pending">En attente</option>
                <option value="offers_received">Offres reçues</option>
                <option value="driver_selected">Conducteur choisi</option>
                <option value="cancelled">Annulées</option>
                <option value="expired">Expirées</option>
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
            Une demande est publiée par un passager qui cherche un conducteur.
            « Offres reçues » indique qu’au moins un conducteur a répondu ;
            « Conducteur choisi » que le passager a tranché.
          </span>
        </p>

        {exportError ? (
          <p className={shared.errorText} role="alert">
            {exportError}
          </p>
        ) : null}

        <BulkBar count={checked.size} onClear={() => setChecked(new Set())} progress={progress}>
          <button
            type="button"
            className={shared.secondaryButton}
            onClick={() => void bulkDeactivate()}
            disabled={!checkedActive.length}
          >
            Désactiver ({checkedActive.length})
          </button>
        </BulkBar>

        <DataTable
          caption="Demandes de trajet"
          rows={filtered}
          columns={columns}
          rowKey={(request) => request.id}
          loading={isLoading}
          refreshing={isFetching && !isLoading}
          selected={checked}
          onSelectedChange={setChecked}
          empty={
            search.trim()
              ? "Aucune demande de cette page ne correspond à la recherche."
              : "Aucune demande pour ce filtre."
          }
        />

        <Pagination
          page={page}
          limit={limit}
          total={typeof data?.total === "number" ? data.total : null}
          pageCount={tripRequests.length}
          onChange={setPage}
          disabled={isFetching}
          noun="demandes"
        />
      </section>

      {selectedRequest ? (
        <div
          className={shared.modalBackdrop}
          onClick={closeEditModal}
          role="presentation"
        >
          <form
            className={`${shared.card} ${shared.modalCard}`}
            onSubmit={handleSubmit}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-request-title"
          >
            <h3 id="edit-request-title">Modifier la demande</h3>
            <p>Les anciennes offres en attente seront retirées. Une demande expirée exige un nouveau créneau futur. Une recherche immédiate reprogrammée devient une demande classique.</p>
            <div className={shared.grid}>
              <label>
                Depart
                <input
                  value={requestForm.departureLocation ?? ""}
                  onChange={(event) =>
                    setRequestForm((prev) => ({
                      ...prev,
                      departureLocation: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Arrivee
                <input
                  value={requestForm.arrivalLocation ?? ""}
                  onChange={(event) =>
                    setRequestForm((prev) => ({
                      ...prev,
                      arrivalLocation: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Depart minimum
                <input
                  type="datetime-local"
                  value={requestForm.departureDateMin ?? ""}
                  onChange={(event) =>
                    setRequestForm((prev) => ({
                      ...prev,
                      departureDateMin: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Depart maximum
                <input
                  type="datetime-local"
                  value={requestForm.departureDateMax ?? ""}
                  onChange={(event) =>
                    setRequestForm((prev) => ({
                      ...prev,
                      departureDateMax: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Places
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={requestForm.numberOfSeats ?? ""}
                  onChange={(event) =>
                    setRequestForm((prev) => ({
                      ...prev,
                      numberOfSeats: Number(event.target.value),
                    }))
                  }
                />
              </label>
              <label>
                Prix max/place
                <input
                  type="number"
                  min={0}
                  value={requestForm.maxPricePerSeat ?? ""}
                  onChange={(event) =>
                    setRequestForm((prev) => ({
                      ...prev,
                      maxPricePerSeat:
                        event.target.value === "" ? null : Number(event.target.value),
                    }))
                  }
                />
              </label>
              <label>
                Paiement
                <select
                  value={requestForm.paymentMode ?? "cash"}
                  onChange={(event) =>
                    setRequestForm((prev) => ({
                      ...prev,
                      paymentMode: event.target.value as TripPaymentMode,
                    }))
                  }
                >
                  <option value="cash">cash</option>
                  <option value="electronic">electronic</option>
                  <option value="points">points</option>
                </select>
              </label>
            </div>
            <label>
              Description
              <textarea
                rows={3}
                value={requestForm.description ?? ""}
                onChange={(event) =>
                  setRequestForm((prev) => ({
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
