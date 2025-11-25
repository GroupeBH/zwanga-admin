import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";

import { StoreProvider } from "./StoreProvider";
import { ThemeWatcher } from "./components/theme/ThemeWatcher";
import { AuthGuard } from "./components/auth/AuthGuard";

import "./styles/globals.css";

interface Props {
  readonly children: ReactNode;
}

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ZWANGA Admin",
  description: "Backoffice administrateur pour la plateforme de covoiturage.",
};

export default function RootLayout({ children }: Props) {
  return (
    <StoreProvider>
      <html lang="fr" className={inter.variable} suppressHydrationWarning>
        <body suppressHydrationWarning>
          <ThemeWatcher />
          <AuthGuard>{children}</AuthGuard>
        </body>
      </html>
    </StoreProvider>
  );
}
