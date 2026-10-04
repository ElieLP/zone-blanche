import type { PreparedTrain } from "../application/prepare-train";
import type { TrainLoader } from "./app";

/** Loads the prepared trains the webapp serves under `data/`. */
export function loadPreparedTrain(fetch: typeof globalThis.fetch): TrainLoader {
  return async (trainNumber, date) => {
    const response = await fetch(`data/${trainNumber}-${date}.json`);
    return response.ok ? ((await response.json()) as PreparedTrain) : undefined;
  };
}
