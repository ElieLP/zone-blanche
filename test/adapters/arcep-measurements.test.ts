import { describe, expect, it } from "vitest";
import { parseArcepMeasurements } from "../../src/adapters/arcep-measurements";

const header =
  "axis;latitude_start;loaded_in_less_10_secondes;loaded_in_less_5_secondes;longitude_start;operator;situation";

describe("ARCEP on-train measurements", () => {
  it("reads a page loaded in under 5 seconds as Good", () => {
    const csv = `${header}\ntgv;48.84484;1;1;2.37549;Orange;INTRAIN\n`;

    expect(parseArcepMeasurements(csv)).toEqual([
      { operator: "Orange", position: { latitude: 48.84484, longitude: 2.37549 }, level: "Good" },
    ]);
  });

  it("reads a page loaded in 5 to 10 seconds as Weak, and a slower or failed one as None", () => {
    const csv = [
      header,
      "tgv;48.84484;1;0;2.37549;Orange;INTRAIN",
      "tgv;48.84484;0;0;2.37549;Orange;INTRAIN",
    ].join("\n");

    expect(parseArcepMeasurements(csv).map((m) => m.level)).toEqual(["Weak", "None"]);
  });

  it("ignores measurements taken outside a train", () => {
    const csv = [header, "routes;48.84484;1;1;2.37549;Orange;INCAR"].join("\n");

    expect(parseArcepMeasurements(csv)).toEqual([]);
  });

  it("rejects an operator it does not know", () => {
    const csv = [header, "tgv;48.84484;1;1;2.37549;Lebara;INTRAIN"].join("\n");

    expect(() => parseArcepMeasurements(csv)).toThrow(/Unknown operator Lebara/);
  });

  it("rejects a file without a column it needs", () => {
    const csv = [
      header.replace("loaded_in_less_5_secondes", "other"),
      "tgv;48.8;1;1;2.3;Orange;INTRAIN",
    ].join("\n");

    expect(() => parseArcepMeasurements(csv)).toThrow(/Missing column loaded_in_less_5_secondes/);
  });
});
