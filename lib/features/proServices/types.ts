export interface Offering {
  code: string;
  name: string;
  description: string;
  availability: "open" | "paused" | "coming_soon";
  engagementEnabled: boolean;
  documentOptions: { code: string; label: string }[];
  terms: {
    version: string;
    text: string;
    validationReference: string;
    custodyCodes: string[];
  } | null;
}
export interface CaseRow {
  id: string;
  fullName: string;
  serviceCode: string;
  status: string;
  createdAt: string;
  customerMessage: string;
}
export interface Quote {
  version: number;
  currency: "CDF" | "USD";
  totalMinor: number;
  depositMinor: number;
  providerName: string;
  description: string;
  validUntil: string;
  installments: { dueDate: string; amountMinor: number }[];
  retainedDocuments: { code: string; label: string }[];
  terms: Offering["terms"];
}
export interface ServiceCase extends CaseRow {
  ownerId: string | null;
  origin: string;
  acceptedAt: string | null;
  canAccept: boolean;
  quote: Quote | null;
  application: {
    fullName: string;
    phone: string;
    vehicleDescription: string;
    plate: string;
    description: string;
    documents: string[];
  };
  finances: {
    currency: string | null;
    fundedMinor: number;
    repaidMinor: number;
    depositPaidMinor: number;
    balanceMinor: number;
    settled: boolean;
  };
  ledger: {
    id: string;
    kind: string;
    amountMinor: number;
    currency: string;
    reference: string;
    evidence: string;
    createdAt: string;
  }[];
  documents: {
    id: string;
    code: string;
    label: string;
    status: string;
    storageLocation: string;
    receipt: string;
    returnReceipt: string;
  }[];
  events: { id: string; action: string; createdAt: string }[];
}
export const labels: Record<string, string> = {
  submitted: "Reçue",
  reviewing: "En étude",
  needs_info: "À compléter",
  quoted: "Devis proposé",
  accepted: "Accepté",
  processing: "En traitement",
  ready: "À remettre",
  completed: "Terminé",
  rejected: "Refusé",
  cancelled: "Annulé",
  deposit: "Apport",
  funding: "Avance au prestataire",
  repayment: "Remboursement",
  expected: "Prévu",
  held: "Conservé",
  release_ready: "À restituer",
  returned: "Restitué",
};
export const amount = (minor: number, currency = "CDF") =>
  `${(minor / 100).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} ${currency}`;
export function minor(value: string): number {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(normalized))
    throw new Error("Montant invalide (maximum deux décimales).");
  const [units, fraction = ""] = normalized.split(".");
  const result = Number(units) * 100 + Number(fraction.padEnd(2, "0"));
  if (result > 1_000_000_000) throw new Error("Montant trop élevé.");
  return result;
}
