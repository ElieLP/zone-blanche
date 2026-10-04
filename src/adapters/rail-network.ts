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

/** Section ends closer than this to another section are joined to it. */
const JUNCTION_TOLERANCE_KM = 0.2;
/** Assumed speed through a junction, which is a few metres at most. */
const JUNCTION_SPEED_KMH = 30;

type Vertex = { readonly section: number; readonly position: Position };
type Edge = { readonly to: number; readonly km: number; readonly hours: number };

export function buildRailNetwork(sections: readonly SpeedSection[]): RailNetwork {
  const vertices: Vertex[] = [];
  const edges: Edge[][] = [];
  const connect = (a: number, b: number, km: number, speedKmh: number) => {
    const hours = km / speedKmh;
    edges[a]!.push({ to: b, km, hours });
    edges[b]!.push({ to: a, km, hours });
  };

  const sectionEnds: number[] = [];
  sections.forEach(({ track, maxSpeedKmh }, section) => {
    const first = vertices.length;
    track.forEach((position, i) => {
      vertices.push({ section, position });
      edges.push([]);
      if (i > 0) connect(first + i - 1, first + i, distanceKm(track[i - 1]!, position), maxSpeedKmh);
    });
    sectionEnds.push(first, vertices.length - 1);
  });

  for (const end of sectionEnds) {
    const { section, position } = vertices[end]!;
    const nearest = nearestVertex(vertices, position, (v) => v.section !== section);
    if (nearest !== undefined) {
      const km = distanceKm(position, vertices[nearest]!.position);
      if (km <= JUNCTION_TOLERANCE_KM) connect(end, nearest, km, JUNCTION_SPEED_KMH);
    }
  }

  return {
    routeThrough(stops) {
      const snapped = stops.map((stop) => nearestVertex(vertices, stop, () => true) ?? 0);
      const stopsAtKm = [0];
      for (let i = 1; i < snapped.length; i++) {
        stopsAtKm.push(stopsAtKm[i - 1]! + fastestPathKm(edges, snapped[i - 1]!, snapped[i]!));
      }
      return { lengthKm: stopsAtKm.at(-1)!, stopsAtKm };
    },
  };
}

function nearestVertex(
  vertices: readonly Vertex[],
  position: Position,
  eligible: (vertex: Vertex) => boolean,
): number | undefined {
  let best: number | undefined;
  let bestKm = Infinity;
  vertices.forEach((vertex, i) => {
    const km = distanceKm(position, vertex.position);
    if (eligible(vertex) && km < bestKm) {
      best = i;
      bestKm = km;
    }
  });
  return best;
}

/** Dijkstra on travel time; returns the length of the fastest path. */
function fastestPathKm(edges: readonly Edge[][], from: number, to: number): number {
  const best = new Map([[from, { hours: 0, km: 0 }]]);
  const done = new Set<number>();
  while (true) {
    let current: number | undefined;
    for (const [vertex, { hours }] of best) {
      if (!done.has(vertex) && (current === undefined || hours < best.get(current)!.hours)) {
        current = vertex;
      }
    }
    if (current === undefined) throw new Error("Stops are not connected by the rail network");
    const reached = best.get(current)!;
    if (current === to) return reached.km;
    done.add(current);
    for (const edge of edges[current]!) {
      const hours = reached.hours + edge.hours;
      if (hours < (best.get(edge.to)?.hours ?? Infinity)) {
        best.set(edge.to, { hours, km: reached.km + edge.km });
      }
    }
  }
}
