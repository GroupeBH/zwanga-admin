"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  LogOut,
  Menu,
  Moon,
  Route,
  Search,
  Sun,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import { toggleSidebar, toggleTheme } from "@/lib/features/ui/uiSlice";
import {
  useGetNotificationsQuery,
  useMarkAllNotificationsAsReadMutation,
  useMarkNotificationsAsReadMutation,
  type AdminNotification,
} from "@/lib/features/notifications/notificationsApi";
import { useLogoutMutation } from "@/lib/features/auth/authApi";
import { getAdminRoleLabel } from "@/lib/features/auth/adminRoles";
import { useGetCurrentUserProfileQuery } from "@/lib/features/profile/profileApi";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { clearAuthTokens } from "@/lib/utils/cookies";
import { setAuthenticated } from "@/lib/features/auth/authSlice";

import styles from "./Topbar.module.css";

const SEARCH_TARGET = "/users";

/* Une notification doit mener a l'ecran qui permet d'agir. L'ordre compte:
   les motifs les plus precis passent avant les plus larges. */
const NOTIFICATION_TARGETS: Array<{ pattern: RegExp; href: string }> = [
  { pattern: /report|signalement/, href: "/reports" },
  { pattern: /support|ticket/, href: "/support" },
  { pattern: /kyc/, href: "/kyc" },
  { pattern: /funding|subscription|abonnement/, href: "/subscriptions" },
  { pattern: /referral|parrainage|filleul/, href: "/referrals" },
  { pattern: /token|jeton/, href: "/tokens" },
  { pattern: /revenue|earning|settlement|payment|paiement|gain/, href: "/payments" },
  { pattern: /trip_request|driver_offer|offer_accepted|demande/, href: "/trip-requests" },
  { pattern: /booking|reservation/, href: "/bookings" },
  { pattern: /trip|trajet|pickup|dropoff|interruption/, href: "/trips" },
];

const resolveNotificationTarget = (notification: AdminNotification) => {
  const type =
    typeof notification.data?.type === "string" ? notification.data.type : "";
  const haystack = `${type} ${notification.title}`.toLowerCase();
  return (
    NOTIFICATION_TARGETS.find(({ pattern }) => pattern.test(haystack))?.href ??
    null
  );
};

