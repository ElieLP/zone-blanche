import { describe, expect, it } from "vitest";
import { parseFrenchDate } from "../../src/web/french-date";

describe("French dates", () => {
  it("reads dd/mm/yyyy as an ISO date", () => {
    expect(parseFrenchDate("09/10/2026")).toBe("2026-10-09");
  });
});
