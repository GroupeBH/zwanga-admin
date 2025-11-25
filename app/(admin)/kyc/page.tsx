"use client";

import { useEffect, useMemo, useState } from "react";

import {
  useGetPendingKycsQuery,
  useVerifyKycMutation,
} from "@/lib/features/kyc/kycApi";
import type { KycDocument } from "@/lib/features/admin/types";

import shared from "../styles/page.module.css";
import styles from "./kyc.module.css";

const formatDate = (value?: string) => {
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

export default function KycPage() {
  const { data: documents } = useGetPendingKycsQuery<any>();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [verifyKyc, { isLoading }] = useVerifyKycMutation();

  console.log("documents", documents);

  useEffect(() => {
    if (!selectedId && documents?.length > 0) {
      setSelectedId(documents[0].id);
    }
  }, [documents, selectedId]);

  const selected = useMemo(
    () => documents?.find((document: any) => document?.id === selectedId) ?? documents?.[0],
    [documents, selectedId]
  );

  return (
    <div className={shared.page}>
      <section className={shared.section}>
        <div className={shared.sectionHeader}>
          <div>
            <h2>Validation KYC</h2>
            <p style={{ margin: 0, color: "var(--color-text-muted)" }}>
              {documents?.length} dossiers synchronisés avec l’API Nest (kyc_documents)
            </p>
          </div>
          <div className={shared.toolbar}>
            <select>
              <option>Statut : Tous</option>
              <option value="pending">En attente</option>
              <option value="approved">Validés</option>
              <option value="rejected">Rejetés</option>
            </select>
            <button type="button" className={shared.primaryButton}>
              Recharger les pièces
            </button>
          </div>
        </div>

        <div className={styles.split}>
          <div className={styles.queue}>
            {documents?.map((document: any) => (
              <button
                type="button"
                key={document?.id}
                className={`${styles.queueItem} ${
                  selected?.id === document?.id ? styles.active : ""
                }`}
                onClick={() => setSelectedId(document?.id)}
              >
                <div className={styles.queueHeader}>
                  <strong>
                    {document?.user?.firstName} {document?.user?.lastName}
                  </strong>
                  <span className={statusClass(document?.status)}>
                    {document?.status}
                  </span>
                </div>
                <div className={styles.queueMeta}>
                  <span>{document?.user?.email ?? document?.user?.phone}</span>
                  <span>Créé {formatDate(document?.createdAt)}</span>
                </div>
              </button>
            ))}
          </div>

          {selected ? (
            <div className={styles.detail}>
              <div className={shared.card}>
                <h3>Dossier #{selected?.id}</h3>
                <p className={styles.meta}>
                  {selected.user.firstName} {selected?.user?.lastName} • {selected?.user?.phone}
                </p>
                <div className={shared.timeline}>
                  <div className={shared.timelineItem}>
                    <strong>Soumis</strong>
                    <span>{formatDate(selected?.createdAt)}</span>
                  </div>
                  <div className={shared.timelineItem}>
                    <strong>Mise à jour</strong>
                    <span>{formatDate(selected?.updatedAt)}</span>
                  </div>
                  <div className={shared.timelineItem}>
                    <strong>
                      {selected.reviewedBy
                        ? `Revu par ${selected?.reviewedBy}`
                        : "En attente de revue"}
                    </strong>
                    <span>{formatDate(selected?.reviewedAt)}</span>
                  </div>
                </div>
                {selected?.rejectionReason ? (
                  <div className={styles.rejection}>
                    Motif de rejet : {selected?.rejectionReason}
                  </div>
                ) : null}
              </div>

              <div className={styles.documentGrid}>
                <div className={styles.documentPreview}>
                  {selected?.cniFrontUrl ? (
                    <img src={selected?.cniFrontUrl} alt="Carte nationale - Recto" />
                  ) : (
                    "Recto CNI non fourni"
                  )}
                </div>
                <div className={styles.documentPreview}>
                  {selected?.cniBackUrl ? (
                    <img src={selected?.cniBackUrl} alt="Carte nationale - Verso" />
                  ) : (
                    "Verso CNI non fourni"
                  )}
                </div>
                <div className={styles.documentPreview}>
                  {selected?.selfieUrl ? (
                    <img src={selected?.selfieUrl} alt="Selfie contrôle" />
                  ) : (
                    "Selfie non fourni"
                  )}
                </div>
              </div>

              <div className={shared.card}>
                <strong>Actions</strong>
                <div className={shared.toolbar}>
                  <button
                    type="button"
                    className={shared.primaryButton}
                    disabled={isLoading}
                    onClick={() =>
                      verifyKyc({ kycId: selected?.id, approved: true }).unwrap()
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
                        kycId: selected?.id,
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
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

