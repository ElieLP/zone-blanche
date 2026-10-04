import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { ArcepCoverage } from "../../src/adapters/arcep-coverage";
import { parseArcepMeasurements } from "../../src/adapters/arcep-measurements";
import { loadGtfsTimetable } from "../../src/adapters/gtfs-timetable";
import { buildRailNetwork } from "../../src/adapters/rail-network";
import { SncfJourneys } from "../../src/adapters/sncf-journeys";
import { parseSpeedSections } from "../../src/adapters/speed-sections";
import { checkConnectivity } from "../../src/application/check-connectivity";
import type { ConnectivityLevel, ConnectivityLine } from "../../src/domain/model";

const fixtures = new URL("../adapters/fixtures/", import.meta.url).pathname;
const read = (name: string) => readFile(`${fixtures}${name}`, "utf8");

async function realDependencies() {
  const timetable = await loadGtfsTimetable(`${fixtures}gtfs-6111/`);
  const network = buildRailNetwork(
    parseSpeedSections(JSON.parse(await read("speed-sections-6111.json"))),
  );
  return {
    journeys: new SncfJourneys(timetable, network),
    coverage: new ArcepCoverage(
      parseArcepMeasurements(await read("arcep-tgv-paris-marseille.csv")),
    ),
  };
}

const kmOf = (line: ConnectivityLine, level: ConnectivityLevel) =>
  line.stretches.filter((s) => s.level === level).reduce((km, s) => km + s.toKm - s.fromKm, 0);

describe("Train 6111 Paris → Marseille on real SNCF and ARCEP data", () => {
  it("shows mostly good Orange coverage, with every kilometre accounted for", async () => {
    const line = await checkConnectivity(await realDependencies(), {
      trainNumber: "6111",
      date: "2026-10-10",
      operator: "Orange",
    });

    const total = line.stops.at(-1)?.atKm ?? 0;
    expect(line.stretches[0]?.fromKm).toBe(0);
    expect(line.stretches.at(-1)?.toKm).toBe(total);
    expect(kmOf(line, "Good") / total).toBeGreaterThan(0.5);
  });
});
