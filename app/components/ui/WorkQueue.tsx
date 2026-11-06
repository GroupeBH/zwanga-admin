"use client";

import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

import styles from "./ui.module.css";

/* File de traitement « liste + detail » (le modele de l'ecran KYC): on choisit
   un dossier a gauche, on decide a droite, puis on passe au suivant sans
   ouvrir ni fermer de fenetre. Sur mobile, liste et detail s'affichent tour a tour. */

export const QueueLayout = ({
  list,
  detail,
  showDetailOnMobile,
  onBack,
}: {
  readonly list: ReactNode;
  readonly detail: ReactNode;
  readonly showDetailOnMobile: boolean;
  readonly onBack: () => void;
}) => (
  <div className={`${styles.queueLayout} ${showDetailOnMobile ? styles.queueShowDetail : ""}`}>
    <aside className={styles.queueList}>{list}</aside>
    <section className={styles.queueDetail} aria-live="polite">
      <button type="button" className={styles.queueBack} onClick={onBack}>
        <ChevronLeft size={16} aria-hidden /> Retour à la liste
      </button>
      {detail}
    </section>
  </div>
);

export const QueueItem = ({
  active,
  onSelect,
  checked,
  onCheck,
  title,
  subtitle,
  meta,
  badge,
}: {
  readonly active: boolean;
  readonly onSelect: () => void;
  readonly checked?: boolean;
  readonly onCheck?: () => void;
  readonly title: ReactNode;
  readonly subtitle?: ReactNode;
  readonly meta?: ReactNode;
  readonly badge?: ReactNode;
}) => (
  <div className={`${styles.queueItem} ${active ? styles.queueItemActive : ""}`}>
    {onCheck ? (
      <input
        type="checkbox"
        checked={Boolean(checked)}
        onChange={onCheck}
        aria-label="Sélectionner pour une action groupée"
      />
    ) : null}
    <button type="button" className={styles.queueItemButton} onClick={onSelect} aria-current={active ? "true" : undefined}>
      <span className={styles.queueItemHead}>
        <strong>{title}</strong>
        {badge}
      </span>
      {subtitle ? <span className={styles.queueItemSub}>{subtitle}</span> : null}
      {meta ? <span className={styles.queueItemMeta}>{meta}</span> : null}
    </button>
  </div>
);

export const QueueEmptyDetail = ({ children }: { readonly children: ReactNode }) => (
  <div className={styles.queueEmpty}>{children}</div>
);
