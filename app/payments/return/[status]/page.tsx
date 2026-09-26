import type { Metadata } from "next";

import { OpenZwangaApp } from "../../../subscriptions/payment/[status]/OpenZwangaApp";

const RETURN_COPY: Record<string, { title: string; message: string; tone: string }> = {
  success: {
    title: "Paiement reçu",
    message:
      "Retournez dans l'application Zwanga. Le statut définitif est confirmé par FlexPay ou PawaPay.",
    tone: "#0f8b57",
  },
  failed: {
    title: "Paiement non abouti",
    message:
      "Vous pouvez revenir dans l'application Zwanga pour relancer le paiement.",
    tone: "#b42318",
  },
};

interface Props {
  readonly params: Promise<{
    readonly status: string;
  }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { status } = await params;
  const copy = RETURN_COPY[normalizeStatus(status)];

  return {
    title: `${copy.title} | Zwanga`,
    robots: { index: false, follow: false },
  };
}

export default async function PaymentReturnPage({ params }: Props) {
  const { status } = await params;
  const normalizedStatus = normalizeStatus(status);
  const copy = RETURN_COPY[normalizedStatus];

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "linear-gradient(180deg, rgba(15,139,87,0.08), rgba(255,255,255,1) 42%)",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: 520,
          border: "1px solid rgba(15, 23, 42, 0.08)",
          borderRadius: 8,
          padding: 28,
          background: "#fff",
          boxShadow: "0 20px 60px rgba(15, 23, 42, 0.10)",
          textAlign: "center",
        }}
      >
        <p style={{ margin: "0 0 12px", color: copy.tone, fontSize: 13, fontWeight: 700, textTransform: "uppercase" }}>
          Zwanga
        </p>
        <h1 style={{ margin: "0 0 12px", color: "#111827", fontSize: 30, lineHeight: 1.15 }}>{copy.title}</h1>
        <p style={{ margin: "0 auto 24px", maxWidth: 420, color: "#4b5563", fontSize: 16, lineHeight: 1.6 }}>
          {copy.message}
        </p>
        <OpenZwangaApp status={normalizedStatus} path="payments/return" />
      </section>
    </main>
  );
}

function normalizeStatus(status: string): keyof typeof RETURN_COPY {
  return status === "success" ? "success" : "failed";
}
