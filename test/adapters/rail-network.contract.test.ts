import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { distanceKm } from "../../src/adapters/geo";
import { loadGtfsTimetable } from "../../src/adapters/gtfs-timetable";
import { buildRailNetwork } from "../../src/adapters/rail-network";
import { parseSpeedSections } from "../../src/adapters/speed-sections";

const fixtures = new URL("./fixtures/", import.meta.url).pathname;

async function routeOfTrain6111() {
  const timetable = await loadGtfsTimetable(`${fixtures}gtfs-6111/`);
  const sections = parseSpeedSections(
    JSON.parse(await readFile(`${fixtures}speed-sections-6111.json`, "utf8")),
  );
  const stops = timetable.stopsOf("6111", "2026-10-10") ?? [];
  return buildRailNetwork(sections).routeThrough(stops.map((s) => s.position));
}

describe("Rail network on real SNCF data", () => {
  it("places the stops of train 6111 Paris → Marseille (about 750 km)", async () => {
    const route = await routeOfTrain6111();

    const [paris, avignon, aix, marseille] = route.stopsAtKm;
    expect(paris).toBe(0);
    expect(avignon).toBeGreaterThan(645);
    expect(avignon).toBeLessThan(670);
    expect(aix! - avignon!).toBeCloseTo(75, -1);
    expect(marseille).toBeGreaterThan(740);
    expect(marseille).toBeLessThan(760);
  });

  it("takes the LGV past Lyon Saint-Exupéry rather than the shorter classic line", async () => {
    const lyonSaintExupery = { latitude: 45.721109, longitude: 5.074969 };

    const route = await routeOfTrain6111();

    const closestKm = Math.min(...route.track.map((p) => distanceKm(p, lyonSaintExupery)));
    expect(closestKm).toBeLessThan(1);
  });
});
