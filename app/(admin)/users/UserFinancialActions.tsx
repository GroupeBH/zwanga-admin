"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { User } from "@/lib/features/admin/types";
import type { AdminFinanceUser } from "@/lib/features/finance/types";
import { useAdjustAdminWalletMutation } from "@/lib/features/finance/financeApi";
import { useGetCurrentUserProfileQuery } from "@/lib/features/profile/profileApi";
import { isAdminRole } from "@/lib/features/auth/adminRoles";
import {
  useAttachUserReferrerMutation,
  useGetUserFinancialSummaryQuery,
} from "@/lib/features/users/userFinancialApi";
import {
  adjustmentError,
  readAdjustmentIntent,
  type WalletAdjustmentIntent,
} from "@/lib/features/users/walletAdjustment";
import { getApiErrorMessage, getApiErrorStatus } from "@/lib/utils/apiErrors";
import UserSearchField from "@/app/components/admin/UserSearchField";
import shared from "../styles/page.module.css";
import styles from "./UserFinancialActions.module.css";

const tokens = (value: number) =>
  `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(value)} jetons`;
const name = (user: { firstName?: string; lastName?: string }) =>
  `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
const date = (value: string) =>
  new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
const definitiveRejection = (error: unknown) =>
  [400, 403, 404, 409, 422].includes(Number(getApiErrorStatus(error)));

export default function UserFinancialActions({ user }: { user: User }) {
  const summary = useGetUserFinancialSummaryQuery(user.id);
  const profile = useGetCurrentUserProfileQuery();
  const canManage = isAdminRole(profile.data?.user.role);
  const [adjust, adjustmentState] = useAdjustAdminWalletMutation();
  const [attach, attachmentState] = useAttachUserReferrerMutation();
  const [direction, setDirection] = useState<"credit" | "debit" | null>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState<WalletAdjustmentIntent | null>(null);
  const [notice, setNotice] = useState("");
  const [failure, setFailure] = useState("");
  const busy = useRef(false);
  const storageKey = profile.data?.user.id
    ? `zwanga:admin-adjustment:${profile.data.user.id}:${user.id}`
    : null;
  const [selected, setSelected] = useState<AdminFinanceUser | null>(null);
  const [referralReason, setReferralReason] = useState("");
  const [referralPending, setReferralPending] = useState(false);
  const [referralFailure, setReferralFailure] = useState("");
  const referralBusy = useRef(false);
  const [filleulSelected, setFilleulSelected] = useState<AdminFinanceUser | null>(
    null,
  );
  const [filleulReason, setFilleulReason] = useState("");
  const [filleulPending, setFilleulPending] = useState(false);
  const [filleulFailure, setFilleulFailure] = useState("");
  const filleulBusy = useRef(false);
  useEffect(() => {
    if (!storageKey) return;
    try {
      const restored = readAdjustmentIntent(
        sessionStorage.getItem(storageKey),
        user.id,
      );
      if (restored) {
        setPending(restored);
        setDirection(restored.amount > 0 ? "credit" : "debit");
        setAmount(String(Math.abs(restored.amount)));
        setReason(restored.reason);
      }
    } catch {
      /* A blocked browser store is reported before any new mutation. */
    }
  }, [storageKey, user.id]);

  const submitAdjustment = async (event: FormEvent) => {
    event.preventDefault();
    if (busy.current || !canManage || !storageKey) return;
    const signedAmount =
      Number(amount.replace(",", ".")) * (direction === "debit" ? -1 : 1);
    const knownBalance =
      summary.data?.wallet.balance ?? Number.POSITIVE_INFINITY;
    if (!pending) {
      const error = adjustmentError(signedAmount, reason, knownBalance);
      if (error) {
        setFailure(error);
        return;
      }
      if (
        !window.confirm(
          `${signedAmount > 0 ? "Ajouter" : "Retirer"} ${tokens(Math.abs(signedAmount))} ${signedAmount > 0 ? "à" : "de"} ${name(user)} ?`,
        )
      )
        return;
    }
    const intent = pending ?? {
      requestId: crypto.randomUUID(),
      userId: user.id,
      amount: signedAmount,
      reason: reason.trim(),
    };
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(intent));
    } catch {
      setFailure(
        "Le navigateur ne permet pas de conserver la demande. Autorisez le stockage de session avant de modifier le solde.",
      );
      return;
    }
    busy.current = true;
    setPending(intent);
    setFailure("");
    setNotice("");
    try {
      await adjust(intent).unwrap();
      sessionStorage.removeItem(storageKey);
      setPending(null);
      setDirection(null);
      setAmount("");
      setReason("");
      setNotice(
        `${tokens(Math.abs(intent.amount))} ${intent.amount > 0 ? "ajoutés" : "retirés"}. L’opération est enregistrée et la notification utilisateur est prise en charge par le backend.`,
      );
    } catch (error) {
      if (definitiveRejection(error)) {
        sessionStorage.removeItem(storageKey);
        setPending(null);
      }
      setFailure(
        getApiErrorMessage(
          error,
          "Confirmation indisponible. Réessayez la même opération pour vérifier son résultat sans la dupliquer.",
        ),
      );
    } finally {
      busy.current = false;
    }
  };

  const submitReferral = async (event: FormEvent) => {
    event.preventDefault();
    if (
      referralBusy.current ||
      !canManage ||
      !selected ||
      referralReason.trim().length < 10
    )
      return;
    if (
      !referralPending &&
      !window.confirm(
        `Rattacher ${name(user)} à ${name(selected)} ? Ce parrain ne pourra pas être remplacé. Le bonus de rattachement habituel sera accordé une seule fois, sans commissions rétroactives.`,
      )
    )
      return;
    referralBusy.current = true;
    setReferralPending(true);
    setReferralFailure("");
    setNotice("");
    try {
      const result = await attach({
        userId: user.id,
        referrerUserId: selected.id,
        reason: referralReason.trim(),
      }).unwrap();
      setReferralPending(false);
      setSelected(null);
      setReferralReason("");
      setNotice(
        result.newlyAttached
          ? `Parrain rattaché. Bonus crédité au parrain : ${tokens(result.attributionBonusTokens)}.`
          : "Ce parrain était déjà rattaché ; aucun bonus supplémentaire n’a été crédité.",
      );
    } catch (error) {
      if (definitiveRejection(error)) setReferralPending(false);
      setReferralFailure(
        getApiErrorMessage(
          error,
          "Confirmation indisponible. Réessayez le même rattachement.",
        ),
      );
    } finally {
      referralBusy.current = false;
    }
  };

  const submitFilleul = async (event: FormEvent) => {
    event.preventDefault();
    if (
      filleulBusy.current ||
      !canManage ||
      !filleulSelected ||
      filleulReason.trim().length < 10
    )
      return;
    if (
      !filleulPending &&
      !window.confirm(
        `Rattacher ${name(filleulSelected)} comme filleul de ${name(user)} ? Le parrain ne pourra pas être remplacé. Le bonus de rattachement habituel sera accordé une seule fois, sans commissions rétroactives.`,
      )
    )
      return;
    filleulBusy.current = true;
    setFilleulPending(true);
    setFilleulFailure("");
    setNotice("");
    try {
      const result = await attach({
        userId: filleulSelected.id,
        referrerUserId: user.id,
        reason: filleulReason.trim(),
      }).unwrap();
      setFilleulPending(false);
      setFilleulSelected(null);
      setFilleulReason("");
      setNotice(
        result.newlyAttached
          ? `${name(filleulSelected)} est rattaché. Bonus crédité au parrain : ${tokens(result.attributionBonusTokens)}.`
          : "Ce filleul était déjà rattaché ; aucun bonus supplémentaire n’a été crédité.",
      );
    } catch (error) {
      if (definitiveRejection(error)) setFilleulPending(false);
      setFilleulFailure(
        getApiErrorMessage(
          error,
          "Confirmation indisponible. Réessayez le même rattachement.",
        ),
      );
    } finally {
      filleulBusy.current = false;
    }
  };

  if (summary.isLoading && !summary.data)
    return (
      <section className={shared.section}>
        <h2>Jetons et parrainage</h2>
        <p>Chargement des soldes…</p>
      </section>
    );
  const wallet = summary.data?.wallet;
  const referral = summary.data?.referral;
  const invalid =
    !pending &&
    adjustmentError(
      Number(amount.replace(",", ".")) * (direction === "debit" ? -1 : 1),
      reason,
      wallet?.balance ?? Number.POSITIVE_INFINITY,
    );
  return (
    <>
      <section className={shared.section} aria-labelledby="user-wallet-heading">
        <div className={styles.header}>
          <div>
            <h2 id="user-wallet-heading">Portefeuille de jetons</h2>
            {wallet ? (
              <>
                <p className={styles.balance}>{tokens(wallet.balance)}</p>
                <p className={styles.muted}>
                  Dont {tokens(wallet.account?.withdrawableBalance ?? 0)}{" "}
                  retirables ·{" "}
                  {tokens(wallet.account?.reservedWithdrawalBalance ?? 0)}{" "}
                  réservés pour un retrait.
                </p>
              </>
            ) : (
              <p className={styles.muted}>Solde non chargé.</p>
            )}
          </div>
          {canManage && !direction && (
            <div className={styles.actions}>
              <button
                className={styles.button}
                onClick={() => {
                  setDirection("credit");
                  setFailure("");
                }}
              >
                Ajouter des jetons
              </button>
              <button
                className={styles.danger}
                disabled={
                  !!wallet &&
                  (wallet.balance <= 0 || !!wallet.account?.withdrawalsBlocked)
                }
                onClick={() => {
                  setDirection("debit");
                  setFailure("");
                }}
              >
                Retirer des jetons
              </button>
            </div>
          )}
        </div>
        {!canManage && (
          <p className={styles.muted}>
            Les ajustements de jetons et les rattachements de filleuls sont
            réservés aux administrateurs.
          </p>
        )}
        {summary.error && (
          <div role="alert" className={styles.error}>
            <p>
              {getApiErrorMessage(
                summary.error,
                "Impossible de charger les informations financières.",
              )}
            </p>
            <button
              type="button"
              className={styles.secondary}
              onClick={() => summary.refetch()}
            >
              Réessayer
            </button>
          </div>
        )}
        {wallet?.account?.withdrawalsBlocked && (
          <p role="alert" className={styles.message}>
            Ce portefeuille nécessite une vérification : les débits sont
            bloqués.
          </p>
        )}
        {notice && (
          <p role="status" className={styles.message}>
            {notice}
          </p>
        )}
        {direction && canManage && (
          <form className={styles.form} onSubmit={submitAdjustment}>
            <h3>
              {direction === "credit"
                ? "Ajouter des jetons"
                : "Retirer des jetons"}{" "}
              — {name(user)}
            </h3>
            <p className={styles.muted}>
              {direction === "credit"
                ? "Les jetons ajoutés manuellement sont utilisables dans l’application, mais ne sont pas retirables en argent."
                : "Le retrait est définitif après confirmation. Il ne peut pas dépasser le solde disponible ni toucher les jetons déjà réservés."}
            </p>
            {pending && (
              <p className={styles.message}>
                Une demande est conservée pour vérification. Réessayez cette
                même opération : son identifiant empêche un deuxième ajustement.
              </p>
            )}
            <label className={styles.field}>
              Nombre de jetons
              <input
                type="number"
                min="0.01"
                max="1000000"
                step="0.01"
                required
                value={amount}
                disabled={!!pending}
                onChange={(event) => setAmount(event.target.value)}
              />
            </label>
            <label className={styles.field}>
              Motif obligatoire
              <textarea
                minLength={10}
                maxLength={400}
                required
                value={reason}
                disabled={!!pending}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Correction, geste commercial, référence du ticket…"
              />
            </label>
            {failure && (
              <p role="alert" className={styles.error}>
                {failure}
              </p>
            )}
            {invalid && amount && <p className={styles.muted}>{invalid}</p>}
            <div className={styles.actions}>
              <button
                className={
                  direction === "debit" ? styles.danger : styles.button
                }
                disabled={!!invalid || adjustmentState.isLoading || !storageKey}
              >
                {adjustmentState.isLoading
                  ? "Enregistrement…"
                  : pending
                    ? "Vérifier / réessayer la même opération"
                    : "Confirmer l’ajustement"}
              </button>
              {!pending && (
                <button
                  type="button"
                  className={styles.secondary}
                  onClick={() => {
                    setDirection(null);
                    setAmount("");
                    setReason("");
                    setFailure("");
                  }}
                >
                  Annuler
                </button>
              )}
            </div>
          </form>
        )}
        {wallet && <h3>Derniers mouvements</h3>}
        {wallet && wallet.entries.length ? (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Mouvement</th>
                  <th>Solde après</th>
                  <th>Motif / opération</th>
                </tr>
              </thead>
              <tbody>
                {wallet.entries.map((entry) => (
                  <tr key={entry.id}>
                    <td>{date(entry.createdAt)}</td>
                    <td>
                      {entry.amount > 0 ? "+" : ""}
                      {tokens(entry.amount)}
                    </td>
                    <td>{tokens(entry.balanceAfter)}</td>
                    <td>{entry.description ?? entry.type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className={styles.muted}>
              Les 20 derniers mouvements sont affichés. L’historique complet
              reste disponible dans la rubrique Jetons.
            </p>
          </div>
        ) : wallet ? (
          <p className={styles.muted}>Aucun mouvement enregistré.</p>
        ) : null}
      </section>
      <section
        className={shared.section}
        aria-labelledby="user-referrer-heading"
      >
        <h2 id="user-referrer-heading">Parrainage</h2>
        <p className={styles.muted}>
          Depuis cette fiche, ce compte peut devenir le parrain d’autres
          utilisateurs. Le rattachement ne déplace pas leurs jetons et ne crée
          aucune commission sur leurs anciens paiements.
        </p>
        {referral?.referrer ? (
          <p>
            Parrain :{" "}
            <a href={`/users?fiche=${encodeURIComponent(referral.referrer.id)}`}>
              {name(referral.referrer)}
            </a>{" "}
            · {referral.referrer.phone ?? referral.referrer.email}
            {referral.referredAt && (
              <> · depuis le {date(referral.referredAt)}</>
            )}
          </p>
        ) : summary.error ? (
          <p className={styles.muted}>
            Le parrain actuel n’a pas pu être chargé. Le rattachement reste
            proposé : le serveur le refuse si un parrain existe déjà.
          </p>
        ) : (
          <p>Aucun parrain rattaché.</p>
        )}
        {canManage && referral?.canAttach !== false && (
          <form className={styles.form} onSubmit={submitReferral}>
            <h3>Rattacher ce filleul à un parrain</h3>
            <UserSearchField
              label="Rechercher le parrain"
              selected={selected}
              onSelect={setSelected}
              excludeId={user.id}
              disabled={referralPending}
            />
            <label className={styles.field}>
              Motif du rattachement
              <textarea
                minLength={10}
                maxLength={300}
                required
                disabled={referralPending}
                value={referralReason}
                onChange={(event) => setReferralReason(event.target.value)}
              />
            </label>
            <p className={styles.muted}>
              Le bonus de rattachement habituel sera crédité au parrain une
              seule fois. Un parrain existant ne peut pas être remplacé.
            </p>
            {referralPending && !attachmentState.isLoading && (
              <p className={styles.message}>
                Résultat à confirmer : réessayez le même rattachement.
              </p>
            )}
            {referralFailure && (
              <p role="alert" className={styles.error}>
                {referralFailure}
              </p>
            )}
            <button
              className={styles.button}
              disabled={
                !selected ||
                referralReason.trim().length < 10 ||
                attachmentState.isLoading
              }
            >
              {attachmentState.isLoading
                ? "Rattachement…"
                : referralPending
                  ? "Vérifier / réessayer le rattachement"
                  : "Confirmer le parrain"}
            </button>
          </form>
        )}
        <h3>Filleuls</h3>
        {referral?.filleuls?.length ? (
          <ul className={styles.filleuls}>
            {referral.filleuls.map((item) => (
              <li key={item.user.id}>
                <a href={`/users?fiche=${encodeURIComponent(item.user.id)}`}>
                  {name(item.user)}
                </a>
                <small>
                  {item.user.phone ?? item.user.email}
                  {item.referredAt && <> · depuis le {date(item.referredAt)}</>}
                </small>
              </li>
            ))}
          </ul>
        ) : summary.error ? (
          <p className={styles.muted}>
            Les filleuls déjà rattachés n’ont pas pu être chargés.
          </p>
        ) : (
          <p className={styles.muted}>Aucun filleul rattaché.</p>
        )}
        {canManage && (
          <form className={styles.form} onSubmit={submitFilleul}>
            <h3>Joindre un filleul</h3>
            <UserSearchField
              label="Rechercher le filleul"
              selected={filleulSelected}
              onSelect={setFilleulSelected}
              excludeId={user.id}
              disabled={filleulPending}
            />
            <label className={styles.field}>
              Motif du rattachement
              <textarea
                minLength={10}
                maxLength={300}
                required
                disabled={filleulPending}
                value={filleulReason}
                onChange={(event) => setFilleulReason(event.target.value)}
              />
            </label>
            <p className={styles.muted}>
              {name(user)} devient le parrain. Le bonus habituel lui est crédité
              une seule fois. Un filleul qui a déjà un parrain ne peut pas être
              déplacé.
            </p>
            {filleulPending && !attachmentState.isLoading && (
              <p className={styles.message}>
                Résultat à confirmer : réessayez le même rattachement.
              </p>
            )}
            {filleulFailure && (
              <p role="alert" className={styles.error}>
                {filleulFailure}
              </p>
            )}
            <button
              className={styles.button}
              disabled={
                !filleulSelected ||
                filleulReason.trim().length < 10 ||
                attachmentState.isLoading
              }
            >
              {attachmentState.isLoading && filleulPending
                ? "Rattachement…"
                : filleulPending
                  ? "Vérifier / réessayer le rattachement"
                  : "Confirmer le filleul"}
            </button>
          </form>
        )}
      </section>
    </>
  );
}
