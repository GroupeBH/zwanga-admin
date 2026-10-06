"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { AdminFinanceUser } from "@/lib/features/finance/types";
import { useSearchReferrerCandidatesQuery } from "@/lib/features/users/userFinancialApi";
import { getApiErrorMessage } from "@/lib/utils/apiErrors";
import styles from "./UserSearchField.module.css";

const personName = (user: { firstName?: string; lastName?: string }) =>
  `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "Utilisateur sans nom";

const personDetail = (user: AdminFinanceUser) =>
  user.phone ?? user.email ?? user.id;

const personLabel = (user: AdminFinanceUser) =>
  `${personName(user)} · ${personDetail(user)}`;

export default function UserSearchField({
  label,
  selected,
  onSelect,
  excludeId,
  disabled = false,
  compact = false,
}: {
  label: string;
  selected: AdminFinanceUser | null;
  onSelect: (user: AdminFinanceUser | null) => void;
  excludeId?: string;
  disabled?: boolean;
  compact?: boolean;
}) {
  const inputId = useId();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const editing = useRef(false);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const candidates = useSearchReferrerCandidatesQuery(search, {
    skip: !open || search.length < 2,
  });
  const users = (candidates.data?.users ?? []).filter(
    (user) => user.id !== excludeId,
  );
  const waiting = draft.trim() !== search;

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(draft.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [draft]);

  useEffect(() => {
    if (editing.current) {
      editing.current = false;
      return;
    }
    setDraft(selected ? personLabel(selected) : "");
    setOpen(false);
  }, [selected]);

  useEffect(() => {
    setActiveIndex(0);
  }, [search]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const choose = (user: AdminFinanceUser) => {
    onSelect(user);
    setDraft(personLabel(user));
    setOpen(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open && draft.trim().length >= 2) {
        setOpen(true);
        return;
      }
      if (users.length === 0) return;
      setActiveIndex((index) => Math.min(users.length - 1, index + 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (users.length === 0) return;
      setActiveIndex((index) => Math.max(0, index - 1));
      return;
    }
    if (event.key === "Enter" && open && users[activeIndex]) {
      event.preventDefault();
      choose(users[activeIndex]);
    }
  };

  return (
    <div
      className={compact ? `${styles.field} ${styles.compact}` : styles.field}
      ref={rootRef}
    >
      <label htmlFor={inputId}>{label}</label>
      <input
        id={inputId}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        disabled={disabled}
        value={draft}
        placeholder="Rechercher par nom, téléphone, email ou identifiant"
        onChange={(event) => {
          const value = event.target.value;
          editing.current = true;
          setDraft(value);
          if (selected) onSelect(null);
          setOpen(value.trim().length >= 2);
        }}
        onFocus={() => {
          if (!selected && draft.trim().length >= 2) setOpen(true);
        }}
        onKeyDown={onKeyDown}
      />
      {open && (
        <div className={styles.menu} id={listId} role="listbox">
          {waiting || search.length < 2 || candidates.isFetching ? (
            <p className={styles.status}>Recherche…</p>
          ) : candidates.error ? (
            <p className={styles.error} role="alert">
              {getApiErrorMessage(
                candidates.error,
                "Recherche indisponible. Modifiez le texte ou réessayez.",
              )}
            </p>
          ) : users.length === 0 ? (
            <p className={styles.status}>Aucun compte actif trouvé.</p>
          ) : (
            users.map((user, index) => (
              <button
                key={user.id}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                className={
                  index === activeIndex ? styles.optionActive : styles.option
                }
                onMouseDown={(event) => {
                  event.preventDefault();
                  choose(user);
                }}
                onMouseEnter={() => setActiveIndex(index)}
              >
                <strong>{personName(user)}</strong>
                <small>{personDetail(user)}</small>
              </button>
            ))
          )}
          {(candidates.data?.users.length ?? 0) >= 15 &&
            !waiting &&
            !candidates.isFetching && (
              <p className={styles.status}>
                15 premiers comptes. Affinez la recherche pour les autres.
              </p>
            )}
        </div>
      )}
    </div>
  );
}
