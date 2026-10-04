import { describe, expect, it } from "vitest";
import { coverageShare } from "../../src/domain/coverage-share";

describe("Coverage share", () => {
  it("gives the part of the journey at each level", () => {
    const share = coverageShare([
      { fromKm: 0, toKm: 600, level: "Good" },
      { fromKm: 600, toKm: 650, level: "None" },
      { fromKm: 650, toKm: 700, level: "Good" },
      { fromKm: 700, toKm: 800, level: "Weak" },
    ]);

    expect(share).toEqual({ Good: 0.8125, Weak: 0.125, None: 0.0625, Unknown: 0 });
  });
});
