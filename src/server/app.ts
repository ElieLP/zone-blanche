import type { RequestListener } from "node:http";
import { staticFiles } from "./static-files";
import { trainApi, type TrainPreparer } from "./train-api";

/** The whole site: the train API under `/api/`, the built page in `pageDir` everywhere else. */
export function app(prepare: TrainPreparer, pageDir: string): RequestListener {
  const api = trainApi(prepare);
  const page = staticFiles(pageDir);
  return (request, response) =>
    (request.url ?? "").startsWith("/api/") ? api(request, response) : page(request, response);
}
