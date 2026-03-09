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

const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://zwanga.cd";
const siteUrl =
  rawSiteUrl.startsWith("http://") || rawSiteUrl.startsWith("https://")
    ? rawSiteUrl
    : `https://${rawSiteUrl}`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Zwanga | Covoiturage Kinshasa et trajet securise",
    template: "%s | Zwanga",
  },
  description:
    "Zwanga est une application de transport de covoiturage Kinshasa. Trouvez un conducteur ou proposez un trajet securise au quotidien.",
  applicationName: "Zwanga",
  manifest: "/manifest.webmanifest",
  keywords: [
    "Zwanga",
    "covoiturage Kinshasa",
    "trajet securise",
    "application de transport",
    "conducteur",
    "passager",
  ],
  authors: [{ name: "Zwanga" }],
  creator: "Zwanga",
  publisher: "Zwanga",
  category: "transport",
  icons: {
    icon: "/icon.ico",
    shortcut: "/icon.ico",
    apple: "/zwanga.png",
  },
  openGraph: {
    title: "Zwanga | Covoiturage Kinshasa",
    description:
      "Application de transport locale a Kinshasa pour passagers et conducteurs avec suivi en direct et outils de securite.",
    url: siteUrl,
    siteName: "Zwanga",
    locale: "fr_CD",
    type: "website",
    images: [
      {
        url: "/zwanga.png",
        width: 512,
        height: 512,
        alt: "Logo Zwanga",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Zwanga | Covoiturage Kinshasa",
    description:
      "Covoiturage urbain a Kinshasa: passager et conducteur sur la meme application, avec trajet securise.",
    images: ["/zwanga.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-video-preview": -1,
      "max-snippet": -1,
    },
  },
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
