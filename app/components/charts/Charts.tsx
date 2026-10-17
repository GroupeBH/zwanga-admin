"use client";

import clsx from "clsx";
import { useId, useState } from "react";

import styles from "./Charts.module.css";

export const CHART_COLORS = {
  orange: "#ff7a00",
  green: "#3dd598",
  blue: "#38bdf8",
  amber: "#f5c542",
  red: "#ff5d68",
  grey: "#8b95a7",
} as const;

const formatNumber = (value: number) =>
  new Intl.NumberFormat("fr-CD").format(Math.round(value));

/* Echelle « ronde » (0, 5, 10, 15...) pour que l'axe se lise sans calcul. */
const niceMax = (max: number) => {
  if (max <= 4) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(max));
  const step = [1, 2, 2.5, 5, 10].find((s) => max <= s * magnitude * 4) ?? 10;
  return Math.ceil(max / (step * magnitude)) * step * magnitude;
};

/* ------------------------------------------------------------------ courbe */

export interface TrendPointData {
  readonly label: string;
  readonly values: readonly number[];
}

export interface TrendSeries {
  readonly label: string;
  readonly color: string;
}

interface TrendChartProps {
  readonly points: readonly TrendPointData[];
  readonly series: readonly TrendSeries[];
  readonly ariaLabel: string;
}

const W = 640;
const H = 250;
const PAD = { top: 12, right: 12, bottom: 28, left: 38 };

