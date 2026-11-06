import type { MobileCampaign } from "./mobileOperationsApi";

export const mobileTabs = [
  ["overview", "Vue d’ensemble", "mobile.analytics.read"],
  ["installations", "Installations", "mobile.installations.read"],
  ["releases", "Versions", "store.versions.read"],
  ["policies", "Mises à jour", "mobile.policies.manage"],
  ["campaigns", "Campagnes", "mobile.campaigns.read"],
  ["alerts", "Alertes", "store.alerts.read"],
  ["audit", "Historique", "mobile.audit.read"],
] as const;
export function campaignActions(
  campaign: MobileCampaign,
  permissions: readonly string[],
  actorId: string | undefined,
  sendingEnabled: boolean,
  now = Date.now(),
) {
  const can = (p: string) => permissions.includes("mobile.campaigns." + p);
  const live = Date.parse(campaign.expiresAt) > now;
  return {
    edit: can("create") && ["draft", "approved"].includes(campaign.state),
    approve:
      can("approve") &&
      !!actorId &&
      campaign.createdBy !== actorId &&
      campaign.state === "draft" &&
      live,
    launch:
      can("launch") &&
      sendingEnabled &&
      campaign.state === "approved" &&
      !!campaign.approvedBy &&
      live,
    cancel:
      can("launch") && !["cancelled", "completed"].includes(campaign.state),
  };
}
export function numberLabel(value: number | null | undefined) {
  return value == null || !Number.isFinite(value)
    ? "Indisponible"
    : value.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
}
export function dateLabel(value: string | null | undefined) {
  return !value || !Number.isFinite(Date.parse(value))
    ? "—"
    : new Date(value).toLocaleString("fr-FR");
}
export function localDateTime(value: string) {
  const d = new Date(value);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
export function isoDateTime(value: string) {
  if (!value || !Number.isFinite(Date.parse(value)))
    throw new Error("Renseignez une date et une heure valides.");
  return new Date(value).toISOString();
}
// Keep IDs on transport failures; retrying must not create a second campaign/policy/job.
export function createRequestIntent(uuid = () => crypto.randomUUID()) {
  const pending = new Map<string, string>();
  return {
    id(key: string) {
      if (!pending.has(key)) pending.set(key, uuid());
      return pending.get(key)!;
    },
    complete(key: string) {
      pending.delete(key);
    },
  };
}
export const stateLabel = (value: string) =>
  ({
    draft: "Brouillon",
    approved: "Approuvée",
    scheduled: "Planifiée",
    running: "En cours",
    completed: "Traitement terminé",
    cancelled: "Annulée",
    pending: "En attente",
    queued: "En file",
    succeeded: "Terminée",
    failed: "Échec",
    unavailable: "Indisponible",
    unknown: "Résultat à vérifier",
  })[value] ?? value;
