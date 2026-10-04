import { distanceKm, type Position } from "./geo";
import { MinHeap } from "./min-heap";

export type SpeedSection = {
  readonly maxSpeedKmh: number;
  readonly track: readonly Position[];
};

export type RouteAlongTrack = {
  readonly lengthKm: number;
  readonly stopsAtKm: readonly number[];
  /** Positions followed from the first stop to the last. */
  readonly track: readonly Position[];
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
      if (i > 0)
        connect(first + i - 1, first + i, distanceKm(track[i - 1]!, position), maxSpeedKmh);
    });
    sectionEnds.push(first, vertices.length - 1);
  });

  const grid = new VertexGrid(vertices);
  for (const end of sectionEnds) {
    const { section, position } = vertices[end]!;
    const nearest = nearestVertex(
      vertices,
      grid.around(position),
      position,
      (v) => v.section !== section,
    );
    if (nearest !== undefined) {
      const km = distanceKm(position, vertices[nearest]!.position);
      if (km <= JUNCTION_TOLERANCE_KM) connect(end, nearest, km, JUNCTION_SPEED_KMH);
    }
  }

  return {
    routeThrough(stops) {
      const snapped = stops.map(
        (stop) => nearestVertex(vertices, vertices.keys(), stop, () => true) ?? 0,
      );
      const stopsAtKm = [0];
      const track: Position[] = [];
      const follow = (vertex: number) => {
        const { position } = vertices[vertex]!;
        const last = track.at(-1);
        if (last?.latitude !== position.latitude || last.longitude !== position.longitude) {
          track.push(position);
        }
      };
      follow(snapped[0]!);
      for (let i = 1; i < snapped.length; i++) {
        const leg = fastestPath(edges, snapped[i - 1]!, snapped[i]!);
        stopsAtKm.push(stopsAtKm[i - 1]! + leg.km);
        leg.vertices.forEach(follow);
      }
      return { lengthKm: stopsAtKm.at(-1)!, stopsAtKm, track };
    },
  };
}

function nearestVertex(
  vertices: readonly Vertex[],
  candidates: Iterable<number>,
  position: Position,
  eligible: (vertex: Vertex) => boolean,
): number | undefined {
  let best: number | undefined;
  let bestKm = Infinity;
  for (const i of candidates) {
    const vertex = vertices[i]!;
    const km = distanceKm(position, vertex.position);
    if (eligible(vertex) && km < bestKm) {
      best = i;
      bestKm = km;
    }
  }
  return best;
}

/** Buckets vertices into cells of 0.01° (≥ 0.7 km in France, above the junction tolerance). */
class VertexGrid {
  private readonly cells = new Map<string, number[]>();

  constructor(vertices: readonly Vertex[]) {
    vertices.forEach(({ position }, i) => {
      const key = VertexGrid.key(
        VertexGrid.cell(position.longitude),
        VertexGrid.cell(position.latitude),
      );
      const cell = this.cells.get(key);
      if (cell) cell.push(i);
      else this.cells.set(key, [i]);
    });
  }

  /** Vertices in the cell of the position and its 8 neighbours. */
  *around({ latitude, longitude }: Position): Iterable<number> {
    const x = VertexGrid.cell(longitude);
    const y = VertexGrid.cell(latitude);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) yield* this.cells.get(VertexGrid.key(x + dx, y + dy)) ?? [];
    }
  }

  private static cell(degrees: number): number {
    return Math.floor(degrees * 100);
  }

  private static key(x: number, y: number): string {
    return `${x},${y}`;
  }
}

/** Dijkstra on travel time: the fastest path, its length and the vertices after `from`. */
function fastestPath(
  edges: readonly Edge[][],
  from: number,
  to: number,
): { km: number; vertices: number[] } {
  const best = new Map([[from, { hours: 0, km: 0, previous: from }]]);
  const done = new Set<number>();
  const queue = new MinHeap<number>();
  queue.push(0, from);
  while (queue.size > 0) {
    const current = queue.pop()!;
    if (done.has(current)) continue;
    const reached = best.get(current)!;
    if (current === to) {
      const vertices: number[] = [];
      for (let v = to; v !== from; v = best.get(v)!.previous) vertices.unshift(v);
      return { km: reached.km, vertices };
    }
    done.add(current);
    for (const edge of edges[current]!) {
      const hours = reached.hours + edge.hours;
      if (hours < (best.get(edge.to)?.hours ?? Infinity)) {
        best.set(edge.to, { hours, km: reached.km + edge.km, previous: current });
        queue.push(hours, edge.to);
      }
    }
  }
  throw new Error("Stops are not connected by the rail network");
}