export const TrendChart = ({ points, series, ariaLabel }: TrendChartProps) => {
  const gradientId = useId().replace(/:/g, "");
  const [hover, setHover] = useState<number | null>(null);

  if (points.length === 0) {
    return <p className={styles.empty}>Pas encore de données sur la période.</p>;
  }

  const max = niceMax(Math.max(1, ...points.flatMap((p) => p.values)));
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) =>
    PAD.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;
  const ticks = [0, 1, 2, 3, 4].map((i) => (max / 4) * i);
  const path = (s: number) =>
    points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.values[s] ?? 0)}`).join(" ");
  const totals = series.map((_, s) => points.reduce((sum, p) => sum + (p.values[s] ?? 0), 0));
  const band = innerW / Math.max(points.length - 1, 1);

  return (
    <div>
      <div className={styles.trend}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className={styles.trendSvg}
          role="img"
          aria-label={ariaLabel}
          onMouseLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={series[0]?.color} stopOpacity="0.28" />
              <stop offset="100%" stopColor={series[0]?.color} stopOpacity="0" />
            </linearGradient>
          </defs>
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                className={styles.gridLine}
                x1={PAD.left}
                x2={W - PAD.right}
                y1={y(tick)}
                y2={y(tick)}
              />
              <text
                className={styles.axisText}
                x={PAD.left - 8}
                y={y(tick) + 4}
                textAnchor="end"
              >
                {formatNumber(tick)}
              </text>
            </g>
          ))}
          {points.map((p, i) => (
            <text
              key={p.label}
              className={styles.axisText}
              x={x(i)}
              y={H - 8}
              textAnchor="middle"
            >
              {p.label}
            </text>
          ))}
          {points.length > 1 ? (
            <path
              d={`${path(0)} L${x(points.length - 1)},${y(0)} L${x(0)},${y(0)} Z`}
              fill={`url(#${gradientId})`}
            />
          ) : null}
          {series.map((s, si) => (
            <path
              key={s.label}
              d={path(si)}
              fill="none"
              stroke={s.color}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {hover !== null ? (
            <line
              className={styles.hoverRule}
              x1={x(hover)}
              x2={x(hover)}
              y1={PAD.top}
              y2={PAD.top + innerH}
            />
          ) : null}
          {series.map((s, si) =>
            points.map((p, i) => (
              <circle
                key={`${s.label}-${p.label}`}
                cx={x(i)}
                cy={y(p.values[si] ?? 0)}
                r={hover === i ? 5 : 3}
                fill="var(--color-surface)"
                stroke={s.color}
                strokeWidth="2"
              />
            ))
          )}
          {points.map((p, i) => (
            <rect
              key={`hit-${p.label}`}
              className={styles.hoverBand}
              x={x(i) - band / 2}
              y={PAD.top}
              width={band}
              height={innerH}
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
            />
          ))}
        </svg>
        {hover !== null ? (
          <div
            className={styles.tooltip}
            style={{
              left: `${Math.min(Math.max((x(hover) / W) * 100, 14), 86)}%`,
            }}
          >
            <strong>{points[hover].label}</strong>
            {series.map((s, si) => (
              <div key={s.label} className={styles.tooltipRow}>
                <span className={styles.legendItem}>
                  <i className={styles.swatch} style={{ background: s.color }} />
                  {s.label}
                </span>
                <b>{formatNumber(points[hover].values[si] ?? 0)}</b>
              </div>
            ))}
          </div>
        ) : null}
      </div>
      <div className={styles.legend}>
        {series.map((s, si) => (
          <span key={s.label} className={styles.legendItem}>
            <i className={styles.swatch} style={{ background: s.color }} />
            {s.label} : <strong>{formatNumber(totals[si])}</strong> au total
          </span>
        ))}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------- anneau */

export interface DonutSlice {
  readonly label: string;
  readonly value: number;
  readonly color: string;
  readonly helper?: string;
}

interface DonutChartProps {
  readonly slices: readonly DonutSlice[];
  readonly centerLabel: string;
  readonly ariaLabel: string;
}

export const DonutChart = ({ slices, centerLabel, ariaLabel }: DonutChartProps) => {
  const [active, setActive] = useState<number | null>(null);
  const total = slices.reduce((sum, s) => sum + s.value, 0);

  if (total === 0) {
    return <p className={styles.empty}>Aucun trajet à afficher pour le moment.</p>;
  }

  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className={styles.donutWrap}>
      <div className={styles.donut}>
        <svg viewBox="0 0 180 180" role="img" aria-label={ariaLabel}>
          <circle className={styles.donutTrack} cx="90" cy="90" r={radius} strokeWidth="18" />
          {slices.map((slice, i) => {
            if (slice.value <= 0) return null;
            const length = (slice.value / total) * circumference;
            const gap = slices.filter((s) => s.value > 0).length > 1 ? 2 : 0;
            const circle = (
              <circle
                key={slice.label}
                className={styles.donutSlice}
                cx="90"
                cy="90"
                r={radius}
                stroke={slice.color}
                strokeWidth={active === i ? 22 : 18}
                opacity={active === null || active === i ? 1 : 0.35}
                strokeDasharray={`${Math.max(length - gap, 0)} ${circumference}`}
                strokeDashoffset={-offset}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
              />
            );
            offset += length;
            return circle;
          })}
        </svg>
        <div className={styles.donutCenter}>
          <strong>
            {active !== null ? formatNumber(slices[active].value) : formatNumber(total)}
          </strong>
          <span>{active !== null ? slices[active].label : centerLabel}</span>
        </div>
      </div>
      <ul className={styles.donutLegend}>
        {slices.map((slice, i) => (
          <li
            key={slice.label}
            className={clsx(styles.donutRow, { [styles.donutRowActive]: active === i })}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
          >
            <i className={styles.swatch} style={{ background: slice.color }} />
            <span>{slice.label}</span>
            <span>
              <b>{formatNumber(slice.value)}</b>
              <em>{Math.round((slice.value / total) * 100)} %</em>
            </span>
            {slice.helper ? <small>{slice.helper}</small> : null}
          </li>
        ))}
      </ul>
    </div>
  );
};

/* ------------------------------------------------------------------- barres */

export interface BarItem {
  readonly label: string;
  readonly value: number;
  readonly valueLabel?: string;
  readonly sub?: string;
}

export const BarList = ({
  items,
  emptyLabel,
}: {
  readonly items: readonly BarItem[];
  readonly emptyLabel: string;
}) => {
  if (items.length === 0) return <p className={styles.empty}>{emptyLabel}</p>;
  const max = Math.max(1, ...items.map((item) => item.value));
  return (
    <ul className={styles.barList}>
      {items.map((item) => (
        <li key={item.label}>
          <div className={styles.barHead}>
            <span title={item.label}>{item.label}</span>
            <b>{item.valueLabel ?? formatNumber(item.value)}</b>
          </div>
          <div className={styles.barTrack}>
            <div className={styles.barFill} style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
          {item.sub ? <div className={styles.barSub}>{item.sub}</div> : null}
        </li>
      ))}
    </ul>
  );
};
