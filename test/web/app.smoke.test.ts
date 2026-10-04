// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import type { PreparedTrain } from "../../src/application/prepare-train";
import type { Stretch } from "../../src/domain/model";
import { startApp } from "../../src/web/app";

const along = (level: Stretch["level"]): Stretch[] => [{ fromKm: 0, toKm: 750, level }];

const train6111: PreparedTrain = {
  trainNumber: "6111",
  date: "2026-10-10",
  stops: [
    { name: "Paris Gare de Lyon Hall 1 - 2", atKm: 0 },
    { name: "Avignon TGV", atKm: 657 },
    { name: "Marseille Saint-Charles", atKm: 750 },
  ],
  stretches: {
    Orange: [
      { fromKm: 0, toKm: 600, level: "Good" },
      { fromKm: 600, toKm: 750, level: "None" },
    ],
    SFR: along("Weak"),
    Bouygues: along("Unknown"),
    Free: along("Good"),
  },
};

describe("Webapp", () => {
  it("shows the pre-filled train as a line with its stops and stretches", async () => {
    const root = document.createElement("main");

    await startApp(root, async () => train6111);

    expect(root.querySelector("[role=status]")?.textContent).toBe(
      "Train 6111 on 2026-10-10 with Orange, 750 km.",
    );
    const svg = root.querySelector("svg");
    expect([...(svg?.querySelectorAll("text") ?? [])].map((t) => t.textContent)).toEqual([
      "Paris Gare de Lyon Hall 1 - 2",
      "Avignon TGV",
      "Marseille Saint-Charles",
    ]);
    expect([...(svg?.querySelectorAll("rect title") ?? [])].map((t) => t.textContent)).toEqual([
      "Good",
      "None",
    ]);
  });

  it("says so when no data was prepared for the train", async () => {
    const root = document.createElement("main");

    await startApp(root, async () => undefined);

    expect(root.querySelector("[role=status]")?.textContent).toBe(
      "No data prepared for train 6111 on 2026-10-10.",
    );
    expect(root.querySelector("svg")).toBeNull();
  });

  it("says so when the train cannot be loaded", async () => {
    const root = document.createElement("main");

    await startApp(root, async () => {
      throw new SyntaxError("Unexpected token < in JSON");
    });

    expect(root.querySelector("[role=status]")?.textContent).toBe(
      "Could not load train 6111 on 2026-10-10.",
    );
  });
});