export const Topbar = () => {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((state) => state.ui.theme);
  const sidebarOpen = useAppSelector((state) => state.ui.sidebarOpen);
  /* La cloche doit refleter l'etat reel sans recharger la page: on interroge
     le serveur a intervalle regulier tant qu'un onglet admin est ouvert. */
  const { data: notificationsData, isLoading: isLoadingNotifications } =
    useGetNotificationsQuery(
      { limit: 20 },
      { pollingInterval: 60_000, refetchOnFocus: true }
    );
  const [markNotificationsAsRead] = useMarkNotificationsAsReadMutation();
  const [markAllNotificationsAsRead, { isLoading: isMarkingAll }] =
    useMarkAllNotificationsAsReadMutation();
  const { data: profile } = useGetCurrentUserProfileQuery();
  const [panelOpen, setPanelOpen] = useState(false);
  const [searchDraft, setSearchDraft] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  /* Le champ reflete la recherche active de la liste des utilisateurs. La
     lecture passe par l'URL du navigateur et non par useSearchParams: ce
     composant vit dans la mise en page, ou le hook ne recoit pas les
     parametres et ne se rejoue pas a la navigation. */
  useEffect(() => {
    const syncFromUrl = () => {
      setSearchDraft(
        window.location.pathname === SEARCH_TARGET
          ? new URLSearchParams(window.location.search).get("q") ?? ""
          : ""
      );
    };

    syncFromUrl();
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, [pathname]);

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const term = searchDraft.trim();
    router.push(
      term ? `${SEARCH_TARGET}?q=${encodeURIComponent(term)}` : SEARCH_TARGET
    );
  };

  const handleSearchClear = () => {
    setSearchDraft("");
    if (pathname === SEARCH_TARGET) {
      router.push(SEARCH_TARGET);
    }
  };

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
  /* L'heure affichee doit rester juste sur un onglet laisse ouvert la journee. */
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const dateLabel = formatter.format(now);

  const notifications = notificationsData?.notifications ?? [];
  const unreadCount = notificationsData?.unreadCount ?? 0;
  const relativeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("fr-CD", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }),
    []
  );
  const currentUser = profile?.user;
  const displayName = currentUser
    ? `${currentUser.firstName} ${currentUser.lastName}`.trim()
    : "Admin Zwanga";
  const roleLabel = getAdminRoleLabel(currentUser?.role);
  const initials = useMemo(() => {
    if (!currentUser) {
      return "ZA";
    }
    const first = currentUser.firstName?.trim().charAt(0) ?? "";
    const last = currentUser.lastName?.trim().charAt(0) ?? "";
    return `${first}${last}`.toUpperCase() || "ZA";
  }, [currentUser]);

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

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPanelOpen(false);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        <button
          type="button"
          className={styles.ghostButton}
          aria-label="Basculer la navigation"
          aria-controls="admin-navigation"
          aria-expanded={sidebarOpen}
          onClick={() => dispatch(toggleSidebar())}
        >
          <Menu size={18} aria-hidden="true" />
        </button>

        <div className={styles.workspaceMeta}>
          <strong>ZWANGA HQ</strong>
          <span suppressHydrationWarning>{dateLabel}</span>
        </div>

        <form className={styles.search} onSubmit={handleSearchSubmit}>
          <button
            type="submit"
            className={styles.searchSubmit}
            aria-label="Lancer la recherche"
          >
            <Search size={18} aria-hidden="true" />
          </button>
          <input
            type="search"
            name="q"
            aria-label="Rechercher un utilisateur"
            placeholder="Rechercher une personne (nom, email, téléphone)"
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
          />
          {searchDraft ? (
            <button
              type="button"
              className={styles.searchClear}
              aria-label="Effacer la recherche"
              onClick={handleSearchClear}
            >
              <X size={16} aria-hidden="true" />
            </button>
          ) : null}
        </form>
      </div>

      <div className={styles.right}>
        <Link href="/trips" className={styles.cta}>
          <Route size={16} aria-hidden="true" />
          <span>Gérer les trajets</span>
        </Link>

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

        <div ref={panelRef} className={styles.notificationWrapper}>
          <button
            type="button"
            className={`${styles.ghostButton} ${styles.notificationButton}`}
            aria-label="Notifications"
            aria-expanded={panelOpen}
            aria-controls="notification-panel"
            onClick={() => setPanelOpen((prev) => !prev)}
          >
            <Bell size={18} aria-hidden="true" />
            {unreadCount > 0 ? (
              <span className={styles.badge}>{unreadCount}</span>
            ) : null}
          </button>

          {panelOpen ? (
            <div id="notification-panel" className={styles.panel}>
              <div className={styles.panelHeader}>
                <strong>Notifications</strong>
                {unreadCount > 0 ? (
                  <button
                    type="button"
                    className={styles.panelAction}
                    onClick={() => void markAllNotificationsAsRead()}
                    disabled={isMarkingAll}
                  >
                    {isMarkingAll ? "Patientez" : "Tout marquer comme lu"}
                  </button>
                ) : null}
              </div>

              {isLoadingNotifications ? (
                <p className={styles.emptyPanel}>Chargement des notifications...</p>
              ) : notifications.length > 0 ? (
                notifications.map((notification) => {
                  const target = resolveNotificationTarget(notification);
                  return (
                    <button
                      type="button"
                      key={notification.id}
                      className={`${styles.panelItem} ${
                        notification.isRead ? "" : styles.unread
                      }`}
                      disabled={notification.isRead && !target}
                      onClick={() => {
                        if (!notification.isRead) {
                          void markNotificationsAsRead([notification.id]);
                        }
                        if (target) {
                          setPanelOpen(false);
                          router.push(target);
                        }
                      }}
                    >
                      <h4>{notification.title}</h4>
                      <p>{notification.body}</p>
                      <span>
                        {relativeFormatter.format(
                          new Date(notification.createdAt)
                        )}
                        {notification.isRead ? "" : " · non lue"}
                        {target ? " · appuyez pour ouvrir" : ""}
                      </span>
                    </button>
                  );
                })
              ) : (
                <p className={styles.emptyPanel}>
                  Aucune alerte à traiter. Le suivi courant des trajets et des
                  demandes de trajet reste dans l’application mobile.
                </p>
              )}
            </div>
          ) : null}
        </div>

        <Link href="/profile" className={styles.profile}>
          <span className={styles.avatar}>{initials}</span>
          <div className={styles.profileInfo}>
            <strong>{displayName}</strong>
            <span>{roleLabel}</span>
          </div>
        </Link>
        <button
          type="button"
          className={styles.ghostButton}
          onClick={handleLogout}
          disabled={isLoggingOut}
          aria-label="Se déconnecter"
        >
          <LogOut size={18} aria-hidden="true" />
          <span className={styles.logoutLabel}>
            {isLoggingOut ? "Patientez" : "Déconnexion"}
          </span>
        </button>
      </div>
    </header>
  );
};

