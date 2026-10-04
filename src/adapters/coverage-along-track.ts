import type { CoverageSample, Operator, Position } from "../domain/model";
import type { ArcepMeasurement } from "./arcep-measurements";
import { distanceKm, KM_PER_DEGREE } from "./geo";

/** Measurements further from the track were likely taken on another line. */
const MAX_OFFSET_KM = 1;
/** Grid cell size: 0.02° is at least 1.4 km in France, above the maximum offset. */
const CELL_DEGREES = 0.02;

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
  const segmentsNear = segmentGrid(track);
  return measurements.flatMap(({ operator: measuredBy, position, level }) => {
    if (measuredBy !== operator) return [];
    let best = { offsetKm: Infinity, atKm: 0 };
    for (const i of segmentsNear(position)) {
      const { offsetKm, along } = projectOnSegment(position, track[i - 1]!, track[i]!);
      if (offsetKm < best.offsetKm) {
        best = { offsetKm, atKm: kmAt[i - 1]! + along * (kmAt[i]! - kmAt[i - 1]!) };
      }
    }
    return best.offsetKm <= MAX_OFFSET_KM ? [{ atKm: best.atKm, level }] : [];
  });
}

const cellOf = (degrees: number) => Math.floor(degrees / CELL_DEGREES);
const cellKey = (x: number, y: number) => `${x},${y}`;

/**
 * Indexes each segment (by the index of its end point) in every grid cell within one
 * cell of its bounding box, so the cell of a position lists every segment that could
 * be within the maximum offset of it.
 */
function segmentGrid(track: readonly Position[]): (position: Position) => readonly number[] {
  const cells = new Map<string, number[]>();
  for (let i = 1; i < track.length; i++) {
    const a = track[i - 1]!;
    const b = track[i]!;
    const [west, east] = [a.longitude, b.longitude].sort((p, q) => p - q).map(cellOf);
    const [south, north] = [a.latitude, b.latitude].sort((p, q) => p - q).map(cellOf);
    for (let x = west! - 1; x <= east! + 1; x++) {
      for (let y = south! - 1; y <= north! + 1; y++) {
        const cell = cells.get(cellKey(x, y));
        if (cell) cell.push(i);
        else cells.set(cellKey(x, y), [i]);
      }
    }
  }
  return ({ latitude, longitude }) => cells.get(cellKey(cellOf(longitude), cellOf(latitude))) ?? [];
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
