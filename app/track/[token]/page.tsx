import type { Metadata } from "next";

import { TripTrackingClient } from "./TripTrackingClient";

interface Props {
  readonly params: Promise<{
    readonly token: string;
  }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Suivi de trajet | Zwanga",
    description: "Suivi public d'un trajet Zwanga en cours.",
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function PublicTripTrackingPage({ params }: Props) {
  const { token } = await params;

  return <TripTrackingClient token={token} />;
}
