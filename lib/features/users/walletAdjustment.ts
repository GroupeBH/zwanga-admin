export interface WalletAdjustmentIntent {
  requestId: string;
  userId: string;
  amount: number;
  reason: string;
}

export function adjustmentError(
  amount: number,
  reason: string,
  balance: number,
): string | null {
  if (
    !Number.isFinite(amount) ||
    amount === 0 ||
    Math.abs(amount) > 1_000_000 ||
    Math.round(amount * 100) / 100 !== amount
  ) {
    return "Indiquez entre 0,01 et 1 000 000 jetons, avec deux décimales maximum.";
  }
  // Leave room for the actor identifier in the backend's 500-character audit entry.
  if (reason.trim().length < 10 || reason.trim().length > 400)
    return "Le motif doit contenir entre 10 et 400 caractères.";
  if (amount < 0 && balance + amount < 0)
    return "Le nombre de jetons à retirer dépasse le solde disponible.";
  return null;
}

export function readAdjustmentIntent(
  raw: string | null,
  userId: string,
): WalletAdjustmentIntent | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as WalletAdjustmentIntent;
    if (
      value.userId !== userId ||
      typeof value.requestId !== "string" ||
      !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(
        value.requestId,
      ) ||
      typeof value.reason !== "string" ||
      typeof value.amount !== "number"
    )
      return null;
    return adjustmentError(value.amount, value.reason, Number.MAX_SAFE_INTEGER)
      ? null
      : value;
  } catch {
    return null;
  }
}
