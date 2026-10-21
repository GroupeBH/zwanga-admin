"use client";
import { useEffect, useMemo, useState } from "react";
import {
  useProCatalogueQuery,
  useProCasesQuery,
  useProCaseQuery,
} from "@/lib/features/proServices/proServicesApi";
import { useGetCurrentUserProfileQuery } from "@/lib/features/profile/profileApi";
import { amount, labels } from "@/lib/features/proServices/types";
import { getApiErrorMessage } from "@/lib/utils/apiErrors";
import { datedExportName, downloadBlob } from "@/lib/utils/downloadBlob";
import { CaseOperations } from "./CaseOperations";
import { QuoteForm } from "./QuoteForm";
import { ServiceConfiguration } from "./ServiceConfiguration";
import { Download, Info, RotateCcw } from "lucide-react";
import shared from "../styles/page.module.css";
import s from "./services.module.css";

const STATUSES = [
  "submitted",
  "reviewing",
  "needs_info",
  "quoted",
  "accepted",
  "processing",
  "ready",
  "completed",
  "rejected",
  "cancelled",
];
const tone = (status: string) =>
  ["completed", "ready"].includes(status)
    ? shared.badgeSuccess
    : ["rejected", "cancelled"].includes(status)
      ? shared.badgeDanger
      : ["submitted", "needs_info"].includes(status)
        ? shared.badgeWarning
        : "";
const day = (value: string) => value.slice(0, 10);

