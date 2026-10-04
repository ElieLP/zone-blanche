import { describe, expect, it } from "vitest";
import { loadPreparedTrain } from "../../src/web/load-train";

const serving = (body: string, init: ResponseInit) => async () => new Response(body, init);

describe("Loading a prepared train", () => {
  it("finds nothing when the server answers a missing file with the page itself", async () => {
    // Vite, like most static hosts with a fallback, serves index.html with status 200.
    const load = loadPreparedTrain(
      serving("<!doctype html><html></html>", {
        status: 200,
        headers: { "Content-Type": "text/html" },
      }),
    );

    expect(await load("3645", "2026-10-10")).toBeUndefined();
  });
});
