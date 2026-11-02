import type { Metadata } from "next";
import type { ReactNode } from "react";

interface Props {
  readonly children: ReactNode;
}

export const metadata: Metadata = {
  title: "Conditions d'utilisation",
};

export default function TermsLayout({ children }: Props) {
  return children;
}
