import { describe, expect, it } from "vitest";
import { checkConnectivity } from "../../src/application/check-connectivity";
import {
  InMemoryCoverageSource,
  InMemoryJourneyRepository,
  journeyThrough,
  samplesAlong,
  stop,
} from "./fakes";

describe("Checking the connectivity of a train", () => {
  it("shows a dead zone between two stops on the line", async () => {
    // Given train 6611 on 2026-10-10 stops at Paris, Dijon, Lyon
    const journeys = new InMemoryJourneyRepository().add(
      "6611",
      "2026-10-10",
      journeyThrough(stop("Paris", 0), stop("Dijon", 315), stop("Lyon", 512)),
    );
    // And Orange has no coverage between km 120 and km 135
    const coverage = new InMemoryCoverageSource({
      Orange: samplesAlong(512, {
        elsewhere: "Good",
        zones: [{ fromKm: 120, toKm: 135, level: "None" }],
      }),
    });

    // When I check train 6611 on 2026-10-10 for Orange
    const line = await checkConnectivity(
      { journeys, coverage },
      { trainNumber: "6611", date: "2026-10-10", operator: "Orange" },
    );

    // Then the line shows stops Paris, Dijon, Lyon in that order
    expect(line.stops).toEqual([stop("Paris", 0), stop("Dijon", 315), stop("Lyon", 512)]);
    // And there is a "None" stretch from km 120 to km 135, between Paris and Dijon
    // And the rest of the line is "Good"
    expect(line.stretches).toEqual([
      { fromKm: 0, toKm: 120, level: "Good" },
      { fromKm: 120, toKm: 135, level: "None" },
      { fromKm: 135, toKm: 512, level: "Good" },
    ]);
  });
});
