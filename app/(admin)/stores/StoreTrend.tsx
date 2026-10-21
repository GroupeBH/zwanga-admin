"use client";
import { CHART_COLORS } from "@/app/components/charts/Charts";
import { storeDailyValues } from "@/lib/features/stores/storePresentation";
export function StoreTrend({
  from,
  to,
  points,
}: {
  from: string;
  to: string;
  points: { date: string; value: string }[];
}) {
  const series = storeDailyValues(from, to, points),
    count = series.length;
  if (!points.length || !count)
    return (
      <p>Aucune donnée disponible pour cet indicateur et cette période.</p>
    );
  const values = new Map(
      series.filter((p) => p.value !== null).map((p) => [p.date, p.value!]),
    ),
    max = Math.max(1, ...values.values());
  const dates = series.map((p) => p.date);
  let path = "",
    previous = false;
  dates.forEach((d, i) => {
    const value = values.get(d);
    if (value === undefined) {
      previous = false;
      return;
    }
    path += `${previous ? "L" : "M"}${40 + (i / Math.max(count - 1, 1)) * 620},${200 - (value / max) * 160} `;
    previous = true;
  });
  return (
    <figure>
      <svg
        viewBox="0 0 700 240"
        role="img"
        aria-label="Évolution journalière ; les interruptions représentent des données indisponibles"
        style={{ width: "100%", maxHeight: 300 }}
      >
        <line
          x1="40"
          x2="660"
          y1="200"
          y2="200"
          stroke="currentColor"
          opacity=".2"
        />
        <text x="0" y="45" fill="currentColor" fontSize="12">
          {max.toLocaleString("fr-CD")}
        </text>
        <path
          d={path}
          fill="none"
          stroke={CHART_COLORS.orange}
          strokeWidth="3"
        />
        {dates.map((d, i) => {
          const v = values.get(d);
          return v === undefined ? null : (
            <circle
              key={d}
              cx={40 + (i / Math.max(count - 1, 1)) * 620}
              cy={200 - (v / max) * 160}
              r="3"
              fill={CHART_COLORS.orange}
            >
              <title>
                {d} : {v}
              </title>
            </circle>
          );
        })}
        <text x="40" y="230" fill="currentColor" fontSize="12">
          {from}
        </text>
        <text
          x="660"
          y="230"
          textAnchor="end"
          fill="currentColor"
          fontSize="12"
        >
          {to}
        </text>
      </svg>
      <figcaption>
        Valeurs des jours disponibles uniquement ; les lacunes ne sont pas
        interpolées.
      </figcaption>
    </figure>
  );
}
