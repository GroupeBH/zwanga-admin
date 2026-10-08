import type { Metadata } from "next";
import type { ReactNode } from "react";

interface Props {
  readonly children: ReactNode;
}

export const metadata: Metadata = {
  title: "Politique de vente",
  description:
    "Politique de vente et services Zwanga pour la publication, réservation et gestion de trajet sécurisé.",
};

export default function SalesPolicyLayout({ children }: Props) {
  return children;
}
