import { z } from "zod";

import { SERVICES } from "@/config/form.config";

const SERVICE_PRICE_MAP = new Map<string, number>(SERVICES.map((service) => [service.id, service.prix]));
const SERVICE_IDS = new Set<string>(SERVICES.map((service) => service.id));

const noHtml = (value: string) => !/[<>]/.test(value);

const textField = (label: string, min = 2, max = 200) =>
  z
    .string()
    .trim()
    .min(min, `Le champ ${label} est obligatoire.`)
    .max(max, `Le champ ${label} est trop long.`)
    .refine(noHtml, "Les balises HTML ne sont pas autorisees.");

export const identiteSchema = z.object({
  nomComplet: textField("nom complet", 3, 180),
});

export const contactSchema = z.object({
  telephone: z
    .string()
    .trim()
    .regex(/^[0-9+().\s-]{8,20}$/, "Numero de telephone invalide."),
});

export const vehiculeSchema = z.object({
  marqueComplete: textField("marque complete du vehicule", 2, 180),
  plaqueImmatriculation: textField("numero de plaque d'immatriculation", 2, 80),
});

export const servicesSchema = z
  .array(z.string().trim())
  .min(1, "Selectionnez au moins un document/service.")
  .max(SERVICES.length, "Trop de services selectionnes.")
  .refine((services) => services.every((service) => SERVICE_IDS.has(service)), {
    message: "Un ou plusieurs services sont invalides.",
  });

export const demandePayloadSchema = z.object({
  identite: identiteSchema,
  contact: contactSchema,
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
    nomComplet: cleanString(payload.identite.nomComplet),
  },
  contact: {
    telephone: cleanString(payload.contact.telephone),
  },
  vehicule: {
    marqueComplete: cleanString(payload.vehicule.marqueComplete),
    plaqueImmatriculation: cleanString(payload.vehicule.plaqueImmatriculation).toUpperCase(),
  },
  services: Array.from(
    new Set(payload.services.map((service) => cleanString(service)).filter((service) => SERVICE_IDS.has(service))),
  ),
  total: payload.total,
});

export const computeServicesTotal = (services: string[]) =>
  services.reduce((total, serviceId) => total + (SERVICE_PRICE_MAP.get(serviceId) ?? 0), 0);

