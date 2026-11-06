"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { SkeletonRows } from "./Skeleton";
import styles from "./ui.module.css";

export interface DataColumn<T> {
  readonly key: string;
  readonly header: ReactNode;
  readonly cell: (row: T) => ReactNode;
  /** Valeur de tri; sans elle la colonne n'est pas triable. */
  readonly sortValue?: (row: T) => string | number | null | undefined;
  readonly align?: "left" | "right";
}

interface Props<T> {
  readonly rows: readonly T[];
  readonly columns: readonly DataColumn<T>[];
  readonly rowKey: (row: T) => string;
  readonly caption: string;
  /** Premier chargement: lignes fantomes. */
  readonly loading?: boolean;
  /** Rechargement: l'ancien contenu reste visible, attenue. */
  readonly refreshing?: boolean;
  readonly empty: ReactNode;
  readonly selected?: ReadonlySet<string>;
  readonly onSelectedChange?: (next: Set<string>) => void;
  /** Les listes sont paginees cote serveur: le tri ne porte que sur la page. */
  readonly sortScope?: "page" | "all";
  readonly rowClassName?: (row: T) => string | undefined;
}

type Sort = { key: string; dir: "asc" | "desc" } | null;

const collator = new Intl.Collator("fr", { numeric: true, sensitivity: "base" });

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  caption,
  loading,
  refreshing,
  empty,
  selected,
  onSelectedChange,
  sortScope = "page",
  rowClassName,
}: Props<T>) {
  const [sort, setSort] = useState<Sort>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);
  const selectable = Boolean(selected && onSelectedChange);

  const sorted = useMemo(() => {
    const column = sort && columns.find((c) => c.key === sort.key);
    if (!column?.sortValue) return rows;
    const factor = sort!.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = column.sortValue!(a);
      const vb = column.sortValue!(b);
      // Valeurs absentes toujours en fin de liste, quel que soit le sens.
      if (va == null || va === "") return vb == null || vb === "" ? 0 : 1;
      if (vb == null || vb === "") return -1;
      return (
        (typeof va === "number" && typeof vb === "number"
          ? va - vb
          : collator.compare(String(va), String(vb))) * factor
      );
    });
  }, [rows, columns, sort]);

  const ids = rows.map(rowKey);
  const selectedHere = selected ? ids.filter((id) => selected.has(id)).length : 0;
  const allSelected = ids.length > 0 && selectedHere === ids.length;

  useEffect(() => {
    if (selectAllRef.current)
      selectAllRef.current.indeterminate = selectedHere > 0 && !allSelected;
  }, [selectedHere, allSelected]);

  const toggleSort = (key: string) =>
    setSort((current) =>
      current?.key !== key
        ? { key, dir: "asc" }
        : current.dir === "asc"
          ? { key, dir: "desc" }
          : null
    );

  const toggleRow = (id: string) => {
    if (!selected || !onSelectedChange) return;
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectedChange(next);
  };

  const toggleAll = () => {
    if (!selected || !onSelectedChange) return;
    const next = new Set(selected);
    for (const id of ids) {
      if (allSelected) next.delete(id);
      else next.add(id);
    }
    onSelectedChange(next);
  };

  const columnCount = columns.length + (selectable ? 1 : 0);

  return (
    <div className={styles.tableWrap} aria-busy={loading || refreshing}>
      <table className={`${styles.table} ${refreshing ? styles.refreshing : ""}`}>
        <caption className="sr-only">
          {caption}
          {sort && sortScope === "page" ? " — tri appliqué à la page affichée" : ""}
        </caption>
        <thead>
          <tr>
            {selectable ? (
              <th className={styles.checkCell}>
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  disabled={!ids.length}
                  aria-label="Sélectionner toutes les lignes de la page"
                />
              </th>
            ) : null}
            {columns.map((column) => {
              const active = sort?.key === column.key ? sort.dir : null;
              return (
                <th
                  key={column.key}
                  className={column.align === "right" ? styles.right : undefined}
                  aria-sort={active === "asc" ? "ascending" : active === "desc" ? "descending" : undefined}
                >
                  {column.sortValue ? (
                    <button
                      type="button"
                      className={styles.sortButton}
                      onClick={() => toggleSort(column.key)}
                      title={sortScope === "page" ? "Trier les lignes de cette page" : "Trier"}
                    >
                      {column.header}
                      {active === "asc" ? (
                        <ArrowUp size={13} aria-hidden />
                      ) : active === "desc" ? (
                        <ArrowDown size={13} aria-hidden />
                      ) : (
                        <ArrowUpDown size={13} aria-hidden className={styles.sortIdle} />
                      )}
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {loading && !rows.length ? (
            <SkeletonRows columns={columnCount} />
          ) : !rows.length ? (
            <tr>
              <td colSpan={columnCount} className={styles.emptyCell}>
                {empty}
              </td>
            </tr>
          ) : (
            sorted.map((row) => {
              const id = rowKey(row);
              const isSelected = selected?.has(id) ?? false;
              return (
                <tr
                  key={id}
                  className={`${isSelected ? styles.selectedRow : ""} ${rowClassName?.(row) ?? ""}`}
                >
                  {selectable ? (
                    <td className={styles.checkCell}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRow(id)}
                        aria-label="Sélectionner cette ligne"
                      />
                    </td>
                  ) : null}
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={column.align === "right" ? styles.right : undefined}
                    >
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

/** Barre d'actions groupees, visible des qu'une ligne est cochee. */
export const BulkBar = ({
  count,
  onClear,
  children,
  progress,
}: {
  readonly count: number;
  readonly onClear: () => void;
  readonly children: ReactNode;
  readonly progress?: { done: number; total: number } | null;
}) =>
  count > 0 ? (
    <div className={styles.bulkBar} role="region" aria-label="Actions sur la sélection">
      <strong>
        {count} sélectionné{count > 1 ? "s" : ""}
      </strong>
      {progress ? (
        <span className={styles.bulkProgress} role="status">
          Traitement {progress.done} / {progress.total}…
        </span>
      ) : (
        <div className={styles.bulkActions}>{children}</div>
      )}
      <button type="button" className={styles.bulkClear} onClick={onClear} disabled={Boolean(progress)}>
        Tout désélectionner
      </button>
    </div>
  ) : null;
