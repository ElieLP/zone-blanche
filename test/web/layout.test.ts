import { describe, expect, it } from "vitest";
import type { PreparedTrain } from "../../src/application/prepare-train";
import type { Stretch } from "../../src/domain/model";
import { layOut } from "../../src/web/layout";

const unknownAlong = (lengthKm: number): Stretch[] => [
  { fromKm: 0, toKm: lengthKm, level: "Unknown" },
];

const train = (overrides: Partial<PreparedTrain> = {}): PreparedTrain => ({
  trainNumber: "6111",
  date: "2026-10-10",
  stops: [
    { name: "Paris", atKm: 0 },
    { name: "Lyon", atKm: 300 },
    { name: "Marseille", atKm: 600 },
  ],
  stretches: {
    Orange: unknownAlong(600),
    SFR: unknownAlong(600),
    Bouygues: unknownAlong(600),
    Free: unknownAlong(600),
  },
  ...overrides,
});

describe("Laying out the line", () => {
  it("spaces the stops in proportion to their distance", () => {
    const layout = layOut(train(), "Orange");

    expect(layout.stops).toEqual([
      { name: "Paris", at: 0 },
      { name: "Lyon", at: 0.5 },
      { name: "Marseille", at: 1 },
    ]);
  });

  it("draws the stretches of the chosen operator, on the same scale", () => {
    const layout = layOut(
      train({
        stretches: {
          ...train().stretches,
          Orange: [
            { fromKm: 0, toKm: 150, level: "Good" },
            { fromKm: 150, toKm: 600, level: "None" },
          ],
        },
      }),
      "Orange",
    );

    expect(layout.stretches).toEqual([
      { from: 0, to: 0.25, level: "Good" },
      { from: 0.25, to: 1, level: "None" },
    ]);
  });
});
