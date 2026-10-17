"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { isMarketerRole } from "@/lib/features/auth/adminRoles";
import { useGetPendingKycsQuery } from "@/lib/features/kyc/kycApi";
import { useGetCurrentUserProfileQuery } from "@/lib/features/profile/profileApi";
import { useGetReportsQuery } from "@/lib/features/reports/reportsApi";
import { useGetDocumentFundingRequestsQuery } from "@/lib/features/subscriptions/subscriptionsApi";
import { useGetAllTripsQuery } from "@/lib/features/trips/tripsApi";
import { useGetAllTripRequestsQuery } from "@/lib/features/tripRequests/tripRequestsApi";
import { setSidebarOpen } from "@/lib/features/ui/uiSlice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";

import styles from "./Sidebar.module.css";
import { isNavItemActive, marketerGroups, navGroups, type BadgeKey } from "./navigation";
import { X } from "lucide-react";

interface SidebarProps {
  readonly isCompactViewport: boolean;
}

export const Sidebar = ({ isCompactViewport }: SidebarProps) => {
  const dispatch = useAppDispatch();
  const pathname = usePathname();
  const [search, setSearch] = useState("");
  const sidebarOpen = useAppSelector((state) => state.ui.sidebarOpen);

  useEffect(() => {
    setSearch(window.location.search);
  }, [pathname]);
  const { data: profile } = useGetCurrentUserProfileQuery();
  const marketer = isMarketerRole(profile?.user.role);
  const groups = marketer ? marketerGroups : navGroups;
  /* Le badge annonce les signalements a traiter: le filtre serveur evite de
     rapatrier tout l'historique pour n'en compter qu'une partie. */
  const { data: pendingReports } = useGetReportsQuery(
    {
      status: "pending",
      limit: 1,
    },
    { skip: marketer }
  );
  const { data: kyc } = useGetPendingKycsQuery(undefined, { skip: marketer });
  const { data: fundingRequests } = useGetDocumentFundingRequestsQuery(undefined, {
    skip: marketer,
  });
  const { data: tripsData } = useGetAllTripsQuery(
    { page: 1, limit: 100 },
    { skip: marketer }
  );
  const { data: tripRequestsData } = useGetAllTripRequestsQuery(
    {
      page: 1,
      limit: 100,
      status: "all",
    },
    { skip: marketer }
  );

  const pendingBookingsCount = useMemo(() => {
    const trips = Array.isArray(tripsData) ? tripsData : [];
    return trips.reduce((count, trip) => {
      const pendingInTrip =
        trip.bookings?.filter((booking) => booking.status === "pending")
          ?.length ?? 0;
      return count + pendingInTrip;
    }, 0);
  }, [tripsData]);

  const getBadge = (key?: BadgeKey) => {
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
  const describeBadge = (key: BadgeKey | undefined, value: number) => {
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
        <span className={styles.mark} aria-hidden="true">z</span>
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
        {groups.map((group) => (
          <div key={group.label} className={styles.navGroup}>
            <p className={styles.groupLabel}>{group.label}</p>
            <div className={styles.nav}>
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isNavItemActive(item, pathname, search);
                const badgeValue = getBadge(item.badgeKey);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={clsx(styles.link, { [styles.active]: active })}
                    aria-current={active ? "page" : undefined}
                    tabIndex={isCompactViewport && !sidebarOpen ? -1 : undefined}
                    onClick={() => {
                      const query = item.href.split("#")[0].split("?")[1];
                      setSearch(query ? `?${query}` : "");
                      closeCompactNavigation();
                    }}
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

