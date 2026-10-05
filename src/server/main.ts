import { createServer } from "node:http";
import { prepareTrain } from "../application/prepare-train";
import { app } from "./app";
import { loadRawData } from "./raw-data";

const PORT = Number(process.env.PORT ?? 3000);

const dependencies = await loadRawData("data/raw");
createServer(app((request) => prepareTrain(dependencies, request), "dist")).listen(PORT, () =>
  console.log(`Zone blanche on http://localhost:${PORT}`),
);
