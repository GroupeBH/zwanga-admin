import { z } from "zod";

import { SERVICES } from "@/config/form.config";

const SERVICE_PRICE_MAP = new Map<string, number>(SERVICES.map((service) => [service.id, service.prix]));
const SERVICE_IDS = new Set<string>(SERVICES.map((service) => service.id));

const noHtml = (value: string) => !/[<>]/.test(value);

const textField = (label: string, min = 2, max = 120) =>
  z
    .string()
    .trim()
    .min(min, `Le champ ${label} est obligatoire.`)
    .max(max, `Le champ ${label} est trop long.`)
    .refine(noHtml, "Les balises HTML ne sont pas autorisees.");

const optionalTextField = (label: string, max = 120) =>
  z
    .string()
    .trim()
    .max(max, `Le champ ${label} est trop long.`)
    .refine((value) => value === "" || noHtml(value), "Les balises HTML ne sont pas autorisees.")
    .optional()
    .or(z.literal(""));

const currentYear = new Date().getFullYear();

export const identiteSchema = z.object({
  nom: textField("nom"),
  postnom: textField("postnom"),
  prenom: textField("prenom"),
});

export const contactSchema = z.object({
  telephone: z
    .string()
    .trim()
    .regex(/^[0-9+().\s-]{8,20}$/, "Numero de telephone invalide."),
  email: z
    .union([
      z.literal(""),
      z
        .string()
        .trim()
        .email("Adresse email invalide.")
        .max(120, "Adresse email trop longue.")
        .refine(noHtml, "Les balises HTML ne sont pas autorisees."),
    ])
    .optional(),
});

export const localisationSchema = z.object({
  province: textField("province"),
  ville: textField("ville"),
  commune: textField("commune"),
  quartier: textField("quartier"),
  avenueNumero: textField("avenue et numero", 3, 160),
  codePostal: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9 -]{3,12}$/, "Code postal invalide.")
    .optional()
    .or(z.literal("")),
});

export const vehiculeSchema = z
  .object({
    genre: z.enum(["Moto", "Tricycle", "Voiture legere", "Jeep/4x4", "Camion", "Bus"]),
    marque: textField("marque"),
    modele: textField("modele/type"),
    vin: z
      .string()
      .trim()
      .regex(/^[A-HJ-NPR-Z0-9]{17}$/, "Le numero de chassis (VIN) doit contenir 17 caracteres valides."),
    plaqueActuelle: optionalTextField("numero de plaque actuel", 24),
    couleur: textField("couleur dominante"),
    chevauxFiscaux: z.coerce
      .number()
      .int("Le nombre de chevaux doit etre un entier.")
      .min(1, "Le nombre de chevaux doit etre superieur a 0.")
      .max(120, "Le nombre de chevaux est trop eleve."),
    anneeFabrication: z.coerce
      .number()
      .int("L'annee de fabrication doit etre un entier.")
      .min(1950, "L'annee de fabrication est trop ancienne.")
      .max(currentYear + 1, "L'annee de fabrication est invalide."),
    anneeMiseEnCirculation: z.coerce
      .number()
      .int("L'annee de premiere mise en circulation doit etre un entier.")
      .min(1950, "L'annee de premiere mise en circulation est trop ancienne.")
      .max(currentYear + 1, "L'annee de premiere mise en circulation est invalide."),
    carburant: z.enum(["Essence", "Diesel", "Hybride", "Electrique"]),
  })
  .refine((value) => value.anneeMiseEnCirculation >= value.anneeFabrication, {
    path: ["anneeMiseEnCirculation"],
    message: "L'annee de mise en circulation doit etre superieure ou egale a l'annee de fabrication.",
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
  localisation: localisationSchema,
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
    nom: cleanString(payload.identite.nom),
    postnom: cleanString(payload.identite.postnom),
    prenom: cleanString(payload.identite.prenom),
  },
  contact: {
    telephone: cleanString(payload.contact.telephone),
    email: payload.contact.email ? cleanString(payload.contact.email).toLowerCase() : "",
  },
  localisation: {
    province: cleanString(payload.localisation.province),
    ville: cleanString(payload.localisation.ville),
    commune: cleanString(payload.localisation.commune),
    quartier: cleanString(payload.localisation.quartier),
    avenueNumero: cleanString(payload.localisation.avenueNumero),
    codePostal: payload.localisation.codePostal ? cleanString(payload.localisation.codePostal) : "",
  },
  vehicule: {
    genre: payload.vehicule.genre,
    marque: cleanString(payload.vehicule.marque),
    modele: cleanString(payload.vehicule.modele),
    vin: cleanString(payload.vehicule.vin).toUpperCase(),
    plaqueActuelle: payload.vehicule.plaqueActuelle ? cleanString(payload.vehicule.plaqueActuelle).toUpperCase() : "",
    couleur: cleanString(payload.vehicule.couleur),
    chevauxFiscaux: payload.vehicule.chevauxFiscaux,
    anneeFabrication: payload.vehicule.anneeFabrication,
    anneeMiseEnCirculation: payload.vehicule.anneeMiseEnCirculation,
    carburant: payload.vehicule.carburant,
  },
  services: Array.from(
    new Set(payload.services.map((service) => cleanString(service)).filter((service) => SERVICE_IDS.has(service))),
  ),
  total: payload.total,
});

export const computeServicesTotal = (services: string[]) =>
  services.reduce((total, serviceId) => total + (SERVICE_PRICE_MAP.get(serviceId) ?? 0), 0);
