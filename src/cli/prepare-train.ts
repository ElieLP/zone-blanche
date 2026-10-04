import { mkdir, readFile, writeFile } from "node:fs/promises";
import { ArcepCoverage } from "../adapters/arcep-coverage";
import { parseArcepMeasurements } from "../adapters/arcep-measurements";
import { loadGtfsTimetable } from "../adapters/gtfs-timetable";
import { buildRailNetwork } from "../adapters/rail-network";
import { SncfJourneys } from "../adapters/sncf-journeys";
import { parseSpeedSections } from "../adapters/speed-sections";
import { prepareTrain } from "../application/prepare-train";

const RAW = "data/raw";
const OUT = "public/data";

const [trainNumber, date] = process.argv.slice(2);
if (!trainNumber || !date) {
  console.error("Usage: npm run prepare-train -- <train number> <YYYY-MM-DD>");
  process.exit(1);
}

const timed = async <T>(label: string, work: () => Promise<T>): Promise<T> => {
  const start = performance.now();
  const result = await work();
  console.log(`${label}: ${Math.round(performance.now() - start)} ms`);
  return result;
};

const timetable = await timed("timetable", () => loadGtfsTimetable(`${RAW}/gtfs`));
const network = await timed("rail network", async () =>
  buildRailNetwork(
    parseSpeedSections(JSON.parse(await readFile(`${RAW}/speed-sections.json`, "utf8"))),
  ),
);
const measurements = await timed("measurements", async () =>
  parseArcepMeasurements(await readFile(`${RAW}/arcep-qos-transports.csv`, "utf8")),
);
const prepared = await timed("prepare", () =>
  prepareTrain(
    { journeys: new SncfJourneys(timetable, network), coverage: new ArcepCoverage(measurements) },
    { trainNumber, date },
  ),
);

if (!prepared) {
  console.error(`No journey for train ${trainNumber} on ${date}`);
  process.exit(1);
}
await mkdir(OUT, { recursive: true });
const file = `${OUT}/${trainNumber}-${date}.json`;
await writeFile(file, JSON.stringify(prepared));
console.log(`Wrote ${file}`);
