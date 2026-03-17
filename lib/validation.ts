import { z } from "zod";

import { SERVICES } from "@/config/form.config";

const SERVICE_PRICE_MAP = new Map<string, number>(SERVICES.map((service) => [service.id, service.prix]));
const SERVICE_IDS = new Set<string>(SERVICES.map((service) => service.id));

const noHtml = (value: string) => !/[<>]/.test(value);

const textField = (label: string, min = 2, max = 100) =>
  z
    .string()
    .trim()
    .min(min, `Le champ ${label} est obligatoire.`)
    .max(max, `Le champ ${label} est trop long.`)
    .refine(noHtml, "Les balises HTML ne sont pas autorisees.");

export const identiteSchema = z.object({
  prenom: textField("prenom"),
  nom: textField("nom"),
  dateNaissance: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date de naissance invalide."),
});

export const contactSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Adresse email invalide.")
    .max(120, "Adresse email trop longue.")
    .refine(noHtml, "Les balises HTML ne sont pas autorisees."),
  telephone: z
    .string()
    .trim()
    .regex(/^[0-9+().\s-]{8,20}$/, "Numero de telephone invalide."),
});

export const adresseSchema = z.object({
  ligne1: textField("adresse", 4, 120),
  ville: textField("ville"),
  commune: textField("commune").optional().or(z.literal("")),
  codePostal: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9 -]{3,12}$/, "Code postal invalide.")
    .optional()
    .or(z.literal("")),
});

export const vehiculeSchema = z.object({
  marque: textField("marque"),
  modele: textField("modele"),
  immatriculation: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9 -]{4,20}$/, "Immatriculation invalide."),
});

export const servicesSchema = z
  .array(z.string().trim())
  .min(1, "Selectionnez au moins un service.")
  .max(SERVICES.length, "Trop de services selectionnes.")
  .refine((services) => services.every((service) => SERVICE_IDS.has(service)), {
    message: "Un ou plusieurs services sont invalides.",
  });

export const demandePayloadSchema = z.object({
  identite: identiteSchema,
  contact: contactSchema,
  adresse: adresseSchema,
  vehicule: vehiculeSchema,
  services: servicesSchema,
  total: z.number().nonnegative().optional(),
});

export type DemandePayload = z.infer<typeof demandePayloadSchema>;

const cleanString = (value: string) =>
  value
    .replace(/[<>]/g, "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim();

export const sanitizeDemandePayload = (payload: DemandePayload): DemandePayload => ({
  identite: {
    prenom: cleanString(payload.identite.prenom),
    nom: cleanString(payload.identite.nom),
    dateNaissance: cleanString(payload.identite.dateNaissance),
  },
  contact: {
    email: cleanString(payload.contact.email).toLowerCase(),
    telephone: cleanString(payload.contact.telephone),
  },
  adresse: {
    ligne1: cleanString(payload.adresse.ligne1),
    ville: cleanString(payload.adresse.ville),
    commune: payload.adresse.commune ? cleanString(payload.adresse.commune) : "",
    codePostal: payload.adresse.codePostal ? cleanString(payload.adresse.codePostal) : "",
  },
  vehicule: {
    marque: cleanString(payload.vehicule.marque),
    modele: cleanString(payload.vehicule.modele),
    immatriculation: cleanString(payload.vehicule.immatriculation).toUpperCase(),
  },
  services: Array.from(
    new Set(payload.services.map((service) => cleanString(service)).filter((service) => SERVICE_IDS.has(service))),
  ),
  total: payload.total,
});

export const computeServicesTotal = (services: string[]) =>
  services.reduce((total, serviceId) => total + (SERVICE_PRICE_MAP.get(serviceId) ?? 0), 0);
