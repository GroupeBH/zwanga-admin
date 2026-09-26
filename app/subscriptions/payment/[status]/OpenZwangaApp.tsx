"use client";

import { useEffect } from "react";

interface Props {
  readonly status: string;
  readonly path?: string;
}

export function OpenZwangaApp({ status, path = "subscriptions/payment" }: Props) {
  const appUrl = `zwanga://${path}?status=${encodeURIComponent(status)}`;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.location.href = appUrl;
    }, 500);

    return () => window.clearTimeout(timer);
  }, [appUrl]);

  return (
    <a
      href={appUrl}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 48,
        borderRadius: 8,
        padding: "0 18px",
        background: "#0f8b57",
        color: "#fff",
        fontWeight: 700,
        textDecoration: "none",
      }}
    >
      Retourner dans l'application Zwanga
    </a>
  );
}
