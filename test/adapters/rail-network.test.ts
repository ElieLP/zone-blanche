import { describe, expect, it } from "vitest";
import type { Position } from "../../src/adapters/geo";
import { buildRailNetwork, type SpeedSection } from "../../src/adapters/rail-network";

/** One degree of latitude is about 111.2 km. */
const KM_PER_DEGREE = 111.195;

const at = (latitude: number, longitude = 0): Position => ({ latitude, longitude });

const section = (maxSpeedKmh: number, ...track: Position[]): SpeedSection => ({
  maxSpeedKmh,
  track,
});

describe("Rail network", () => {
  it("places stops at both ends of a single section", () => {
    const network = buildRailNetwork([section(160, at(0), at(1))]);

    const route = network.routeThrough([at(0), at(1)]);

    expect(route.lengthKm).toBeCloseTo(KM_PER_DEGREE, 1);
    expect(route.stopsAtKm).toEqual([0, route.lengthKm]);
  });
});
