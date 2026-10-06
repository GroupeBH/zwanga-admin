"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import styles from "./NavigationLoader.module.css";

const START_EVENT = "zwanga:navigation-start";
const MINIMUM_VISIBLE_MS = 400;
const GIVE_UP_MS = 12000;

export function beginNavigation(href?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<string | null>(START_EVENT, { detail: href ?? null }));
}

const currentLocation = () => window.location.pathname + window.location.search;

const destinationOf = (anchor: HTMLAnchorElement) => {
  const raw = anchor.getAttribute("href");
  if (!raw || raw.startsWith("#") || raw.startsWith("mailto:") || raw.startsWith("tel:")) return null;
  if (anchor.target && anchor.target !== "_self") return null;
  if (anchor.hasAttribute("download")) return null;

  let url: URL;
  try {
    url = new URL(anchor.href, window.location.href);
  } catch {
    return null;
  }
  if (url.origin !== window.location.origin) return null;

  const next = url.pathname + url.search;
  if (next === currentLocation()) return null;
  return next;
};

export function NavigationLoader() {
  const pathname = usePathname();
  const [pending, setPending] = useState(false);
  const targetRef = useRef<string | null>(null);
  const startedAtRef = useRef(0);

  useEffect(() => {
    const start = (href: string | null) => {
      targetRef.current = href;
      startedAtRef.current = Date.now();
      setPending(true);
    };

    const onClick = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const node = event.target;
      if (!(node instanceof Element)) return;
      const anchor = node.closest("a");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      const next = destinationOf(anchor);
      if (!next) return;
      start(next);
    };

    const onStart = (event: Event) => {
      const href = (event as CustomEvent<string | null>).detail ?? null;
      start(href);
    };

    document.addEventListener("click", onClick);
    window.addEventListener(START_EVENT, onStart);
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener(START_EVENT, onStart);
    };
  }, []);

  useEffect(() => {
    if (!pending) return;

    const arrived = () => {
      const target = targetRef.current;
      if (!target) return true;
      return currentLocation() === target;
    };

    const tick = window.setInterval(() => {
      const visibleLongEnough = Date.now() - startedAtRef.current >= MINIMUM_VISIBLE_MS;
      if (arrived() && visibleLongEnough) setPending(false);
    }, 80);
    const giveUp = window.setTimeout(() => setPending(false), GIVE_UP_MS);

    return () => {
      window.clearInterval(tick);
      window.clearTimeout(giveUp);
    };
  }, [pending, pathname]);

  if (!pending) return null;

  return (
    <div className={styles.root} role="status" aria-live="polite">
      <div className={styles.bar} />
      <p className={styles.label}>Chargement de la page…</p>
    </div>
  );
}
