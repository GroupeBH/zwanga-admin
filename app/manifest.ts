import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Zwanga",
    short_name: "Zwanga",
    description: "Application de transport et covoiturage Kinshasa.",
    start_url: "/",
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
