"use client";

import clsx from "clsx";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { isMarketerRole } from "@/lib/features/auth/adminRoles";
import { useGetCurrentUserProfileQuery } from "@/lib/features/profile/profileApi";
import { beginNavigation } from "@/app/components/navigation/NavigationLoader";

import styles from "./CommandPalette.module.css";
import { marketerGroups, navGroups } from "./navigation";

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/* Ctrl/Cmd+K ou « / » ouvre une recherche de page: avec une trentaine
   d'ecrans, le menu seul oblige a defiler. */
export const CommandPalette = () => {
  const router = useRouter();
  const { data: profile } = useGetCurrentUserProfileQuery();
  const groups = isMarketerRole(profile?.user.role) ? marketerGroups : navGroups;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const results = useMemo(() => {
    const needle = normalize(query.trim());
    return groups.flatMap((group) =>
      group.items
        .filter(
          (item) =>
            !needle ||
            normalize(`${item.label} ${group.label} ${item.keywords ?? ""}`).includes(
              needle
            )
        )
        .map((item) => ({ item, group: group.label }))
    );
  }, [groups, query]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName ?? "");
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      } else if (event.key === "/" && !typing && !open) {
        event.preventDefault();
        setOpen(true);
      } else if (event.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setCursor(0);
      inputRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    setCursor(0);
  }, [query]);

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>('[data-active="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  if (!open) return null;

  const go = (href: string) => {
    setOpen(false);
    beginNavigation(href);
    router.push(href);
  };

  const onInputKey = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setCursor((value) => Math.min(value + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setCursor((value) => Math.max(value - 1, 0));
    } else if (event.key === "Enter" && results[cursor]) {
      event.preventDefault();
      go(results[cursor].item.href);
    }
  };

  let lastGroup = "";

  return (
    <div
      className={styles.backdrop}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setOpen(false);
      }}
    >
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Aller à une page"
      >
        <div className={styles.inputRow}>
          <Search size={18} aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onInputKey}
            placeholder="Aller à… (paiements, KYC, zones, support)"
            aria-label="Rechercher une page"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            autoComplete="off"
          />
          <span className={styles.kbd}>Échap</span>
        </div>
        {results.length === 0 ? (
          <p className={styles.empty}>Aucune page ne correspond à « {query} ».</p>
        ) : (
          <ul ref={listRef} id="palette-list" role="listbox" className={styles.list}>
            {results.map(({ item, group }, index) => {
              const Icon = item.icon;
              const header = group !== lastGroup ? group : null;
              lastGroup = group;
              return (
                <li key={item.href} role="presentation">
                  {header ? <div className={styles.group}>{header}</div> : null}
                  <button
                    type="button"
                    role="option"
                    aria-selected={index === cursor}
                    data-active={index === cursor}
                    tabIndex={-1}
                    className={clsx(styles.option, {
                      [styles.optionActive]: index === cursor,
                    })}
                    onMouseEnter={() => setCursor(index)}
                    onClick={() => go(item.href)}
                  >
                    <Icon aria-hidden="true" />
                    {item.label}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <div className={styles.footer}>
          <span>↑↓ naviguer</span>
          <span>↵ ouvrir</span>
          <span>Ctrl K ouvrir / fermer</span>
        </div>
      </div>
    </div>
  );
};
