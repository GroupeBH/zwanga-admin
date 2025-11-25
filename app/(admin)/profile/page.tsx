"use client";

import { useGetCurrentUserProfileQuery } from "@/lib/features/profile/profileApi";

import shared from "../styles/page.module.css";

export default function ProfilePage() {
  const { data: profile, isLoading } = useGetCurrentUserProfileQuery();

  if (isLoading || !profile) {
    return <p>Chargement du profil...</p>;
  }

  const { user, stats } = profile;

  return (
    <div className={shared.page}>
      <section className={shared.section}>
        <div className={shared.sectionHeader}>
          <div>
            <h2>Profil administrateur</h2>
            <p style={{ margin: 0, color: "var(--color-text-muted)" }}>
              {user.firstName} {user.lastName} • {user.role}
            </p>
          </div>
          <button type="button" className={shared.primaryButton}>
            Modifier le profil
          </button>
        </div>

        <div className={shared.grid}>
          <article className={shared.card}>
            <strong>
              {user.firstName} {user.lastName}
            </strong>
            <span>{user.role}</span>
            <div>{user.email ?? "—"}</div>
            <div>{user.phone}</div>
            {user.profilePicture && (
              <img
                src={user.profilePicture}
                alt="Profile"
                style={{ width: 80, height: 80, borderRadius: "50%", marginTop: 12 }}
              />
            )}
          </article>

          <article className={shared.card}>
            <strong>Statistiques</strong>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li>{stats.vehicles} véhicule(s)</li>
              <li>{stats.tripsAsDriver} trajets comme conducteur</li>
              <li>{stats.bookingsAsPassenger} réservations comme passager</li>
              <li>{stats.bookingsAsDriver} réservations reçues</li>
              <li>{stats.messagesSent} messages envoyés</li>
            </ul>
          </article>

          <article className={shared.card}>
            <strong>Informations</strong>
            <div>Statut: {user.status}</div>
            <div>Email vérifié: {user.isEmailVerified ? "✓" : "✗"}</div>
            <div>Téléphone vérifié: {user.isPhoneVerified ? "✓" : "✗"}</div>
            <div>Conducteur: {user.isDriver ? "Oui" : "Non"}</div>
            <div>
              Dernière connexion:{" "}
              {user.lastLoginAt
                ? new Intl.DateTimeFormat("fr-CD", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  }).format(new Date(user.lastLoginAt))
                : "—"}
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}

