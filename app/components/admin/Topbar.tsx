"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Menu,
  Moon,
  Plus,
  Search,
  Sun,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { toggleSidebar, toggleTheme } from "@/lib/features/ui/uiSlice";
import { useGetNotificationsQuery } from "@/lib/features/notifications/notificationsApi";
import { useLogoutMutation } from "@/lib/features/auth/authApi";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { clearAuthTokens } from "@/lib/utils/cookies";
import { setAuthenticated } from "@/lib/features/auth/authSlice";

import styles from "./Topbar.module.css";

export const Topbar = () => {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((state) => state.ui.theme);
  const { data: notifications } = useGetNotificationsQuery();
  const [panelOpen, setPanelOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();
  const handleLogout = async () => {
    try {
      await logout().unwrap();
      // Supprimer les cookies d'authentification
      clearAuthTokens();
      // Mettre à jour l'état Redux
      dispatch(setAuthenticated(false));
      // Rediriger vers la page de connexion
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout failed", error);
      // Même en cas d'erreur, nettoyer les cookies locaux
      clearAuthTokens();
      dispatch(setAuthenticated(false));
      window.location.href = "/login";
    }
  };

  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat("fr-CD", {
        weekday: "long",
        hour: "2-digit",
        minute: "2-digit",
      }),
    []
  );
  const dateLabel = formatter.format(new Date());

  const unreadCount = notifications?.filter((item) => !item.read).length ?? 0;

  useEffect(() => {
    const listener = (event: MouseEvent) => {
      if (!panelRef.current) {
        return;
      }
      if (
        panelOpen &&
        event.target instanceof Node &&
        !panelRef.current.contains(event.target)
      ) {
        setPanelOpen(false);
      }
    };
    document.addEventListener("mousedown", listener);
    return () => document.removeEventListener("mousedown", listener);
  }, [panelOpen]);

  useEffect(() => {
    setPanelOpen(false);
  }, [pathname]);

  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        <button
          type="button"
          className={styles.ghostButton}
          aria-label="Basculer la navigation"
          onClick={() => dispatch(toggleSidebar())}
        >
          <Menu size={18} aria-hidden="true" />
        </button>

        <div>
          <strong>ZWANGA HQ</strong>
          <div style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>
            {dateLabel}
          </div>
        </div>

        <div className={styles.search}>
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            placeholder="Rechercher un trajet, un utilisateur, un ticket..."
          />
        </div>
      </div>

      <div className={styles.right}>
        <button type="button" className={styles.cta}>
          <Plus size={16} aria-hidden="true" />
          Nouveau trajet
        </button>

        <button
          type="button"
          className={styles.ghostButton}
          aria-label="Basculer le mode clair/sombre"
          onClick={() => dispatch(toggleTheme())}
        >
          {theme === "dark" ? (
            <Sun size={18} aria-hidden="true" />
          ) : (
            <Moon size={18} aria-hidden="true" />
          )}
        </button>

        <div className={styles.notificationWrapper}>
          <button
            type="button"
            className={`${styles.ghostButton} ${styles.notificationButton}`}
            aria-label="Notifications"
            onClick={() => setPanelOpen((prev) => !prev)}
          >
            <Bell size={18} aria-hidden="true" />
            {unreadCount > 0 ? (
              <span className={styles.badge}>{unreadCount}</span>
            ) : null}
          </button>

          {panelOpen ? (
            <div ref={panelRef} className={styles.panel}>
              <strong>Notifications</strong>
              {notifications?.map((notification) => (
                <div
                  key={notification.id}
                  className={`${styles.panelItem} ${
                    notification.read ? "" : styles.unread
                  }`}
                >
                  <h4>{notification.title}</h4>
                  <p>{notification.description}</p>
                  <span>{notification.category}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <Link href="/profile" className={styles.profile}>
          <span className={styles.avatar}>EB</span>
          <div className={styles.profileInfo}>
            <strong>Eugène</strong>
            <span>Head of Ops</span>
          </div>
        </Link>
        <button
          type="button"
          className={styles.ghostButton}
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? "..." : "Logout"}
        </button>
      </div>
    </header>
  );
};

