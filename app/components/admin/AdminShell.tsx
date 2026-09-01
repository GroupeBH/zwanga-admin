"use client";

import clsx from "clsx";
import { useEffect, useState, type ReactNode } from "react";

import { setSidebarOpen } from "@/lib/features/ui/uiSlice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";

import styles from "./AdminShell.module.css";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

interface Props {
  readonly children: ReactNode;
}

export const AdminShell = ({ children }: Props) => {
  const dispatch = useAppDispatch();
  const sidebarOpen = useAppSelector((state) => state.ui.sidebarOpen);
  const [isCompactViewport, setIsCompactViewport] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1024px)");

    const syncNavigation = (matches: boolean) => {
      setIsCompactViewport(matches);
      dispatch(setSidebarOpen(!matches));
    };

    syncNavigation(mediaQuery.matches);
    const handleChange = (event: MediaQueryListEvent) =>
      syncNavigation(event.matches);
    mediaQuery.addEventListener("change", handleChange);

    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [dispatch]);

  useEffect(() => {
    if (!isCompactViewport || !sidebarOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        dispatch(setSidebarOpen(false));
      }
    };
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [dispatch, isCompactViewport, sidebarOpen]);

  return (
    <div
      className={clsx(styles.shell, {
        [styles.sidebarCollapsed]: !sidebarOpen,
      })}
    >
      <Sidebar isCompactViewport={isCompactViewport} />
      {isCompactViewport && sidebarOpen ? (
        <button
          type="button"
          className={styles.navigationBackdrop}
          aria-label="Fermer la navigation"
          onClick={() => dispatch(setSidebarOpen(false))}
        />
      ) : null}
      <div className={styles.workbench}>
        <Topbar />
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
};

