"use client";
import { useRef, useState } from "react";
import { useGetCurrentUserProfileQuery } from "@/lib/features/profile/profileApi";
import {
  useGetMobileCampaignsQuery,
  useSaveMobileCampaignMutation,
  useGetMobileCampaignPreviewQuery,
  useGetMobileCampaignStatsQuery,
  useActOnMobileCampaignMutation,
  type MobileCampaign,
  type CampaignInput,
} from "@/lib/features/mobileOperations/mobileOperationsApi";
import {
  campaignActions,
  createRequestIntent,
  dateLabel,
  isoDateTime,
  localDateTime,
  numberLabel,
  stateLabel,
} from "@/lib/features/mobileOperations/mobilePresentation";
import { DataTable, Field, Pager, QueryState, useOperation } from "./ui";
import shared from "../styles/page.module.css";

import { confirmAction } from "@/app/components/ui/Feedback";

const kinds = {
  information: "Information",
  signup: "Inscription",
  feature: "Fonctionnalité",
  update: "Mise à jour",
  maintenance: "Maintenance",
  operational: "Opérationnel",
  marketing: "Marketing",
};
function CampaignForm({
  campaign,
  saved,
  close,
}: {
  campaign?: MobileCampaign;
  saved: (id: string) => void;
  close: () => void;
}) {
  const [title, setTitle] = useState(campaign?.title ?? ""),
    [body, setBody] = useState(campaign?.body ?? "");
  const [kind, setKind] = useState<CampaignInput["kind"]>(
    campaign?.kind ?? "information",
  );
  const [audience, setAudience] = useState<CampaignInput["audience"]>(
    campaign?.audience ?? { environment: "staging", population: "all" },
  );
  const [expiresAt, setExpiresAt] = useState(() =>
    localDateTime(
      campaign?.expiresAt ?? new Date(Date.now() + 86400000).toISOString(),
    ),
  );
  const intent = useRef(createRequestIntent()),
    [save] = useSaveMobileCampaignMutation(),
    op = useOperation();
  return (
    <section className={shared.section}>
      <h2>{campaign ? "Modifier la campagne" : "Nouveau brouillon"}</h2>
      <p>
        Un autre administrateur devra approuver. Aucun message n’est envoyé lors
        de l’enregistrement.
      </p>
      {op.notice}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void op.run(async () => {
            const expiry = isoDateTime(expiresAt);
            if (
              Date.parse(expiry) <= Date.now() ||
              Date.parse(expiry) > Date.now() + 30 * 86400000
            )
              throw new Error(
                "L’expiration doit être dans les 30 prochains jours.",
              );
            if (audience.belowBuild && !audience.platform)
              throw new Error(
                "Choisissez une plateforme pour le seuil de build.",
              );
            const values = {
              title: title.trim(),
              body: body.trim(),
              kind,
              audience,
              expiresAt: expiry,
            };
            const key = JSON.stringify(values);
            const result = await save({
              ...values,
              id: campaign?.id ?? intent.current.id(key),
              ...(campaign ? { revision: campaign.revision } : {}),
            }).unwrap();
            intent.current.complete(key);
            saved(result.id);
          }, "Brouillon enregistré.");
        }}
      >
        <fieldset disabled={op.busy} className={shared.section}>
          <div className={shared.toolbar}>
            <Field label="Titre">
              <input
                required
                minLength={3}
                maxLength={90}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </Field>
            <Field label="Type">
              <select
                value={kind}
                onChange={(e) =>
                  setKind(e.target.value as CampaignInput["kind"])
                }
              >
                {Object.entries(kinds).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Plateforme">
              <select
                value={audience.platform ?? ""}
                onChange={(e) =>
                  setAudience({
                    ...audience,
                    platform:
                      (e.target.value as "android" | "ios") || undefined,
                    belowBuild: e.target.value
                      ? audience.belowBuild
                      : undefined,
                  })
                }
              >
                <option value="">Android et iOS</option>
                <option value="android">Android</option>
                <option value="ios">iOS</option>
              </select>
            </Field>
            <Field label="Environnement ciblé">
              <select
                value={audience.environment}
                onChange={(e) =>
                  setAudience({
                    ...audience,
                    environment: e.target
                      .value as CampaignInput["audience"]["environment"],
                  })
                }
              >
                <option value="staging">Staging</option>
                <option value="development">Développement</option>
                <option value="production">Production</option>
              </select>
            </Field>
            <Field label="Population">
              <select
                value={audience.population}
                onChange={(e) =>
                  setAudience({
                    ...audience,
                    population: e.target
                      .value as CampaignInput["audience"]["population"],
                  })
                }
              >
                {Object.entries({
                  all: "Toutes les installations",
                  anonymous: "Sans compte",
                  linked: "Compte associé",
                  driver: "Conducteurs",
                  passenger: "Passagers",
                }).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Build inférieur à (facultatif)">
              <input
                disabled={!audience.platform}
                maxLength={32}
                pattern="[0-9]+(\.[0-9]+)*"
                value={audience.belowBuild ?? ""}
                onChange={(e) =>
                  setAudience({
                    ...audience,
                    belowBuild: e.target.value || undefined,
                  })
                }
              />
            </Field>
            <Field label="Inactivité minimum (jours, facultatif)">
              <input
                type="number"
                min={1}
                max={365}
                value={audience.inactiveDays ?? ""}
                onChange={(e) =>
                  setAudience({
                    ...audience,
                    inactiveDays: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  })
                }
              />
            </Field>
            <Field label="Expiration (heure locale)">
              <input
                type="datetime-local"
                required
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </Field>
          </div>
          <Field label="Message">
            <textarea
              required
              minLength={3}
              maxLength={300}
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </Field>
          {campaign && (
            <p>
              La modification retire l’approbation précédente et remet la
              campagne en brouillon.
            </p>
          )}
          <div className={shared.toolbar}>
            <button className={shared.primaryButton}>
              Enregistrer le brouillon
            </button>
            <button
              type="button"
              className={shared.secondaryButton}
              onClick={close}
            >
              Annuler
            </button>
          </div>
        </fieldset>
      </form>
    </section>
  );
}
function CampaignDetail({
  id,
  permissions,
  sendingEnabled,
  edit,
  close,
}: {
  id: string;
  permissions: string[];
  sendingEnabled: boolean;
  edit: (c: MobileCampaign) => void;
  close: () => void;
}) {
  const detail = useGetMobileCampaignPreviewQuery(id, {
    refetchOnMountOrArgChange: true,
  });
  const stats = useGetMobileCampaignStatsQuery(id, {
    pollingInterval: 15000,
    skipPollingIfUnfocused: true,
  });
  const { data: profile } = useGetCurrentUserProfileQuery();
  const [action] = useActOnMobileCampaignMutation(),
    op = useOperation(),
    [scheduledAt, setScheduledAt] = useState("");
  const campaign = detail.currentData?.campaign;
  const allowed = campaign
    ? campaignActions(campaign, permissions, profile?.user.id, sendingEnabled)
    : null;
  const busy = op.busy || detail.isFetching || !!detail.error;
  const act = async (kind: "approve" | "launch" | "cancel") => {
    if (!campaign || !allowed?.[kind] || busy) return;
    const prompt =
      kind === "launch"
        ? `Envoyer « ${campaign.title} » aux installations éligibles de ${campaign.audience.environment} (${campaign.audience.platform ?? "Android et iOS"}, ${campaign.audience.population})${scheduledAt ? " à la date choisie" : " maintenant"} ? Les messages transmis ne sont pas rappelables.`
        : kind === "approve"
          ? `Approuver le contenu et la population de « ${campaign.title} » ?`
          : "Annuler les prochains envois ? Les notifications déjà transmises ne peuvent pas être rappelées.";
    if (!(await confirmAction(prompt))) return;
    void op.run(
      async () => {
        const at =
          kind === "launch" && scheduledAt
            ? isoDateTime(scheduledAt)
            : undefined;
        if (
          at &&
          (Date.parse(at) <= Date.now() ||
            Date.parse(at) >= Date.parse(campaign.expiresAt))
        )
          throw new Error(
            "Planifiez l’envoi dans le futur et avant l’expiration.",
          );
        await action({
          id,
          action: kind,
          revision: campaign.revision,
          confirmed: true,
          ...(at ? { scheduledAt: at } : {}),
        }).unwrap();
      },
      kind === "launch"
        ? "Campagne planifiée. Le suivi indique l’avancement réel des envois."
        : "Modification enregistrée.",
    );
  };
  return (
    <section className={shared.section}>
      <header className={shared.sectionHeader}>
        <h2>Détail de la campagne</h2>
        <button
          disabled={op.busy}
          className={shared.secondaryButton}
          onClick={close}
        >
          Fermer
        </button>
      </header>
      <QueryState
        loading={detail.isFetching}
        error={detail.error}
        retry={detail.refetch}
      />
      {op.notice}
      {campaign && (
        <>
          <h3>{campaign.title}</h3>
          <p style={{ whiteSpace: "pre-wrap" }}>{campaign.body}</p>
          <p>
            {stateLabel(campaign.state)} · Révision {campaign.revision} ·{" "}
            {kinds[campaign.kind]} · Expire le {dateLabel(campaign.expiresAt)}
          </p>
          <p>
            Cible : {campaign.audience.environment} ·{" "}
            {campaign.audience.platform ?? "Android et iOS"} ·{" "}
            {campaign.audience.population}
            {campaign.audience.belowBuild
              ? ` · build < ${campaign.audience.belowBuild}`
              : ""}
            {campaign.audience.inactiveDays
              ? ` · inactivité ≥ ${campaign.audience.inactiveDays} jours`
              : ""}
            .
          </p>
          <p>
            Estimation actuelle :{" "}
            {numberLabel(detail.currentData?.eligibleInstallations)}{" "}
            installations. Le consentement et l’éligibilité sont revérifiés au
            moment de l’envoi.
          </p>
          <div className={shared.toolbar}>
            <button
              className={shared.secondaryButton}
              disabled={busy}
              onClick={() => detail.refetch()}
            >
              Actualiser l’estimation et l’état
            </button>
            {allowed?.edit && (
              <button
                className={shared.secondaryButton}
                disabled={busy}
                onClick={() => edit(campaign)}
              >
                Modifier le brouillon
              </button>
            )}
            {allowed?.approve && (
              <button
                className={shared.secondaryButton}
                disabled={busy}
                onClick={() => act("approve")}
              >
                Approuver
              </button>
            )}
            {allowed?.launch && (
              <>
                <Field label="Planifier (vide = maintenant)">
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    disabled={busy}
                    onChange={(e) => setScheduledAt(e.target.value)}
                  />
                </Field>
                <button
                  className={shared.primaryButton}
                  disabled={busy}
                  onClick={() => act("launch")}
                >
                  Confirmer l’envoi
                </button>
              </>
            )}
            {allowed?.cancel && (
              <button
                className={shared.secondaryButton}
                disabled={busy}
                onClick={() => act("cancel")}
              >
                Annuler la campagne
              </button>
            )}
          </div>
          {campaign.state === "draft" &&
            campaign.createdBy === profile?.user.id && (
              <p className={shared.helpText}>
                Un autre administrateur disposant du droit d’approbation doit
                valider ce brouillon, y compris pour un Super Admin.
              </p>
            )}
        </>
      )}
      <h3>Suivi des notifications</h3>
      <QueryState
        loading={stats.isFetching}
        error={stats.error}
        retry={stats.refetch}
      />
      {stats.currentData && (
        <DataTable
          columns={["Indicateur", "Nombre"]}
          rows={(
            [
              ["Notifications créées", stats.currentData.queued],
              [
                "Acceptées par le fournisseur",
                stats.currentData.providerAccepted,
              ],
              ["Échecs enregistrés", stats.currentData.failed],
              ["Envois écartés", stats.currentData.suppressed],
              ["Échecs permanents", stats.currentData.permanentFailures],
              ["Jetons invalides", stats.currentData.invalidTokens],
              [
                "Ouvertures signalées par l’app",
                stats.currentData.instrumentedOpens,
              ],
              ["Livrées au téléphone", null],
              ["Lues par une personne", null],
            ] as const
          ).map(([label, value]) => ({
            key: label,
            cells: [label, numberLabel(value)],
          }))}
        />
      )}
      <p className={shared.helpText}>
        « Acceptée par le fournisseur » ne signifie pas reçue ou lue. «
        Traitement terminé » signifie que le parcours des destinataires est
        terminé, pas que tous les téléphones ont reçu le message.
      </p>
    </section>
  );
}
export function MobileCampaignsPanel({
  permissions,
  sendingEnabled,
}: {
  permissions: string[];
  sendingEnabled: boolean;
}) {
  const [page, setPage] = useState(1),
    [selected, setSelected] = useState(""),
    [form, setForm] = useState<MobileCampaign | "new" | null>(null);
  const q = useGetMobileCampaignsQuery(
    { page, limit: 25 },
    { pollingInterval: 15000, skipPollingIfUnfocused: true },
  );
  return (
    <>
      {!sendingEnabled && (
        <p className={shared.helpText}>
          L’envoi est désactivé côté serveur (MOBILE_CAMPAIGNS_ENABLED). Les
          brouillons restent disponibles.
        </p>
      )}
      <section className={shared.section}>
        <header className={shared.sectionHeader}>
          <h2>Campagnes mobiles</h2>
          {permissions.includes("mobile.campaigns.create") && (
            <button
              className={shared.primaryButton}
              disabled={!!form}
              onClick={() => {
                setForm("new");
                setSelected("");
              }}
            >
              Nouveau brouillon
            </button>
          )}
        </header>
        <QueryState loading={q.isFetching} error={q.error} retry={q.refetch} />
        {q.currentData && (
          <>
            <DataTable
              columns={["Campagne", "Cible", "État", "Expiration", "Action"]}
              rows={q.currentData.items.map((c) => ({
                key: c.id,
                cells: [
                  c.title,
                  `${c.audience.environment} · ${c.audience.platform ?? "Android et iOS"} · ${c.audience.population}`,
                  stateLabel(c.state),
                  dateLabel(c.expiresAt),
                  <button
                    key="detail"
                    disabled={!!form}
                    className={shared.secondaryButton}
                    onClick={() => setSelected(c.id)}
                  >
                    Consulter
                  </button>,
                ],
              }))}
            />
            <Pager
              page={page}
              more={q.currentData.items.length === 25}
              busy={q.isFetching || !!form}
              change={setPage}
            />
          </>
        )}
      </section>
      {form && (
        <CampaignForm
          key={typeof form === "string" ? form : `${form.id}/${form.revision}`}
          campaign={typeof form === "string" ? undefined : form}
          close={() => setForm(null)}
          saved={(id) => {
            setForm(null);
            setSelected(id);
          }}
        />
      )}
      {selected && !form && (
        <CampaignDetail
          key={selected}
          id={selected}
          permissions={permissions}
          sendingEnabled={sendingEnabled}
          edit={(c) => setForm(c)}
          close={() => setSelected("")}
        />
      )}
    </>
  );
}
