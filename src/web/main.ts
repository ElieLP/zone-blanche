import { startApp } from "./app";
import { loadPreparedTrain } from "./load-train";

void startApp(
  document.querySelector<HTMLElement>("#app")!,
  loadPreparedTrain(fetch.bind(globalThis)),
);
