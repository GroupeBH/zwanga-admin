import type { Metadata } from "next";

import { FormWizard } from "@/app/demande-documents/FormWizard";
import styles from "@/app/demande-documents/wizard.module.css";

export const metadata: Metadata = {
  title: "Enquiry",
  description: "Soumettez votre enquiry de documents.",
};

export default function EnquiryPage() {
  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <header className={styles.header}>
          <p className={styles.kicker}>Souscription au pack pro pour conducteurs</p>
          <h1>Souscrire au pack pro pour les documents de votre vehicule</h1>
          <p className={styles.subtitle}> Remplissez ce formulaire multi-etapes pour soumettre votre demande administrative.</p>
        </header>
        <FormWizard />
      </section>
    </main>
  );
}

