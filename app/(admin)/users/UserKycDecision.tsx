"use client";

import { useState } from "react";

import { useVerifyKycMutation } from "@/lib/features/kyc/kycApi";
import type { KycDocument, KycStatus } from "@/lib/features/admin/types";
import { getApiErrorMessage } from "@/lib/utils/apiErrors";

import shared from "../styles/page.module.css";

const statusLabel: Record<KycStatus, string> = {
  pending: "En attente",
  approved: "Validé",
  rejected: "Rejeté",
};

const providerLabel: Record<string, string> = {
  legacy: "Legacy Zwanga",
  didit: "Didit",
  aws: "AWS",
};

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-CD", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const statusClass = (status: KycStatus) => {
  if (status === "approved") return `${shared.badge} ${shared.badgeSuccess}`;
  if (status === "rejected") return `${shared.badge} ${shared.badgeDanger}`;
  return `${shared.badge} ${shared.badgeWarning}`;
};

export default function UserKycDecision({
  documents,
}: {
  documents: KycDocument[];
}) {
  const latest = documents[0] ?? null;
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [verifyKyc, { isLoading }] = useVerifyKycMutation();
  const awsApproval = latest?.provider === "aws" && latest.status !== "approved";

  const decide = async (approved: boolean) => {
    if (!latest) return;
    setError("");
    setMessage("");
    const reason = note.trim();
    if (!approved && reason.length < 3) {
      setError("Indiquez le motif du rejet. Il est transmis à l’utilisateur.");
      return;
    }
    if (approved && awsApproval && reason.length < 10) {
      setError(
        "La validation AWS demande une note de contrôle d’au moins 10 caractères.",
      );
      return;
    }
    try {
      await verifyKyc({
        kycId: latest.id,
        approved,
        ...(reason ? { reason } : {}),
      }).unwrap();
      setNote("");
      setMessage(approved ? "KYC validé." : "KYC rejeté.");
    } catch (reasonError) {
      setError(
        getApiErrorMessage(reasonError, "Impossible d’enregistrer cette décision."),
      );
    }
  };

  return (
    <section className={shared.section} aria-labelledby="user-kyc-title">
      <div className={shared.sectionHeader}>
        <div>
          <h2 id="user-kyc-title">Vérification d’identité</h2>
          <p className={shared.mutedText}>
            La décision porte sur le dossier le plus récent.
          </p>
        </div>
        {latest ? (
          <span className={statusClass(latest.status)}>
            {statusLabel[latest.status] ?? latest.status}
          </span>
        ) : null}
      </div>

      {!latest ? (
        <p className={shared.emptyState}>Aucun dossier KYC pour ce compte.</p>
      ) : (
        <>
          <p className={shared.mutedText}>
            {providerLabel[latest.provider ?? ""] ?? latest.provider ?? "Dossier"}
            {" · déposé le "}
            {formatDate(latest.createdAt)}
            {latest.reviewedAt ? ` · revu le ${formatDate(latest.reviewedAt)}` : ""}
          </p>
          {latest.rejectionReason ? (
            <p className={shared.mutedText}>Motif : {latest.rejectionReason}</p>
          ) : null}

          <Proofs document={latest} />

          {awsApproval ? (
            <p className={shared.mutedText}>
              Pour un dossier AWS, ouvrez d’abord les preuves, puis notez la pièce,
              sa validité et les noms.
            </p>
          ) : null}

          <label className={shared.filterLabel} htmlFor="user-kyc-note">
            {latest.status === "pending" ? "Motif ou note de contrôle" : "Motif du changement"}
          </label>
          <textarea
            id="user-kyc-note"
            value={note}
            maxLength={1000}
            rows={3}
            disabled={isLoading}
            placeholder={
              awsApproval
                ? "Pièce RDC, validité et noms concordants…"
                : "Motif du rejet, ou note si vous validez un dossier AWS"
            }
            onChange={(event) => {
              setNote(event.target.value);
              setError("");
              setMessage("");
            }}
            style={{
              width: "100%",
              borderRadius: 16,
              border: "1px solid var(--color-border-strong)",
              background: "var(--color-field)",
              color: "var(--color-text)",
              padding: "12px 14px",
            }}
          />

          {error ? (
            <p className={shared.errorText} role="alert">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className={shared.successText} role="status">
              {message}
            </p>
          ) : null}

          <div className={shared.rowActions}>
            <button
              type="button"
              className={shared.primaryButton}
              disabled={isLoading || latest.status === "approved"}
              onClick={() => void decide(true)}
            >
              {isLoading ? "Enregistrement…" : "Valider le KYC"}
            </button>
            <button
              type="button"
              className={shared.dangerButton}
              disabled={isLoading || latest.status === "rejected"}
              onClick={() => void decide(false)}
            >
              Rejeter le KYC
            </button>
          </div>

          {documents.length > 1 ? (
            <ul className={shared.mutedText}>
              {documents.slice(1).map((document) => (
                <li key={document.id}>
                  {statusLabel[document.status] ?? document.status}
                  {" · "}
                  {formatDate(document.createdAt)}
                  {document.rejectionReason ? ` · ${document.rejectionReason}` : ""}
                </li>
              ))}
            </ul>
          ) : null}
        </>
      )}
    </section>
  );
}

function Proofs({ document }: { document: KycDocument }) {
  const photos = [
    ...(document.cniFrontUrls ?? []),
    ...(document.cniFrontUrl ? [document.cniFrontUrl] : []),
    ...(document.cniBackUrl ? [document.cniBackUrl] : []),
    ...(document.selfieUrl ? [document.selfieUrl] : []),
  ].filter((url, index, all) => all.indexOf(url) === index);

  if (photos.length === 0) return null;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: 12,
      }}
    >
      {photos.map((url) => (
        <a key={url} href={url} target="_blank" rel="noopener noreferrer">
          <img
            src={url}
            alt="Pièce du dossier KYC"
            style={{
              width: "100%",
              maxHeight: 220,
              objectFit: "contain",
              borderRadius: 16,
              background: "var(--color-field)",
            }}
          />
        </a>
      ))}
    </div>
  );
}
