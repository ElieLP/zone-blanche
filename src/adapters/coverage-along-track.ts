import type { CoverageSample, Operator } from "../domain/model";
import type { ArcepMeasurement } from "./arcep-measurements";
import { distanceKm, type Position } from "./geo";

const KM_PER_DEGREE = (6371 * Math.PI) / 180;
/** Measurements further from the track were likely taken on another line. */
const MAX_OFFSET_KM = 1;

/** Places each measurement of the operator at its distance along the track. */
export function coverageAlongTrack(
  track: readonly Position[],
  measurements: readonly ArcepMeasurement[],
  operator: Operator,
): CoverageSample[] {
  const kmAt = [0];
  for (let i = 1; i < track.length; i++) {
    kmAt.push(kmAt[i - 1]! + distanceKm(track[i - 1]!, track[i]!));
  }
  return measurements.flatMap(({ position, level }) => {
    let best = { offsetKm: Infinity, atKm: 0 };
    for (let i = 1; i < track.length; i++) {
      const { offsetKm, along } = projectOnSegment(position, track[i - 1]!, track[i]!);
      if (offsetKm < best.offsetKm) {
        best = { offsetKm, atKm: kmAt[i - 1]! + along * (kmAt[i]! - kmAt[i - 1]!) };
      }
    }
    return best.offsetKm <= MAX_OFFSET_KM ? [{ atKm: best.atKm, level }] : [];
  });
}

/**
 * Projects a position on the segment from `a` to `b`, on a flat map centred on `a`
 * (segments are a few km long at most): the distance to the segment, and how far
 * along it the projection falls, from 0 at `a` to 1 at `b`.
 */
function projectOnSegment(
  position: Position,
  a: Position,
  b: Position,
): { offsetKm: number; along: number } {
  const kmPerLongitude = KM_PER_DEGREE * Math.cos((a.latitude * Math.PI) / 180);
  const flat = (p: Position) => ({
    x: (p.longitude - a.longitude) * kmPerLongitude,
    y: (p.latitude - a.latitude) * KM_PER_DEGREE,
  });
  const p = flat(position);
  const end = flat(b);
  const squaredLength = end.x ** 2 + end.y ** 2;
  const along =
    squaredLength === 0 ? 0 : Math.min(1, Math.max(0, (p.x * end.x + p.y * end.y) / squaredLength));
  const offsetKm = Math.hypot(p.x - along * end.x, p.y - along * end.y);
  return { offsetKm, along };
}
