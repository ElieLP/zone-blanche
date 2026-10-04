import type { PreparedTrain } from "../application/prepare-train";
import type { TrainLoader } from "./app";

/** Loads the prepared trains from the train API (`src/server`). */
export function loadPreparedTrain(fetch: typeof globalThis.fetch): TrainLoader {
  return async (trainNumber, date) => {
    const response = await fetch(`api/trains/${trainNumber}/${date}`);
    const isJson = response.headers.get("Content-Type")?.includes("json") ?? false;
    return response.ok && isJson ? ((await response.json()) as PreparedTrain) : undefined;
  };
}
