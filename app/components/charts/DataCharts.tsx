"use client";
import { useState, type KeyboardEvent, type ReactNode } from "react";
import {
  CircleCheck,
  CircleHelp,
  CircleX,
  LoaderCircle,
  TriangleAlert,
} from "lucide-react";
import type { MonitorTone } from "@/lib/features/stores/storeMonitoring";
import styles from "./DataCharts.module.css";

export const formatCount = (value: number) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value);
const formatAxis = (value: number, compact: boolean) =>
  new Intl.NumberFormat("fr-FR", {
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 1 : 0,
  }).format(value);
export const shortDate = (date: string) =>
  new Date(date + "T00:00:00Z").toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
export const longDate = (date: string) =>
  new Date(date + "T00:00:00Z").toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

/* Echelle ronde: l'axe se lit sans calcul (0, 250, 500...). */
const niceMax = (max: number) => {
  if (max <= 4) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(max));
  const step = [1, 2, 2.5, 5, 10].find((s) => max <= s * magnitude * 4) ?? 10;
  return Math.ceil(max / (step * magnitude)) * step * magnitude;
};
const tickIndexes = (count: number, wanted = 5) =>
  count <= wanted
    ? Array.from({ length: count }, (_, i) => i)
    : Array.from({ length: wanted }, (_, i) =>
        Math.round((i / (wanted - 1)) * (count - 1)),
      );

/* -------------------------------------------------------------- statut */

const TONE_ICON = {
  good: CircleCheck,
  warning: TriangleAlert,
  critical: CircleX,
  neutral: CircleHelp,
};

export function StatusBadge({
  tone,
  children,
  running,
}: {
  tone: MonitorTone;
  children: ReactNode;
  running?: boolean;
}) {
  const Icon = running ? LoaderCircle : TONE_ICON[tone];
  return (
    <span className={`${styles.status} ${styles[tone]}`}>
      <Icon size={13} aria-hidden className={running ? styles.spin : undefined} />
      {children}
    </span>
  );
}

/* --------------------------------------------------- plot (axes, survol) */

const PAD = { top: 16, right: 16, bottom: 28, left: 44 };

/* `width` est la largeur du viewBox: plus elle est proche de la largeur
   affichée, plus les textes d'axe gardent leur taille réelle. */
function usePlot(count: number, height: number, W: number) {
  const [hover, setHover] = useState<number | null>(null);
  const innerW = W - PAD.left - PAD.right,
    innerH = height - PAD.top - PAD.bottom;
  const onKeyDown = (e: KeyboardEvent<SVGSVGElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End", "Escape"].includes(e.key))
      return;
    e.preventDefault();
    if (e.key === "Escape") return setHover(null);
    if (e.key === "Home") return setHover(0);
    if (e.key === "End") return setHover(count - 1);
    const step = e.key === "ArrowLeft" ? -1 : 1;
    setHover((h) => Math.min(count - 1, Math.max(0, (h ?? count - 1) + step)));
  };
  return {
    W,
    hover,
    setHover,
    innerW,
    innerH,
    svgProps: {
      viewBox: `0 0 ${W} ${height}`,
      className: styles.plot,
      tabIndex: 0,
      onKeyDown,
      onFocus: () => setHover((h) => h ?? count - 1),
      onBlur: () => setHover(null),
      onMouseLeave: () => setHover(null),
    },
  };
}

function Axes({
  max,
  dates,
  x,
  y,
  height,
  W,
}: {
  W: number;
  max: number;
  dates: string[];
  x: (i: number) => number;
  y: (v: number) => number;
  height: number;
}) {
  const compact = max >= 10000;
  return (
    <>
      {[0, 1, 2, 3, 4].map((i) => {
        const tick = (max / 4) * i;
        return (
          <g key={i}>
            <line className={styles.grid} x1={PAD.left} x2={W - PAD.right} y1={y(tick)} y2={y(tick)} />
            <text className={styles.axis} x={PAD.left - 8} y={y(tick) + 4} textAnchor="end">
              {formatAxis(tick, compact)}
            </text>
          </g>
        );
      })}
      {tickIndexes(dates.length).map((i, n, all) => (
        <text
          key={dates[i]}
          className={styles.axis}
          x={x(i)}
          y={height - 8}
          textAnchor={all.length > 1 && n === 0 ? "start" : n === all.length - 1 && all.length > 1 ? "end" : "middle"}
        >
          {shortDate(dates[i])}
        </text>
      ))}
    </>
  );
}

