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
});
