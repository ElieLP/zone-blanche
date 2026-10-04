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

type Vertex = { readonly section: number; readonly position: Position };
type Edge = { readonly to: number; readonly km: number };

export function buildRailNetwork(sections: readonly SpeedSection[]): RailNetwork {
  const vertices: Vertex[] = [];
  const edges: Edge[][] = [];
  const connect = (a: number, b: number, km: number) => {
    edges[a]!.push({ to: b, km });
    edges[b]!.push({ to: a, km });
  };

  const sectionEnds: number[] = [];
  sections.forEach(({ track }, section) => {
    const first = vertices.length;
    track.forEach((position, i) => {
      vertices.push({ section, position });
      edges.push([]);
      if (i > 0) connect(first + i - 1, first + i, distanceKm(track[i - 1]!, position));
    });
    sectionEnds.push(first, vertices.length - 1);
  });

  for (const end of sectionEnds) {
    const { section, position } = vertices[end]!;
    const nearest = nearestVertex(vertices, position, (v) => v.section !== section);
    if (nearest !== undefined) {
      const km = distanceKm(position, vertices[nearest]!.position);
      if (km <= JUNCTION_TOLERANCE_KM) connect(end, nearest, km);
    }
  }

  return {
    routeThrough(stops) {
      const snapped = stops.map((stop) => nearestVertex(vertices, stop, () => true) ?? 0);
      const stopsAtKm = [0];
      for (let i = 1; i < snapped.length; i++) {
        stopsAtKm.push(stopsAtKm[i - 1]! + shortestKm(edges, snapped[i - 1]!, snapped[i]!));
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

/** Dijkstra. */
function shortestKm(edges: readonly Edge[][], from: number, to: number): number {
  const kmTo = new Map([[from, 0]]);
  const done = new Set<number>();
  while (true) {
    let current: number | undefined;
    for (const [vertex, km] of kmTo) {
      if (!done.has(vertex) && (current === undefined || km < kmTo.get(current)!)) current = vertex;
    }
    if (current === undefined) throw new Error("Stops are not connected by the rail network");
    if (current === to) return kmTo.get(to)!;
    done.add(current);
    for (const edge of edges[current]!) {
      const km = kmTo.get(current)! + edge.km;
      if (km < (kmTo.get(edge.to) ?? Infinity)) kmTo.set(edge.to, km);
    }
  }
}
