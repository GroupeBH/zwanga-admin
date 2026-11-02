import type { MetadataRoute } from "next";

// Plateforme privée : aucune page ne doit être explorée ni indexée.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        disallow: "/",
      },
    ],
  };
}
