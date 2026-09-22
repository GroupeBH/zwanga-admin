"use client";

import Link from "next/link";
import { Settings } from "lucide-react";

import { getAdminRoleLabel } from "@/lib/features/auth/adminRoles";
import { useGetCurrentUserProfileQuery } from "@/lib/features/profile/profileApi";

import shared from "../styles/page.module.css";

const statusLabel: Record<string, string> = {
  active: "Actif",
  inactive: "Inactif",
  suspended: "Suspendu",
  pending_kyc: "En vérification",
};

const yesNo = (value: boolean) => (value ? "Oui" : "Non");

export default function ProfilePage() {
  const { data: profile, isLoading } = useGetCurrentUserProfileQuery();

  if (isLoading || !profile) {
    return <p className={shared.mutedText}>Chargement du profil...</p>;
  }

  const { user, stats } = profile;

  return (
    <div className={shared.page}>
      <section className={shared.section}>
        <div className={shared.sectionHeader}>
          <div>
            <h2>Mon profil</h2>
            <p className={shared.filterSummary}>
              {user.firstName} {user.lastName} · {getAdminRoleLabel(user.role)}
            </p>
          </div>
          {/* Le bouton precedent n'ouvrait rien: il renvoie desormais vers
              l'ecran ou le compte se modifie reellement. */}
          <Link href="/settings" className={shared.secondaryButton}>
            <Settings size={16} aria-hidden="true" />
            Gérer mon compte
          </Link>
        </div>

        <div className={shared.grid}>
          <article className={shared.card}>
            <strong>
              {user.firstName} {user.lastName}
            </strong>
            <span className={shared.mutedText}>
              {getAdminRoleLabel(user.role)}
            </span>
            <div>{user.email ?? "Aucune adresse e-mail"}</div>
            <div>{user.phone}</div>
            {user.profilePicture && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.profilePicture}
                alt={`Photo de ${user.firstName} ${user.lastName}`}
                style={{ width: 80, height: 80, borderRadius: "50%", marginTop: 12 }}
              />
            )}
          </article>

          <article className={shared.card}>
            <strong>Mon activité sur l’application</strong>
            <ul className={shared.compactList}>
              <li>{stats.vehicles} véhicule(s) enregistré(s)</li>
              <li>{stats.tripsAsDriver} trajet(s) publié(s) comme conducteur</li>
              <li>{stats.bookingsAsPassenger} réservation(s) faite(s) comme passager</li>
              <li>{stats.bookingsAsDriver} réservation(s) reçue(s) sur mes trajets</li>
              <li>{stats.messagesSent} message(s) envoyé(s)</li>
            </ul>
          </article>

          <article className={shared.card}>
            <strong>État du compte</strong>
            <div>Statut : {statusLabel[user.status] ?? user.status}</div>
            <div>Adresse e-mail vérifiée : {yesNo(user.isEmailVerified)}</div>
            <div>Téléphone vérifié : {yesNo(user.isPhoneVerified)}</div>
            <div>Profil conducteur : {yesNo(user.isDriver)}</div>
            <div>
              Dernière connexion :{" "}
              {user.lastLoginAt
                ? new Intl.DateTimeFormat("fr-CD", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  }).format(new Date(user.lastLoginAt))
                : "Jamais"}
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
