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
