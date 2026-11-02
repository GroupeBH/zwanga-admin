import type { Metadata } from "next";
import type { ReactNode } from "react";

interface Props {
  readonly children: ReactNode;
}

export const metadata: Metadata = {
  title: "Politique de vente",
};

export default function SalesPolicyLayout({ children }: Props) {
  return children;
}
