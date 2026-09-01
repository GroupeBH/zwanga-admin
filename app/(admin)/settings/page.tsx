"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { FileText, KeyRound, Shield, ShoppingBag, UserPlus, UsersRound } from "lucide-react";

import { getAdminRoleLabel, isSuperAdminRole } from "@/lib/features/auth/adminRoles";
import { useChangeAdminPasswordMutation } from "@/lib/features/auth/authApi";
import { useGetCurrentUserProfileQuery } from "@/lib/features/profile/profileApi";
import {
  useCreateAdminAccountMutation,
  useGetAdminAccountsQuery,
} from "@/lib/features/users/usersApi";
import { getApiErrorMessage } from "@/lib/utils/apiErrors";

import shared from "../styles/page.module.css";

type NotificationPref = {
  email: boolean;
  sms: boolean;
  push: boolean;
};

const dateFormatter = new Intl.DateTimeFormat("fr-CD", {
  dateStyle: "medium",
  timeStyle: "short",
});

const formatDate = (value?: string | null) => {
  if (!value) {
    return "Jamais";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Date inconnue";
  }

  return dateFormatter.format(date);
};

export default function SettingsPage() {
  const { data: profile, refetch: refetchProfile } = useGetCurrentUserProfileQuery();
  const isSuperAdmin = isSuperAdminRole(profile?.user.role);
  const canManageAdminAccounts =
    isSuperAdmin && !profile?.user.passwordChangeRequired;
  const { data: adminAccounts, error: adminAccountsError, isFetching: isFetchingAdmins } =
    useGetAdminAccountsQuery(
      { page: 1, limit: 50 },
      {
        skip: !canManageAdminAccounts,
      }
    );
  const [changeAdminPassword, { isLoading: isChangingPassword }] =
    useChangeAdminPasswordMutation();
  const [createAdminAccount, { isLoading: isCreatingAdmin }] =
    useCreateAdminAccountMutation();
  const [notifications, setNotifications] = useState<NotificationPref>({
    email: false,
    sms: false,
    push: true,
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [adminForm, setAdminForm] = useState({
    phone: "",
    firstName: "",
    lastName: "",
    defaultPassword: "",
  });
  const [adminMessage, setAdminMessage] = useState<string | null>(null);
  const [adminError, setAdminError] = useState<string | null>(null);

  useEffect(() => {
    // Mock notifications for now - backend doesn't provide this yet
    if (profile) {
      setNotifications({
        email: true,
        sms: false,
        push: true,
      });
    }
  }, [profile]);

  const handleToggle = (key: keyof NotificationPref) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordError(null);
    setPasswordMessage(null);

    const currentPassword = passwordForm.currentPassword.trim();
    const newPassword = passwordForm.newPassword.trim();
    const confirmPassword = passwordForm.confirmPassword.trim();

    if (newPassword.length < 8) {
      setPasswordError("Le nouveau mot de passe doit contenir au moins 8 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("La confirmation ne correspond pas au nouveau mot de passe.");
      return;
    }

    try {
      const response = await changeAdminPassword({
        currentPassword,
        newPassword,
      }).unwrap();
      setPasswordMessage(response.message || "Mot de passe modifie avec succes.");
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      await refetchProfile();
    } catch (error) {
      setPasswordError(
        getApiErrorMessage(error, "Modification du mot de passe impossible.")
      );
    }
  };

  const handleCreateAdminSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAdminError(null);
    setAdminMessage(null);

    const payload = {
      phone: adminForm.phone.trim(),
      firstName: adminForm.firstName.trim(),
      lastName: adminForm.lastName.trim(),
      defaultPassword: adminForm.defaultPassword.trim(),
    };

    if (payload.defaultPassword.length < 8) {
      setAdminError("Le mot de passe temporaire doit contenir au moins 8 caracteres.");
      return;
    }

    try {
      const createdAdmin = await createAdminAccount(payload).unwrap();
      setAdminMessage(
        `Compte admin cree ou promu pour ${createdAdmin.firstName} ${createdAdmin.lastName}. Il devra changer son mot de passe a la premiere connexion.`
      );
      setAdminForm({
        phone: "",
        firstName: "",
        lastName: "",
        defaultPassword: "",
      });
    } catch (error) {
      setAdminError(getApiErrorMessage(error, "Creation du compte admin impossible."));
    }
  };

  const adminAccountsErrorMessage = adminAccountsError
    ? getApiErrorMessage(adminAccountsError, "Chargement des comptes admin impossible.")
    : null;

  return (
    <div className={shared.page}>
      <section className={shared.section}>
        <div className={shared.sectionHeader}>
          <div>
            <h2>Parametres generaux</h2>
            <p className={shared.mutedText}>
              Identite, securite du compte et integrations API.
            </p>
          </div>
        </div>

        {profile ? (
          <div className={shared.grid}>
            <article className={shared.card}>
              <strong>Identite admin</strong>
              <div>
                {profile.user.firstName} {profile.user.lastName}
              </div>
              <div>{profile.user.email ?? profile.user.phone}</div>
              <small className={shared.mutedText}>
                {getAdminRoleLabel(profile.user.role)} · {profile.user.phone}
              </small>
              {profile.user.passwordChangeRequired ? (
                <p className={`${shared.notice} ${shared.noticeWarning}`}>
                  Mot de passe temporaire detecte. Change-le avant de continuer
                  les operations back-office.
                </p>
              ) : (
                <span className={`${shared.badge} ${shared.badgeSuccess}`}>
                  Mot de passe personnalise
                </span>
              )}
            </article>

            <article className={shared.card}>
              <strong className={shared.cardTitle}>
                <KeyRound size={18} />
                Changer mon mot de passe
              </strong>
              <form className={shared.form} onSubmit={handlePasswordSubmit}>
                <label>
                  Mot de passe actuel
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(event) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        currentPassword: event.target.value,
                      }))
                    }
                    minLength={4}
                    maxLength={128}
                    required
                  />
                </label>

                <label>
                  Nouveau mot de passe
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(event) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        newPassword: event.target.value,
                      }))
                    }
                    minLength={8}
                    maxLength={128}
                    required
                  />
                </label>

                <label>
                  Confirmer le nouveau mot de passe
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(event) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        confirmPassword: event.target.value,
                      }))
                    }
                    minLength={8}
                    maxLength={128}
                    required
                  />
                </label>

                {passwordError ? (
                  <p className={shared.errorText}>{passwordError}</p>
                ) : null}
                {passwordMessage ? (
                  <p className={shared.successText}>{passwordMessage}</p>
                ) : null}

                <button
                  className={shared.primaryButton}
                  type="submit"
                  disabled={isChangingPassword}
                >
                  {isChangingPassword ? "Modification..." : "Enregistrer"}
                </button>
              </form>
            </article>

            <article className={shared.card}>
              <strong>Notifications</strong>
              {Object.entries(notifications).map(([key, value]) => (
                <label className={shared.checkboxRow} key={key}>
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={() => handleToggle(key as keyof NotificationPref)}
                  />
                  {key.toUpperCase()}
                </label>
              ))}
            </article>

            <article className={shared.card}>
              <strong>Integrations actives</strong>
              <ul className={shared.compactList}>
                <li>Orange Money - Webhook OK</li>
                <li>M-Pesa - Token valide</li>
                <li>Firebase Cloud Messaging</li>
              </ul>
            </article>
          </div>
        ) : null}
      </section>

      {isSuperAdmin ? (
        <section className={shared.section}>
          <div className={shared.sectionHeader}>
            <div>
              <h2>Comptes back-office</h2>
              <p className={shared.mutedText}>
                Creation ou promotion des administrateurs operationnels avec mot de passe temporaire.
              </p>
            </div>
            <span className={`${shared.badge} ${shared.badgeWarning}`}>
              Reserve super admin
            </span>
          </div>

          {canManageAdminAccounts ? (
          <div className={shared.grid}>
            <article className={shared.card}>
              <strong className={shared.cardTitle}>
                <UserPlus size={18} />
                Creer ou promouvoir un admin
              </strong>
              <form className={shared.form} onSubmit={handleCreateAdminSubmit}>
                <label>
                  Telephone
                  <input
                    type="tel"
                    placeholder="+243 000 000 000"
                    value={adminForm.phone}
                    onChange={(event) =>
                      setAdminForm((prev) => ({ ...prev, phone: event.target.value }))
                    }
                    required
                  />
                </label>

                <div className={shared.fieldGrid}>
                  <label>
                    Prenom
                    <input
                      type="text"
                      value={adminForm.firstName}
                      onChange={(event) =>
                        setAdminForm((prev) => ({
                          ...prev,
                          firstName: event.target.value,
                        }))
                      }
                      maxLength={100}
                      required
                    />
                  </label>

                  <label>
                    Nom
                    <input
                      type="text"
                      value={adminForm.lastName}
                      onChange={(event) =>
                        setAdminForm((prev) => ({
                          ...prev,
                          lastName: event.target.value,
                        }))
                      }
                      maxLength={100}
                      required
                    />
                  </label>
                </div>

                <label>
                  Mot de passe temporaire
                  <input
                    type="password"
                    value={adminForm.defaultPassword}
                    onChange={(event) =>
                      setAdminForm((prev) => ({
                        ...prev,
                        defaultPassword: event.target.value,
                      }))
                    }
                    minLength={8}
                    maxLength={128}
                    required
                  />
                </label>

                <p className={shared.mutedText}>
                  Transmets ce mot de passe hors de l'application. Zwanga ne le
                  reaffichera pas apres creation.
                </p>

                {adminError ? <p className={shared.errorText}>{adminError}</p> : null}
                {adminMessage ? <p className={shared.successText}>{adminMessage}</p> : null}

                <button
                  className={shared.primaryButton}
                  type="submit"
                  disabled={isCreatingAdmin}
                >
                  {isCreatingAdmin ? "Traitement..." : "Creer ou promouvoir"}
                </button>
              </form>
            </article>

            <article className={`${shared.card} ${shared.wideCard}`}>
              <strong className={shared.cardTitle}>
                <UsersRound size={18} />
                Administrateurs existants
              </strong>

              {adminAccountsErrorMessage ? (
                <p className={shared.errorText}>{adminAccountsErrorMessage}</p>
              ) : null}

              {isFetchingAdmins ? <p className={shared.mutedText}>Chargement...</p> : null}

              {adminAccounts?.accounts.length ? (
                <div className={shared.tableWrapper}>
                  <table className={shared.table}>
                    <thead>
                      <tr>
                        <th>Compte</th>
                        <th>Role</th>
                        <th>Etat</th>
                        <th>Mot de passe</th>
                        <th>Derniere connexion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminAccounts.accounts.map((account) => (
                        <tr key={account.id}>
                          <td>
                            <strong>
                              {account.firstName} {account.lastName}
                            </strong>
                            <br />
                            <small className={shared.mutedText}>{account.phone}</small>
                          </td>
                          <td>{getAdminRoleLabel(account.role)}</td>
                          <td>
                            <span
                              className={`${shared.badge} ${
                                account.isActive
                                  ? shared.badgeSuccess
                                  : shared.badgeDanger
                              }`}
                            >
                              {account.isActive ? "Actif" : "Inactif"}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`${shared.badge} ${
                                account.passwordChangeRequired
                                  ? shared.badgeWarning
                                  : shared.badgeSuccess
                              }`}
                            >
                              {account.passwordChangeRequired
                                ? "A changer"
                                : "Personnalise"}
                            </span>
                          </td>
                          <td>{formatDate(account.lastLoginAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : !isFetchingAdmins ? (
                <p className={shared.emptyState}>Aucun compte admin trouve.</p>
              ) : null}
            </article>
          </div>
          ) : (
            <p className={`${shared.notice} ${shared.noticeWarning}`}>
              Change d'abord le mot de passe temporaire de ce super admin. La
              creation des administrateurs sera disponible juste apres.
            </p>
          )}
        </section>
      ) : null}

      <section className={shared.section}>
        <div className={shared.sectionHeader}>
          <div>
            <h2>Documents et conformite</h2>
            <p className={shared.mutedText}>
              Acces rapide aux pages legales exposees publiquement.
            </p>
          </div>
        </div>

        <div className={shared.legalLinks}>
          <Link
            className={shared.legalLink}
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Shield size={16} />
            <span>Politique de confidentialite</span>
          </Link>
          <Link
            className={shared.legalLink}
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
          >
            <FileText size={16} />
            <span>Termes et conditions</span>
          </Link>
          <Link
            className={shared.legalLink}
            href="/sales-policy"
            target="_blank"
            rel="noopener noreferrer"
          >
            <ShoppingBag size={16} />
            <span>Politique de ventes et services</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
