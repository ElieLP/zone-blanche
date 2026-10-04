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
  return {
    routeThrough() {
      const track = sections[0]?.track ?? [];
      const lengthKm = track.slice(1).reduce((km, p, i) => km + distanceKm(track[i]!, p), 0);
      return { lengthKm, stopsAtKm: [0, lengthKm] };
    },
  };
}
