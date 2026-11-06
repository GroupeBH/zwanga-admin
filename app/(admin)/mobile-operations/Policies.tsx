"use client";
import { useRef, useState } from "react";
import {
  useGetMobilePoliciesQuery,
  useGetMobileReleasesQuery,
  useSaveMobilePolicyMutation,
  useToggleMobilePolicyMutation,
  type MobilePolicy,
  type PolicyInput,
} from "@/lib/features/mobileOperations/mobileOperationsApi";
import { useGetStoreStatusQuery } from "@/lib/features/stores/storesApi";
import {
  createRequestIntent,
  dateLabel,
  isoDateTime,
  localDateTime,
} from "@/lib/features/mobileOperations/mobilePresentation";
import { DataTable, Field, Pager, QueryState, useOperation } from "./ui";
import { PlatformField } from "./ReadPanels";
import shared from "../styles/page.module.css";

import { confirmAction } from "@/app/components/ui/Feedback";

const modes = {
  NONE: "Aucune demande",
  OPTIONAL: "Facultative",
  RECOMMENDED: "Recommandée",
  REQUIRED: "Obligatoire pour les actions choisies",
};
const features = {
  create_trip: "Publier un trajet",
  accept_request: "Accepter une demande",
  create_booking: "Réserver",
  create_request: "Demander un trajet",
};
function PolicyForm({
  policy,
  permissions,
  close,
}: {
  policy?: MobilePolicy;
  permissions: string[];
  close: () => void;
}) {
  const [value, setValue] = useState<Omit<PolicyInput, "id">>(() => ({
    platform: policy?.platform ?? "android",
    environment: policy?.environment ?? "staging",
    releaseId: policy?.releaseId ?? "",
    mode: policy?.mode ?? "RECOMMENDED",
    minimumBuild: policy?.minimumBuild ?? "",
    minimumVersion: policy?.minimumVersion ?? undefined,
    message: policy?.message ?? "",
    storeUrl: policy?.storeUrl ?? "",
    audience: policy?.audience ?? "all",
    blockedFeatures: policy?.blockedFeatures ?? [],
    effectiveAt: localDateTime(policy?.effectiveAt ?? new Date().toISOString()),
    expiresAt: policy?.expiresAt ? localDateTime(policy.expiresAt) : "",
    availabilityConfirmed: policy?.availabilityConfirmed ?? false,
    availabilityEvidence: policy?.availabilityEvidence ?? "",
  }));
  const status = useGetStoreStatusQuery();
  const releases = useGetMobileReleasesQuery(
    { platform: value.platform, page: 1, limit: 100 },
    { skip: !permissions.includes("store.versions.read") },
  );
  const [save] = useSaveMobilePolicyMutation(),
    op = useOperation(),
    intent = useRef(createRequestIntent());
  const update = <K extends keyof typeof value>(
    key: K,
    fieldValue: (typeof value)[K],
  ) => setValue((v) => ({ ...v, [key]: fieldValue }));
  return (
    <section className={shared.section}>
      <h2>
        {policy
          ? "Modifier la règle de mise à jour"
          : "Nouvelle règle de mise à jour"}
      </h2>
      <p>
        Enregistrement inactif. L’activation est une action séparée. Les
        opérations et trajets déjà engagés ne sont pas interrompus par cette
        règle.
      </p>
      {op.notice}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (
            value.mode === "REQUIRED" &&
            !(await confirmAction(
              "Enregistrer une règle obligatoire ? Son activation ultérieure limitera les nouvelles actions sélectionnées pour les versions trop anciennes.",
            ))
          )
            return;
          void op.run(async () => {
            const body = {
              ...value,
              minimumVersion: value.minimumVersion || undefined,
              effectiveAt: isoDateTime(value.effectiveAt),
              expiresAt: value.expiresAt
                ? isoDateTime(value.expiresAt)
                : undefined,
              blockedFeatures:
                value.mode === "REQUIRED" ? value.blockedFeatures : [],
            };
            if (
              body.expiresAt &&
              Date.parse(body.expiresAt) <= Date.parse(body.effectiveAt)
            )
              throw new Error(
                "L’expiration doit être postérieure à la prise d’effet.",
              );
            const key = JSON.stringify(body);
            await save({
              ...body,
              id: policy?.id ?? intent.current.id(key),
              ...(policy ? { revision: policy.revision } : {}),
            }).unwrap();
            intent.current.complete(key);
            close();
          }, "Règle enregistrée, non activée.");
        }}
      >
        <fieldset disabled={op.busy} className={shared.section}>
          <div className={shared.toolbar}>
            <Field label="Plateforme">
              <select
                value={value.platform}
                onChange={(e) =>
                  setValue({
                    ...value,
                    platform: e.target.value as "android" | "ios",
                    releaseId: "",
                    minimumBuild: "",
                    storeUrl: "",
                    availabilityConfirmed: false,
                    availabilityEvidence: "",
                  })
                }
              >
                <option value="android">Android</option>
                <option value="ios">iOS</option>
              </select>
            </Field>
            <Field label="Environnement">
              <select
                value={value.environment}
                onChange={(e) =>
                  update(
                    "environment",
                    e.target.value as PolicyInput["environment"],
                  )
                }
              >
                <option value="staging">Staging</option>
                <option value="development">Développement</option>
                <option value="production">Production</option>
              </select>
            </Field>
            <Field label="Référence de la version déclarée">
              <input
                required
                pattern="[0-9]{1,18}"
                list="mobile-releases"
                value={value.releaseId}
                onChange={(e) => {
                  const release = releases.currentData?.items.find(
                    (r) => r.id === e.target.value,
                  );
                  const app = status.data?.platforms.find(
                    (p) =>
                      p.platform ===
                      (value.platform === "android" ? "google" : "apple"),
                  )?.appId;
                  setValue({
                    ...value,
                    releaseId: e.target.value,
                    minimumBuild: release?.build ?? value.minimumBuild,
                    availabilityConfirmed: false,
                    availabilityEvidence: "",
                    storeUrl:
                      value.storeUrl ||
                      (app
                        ? value.platform === "android"
                          ? `https://play.google.com/store/apps/details?id=${encodeURIComponent(app)}`
                          : `https://apps.apple.com/app/id${encodeURIComponent(app)}`
                        : ""),
                  });
                }}
              />
              <datalist id="mobile-releases">
                {releases.currentData?.items.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.version} · Build {r.build} ·{" "}
                    {r.available ? "Disponible" : "Retirée"}
                  </option>
                ))}
              </datalist>
            </Field>
            <Field label="Niveau">
              <select
                value={value.mode}
                onChange={(e) =>
                  setValue({
                    ...value,
                    mode: e.target.value as PolicyInput["mode"],
                    blockedFeatures:
                      e.target.value === "REQUIRED"
                        ? value.blockedFeatures
                        : [],
                  })
                }
              >
                {Object.entries(modes).map(([v, label]) => (
                  <option key={v} value={v}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Build minimum">
              <input
                required
                pattern="[0-9]+(\.[0-9]+)*"
                maxLength={32}
                value={value.minimumBuild}
                onChange={(e) => update("minimumBuild", e.target.value)}
              />
            </Field>
            <Field label="Version minimum (facultatif)">
              <input
                pattern="[0-9]+(\.[0-9]+)*"
                maxLength={32}
                value={value.minimumVersion ?? ""}
                onChange={(e) =>
                  update("minimumVersion", e.target.value || undefined)
                }
              />
            </Field>
            <Field label="Population">
              <select
                value={value.audience}
                onChange={(e) =>
                  update("audience", e.target.value as PolicyInput["audience"])
                }
              >
                <option value="all">Toutes les installations</option>
                <option value="anonymous">Sans compte</option>
                <option value="linked">Compte associé</option>
              </select>
            </Field>
            <Field label="Prise d’effet (heure locale)">
              <input
                type="datetime-local"
                required
                value={value.effectiveAt}
                onChange={(e) => update("effectiveAt", e.target.value)}
              />
            </Field>
            <Field label="Expiration (facultatif)">
              <input
                type="datetime-local"
                value={value.expiresAt ?? ""}
                onChange={(e) => update("expiresAt", e.target.value)}
              />
            </Field>
          </div>
          <QueryState
            loading={releases.isFetching}
            error={releases.error}
            retry={releases.isUninitialized ? undefined : releases.refetch}
          />
          <p>
            Choisissez une référence connue ou saisissez son identifiant. La
            liste suggère les 100 versions les plus récentes. Le backend vérifie
            la version cible et son build.
          </p>
          <Field label="Message dans l’application">
            <textarea
              required
              rows={3}
              minLength={3}
              maxLength={500}
              value={value.message}
              onChange={(e) => update("message", e.target.value)}
            />
          </Field>
          <Field label="Lien officiel du Store">
            <input
              type="url"
              required
              maxLength={500}
              value={value.storeUrl}
              onChange={(e) => update("storeUrl", e.target.value)}
            />
          </Field>
          {value.mode === "REQUIRED" && (
            <fieldset>
              <legend>Nouvelles actions limitées sous le build minimum</legend>
              {Object.entries(features).map(([key, label]) => (
                <label key={key} className={shared.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={value.blockedFeatures.includes(key)}
                    onChange={(e) =>
                      update(
                        "blockedFeatures",
                        e.target.checked
                          ? [...value.blockedFeatures, key]
                          : value.blockedFeatures.filter((v) => v !== key),
                      )
                    }
                  />
                  {label}
                </label>
              ))}
            </fieldset>
          )}
          <Field label="Preuve de disponibilité pour la population ciblée">
            <textarea
              required
              minLength={10}
              maxLength={500}
              rows={2}
              value={value.availabilityEvidence}
              onChange={(e) => update("availabilityEvidence", e.target.value)}
              placeholder="Vérification dans la console du Store, date et périmètre de disponibilité. Aucune clé ni donnée personnelle."
            />
          </Field>
          <label className={shared.checkboxRow}>
            <input
              type="checkbox"
              checked={value.availabilityConfirmed}
              onChange={(e) =>
                update("availabilityConfirmed", e.target.checked)
              }
            />
            Je confirme que cette version est téléchargeable par toute la
            population ciblée, pas seulement un déploiement progressif.
          </label>
          {policy?.active && (
            <p className={shared.helpText}>
              Modifier cette règle la désactive. Elle devra être réactivée après
              contrôle.
            </p>
          )}
          <div className={shared.toolbar}>
            <button className={shared.primaryButton}>
              Enregistrer sans activer
            </button>
            <button
              type="button"
              className={shared.secondaryButton}
              onClick={close}
            >
              Fermer
            </button>
          </div>
        </fieldset>
      </form>
    </section>
  );
}
export function MobilePoliciesPanel({
  permissions,
}: {
  permissions: string[];
}) {
  const [page, setPage] = useState(1),
    [platform, setPlatform] = useState(""),
    [form, setForm] = useState<MobilePolicy | "new" | null>(null);
  const q = useGetMobilePoliciesQuery({
    platform: platform || undefined,
    page,
    limit: 25,
  });
  const [toggle] = useToggleMobilePolicyMutation(),
    op = useOperation();
  return (
    <>
      <section className={shared.section}>
        <header className={shared.sectionHeader}>
          <h2>Règles de mise à jour</h2>
          <button
            disabled={!!form || op.busy}
            className={shared.primaryButton}
            onClick={() => setForm("new")}
          >
            Nouvelle règle
          </button>
        </header>
        <div className={shared.toolbar}>
          <PlatformField
            value={platform}
            change={(v) => {
              setPlatform(v);
              setPage(1);
            }}
          />
          <button
            className={shared.secondaryButton}
            disabled={q.isFetching || op.busy}
            onClick={() => q.refetch()}
          >
            Actualiser
          </button>
        </div>
        <p>
          Ces règles s’appliquent aux versions mobiles compatibles avec le
          contrôle de version. Elles ne publient aucune application dans les
          Stores.
        </p>
        <QueryState loading={q.isFetching} error={q.error} retry={q.refetch} />
        {op.notice}
        {q.currentData && (
          <>
            <DataTable
              columns={[
                "Cible",
                "Build minimum",
                "Niveau",
                "État",
                "Prise d’effet",
                "Actions",
              ]}
              rows={q.currentData.items.map((p) => ({
                key: p.id,
                cells: [
                  <span key="target" title={p.id}>
                    {p.platform} · {p.environment} · {p.audience}
                  </span>,
                  p.minimumBuild,
                  modes[p.mode],
                  p.active ? "Active" : "Inactive",
                  dateLabel(p.effectiveAt),
                  <div key="actions" className={shared.toolbar}>
                    <button
                      className={shared.secondaryButton}
                      disabled={!!form || op.busy || q.isFetching || !!q.error}
                      onClick={() => setForm(p)}
                    >
                      Modifier
                    </button>
                    <button
                      className={shared.secondaryButton}
                      disabled={
                        !!form ||
                        op.busy ||
                        q.isFetching ||
                        !!q.error ||
                        (!p.active && !p.availabilityConfirmed)
                      }
                      onClick={async () => {
                        if (
                          await confirmAction(
                            `${p.active ? "Désactiver" : "Activer"} cette règle ${modes[p.mode]} pour ${p.platform}, ${p.environment}, ${p.audience} ?${!p.active ? " La version doit être accessible à toute cette population." : ""}`,
                          )
                        )
                          void op.run(
                            () =>
                              toggle({
                                id: p.id,
                                revision: p.revision,
                                active: !p.active,
                                confirmed: true,
                              }).unwrap(),
                            "État de la règle mis à jour.",
                          );
                      }}
                    >
                      {p.active ? "Désactiver" : "Activer"}
                    </button>
                  </div>,
                ],
              }))}
            />
            <Pager
              page={page}
              more={q.currentData.items.length === 25}
              busy={q.isFetching || op.busy || !!form}
              change={setPage}
            />
          </>
        )}
      </section>
      {form && (
        <PolicyForm
          key={typeof form === "string" ? form : `${form.id}/${form.revision}`}
          policy={typeof form === "string" ? undefined : form}
          permissions={permissions}
          close={() => setForm(null)}
        />
      )}
    </>
  );
}
