import { mkdir, writeFile } from "node:fs/promises";
import { prepareTrain } from "../application/prepare-train";
import { loadRawData, timed } from "../server/raw-data";

const OUT = "public/data";

const [trainNumber, date] = process.argv.slice(2);
if (!trainNumber || !date) {
  console.error("Usage: npm run prepare-train -- <train number> <YYYY-MM-DD>");
  process.exit(1);
}

const dependencies = await loadRawData("data/raw");
const prepared = await timed("prepare", () => prepareTrain(dependencies, { trainNumber, date }));
if (!prepared) {
  console.error(`No journey for train ${trainNumber} on ${date}`);
  process.exit(1);
}
await mkdir(OUT, { recursive: true });
const file = `${OUT}/${trainNumber}-${date}.json`;
await writeFile(file, JSON.stringify(prepared));
console.log(`Wrote ${file}`);
