import { describe, expect, it } from "vitest";
import { linesOf } from "../../src/adapters/lines";

describe("Lines of a text file", () => {
  it("splits on Unix and Windows line ends, ignoring the final line end", () => {
    expect(linesOf("a;b\r\nc;d\ne;f\r\n")).toEqual(["a;b", "c;d", "e;f"]);
  });
});
