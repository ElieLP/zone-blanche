import type { Position } from "../domain/model";

const EARTH_RADIUS_KM = 6371;
const radians = (degrees: number) => (degrees * Math.PI) / 180;

/** Length of one degree of latitude, about 111.2 km. */
export const KM_PER_DEGREE = radians(EARTH_RADIUS_KM);

/** Great-circle (haversine) distance. */
export function distanceKm(a: Position, b: Position): number {
  const dLat = radians(b.latitude - a.latitude);
  const dLon = radians(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}
