"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ZodIssue } from "zod";

import { FORM_STEPS, SERVICES } from "@/config/form.config";
import { computeServicesTotal, contactSchema, demandePayloadSchema, identiteSchema, servicesSchema, vehiculeSchema } from "@/lib/validation";

import styles from "./wizard.module.css";

type FormData = {
  identite: {
    nomComplet: string;
  };
  contact: {
    telephone: string;
  };
  vehicule: {
    marqueComplete: string;
    plaqueImmatriculation: string;
  };
  services: string[];
};

type SubmittedDemande = {
  id: string;
  date: string;
  total: number;
  data: FormData;
};

const STORAGE_KEY = "demande-documents-wizard-v3";

const initialFormData: FormData = {
  identite: {
    nomComplet: "",
  },
  contact: {
    telephone: "",
  },
  vehicule: {
    marqueComplete: "",
    plaqueImmatriculation: "",
  },
  services: [],
};

const mapIssues = (issues: ZodIssue[], prefix = "") => {
  const mappedErrors: Record<string, string> = {};
  issues.forEach((issue) => {
    const key = `${prefix}${issue.path.join(".")}`.replace(/\.$/, "");
    if (!mappedErrors[key]) mappedErrors[key] = issue.message;
  });
  return mappedErrors;
};

const getStepFromErrorKey = (key: string) => {
  if (key.startsWith("services")) return 1;
  return 0;
};

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
      const step0Schema = identiteSchema.and(contactSchema).and(vehiculeSchema);
      const result = step0Schema.safeParse({
        ...formData.identite,
        ...formData.contact,
        ...formData.vehicule,
      });
      if (!result.success) {
        setErrors((previous) => ({ ...previous, ...mapIssues(result.error.issues) }));
        return false;
      }
      return true;
    }

    if (step === 1) {
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
              <div className={styles.fieldWide}>
                <label htmlFor="nomComplet">Nom complet</label>
                <input id="nomComplet" value={formData.identite.nomComplet} onChange={(event) => updateField("identite", "nomComplet", event.target.value)} />
                {setFieldError("nomComplet") && <p className={styles.error}>{setFieldError("nomComplet")}</p>}
              </div>
              <div className={styles.field}>
                <label htmlFor="telephone">Telephone</label>
                <input id="telephone" type="tel" value={formData.contact.telephone} onChange={(event) => updateField("contact", "telephone", event.target.value)} />
                {setFieldError("telephone") && <p className={styles.error}>{setFieldError("telephone")}</p>}
              </div>
              <div className={styles.field}>
                <label htmlFor="marqueComplete">Marque complete du vehicule</label>
                <input
                  id="marqueComplete"
                  value={formData.vehicule.marqueComplete}
                  onChange={(event) => updateField("vehicule", "marqueComplete", event.target.value)}
                />
                {setFieldError("marqueComplete") && <p className={styles.error}>{setFieldError("marqueComplete")}</p>}
              </div>
              <div className={styles.fieldWide}>
                <label htmlFor="plaqueImmatriculation">Numero de plaque d'immatriculation</label>
                <input
                  id="plaqueImmatriculation"
                  value={formData.vehicule.plaqueImmatriculation}
                  onChange={(event) => updateField("vehicule", "plaqueImmatriculation", event.target.value.toUpperCase())}
                />
                {setFieldError("plaqueImmatriculation") && <p className={styles.error}>{setFieldError("plaqueImmatriculation")}</p>}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className={styles.grid}>
              <fieldset className={styles.servicesFieldset}>
                <legend>Liste des documents souhaites</legend>
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
                <p className={styles.totalNotice}>
                  Le total affiche est provisoire, le montant final sera fixe apres analyse et traitement de votre demande
                </p>
              </fieldset>
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
              {isSubmitting ? "Soumission..." : "Soumettre la demande"}
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
            <h3 id="success-modal-title">Demande envoyee avec succes</h3>
            <p className={styles.modalSub}>
              Reference: {submittedDemande.id} | Date: {new Date(submittedDemande.date).toLocaleString("fr-FR")}
            </p>
            <ul className={styles.modalSummary}>
              <li>
                <span>Nom complet:</span> {submittedDemande.data.identite.nomComplet}
              </li>
              <li>
                <span>Telephone:</span> {submittedDemande.data.contact.telephone}
              </li>
              <li>
                <span>Vehicule:</span> {submittedDemande.data.vehicule.marqueComplete} - {submittedDemande.data.vehicule.plaqueImmatriculation}
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
                Nouvelle demande
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

