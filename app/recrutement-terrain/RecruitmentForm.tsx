"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ZodIssue } from "zod";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ClipboardCheck,
  MapPinned,
  MessageCircle,
  Search,
  Smartphone,
  UserRound,
} from "lucide-react";

import {
  APPAREIL_OPTIONS,
  DEJA_TELECHARGE_OPTIONS,
  PROFIL_UTILISATEUR_OPTIONS,
  RECRUTEMENT_FORM_STEPS,
  SEXE_OPTIONS,
  ZONES_DEPLOIEMENT,
} from "@/config/recrutementTerrain.config";
import { contactSchema, retoursSchema, usageSchema, zonesSchema } from "@/lib/validationRecrutement";

import styles from "./recrutement.module.css";

type FormData = {
  contact: {
    nomComplet: string;
    age: string;
    telephone: string;
    sexe: string;
  };
  usage: {
    appareil: string;
    dejaTelecharge: string;
    profilUtilisateur: string;
  };
  retours: {
    problemesRencontres: string;
    comprehensionProjet: string;
    suggestionsAmelioration: string;
  };
  zonesDeploiement: string[];
};

type SubmittedEntry = {
  id: string;
  date: string;
  data: FormData;
};

const STORAGE_KEY = "recrutement-terrain-wizard-v1";

const initialFormData: FormData = {
  contact: { nomComplet: "", age: "", telephone: "", sexe: "" },
  usage: { appareil: "", dejaTelecharge: "", profilUtilisateur: "" },
  retours: { problemesRencontres: "", comprehensionProjet: "", suggestionsAmelioration: "" },
  zonesDeploiement: [],
};

const STEP_ICONS = [UserRound, Smartphone, MessageCircle, MapPinned, ClipboardCheck];

const mapIssues = (issues: ZodIssue[], prefix = "") => {
  const mappedErrors: Record<string, string> = {};
  issues.forEach((issue) => {
    const key = `${prefix}${issue.path.join(".")}`.replace(/\.$/, "");
    if (!mappedErrors[key]) mappedErrors[key] = issue.message;
  });
  return mappedErrors;
};

const getStepFromErrorKey = (key: string) => {
  if (key.startsWith("contact")) return 0;
  if (key.startsWith("usage")) return 1;
  if (key.startsWith("retours")) return 2;
  if (key.startsWith("zonesDeploiement")) return 3;
  return 0;
};

const labelFor = (options: ReadonlyArray<{ id: string; label: string }>, id: string) =>
  options.find((option) => option.id === id)?.label ?? "—";

