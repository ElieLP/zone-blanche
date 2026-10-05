import { mkdtemp, writeFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { PreparedTrain } from "../../src/application/prepare-train";
import { app } from "../../src/server/app";

let server: Server | undefined;
afterEach(() => server?.close());

async function serving(): Promise<string> {
  const page = await mkdtemp(join(tmpdir(), "zone-blanche-"));
  await writeFile(join(page, "index.html"), "<!doctype html><title>Zone blanche</title>");
  const train = { trainNumber: "6111" } as PreparedTrain;
  server = createServer(app(async () => train, page));
  await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

describe("Zone blanche server", () => {
  it("serves the page and the train API from one place", async () => {
    const url = await serving();

    const page = await fetch(`${url}/`);
    const train = await fetch(`${url}/api/trains/6111/2026-10-10`);

    expect(await page.text()).toContain("Zone blanche");
    expect(await train.json()).toEqual({ trainNumber: "6111" });
  });
});
