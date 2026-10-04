import type { RequestListener, ServerResponse } from "node:http";
import type { PreparedTrain, TrainRequest } from "../application/prepare-train";

export type TrainPreparer = (request: TrainRequest) => Promise<PreparedTrain | undefined>;

const TRAIN_ROUTE = /^\/api\/trains\/([^/]+)\/(\d{4}-\d{2}-\d{2})$/;

/** Answers `GET /api/trains/<train number>/<YYYY-MM-DD>` with the prepared train. */
export function trainApi(prepare: TrainPreparer): RequestListener {
  return async (request, response) => {
    const [, trainNumber, date] = TRAIN_ROUTE.exec(request.url ?? "") ?? [];
    const train = trainNumber && date ? await prepare({ trainNumber, date }) : undefined;
    if (!train) return notFound(response);
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify(train));
  };
}

function notFound(response: ServerResponse): void {
  response.statusCode = 404;
  response.end();
}
