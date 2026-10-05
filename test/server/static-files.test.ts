import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { createServer, get, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { staticFiles } from "../../src/server/static-files";

let root: string;
beforeAll(async () => {
  const dir = await mkdtemp(join(tmpdir(), "zone-blanche-"));
  root = join(dir, "dist");
  await mkdir(join(root, "assets"), { recursive: true });
  await writeFile(join(root, "index.html"), "<!doctype html><title>Zone blanche</title>");
  await writeFile(join(root, "assets", "app.js"), "console.log(1)");
  await writeFile(join(dir, "secret.txt"), "outside the built page");
});

let server: Server | undefined;
afterEach(() => server?.close());

async function serving(): Promise<string> {
  server = createServer(staticFiles(root));
  await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

describe("Static files", () => {
  it("serves the page at the root", async () => {
    const response = await fetch(`${await serving()}/`);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/html; charset=utf-8");
    expect(await response.text()).toContain("Zone blanche");
  });

  it("serves a built asset with its content type", async () => {
    const response = await fetch(`${await serving()}/assets/app.js`);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/javascript; charset=utf-8");
  });

  it("answers Not Found for a missing file", async () => {
    const response = await fetch(`${await serving()}/assets/missing.js`);

    expect(response.status).toBe(404);
  });

  it.each(["/../secret.txt", "/%2e%2e/secret.txt", "/assets/..%2f..%2fsecret.txt"])(
    "never serves a file outside the built page, even for %s",
    async (path) => {
      const url = await serving();

      // Sent as is: fetch would resolve the dots before sending.
      const status = await new Promise((resolve, reject) =>
        get(`${url}${path}`, (response) => resolve(response.resume().statusCode)).on(
          "error",
          reject,
        ),
      );

      expect(status).toBe(404);
    },
  );
});
