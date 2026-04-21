import type { Metadata } from "next";

import { OpenZwangaApp } from "./OpenZwangaApp";

const PAYMENT_STATUS_COPY: Record<
  string,
  { title: string; message: string; tone: string }
> = {
  success: {
    title: "Paiement recu",
    message:
      "Retournez dans l'application Zwanga pour verifier FlexPay et activer votre abonnement conducteur.",
    tone: "#0f8b57",
  },
  cancel: {
    title: "Paiement annule",
    message:
      "Vous pouvez revenir dans l'application Zwanga pour relancer le paiement ou choisir un autre moyen.",
    tone: "#946200",
  },
  decline: {
    title: "Paiement refuse",
    message:
      "Votre paiement carte n'a pas abouti. Revenez dans l'application Zwanga pour essayer a nouveau.",
    tone: "#b42318",
  },
};

interface Props {
  readonly params: {
    readonly status: string;
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const normalizedStatus = normalizeStatus(params.status);
  const copy = PAYMENT_STATUS_COPY[normalizedStatus];

  return {
    title: `${copy.title} | Zwanga`,
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default function SubscriptionPaymentReturnPage({ params }: Props) {
  const normalizedStatus = normalizeStatus(params.status);
  const copy = PAYMENT_STATUS_COPY[normalizedStatus];

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background:
          "linear-gradient(180deg, rgba(15,139,87,0.08), rgba(255,255,255,1) 42%)",
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
        <p
          style={{
            margin: "0 0 12px",
            color: copy.tone,
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: 0,
            textTransform: "uppercase",
          }}
        >
          FlexPay
        </p>
        <h1
          style={{
            margin: "0 0 12px",
            color: "#111827",
            fontSize: 30,
            lineHeight: 1.15,
          }}
        >
          {copy.title}
        </h1>
        <p
          style={{
            margin: "0 auto 24px",
            maxWidth: 420,
            color: "#4b5563",
            fontSize: 16,
            lineHeight: 1.6,
          }}
        >
          {copy.message}
        </p>
        <OpenZwangaApp status={normalizedStatus} />
      </section>
    </main>
  );
}

function normalizeStatus(status: string): keyof typeof PAYMENT_STATUS_COPY {
  return status in PAYMENT_STATUS_COPY ? status : "decline";
}
