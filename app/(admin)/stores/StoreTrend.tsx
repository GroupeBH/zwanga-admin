"use client";
import { storeDailyValues } from "@/lib/features/stores/storePresentation";
import { GapLineChart } from "./StoreCharts";
export function StoreTrend({
  from,
  to,
  points,
  label = "Évolution journalière",
}: {
  from: string;
  to: string;
  points: { date: string; value: string }[];
  label?: string;
}) {
  const series = storeDailyValues(from, to, points);
  if (!points.length || !series.length)
    return (
      <p>Aucune donnée disponible pour cet indicateur et cette période.</p>
    );
  return (
    <figure style={{ margin: 0 }}>
      <GapLineChart points={series} color="var(--color-primary)" label={label} />
      <figcaption>
        Valeurs des jours disponibles uniquement ; les lacunes ne sont pas
        interpolées.
      </figcaption>
    </figure>
  );
}
