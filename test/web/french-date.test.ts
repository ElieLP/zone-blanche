import { describe, expect, it } from "vitest";
import { parseFrenchDate } from "../../src/web/french-date";

describe("French dates", () => {
  it("reads dd/mm/yyyy as an ISO date", () => {
    expect(parseFrenchDate("09/10/2026")).toBe("2026-10-09");
    expect(parseFrenchDate(" 9/10/2026 ")).toBe("2026-10-09");
  });

  it.each(["2026-10-09", "31/02/2026", "09/13/2026", ""])(
    "rejects %j, which is not a real dd/mm/yyyy date",
    (text) => {
      expect(parseFrenchDate(text)).toBeUndefined();
    },
  );
});
