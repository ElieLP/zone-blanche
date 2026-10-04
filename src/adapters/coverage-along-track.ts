import type { CoverageSample, Operator } from "../domain/model";
import type { ArcepMeasurement } from "./arcep-measurements";
import { distanceKm, type Position } from "./geo";

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
  return measurements.map(({ position, level }) => {
    let nearest = 0;
    track.forEach((point, i) => {
      if (distanceKm(position, point) < distanceKm(position, track[nearest]!)) nearest = i;
    });
    return { atKm: kmAt[nearest]!, level };
  });
}
