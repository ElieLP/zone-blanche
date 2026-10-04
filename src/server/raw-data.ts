import { readFile } from "node:fs/promises";
import { ArcepCoverage } from "../adapters/arcep-coverage";
import { parseArcepMeasurements } from "../adapters/arcep-measurements";
import { readLines } from "../adapters/lines";
import { loadGtfsTimetable } from "../adapters/gtfs-timetable";
import { buildRailNetwork } from "../adapters/rail-network";
import { SncfJourneys } from "../adapters/sncf-journeys";
import { parseSpeedSections } from "../adapters/speed-sections";
import type { Dependencies } from "../application/check-connectivity";

/** Loads the downloaded open data (`scripts/download-data.sh`) from `dir`. */
export async function loadRawData(dir: string): Promise<Dependencies> {
  const timetable = await timed("timetable", () => loadGtfsTimetable(`${dir}/gtfs`));
  const network = await timed("rail network", async () =>
    buildRailNetwork(
      parseSpeedSections(JSON.parse(await readFile(`${dir}/speed-sections.json`, "utf8"))),
    ),
  );
  const measurements = await timed("measurements", async () =>
    parseArcepMeasurements(readLines(`${dir}/arcep-qos-transports.csv`)),
  );
  return {
    journeys: new SncfJourneys(timetable, network),
    coverage: new ArcepCoverage(measurements),
  };
}

async function timed<T>(label: string, work: () => Promise<T>): Promise<T> {
  const start = performance.now();
  const result = await work();
  console.log(`${label}: ${Math.round(performance.now() - start)} ms`);
  return result;
}
