export const ZONES_DEPLOIEMENT = [
  { id: "kinkole", label: "Kinkole" },
  { id: "bibwa", label: "Bibwa" },
  { id: "terre-jaune", label: "Terre Jaune" },
  { id: "kingasani", label: "Kingasani" },
  { id: "pascal", label: "Pascal" },
  { id: "bitabe", label: "Bitabe" },
  { id: "ndjili-quartier-1", label: "Ndjili Quartier 1" },
  { id: "debonhomme", label: "Debonhomme" },
  { id: "limete-7e-rue", label: "Limete 7ème rue" },
  { id: "victoire", label: "Victoire" },
  { id: "cite-verte", label: "Cité Verte" },
  { id: "matadi-kibala", label: "Matadi Kibala" },
  { id: "elengesa", label: "Elengesa" },
  { id: "rond-point-ngaba", label: "Rond-point Ngaba" },
  { id: "intendance", label: "Intendance" },
  { id: "lemba-super", label: "Lemba Super" },
  { id: "lemba-terminus", label: "Lemba Terminus" },
  { id: "matete", label: "Matete" },
  { id: "bon-marche", label: "Bon Marché" },
  { id: "gare-central", label: "Gare Central" },
  { id: "rond-point-huilerie", label: "Rond-point Huilerie" },
  { id: "assanef", label: "Assanef" },
  { id: "bandal-moulaert", label: "Bandal Moulaert" },
  { id: "upn", label: "UPN" },
  { id: "kintambo-magasin", label: "Kintambo Magasin" },
] as const;

export type ZoneDeploiementId = (typeof ZONES_DEPLOIEMENT)[number]["id"];

export const SEXE_OPTIONS = [
  { id: "homme", label: "Homme" },
  { id: "femme", label: "Femme" },
] as const;

export const APPAREIL_OPTIONS = [
  { id: "android", label: "Android" },
  { id: "iphone", label: "iPhone" },
  { id: "autre", label: "Autre / Pas de smartphone" },
] as const;

export const DEJA_TELECHARGE_OPTIONS = [
  { id: "oui", label: "Oui" },
  { id: "non", label: "Non" },
] as const;

export const PROFIL_UTILISATEUR_OPTIONS = [
  { id: "passager", label: "Passager" },
  { id: "conducteur", label: "Conducteur" },
  { id: "les-deux", label: "Les deux" },
  { id: "aucun", label: "Aucun / Ne sait pas" },
] as const;

export const RECRUTEMENT_FORM_STEPS = [
  "Informations personnelles",
  "Smartphone & usage",
  "Avis sur Zwanga",
  "Zone de déploiement",
  "Récapitulatif",
] as const;
