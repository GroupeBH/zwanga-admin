"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  Clock,
  Info,
  ListChecks,
  Maximize2,
  XCircle,
} from "lucide-react";

import {
  useGetKycDocumentsQuery,
  useVerifyKycMutation,
  type KycStatusFilter,
} from "@/lib/features/kyc/kycApi";
import type { KycDocument, KycStatus } from "@/lib/features/admin/types";
import { getApiErrorMessage } from "@/lib/utils/apiErrors";

import styles from "./kyc.module.css";

const TABS: Array<{ value: KycStatusFilter; label: string }> = [
  { value: "pending", label: "À traiter" },
  { value: "approved", label: "Validés" },
  { value: "rejected", label: "Refusés" },
  { value: "all", label: "Tous" },
];

const REJECT_REASONS = [
  "Photo de la pièce illisible",
  "Pièce d’identité expirée",
  "Le selfie ne correspond pas à la pièce",
  "Nom différent de celui du compte",
  "Pièces manquantes",
];

const STATUS_TEXT: Record<KycStatus, string> = {
  pending: "En attente de décision",
  approved: "Identité validée",
  rejected: "Identité refusée",
};

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fr-CD", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

const timeAgo = (value?: string | null) => {
  if (!value) return "";
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 60) return `il y a ${Math.max(minutes, 1)} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.round(hours / 24);
  return `il y a ${days} jour${days > 1 ? "s" : ""}`;
};

const fullName = (document: KycDocument) =>
  `${document.user?.firstName ?? ""} ${document.user?.lastName ?? ""}`.trim() ||
  "Utilisateur sans nom";

const initials = (document: KycDocument) =>
  `${document.user?.firstName?.[0] ?? ""}${document.user?.lastName?.[0] ?? ""}`.toUpperCase() || "?";

const dotClass = (status: KycStatus) =>
  status === "approved"
    ? styles.dotApproved
    : status === "rejected"
      ? styles.dotRejected
      : styles.dotPending;

const useStatusTotal = (status: KycStatus) =>
  useGetKycDocumentsQuery({ page: 1, limit: 1, status }).data?.total;

type DecisionMode = "idle" | "approve" | "reject";

export default function KycPage() {
  const [statusFilter, setStatusFilter] = useState<KycStatusFilter>("pending");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileDetail, setMobileDetail] = useState(false);
  const [mode, setMode] = useState<DecisionMode>("idle");
  const [chosenReasons, setChosenReasons] = useState<string[]>([]);
  const [reasonNote, setReasonNote] = useState("");
  const [zoom, setZoom] = useState<{ src: string; label: string } | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const limit = 20;

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const { data, isFetching, isError, refetch } = useGetKycDocumentsQuery({
    page,
    limit,
    status: statusFilter,
    search: debouncedSearch || undefined,
  });
  const [verifyKyc, { isLoading: isDeciding }] = useVerifyKycMutation();
  const pendingTotal = useStatusTotal("pending");
  const approvedTotal = useStatusTotal("approved");
  const rejectedTotal = useStatusTotal("rejected");
  const tabCounts: Partial<Record<KycStatusFilter, number | undefined>> = {
    pending: pendingTotal,
    approved: approvedTotal,
    rejected: rejectedTotal,
    all:
      pendingTotal !== undefined && approvedTotal !== undefined && rejectedTotal !== undefined
        ? pendingTotal + approvedTotal + rejectedTotal
        : undefined,
  };

  const documents = useMemo(() => data?.documents ?? [], [data]);
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

  const selected = documents.find((document) => document.id === selectedId);

  useEffect(() => {
    setMode("idle");
    setChosenReasons([]);
    setReasonNote("");
  }, [selectedId]);

  const selectDocument = (id: string) => {
    setSelectedId(id);
    setMobileDetail(true);
    setFeedback(null);
  };

  const changeTab = (value: KycStatusFilter) => {
    setStatusFilter(value);
    setPage(1);
    setSelectedId(null);
    setMobileDetail(false);
    setFeedback(null);
  };

  const rejectionText = [...chosenReasons, reasonNote.trim()].filter(Boolean).join(" — ");

  const goToNext = (current: KycDocument) => {
    const index = documents.findIndex((document) => document.id === current.id);
    const next = documents[index + 1] ?? documents[index - 1];
    setSelectedId(next?.id ?? null);
    if (!next) setMobileDetail(false);
  };

  const decide = async (approved: boolean) => {
    if (!selected) return;
    setFeedback(null);
    try {
      await verifyKyc({
        kycId: selected.id,
        approved,
        ...(approved ? {} : { reason: rejectionText }),
      }).unwrap();
      setFeedback({
        ok: true,
        text: approved
          ? `${fullName(selected)} est maintenant vérifié. Le dossier suivant est affiché.`
          : `Le dossier de ${fullName(selected)} est refusé. Le motif a été transmis.`,
      });
      goToNext(selected);
    } catch (error) {
      setFeedback({
        ok: false,
        text: getApiErrorMessage(
          error,
          "La décision n’a pas pu être enregistrée. Rien n’a été modifié, réessayez."
        ),
      });
    }
  };

  const frontUrl = selected?.cniFrontUrl ?? selected?.cniFrontUrls?.[0] ?? null;
  const pieces = selected
    ? [
        { label: "Pièce d’identité — recto", url: frontUrl },
        { label: "Pièce d’identité — verso", url: selected.cniBackUrl ?? null },
        { label: "Selfie de la personne", url: selected.selfieUrl ?? null },
      ]
    : [];
  const noImages = pieces.every((piece) => !piece.url);
  const decided = selected && selected.status !== "pending";

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <h1>Vérification d’identité</h1>
        <p>
          Chaque personne qui souhaite conduire envoie une pièce d’identité et un
          selfie. Comparez-les, puis validez ou refusez le dossier.
        </p>
      </header>

      <div className={styles.tabs} role="tablist" aria-label="Statut des dossiers">
        {TABS.map((tab) => {
          const count = tabCounts[tab.value];
          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={statusFilter === tab.value}
              className={`${styles.tab} ${statusFilter === tab.value ? styles.tabActive : ""} ${
                tab.value === "pending" && count ? styles.tabAlert : ""
              }`}
              onClick={() => changeTab(tab.value)}
            >
              {tab.label}
              {count !== undefined ? <span className={styles.count}>{count}</span> : null}
            </button>
          );
        })}
      </div>

      {isError ? (
        <p className={`${styles.feedback} ${styles.feedbackError}`} role="alert">
          Impossible de charger les dossiers.{" "}
          <button type="button" className={styles.ghost} onClick={() => refetch()}>
            Réessayer
          </button>
        </p>
      ) : null}

      <div
        className={`${styles.layout} ${
          mobileDetail && selected ? styles.layoutDetailOpen : styles.layoutDetailClosed
        }`}
      >
        <aside className={styles.queue} aria-label="Liste des dossiers">
          <input
            className={styles.search}
            type="search"
            aria-label="Rechercher un dossier"
            placeholder="Rechercher par nom, téléphone ou e-mail"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
          <div className={styles.queueList}>
            {isFetching && documents.length === 0 ? (
              <div className={styles.empty}>Chargement des dossiers…</div>
            ) : documents.length === 0 ? (
              <div className={styles.empty}>
                <strong>
                  {statusFilter === "pending" && !debouncedSearch
                    ? "Tout est à jour"
                    : "Aucun dossier"}
                </strong>
                {statusFilter === "pending" && !debouncedSearch
                  ? "Aucune identité n’attend de décision."
                  : "Aucun dossier ne correspond à votre recherche."}
              </div>
            ) : (
              documents.map((document) => (
                <button
                  type="button"
                  key={document.id}
                  className={`${styles.queueItem} ${
                    selected?.id === document.id ? styles.active : ""
                  }`}
                  onClick={() => selectDocument(document.id)}
                  aria-current={selected?.id === document.id}
                >
                  <span className={styles.avatar} aria-hidden="true">
                    {initials(document)}
                  </span>
                  <span className={styles.queueText}>
                    <strong>{fullName(document)}</strong>
                    <small>
                      {document.user?.phone ?? document.user?.email ?? "—"} ·{" "}
                      {timeAgo(document.createdAt)}
                    </small>
                  </span>
                  <span
                    className={`${styles.dot} ${dotClass(document.status)}`}
                    title={STATUS_TEXT[document.status]}
                    aria-label={STATUS_TEXT[document.status]}
                  />
                </button>
              ))
            )}
          </div>
          <div className={styles.pager}>
            <button
              type="button"
              onClick={() => setPage((value) => Math.max(value - 1, 1))}
              disabled={page === 1 || isFetching}
            >
              ‹ Précédent
            </button>
            <span>
              Page {page} · {total} dossier{total > 1 ? "s" : ""}
            </span>
            <button
              type="button"
              onClick={() => setPage((value) => value + 1)}
              disabled={isFetching || documents.length < limit}
            >
              Suivant ›
            </button>
          </div>
        </aside>

        {selected ? (
          <section className={styles.detail} aria-label="Dossier sélectionné">
            <button
              type="button"
              className={`${styles.ghost} ${styles.back}`}
              onClick={() => setMobileDetail(false)}
            >
              <ArrowLeft size={16} aria-hidden="true" /> Retour à la liste
            </button>

            <div className={styles.card}>
              <div className={styles.identity}>
                <span className={styles.avatar} aria-hidden="true">
                  {initials(selected)}
                </span>
                <div className={styles.identityText}>
                  <h2>{fullName(selected)}</h2>
                  <p>
                    {selected.user?.phone ?? "Téléphone inconnu"}
                    {selected.user?.email ? ` · ${selected.user.email}` : ""}
                  </p>
                  <p>Dossier envoyé le {formatDate(selected.createdAt)}</p>
                </div>
              </div>
              <div
                className={`${styles.statusBanner} ${
                  selected.status === "approved"
                    ? styles.statusApproved
                    : selected.status === "rejected"
                      ? styles.statusRejected
                      : styles.statusPending
                }`}
              >
                {selected.status === "approved" ? (
                  <BadgeCheck size={18} aria-hidden="true" />
                ) : selected.status === "rejected" ? (
                  <XCircle size={18} aria-hidden="true" />
                ) : (
                  <Clock size={18} aria-hidden="true" />
                )}
                <div>
                  <strong>{STATUS_TEXT[selected.status]}</strong>
                  {selected.reviewedBy ? (
                    <div>
                      Par {selected.reviewedBy} le {formatDate(selected.reviewedAt)}
                    </div>
                  ) : null}
                  {selected.rejectionReason ? (
                    <div>Motif : {selected.rejectionReason}</div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className={styles.card}>
              <h3>Pièces envoyées</h3>
              <p className={styles.cardHint}>Cliquez sur une image pour l’agrandir.</p>
              {noImages && selected.provider === "didit" ? (
                <p className={styles.providerNote}>
                  <Info size={16} aria-hidden="true" />
                  <span>
                    Les photos de ce dossier sont stockées chez Didit, le service de
                    vérification, et ne s’affichent pas ici. Le statut ci-dessus est
                    celui rendu par Didit.
                  </span>
                </p>
              ) : (
                <div className={styles.documentGrid}>
                  {pieces.map((piece) => (
                    <div key={piece.label} className={styles.document}>
                      <div className={styles.documentLabel}>
                        {piece.label}
                        <span className={piece.url ? styles.present : styles.missing}>
                          {piece.url ? "Reçu" : "Manquant"}
                        </span>
                      </div>
                      <button
                        type="button"
                        className={styles.documentPreview}
                        disabled={!piece.url}
                        onClick={() =>
                          piece.url && setZoom({ src: piece.url, label: piece.label })
                        }
                        aria-label={piece.url ? `Agrandir : ${piece.label}` : `${piece.label} non fourni`}
                      >
                        {piece.url ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={piece.url} alt={piece.label} />
                            <span className={styles.zoomHint}>
                              <Maximize2 size={11} aria-hidden="true" /> Agrandir
                            </span>
                          </>
                        ) : (
                          "Non fourni"
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {!decided ? (
              <div className={styles.card}>
                <h3>
                  <ListChecks size={16} aria-hidden="true" style={{ verticalAlign: -3 }} /> Ce qu’il
                  faut vérifier
                </h3>
                <ul className={styles.checklist}>
                  <li>
                    <CheckCircle2 size={16} aria-hidden="true" />
                    La pièce est lisible et n’est pas expirée.
                  </li>
                  <li>
                    <CheckCircle2 size={16} aria-hidden="true" />
                    Le nom sur la pièce correspond à « {fullName(selected)} ».
                  </li>
                  <li>
                    <CheckCircle2 size={16} aria-hidden="true" />
                    Le visage du selfie est celui de la photo de la pièce.
                  </li>
                </ul>
              </div>
            ) : null}

            <details className={`${styles.card} ${styles.tech}`}>
              <summary>Détails techniques (facultatif)</summary>
              <dl>
                <div>
                  <dt>Service de vérification</dt>
                  <dd>{selected.provider === "didit" ? "Didit" : "Zwanga (ancien système)"}</dd>
                </div>
                <div>
                  <dt>Dernière mise à jour</dt>
                  <dd>{formatDate(selected.updatedAt)}</dd>
                </div>
                {selected.provider === "didit" ? (
                  <>
                    <div>
                      <dt>Statut côté Didit</dt>
                      <dd>{selected.diditSessionStatus ?? "—"}</dd>
                    </div>
                    <div>
                      <dt>Dernière synchronisation</dt>
                      <dd>{formatDate(selected.diditLastSyncedAt)}</dd>
                    </div>
                    <div>
                      <dt>Référence de session</dt>
                      <dd>{selected.diditSessionId ?? "—"}</dd>
                    </div>
                  </>
                ) : null}
                <div>
                  <dt>Référence du dossier</dt>
                  <dd>{selected.id}</dd>
                </div>
              </dl>
            </details>

            {feedback ? (
              <p
                className={`${styles.feedback} ${feedback.ok ? styles.feedbackOk : styles.feedbackError}`}
                role={feedback.ok ? "status" : "alert"}
              >
                {feedback.text}
              </p>
            ) : null}

            {!decided ? (
              <div className={styles.decision}>
                {mode === "idle" ? (
                  <div className={styles.decisionRow}>
                    <p>
                      Votre décision
                      <small>Elle est enregistrée à votre nom.</small>
                    </p>
                    <div className={styles.buttons}>
                      <button type="button" className={styles.reject} onClick={() => setMode("reject")}>
                        <XCircle size={16} aria-hidden="true" /> Refuser
                      </button>
                      <button type="button" className={styles.approve} onClick={() => setMode("approve")}>
                        <CheckCircle2 size={16} aria-hidden="true" /> Valider l’identité
                      </button>
                    </div>
                  </div>
                ) : null}

                {mode === "approve" ? (
                  <div className={styles.decisionRow}>
                    <p>
                      Confirmer la validation de {fullName(selected)} ?
                      <small>La personne pourra utiliser Zwanga comme conducteur vérifié.</small>
                    </p>
                    <div className={styles.buttons}>
                      <button type="button" className={styles.ghost} onClick={() => setMode("idle")} disabled={isDeciding}>
                        Annuler
                      </button>
                      <button type="button" className={styles.approve} onClick={() => decide(true)} disabled={isDeciding}>
                        {isDeciding ? "Enregistrement…" : "Oui, valider"}
                      </button>
                    </div>
                  </div>
                ) : null}

                {mode === "reject" ? (
                  <div>
                    <p style={{ margin: 0, fontWeight: 600 }}>
                      Pourquoi refusez-vous ce dossier ?
                    </p>
                    <small style={{ color: "var(--color-text-muted)" }}>
                      Ce motif sera envoyé à la personne pour qu’elle puisse renvoyer de bons documents.
                    </small>
                    <div className={styles.reasons}>
                      {REJECT_REASONS.map((reason) => {
                        const on = chosenReasons.includes(reason);
                        return (
                          <button
                            key={reason}
                            type="button"
                            aria-pressed={on}
                            className={`${styles.reasonChip} ${on ? styles.reasonChipOn : ""}`}
                            onClick={() =>
                              setChosenReasons((current) =>
                                on ? current.filter((item) => item !== reason) : [...current, reason]
                              )
                            }
                          >
                            {reason}
                          </button>
                        );
                      })}
                    </div>
                    <textarea
                      className={styles.reasonText}
                      aria-label="Précision pour la personne (facultatif)"
                      placeholder="Ajouter une précision (facultatif)"
                      value={reasonNote}
                      onChange={(event) => setReasonNote(event.target.value)}
                      disabled={isDeciding}
                    />
                    <div className={styles.decisionRow} style={{ marginTop: 12 }}>
                      <small>
                        {rejectionText ? "" : "Choisissez au moins un motif ou écrivez-en un."}
                      </small>
                      <div className={styles.buttons}>
                        <button type="button" className={styles.ghost} onClick={() => setMode("idle")} disabled={isDeciding}>
                          Annuler
                        </button>
                        <button
                          type="button"
                          className={styles.reject}
                          onClick={() => decide(false)}
                          disabled={isDeciding || !rejectionText}
                        >
                          {isDeciding ? "Enregistrement…" : "Confirmer le refus"}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>
        ) : (
          <section className={`${styles.card} ${styles.empty}`} style={{ border: 0 }}>
            <strong>Sélectionnez un dossier</strong>
            Choisissez une personne dans la liste pour voir ses pièces.
          </section>
        )}
      </div>

      {zoom ? (
        <div
          className={styles.lightbox}
          role="dialog"
          aria-modal="true"
          aria-label={zoom.label}
          onClick={() => setZoom(null)}
        >
          <button type="button" className={styles.lightboxClose} onClick={() => setZoom(null)}>
            Fermer
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoom.src} alt={zoom.label} />
        </div>
      ) : null}
    </div>
  );
}
