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

  it("places a stop off the track at the nearest point of the track", () => {
    const network = buildRailNetwork([section(160, at(0), at(0.5), at(1))]);

    const route = network.routeThrough([at(0), at(0.5, 0.001), at(1)]);

    expect(route.stopsAtKm[1]).toBeCloseTo(KM_PER_DEGREE / 2, 1);
  });

  it("crosses between sections whose ends are less than 200 m apart", () => {
    const network = buildRailNetwork([
      section(160, at(0), at(1)),
      section(160, at(1.001), at(2)), // about 110 m further
    ]);

    const route = network.routeThrough([at(0), at(2)]);

    expect(route.lengthKm).toBeCloseTo(2 * KM_PER_DEGREE, 0);
  });

  it("does not join sections whose ends are more than 200 m apart", () => {
    const network = buildRailNetwork([
      section(160, at(0), at(1)),
      section(160, at(1.003), at(2)), // about 330 m further
    ]);

    expect(() => network.routeThrough([at(0), at(2)])).toThrow(/not connected/);
  });
});
