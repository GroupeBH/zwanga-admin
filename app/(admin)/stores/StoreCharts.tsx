"use client";
/* Couleurs et libelles propres aux stores; les graphiques eux-memes sont
   partages dans app/components/charts/DataCharts. */
export * from "@/app/components/charts/DataCharts";

export const PLATFORM_COLOR = {
  google: "var(--store-google)",
  apple: "var(--store-apple)",
} as const;
export const ZWANGA_COLOR = "var(--store-zwanga)";
export const PLATFORM_LABEL = { google: "Google Play", apple: "App Store" } as const;
