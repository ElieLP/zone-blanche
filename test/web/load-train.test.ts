import { describe, expect, it } from "vitest";
import { loadPreparedTrain } from "../../src/web/load-train";

const serving = (body: string, init: ResponseInit) => async () => new Response(body, init);

describe("Loading a prepared train", () => {
  it("asks the train API for the train on that date", async () => {
    const asked: string[] = [];
    const load = loadPreparedTrain(async (url) => {
      asked.push(String(url));
      return new Response(null, { status: 404 });
    });

    await load("6111", "2026-10-10");

    expect(asked).toEqual(["api/trains/6111/2026-10-10"]);
  });

  it("fails when the page itself answers instead of the API", async () => {
    // Vite, like most static hosts with a fallback, serves index.html with status 200.
    const load = loadPreparedTrain(
      serving("<!doctype html><html></html>", {
        status: 200,
        headers: { "Content-Type": "text/html" },
      }),
    );

    await expect(load("3645", "2026-10-10")).rejects.toThrow();
  });

  it.each([500, 502])("fails when the server answers %i", async (status) => {
    const load = loadPreparedTrain(serving("Bad Gateway", { status }));

    await expect(load("6111", "2026-10-10")).rejects.toThrow();
  });

  it("loads the train the API answers", async () => {
    const load = loadPreparedTrain(
      serving(JSON.stringify({ trainNumber: "6111" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    expect(await load("6111", "2026-10-10")).toEqual({ trainNumber: "6111" });
  });

  it("finds nothing when the API finds no train, even with a JSON error body", async () => {
    const load = loadPreparedTrain(
      serving(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }),
    );

    expect(await load("3645", "2026-10-10")).toBeUndefined();
  });
});
