import type { CSSProperties } from "react";

import styles from "./ui.module.css";

/* Squelettes de chargement par bloc: la mise en page apparait tout de suite,
   au lieu d'un texte « Chargement… » qui fait sauter la page a l'arrivee. */

export const Skeleton = ({
  width = "100%",
  height = 14,
  radius,
  style,
}: {
  readonly width?: CSSProperties["width"];
  readonly height?: CSSProperties["height"];
  readonly radius?: CSSProperties["borderRadius"];
  readonly style?: CSSProperties;
}) => (
  <span
    className={`skeleton ${styles.skeletonBlock}`}
    style={{ width, height, borderRadius: radius, ...style }}
    aria-hidden="true"
  />
);

export const SkeletonText = ({ lines = 3 }: { readonly lines?: number }) => (
  <span className={styles.skeletonStack} aria-hidden="true">
    {Array.from({ length: lines }, (_, i) => (
      <Skeleton key={i} width={i === lines - 1 ? "60%" : "100%"} />
    ))}
  </span>
);

export const SkeletonCards = ({
  count = 4,
  height = 104,
}: {
  readonly count?: number;
  readonly height?: number;
}) => (
  <div className={styles.skeletonCards} role="status" aria-label="Chargement des indicateurs">
    {Array.from({ length: count }, (_, i) => (
      <Skeleton key={i} height={height} radius="var(--radius-lg)" />
    ))}
  </div>
);

/** Lignes fantomes pour un <tbody>: memes colonnes que le vrai tableau. */
export const SkeletonRows = ({
  rows = 6,
  columns,
}: {
  readonly rows?: number;
  readonly columns: number;
}) => (
  <>
    {Array.from({ length: rows }, (_, r) => (
      <tr key={r} aria-hidden="true">
        {Array.from({ length: columns }, (_, c) => (
          <td key={c}>
            <Skeleton width={c === 0 ? "80%" : `${50 + ((r + c) % 4) * 12}%`} />
          </td>
        ))}
      </tr>
    ))}
  </>
);

export const SkeletonList = ({ count = 6 }: { readonly count?: number }) => (
  <div className={styles.skeletonStack} role="status" aria-label="Chargement de la liste">
    {Array.from({ length: count }, (_, i) => (
      <Skeleton key={i} height={64} radius={12} />
    ))}
  </div>
);
