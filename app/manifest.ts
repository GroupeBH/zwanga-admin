import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Zwanga Partenaires",
    short_name: "Zwanga",
    description: "Espace réservé aux partenaires et administrateurs Zwanga.",
    start_url: "/login",
    display: "standalone",
    background_color: "#f8fbff",
    theme_color: "#ff7a00",
    icons: [
      {
        src: "/zwanga.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icon.ico",
        sizes: "64x64",
        type: "image/x-icon",
      },
    ],
  };
}
