import type { RequestListener, ServerResponse } from "node:http";
import type { PreparedTrain, TrainRequest } from "../application/prepare-train";

export type TrainPreparer = (request: TrainRequest) => Promise<PreparedTrain | undefined>;

const TRAIN_ROUTE = /^\/api\/trains\/([^/]+)\/(\d{4}-\d{2}-\d{2})$/;

/** Answers `GET /api/trains/<train number>/<YYYY-MM-DD>` with the prepared train. */
export function trainApi(prepare: TrainPreparer): RequestListener {
  return async (request, response) => {
    const [, trainNumber, date] = TRAIN_ROUTE.exec(request.url ?? "") ?? [];
    if (!trainNumber || !date) return answer(response, 404);
    try {
      const train = await prepare({ trainNumber, date });
      if (!train) return answer(response, 404);
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify(train));
    } catch (error) {
      console.error(`Preparing train ${trainNumber} on ${date} failed`, error);
      answer(response, 500);
    }
  };
}

function answer(response: ServerResponse, status: number): void {
  response.statusCode = status;
  response.end();
}
