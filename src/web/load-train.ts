import type { PreparedTrain } from "../application/prepare-train";
import type { TrainLoader } from "./app";

/** Loads the prepared trains from the train API (`src/server`); Not Found means the train does not run. */
export function loadPreparedTrain(fetch: typeof globalThis.fetch): TrainLoader {
  return async (trainNumber, date) => {
    const response = await fetch(`api/trains/${trainNumber}/${date}`);
    if (response.status === 404) return undefined;
    const isJson = response.headers.get("Content-Type")?.includes("json") ?? false;
    if (!response.ok || !isJson) {
      throw new Error(`Train API answered ${response.status} ${response.statusText}`);
    }
    return (await response.json()) as PreparedTrain;
  };
}
