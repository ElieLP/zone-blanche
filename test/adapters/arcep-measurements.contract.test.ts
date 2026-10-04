import { describe, expect, it } from "vitest";
import { parseArcepMeasurements } from "../../src/adapters/arcep-measurements";
import { readLines } from "../../src/adapters/lines";
import { OPERATORS } from "../../src/domain/model";

const fixture = new URL("./fixtures/arcep-tgv-paris-marseille.csv", import.meta.url).pathname;

describe("ARCEP measurements on real data", () => {
  it("reads every TGV Paris–Marseille measurement, about a quarter per operator", async () => {
    const measurements = [...(await parseArcepMeasurements(readLines(fixture)))];

    expect(measurements).toHaveLength(10611);
    for (const operator of OPERATORS) {
      const share = measurements.filter((m) => m.operator === operator).length / 10611;
      expect(share).toBeCloseTo(0.25, 2);
    }
  });
});
