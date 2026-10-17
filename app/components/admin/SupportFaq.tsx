"use client";

import { Info } from "lucide-react";

import {
  useListFaqQuery,
  type SupportFaqEntry,
} from "@/lib/features/support/supportApi";

import shared from "@/app/(admin)/styles/page.module.css";

const toFaqList = (payload: unknown): SupportFaqEntry[] => {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object" && "data" in payload) {
    const nested = (payload as { data?: unknown }).data;
    if (Array.isArray(nested)) return nested;
  }
  return [];
};

export const SupportFaq = () => {
  const { data, isFetching, isError } = useListFaqQuery();
  const entries = toFaqList(data).filter(
    (entry) => entry.isPublished !== false
  );

  return (
    <section className={shared.section}>
      <div className={shared.sectionHeader}>
        <div>
          <h2>FAQ publiée</h2>
          <p className={shared.filterSummary}>
            {entries.length} article{entries.length > 1 ? "s" : ""} visibles
            dans l’application
          </p>
        </div>
      </div>
      <p className={shared.helpText}>
        <Info size={16} aria-hidden="true" />
        <span>
          Lecture seule : le texte affiché aux utilisateurs. La création ou la
          modification des articles n’est pas disponible sans nouvelle API.
        </span>
      </p>
      {isError ? (
        <p className={shared.mutedText}>
          La FAQ n’a pas pu être chargée pour le moment.
        </p>
      ) : isFetching && entries.length === 0 ? (
        <p className={shared.emptyState}>Chargement de la FAQ…</p>
      ) : entries.length === 0 ? (
        <p className={shared.emptyState}>Aucun article FAQ publié.</p>
      ) : (
        <div className={shared.faqList}>
          {entries.map((entry) => (
            <article key={entry.id} className={shared.card}>
              <strong>{entry.question}</strong>
              {entry.category ? (
                <small className={shared.mutedText}>{entry.category}</small>
              ) : null}
              <p className={shared.mutedText}>{entry.answer}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};
