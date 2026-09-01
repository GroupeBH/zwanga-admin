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
      { label: "Trajets", href: "/rides", icon: Route },
      { label: "Demandes de trajet", href: "/trip-requests", icon: ClipboardList, badgeKey: "tripRequests" },
      { label: "Réservations", href: "/bookings", icon: Calendar, badgeKey: "bookings" },
    ],
  },
  {
    label: "Finance",
    items: [
      { label: "Paiements", href: "/payments", icon: BadgeDollarSign },
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
  const { data: reports } = useGetReportsQuery();
  const { data: kyc } = useGetPendingKycsQuery();
  const { data: fundingRequests } = useGetDocumentFundingRequestsQuery();
  const { data: tripsData } = useGetAllTripsQuery({ page: 1, limit: 100 });
  const { data: tripRequestsData } = useGetAllTripRequestsQuery({
    page: 1,
    limit: 100,
    status: "all",
  });

  const pendingBookingsCount = useMemo(() => {
    const trips = tripsData ?? [];
    return trips.reduce((count: any, trip: any) => {
      const pendingInTrip = trip.bookings?.filter((b: any) => b.status === "pending")?.length ?? 0;
      return count + pendingInTrip;
    }, 0);
  }, [tripsData]);

  const getBadge = (key?: string) => {
    if (key === "reports") {
      return reports?.length ?? 0;
    }
    if (key === "kyc") {
      return kyc?.filter((item) => item.status === "pending").length ?? 0;
    }
    if (key === "bookings") {
      return pendingBookingsCount;
    }
    if (key === "tripRequests") {
      return (
        tripRequestsData?.tripRequests.filter(
          (item) => item.status === "pending" || item.status === "offers_received"
        ).length ?? 0
      );
    }
    if (key === "subscriptions") {
      return fundingRequests?.filter((item) => item.status === "pending").length ?? 0;
    }
    return undefined;
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
                      <span className={styles.pill}>{badgeValue}</span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className={styles.statusPanel}>
        <span>Performance live</span>
        <strong>
          Carte Kinshasa
          <br /> temps réel
        </strong>
        <small>Disponible depuis le tableau de bord</small>
      </div>
    </aside>
  );
};

