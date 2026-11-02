import type { Metadata } from "next";
import type { ReactNode } from "react";

interface Props {
  readonly children: ReactNode;
}

export const metadata: Metadata = {
  title: "Politique de confidentialité",
};

export default function PrivacyLayout({ children }: Props) {
  return children;
}
