import type { PreparedTrain } from "../application/prepare-train";
import { startApp } from "./app";

void startApp(document.querySelector<HTMLElement>("#app")!, async (trainNumber, date) => {
  const response = await fetch(`data/${trainNumber}-${date}.json`);
  return response.ok ? ((await response.json()) as PreparedTrain) : undefined;
});
