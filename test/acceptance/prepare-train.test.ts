import { describe, expect, it } from "vitest";
import { prepareTrain } from "../../src/application/prepare-train";
import {
  InMemoryCoverageSource,
  InMemoryJourneyRepository,
  journeyThrough,
  samplesAlong,
  stop,
} from "./fakes";

describe("Preparing a train for the webapp", () => {
  it("gives the stops once, and the stretches of every operator", async () => {
    const journeys = new InMemoryJourneyRepository().add(
      "6611",
      "2026-10-10",
      journeyThrough(stop("Paris", 0), stop("Lyon", 4)),
    );
    const coverage = new InMemoryCoverageSource({
      Orange: samplesAlong(4, {
        elsewhere: "Good",
        zones: [{ fromKm: 1, toKm: 2, level: "None" }],
      }),
      SFR: samplesAlong(4, { elsewhere: "Weak", zones: [] }),
    });

    const prepared = await prepareTrain(
      { journeys, coverage },
      { trainNumber: "6611", date: "2026-10-10" },
    );

    expect(prepared).toEqual({
      trainNumber: "6611",
      date: "2026-10-10",
      stops: [stop("Paris", 0), stop("Lyon", 4)],
      stretches: {
        Orange: [
          { fromKm: 0, toKm: 1, level: "Good" },
          { fromKm: 1, toKm: 2, level: "None" },
          { fromKm: 2, toKm: 4, level: "Good" },
        ],
        SFR: [{ fromKm: 0, toKm: 4, level: "Weak" }],
        Bouygues: [{ fromKm: 0, toKm: 4, level: "Unknown" }],
        Free: [{ fromKm: 0, toKm: 4, level: "Unknown" }],
      },
    });
  });
});
