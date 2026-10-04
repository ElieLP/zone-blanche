import type { RequestListener } from "node:http";
import type { PreparedTrain, TrainRequest } from "../application/prepare-train";

export type TrainPreparer = (request: TrainRequest) => Promise<PreparedTrain | undefined>;

const TRAIN_ROUTE = /^\/api\/trains\/([^/]+)\/([^/]+)$/;

/** Answers `GET /api/trains/<train number>/<YYYY-MM-DD>` with the prepared train. */
export function trainApi(prepare: TrainPreparer): RequestListener {
  return async (request, response) => {
    const [, trainNumber = "", date = ""] = TRAIN_ROUTE.exec(request.url ?? "") ?? [];
    const train = await prepare({ trainNumber, date });
    if (!train) {
      response.statusCode = 404;
      response.end();
      return;
    }
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify(train));
  };
}