export default function ProServicesPage() {
  const [cursors, setCursors] = useState<string[]>([]);
  const cursor = cursors[cursors.length - 1];
  const [status, setStatus] = useState("");
  const [documentCode, setDocumentCode] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [id, setId] = useState("");

  const catalogue = useProCatalogueQuery();
  const list = useProCasesQuery({
    cursor,
    status: status || undefined,
  });
  const detail = useProCaseQuery(id, { skip: !id });
  const profile = useGetCurrentUserProfileQuery();
  const item = detail.currentData;

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchDraft.trim());
      setCursors([]);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchDraft]);

  useEffect(() => {
    if (!id) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setId("");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [id]);

  const documentOptions = useMemo(
    () =>
      catalogue.data?.find((service) => service.code === "documents")
        ?.documentOptions ?? [],
    [catalogue.data],
  );
  const serviceName = (code: string) =>
    catalogue.data?.find((service) => service.code === code)?.name ?? code;
  const documentLabel = (serviceCode: string, code: string) =>
    catalogue.data
      ?.find((service) => service.code === serviceCode)
      ?.documentOptions.find((doc) => doc.code === code)?.label ?? code;

  // Le serveur filtre déjà ; on re-filtre la page chargée pour rester
  // cohérent si certains critères ne sont pas encore pris en charge.
  const rows = useMemo(() => {
    const needle = search.toLowerCase();
    return (list.currentData?.items ?? []).filter((row) => {
      if (from && day(row.createdAt) < from) return false;
      if (to && day(row.createdAt) > to) return false;
      if (documentCode && row.documentCodes && !row.documentCodes.includes(documentCode))
        return false;
      if (
        needle &&
        !`${row.fullName} ${row.phone ?? ""}`.toLowerCase().includes(needle)
      )
        return false;
      return true;
    });
  }, [list.currentData, from, to, documentCode, search]);

  const hasFilters = !!(status || documentCode || from || to || searchDraft);
  const resetPaging = () => setCursors([]);
  const reset = () => {
    setStatus("");
    setDocumentCode("");
    setFrom("");
    setTo("");
    setSearchDraft("");
    setSearch("");
    resetPaging();
  };

  // L'API ne filtre que par statut : recherche, dates et type de document
  // s'appliquent aux demandes chargées, et l'export reprend ce qui est affiché.
  const handleExport = () => {
    const cell = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const header = ["Demandeur", "Téléphone", "Service", "Documents", "Soumise le", "Statut"];
    const lines = rows.map((row) =>
      [
        row.fullName,
        row.phone ?? "",
        serviceName(row.serviceCode),
        (row.documentCodes ?? [])
          .map((code) => documentLabel(row.serviceCode, code))
          .join(", "),
        new Date(row.createdAt).toLocaleDateString("fr-FR"),
        labels[row.status] ?? row.status,
      ]
        .map(cell)
        .join(";"),
    );
    const bom = String.fromCharCode(0xfeff);
    const eol = String.fromCharCode(13, 10);
    const csv = bom + [header.map(cell).join(";"), ...lines].join(eol);
    downloadBlob(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
      datedExportName("demandes-documents-zwanga").replace(/\.xls$/, ".csv"),
    );
  };

  return (
    <div className={shared.page}>
      <section className={shared.section}>
        <div className={shared.sectionHeader}>
          <div>
            <h2>Zwanga Services</h2>
            <p className={shared.filterSummary}>
              {rows.length} demande{rows.length > 1 ? "s" : ""} affichée
              {rows.length > 1 ? "s" : ""}
              {status ? ` · ${labels[status]}` : ""}
              {documentCode
                ? ` · ${documentOptions.find((doc) => doc.code === documentCode)?.label ?? documentCode}`
                : ""}
              {from ? ` · soumises du ${from.split("-").reverse().join("/")}` : ""}
              {to ? ` · jusqu'au ${to.split("-").reverse().join("/")}` : ""}
            </p>
          </div>
          <div className={shared.toolbar}>
            <div className={shared.filterField}>
              <label className={shared.filterLabel} htmlFor="svc-search">
                Rechercher un demandeur
              </label>
              <input
                id="svc-search"
                className={shared.filterSearch}
                placeholder="Nom ou téléphone"
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
              />
            </div>
            <div className={shared.filterField}>
              <label className={shared.filterLabel} htmlFor="svc-status">
                Statut
              </label>
              <select
                id="svc-status"
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  resetPaging();
                }}
              >
                <option value="">Tous les statuts</option>
                {STATUSES.map((key) => (
                  <option value={key} key={key}>
                    {labels[key]}
                  </option>
                ))}
              </select>
            </div>
            <div className={shared.filterField}>
              <label className={shared.filterLabel} htmlFor="svc-doc">
                Type de document
              </label>
              <select
                id="svc-doc"
                value={documentCode}
                onChange={(event) => {
                  setDocumentCode(event.target.value);
                  resetPaging();
                }}
              >
                <option value="">Tous les documents</option>
                {documentOptions.map((doc) => (
                  <option key={doc.code} value={doc.code}>
                    {doc.label}
                  </option>
                ))}
              </select>
            </div>
            <div className={shared.filterField}>
              <label className={shared.filterLabel} htmlFor="svc-from">
                Soumise du
              </label>
              <input
                id="svc-from"
                type="date"
                value={from}
                max={to || undefined}
                onChange={(event) => {
                  setFrom(event.target.value);
                  resetPaging();
                }}
              />
            </div>
            <div className={shared.filterField}>
              <label className={shared.filterLabel} htmlFor="svc-to">
                au
              </label>
              <input
                id="svc-to"
                type="date"
                value={to}
                min={from || undefined}
                onChange={(event) => {
                  setTo(event.target.value);
                  resetPaging();
                }}
              />
            </div>
            {hasFilters ? (
              <button
                type="button"
                className={shared.secondaryButton}
                onClick={reset}
              >
                <RotateCcw size={14} aria-hidden="true" />
                Réinitialiser
              </button>
            ) : null}
            <button
              type="button"
              className={shared.primaryButton}
              onClick={handleExport}
              disabled={!rows.length}
            >
              <Download size={16} style={{ marginRight: 8 }} />
              Exporter
            </button>
          </div>
        </div>

        <p className={shared.helpText}>
          <Info size={16} aria-hidden="true" />
          <span>
            Le financement reste verrouillé sans contrat validé. Une demande
            n’est ni un crédit accordé ni une autorisation de conserver des
            originaux. « Traiter » ouvre le dossier pour proposer un devis ou
            changer son statut. L’export reprend les demandes affichées.
          </span>
        </p>

        {catalogue.isError ? (
          <p className={shared.errorText} role="alert">
            Catalogue indisponible.{" "}
            <button
              type="button"
              className={shared.secondaryButton}
              onClick={() => catalogue.refetch()}
            >
              Réessayer
            </button>
          </p>
        ) : null}
        {list.isError ? (
          <p className={shared.errorText} role="alert">
            {getApiErrorMessage(list.error, "Dossiers indisponibles.")}{" "}
            <button
              type="button"
              className={shared.secondaryButton}
              onClick={() => list.refetch()}
            >
              Réessayer
            </button>
          </p>
        ) : null}

        <div className={shared.tableWrapper}>
          <table className={shared.table}>
            <thead>
              <tr>
                <th>Demandeur</th>
                <th>Service</th>
                <th>Documents</th>
                <th>Soumise le</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <p className={shared.emptyState}>
                      {list.isFetching
                        ? "Chargement des demandes..."
                        : hasFilters
                          ? "Aucune demande ne correspond à ces filtres."
                          : "Aucune demande."}
                    </p>
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.fullName}</strong>
                      {row.phone ? (
                        <div>
                          <small style={{ color: "var(--color-text-muted)" }}>
                            {row.phone}
                          </small>
                        </div>
                      ) : null}
                    </td>
                    <td>{serviceName(row.serviceCode)}</td>
                    <td>
                      {row.documentCodes?.length
                        ? row.documentCodes
                            .map((code) => documentLabel(row.serviceCode, code))
                            .join(", ")
                        : "—"}
                    </td>
                    <td>
                      {new Date(row.createdAt).toLocaleDateString("fr-FR")}
                    </td>
                    <td>
                      <span className={`${shared.badge} ${tone(row.status)}`}>
                        {labels[row.status] ?? row.status}
                      </span>
                    </td>
                    <td>
                      <div className={shared.rowActions}>
                        <button
                          type="button"
                          className={shared.primaryButton}
                          onClick={() => setId(row.id)}
                        >
                          Traiter
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className={shared.pagination}>
          <p className={shared.paginationInfo}>
            Page {cursors.length + 1} · {rows.length} résultat
            {rows.length > 1 ? "s" : ""}
          </p>
          <div className={shared.paginationButtons}>
            <button
              type="button"
              className={shared.secondaryButton}
              onClick={() => setCursors((stack) => stack.slice(0, -1))}
              disabled={!cursors.length || list.isFetching}
            >
              Page précédente
            </button>
            <button
              type="button"
              className={shared.secondaryButton}
              onClick={() => {
                const next = list.currentData?.nextCursor;
                if (next) setCursors((stack) => [...stack, next]);
              }}
              disabled={!list.currentData?.nextCursor || list.isFetching}
            >
              Page suivante
            </button>
          </div>
        </div>
      </section>

      {id && (
        <div
          className={s.overlay}
          onClick={() => setId("")}
          role="presentation"
        >
          <aside
            className={s.drawer}
            role="dialog"
            aria-modal="true"
            aria-label="Traitement de la demande"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className={`${shared.secondaryButton} ${s.close}`}
              onClick={() => setId("")}
            >
              Fermer ✕
            </button>
            {detail.isFetching && !item && (
              <p role="status">Chargement du dossier…</p>
            )}
            {detail.isError && (
              <p role="alert" className={s.error}>
                {getApiErrorMessage(detail.error, "Dossier indisponible.")}
              </p>
            )}
            {item && (
              <div key={item.id}>
                <div className={s.summary}>
                  <h2>{item.application.fullName}</h2>
                  <span className={`${shared.badge} ${tone(item.status)}`}>
                    {labels[item.status]}
                  </span>
                </div>
                <p className={s.muted}>
                  {item.application.phone} · Origine :{" "}
                  {item.origin === "web" ? "Site web" : "Application"} ·
                  Soumise le{" "}
                  {new Date(item.createdAt).toLocaleDateString("fr-FR")}
                </p>
                <div className={s.facts}>
                  <div>
                    <small>Véhicule</small>
                    <p>
                      {item.application.vehicleDescription}{" "}
                      {item.application.plate}
                    </p>
                  </div>
                  <div>
                    <small>Documents demandés</small>
                    <p>
                      {item.application.documents
                        .map((code) => documentLabel(item.serviceCode, code))
                        .join(", ") || "—"}
                    </p>
                  </div>
                </div>
                {item.application.description && (
                  <p>{item.application.description}</p>
                )}
                {!!item.customerMessage && (
                  <p className={s.notice}>{item.customerMessage}</p>
                )}
                {item.quote && (
                  <div className={s.section}>
                    <h3>
                      Devis v{item.quote.version} ·{" "}
                      {amount(item.quote.totalMinor, item.quote.currency)}
                    </h3>
                    <p>{item.quote.description}</p>
                    <p className={s.muted}>
                      Prestataire : {item.quote.providerName} · Apport :{" "}
                      {amount(item.quote.depositMinor, item.quote.currency)}
                    </p>
                    <p>
                      {item.acceptedAt
                        ? `Accepté le ${new Date(item.acceptedAt).toLocaleString("fr-FR")}`
                        : item.canAccept
                          ? "En attente de l’acceptation du titulaire."
                          : "Acceptation verrouillée (contrat, ouverture ou validité)."}
                    </p>
                  </div>
                )}
                {!item.acceptedAt &&
                  item.serviceCode === "documents" &&
                  ["submitted", "reviewing", "needs_info", "quoted"].includes(
                    item.status,
                  ) && (
                    <QuoteForm
                      key={item.quote?.version ?? 0}
                      item={item}
                      offering={catalogue.data?.find(
                        (service) => service.code === item.serviceCode,
                      )}
                    />
                  )}
                <CaseOperations item={item} />
                <details>
                  <summary>Historique récent</summary>
                  {item.events.map((event) => (
                    <p className={s.muted} key={event.id}>
                      {new Date(event.createdAt).toLocaleString("fr-FR")} ·{" "}
                      {event.action}
                    </p>
                  ))}
                </details>
              </div>
            )}
          </aside>
        </div>
      )}

      {profile.data?.user.role === "super_admin" && (
        <section className={`${shared.section} ${s.config}`}>
          <h2>Activation et validation juridique</h2>
          {catalogue.data?.map((service) => (
            <ServiceConfiguration
              key={`${service.code}-${service.availability}-${service.terms?.version}`}
              item={service}
            />
          ))}
        </section>
      )}
    </div>
  );
}