interface ChoiceGroupProps {
  legend: string;
  name: string;
  options: ReadonlyArray<{ id: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  columns?: number;
}

function ChoiceGroup({ legend, name, options, value, onChange, error, columns = 2 }: ChoiceGroupProps) {
  return (
    <fieldset className={styles.choiceFieldset}>
      <legend>{legend}</legend>
      <div className={styles.choiceGrid} style={{ "--cols": columns } as React.CSSProperties} role="radiogroup" aria-label={legend}>
        {options.map((option) => {
          const checked = value === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={checked}
              name={name}
              className={`${styles.choiceChip} ${checked ? styles.choiceChipActive : ""}`}
              onClick={() => onChange(option.id)}
            >
              {checked && <CheckCircle2 size={16} aria-hidden="true" className={styles.choiceCheck} />}
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
      {error && <p className={styles.error}>{error}</p>}
    </fieldset>
  );
}

export function RecruitmentForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isRestored, setIsRestored] = useState(false);
  const [submittedEntry, setSubmittedEntry] = useState<SubmittedEntry | null>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [zoneSearch, setZoneSearch] = useState("");

  const stepTitleRef = useRef<HTMLHeadingElement>(null);
  const successModalRef = useRef<HTMLDivElement>(null);

  const totalSteps = RECRUTEMENT_FORM_STEPS.length;

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
        contact: { ...previous.contact, ...parsed.contact },
        usage: { ...previous.usage, ...parsed.usage },
        retours: { ...previous.retours, ...parsed.retours },
        zonesDeploiement: Array.isArray(parsed.zonesDeploiement)
          ? parsed.zonesDeploiement.filter((zone) => typeof zone === "string")
          : [],
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

  const getFieldError = (field: string) => errors[field];

  const updateField = <Section extends keyof Omit<FormData, "zonesDeploiement">>(
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

  const toggleZone = (zoneId: string) => {
    setFormData((previous) => {
      const exists = previous.zonesDeploiement.includes(zoneId);
      const zonesDeploiement = exists
        ? previous.zonesDeploiement.filter((zone) => zone !== zoneId)
        : [...previous.zonesDeploiement, zoneId];
      return { ...previous, zonesDeploiement };
    });
    setErrors((previous) => {
      const next = { ...previous };
      delete next.zonesDeploiement;
      return next;
    });
  };

  const filteredZones = useMemo(() => {
    const query = zoneSearch.trim().toLowerCase();
    if (!query) return ZONES_DEPLOIEMENT;
    return ZONES_DEPLOIEMENT.filter((zone) => zone.label.toLowerCase().includes(query));
  }, [zoneSearch]);

  const validateCurrentStep = () => {
    if (step === 0) {
      const result = contactSchema.safeParse({
        ...formData.contact,
        age: formData.contact.age,
      });
      if (!result.success) {
        setErrors((previous) => ({ ...previous, ...mapIssues(result.error.issues, "contact.") }));
        return false;
      }
      return true;
    }

    if (step === 1) {
      const result = usageSchema.safeParse(formData.usage);
      if (!result.success) {
        setErrors((previous) => ({ ...previous, ...mapIssues(result.error.issues, "usage.") }));
        return false;
      }
      return true;
    }

    if (step === 2) {
      const result = retoursSchema.safeParse(formData.retours);
      if (!result.success) {
        setErrors((previous) => ({ ...previous, ...mapIssues(result.error.issues, "retours.") }));
        return false;
      }
      return true;
    }

    if (step === 3) {
      const result = zonesSchema.safeParse(formData.zonesDeploiement);
      if (!result.success) {
        setErrors((previous) => ({ ...previous, ...mapIssues(result.error.issues, "zonesDeploiement") }));
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

  const goToStep = (targetStep: number) => {
    if (targetStep >= step) return;
    setSubmitError(null);
    setStep(targetStep);
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setErrors({});
    setStep(0);
    setSubmitError(null);
    setZoneSearch("");
    localStorage.removeItem(STORAGE_KEY);
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError(null);

    const payload = {
      contact: { ...formData.contact, age: formData.contact.age },
      usage: formData.usage,
      retours: formData.retours,
      zonesDeploiement: formData.zonesDeploiement,
    };

    try {
      setIsSubmitting(true);
      const response = await fetch("/api/recrutement-terrain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as {
        success?: boolean;
        message?: string;
        id?: string;
        errors?: Array<{ field: string; message: string }>;
      };

      if (!response.ok || !data.success) {
        if (Array.isArray(data.errors)) {
          const apiErrors: Record<string, string> = {};
          data.errors.forEach((error) => {
            if (error.field && !apiErrors[error.field]) apiErrors[error.field] = error.message;
          });
          setErrors((previous) => ({ ...previous, ...apiErrors }));
          const firstError = Object.keys(apiErrors)[0];
          if (firstError) setStep(getStepFromErrorKey(firstError));
        }
        setSubmitError(data.message ?? "Une erreur est survenue pendant l'enregistrement.");
        return;
      }

      setSubmittedEntry({
        id: data.id ?? "N/A",
        date: new Date().toISOString(),
        data: { ...formData, zonesDeploiement: [...formData.zonesDeploiement] },
      });
      setIsSuccessModalOpen(true);
      resetForm();
    } catch {
      setSubmitError("Impossible d'enregistrer la candidature pour le moment. Vérifiez votre connexion.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <form className={styles.formCard} onSubmit={onSubmit} noValidate>
        <div className={styles.stepper} role="tablist" aria-label="Étapes du formulaire">
          {RECRUTEMENT_FORM_STEPS.map((label, index) => {
            const Icon = STEP_ICONS[index];
            const isActive = index === step;
            const isDone = index < step;
            return (
              <button
                key={label}
                type="button"
                className={`${styles.stepperItem} ${isActive ? styles.stepperItemActive : ""} ${isDone ? styles.stepperItemDone : ""}`}
                onClick={() => goToStep(index)}
                disabled={index > step}
                aria-current={isActive ? "step" : undefined}
              >
                <span className={styles.stepperIcon}>
                  {isDone ? <CheckCircle2 size={16} aria-hidden="true" /> : <Icon size={16} aria-hidden="true" />}
                </span>
                <span className={styles.stepperLabel}>{label}</span>
              </button>
            );
          })}
        </div>

        <div className={styles.progressBar} aria-hidden="true">
          <span style={{ width: `${((step + 1) / totalSteps) * 100}%` }} />
        </div>
        <p className={styles.stepText}>
          Étape {step + 1} sur {totalSteps}
        </p>

        <h2 className={styles.stepTitle} ref={stepTitleRef} tabIndex={-1}>
          {RECRUTEMENT_FORM_STEPS[step]}
        </h2>

        <div className={styles.stepFrame} key={RECRUTEMENT_FORM_STEPS[step]}>
          {step === 0 && (
            <div className={styles.grid}>
              <div className={styles.fieldWide}>
                <label htmlFor="nomComplet">Votre nom complet</label>
                <input
                  id="nomComplet"
                  autoFocus
                  placeholder="Ex : Jean Mukendi"
                  value={formData.contact.nomComplet}
                  onChange={(event) => updateField("contact", "nomComplet", event.target.value)}
                />
                {getFieldError("contact.nomComplet") && <p className={styles.error}>{getFieldError("contact.nomComplet")}</p>}
              </div>
              <div className={styles.field}>
                <label htmlFor="age">Votre âge</label>
                <input
                  id="age"
                  type="number"
                  inputMode="numeric"
                  min={16}
                  max={100}
                  placeholder="Ex : 28"
                  value={formData.contact.age}
                  onChange={(event) => updateField("contact", "age", event.target.value)}
                />
                {getFieldError("contact.age") && <p className={styles.error}>{getFieldError("contact.age")}</p>}
              </div>
              <div className={styles.field}>
                <label htmlFor="telephone">Votre numéro de téléphone</label>
                <input
                  id="telephone"
                  type="tel"
                  inputMode="tel"
                  placeholder="+243 8xx xxx xxx"
                  value={formData.contact.telephone}
                  onChange={(event) => updateField("contact", "telephone", event.target.value)}
                />
                {getFieldError("contact.telephone") && <p className={styles.error}>{getFieldError("contact.telephone")}</p>}
              </div>
              <div className={styles.fieldWide}>
                <ChoiceGroup
                  legend="Vous êtes"
                  name="sexe"
                  options={SEXE_OPTIONS}
                  value={formData.contact.sexe}
                  onChange={(value) => updateField("contact", "sexe", value)}
                  error={getFieldError("contact.sexe")}
                  columns={2}
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className={styles.grid}>
              <div className={styles.fieldWide}>
                <ChoiceGroup
                  legend="Vous possédez un téléphone..."
                  name="appareil"
                  options={APPAREIL_OPTIONS}
                  value={formData.usage.appareil}
                  onChange={(value) => updateField("usage", "appareil", value)}
                  error={getFieldError("usage.appareil")}
                  columns={3}
                />
              </div>
              <div className={styles.fieldWide}>
                <ChoiceGroup
                  legend="Avez-vous déjà téléchargé Zwanga ?"
                  name="dejaTelecharge"
                  options={DEJA_TELECHARGE_OPTIONS}
                  value={formData.usage.dejaTelecharge}
                  onChange={(value) => updateField("usage", "dejaTelecharge", value)}
                  error={getFieldError("usage.dejaTelecharge")}
                  columns={2}
                />
              </div>
              <div className={styles.fieldWide}>
                <ChoiceGroup
                  legend="Sur Zwanga, vous vous êtes identifié comme..."
                  name="profilUtilisateur"
                  options={PROFIL_UTILISATEUR_OPTIONS}
                  value={formData.usage.profilUtilisateur}
                  onChange={(value) => updateField("usage", "profilUtilisateur", value)}
                  error={getFieldError("usage.profilUtilisateur")}
                  columns={2}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className={styles.grid}>
              <div className={styles.fieldWide}>
                <label htmlFor="comprehensionProjet">Qu&apos;avez-vous compris du projet Zwanga ?</label>
                <textarea
                  id="comprehensionProjet"
                  rows={3}
                  autoFocus
                  placeholder="Résumez en quelques mots ce que vous avez compris de l'application..."
                  value={formData.retours.comprehensionProjet}
                  onChange={(event) => updateField("retours", "comprehensionProjet", event.target.value)}
                />
                {getFieldError("retours.comprehensionProjet") && (
                  <p className={styles.error}>{getFieldError("retours.comprehensionProjet")}</p>
                )}
              </div>
              <div className={styles.fieldWide}>
                <label htmlFor="problemesRencontres">
                  Quels problèmes avez-vous rencontrés ? <span className={styles.optionalTag}>Optionnel</span>
                </label>
                <textarea
                  id="problemesRencontres"
                  rows={3}
                  placeholder="Ex : Difficulté à trouver un conducteur, bug au paiement... (laissez vide si aucun)"
                  value={formData.retours.problemesRencontres}
                  onChange={(event) => updateField("retours", "problemesRencontres", event.target.value)}
                />
                {getFieldError("retours.problemesRencontres") && (
                  <p className={styles.error}>{getFieldError("retours.problemesRencontres")}</p>
                )}
              </div>
              <div className={styles.fieldWide}>
                <label htmlFor="suggestionsAmelioration">
                  Selon vous, qu&apos;est-ce qui pourrait améliorer l&apos;application ?{" "}
                  <span className={styles.optionalTag}>Optionnel</span>
                </label>
                <textarea
                  id="suggestionsAmelioration"
                  rows={3}
                  placeholder="Suggestions, idées, fonctionnalités souhaitées..."
                  value={formData.retours.suggestionsAmelioration}
                  onChange={(event) => updateField("retours", "suggestionsAmelioration", event.target.value)}
                />
                {getFieldError("retours.suggestionsAmelioration") && (
                  <p className={styles.error}>{getFieldError("retours.suggestionsAmelioration")}</p>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className={styles.grid}>
              <fieldset className={`${styles.zonesFieldset} ${styles.fieldWide}`}>
                <legend>Zone(s) de déploiement la mieux adaptée à votre localisation</legend>
                <p className={styles.zonesHelp}>
                  Selon votre lieu de résidence, choisissez la ou les zones où il vous serait le plus facile
                  d&apos;exercer en tant qu&apos;agent commercial.
                </p>
                <div className={styles.zoneSearch}>
                  <Search size={16} aria-hidden="true" />
                  <input
                    type="text"
                    placeholder="Rechercher une zone..."
                    value={zoneSearch}
                    onChange={(event) => setZoneSearch(event.target.value)}
                    aria-label="Rechercher une zone de déploiement"
                  />
                </div>
                <div className={styles.zonesGrid}>
                  {filteredZones.map((zone) => {
                    const checked = formData.zonesDeploiement.includes(zone.id);
                    return (
                      <button
                        key={zone.id}
                        type="button"
                        className={`${styles.zoneChip} ${checked ? styles.zoneChipActive : ""}`}
                        aria-pressed={checked}
                        onClick={() => toggleZone(zone.id)}
                      >
                        {checked && <CheckCircle2 size={14} aria-hidden="true" />}
                        <span>{zone.label}</span>
                      </button>
                    );
                  })}
                  {filteredZones.length === 0 && <p className={styles.zonesEmpty}>Aucune zone ne correspond à la recherche.</p>}
                </div>
                <p className={styles.zonesCount}>
                  {formData.zonesDeploiement.length} zone(s) sélectionnée(s)
                </p>
                {getFieldError("zonesDeploiement") && <p className={styles.error}>{getFieldError("zonesDeploiement")}</p>}
              </fieldset>
            </div>
          )}

          {step === 4 && (
            <div className={styles.review}>
              <h3>Vérifiez vos informations avant l&apos;envoi</h3>
              <ul>
                <li>
                  <span>Nom complet :</span> {formData.contact.nomComplet || "—"}
                </li>
                <li>
                  <span>Âge :</span> {formData.contact.age || "—"} ans
                </li>
                <li>
                  <span>Téléphone :</span> {formData.contact.telephone || "—"}
                </li>
                <li>
                  <span>Sexe :</span> {labelFor(SEXE_OPTIONS, formData.contact.sexe)}
                </li>
                <li>
                  <span>Type de téléphone :</span> {labelFor(APPAREIL_OPTIONS, formData.usage.appareil)}
                </li>
                <li>
                  <span>Déjà téléchargé Zwanga :</span> {labelFor(DEJA_TELECHARGE_OPTIONS, formData.usage.dejaTelecharge)}
                </li>
                <li>
                  <span>Profil :</span> {labelFor(PROFIL_UTILISATEUR_OPTIONS, formData.usage.profilUtilisateur)}
                </li>
                <li>
                  <span>Compréhension du projet :</span> {formData.retours.comprehensionProjet || "—"}
                </li>
                <li>
                  <span>Problèmes rencontrés :</span> {formData.retours.problemesRencontres || "Aucun"}
                </li>
                <li>
                  <span>Suggestions :</span> {formData.retours.suggestionsAmelioration || "Aucune"}
                </li>
                <li>
                  <span>Zones de déploiement :</span>{" "}
                  {formData.zonesDeploiement.map((zoneId) => labelFor(ZONES_DEPLOIEMENT, zoneId)).join(", ") || "—"}
                </li>
              </ul>
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
              {isSubmitting ? "Enregistrement..." : "Envoyer la candidature"}
            </button>
          )}
        </div>
      </form>

      {isSuccessModalOpen && submittedEntry && (
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
            <div className={styles.modalIcon}>
              <CheckCircle2 size={32} aria-hidden="true" />
            </div>
            <h3 id="success-modal-title">Votre candidature a bien été enregistrée</h3>
            <p className={styles.modalSub}>
              Référence : {submittedEntry.id} · {new Date(submittedEntry.date).toLocaleString("fr-FR")}
            </p>
            <ul className={styles.modalSummary}>
              <li>
                <span>Votre nom :</span> {submittedEntry.data.contact.nomComplet}
              </li>
              <li>
                <span>Votre téléphone :</span> {submittedEntry.data.contact.telephone}
              </li>
              <li>
                <span>Zones :</span>{" "}
                {submittedEntry.data.zonesDeploiement.map((zoneId) => labelFor(ZONES_DEPLOIEMENT, zoneId)).join(", ")}
              </li>
            </ul>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => {
                  setIsSuccessModalOpen(false);
                  router.push("/");
                }}
              >
                Terminer
              </button>
              <button type="button" className={styles.primaryBtn} onClick={() => setIsSuccessModalOpen(false)}>
                Ajouter une autre candidature
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
