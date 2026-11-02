import type { Metadata } from "next";
import type { ReactNode } from "react";

interface Props {
  readonly children: ReactNode;
}

export const metadata: Metadata = {
  title: "Accès partenaires",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default function LoginLayout({ children }: Props) {
  return children;
}
