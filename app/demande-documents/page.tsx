import type { Metadata } from "next";

import { FormWizard } from "./FormWizard";
import styles from "./wizard.module.css";

export const metadata: Metadata = {
  title: "Souscription au pack pro pour conducteurs",
  description: "Soumettez votre demande de documents administratifs en quelques etapes.",
};

export default function DemandeDocumentsPage() {
  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <header className={styles.header}>
          <p className={styles.kicker}>Souscription au pack pro pour conducteurs</p>
          <h1>Souscrire au pack pro pour les documents de votre vehicule</h1>
          <p className={styles.subtitle}>
            Remplissez ce formulaire multi-etapes pour soumettre votre demande administrative.
          </p>
        </header>
        <FormWizard />
      </section>
    </main>
  );
}
