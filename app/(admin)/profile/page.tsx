"use client";

import { useGetAdminProfileQuery } from "@/lib/features/profile/profileApi";

import shared from "../styles/page.module.css";

export default function ProfilePage() {
  const { data: profile } = useGetAdminProfileQuery();

  if (!profile) {
    return <p>Chargement du profil...</p>;
  }

  return (
    <div className={shared.page}>
      <section className={shared.section}>
        <div className={shared.sectionHeader}>
          <div>
            <h2>Profil administrateur</h2>
            <p style={{ margin: 0, color: "var(--color-text-muted)" }}>
              Dernière connexion {profile.lastConnection}
            </p>
          </div>
          <button type="button" className={shared.primaryButton}>
            Modifier le profil
          </button>
        </div>

        <div className={shared.grid}>
          <article className={shared.card}>
            <strong>{profile.name}</strong>
            <span>{profile.role}</span>
            <div>{profile.email}</div>
            <div>{profile.phone}</div>
          </article>

          <article className={shared.card}>
            <strong>Statistiques</strong>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li>{profile.stats.kycValidated} KYC validés</li>
              <li>{profile.stats.ticketsResolved} tickets résolus</li>
              <li>{profile.stats.actionsThisWeek} actions cette semaine</li>
            </ul>
          </article>

          <article className={shared.card}>
            <strong>Sécurité</strong>
            <div>Niveau {profile.stats.securityLevel}</div>
            <div>2FA: {profile.security.twoFactorEnabled ? "activé" : "désactivé"}</div>
            <div>Dernier mot de passe {profile.security.lastPasswordChange}</div>
          </article>
        </div>
      </section>
    </div>
  );
}

