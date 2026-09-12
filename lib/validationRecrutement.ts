import { z } from "zod";

import {
  APPAREIL_OPTIONS,
  DEJA_TELECHARGE_OPTIONS,
  PROFIL_UTILISATEUR_OPTIONS,
  SEXE_OPTIONS,
  ZONES_DEPLOIEMENT,
} from "@/config/recrutementTerrain.config";

const ZONE_IDS = new Set<string>(ZONES_DEPLOIEMENT.map((zone) => zone.id));
const SEXE_IDS = SEXE_OPTIONS.map((option) => option.id);
const APPAREIL_IDS = APPAREIL_OPTIONS.map((option) => option.id);
const DEJA_TELECHARGE_IDS = DEJA_TELECHARGE_OPTIONS.map((option) => option.id);
const PROFIL_IDS = PROFIL_UTILISATEUR_OPTIONS.map((option) => option.id);

const noHtml = (value: string) => !/[<>]/.test(value);

const textField = (label: string, min = 2, max = 500) =>
  z
    .string()
    .trim()
    .min(min, `Le champ ${label} est obligatoire.`)
    .max(max, `Le champ ${label} est trop long.`)
    .refine(noHtml, "Les balises HTML ne sont pas autorisées.");

const optionalTextField = (max = 500) =>
  z
    .string()
    .trim()
    .max(max, "Ce champ est trop long.")
    .refine(noHtml, "Les balises HTML ne sont pas autorisées.")
    .optional()
    .or(z.literal(""));

const choiceField = (label: string, allowed: readonly string[]) =>
  z
    .string()
    .trim()
    .refine((value) => allowed.includes(value), `Sélectionnez ${label}.`);

export const contactSchema = z.object({
  nomComplet: textField("nom complet", 3, 180),
  age: z.coerce
    .number()
    .int("L'âge doit être un nombre entier.")
    .min(16, "L'âge minimum accepté est 16 ans.")
    .max(100, "L'âge maximum accepté est 100 ans."),
  telephone: z
    .string()
    .trim()
    .regex(/^[0-9+().\s-]{8,20}$/, "Numéro de téléphone invalide."),
  sexe: choiceField("le sexe", SEXE_IDS),
});

export const usageSchema = z.object({
  appareil: choiceField("le type de téléphone", APPAREIL_IDS),
  dejaTelecharge: choiceField("si Zwanga a déjà été téléchargé", DEJA_TELECHARGE_IDS),
  profilUtilisateur: choiceField("le profil (passager/conducteur)", PROFIL_IDS),
});

export const retoursSchema = z.object({
  problemesRencontres: optionalTextField(600),
  comprehensionProjet: textField("compréhension du projet", 5, 800),
  suggestionsAmelioration: optionalTextField(600),
});

export const zonesSchema = z
  .array(z.string().trim())
  .min(1, "Sélectionnez au moins une zone de déploiement.")
  .max(ZONES_DEPLOIEMENT.length, "Trop de zones sélectionnées.")
  .refine((zones) => zones.every((zone) => ZONE_IDS.has(zone)), {
    message: "Une ou plusieurs zones sélectionnées sont invalides.",
  });

export const recrutementPayloadSchema = z.object({
  contact: contactSchema,
  usage: usageSchema,
  retours: retoursSchema,
  zonesDeploiement: zonesSchema,
});

export type RecrutementPayload = z.infer<typeof recrutementPayloadSchema>;

const cleanString = (value: string) =>
  value
    .replace(/[<>]/g, "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim();

export const sanitizeRecrutementPayload = (payload: RecrutementPayload): RecrutementPayload => ({
  contact: {
    nomComplet: cleanString(payload.contact.nomComplet),
    age: payload.contact.age,
    telephone: cleanString(payload.contact.telephone),
    sexe: payload.contact.sexe,
  },
  usage: { ...payload.usage },
  retours: {
    problemesRencontres: cleanString(payload.retours.problemesRencontres ?? ""),
    comprehensionProjet: cleanString(payload.retours.comprehensionProjet),
    suggestionsAmelioration: cleanString(payload.retours.suggestionsAmelioration ?? ""),
  },
  zonesDeploiement: Array.from(
    new Set(
      payload.zonesDeploiement
        .map((zone) => cleanString(zone))
        .filter((zone) => ZONE_IDS.has(zone)),
    ),
  ),
});
