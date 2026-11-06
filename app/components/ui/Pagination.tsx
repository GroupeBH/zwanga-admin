"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import styles from "./ui.module.css";

interface Props {
  readonly page: number;
  readonly limit: number;
  /** Total serveur; null quand l'API ne le fournit pas. */
  readonly total: number | null;
  /** Nombre d'elements de la page courante, pour deviner s'il en reste. */
  readonly pageCount: number;
  readonly onChange: (page: number) => void;
  readonly disabled?: boolean;
  readonly noun?: string;
}

const count = (value: number) => new Intl.NumberFormat("fr-FR").format(value);

export const Pagination = ({
  page,
  limit,
  total,
  pageCount,
  onChange,
  disabled,
  noun = "résultats",
}: Props) => {
  const pages = total === null ? null : Math.max(1, Math.ceil(total / limit));
  const hasNext = pages === null ? pageCount >= limit : page < pages;
  const first = pageCount ? (page - 1) * limit + 1 : 0;
  const last = (page - 1) * limit + pageCount;
  if (page === 1 && !hasNext && total === null) return null;
  return (
    <nav className={styles.pagination} aria-label="Pagination">
      <span>
        {pageCount
          ? `${count(first)}–${count(last)}${total === null ? "" : ` sur ${count(total)}`} ${noun}`
          : `Aucun ${noun.replace(/s$/, "")}`}
      </span>
      <div className={styles.pageButtons}>
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={disabled || page <= 1}
          aria-label="Page précédente"
        >
          <ChevronLeft size={16} aria-hidden />
          Précédent
        </button>
        <span aria-current="page">
          Page {page}
          {pages === null ? "" : ` / ${pages}`}
        </span>
        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={disabled || !hasNext}
          aria-label="Page suivante"
        >
          Suivant
          <ChevronRight size={16} aria-hidden />
        </button>
      </div>
    </nav>
  );
};
