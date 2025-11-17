import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";

import { StoreProvider } from "./StoreProvider";
import { ThemeWatcher } from "./components/theme/ThemeWatcher";

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
      <html lang="fr" className={inter.variable}>
        <body>
          <ThemeWatcher />
          {children}
        </body>
      </html>
    </StoreProvider>
  );
}
