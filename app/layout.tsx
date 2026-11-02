import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";

import { StoreProvider } from "./StoreProvider";
import { ThemeWatcher } from "./components/theme/ThemeWatcher";
import { AuthGuard } from "./components/auth/AuthGuard";
import { NavigationLoader } from "./components/navigation/NavigationLoader";

import "./styles/globals.css";

interface Props {
  readonly children: ReactNode;
}

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Plateforme privée, accessible uniquement par lien : aucun référencement.
export const metadata: Metadata = {
  title: {
    default: "Zwanga Partenaires",
    template: "%s | Zwanga",
  },
  applicationName: "Zwanga",
  manifest: "/manifest.webmanifest",
  referrer: "no-referrer",
  icons: {
    icon: "/icon.ico",
    shortcut: "/icon.ico",
    apple: "/zwanga.png",
  },
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      "max-snippet": 0,
      "max-image-preview": "none",
      "max-video-preview": 0,
    },
  },
};

export default function RootLayout({ children }: Props) {
  return (
    <StoreProvider>
      <html lang="fr" className={inter.variable} suppressHydrationWarning>
        <body suppressHydrationWarning>
          <ThemeWatcher />
          <NavigationLoader />
          <AuthGuard>{children}</AuthGuard>
        </body>
      </html>
    </StoreProvider>
  );
}
