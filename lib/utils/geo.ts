import type { Coordinates } from "@/lib/features/admin/types";

export interface LatLng {
  latitude: number;
  longitude: number;
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

/** GeoJSON et le backend Nest exposent [longitude, latitude]. */
export const toLatLng = (value?: Coordinates | LatLng | null): LatLng | null => {
  if (!value) return null;

  if (!Array.isArray(value)) {
    if (isFiniteNumber(value.latitude) && isFiniteNumber(value.longitude)) {
      return { latitude: value.latitude, longitude: value.longitude };
    }
    return null;
  }

  const [first, second] = value;
  if (!isFiniteNumber(first) || !isFiniteNumber(second)) return null;
  if (Math.abs(first) <= 90 && Math.abs(second) > 90) {
    return { latitude: first, longitude: second };
  }
  return { latitude: second, longitude: first };
};

export const osmEmbedUrl = (point: LatLng, zoomSpan = 0.04) => {
  const west = point.longitude - zoomSpan;
  const south = point.latitude - zoomSpan;
  const east = point.longitude + zoomSpan;
  const north = point.latitude + zoomSpan;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${west}%2C${south}%2C${east}%2C${north}&layer=mapnik&marker=${point.latitude}%2C${point.longitude}`;
};

export const osmOpenUrl = (point: LatLng) =>
  `https://www.openstreetmap.org/?mlat=${point.latitude}&mlon=${point.longitude}#map=15/${point.latitude}/${point.longitude}`;
