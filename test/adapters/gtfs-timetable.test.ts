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

  it("finds nothing on a date the train does not run", async () => {
    const timetable = await loadGtfsTimetable(fixture);

    // The feed covers 2026-10-04 to 2027-03-31; 6111 runs every day in it.
    expect(timetable.stopsOf("6111", "2027-04-01")).toBeUndefined();
  });

  it("gives the coordinates of each stop", async () => {
    const timetable = await loadGtfsTimetable(fixture);

    const [paris] = timetable.stopsOf("6111", "2026-10-10") ?? [];

    expect(paris?.position).toEqual({ latitude: 48.844945, longitude: 2.373481 });
  });
});
