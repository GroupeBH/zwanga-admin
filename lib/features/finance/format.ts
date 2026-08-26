import type { AdminFinanceUser, CurrencyTotal } from "./types";

const integer = new Intl.NumberFormat("fr-CD", { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat("fr-CD", { maximumFractionDigits: 2 });

export const formatDateTime = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-CD", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export const formatMoney = (amount: number, currency = "CDF") =>
  `${integer.format(Number(amount ?? 0))} ${currency}`;

export const formatTokens = (amount: number, currency = "jetons") =>
  `${decimal.format(Number(amount ?? 0))} ${currency}`;

export const formatUser = (user?: AdminFinanceUser | null) => {
  if (!user) return "Utilisateur inconnu";
  return `${user.firstName} ${user.lastName}`.trim() || "Utilisateur sans nom";
};

export const formatVolumes = (totals: CurrencyTotal[]) =>
  totals.length > 0
    ? totals.map(({ amount, currency }) => formatMoney(amount, currency)).join(" · ")
    : "0 CDF";

const labels: Record<string, string> = {
  generic: "Paiement générique",
  subscription_pro: "Abonnement Pro",
  trip_booking: "Réservation",
  wallet_top_up: "Achat de jetons",
  driver_payout: "Versement conducteur",
  referral_payout: "Retrait parrainage",
  mobile_money: "Mobile Money",
  card: "Carte",
  pending: "En attente",
  initiated: "Initié",
  succeeded: "Réussi",
  failed: "Échoué",
  cancelled: "Annulé",
  available: "Disponible",
  reversed: "Annulée",
  top_up: "Achat de jetons",
  loyalty_reward: "Récompense fidélité",
  booking_payment: "Paiement réservation",
  booking_refund: "Remboursement réservation",
  booking_fare_adjustment: "Ajustement tarifaire",
  subscription_payment: "Paiement abonnement",
  subscription_reward: "Récompense abonnement",
  transfer_out: "Transfert envoyé",
  transfer_in: "Transfert reçu",
  admin_adjustment: "Ajustement admin",
};

export const financeLabel = (value?: string | null) =>
  value ? labels[value] ?? value.replaceAll("_", " ") : "—";

export const exportCsv = (
  filename: string,
  headers: string[],
  rows: Array<Array<string | number | null | undefined>>
) => {
  const escapeCell = (value: string | number | null | undefined) => {
    const text = String(value ?? "");
    return `"${text.replaceAll('"', '""')}"`;
  };
  const csv = [headers, ...rows]
    .map((row) => row.map(escapeCell).join(";"))
    .join("\n");
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};
