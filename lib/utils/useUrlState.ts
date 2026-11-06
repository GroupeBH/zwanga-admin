"use client";

import { useCallback, useEffect, useState, type SetStateAction } from "react";

/**
 * Comme useState, mais la valeur vit aussi dans l'URL (?cle=valeur): le bouton
 * retour, le rechargement et un lien partage retrouvent les memes filtres.
 * La valeur par defaut n'est jamais ecrite, pour garder des URL courtes.
 */
export function useUrlState<T extends string | number>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(defaultValue);

  // Lecture apres montage: le rendu serveur et le premier rendu client restent identiques.
  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get(key);
    if (raw === null) return;
    if (typeof defaultValue === "number") {
      const parsed = Number(raw);
      if (Number.isFinite(parsed) && parsed > 0) setValue(parsed as T);
    } else {
      setValue(raw as T);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const update = useCallback(
    (next: SetStateAction<T>) => {
      setValue((previous) => {
        const resolved =
          typeof next === "function" ? (next as (value: T) => T)(previous) : next;
        const params = new URLSearchParams(window.location.search);
        if (resolved === defaultValue || resolved === "") params.delete(key);
        else params.set(key, String(resolved));
        const query = params.toString();
        window.history.replaceState(
          window.history.state,
          "",
          `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`
        );
        return resolved;
      });
    },
    [defaultValue, key]
  );

  return [value, update] as const;
}
