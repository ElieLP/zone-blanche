import { describe, expect, it } from "vitest";
import { parseArcepMeasurements } from "../../src/adapters/arcep-measurements";
import { linesOf } from "../../src/adapters/lines";

const parse = async (csv: string) => [...(await parseArcepMeasurements(linesOf(csv)))];

const header =
  "axis;latitude_start;loaded_in_less_10_secondes;loaded_in_less_5_secondes;longitude_start;operator;situation";

describe("ARCEP on-train measurements", () => {
  it("reads a page loaded in under 5 seconds as Good", async () => {
    const csv = `${header}\ntgv;48.84484;1;1;2.37549;Orange;INTRAIN\n`;

    expect(await parse(csv)).toEqual([
      { operator: "Orange", position: { latitude: 48.84484, longitude: 2.37549 }, level: "Good" },
    ]);
  });

  it("reads a page loaded in 5 to 10 seconds as Weak, and a slower or failed one as None", async () => {
    const csv = [
      header,
      "tgv;48.84484;1;0;2.37549;Orange;INTRAIN",
      "tgv;48.84484;0;0;2.37549;Orange;INTRAIN",
    ].join("\n");

    expect((await parse(csv)).map((m) => m.level)).toEqual(["Weak", "None"]);
  });

  it("ignores measurements taken outside a train", async () => {
    const csv = [header, "routes;48.84484;1;1;2.37549;Orange;INCAR"].join("\n");

    expect(await parse(csv)).toEqual([]);
  });

  it("rejects an operator it does not know", async () => {
    const csv = [header, "tgv;48.84484;1;1;2.37549;Lebara;INTRAIN"].join("\n");

    await expect(parse(csv)).rejects.toThrow(/Unknown operator Lebara/);
  });

  it("rejects a file without a column it needs", async () => {
    const csv = [
      header.replace("loaded_in_less_5_secondes", "other"),
      "tgv;48.8;1;1;2.3;Orange;INTRAIN",
    ].join("\n");

    await expect(parse(csv)).rejects.toThrow(/Missing column loaded_in_less_5_secondes/);
  });
});
