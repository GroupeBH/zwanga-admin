export const STORE_DOWNLOAD_REFRESH = {
  pollingInterval: 15000,
  skipPollingIfUnfocused: true,
  refetchOnFocus: true,
  refetchOnReconnect: true,
  refetchOnMountOrArgChange: true,
} as const;

/** Counts are kept as decimal strings by PostgreSQL, including very large ones. */
export function formatStoreCount(value: string | null | undefined) {
  if (value == null || !/^\d+(?:\.0+)?$/.test(value)) return "Indisponible";
  return BigInt(value.split(".")[0]).toLocaleString("fr-CD");
}

export function storeDailyValues(
  from: string,
  to: string,
  points: { date: string; value: string }[],
) {
  const count = Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1;
  if (!Number.isFinite(count) || count < 1 || count > 93) return [];
  const values = new Map(
    points
      .filter(
        (p) =>
          p.value !== "" &&
          Number.isFinite(Number(p.value)) &&
          Number(p.value) >= 0,
      )
      .map((p) => [p.date, Number(p.value)]),
  );
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(Date.parse(from) + i * 86400000)
      .toISOString()
      .slice(0, 10);
    return { date, value: values.get(date) ?? null };
  });
}
