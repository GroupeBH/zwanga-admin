import type { Metadata } from "next";

import { FormWizard } from "./FormWizard";
import styles from "./wizard.module.css";

export const metadata: Metadata = {
  title: "Document Enquiry",
  description: "Soumettez votre enquiry de documents administratifs en quelques etapes.",
};

export default function DemandeDocumentsPage() {
  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <header className={styles.header}>
          <p className={styles.kicker}>Enquiry</p>
          <h1>Document Enquiry</h1>
          <p className={styles.subtitle}>
            Remplissez ce formulaire multi-etapes pour soumettre votre enquiry administrative.
          </p>
        </header>
        <FormWizard />
      </section>
    </main>
  );
}
