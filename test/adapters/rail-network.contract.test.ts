import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { loadGtfsTimetable } from "../../src/adapters/gtfs-timetable";
import { buildRailNetwork } from "../../src/adapters/rail-network";
import { parseSpeedSections } from "../../src/adapters/speed-sections";

const fixtures = new URL("./fixtures/", import.meta.url).pathname;

describe("Rail network on real SNCF data", () => {
  it("routes train 6111 Paris → Marseille along the LGV (about 750 km)", async () => {
    const timetable = await loadGtfsTimetable(`${fixtures}gtfs-6111/`);
    const sections = parseSpeedSections(
      JSON.parse(await readFile(`${fixtures}speed-sections-6111.json`, "utf8")),
    );
    const stops = timetable.stopsOf("6111", "2026-10-10") ?? [];

    const route = buildRailNetwork(sections).routeThrough(stops.map((s) => s.position));

    const [paris, avignon, aix, marseille] = route.stopsAtKm;
    expect(paris).toBe(0);
    expect(avignon).toBeGreaterThan(645); // the classic line via Lyon would be shorter
    expect(avignon).toBeLessThan(670);
    expect(aix! - avignon!).toBeCloseTo(75, -1);
    expect(marseille).toBeGreaterThan(740);
    expect(marseille).toBeLessThan(760);
  });
});
