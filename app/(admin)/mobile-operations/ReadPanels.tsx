"use client";
import Link from "next/link";
import { useState } from "react";
import {
  useGetMobileOverviewQuery,
  useGetMobileInstallationsQuery,
  useGetMobileInstallationHistoryQuery,
  useGetMobileReleasesQuery,
  useGetMobileAlertsQuery,
  useResolveMobileAlertMutation,
  useGetMobileAuditQuery,
  type MobileParams,
} from "@/lib/features/mobileOperations/mobileOperationsApi";
import {
  dateLabel,
  numberLabel,
} from "@/lib/features/mobileOperations/mobilePresentation";
import { useGetCurrentUserProfileQuery } from "@/lib/features/profile/profileApi";
import { isMarketerRole } from "@/lib/features/auth/adminRoles";
import { DataTable, Field, Pager, QueryState, useOperation } from "./ui";
import shared from "../styles/page.module.css";

import { confirmAction } from "@/app/components/ui/Feedback";

export function PlatformField({
  value,
  change,
}: {
  value: string;
  change: (v: string) => void;
}) {
  return (
    <Field label="Plateforme">
      <select value={value} onChange={(e) => change(e.target.value)}>
        <option value="">Toutes</option>
        <option value="android">Android</option>
        <option value="ios">iOS</option>
      </select>
    </Field>
  );
}
export function MobileOverviewPanel() {
  const [platform, setPlatform] = useState(""),
    [version, setVersion] = useState("");
  const [from, setFrom] = useState(() =>
    new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10),
  );
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [params, setParams] = useState<MobileParams>({ from, to });
  const q = useGetMobileOverviewQuery(params),
    data = q.currentData;
  const valid =
    !!from &&
    !!to &&
    Date.parse(to) >= Date.parse(from) &&
    Date.parse(to) - Date.parse(from) <= 365 * 86400000;
  return (
    <>
      <section className={shared.section}>
        <h2>Activité observée</h2>
        <form
          className={shared.toolbar}
          onSubmit={(e) => {
            e.preventDefault();
            if (valid)
              setParams({
                from,
                to,
                platform: platform || undefined,
                version: version || undefined,
              });
          }}
        >
          <PlatformField value={platform} change={setPlatform} />
          <Field label="Version">
            <input
              value={version}
              maxLength={32}
              pattern="[0-9]+(\.[0-9]+)*"
              onChange={(e) => setVersion(e.target.value)}
              placeholder="Toutes"
            />
          </Field>
          <Field label="Du (UTC)">
            <input
              type="date"
              required
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </Field>
          <Field label="Au (UTC)">
            <input
              type="date"
              required
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </Field>
          <button
            className={shared.primaryButton}
            disabled={!valid || q.isFetching}
          >
            Appliquer
          </button>
        </form>
        {!valid && <p role="alert">Choisissez une période de 1 à 366 jours.</p>}
        <QueryState loading={q.isFetching} error={q.error} retry={q.refetch} />
        {data && (
          <>
            <p>
              Source : Zwanga PostgreSQL · Données conservées et instrumentées
              uniquement · Actualisé le {dateLabel(data.generatedAt)}.
            </p>
            <DataTable
              columns={["Indicateur", "Valeur"]}
              rows={[
                [
                  "Installations observées dans la cohorte",
                  data.installations.value.installations,
                ],
                ["Sans compte associé", data.installations.value.anonymous],
                ["Avec compte associé", data.installations.value.linked],
                [
                  "Jeton push présent et activé (pas une livraison confirmée)",
                  data.installations.value.reachable,
                ],
                [
                  "Installations sous un minimum actif",
                  data.obsoleteBuilds.value,
                ],
                [
                  "Nouveaux comptes (toutes plateformes)",
                  data.accounts.value.registrations,
                ],
                [
                  "Premier trajet des nouveaux comptes, à ce jour",
                  data.accounts.value.firstTripCompletedAsOfNow,
                ],
                [
                  "Conducteurs actifs sur la période (toutes plateformes)",
                  data.accounts.value.activeDrivers,
                ],
                [
                  "Passagers actifs sur la période (toutes plateformes)",
                  data.accounts.value.activePassengers,
                ],
              ].map(([label, value]) => ({
                key: String(label),
                cells: [String(label), numberLabel(value as number)],
              }))}
            />
            <p className={shared.helpText}>
              Une installation n’est ni une personne unique ni un téléchargement
              Store. Les comptes métier ne sont pas filtrés par
              plateforme/version. Une association peut concerner un compte déjà
              existant.
            </p>
            <p>
              Installation → association à un compte :{" "}
              {numberLabel(data.conversions.installationToAccountLinkPercent)}
              {data.conversions.installationToAccountLinkPercent == null
                ? ""
                : " %"}
              . Nouveau compte → premier trajet :{" "}
              {numberLabel(data.conversions.accountToFirstTripPercent)}
              {data.conversions.accountToFirstTripPercent == null ? "" : " %"}.
            </p>
          </>
        )}
      </section>
      {data && (
        <>
          <section className={shared.section}>
            <h2>Adoption des versions</h2>
            <DataTable
              columns={["Plateforme", "Version", "Build", "Installations"]}
              rows={data.adoption.value.map((r) => ({
                key: `${r.platform}/${r.version}/${r.build}`,
                cells: [
                  r.platform,
                  r.version,
                  r.build,
                  numberLabel(r.installations),
                ],
              }))}
            />
          </section>
          <section className={shared.section}>
            <h2>Rétention des cohortes arrivées à échéance</h2>
            <DataTable
              columns={["Jour de retour", "Éligibles", "Revenues", "Taux"]}
              rows={data.retention.value.map((r) => ({
                key: String(r.days),
                cells: [
                  `J+${r.days}`,
                  r.eligible,
                  r.retained,
                  r.eligible
                    ? `${numberLabel((100 * r.retained) / r.eligible)} %`
                    : "Indisponible",
                ],
              }))}
            />
          </section>
        </>
      )}
    </>
  );
}
function InstallationHistory({ id }: { id: string }) {
  const [page, setPage] = useState(1),
    q = useGetMobileInstallationHistoryQuery({ id, page });
  return (
    <section className={shared.section}>
      <h3>Contacts de l’installation {id}</h3>
      <QueryState loading={q.isFetching} error={q.error} retry={q.refetch} />
      {q.currentData && (
        <>
          <DataTable
            columns={["Jour UTC", "Plateforme", "Version"]}
            rows={q.currentData.items.map((r) => ({
              key: r.day,
              cells: [r.day.slice(0, 10), r.platform, r.version],
            }))}
          />
          <Pager
            page={page}
            more={q.currentData.items.length === 25}
            busy={q.isFetching}
            change={setPage}
          />
        </>
      )}
    </section>
  );
}
export function MobileInstallationsPanel() {
  const [filters, setFilters] = useState<Record<string, string>>({}),
    [applied, setApplied] = useState<MobileParams>({}),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState("");
  const q = useGetMobileInstallationsQuery({ ...applied, page, limit: 25 });
  return (
    <>
      <section className={shared.section}>
        <h2>Installations connues</h2>
        <form
          className={shared.toolbar}
          onSubmit={(e) => {
            e.preventDefault();
            setApplied(
              Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
            );
            setPage(1);
            setSelected("");
          }}
        >
          <PlatformField
            value={filters.platform ?? ""}
            change={(platform) => setFilters({ ...filters, platform })}
          />
          <Field label="Version">
            <input
              value={filters.version ?? ""}
              maxLength={32}
              pattern="[0-9]+(\.[0-9]+)*"
              onChange={(e) =>
                setFilters({ ...filters, version: e.target.value })
              }
            />
          </Field>
          {(
            [
              [
                "environment",
                "Environnement",
                [
                  ["production", "Production"],
                  ["staging", "Staging"],
                  ["development", "Développement"],
                ],
              ],
              [
                "population",
                "Association",
                [
                  ["anonymous", "Sans compte"],
                  ["linked", "Compte associé"],
                ],
              ],
              [
                "reachable",
                "Éligibilité push",
                [
                  ["yes", "Activé avec jeton"],
                  ["no", "Désactivé ou sans jeton"],
                ],
              ],
            ] as const
          ).map(([key, label, options]) => (
            <Field key={key} label={label}>
              <select
                value={filters[key] ?? ""}
                onChange={(e) =>
                  setFilters({ ...filters, [key]: e.target.value })
                }
              >
                <option value="">Tous</option>
                {options.map(([value, text]) => (
                  <option key={value} value={value}>
                    {text}
                  </option>
                ))}
              </select>
            </Field>
          ))}
          <button className={shared.primaryButton} disabled={q.isFetching}>
            Filtrer
          </button>
        </form>
        <QueryState loading={q.isFetching} error={q.error} retry={q.refetch} />
        {q.currentData && (
          <>
            <DataTable
              columns={[
                "Installation",
                "Version",
                "Environnement",
                "Compte",
                "Notifications",
                "Dernier contact",
                "Actions",
              ]}
              rows={q.currentData.items.map((r) => ({
                key: r.id,
                cells: [
                  r.id,
                  `${r.platform} · ${r.version} (${r.build})`,
                  r.mobileMetadata?.environment ?? "Non renseigné",
                  r.linked ? "Associé" : "Sans compte",
                  r.mobileMetadata?.notificationPermission ?? "Non renseigné",
                  dateLabel(r.updatedAt),
                  <button
                    key="history"
                    className={shared.secondaryButton}
                    onClick={() => setSelected(selected === r.id ? "" : r.id)}
                  >
                    {selected === r.id ? "Fermer" : "Historique"}
                  </button>,
                ],
              }))}
            />
            <Pager
              page={page}
              more={q.currentData.hasMore === true}
              busy={q.isFetching}
              change={(n) => {
                setPage(n);
                setSelected("");
              }}
            />
          </>
        )}
        <p className={shared.helpText}>
          Les identifiants de notification et les secrets d’installation ne sont
          pas affichés. L’autorisation de notifications ne prouve pas la
          réception.
        </p>
      </section>
      {selected && <InstallationHistory key={selected} id={selected} />}
    </>
  );
}
export function MobileReleasesPanel() {
  const [platform, setPlatform] = useState(""),
    [page, setPage] = useState(1);
  const q = useGetMobileReleasesQuery({
    platform: platform || undefined,
    page,
    limit: 25,
  });
  const { data: profile } = useGetCurrentUserProfileQuery();
  return (
    <section className={shared.section}>
      <h2>Versions déclarées dans Zwanga</h2>
      <p>
        Ces disponibilités sont confirmées par l’administration, pas déduites
        automatiquement des Stores.
      </p>
      <div className={shared.toolbar}>
        <PlatformField
          value={platform}
          change={(v) => {
            setPlatform(v);
            setPage(1);
          }}
        />
        {!isMarketerRole(profile?.user.role) && (
          <Link href="/app-updates" className={shared.secondaryButton}>
            Gestion existante des versions
          </Link>
        )}
        <Link href="/stores?tab=versions" className={shared.secondaryButton}>
          États officiels importés
        </Link>
      </div>
      <QueryState loading={q.isFetching} error={q.error} retry={q.refetch} />
      {q.currentData && (
        <>
          <DataTable
            columns={[
              "Référence",
              "Plateforme",
              "Version / build",
              "Disponibilité déclarée",
              "Date",
              "Notes",
            ]}
            rows={q.currentData.items.map((r) => ({
              key: r.id,
              cells: [
                r.id,
                r.platform,
                `${r.version} / ${r.build}`,
                r.available ? "Disponible" : "Retirée",
                dateLabel(r.publishedAt),
                r.notes,
              ],
            }))}
          />
          <Pager
            page={page}
            more={q.currentData.items.length === 25}
            busy={q.isFetching}
            change={setPage}
          />
        </>
      )}
    </section>
  );
}
export function MobileEventsPanel({
  audit,
  permissions,
}: {
  audit: boolean;
  permissions: string[];
}) {
  const [page, setPage] = useState(1),
    [resolutions, setResolutions] = useState<Record<string, string>>({});
  const alerts = useGetMobileAlertsQuery({ page, limit: 25 }, { skip: audit }),
    logs = useGetMobileAuditQuery({ page, limit: 25 }, { skip: !audit });
  const [resolve] = useResolveMobileAlertMutation(),
    op = useOperation();
  const q = audit ? logs : alerts;
  return (
    <section className={shared.section}>
      <h2>
        {audit ? "Historique des actions mobiles" : "Alertes de supervision"}
      </h2>
      {!audit && permissions.includes("store.alerts.manage") && (
        <Link href="/stores?tab=alerts" className={shared.secondaryButton}>
          Configurer les règles d’alerte
        </Link>
      )}
      <QueryState loading={q.isFetching} error={q.error} retry={q.refetch} />
      {op.notice}
      {audit
        ? logs.currentData && (
            <DataTable
              columns={["Date", "Action", "Administrateur", "Objet", "Détails"]}
              rows={logs.currentData.items.map((r) => ({
                key: r.id,
                cells: [
                  dateLabel(r.createdAt),
                  r.action,
                  r.actorId ?? "Système",
                  r.subjectId ?? "—",
                  <details key="details">
                    <summary>Afficher</summary>
                    <pre
                      style={{
                        whiteSpace: "pre-wrap",
                        overflowWrap: "anywhere",
                      }}
                    >
                      {JSON.stringify(r.details, null, 2)}
                    </pre>
                  </details>,
                ],
              }))}
            />
          )
        : alerts.currentData && (
            <DataTable
              columns={["Date", "Gravité", "Message", "Résolution"]}
              rows={alerts.currentData.items.map((r) => ({
                key: r.id,
                cells: [
                  dateLabel(r.createdAt),
                  r.severity,
                  r.message,
                  r.resolvedAt ? (
                    `${dateLabel(r.resolvedAt)} · ${r.resolution}`
                  ) : permissions.includes("store.alerts.manage") ? (
                    <form
                      key="resolution"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (
                          await confirmAction(
                            "Confirmer la résolution de cette alerte ?",
                          )
                        )
                          void op.run(
                            () =>
                              resolve({
                                id: r.id,
                                resolution: resolutions[r.id].trim(),
                              }).unwrap(),
                            "Résolution enregistrée.",
                          );
                      }}
                    >
                      <Field label="Action corrective">
                        <input
                          required
                          minLength={5}
                          maxLength={500}
                          value={resolutions[r.id] ?? ""}
                          onChange={(e) =>
                            setResolutions({
                              ...resolutions,
                              [r.id]: e.target.value,
                            })
                          }
                        />
                      </Field>
                      <button
                        disabled={
                          op.busy ||
                          q.isFetching ||
                          (resolutions[r.id]?.trim().length ?? 0) < 5
                        }
                        className={shared.secondaryButton}
                      >
                        Résoudre
                      </button>
                    </form>
                  ) : (
                    "Non résolue"
                  ),
                ],
              }))}
            />
          )}
      {q.currentData && (
        <Pager
          page={page}
          more={q.currentData.items.length === 25}
          busy={q.isFetching || op.busy}
          change={setPage}
        />
      )}
    </section>
  );
}
