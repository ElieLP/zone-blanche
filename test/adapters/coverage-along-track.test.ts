import { describe, expect, it } from "vitest";
import type { ArcepMeasurement } from "../../src/adapters/arcep-measurements";
import { coverageAlongTrack } from "../../src/adapters/coverage-along-track";
import type { Position } from "../../src/adapters/geo";

/** One degree of latitude is about 111.2 km. */
const KM_PER_DEGREE = 111.195;

const at = (latitude: number, longitude = 0): Position => ({ latitude, longitude });

const measured = (
  position: Position,
  level: ArcepMeasurement["level"] = "Good",
  operator: ArcepMeasurement["operator"] = "Orange",
): ArcepMeasurement => ({ operator, position, level });

describe("Coverage along a track", () => {
  it("places a measurement taken on a track point at that point's distance", () => {
    const track = [at(0), at(0.01), at(0.02)];

    const samples = coverageAlongTrack(track, [measured(at(0.01), "Weak")], "Orange");

    expect(samples).toHaveLength(1);
    expect(samples[0]?.atKm).toBeCloseTo(0.01 * KM_PER_DEGREE, 3);
    expect(samples[0]?.level).toBe("Weak");
  });

  it("places a measurement between two distant track points by projecting it on the track", () => {
    const track = [at(0), at(0.02)];

    const samples = coverageAlongTrack(track, [measured(at(0.015, 0.001))], "Orange");

    expect(samples[0]?.atKm).toBeCloseTo(0.015 * KM_PER_DEGREE, 2);
  });

  it("ignores a measurement more than 1 km from the track, likely taken on another line", () => {
    const track = [at(0), at(0.02)];
    const kmEast = (km: number) => at(0.01, km / KM_PER_DEGREE);

    const samples = coverageAlongTrack(
      track,
      [measured(kmEast(0.9), "Good"), measured(kmEast(1.1), "None")],
      "Orange",
    );

    expect(samples.map((s) => s.level)).toEqual(["Good"]);
  });

  it("keeps only the measurements of the chosen operator", () => {
    const track = [at(0), at(0.02)];

    const samples = coverageAlongTrack(
      track,
      [measured(at(0.01), "None", "SFR"), measured(at(0.01), "Good", "Orange")],
      "Orange",
    );

    expect(samples.map((s) => s.level)).toEqual(["Good"]);
  });
});
