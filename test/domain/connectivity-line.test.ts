import { describe, expect, it } from "vitest";
import { buildConnectivityLine } from "../../src/domain/connectivity-line";
import type { ConnectivityLevel, Journey } from "../../src/domain/model";

const journeyOf = (lengthKm: number): Journey => ({
  stops: [
    { name: "A", atKm: 0 },
    { name: "B", atKm: lengthKm },
  ],
  lengthKm,
});

const sample = (atKm: number, level: ConnectivityLevel) => ({ atKm, level });

describe("Building the connectivity line", () => {
  it("keeps the journey stops in order", () => {
    const journey = journeyOf(1);

    const line = buildConnectivityLine(journey, [sample(0.5, "Good")]);

    expect(line.stops).toEqual(journey.stops);
  });

  it("marks a kilometre without samples as Unknown", () => {
    const line = buildConnectivityLine(journeyOf(2), [sample(0.5, "Good")]);

    expect(line.stretches).toEqual([
      { fromKm: 0, toKm: 1, level: "Good" },
      { fromKm: 1, toKm: 2, level: "Unknown" },
    ]);
  });

  it("gives a kilometre the level most of its samples have", () => {
    const line = buildConnectivityLine(journeyOf(2), [
      sample(0.2, "Good"),
      sample(0.5, "None"),
      sample(0.8, "Good"),
      sample(1.2, "Weak"),
      sample(1.5, "Good"),
      sample(1.8, "Weak"),
    ]);

    expect(line.stretches).toEqual([
      { fromKm: 0, toKm: 1, level: "Good" },
      { fromKm: 1, toKm: 2, level: "Weak" },
    ]);
  });

  it("breaks a tie towards the worse level", () => {
    const line = buildConnectivityLine(journeyOf(1), [sample(0.2, "Good"), sample(0.8, "None")]);

    expect(line.stretches).toEqual([{ fromKm: 0, toKm: 1, level: "None" }]);
  });

  it("merges consecutive kilometres with the same level into one stretch", () => {
    const line = buildConnectivityLine(journeyOf(3), [
      sample(0.5, "None"),
      sample(1.5, "None"),
      sample(2.5, "Good"),
    ]);

    expect(line.stretches).toEqual([
      { fromKm: 0, toKm: 2, level: "None" },
      { fromKm: 2, toKm: 3, level: "Good" },
    ]);
  });

  it("ends the last stretch exactly at the end of the route", () => {
    const line = buildConnectivityLine(journeyOf(1.5), [sample(1.2, "Good")]);

    expect(line.stretches).toEqual([
      { fromKm: 0, toKm: 1, level: "Unknown" },
      { fromKm: 1, toKm: 1.5, level: "Good" },
    ]);
  });
});
