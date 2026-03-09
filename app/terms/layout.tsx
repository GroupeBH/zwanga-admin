import type { Metadata } from "next";
import type { ReactNode } from "react";

interface Props {
  readonly children: ReactNode;
}

export const metadata: Metadata = {
  title: "Conditions d'utilisation",
  description:
    "Conditions d'utilisation de Zwanga, application de transport et covoiturage a Kinshasa.",
};

export default function TermsLayout({ children }: Props) {
  return children;
}
