import { describe, expect, it } from "vitest";
import { loadGtfsTimetable } from "../../src/adapters/gtfs-timetable";

const fixture = new URL("./fixtures/gtfs-6111/", import.meta.url).pathname;

describe("GTFS timetable", () => {
  it("lists the stops of a train on a date, in calling order", async () => {
    const timetable = await loadGtfsTimetable(fixture);

    const stops = timetable.stopsOf("6111", "2026-10-10");

    expect(stops?.map((s) => s.name)).toEqual([
      "Paris Gare de Lyon Hall 1 - 2",
      "Avignon TGV",
      "Aix-en-Provence TGV",
      "Marseille Saint-Charles",
    ]);
  });
});
