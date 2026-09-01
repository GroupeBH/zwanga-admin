"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { useLoginWithPhoneMutation } from "@/lib/features/auth/authApi";
import { setAuthenticated } from "@/lib/features/auth/authSlice";
import { isAdminRole } from "@/lib/features/auth/adminRoles";
import { useAppDispatch } from "@/lib/hooks";
import { getApiErrorMessage } from "@/lib/utils/apiErrors";
import { clearAuthTokens, setAuthTokens } from "@/lib/utils/cookies";

import styles from "./login.module.css";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_PUBLIC_URL || "http://localhost:5200/api/v1";

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [login, { isLoading }] = useLoginWithPhoneMutation();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    try {
      const payload = { phone: phone.trim(), password: password.trim() };

      const response = await login(payload).unwrap();
      const profileResponse = await fetch(`${API_BASE_URL}/users/me`, {
        headers: {
          Authorization: `Bearer ${response.accessToken}`,
        },
      });
      const profilePayload = await profileResponse.json().catch(() => null);

      if (!profileResponse.ok) {
        throw {
          status: profileResponse.status,
          data: profilePayload,
          error: profileResponse.statusText,
        };
      }

      if (!isAdminRole(profilePayload?.user?.role)) {
        clearAuthTokens();
        dispatch(setAuthenticated(false));
        setError("Ce compte n'a pas acces a l'interface admin.");
        return;
      }

      setAuthTokens(response.accessToken, response.refreshToken);
      dispatch(setAuthenticated(true));
      router.push(response.passwordChangeRequired ? "/settings" : "/dashboard");
    } catch (err) {
      clearAuthTokens();
      dispatch(setAuthenticated(false));
      setError(getApiErrorMessage(err, "Authentification impossible. Verifiez vos identifiants."));
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <span>ZWANGA Admin</span>
        <h1>Connexion securisee</h1>
        <p>Authentification par numero de telephone + mot de passe admin</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <input
            type="tel"
            placeholder="+243 000 000 000"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Mot de passe administrateur"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={4}
            maxLength={128}
            required
          />

          {error ? <p className={styles.error}>{error}</p> : null}
          <button type="submit" disabled={isLoading}>
            {isLoading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <small>
          Besoin d&apos;un compte ? <Link href="/support">Contacter l&apos;equipe</Link>
        </small>
      </div>
    </div>
  );
}
