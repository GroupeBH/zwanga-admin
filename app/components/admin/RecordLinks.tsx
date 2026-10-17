import Link from "next/link";
import type { ReactNode } from "react";

import shared from "@/app/(admin)/styles/page.module.css";

interface RecordLinkProps {
  readonly href?: string | null;
  readonly children: ReactNode;
}

export const RecordLink = ({ href, children }: RecordLinkProps) => {
  if (!href) {
    return <>{children}</>;
  }

  return (
    <Link href={href} className={shared.textLink}>
      {children}
    </Link>
  );
};

export const userFicheHref = (userId?: string | null, listPath = "/users") =>
  userId ? `${listPath}?fiche=${encodeURIComponent(userId)}` : null;

export const tripFicheHref = (tripId?: string | null) =>
  tripId ? `/trips?fiche=${encodeURIComponent(tripId)}` : null;

export const reportsSearchHref = (query?: string | null) => {
  const value = query?.trim();
  return value ? `/reports?q=${encodeURIComponent(value)}` : "/reports";
};

export const supportUserHref = (userId?: string | null) =>
  userId ? `/support?userId=${encodeURIComponent(userId)}` : "/support";
