"use client";
import { useRef, useState } from "react";
import {
  useGetStoreReviewQuery,
  useStoreActionMutation,
  useReplyStoreReviewMutation,
  type StoreRecord,
} from "@/lib/features/stores/storesApi";
import { getApiErrorMessage } from "@/lib/utils/apiErrors";
import shared from "../styles/page.module.css";

export function StoreReview({
  record,
  permissions,
  done,
}: {
  record: StoreRecord;
  permissions: string[];
  done: (message: string) => void;
}) {
  const [open, setOpen] = useState(false),
    [text, setText] = useState<string | null>(null),
    [assignee, setAssignee] = useState("");
  const detail = useGetStoreReviewQuery(record.id, { skip: !open });
  const [action, actionState] = useStoreActionMutation(),
    [publish, publishing] = useReplyStoreReviewMutation();
  const intent = useRef<{ revision: number; id: string }>();
  const workflow = detail.data?.workflow;
  const can = (p: string) => permissions.includes("store.reviews." + p);
  const run = async (
    kind: string,
    body: unknown,
    method?: "POST" | "PATCH",
  ) => {
    try {
      await action({
        path: `reviews/${record.id}/${kind}`,
        body,
        method,
      }).unwrap();
      setText(null);
      done("Modification enregistrée.");
    } catch (error) {
      done(
        getApiErrorMessage(
          error,
          "Modification refusée. Rechargez l’avis si sa révision a changé.",
        ),
      );
    }
  };
  const send = async () => {
    if (
      !workflow ||
      !window.confirm(
        "Publier la réponse approuvée sur le store ? Cette action est publique.",
      )
    )
      return;
    if (intent.current?.revision !== workflow.revision)
      intent.current = { revision: workflow.revision, id: crypto.randomUUID() };
    try {
      await publish({
        id: record.id,
        revision: workflow.revision,
        requestId: intent.current.id,
      }).unwrap();
      done(
        "Réponse mise en attente. Consultez Synchronisations pour confirmer son résultat.",
      );
    } catch (error) {
      done(
        getApiErrorMessage(
          error,
          "Envoi non confirmé. Consultez l’historique avant de recommencer.",
        ),
      );
    }
  };
  const busy = actionState.isLoading || publishing.isLoading;
  return (
    <article className={shared.section}>
      <h3>
        {record.platform === "google" ? "Google Play" : "Apple"} ·{" "}
        {String(record.content.rating)}/5 ·{" "}
        {String(record.content.author || "Anonyme")}
      </h3>
      <p>
        {String(record.content.modifiedAt || "Date non fournie")} ·{" "}
        {String(record.content.territory || record.content.language || "")}
      </p>
      <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
        {String(record.content.title || "")} {String(record.content.text || "")}
      </p>
      <p>
        Réponse officielle : {String(record.content.response || "Aucune")} ·{" "}
        {String(record.content.responseState || "")}
      </p>
      <button
        className={shared.secondaryButton}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        {open ? "Fermer" : "Traitement interne"}
      </button>
      {open && (
        <>
          {detail.isFetching && <p role="status">Chargement du traitement…</p>}
          {detail.error && (
            <p role="alert">
              {getApiErrorMessage(detail.error, "Détail indisponible.")}
            </p>
          )}
          {workflow && (
            <>
              <p>
                État Zwanga : {workflow.status} · Révision {workflow.revision} ·
                Responsable : {workflow.assigneeId || "Non assigné"}
              </p>
              {workflow.publishedJobId && (
                <>
                  <p>
                    Dernière publication : {workflow.publishedJobId}. Une
                    opération incertaine doit être vérifiée avant une nouvelle
                    réponse.
                  </p>
                  {can("reply") && (
                    <button
                      className={shared.secondaryButton}
                      disabled={busy}
                      onClick={() => run("reconcile", {})}
                    >
                      Rapprocher après synchronisation des avis
                    </button>
                  )}
                </>
              )}
              {can("draft") ? (
                <>
                  <label htmlFor={`draft-${record.id}`}>
                    Brouillon de réponse
                  </label>
                  <textarea
                    id={`draft-${record.id}`}
                    rows={3}
                    value={text ?? workflow.draft ?? ""}
                    maxLength={record.platform === "google" ? 350 : 5970}
                    onChange={(e) => setText(e.target.value)}
                  />
                  <div className={shared.toolbar}>
                    <button
                      className={shared.primaryButton}
                      disabled={busy || !(text ?? workflow.draft ?? "").trim()}
                      onClick={() =>
                        run("draft", {
                          text: text ?? workflow.draft ?? "",
                          revision: workflow.revision,
                        })
                      }
                    >
                      Enregistrer le brouillon
                    </button>
                    {workflow.status === "draft" && (
                      <button
                        className={shared.secondaryButton}
                        disabled={busy || text !== null}
                        onClick={() =>
                          run("submit", { revision: workflow.revision })
                        }
                      >
                        Soumettre à validation
                      </button>
                    )}
                  </div>
                  <label>
                    Responsable (UUID administratif)
                    <input
                      value={assignee}
                      onChange={(e) => setAssignee(e.target.value)}
                      placeholder="Identifiant du membre de l’équipe"
                    />
                  </label>
                  <div className={shared.toolbar}>
                    <button
                      disabled={busy}
                      className={shared.secondaryButton}
                      onClick={() =>
                        run(
                          "status",
                          {
                            revision: workflow.revision,
                            assigneeId: assignee || null,
                          },
                          "PATCH",
                        )
                      }
                    >
                      Assigner / retirer
                    </button>
                    <button
                      disabled={busy}
                      className={shared.secondaryButton}
                      onClick={() =>
                        run(
                          "status",
                          { revision: workflow.revision, status: "closed" },
                          "PATCH",
                        )
                      }
                    >
                      Clôturer
                    </button>
                  </div>
                </>
              ) : (
                <p style={{ whiteSpace: "pre-wrap" }}>
                  Brouillon : {workflow.draft || "Aucun"}
                </p>
              )}
              {can("approve") && workflow.status === "pending_approval" && (
                <button
                  disabled={busy}
                  className={shared.primaryButton}
                  onClick={() => {
                    if (
                      window.confirm(
                        "Approuver ce brouillon pour une publication publique ?",
                      )
                    )
                      void run("approve", { revision: workflow.revision });
                  }}
                >
                  Approuver
                </button>
              )}
              {permissions.includes("store.access.manage") &&
                workflow.status === "pending_approval" && (
                  <button
                    disabled={busy}
                    className={shared.secondaryButton}
                    onClick={() => {
                      const reason = window.prompt(
                        "Dérogation Super Admin : motif obligatoire de l’auto-approbation",
                      );
                      if (reason?.trim())
                        void run("approve", {
                          revision: workflow.revision,
                          overrideReason: reason,
                        });
                    }}
                  >
                    Dérogation d’auto-approbation
                  </button>
                )}
              {can("reply") && workflow.status === "approved" && (
                <button
                  disabled={busy}
                  className={shared.primaryButton}
                  onClick={send}
                >
                  Publier la réponse approuvée
                </button>
              )}
            </>
          )}
        </>
      )}
    </article>
  );
}
