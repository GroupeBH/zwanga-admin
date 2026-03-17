"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ZodIssue } from "zod";

import { FORM_STEPS, SERVICES } from "@/config/form.config";
import {
  contactSchema,
  demandePayloadSchema,
  identiteSchema,
  localisationSchema,
  servicesSchema,
  vehiculeSchema,
  computeServicesTotal,
} from "@/lib/validation";

import styles from "./wizard.module.css";

type FormData = {
  identite: {
    nom: string;
    postnom: string;
    prenom: string;
  };
  contact: {
    telephone: string;
    email: string;
  };
  localisation: {
    province: string;
    ville: string;
    commune: string;
    quartier: string;
    avenueNumero: string;
    codePostal: string;
  };
  vehicule: {
    genre: "Moto" | "Tricycle" | "Voiture legere" | "Jeep/4x4" | "Camion" | "Bus" | "";
    marque: string;
    modele: string;
    vin: string;
    plaqueActuelle: string;
    couleur: string;
    chevauxFiscaux: string;
    anneeFabrication: string;
    anneeMiseEnCirculation: string;
    carburant: "Essence" | "Diesel" | "Hybride" | "Electrique" | "";
  };
  services: string[];
};

type SubmittedDemande = {
  id: string;
  date: string;
  total: number;
  data: FormData;
};

const STORAGE_KEY = "demande-documents-wizard-v2";

const initialFormData: FormData = {
  identite: {
    nom: "",
    postnom: "",
    prenom: "",
  },
  contact: {
    telephone: "",
    email: "",
  },
  localisation: {
    province: "",
    ville: "",
    commune: "",
    quartier: "",
    avenueNumero: "",
    codePostal: "",
  },
  vehicule: {
    genre: "",
    marque: "",
    modele: "",
    vin: "",
    plaqueActuelle: "",
    couleur: "",
    chevauxFiscaux: "",
    anneeFabrication: "",
    anneeMiseEnCirculation: "",
    carburant: "",
  },
  services: [],
};

const mapIssues = (issues: ZodIssue[], prefix = "") => {
  const mappedErrors: Record<string, string> = {};
  issues.forEach((issue) => {
    const key = `${prefix}${issue.path.join(".")}`.replace(/\.$/, "");
    if (!mappedErrors[key]) {
      mappedErrors[key] = issue.message;
    }
  });
  return mappedErrors;
};

const getStepFromErrorKey = (key: string) => {
  if (key.startsWith("identite.")) return 0;
  if (key.startsWith("contact.")) return 1;
  if (key.startsWith("localisation.")) return 2;
  if (key.startsWith("vehicule.")) return 3;
  if (key.startsWith("services")) return 4;
  return 0;
};

const genreOptions: Array<FormData["vehicule"]["genre"]> = [
  "Moto",
  "Tricycle",
  "Voiture legere",
  "Jeep/4x4",
  "Camion",
  "Bus",
];

