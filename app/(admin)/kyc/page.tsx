"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Info } from "lucide-react";

import {
  useGetKycDocumentsQuery,
  useVerifyKycMutation,
  type KycStatusFilter,
} from "@/lib/features/kyc/kycApi";
import type { KycDocument, KycStatus } from "@/lib/features/admin/types";

import shared from "../styles/page.module.css";
import styles from "./kyc.module.css";

const KYC_STATUS_LABEL: Record<KycStatus, string> = {
  pending: "En attente",
  approved: "Validé",
  rejected: "Rejeté",
};

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fr-CD", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

const statusClass = (status: KycDocument["status"]) => {
  if (status === "approved") return `${shared.badge} ${shared.badgeSuccess}`;
  if (status === "rejected") return `${shared.badge} ${shared.badgeDanger}`;
  return `${shared.badge} ${shared.badgeWarning}`;
};

const providerLabel = (provider?: KycDocument["provider"]) =>
  provider === "didit" ? "Didit" : "Legacy Zwanga";

export default function KycPage() {
  const [statusFilter, setStatusFilter] = useState<KycStatusFilter>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const limit = 20;

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const { data, isFetching, refetch } = useGetKycDocumentsQuery({
    page,
    limit,
    status: statusFilter,
    search: debouncedSearch || undefined,
  });
  const [verifyKyc, { isLoading }] = useVerifyKycMutation();

  const documents = data?.documents ?? [];
  const total = data?.total ?? 0;

  useEffect(() => {
    if (documents.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !documents.some((document) => document.id === selectedId)) {
      setSelectedId(documents[0].id);
    }
  }, [documents, selectedId]);

  const selected = useMemo(
    () => documents.find((document) => document.id === selectedId) ?? documents[0],
    [documents, selectedId]
  );

  const handleStatusChange = (value: KycStatusFilter) => {
    setStatusFilter(value);
    setPage(1);
    setSelectedId(null);
  };

  return (
    <div className={shared.page}>
      <section className={shared.section}>
        <div className={shared.sectionHeader}>
          <div>
            <h2>Historique KYC</h2>
            <p className={shared.filterSummary}>
              {total} dossier{total > 1 ? "s" : ""} — validés, rejetés et en attente
            </p>
          </div>
          <div className={shared.toolbar}>
            <div className={shared.filterField}>
              <label className={shared.filterLabel} htmlFor="kyc-search">
                Rechercher un dossier
              </label>
              <input
                id="kyc-search"
                className={shared.filterSearch}
                placeholder="Nom, email ou téléphone"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className={shared.filterField}>
              <label className={shared.filterLabel} htmlFor="kyc-status">
                Filtrer par statut
              </label>
              <select
                id="kyc-status"
                value={statusFilter}
                onChange={(event) =>
                  handleStatusChange(event.target.value as KycStatusFilter)
                }
              >
                <option value="all">Tous les statuts</option>
                <option value="pending">En attente</option>
                <option value="approved">Validés</option>
                <option value="rejected">Rejetés</option>
              </select>
            </div>
            <button
              type="button"
              className={shared.secondaryButton}
              onClick={() => refetch()}
              disabled={isFetching}
            >
              {isFetching ? "Actualisation..." : "Actualiser"}
            </button>
          </div>
        </div>

        <p className={shared.helpText}>
          <Info size={16} aria-hidden="true" />
          <span>
            Sélectionnez un dossier à gauche pour afficher les pièces
            d’identité à droite, puis validez ou rejetez. Un rejet demande un
            motif, qui est transmis à l’utilisateur.
          </span>
        </p>

        <div className={styles.split}>
          <div className={styles.queue}>
            {isFetching && documents.length === 0 ? (
              <p className={shared.emptyState}>Chargement de l’historique KYC...</p>
            ) : documents.length === 0 ? (
              <p className={shared.emptyState}>
                Aucun dossier KYC ne correspond à ce filtre.
              </p>
            ) : (
              documents.map((document) => (
                <button
                  type="button"
                  key={document.id}
                  className={`${styles.queueItem} ${
                    selected?.id === document.id ? styles.active : ""
                  }`}
                  onClick={() => setSelectedId(document.id)}
                >
                  <div className={styles.queueHeader}>
                    <strong>
                      {document.user?.firstName} {document.user?.lastName}
                    </strong>
                    <span className={statusClass(document.status)}>
                      {KYC_STATUS_LABEL[document.status] ?? document.status}
                    </span>
                  </div>
                  <div className={styles.queueMeta}>
                    <span>{document.user?.email ?? document.user?.phone}</span>
                    <span>Créé {formatDate(document.createdAt)}</span>
                    <span>{providerLabel(document.provider)}</span>
                  </div>
                </button>
              ))
            )}
          </div>

          {selected ? (
            <div className={styles.detail}>
              <div className={shared.card}>
                <h3>Dossier #{selected.id}</h3>
                <p className={styles.meta}>
                  {selected.user?.firstName} {selected.user?.lastName} •{" "}
                  {selected.user?.phone}
                </p>
                <div className={shared.timeline}>
                  <div className={shared.timelineItem}>
                    <strong>Soumis</strong>
                    <span>{formatDate(selected.createdAt)}</span>
                  </div>
                  <div className={shared.timelineItem}>
                    <strong>Mise à jour</strong>
                    <span>{formatDate(selected.updatedAt)}</span>
                  </div>
                  <div className={shared.timelineItem}>
                    <strong>Fournisseur</strong>
                    <span>{providerLabel(selected.provider)}</span>
                  </div>
                  <div className={shared.timelineItem}>
                    <strong>
                      {selected.reviewedBy
                        ? `Revu par ${selected.reviewedBy}`
                        : "En attente de revue"}
                    </strong>
                    <span>{formatDate(selected.reviewedAt)}</span>
                  </div>
                </div>
                {selected.rejectionReason ? (
                  <div className={styles.rejection}>
                    Motif de rejet : {selected.rejectionReason}
                  </div>
                ) : null}
              </div>

              {selected.provider === "didit" ? (
                <div className={shared.card}>
                  <h3>Vérification Didit</h3>
                  <dl className={styles.providerFacts}>
                    <div>
                      <dt>Session</dt>
                      <dd>{selected.diditSessionId ?? "Non renseignée"}</dd>
                    </div>
                    <div>
                      <dt>Numéro</dt>
                      <dd>{selected.diditSessionNumber ?? "—"}</dd>
                    </div>
                    <div>
                      <dt>Workflow</dt>
                      <dd>{selected.diditWorkflowId ?? "—"}</dd>
                    </div>
                    <div>
                      <dt>Statut Didit</dt>
                      <dd>{selected.diditSessionStatus ?? selected.status}</dd>
                    </div>
                    <div>
                      <dt>Dernière synchronisation</dt>
                      <dd>{formatDate(selected.diditLastSyncedAt)}</dd>
                    </div>
                  </dl>
                  <p className={styles.providerHint}>
                    Les images et données sensibles restent hébergées par Didit.
                    Zwanga conserve uniquement le statut, les identifiants de
                    session et un résumé technique minimal.
                  </p>
                </div>
              ) : null}

              <div className={styles.documentGrid}>
                <div className={styles.documentPreview}>
                  {selected.cniFrontUrl ? (
                    <Image
                      src={selected.cniFrontUrl}
                      alt="Carte nationale - Recto"
                      width={400}
                      height={300}
                      style={{ objectFit: "contain" }}
                      unoptimized
                    />
                  ) : (
                    "Recto CNI non fourni"
                  )}
                </div>
                <div className={styles.documentPreview}>
                  {selected.cniBackUrl ? (
                    <Image
                      src={selected.cniBackUrl}
                      alt="Carte nationale - Verso"
                      width={400}
                      height={300}
                      style={{ objectFit: "contain" }}
                      unoptimized
                    />
                  ) : (
                    "Verso CNI non fourni"
                  )}
                </div>
                <div className={styles.documentPreview}>
                  {selected.selfieUrl ? (
                    <Image
                      src={selected.selfieUrl}
                      alt="Selfie contrôle"
                      width={400}
                      height={300}
                      style={{ objectFit: "contain" }}
                      unoptimized
                    />
                  ) : (
                    "Selfie non fourni"
                  )}
                </div>
              </div>

              {selected.status === "pending" ? (
                <div className={shared.card}>
                  <strong>Actions</strong>
                  <div className={shared.toolbar}>
                    <button
                      type="button"
                      className={shared.primaryButton}
                      disabled={isLoading}
                      onClick={() =>
                        verifyKyc({ kycId: selected.id, approved: true }).unwrap()
                      }
                    >
                      Valider
                    </button>
                    <button
                      type="button"
                      className={shared.primaryButton}
                      style={{
                        background: "rgba(255, 75, 85, 0.15)",
                        color: "var(--color-danger)",
                      }}
                      disabled={isLoading}
                      onClick={() =>
                        verifyKyc({
                          kycId: selected.id,
                          approved: false,
                          reason: rejectReason || "Motif non précisé",
                        }).unwrap()
                      }
                    >
                      Rejeter
                    </button>
                  </div>
                  <textarea
                    placeholder="Motif du rejet (ex: Document illisible, informations manquantes...)"
                    style={{
                      borderRadius: 16,
                      border: "1px solid var(--color-border)",
                      background: "transparent",
                      color: "var(--color-text)",
                      padding: "12px 14px",
                      minHeight: 80,
                    }}
                    value={rejectReason}
                    onChange={(event) => setRejectReason(event.target.value)}
                    disabled={isLoading}
                  />
                </div>
              ) : (
                <div className={shared.card}>
                  <strong>Dossier consultable</strong>
                  <p className={styles.meta}>
                    Ce KYC a déjà été traité. Les pièces restent disponibles en
                    lecture dans l’historique.
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className={shared.toolbar} style={{ justifyContent: "flex-end" }}>
          <button
            type="button"
            className={shared.primaryButton}
            onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
            disabled={page === 1 || isFetching}
          >
            Page précédente
          </button>
          <span>
            Page {page} • {total} dossier{total > 1 ? "s" : ""}
          </span>
          <button
            type="button"
            className={shared.primaryButton}
            onClick={() => setPage((prev) => prev + 1)}
            disabled={isFetching || documents.length < limit}
          >
            Page suivante
          </button>
        </div>
      </section>
    </div>
  );
}
