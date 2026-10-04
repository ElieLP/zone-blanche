import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { loadGtfsTimetable } from "../../src/adapters/gtfs-timetable";
import { buildRailNetwork } from "../../src/adapters/rail-network";
import { SncfJourneys } from "../../src/adapters/sncf-journeys";
import { parseSpeedSections } from "../../src/adapters/speed-sections";

const fixtures = new URL("./fixtures/", import.meta.url).pathname;

async function journeysOfTrain6111() {
  const timetable = await loadGtfsTimetable(`${fixtures}gtfs-6111/`);
  const sections = parseSpeedSections(
    JSON.parse(await readFile(`${fixtures}speed-sections-6111.json`, "utf8")),
  );
  return new SncfJourneys(timetable, buildRailNetwork(sections));
}

describe("SNCF journeys on real data", () => {
  it("places each stop of train 6111 at its distance along the track", async () => {
    const journeys = await journeysOfTrain6111();

    const journey = await journeys.find("6111", "2026-10-10");

    expect(journey?.stops.map((s) => s.name)).toEqual([
      "Paris Gare de Lyon Hall 1 - 2",
      "Avignon TGV",
      "Aix-en-Provence TGV",
      "Marseille Saint-Charles",
    ]);
    const [paris, avignon, aix, marseille] = journey?.stops.map((s) => s.atKm) ?? [];
    expect(paris).toBe(0);
    expect(avignon).toBeCloseTo(657, -1);
    expect(aix).toBeCloseTo(732, -1);
    expect(marseille).toBeCloseTo(750, -1);
    expect(journey?.lengthKm).toBe(journey?.stops.at(-1)?.atKm);
  });
});
