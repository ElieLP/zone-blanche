import { distanceKm, type Position } from "./geo";

export type SpeedSection = {
  readonly maxSpeedKmh: number;
  readonly track: readonly Position[];
};

export type RouteAlongTrack = {
  readonly lengthKm: number;
  readonly stopsAtKm: readonly number[];
};

export type RailNetwork = {
  routeThrough(stops: readonly Position[]): RouteAlongTrack;
};

export function buildRailNetwork(sections: readonly SpeedSection[]): RailNetwork {
  const track = sections[0]?.track ?? [];
  const kmAt = track.map((_, i) =>
    track.slice(1, i + 1).reduce((km, p, j) => km + distanceKm(track[j]!, p), 0),
  );
  const nearestKm = (stop: Position): number => {
    let best = 0;
    track.forEach((p, i) => {
      if (distanceKm(stop, p) < distanceKm(stop, track[best]!)) best = i;
    });
    return kmAt[best] ?? 0;
  };

  return {
    routeThrough(stops) {
      const stopsAtKm = stops.map(nearestKm);
      return { lengthKm: stopsAtKm.at(-1) ?? 0, stopsAtKm };
    },
  };
}
