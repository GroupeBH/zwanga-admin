"use client";
import { useState } from "react";
import {
  useGetStoreDashboardQuery,
  useGetStoreResourceQuery,
  useStoreActionMutation,
  type StoreRecord,
  type StorePlatform,
} from "@/lib/features/stores/storesApi";
import { getApiErrorMessage } from "@/lib/utils/apiErrors";
import shared from "../styles/page.module.css";
export function StoreVersion({
  record,
  editable,
  done,
}: {
  record: StoreRecord;
  editable: boolean;
  done: (m: string) => void;
}) {
  const [open, setOpen] = useState(false),
    [page, setPage] = useState(1),
    [category, setCategory] = useState("other"),
    [note, setNote] = useState(""),
    [owner, setOwner] = useState(""),
    [task, setTask] = useState("");
  const query = useGetStoreResourceQuery(
    { resource: `versions/${record.id}/incidents`, page },
    { skip: !open },
  );
  const [action, state] = useStoreActionMutation();
  const items = Array.isArray(query.data)
      ? query.data
      : (query.data?.items ?? []),
    total = Array.isArray(query.data)
      ? query.data.length
      : (query.data?.total ?? 0);
  const run = async (path: string, body?: unknown) => {
    try {
      await action({ path, body }).unwrap();
      setNote("");
      done("Suivi interne enregistré.");
    } catch (e) {
      done(getApiErrorMessage(e, "Modification du suivi refusée."));
    }
  };
  return (
    <article>
      <details onToggle={(e) => setOpen(e.currentTarget.open)}>
        <summary>
          {record.platform} · {record.externalId} ·{" "}
          {record.isCurrent ? "Dernier catalogue" : "Historique"} ·{" "}
          {record.syncedAt}
        </summary>
        <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
          {JSON.stringify(record.content, null, 2)}
        </pre>
        <h3>Suivi interne des soumissions</h3>
        <p>Ces notes ne sont pas des décisions officielles du store.</p>
        {query.isFetching && <p role="status">Chargement du suivi…</p>}
        {query.error && (
          <p role="alert">
            {getApiErrorMessage(query.error, "Suivi indisponible.")}
          </p>
        )}
        {items.map((i) => (
          <section key={String(i.id)}>
            <p>
              {String(i.category)} · {String(i.createdAt)} ·{" "}
              {i.resolvedAt ? "Résolu" : "Ouvert"}
            </p>
            <p style={{ whiteSpace: "pre-wrap" }}>{String(i.note)}</p>
            <p>
              Responsable : {String(i.ownerId || "Non assigné")} · Tâche :{" "}
              {String(i.taskReference || "Non liée")}
            </p>
            {editable && !i.resolvedAt && (
              <button
                className={shared.secondaryButton}
                disabled={state.isLoading}
                onClick={() => run(`incidents/${i.id}/resolve`)}
              >
                Marquer résolu
              </button>
            )}
          </section>
        ))}
        {total > 25 && (
          <div className={shared.toolbar}>
            <button disabled={page === 1} onClick={() => setPage(page - 1)}>
              Précédent
            </button>
            <button
              disabled={page * 25 >= total}
              onClick={() => setPage(page + 1)}
            >
              Suivant
            </button>
          </div>
        )}
        {editable && (
          <>
            <div className={shared.toolbar}>
              <label>
                Catégorie
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {[
                    "authentication",
                    "apple_signin",
                    "privacy",
                    "location",
                    "permissions",
                    "bug",
                    "listing",
                    "compliance",
                    "other",
                  ].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
              <label>
                Responsable (UUID)
                <input
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                />
              </label>
              <label>
                Référence de tâche
                <input
                  value={task}
                  maxLength={500}
                  onChange={(e) => setTask(e.target.value)}
                />
              </label>
            </div>
            <label>
              Motif de refus ou note interne
              <textarea
                value={note}
                maxLength={5000}
                rows={3}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
            <button
              className={shared.primaryButton}
              disabled={state.isLoading || !note.trim()}
              onClick={() =>
                run(`versions/${record.id}/incidents`, {
                  category,
                  note,
                  ...(owner ? { ownerId: owner } : {}),
                  ...(task ? { taskReference: task } : {}),
                })
              }
            >
              Ajouter une note
            </button>
          </>
        )}
      </details>
    </article>
  );
}
export function StoreVersionComparison({
  from,
  to,
}: {
  from: string;
  to: string;
}) {
  const [platform, setPlatform] = useState<StorePlatform>("google"),
    [a, setA] = useState(""),
    [b, setB] = useState(""),
    [selected, setSelected] = useState<{
      a: string;
      b: string;
      platform: StorePlatform;
    } | null>(null);
  const first = useGetStoreDashboardQuery(
      { from, to, platform: selected?.platform, version: selected?.a },
      { skip: !selected },
    ),
    second = useGetStoreDashboardQuery(
      { from, to, platform: selected?.platform, version: selected?.b },
      { skip: !selected },
    );
  const keys = [
    ...new Set(
      [...(first.data?.series ?? []), ...(second.data?.series ?? [])].map(
        (s) => s.metric,
      ),
    ),
  ];
  const summarize = (
    rows: { metric: string; date: string; value: string }[] | undefined,
    metric: string,
  ) => {
    const values = rows?.filter((r) => r.metric === metric);
    if (!values?.length) return "Indisponible";
    // Rates and installed-base snapshots cannot be summed over multiple days.
    if (/Rate$|installed_base|active_installed_devices/.test(metric)) {
      const last = values.at(-1)!;
      return `${last.value} (dernier jour : ${last.date})`;
    }
    return `${values.reduce((sum, r) => sum + Number(r.value), 0)} (jours disponibles)`;
  };
  return (
    <section className={shared.section}>
      <h2>Comparer deux versions</h2>
      <p>
        La comparaison utilise une même plateforme et période. Google attend les
        versionCodes ; Apple attend les versions présentes dans ses rapports. Un
        taux sans ventilation par version reste indisponible.
      </p>
      <div className={shared.toolbar}>
        <label>
          Plateforme
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value as StorePlatform)}
          >
            <option>google</option>
            <option>apple</option>
          </select>
        </label>
        <label>
          Version A
          <input
            value={a}
            maxLength={100}
            onChange={(e) => setA(e.target.value)}
          />
        </label>
        <label>
          Version B
          <input
            value={b}
            maxLength={100}
            onChange={(e) => setB(e.target.value)}
          />
        </label>
        <button
          disabled={
            !a.trim() || !b.trim() || first.isFetching || second.isFetching
          }
          className={shared.secondaryButton}
          onClick={() => setSelected({ a: a.trim(), b: b.trim(), platform })}
        >
          Comparer
        </button>
      </div>
      {(first.error || second.error) && (
        <p role="alert">
          {getApiErrorMessage(
            first.error || second.error,
            "Comparaison indisponible.",
          )}
        </p>
      )}
      {(first.isFetching || second.isFetching) && (
        <p role="status">Comparaison en cours…</p>
      )}
      {selected && (
        <div className={shared.tableWrapper}>
          <table className={shared.table}>
            <thead>
              <tr>
                <th>Indicateur</th>
                <th>{selected.a}</th>
                <th>{selected.b}</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k}>
                  <td>{k}</td>
                  <td>{summarize(first.data?.series, k)}</td>
                  <td>{summarize(second.data?.series, k)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!keys.length && !first.isFetching && !second.isFetching && (
            <p>Aucune ventilation par version disponible pour ces filtres.</p>
          )}
        </div>
      )}
    </section>
  );
}
