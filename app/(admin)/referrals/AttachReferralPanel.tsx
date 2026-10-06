"use client";

import { useState } from "react";
import type { FormEvent } from "react";

import type { AdminFinanceUser } from "@/lib/features/finance/types";
import { formatTokens } from "@/lib/features/finance/format";
import { useAttachUserReferrerMutation } from "@/lib/features/users/userFinancialApi";
import { getApiErrorMessage } from "@/lib/utils/apiErrors";
import UserSearchField from "@/app/components/admin/UserSearchField";

import styles from "../finance.module.css";

const displayName = (user: { firstName?: string; lastName?: string }) =>
  `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "Utilisateur sans nom";

export function AttachReferralPanel() {
  const [formKey, setFormKey] = useState(0);
  const [filleul, setFilleul] = useState<AdminFinanceUser | null>(null);
  const [parrain, setParrain] = useState<AdminFinanceUser | null>(null);
  const [reason, setReason] = useState("");
  const [notice, setNotice] = useState("");
  const [failure, setFailure] = useState("");
  const [attach, state] = useAttachUserReferrerMutation();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!filleul || !parrain || reason.trim().length < 10 || state.isLoading) return;
    if (filleul.id === parrain.id) {
      setFailure("Un utilisateur ne peut pas être son propre parrain.");
      return;
    }
    if (
      !window.confirm(
        `Rattacher ${displayName(filleul)} à ${displayName(parrain)} ? Ce parrain ne pourra pas être remplacé. Le bonus de rattachement sera accordé une seule fois, sans commissions rétroactives.`,
      )
    ) {
      return;
    }
    setFailure("");
    setNotice("");
    try {
      const result = await attach({
        userId: filleul.id,
        referrerUserId: parrain.id,
        reason: reason.trim(),
      }).unwrap();
      setFilleul(null);
      setParrain(null);
      setReason("");
      setFormKey((value) => value + 1);
      setNotice(
        result.newlyAttached
          ? `Parrain rattaché. Bonus crédité au parrain : ${formatTokens(result.attributionBonusTokens)}.`
          : "Ce parrain était déjà rattaché. Aucun bonus supplémentaire n’a été crédité.",
      );
    } catch (error) {
      setFailure(getApiErrorMessage(error, "Le rattachement a échoué."));
    }
  };

  return (
    <section className={styles.panel} aria-labelledby="attach-referral-heading">
      <div className={styles.panelHeader}>
        <div>
          <h2 id="attach-referral-heading">Rattacher un filleul</h2>
          <p>Le filleul ne doit pas déjà avoir de parrain. Le bonus habituel est crédité une seule fois au parrain.</p>
        </div>
      </div>
      <form className={styles.formStack} onSubmit={submit}>
        <UserSearchField
          key={`${formKey}-filleul`}
          label="Filleul"
          selected={filleul}
          onSelect={setFilleul}
          excludeId={parrain?.id}
          compact
        />
        <UserSearchField
          key={`${formKey}-parrain`}
          label="Parrain"
          selected={parrain}
          onSelect={setParrain}
          excludeId={filleul?.id}
          compact
        />
        <label className={`${styles.field} ${styles.fieldWide}`}>
          Motif du rattachement
          <textarea
            minLength={10}
            maxLength={300}
            required
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Minimum 10 caractères : demande du support, ticket…"
          />
        </label>
        <button
          type="submit"
          className={styles.button}
          disabled={!filleul || !parrain || reason.trim().length < 10 || state.isLoading}
        >
          {state.isLoading ? "Rattachement…" : "Confirmer le parrain"}
        </button>
      </form>
      {notice ? <p className={styles.notice}>{notice}</p> : null}
      {failure ? <p className={styles.error}>{failure}</p> : null}
    </section>
  );
}
