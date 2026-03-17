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
          <p className={styles.kicker}>Enquiry</p>
          <h1>Document Enquiry</h1>
          <p className={styles.subtitle}>Version courte de la page de soumission.</p>
        </header>
        <FormWizard />
      </section>
    </main>
  );
}

