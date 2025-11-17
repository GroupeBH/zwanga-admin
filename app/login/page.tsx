"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { useLoginWithPhoneMutation } from "@/lib/features/auth/authApi";

import styles from "./login.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [login, { isLoading }] = useLoginWithPhoneMutation();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    try {
      await login({ phoneNumber, password }).unwrap();
      router.push("/dashboard");
    } catch (err) {
      const message =
        (err as { data?: { message?: string } })?.data?.message ??
        "Authentification impossible. Vérifiez vos identifiants.";
      setError(message);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <span>ZWANGA Admin</span>
        <h1>Connexion sécurisée</h1>
        <p>Authentification par numéro de téléphone (JWT en cookie sécurisé)</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <input
            type="tel"
            placeholder="+243 000 000 000"
            value={phoneNumber}
            onChange={(event) => setPhoneNumber(event.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          {error ? <p className={styles.error}>{error}</p> : null}
          <button type="submit" disabled={isLoading}>
            {isLoading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <small>
          Besoin d&apos;un compte ? <Link href="/support">Contacter l&apos;équipe</Link>
        </small>
      </div>
    </div>
  );
}

