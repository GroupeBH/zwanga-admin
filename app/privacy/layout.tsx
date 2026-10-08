import type { Metadata } from "next";
import type { ReactNode } from "react";

interface Props {
  readonly children: ReactNode;
}

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description:
    "Politique de confidentialité de Zwanga, application de covoiturage Kinshasa pour passager et conducteur.",
};

export default function PrivacyLayout({ children }: Props) {
  return children;
}
