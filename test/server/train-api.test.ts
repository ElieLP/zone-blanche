import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import type { PreparedTrain, TrainRequest } from "../../src/application/prepare-train";
import { trainApi, type TrainPreparer } from "../../src/server/train-api";

const train6111: PreparedTrain = {
  trainNumber: "6111",
  date: "2026-10-10",
  stops: [
    { name: "Paris", atKm: 0 },
    { name: "Marseille", atKm: 750 },
  ],
  stretches: {
    Orange: [{ fromKm: 0, toKm: 750, level: "Good" }],
    SFR: [{ fromKm: 0, toKm: 750, level: "Weak" }],
    Bouygues: [{ fromKm: 0, toKm: 750, level: "None" }],
    Free: [{ fromKm: 0, toKm: 750, level: "Unknown" }],
  },
};

let server: Server | undefined;
afterEach(() => server?.close());

async function serving(prepare: TrainPreparer): Promise<string> {
  server = createServer(trainApi(prepare));
  await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

describe("Train API", () => {
  it("prepares the asked train and answers it as JSON", async () => {
    const asked: TrainRequest[] = [];
    const url = await serving(async (request) => {
      asked.push(request);
      return train6111;
    });

    const response = await fetch(`${url}/api/trains/6111/2026-10-10`);

    expect(asked).toEqual([{ trainNumber: "6111", date: "2026-10-10" }]);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/json");
    expect(await response.json()).toEqual(train6111);
  });

  it("answers Not Found when the train does not run that day", async () => {
    const url = await serving(async () => undefined);

    const response = await fetch(`${url}/api/trains/3645/2026-10-10`);

    expect(response.status).toBe(404);
  });

  it("answers a server error when the preparation fails", async () => {
    const url = await serving(async () => {
      throw new Error("timetable unavailable");
    });

    const response = await fetch(`${url}/api/trains/6111/2026-10-10`, {
      signal: AbortSignal.timeout(1000),
    });

    expect(response.status).toBe(500);
  });

  it.each(["/api/trains/6111", "/api/trains/6111/10-10-2026", "/api/trains/6111/2026-10-10/x"])(
    "answers Not Found for %s without preparing anything",
    async (path) => {
      let prepared = 0;
      const url = await serving(async () => {
        prepared++;
        return train6111;
      });

      const response = await fetch(`${url}${path}`);

      expect(response.status).toBe(404);
      expect(prepared).toBe(0);
    },
  );
});