export function FormWizard() {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isRestored, setIsRestored] = useState(false);
  const [submittedDemande, setSubmittedDemande] = useState<SubmittedDemande | null>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  const stepTitleRef = useRef<HTMLHeadingElement>(null);
  const successModalRef = useRef<HTMLDivElement>(null);

  const total = useMemo(() => computeServicesTotal(formData.services), [formData.services]);
  const totalSteps = FORM_STEPS.length;

  useEffect(() => {
    stepTitleRef.current?.focus();
  }, [step]);

  useEffect(() => {
    if (!isSuccessModalOpen) return;
    successModalRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsSuccessModalOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isSuccessModalOpen]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setIsRestored(true);
        return;
      }
      const parsed = JSON.parse(raw) as Partial<FormData>;
      setFormData((previous) => ({
        ...previous,
        ...parsed,
        identite: { ...previous.identite, ...parsed.identite },
        contact: { ...previous.contact, ...parsed.contact },
        localisation: { ...previous.localisation, ...parsed.localisation },
        vehicule: { ...previous.vehicule, ...parsed.vehicule },
        services: Array.isArray(parsed.services) ? parsed.services.filter((service) => typeof service === "string") : [],
      }));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsRestored(true);
    }
  }, []);

  useEffect(() => {
    if (!isRestored) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
  }, [formData, isRestored]);

  const setFieldError = (field: string) => errors[field];

  const updateField = <Section extends keyof Omit<FormData, "services">>(
    section: Section,
    field: keyof FormData[Section],
    value: string,
  ) => {
    setFormData((previous) => ({
      ...previous,
      [section]: {
        ...previous[section],
        [field]: value,
      },
    }));
    setErrors((previous) => {
      const next = { ...previous };
      delete next[`${String(section)}.${String(field)}`];
      return next;
    });
  };

  const toggleService = (serviceId: string) => {
    setFormData((previous) => {
      const exists = previous.services.includes(serviceId);
      const services = exists ? previous.services.filter((service) => service !== serviceId) : [...previous.services, serviceId];
      return { ...previous, services };
    });
    setErrors((previous) => {
      const next = { ...previous };
      delete next.services;
      return next;
    });
  };

  const validateCurrentStep = () => {
    if (step === 0) {
      const result = identiteSchema.safeParse(formData.identite);
      if (!result.success) {
        setErrors((previous) => ({ ...previous, ...mapIssues(result.error.issues, "identite.") }));
        return false;
      }
      return true;
    }
    if (step === 1) {
      const result = contactSchema.safeParse(formData.contact);
      if (!result.success) {
        setErrors((previous) => ({ ...previous, ...mapIssues(result.error.issues, "contact.") }));
        return false;
      }
      return true;
    }
    if (step === 2) {
      const result = localisationSchema.safeParse(formData.localisation);
      if (!result.success) {
        setErrors((previous) => ({ ...previous, ...mapIssues(result.error.issues, "localisation.") }));
        return false;
      }
      return true;
    }
    if (step === 3) {
      const result = vehiculeSchema.safeParse(formData.vehicule);
      if (!result.success) {
        setErrors((previous) => ({ ...previous, ...mapIssues(result.error.issues, "vehicule.") }));
        return false;
      }
      return true;
    }
    if (step === 4) {
      const result = servicesSchema.safeParse(formData.services);
      if (!result.success) {
        setErrors((previous) => ({ ...previous, ...mapIssues(result.error.issues, "services") }));
        return false;
      }
      return true;
    }
    return true;
  };

  const onNext = () => {
    setSubmitError(null);
    if (!validateCurrentStep()) return;
    setStep((previous) => Math.min(previous + 1, totalSteps - 1));
  };

  const onPrevious = () => {
    setSubmitError(null);
    setStep((previous) => Math.max(previous - 1, 0));
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setErrors({});
    setStep(0);
    setSubmitError(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError(null);

    const payload = {
      ...formData,
      total,
    };

    const parsed = demandePayloadSchema.safeParse(payload);
    if (!parsed.success) {
      const mappedErrors = mapIssues(parsed.error.issues);
      setErrors(mappedErrors);
      const firstError = Object.keys(mappedErrors)[0];
      if (firstError) setStep(getStepFromErrorKey(firstError));
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch("/api/demandes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as {
        success?: boolean;
        message?: string;
        id?: string;
        total?: number;
        errors?: Array<{ field: string; message: string }>;
      };

      if (!response.ok || !data.success) {
        if (Array.isArray(data.errors)) {
          const apiErrors: Record<string, string> = {};
          data.errors.forEach((error) => {
            if (error.field && !apiErrors[error.field]) apiErrors[error.field] = error.message;
          });
          setErrors((previous) => ({ ...previous, ...apiErrors }));
        }
        setSubmitError(data.message ?? "Une erreur est survenue pendant la soumission.");
        return;
      }

      const serveurTotal = typeof data.total === "number" ? data.total : total;
      setSubmittedDemande({
        id: data.id ?? "N/A",
        date: new Date().toISOString(),
        total: serveurTotal,
        data: { ...formData, services: [...formData.services] },
      });
      setIsSuccessModalOpen(true);
      resetForm();
    } catch {
      setSubmitError("Impossible d'envoyer la demande pour le moment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <form className={styles.formCard} onSubmit={onSubmit} noValidate>
        <div className={styles.progressRow}>
          <p className={styles.stepText}>
            Etape {step + 1} sur {totalSteps}
          </p>
          <div className={styles.progressBar} aria-hidden="true">
            <span style={{ width: `${((step + 1) / totalSteps) * 100}%` }} />
          </div>
        </div>

        <h2 className={styles.stepTitle} ref={stepTitleRef} tabIndex={-1}>
          {FORM_STEPS[step]}
        </h2>

        <div className={styles.stepFrame} key={FORM_STEPS[step]}>
          {step === 0 && (
            <div className={styles.grid}>
              <div className={styles.field}>
                <label htmlFor="nom">Nom</label>
                <input id="nom" value={formData.identite.nom} onChange={(event) => updateField("identite", "nom", event.target.value)} />
                {setFieldError("identite.nom") && <p className={styles.error}>{setFieldError("identite.nom")}</p>}
              </div>
              <div className={styles.field}>
                <label htmlFor="postnom">Postnom</label>
                <input id="postnom" value={formData.identite.postnom} onChange={(event) => updateField("identite", "postnom", event.target.value)} />
                {setFieldError("identite.postnom") && <p className={styles.error}>{setFieldError("identite.postnom")}</p>}
              </div>
              <div className={styles.field}>
                <label htmlFor="prenom">Prenom</label>
                <input id="prenom" value={formData.identite.prenom} onChange={(event) => updateField("identite", "prenom", event.target.value)} />
                {setFieldError("identite.prenom") && <p className={styles.error}>{setFieldError("identite.prenom")}</p>}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className={styles.grid}>
              <div className={styles.field}>
                <label htmlFor="telephone">Numero de Telephone</label>
                <input id="telephone" type="tel" value={formData.contact.telephone} onChange={(event) => updateField("contact", "telephone", event.target.value)} />
                {setFieldError("contact.telephone") && <p className={styles.error}>{setFieldError("contact.telephone")}</p>}
              </div>
              <div className={styles.field}>
                <label htmlFor="email">Adresse E-mail (Facultatif)</label>
                <input id="email" type="email" value={formData.contact.email} onChange={(event) => updateField("contact", "email", event.target.value)} />
                {setFieldError("contact.email") && <p className={styles.error}>{setFieldError("contact.email")}</p>}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className={styles.grid}>
              <div className={styles.field}>
                <label htmlFor="province">Province</label>
                <input id="province" value={formData.localisation.province} onChange={(event) => updateField("localisation", "province", event.target.value)} />
                {setFieldError("localisation.province") && <p className={styles.error}>{setFieldError("localisation.province")}</p>}
              </div>
              <div className={styles.field}>
                <label htmlFor="ville">Ville / Ville-Province</label>
                <input id="ville" value={formData.localisation.ville} onChange={(event) => updateField("localisation", "ville", event.target.value)} />
                {setFieldError("localisation.ville") && <p className={styles.error}>{setFieldError("localisation.ville")}</p>}
              </div>
              <div className={styles.field}>
                <label htmlFor="commune">Commune</label>
                <input id="commune" value={formData.localisation.commune} onChange={(event) => updateField("localisation", "commune", event.target.value)} />
                {setFieldError("localisation.commune") && <p className={styles.error}>{setFieldError("localisation.commune")}</p>}
              </div>
              <div className={styles.field}>
                <label htmlFor="quartier">Quartier</label>
                <input id="quartier" value={formData.localisation.quartier} onChange={(event) => updateField("localisation", "quartier", event.target.value)} />
                {setFieldError("localisation.quartier") && <p className={styles.error}>{setFieldError("localisation.quartier")}</p>}
              </div>
              <div className={styles.fieldWide}>
                <label htmlFor="avenueNumero">Avenue et Numero</label>
                <input
                  id="avenueNumero"
                  value={formData.localisation.avenueNumero}
                  onChange={(event) => updateField("localisation", "avenueNumero", event.target.value)}
                />
                {setFieldError("localisation.avenueNumero") && <p className={styles.error}>{setFieldError("localisation.avenueNumero")}</p>}
              </div>
              <div className={styles.fieldWide}>
                <label htmlFor="codePostal">Code Postal (Facultatif)</label>
                <input
                  id="codePostal"
                  value={formData.localisation.codePostal}
                  onChange={(event) => updateField("localisation", "codePostal", event.target.value)}
                />
                {setFieldError("localisation.codePostal") && <p className={styles.error}>{setFieldError("localisation.codePostal")}</p>}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className={styles.grid}>
              <div className={styles.field}>
                <label htmlFor="genre">Genre de vehicule</label>
                <select id="genre" value={formData.vehicule.genre} onChange={(event) => updateField("vehicule", "genre", event.target.value)}>
                  <option value="">Selectionner</option>
                  {genreOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {setFieldError("vehicule.genre") && <p className={styles.error}>{setFieldError("vehicule.genre")}</p>}
              </div>
              <div className={styles.field}>
                <label htmlFor="marque">Marque</label>
                <input id="marque" value={formData.vehicule.marque} onChange={(event) => updateField("vehicule", "marque", event.target.value)} />
                {setFieldError("vehicule.marque") && <p className={styles.error}>{setFieldError("vehicule.marque")}</p>}
              </div>
              <div className={styles.fieldWide}>
                <label htmlFor="modele">Modele / Type</label>
                <input id="modele" value={formData.vehicule.modele} onChange={(event) => updateField("vehicule", "modele", event.target.value)} />
                {setFieldError("vehicule.modele") && <p className={styles.error}>{setFieldError("vehicule.modele")}</p>}
              </div>
              <div className={styles.fieldWide}>
                <label htmlFor="vin">Numero de Chassis (VIN)</label>
                <input id="vin" maxLength={17} value={formData.vehicule.vin} onChange={(event) => updateField("vehicule", "vin", event.target.value.toUpperCase())} />
                {setFieldError("vehicule.vin") && <p className={styles.error}>{setFieldError("vehicule.vin")}</p>}
              </div>
              <div className={styles.field}>
                <label htmlFor="plaqueActuelle">Numero de Plaque actuel (si deja immatricule)</label>
                <input
                  id="plaqueActuelle"
                  value={formData.vehicule.plaqueActuelle}
                  onChange={(event) => updateField("vehicule", "plaqueActuelle", event.target.value.toUpperCase())}
                />
                {setFieldError("vehicule.plaqueActuelle") && <p className={styles.error}>{setFieldError("vehicule.plaqueActuelle")}</p>}
              </div>
              <div className={styles.field}>
                <label htmlFor="couleur">Couleur dominante</label>
                <input id="couleur" value={formData.vehicule.couleur} onChange={(event) => updateField("vehicule", "couleur", event.target.value)} />
                {setFieldError("vehicule.couleur") && <p className={styles.error}>{setFieldError("vehicule.couleur")}</p>}
              </div>
              <div className={styles.field}>
                <label htmlFor="chevauxFiscaux">Nombre de chevaux (puissance fiscale)</label>
                <input
                  id="chevauxFiscaux"
                  type="number"
                  min={1}
                  value={formData.vehicule.chevauxFiscaux}
                  onChange={(event) => updateField("vehicule", "chevauxFiscaux", event.target.value)}
                />
                {setFieldError("vehicule.chevauxFiscaux") && <p className={styles.error}>{setFieldError("vehicule.chevauxFiscaux")}</p>}
              </div>
              <div className={styles.field}>
                <label htmlFor="anneeFabrication">Annee de fabrication</label>
                <input
                  id="anneeFabrication"
                  type="number"
                  min={1950}
                  value={formData.vehicule.anneeFabrication}
                  onChange={(event) => updateField("vehicule", "anneeFabrication", event.target.value)}
                />
                {setFieldError("vehicule.anneeFabrication") && <p className={styles.error}>{setFieldError("vehicule.anneeFabrication")}</p>}
              </div>
              <div className={styles.field}>
                <label htmlFor="anneeMiseEnCirculation">Annee de premiere mise en circulation</label>
                <input
                  id="anneeMiseEnCirculation"
                  type="number"
                  min={1950}
                  value={formData.vehicule.anneeMiseEnCirculation}
                  onChange={(event) => updateField("vehicule", "anneeMiseEnCirculation", event.target.value)}
                />
                {setFieldError("vehicule.anneeMiseEnCirculation") && <p className={styles.error}>{setFieldError("vehicule.anneeMiseEnCirculation")}</p>}
              </div>
              <div className={styles.fieldWide}>
                <label htmlFor="carburant">Type de Carburant</label>
                <select id="carburant" value={formData.vehicule.carburant} onChange={(event) => updateField("vehicule", "carburant", event.target.value)}>
                  <option value="">Selectionner</option>
                  <option value="Essence">Essence</option>
                  <option value="Diesel">Diesel</option>
                  <option value="Hybride">Hybride</option>
                  <option value="Electrique">Electrique</option>
                </select>
                {setFieldError("vehicule.carburant") && <p className={styles.error}>{setFieldError("vehicule.carburant")}</p>}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className={styles.grid}>
              <fieldset className={styles.servicesFieldset}>
                <legend>Checklist des documents souhaites</legend>
                <div className={styles.servicesList}>
                  {SERVICES.map((service) => {
                    const checked = formData.services.includes(service.id);
                    return (
                      <label key={service.id} className={styles.serviceOption}>
                        <input type="checkbox" checked={checked} onChange={() => toggleService(service.id)} />
                        <span>{service.label}</span>
                        <strong>{service.prix} USD</strong>
                      </label>
                    );
                  })}
                </div>
                {setFieldError("services") && <p className={styles.error}>{setFieldError("services")}</p>}
                <p className={styles.total}>Total dynamique: {total} USD</p>
              </fieldset>
              <section className={styles.review}>
                <h3>Resume avant soumission</h3>
                <ul>
                  <li>
                    <span>Demandeur:</span> {formData.identite.nom} {formData.identite.postnom} {formData.identite.prenom}
                  </li>
                  <li>
                    <span>Contact:</span> {formData.contact.telephone}
                  </li>
                  <li>
                    <span>Localisation:</span> {formData.localisation.commune}, {formData.localisation.ville}, {formData.localisation.province}
                  </li>
                  <li>
                    <span>Vehicule:</span> {formData.vehicule.genre} - {formData.vehicule.marque} {formData.vehicule.modele}
                  </li>
                  <li>
                    <span>Total:</span> {total} USD
                  </li>
                </ul>
              </section>
            </div>
          )}
        </div>

        {submitError && (
          <p className={styles.submitError} role="alert">
            {submitError}
          </p>
        )}

        <div className={styles.actions}>
          <button type="button" onClick={onPrevious} disabled={step === 0 || isSubmitting} className={styles.secondaryBtn}>
            Retour
          </button>
          {step < totalSteps - 1 ? (
            <button type="button" onClick={onNext} disabled={isSubmitting} className={styles.primaryBtn}>
              Suivant
            </button>
          ) : (
            <button type="submit" disabled={isSubmitting} className={styles.primaryBtn}>
              {isSubmitting ? "Soumission..." : "Soumettre l'enquiry"}
            </button>
          )}
        </div>
      </form>

      {isSuccessModalOpen && submittedDemande && (
        <div className={styles.modalOverlay} role="presentation" onClick={() => setIsSuccessModalOpen(false)}>
          <div
            className={styles.modalCard}
            role="dialog"
            aria-modal="true"
            aria-labelledby="success-modal-title"
            tabIndex={-1}
            ref={successModalRef}
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="success-modal-title">Enquiry envoyee avec succes</h3>
            <p className={styles.modalSub}>
              Reference: {submittedDemande.id} | Date: {new Date(submittedDemande.date).toLocaleString("fr-FR")}
            </p>
            <ul className={styles.modalSummary}>
              <li>
                <span>Identite:</span> {submittedDemande.data.identite.nom} {submittedDemande.data.identite.postnom}{" "}
                {submittedDemande.data.identite.prenom}
              </li>
              <li>
                <span>Contact:</span> {submittedDemande.data.contact.telephone} /{" "}
                {submittedDemande.data.contact.email || "Non renseigne"}
              </li>
              <li>
                <span>Localisation:</span> {submittedDemande.data.localisation.avenueNumero}, {submittedDemande.data.localisation.quartier},{" "}
                {submittedDemande.data.localisation.commune}, {submittedDemande.data.localisation.ville}
              </li>
              <li>
                <span>Vehicule:</span> {submittedDemande.data.vehicule.genre}, {submittedDemande.data.vehicule.marque}{" "}
                {submittedDemande.data.vehicule.modele}, VIN {submittedDemande.data.vehicule.vin}
              </li>
              <li>
                <span>Services:</span>{" "}
                {submittedDemande.data.services
                  .map((serviceId) => SERVICES.find((service) => service.id === serviceId)?.label ?? serviceId)
                  .join(", ")}
              </li>
              <li>
                <span>Total:</span> {submittedDemande.total} USD
              </li>
            </ul>
            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryBtn} onClick={() => setIsSuccessModalOpen(false)}>
                Fermer
              </button>
              <button type="button" className={styles.primaryBtn} onClick={() => setIsSuccessModalOpen(false)}>
                Nouvelle enquiry
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
