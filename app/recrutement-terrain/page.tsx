import type { Metadata } from "next";

import { RecruitmentForm } from "./RecruitmentForm";
import styles from "./recrutement.module.css";

export const metadata: Metadata = {
  title: "Formulaire de recrutement - Agent commercial terrain",
  description: "Candidature en ligne pour devenir agent commercial de terrain chez Zwanga.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RecrutementTerrainPage() {
  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <header className={styles.header}>
          <p className={styles.kicker}>Zwanga · Recrutement</p>
          <h1>Devenez agent commercial de terrain Zwanga</h1>
          <p className={styles.subtitle}>
            Vous souhaitez rejoindre l&apos;équipe commerciale terrain de Zwanga ? Remplissez ce formulaire de
            candidature en quelques minutes, vos réponses sont sauvegardées automatiquement.
          </p>
        </header>
        <RecruitmentForm />
      </section>
    </main>
  );
}
