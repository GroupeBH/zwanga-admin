"use client";
import { useRef, useState, type ReactNode } from "react";
import { getApiErrorMessage } from "@/lib/utils/apiErrors";
import shared from "../styles/page.module.css";

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className={shared.filterField}>
      <span className={shared.filterLabel}>{label}</span>
      {children}
    </label>
  );
}
export function QueryState({
  loading,
  error,
  retry,
}: {
  loading?: boolean;
  error?: unknown;
  retry?: () => unknown;
}) {
  return (
    <>
      {loading && <p role="status">Chargement…</p>}
      {!!error && (
        <p role="alert" className={shared.helpText}>
          {getApiErrorMessage(
            error,
            "Données indisponibles. Vérifiez les permissions et la disponibilité du backend.",
          )}{" "}
          {retry && (
            <button
              type="button"
              className={shared.secondaryButton}
              onClick={retry}
            >
              Réessayer
            </button>
          )}
        </p>
      )}
    </>
  );
}
export function Pager({
  page,
  more,
  busy,
  change,
}: {
  page: number;
  more: boolean;
  busy?: boolean;
  change: (n: number) => void;
}) {
  return (
    <div className={shared.pagination}>
      <span>Page {page}</span>
      <button
        className={shared.secondaryButton}
        disabled={busy || page === 1}
        onClick={() => change(page - 1)}
      >
        Précédent
      </button>
      <button
        className={shared.secondaryButton}
        disabled={busy || !more || page >= 10000}
        onClick={() => change(page + 1)}
      >
        Suivant
      </button>
    </div>
  );
}
export function DataTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: { key: string; cells: ReactNode[] }[];
}) {
  if (!rows.length)
    return <p className={shared.emptyState}>Aucune donnée pour ces filtres.</p>;
  return (
    <div className={shared.tableWrapper}>
      <table className={shared.table}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th scope="col" key={c}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              {row.cells.map((cell, i) => (
                <td key={columns[i]}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function useOperation() {
  const running = useRef(false);
  const [busy, setBusy] = useState(false),
    [feedback, setFeedback] = useState<{ text: string; error: boolean }>();
  const run = async (work: () => Promise<unknown>, success: string) => {
    if (running.current) return false;
    running.current = true;
    setBusy(true);
    setFeedback(undefined);
    try {
      await work();
      setFeedback({ text: success, error: false });
      return true;
    } catch (error) {
      setFeedback({
        text:
          error instanceof Error
            ? error.message
            : getApiErrorMessage(
                error,
                "Action non confirmée. Actualisez l’état avant de réessayer.",
              ),
        error: true,
      });
      return false;
    } finally {
      running.current = false;
      setBusy(false);
    }
  };
  return {
    busy,
    run,
    notice: feedback ? (
      <p role={feedback.error ? "alert" : "status"} className={shared.helpText}>
        {feedback.text}
      </p>
    ) : null,
  };
}
