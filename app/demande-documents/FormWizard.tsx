"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ZodIssue } from "zod";

import { FORM_STEPS, SERVICES } from "@/config/form.config";
import {
  adresseSchema,
  computeServicesTotal,
  contactSchema,
  demandePayloadSchema,
  identiteSchema,
  servicesSchema,
  vehiculeSchema,
} from "@/lib/validation";

import styles from "./wizard.module.css";

type FormData = {
  identite: {
    prenom: string;
    nom: string;
    dateNaissance: string;
  };
  contact: {
    email: string;
    telephone: string;
  };
  adresse: {
    ligne1: string;
    ville: string;
    commune: string;
    codePostal: string;
  };
  vehicule: {
    marque: string;
    modele: string;
    immatriculation: string;
  };
  services: string[];
};

type SubmittedDemande = {
  id: string;
  date: string;
  data: FormData;
  total: number;
};

const STORAGE_KEY = "demande-documents-wizard-v1";

const initialFormData: FormData = {
  identite: {
    prenom: "",
    nom: "",
    dateNaissance: "",
  },
  contact: {
    email: "",
    telephone: "",
  },
  adresse: {
    ligne1: "",
    ville: "",
    commune: "",
    codePostal: "",
  },
  vehicule: {
    marque: "",
    modele: "",
    immatriculation: "",
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
  if (key.startsWith("adresse.")) return 2;
  if (key.startsWith("vehicule.")) return 3;
  if (key.startsWith("services")) return 4;
  return 0;
};

export function FormWizard() {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedDemande, setSubmittedDemande] = useState<SubmittedDemande | null>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isRestored, setIsRestored] = useState(false);
  const stepTitleRef = useRef<HTMLHeadingElement>(null);
  const successModalRef = useRef<HTMLDivElement>(null);
  const birthDateInputRef = useRef<HTMLInputElement>(null);

  const total = useMemo(() => computeServicesTotal(formData.services), [formData.services]);
  const totalSteps = FORM_STEPS.length;

  useEffect(() => {
    stepTitleRef.current?.focus();
  }, [step]);

  useEffect(() => {
    if (!isSuccessModalOpen) return;

    successModalRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsSuccessModalOpen(false);
      }
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
        adresse: { ...previous.adresse, ...parsed.adresse },
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
      const services = exists
        ? previous.services.filter((service) => service !== serviceId)
        : [...previous.services, serviceId];
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
      const result = adresseSchema.safeParse(formData.adresse);
      if (!result.success) {
        setErrors((previous) => ({ ...previous, ...mapIssues(result.error.issues, "adresse.") }));
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

    if (!validateCurrentStep()) {
      return;
    }

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
      if (firstError) {
        setStep(getStepFromErrorKey(firstError));
      }
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch("/api/demandes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
            if (error.field && !apiErrors[error.field]) {
              apiErrors[error.field] = error.message;
            }
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
        data: {
          ...formData,
          services: [...formData.services],
        },
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
              <label htmlFor="prenom">Prenom</label>
              <input
                id="prenom"
                type="text"
                value={formData.identite.prenom}
                onChange={(event) => updateField("identite", "prenom", event.target.value)}
                aria-invalid={Boolean(setFieldError("identite.prenom"))}
                aria-describedby={setFieldError("identite.prenom") ? "error-prenom" : undefined}
              />
              {setFieldError("identite.prenom") && (
                <p id="error-prenom" className={styles.error}>
                  {setFieldError("identite.prenom")}
                </p>
              )}
            </div>
            <div className={styles.field}>
              <label htmlFor="nom">Nom</label>
              <input
                id="nom"
                type="text"
                value={formData.identite.nom}
                onChange={(event) => updateField("identite", "nom", event.target.value)}
                aria-invalid={Boolean(setFieldError("identite.nom"))}
                aria-describedby={setFieldError("identite.nom") ? "error-nom" : undefined}
              />
              {setFieldError("identite.nom") && (
                <p id="error-nom" className={styles.error}>
                  {setFieldError("identite.nom")}
                </p>
              )}
            </div>
            <div className={styles.fieldWide}>
              <label htmlFor="dateNaissance">Date de naissance</label>
              <input
                id="dateNaissance"
                type="date"
                ref={birthDateInputRef}
                value={formData.identite.dateNaissance}
                onChange={(event) => updateField("identite", "dateNaissance", event.target.value)}
                onClick={() => {
                  birthDateInputRef.current?.showPicker?.();
                }}
                onFocus={() => {
                  birthDateInputRef.current?.showPicker?.();
                }}
                aria-invalid={Boolean(setFieldError("identite.dateNaissance"))}
                aria-describedby={setFieldError("identite.dateNaissance") ? "error-dateNaissance" : undefined}
              />
              {setFieldError("identite.dateNaissance") && (
                <p id="error-dateNaissance" className={styles.error}>
                  {setFieldError("identite.dateNaissance")}
                </p>
              )}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className={styles.grid}>
            <div className={styles.fieldWide}>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={formData.contact.email}
                onChange={(event) => updateField("contact", "email", event.target.value)}
                aria-invalid={Boolean(setFieldError("contact.email"))}
                aria-describedby={setFieldError("contact.email") ? "error-email" : undefined}
              />
              {setFieldError("contact.email") && (
                <p id="error-email" className={styles.error}>
                  {setFieldError("contact.email")}
                </p>
              )}
            </div>
            <div className={styles.fieldWide}>
              <label htmlFor="telephone">Telephone</label>
              <input
                id="telephone"
                type="tel"
                value={formData.contact.telephone}
                onChange={(event) => updateField("contact", "telephone", event.target.value)}
                aria-invalid={Boolean(setFieldError("contact.telephone"))}
                aria-describedby={setFieldError("contact.telephone") ? "error-telephone" : undefined}
              />
              {setFieldError("contact.telephone") && (
                <p id="error-telephone" className={styles.error}>
                  {setFieldError("contact.telephone")}
                </p>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className={styles.grid}>
            <div className={styles.fieldWide}>
              <label htmlFor="ligne1">Adresse</label>
              <input
                id="ligne1"
                type="text"
                value={formData.adresse.ligne1}
                onChange={(event) => updateField("adresse", "ligne1", event.target.value)}
                aria-invalid={Boolean(setFieldError("adresse.ligne1"))}
                aria-describedby={setFieldError("adresse.ligne1") ? "error-ligne1" : undefined}
              />
              {setFieldError("adresse.ligne1") && (
                <p id="error-ligne1" className={styles.error}>
                  {setFieldError("adresse.ligne1")}
                </p>
              )}
            </div>
            <div className={styles.field}>
              <label htmlFor="ville">Ville</label>
              <input
                id="ville"
                type="text"
                value={formData.adresse.ville}
                onChange={(event) => updateField("adresse", "ville", event.target.value)}
                aria-invalid={Boolean(setFieldError("adresse.ville"))}
                aria-describedby={setFieldError("adresse.ville") ? "error-ville" : undefined}
              />
              {setFieldError("adresse.ville") && (
                <p id="error-ville" className={styles.error}>
                  {setFieldError("adresse.ville")}
                </p>
              )}
            </div>
            <div className={styles.field}>
              <label htmlFor="commune">Commune (optionnel)</label>
              <input
                id="commune"
                type="text"
                value={formData.adresse.commune}
                onChange={(event) => updateField("adresse", "commune", event.target.value)}
                aria-invalid={Boolean(setFieldError("adresse.commune"))}
                aria-describedby={setFieldError("adresse.commune") ? "error-commune" : undefined}
              />
              {setFieldError("adresse.commune") && (
                <p id="error-commune" className={styles.error}>
                  {setFieldError("adresse.commune")}
                </p>
              )}
            </div>
            <div className={styles.field}>
              <label htmlFor="codePostal">Code postal (optionnel)</label>
              <input
                id="codePostal"
                type="text"
                value={formData.adresse.codePostal}
                onChange={(event) => updateField("adresse", "codePostal", event.target.value)}
                aria-invalid={Boolean(setFieldError("adresse.codePostal"))}
                aria-describedby={setFieldError("adresse.codePostal") ? "error-codePostal" : undefined}
              />
              {setFieldError("adresse.codePostal") && (
                <p id="error-codePostal" className={styles.error}>
                  {setFieldError("adresse.codePostal")}
                </p>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className={styles.grid}>
            <div className={styles.field}>
              <label htmlFor="marque">Marque</label>
              <input
                id="marque"
                type="text"
                value={formData.vehicule.marque}
                onChange={(event) => updateField("vehicule", "marque", event.target.value)}
                aria-invalid={Boolean(setFieldError("vehicule.marque"))}
                aria-describedby={setFieldError("vehicule.marque") ? "error-marque" : undefined}
              />
              {setFieldError("vehicule.marque") && (
                <p id="error-marque" className={styles.error}>
                  {setFieldError("vehicule.marque")}
                </p>
              )}
            </div>
            <div className={styles.field}>
              <label htmlFor="modele">Modele</label>
              <input
                id="modele"
                type="text"
                value={formData.vehicule.modele}
                onChange={(event) => updateField("vehicule", "modele", event.target.value)}
                aria-invalid={Boolean(setFieldError("vehicule.modele"))}
                aria-describedby={setFieldError("vehicule.modele") ? "error-modele" : undefined}
              />
              {setFieldError("vehicule.modele") && (
                <p id="error-modele" className={styles.error}>
                  {setFieldError("vehicule.modele")}
                </p>
              )}
            </div>
            <div className={styles.fieldWide}>
              <label htmlFor="immatriculation">Immatriculation</label>
              <input
                id="immatriculation"
                type="text"
                value={formData.vehicule.immatriculation}
                onChange={(event) => updateField("vehicule", "immatriculation", event.target.value)}
                aria-invalid={Boolean(setFieldError("vehicule.immatriculation"))}
                aria-describedby={setFieldError("vehicule.immatriculation") ? "error-immatriculation" : undefined}
              />
              {setFieldError("vehicule.immatriculation") && (
                <p id="error-immatriculation" className={styles.error}>
                  {setFieldError("vehicule.immatriculation")}
                </p>
              )}
            </div>
          </div>
        )}

        {step === 4 && (
          <fieldset className={styles.servicesFieldset}>
            <legend>Choisissez vos services</legend>
            <div className={styles.servicesList}>
              {SERVICES.map((service) => {
                const checked = formData.services.includes(service.id);
                return (
                  <label key={service.id} className={styles.serviceOption}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleService(service.id)}
                      aria-invalid={Boolean(setFieldError("services"))}
                    />
                    <span>{service.label}</span>
                    <strong>{service.prix} USD</strong>
                  </label>
                );
              })}
            </div>
            {setFieldError("services") && <p className={styles.error}>{setFieldError("services")}</p>}
            <p className={styles.total}>Total dynamique: {total} USD</p>
          </fieldset>
        )}

        {step === 5 && (
          <section className={styles.review}>
            <h3>Revision avant soumission</h3>
            <ul>
              <li>
                <span>Identite:</span> {formData.identite.prenom} {formData.identite.nom} ({formData.identite.dateNaissance})
              </li>
              <li>
                <span>Contact:</span> {formData.contact.email} - {formData.contact.telephone}
              </li>
              <li>
                <span>Adresse:</span> {formData.adresse.ligne1}, {formData.adresse.ville}
              </li>
              <li>
                <span>Vehicule:</span> {formData.vehicule.marque} {formData.vehicule.modele} -{" "}
                {formData.vehicule.immatriculation}
              </li>
              <li>
                <span>Services:</span>{" "}
                {formData.services.length
                  ? formData.services
                      .map((serviceId) => SERVICES.find((service) => service.id === serviceId)?.label ?? serviceId)
                      .join(", ")
                  : "Aucun"}
              </li>
              <li>
                <span>Total:</span> {total} USD
              </li>
            </ul>
          </section>
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
            <p className={styles.modalSub}>Reference: {submittedDemande.id}</p>
            <ul className={styles.modalSummary}>
              <li>
                <span>Nom:</span> {submittedDemande.data.identite.prenom} {submittedDemande.data.identite.nom}
              </li>
              <li>
                <span>Email:</span> {submittedDemande.data.contact.email}
              </li>
              <li>
                <span>Telephone:</span> {submittedDemande.data.contact.telephone}
              </li>
              <li>
                <span>Vehicule:</span> {submittedDemande.data.vehicule.marque} {submittedDemande.data.vehicule.modele}
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
