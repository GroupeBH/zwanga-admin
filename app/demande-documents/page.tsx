import type { Metadata } from "next";

import { FormWizard } from "./FormWizard";
import styles from "./wizard.module.css";

export const metadata: Metadata = {
  title: "Zwanga Services — Démarches et solutions professionnelles",
  description: "Déposez une demande d’accompagnement pour votre activité professionnelle.",
};

export default function DemandeDocumentsPage() {
  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <header className={styles.header}>
          <p className={styles.kicker}>Zwanga Services</p>
          <h1>Vos démarches, accompagnées.</h1>
          <p className={styles.subtitle}>
            Décrivez votre besoin. Notre équipe vous recontactera pour construire une solution adaptée.
          </p>
        </header>
        <FormWizard />
      </section>
    </main>
  );
}
