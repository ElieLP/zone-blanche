import { startApp } from "./app";
import { loadPreparedTrain } from "./load-train";

const now = new Date();
const today = [now.getFullYear(), now.getMonth() + 1, now.getDate()]
  .map((n) => String(n).padStart(2, "0"))
  .join("-");

startApp(
  document.querySelector<HTMLElement>("#app")!,
  loadPreparedTrain(fetch.bind(globalThis)),
  today,
);
