"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import clsx from "clsx";
import {
  AlertTriangle,
  Calendar,
  CreditCard,
  LayoutDashboard,
  LifeBuoy,
  Route,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";

import { useGetPendingKycsQuery } from "@/lib/features/kyc/kycApi";
import { useGetReportsQuery } from "@/lib/features/reports/reportsApi";
import { useGetAllTripsQuery } from "@/lib/features/trips/tripsApi";
import { useAppSelector } from "@/lib/hooks";

import styles from "./Sidebar.module.css";

const navItems = [
  {
    label: "Tableau de bord",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Utilisateurs",
    href: "/users",
    icon: Users,
  },
  {
    label: "Validation KYC",
    href: "/kyc",
    icon: ShieldCheck,
    badgeKey: "kyc",
  },
  {
    label: "Trajets",
    href: "/rides",
    icon: Route,
  },
  {
    label: "Réservations",
    href: "/bookings",
    icon: Calendar,
    badgeKey: "bookings",
  },
  {
    label: "Abonnements",
    href: "/subscriptions",
    icon: CreditCard,
  },
  {
    label: "Signalements",
    href: "/reports",
    icon: AlertTriangle,
    badgeKey: "reports",
  },
  {
    label: "Support",
    href: "/support",
    icon: LifeBuoy,
  },
  {
    label: "Paramètres",
    href: "/settings",
    icon: Settings,
  },
  {
    label: "Profil admin",
    href: "/profile",
    icon: UserRound,
  },
];

export const Sidebar = () => {
  const pathname = usePathname();
  const sidebarOpen = useAppSelector((state) => state.ui.sidebarOpen);
  const { data: reports } = useGetReportsQuery();
  const { data: kyc } = useGetPendingKycsQuery();
  const { data: tripsData } = useGetAllTripsQuery({ page: 1, limit: 100 });

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
    return undefined;
  };

  return (
    <aside
      className={clsx(styles.sidebar, {
        [styles.collapsed]: !sidebarOpen,
      })}
    >
      <div className={styles.brand}>
        <div className={styles.logo}>
          <span>zwanga</span>
          <span>Backoffice</span>
        </div>
        <span className={styles.badge}>v1.4</span>
      </div>

      <div>
        <p className={styles.groupLabel}>Navigation</p>
        <nav className={styles.nav}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname?.startsWith(item.href));
            const badgeValue = getBadge(item.badgeKey);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(styles.link, {
                  [styles.active]: active,
                })}
              >
                <Icon aria-hidden="true" />
                <span>{item.label}</span>
                {typeof badgeValue === "number" && badgeValue > 0 ? (
                  <span className={styles.pill}>{badgeValue}</span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className={styles.upgrade}>
        <span>Performance live</span>
        <strong>
          Carte Kinshasa
          <br /> temps réel
        </strong>
        <button type="button">Activer la carte</button>
      </div>
    </aside>
  );
};

