import { readFile } from "node:fs/promises";
import type { RequestListener } from "node:http";
import { extname, resolve, sep } from "node:path";

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".json": "application/json",
};

/** Serves the files of the built page in `root` (`/` is `index.html`), and nothing outside it. */
export function staticFiles(root: string): RequestListener {
  const base = resolve(root);
  return async (request, response) => {
    const path = decodeURIComponent(new URL(request.url ?? "/", "http://host").pathname);
    const file = resolve(base, `.${path.endsWith("/") ? `${path}index.html` : path}`);
    if (!file.startsWith(base + sep)) return notFound();
    try {
      const content = await readFile(file);
      response.setHeader(
        "Content-Type",
        CONTENT_TYPES[extname(file)] ?? "application/octet-stream",
      );
      response.end(content);
    } catch {
      notFound();
    }

    function notFound(): void {
      response.statusCode = 404;
      response.end();
    }
  };
}
