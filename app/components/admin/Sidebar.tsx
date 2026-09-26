"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import clsx from "clsx";
import {
  AlertTriangle,
  BadgeDollarSign,
  Calendar,
  ClipboardList,
  Coins,
  Crown,
  LayoutDashboard,
  LifeBuoy,
  Route,
  Settings,
  Share2,
  ShieldCheck,
  UserPlus,
  UserRound,
  Users,
  X,
} from "lucide-react";

import { useGetPendingKycsQuery } from "@/lib/features/kyc/kycApi";
import { useGetReportsQuery } from "@/lib/features/reports/reportsApi";
import { useGetDocumentFundingRequestsQuery } from "@/lib/features/subscriptions/subscriptionsApi";
import { useGetAllTripsQuery } from "@/lib/features/trips/tripsApi";
import { useGetAllTripRequestsQuery } from "@/lib/features/tripRequests/tripRequestsApi";
import { setSidebarOpen } from "@/lib/features/ui/uiSlice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";

import styles from "./Sidebar.module.css";

const navGroups = [
  {
    label: "Opérations",
    items: [
      { label: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard },
      { label: "Utilisateurs", href: "/users", icon: Users },
      { label: "Validation KYC", href: "/kyc", icon: ShieldCheck, badgeKey: "kyc" },
      { label: "Trajets", href: "/trips", icon: Route },
      { label: "Demandes de trajet", href: "/trip-requests", icon: ClipboardList, badgeKey: "tripRequests" },
      { label: "Réservations", href: "/bookings", icon: Calendar, badgeKey: "bookings" },
      { label: "Candidatures agents", href: "/candidatures", icon: UserPlus },
    ],
  },
  {
    label: "Finance",
    items: [
      { label: "Paiements", href: "/payments", icon: BadgeDollarSign },
      { label: "Zwanga Services", href: "/pro-services", icon: ClipboardList },
      { label: "Jetons", href: "/tokens", icon: Coins },
      { label: "Parrainage", href: "/referrals", icon: Share2 },
      { label: "Abonnements", href: "/subscriptions", icon: Crown, badgeKey: "subscriptions" },
    ],
  },
  {
    label: "Assistance",
    items: [
      { label: "Signalements", href: "/reports", icon: AlertTriangle, badgeKey: "reports" },
      { label: "Support", href: "/support", icon: LifeBuoy },
    ],
  },
  {
    label: "Compte",
    items: [
      { label: "Paramètres", href: "/settings", icon: Settings },
      { label: "Profil admin", href: "/profile", icon: UserRound },
    ],
  },
];

interface SidebarProps {
  readonly isCompactViewport: boolean;
}

export const Sidebar = ({ isCompactViewport }: SidebarProps) => {
  const dispatch = useAppDispatch();
  const pathname = usePathname();
  const sidebarOpen = useAppSelector((state) => state.ui.sidebarOpen);
  /* Le badge annonce les signalements a traiter: le filtre serveur evite de
     rapatrier tout l'historique pour n'en compter qu'une partie. */
  const { data: pendingReports } = useGetReportsQuery({
    status: "pending",
    limit: 1,
  });
  const { data: kyc } = useGetPendingKycsQuery();
  const { data: fundingRequests } = useGetDocumentFundingRequestsQuery();
  const { data: tripsData } = useGetAllTripsQuery({ page: 1, limit: 100 });
  const { data: tripRequestsData } = useGetAllTripRequestsQuery({
    page: 1,
    limit: 100,
    status: "all",
  });

  const pendingBookingsCount = useMemo(() => {
    const trips = Array.isArray(tripsData) ? tripsData : [];
    return trips.reduce((count, trip) => {
      const pendingInTrip =
        trip.bookings?.filter((booking) => booking.status === "pending")
          ?.length ?? 0;
      return count + pendingInTrip;
    }, 0);
  }, [tripsData]);

  const getBadge = (key?: string) => {
    if (key === "reports") {
      return pendingReports?.total ?? 0;
    }
    if (key === "kyc") {
      return (
        (Array.isArray(kyc) ? kyc : []).filter(
          (item) => item.status === "pending"
        ).length ?? 0
      );
    }
    if (key === "bookings") {
      return pendingBookingsCount;
    }
    if (key === "tripRequests") {
      const tripRequests = Array.isArray(tripRequestsData?.tripRequests)
        ? tripRequestsData.tripRequests
        : [];
      return tripRequests.filter(
        (item) => item.status === "pending" || item.status === "offers_received"
      ).length;
    }
    if (key === "subscriptions") {
      return (Array.isArray(fundingRequests) ? fundingRequests : []).filter(
        (item) => item.status === "pending"
      ).length;
    }
    return undefined;
  };

  // Un simple nombre a cote d'un onglet n'indique pas ce qu'il compte.
  const describeBadge = (key: string | undefined, value: number) => {
    if (key === "reports") return `${value} signalement(s) à traiter`;
    if (key === "kyc") return `${value} dossier(s) KYC en attente`;
    if (key === "bookings") return `${value} réservation(s) en attente`;
    if (key === "tripRequests") return `${value} demande(s) de trajet à suivre`;
    if (key === "subscriptions") {
      return `${value} demande(s) de financement en attente`;
    }
    return `${value} élément(s) à traiter`;
  };

  const closeCompactNavigation = () => {
    if (isCompactViewport) {
      dispatch(setSidebarOpen(false));
    }
  };

  return (
    <aside
      id="admin-navigation"
      className={clsx(styles.sidebar, {
        [styles.collapsed]: !sidebarOpen,
      })}
      aria-label="Navigation de l'administration"
      aria-hidden={isCompactViewport && !sidebarOpen}
    >
      <div className={styles.brand}>
        <div className={styles.logo}>
          <span>zwanga</span>
          <span>Backoffice</span>
        </div>
        <span className={styles.badge}>v1.5</span>
        <button
          type="button"
          className={styles.closeButton}
          aria-label="Fermer la navigation"
          onClick={() => dispatch(setSidebarOpen(false))}
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>

      <nav className={styles.navigation} aria-label="Navigation principale">
        {navGroups.map((group) => (
          <div key={group.label} className={styles.navGroup}>
            <p className={styles.groupLabel}>{group.label}</p>
            <div className={styles.nav}>
              {group.items.map((item) => {
                const Icon = item.icon;
                const active =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname?.startsWith(item.href));
                const badgeValue = getBadge(item.badgeKey);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={clsx(styles.link, { [styles.active]: active })}
                    tabIndex={isCompactViewport && !sidebarOpen ? -1 : undefined}
                    onClick={closeCompactNavigation}
                  >
                    <Icon aria-hidden="true" />
                    <span>{item.label}</span>
                    {typeof badgeValue === "number" && badgeValue > 0 ? (
                      <span
                        className={styles.pill}
                        title={describeBadge(item.badgeKey, badgeValue)}
                        aria-label={describeBadge(item.badgeKey, badgeValue)}
                      >
                        {badgeValue}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Ce bloc annoncait une carte temps reel inexistante: il rappelle
          maintenant ou trouver de l'aide sur chaque ecran. */}
      <div className={styles.statusPanel}>
        <span>Besoin d’aide ?</span>
        <strong>
          Une explication
          <br /> sur chaque page
        </strong>
        <small>
          Les chiffres à côté des onglets indiquent ce qui reste à traiter.
        </small>
      </div>
    </aside>
  );
};