function Tooltip({
  left,
  W,
  children,
}: {
  left: number;
  W: number;
  children: ReactNode;
}) {
  return (
    <div
      className={styles.tooltip}
      style={{ left: `${Math.min(Math.max((left / W) * 100, 16), 84)}%` }}
      role="status"
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------- courbe à trous */

export function GapLineChart({
  points,
  color,
  label,
  height = 210,
  width = 640,
}: {
  points: { date: string; value: number | null }[];
  color: string;
  label: string;
  height?: number;
  width?: number;
}) {
  const plot = usePlot(points.length, height, width);
  const observed = points.filter((p) => p.value !== null);
  if (!observed.length)
    return <p className={styles.empty}>Aucune valeur importée sur la période.</p>;
  const max = niceMax(Math.max(1, ...observed.map((p) => p.value!)));
  const x = (i: number) =>
    PAD.left + (points.length === 1 ? plot.innerW / 2 : (i / (points.length - 1)) * plot.innerW);
  const y = (v: number) => PAD.top + plot.innerH - (v / max) * plot.innerH;
  // Une interruption de la courbe = jour indisponible, jamais un zéro.
  const runs: number[][] = [];
  points.forEach((p, i) => {
    if (p.value === null) return;
    if (i && points[i - 1].value !== null) runs[runs.length - 1].push(i);
    else runs.push([i]);
  });
  const lastIndex = points.findLastIndex((p) => p.value !== null);
  const band = plot.innerW / Math.max(points.length - 1, 1);
  const hovered = plot.hover === null ? null : points[plot.hover];
  return (
    <div className={styles.chart}>
      <svg
        {...plot.svgProps}
        role="img"
        aria-label={`${label}, ${observed.length} jours renseignés sur ${points.length}. Flèches gauche/droite pour parcourir les jours.`}
      >
        <Axes max={max} dates={points.map((p) => p.date)} x={x} y={y} height={height} W={plot.W} />
        {points.map((p, i) =>
          p.value === null ? (
            <line key={"gap" + p.date} className={styles.missing} x1={x(i)} x2={x(i)} y1={y(0) - 3} y2={y(0) + 3} />
          ) : null,
        )}
        {runs.map((run) =>
          run.length > 1 ? (
            <g key={run[0]}>
              <path
                d={`M${x(run[0])},${y(0)} ${run.map((i) => `L${x(i)},${y(points[i].value!)}`).join(" ")} L${x(run[run.length - 1])},${y(0)} Z`}
                style={{ fill: color }}
                opacity={0.1}
              />
              <path
                d={run.map((i, n) => `${n ? "L" : "M"}${x(i)},${y(points[i].value!)}`).join(" ")}
                className={styles.line}
                style={{ stroke: color }}
              />
            </g>
          ) : (
            <circle key={run[0]} cx={x(run[0])} cy={y(points[run[0]].value!)} r={3} style={{ fill: color }} />
          ),
        )}
        {plot.hover !== null && (
          <line className={styles.rule} x1={x(plot.hover)} x2={x(plot.hover)} y1={PAD.top} y2={PAD.top + plot.innerH} />
        )}
        {[lastIndex, ...(plot.hover !== null && hovered?.value !== null ? [plot.hover] : [])].map((i, n) => (
          <circle key={n} cx={x(i)} cy={y(points[i].value!)} r={4.5} className={styles.dot} style={{ fill: color }} />
        ))}
        <text className={styles.endLabel} x={x(lastIndex)} y={y(points[lastIndex].value!) - 10} textAnchor={lastIndex > points.length * 0.85 ? "end" : "middle"}>
          {formatCount(points[lastIndex].value!)}
        </text>
        {points.map((p, i) => (
          <rect
            key={"hit" + p.date}
            className={styles.hit}
            x={x(i) - band / 2}
            y={PAD.top}
            width={band}
            height={plot.innerH}
            onMouseEnter={() => plot.setHover(i)}
          />
        ))}
      </svg>
      {hovered && (
        <Tooltip left={x(plot.hover!)} W={plot.W}>
          <strong>{longDate(hovered.date)}</strong>
          <span className={styles.tooltipRow}>
            <span className={styles.key}>
              <i style={{ background: color }} />
              {label}
            </span>
            <b>{hovered.value === null ? "Indisponible" : formatCount(hovered.value)}</b>
          </span>
        </Tooltip>
      )}
    </div>
  );
}

/* --------------------------------------------------- colonnes empilées */

export interface ColumnSeries {
  key: string;
  label: string;
  color: string;
}

/* Rectangle arrondi en haut seulement: la colonne reste ancrée à la ligne de base. */
const topRounded = (x: number, y: number, w: number, h: number, r = 4) => {
  const radius = Math.min(r, h, w / 2);
  return `M${x},${y + h} V${y + radius} Q${x},${y} ${x + radius},${y} H${x + w - radius} Q${x + w},${y} ${x + w},${y + radius} V${y + h} Z`;
};

export function ColumnChart({
  points,
  series,
  label,
  height = 210,
  width = 640,
  unavailableLabel = "Indisponible",
}: {
  points: { date: string; values: Record<string, number> | null }[];
  series: ColumnSeries[];
  label: string;
  height?: number;
  width?: number;
  unavailableLabel?: string;
}) {
  const plot = usePlot(points.length, height, width);
  const total = (p: (typeof points)[number]) =>
    p.values ? series.reduce((sum, s) => sum + (p.values![s.key] ?? 0), 0) : 0;
  if (!points.some((p) => p.values))
    return <p className={styles.empty}>Aucune donnée sur la période.</p>;
  const max = niceMax(Math.max(1, ...points.map(total)));
  const slot = plot.innerW / points.length;
  const barW = Math.max(2, Math.min(24, slot * 0.62));
  const x = (i: number) => PAD.left + slot * (i + 0.5);
  const y = (v: number) => PAD.top + plot.innerH - (v / max) * plot.innerH;
  const hovered = plot.hover === null ? null : points[plot.hover];
  return (
    <div className={styles.chart}>
      {series.length > 1 && (
        <div className={styles.legend}>
          {series.map((s) => (
            <span key={s.key} className={styles.key}>
              <i style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      )}
      <svg {...plot.svgProps} role="img" aria-label={`${label}. Flèches gauche/droite pour parcourir les jours.`}>
        <Axes max={max} dates={points.map((p) => p.date)} x={x} y={y} height={height} W={plot.W} />
        {points.map((p, i) => {
          if (!p.values)
            return <rect key={p.date} className={styles.unloaded} x={x(i) - slot / 2} y={PAD.top} width={slot} height={plot.innerH} />;
          let base = 0;
          const visible = series.filter((s) => (p.values![s.key] ?? 0) > 0);
          return (
            <g key={p.date} opacity={plot.hover === null || plot.hover === i ? 1 : 0.45}>
              {visible.map((s, n) => {
                const value = p.values![s.key];
                const top = y(base + value), bottom = y(base);
                base += value;
                // 2px de surface entre segments empilés.
                const gap = n ? 2 : 0;
                const h = Math.max(bottom - top - gap, 1);
                return n === visible.length - 1 ? (
                  <path key={s.key} d={topRounded(x(i) - barW / 2, bottom - gap - h, barW, h)} style={{ fill: s.color }} />
                ) : (
                  <rect key={s.key} x={x(i) - barW / 2} y={bottom - gap - h} width={barW} height={h} style={{ fill: s.color }} />
                );
              })}
            </g>
          );
        })}
        {points.map((p, i) => (
          <rect key={"hit" + p.date} className={styles.hit} x={x(i) - slot / 2} y={PAD.top} width={slot} height={plot.innerH} onMouseEnter={() => plot.setHover(i)} />
        ))}
      </svg>
      {hovered && (
        <Tooltip left={x(plot.hover!)} W={plot.W}>
          <strong>{longDate(hovered.date)}</strong>
          {hovered.values ? (
            <>
              {series.map((s) => (
                <span key={s.key} className={styles.tooltipRow}>
                  <span className={styles.key}>
                    <i style={{ background: s.color }} />
                    {s.label}
                  </span>
                  <b>{formatCount(hovered.values![s.key] ?? 0)}</b>
                </span>
              ))}
              {series.length > 1 && (
                <span className={styles.tooltipRow}>
                  Total <b>{formatCount(total(hovered))}</b>
                </span>
              )}
            </>
          ) : (
            <span className={styles.tooltipRow}>{unavailableLabel}</span>
          )}
        </Tooltip>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ sparkline */

export function Sparkline({ values, color }: { values: (number | null)[]; color: string }) {
  const observed = values.filter((v): v is number => v !== null);
  if (observed.length < 2) return null;
  const max = Math.max(1, ...observed),
    w = 120,
    h = 34;
  const x = (i: number) => 2 + (i / Math.max(values.length - 1, 1)) * (w - 6);
  const y = (v: number) => h - 3 - (v / max) * (h - 8);
  let d = "";
  values.forEach((v, i) => {
    if (v === null) return;
    d += `${i && values[i - 1] !== null ? "L" : "M"}${x(i)},${y(v)} `;
  });
  const last = values.findLastIndex((v) => v !== null);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={styles.spark} aria-hidden>
      <path d={d} className={styles.sparkLine} style={{ stroke: color }} />
      <circle cx={x(last)} cy={y(values[last]!)} r={3} style={{ fill: color }} />
    </svg>
  );
}

/* ------------------------------------------------------ barre segmentée */

export function SegmentedBar({
  parts,
  label,
}: {
  parts: { label: string; value: number; color: string }[];
  label: string;
}) {
  const total = parts.reduce((sum, p) => sum + p.value, 0);
  if (!total) return null;
  return (
    <div
      className={styles.segmented}
      role="img"
      aria-label={`${label} : ${parts.map((p) => `${p.label} ${p.value}`).join(", ")}`}
    >
      {parts
        .filter((p) => p.value > 0)
        .map((p) => (
          <span
            key={p.label}
            style={{ flexGrow: p.value, background: p.color }}
            title={`${p.label} : ${formatCount(p.value)} (${Math.round((p.value / total) * 100)} %)`}
          />
        ))}
    </div>
  );
}

/* --------------------------------------------------------------- jauge */

export function Meter({
  value,
  tone,
}: {
  value: number | null;
  tone: MonitorTone;
}) {
  return (
    <span className={`${styles.meter} ${styles[tone]}`} aria-hidden>
      <span style={{ width: `${Math.min(100, Math.max(0, value ?? 0))}%` }} />
    </span>
  );
}
