import { createServer } from "node:http";
import { prepareTrain } from "../application/prepare-train";
import { loadRawData } from "./raw-data";
import { trainApi } from "./train-api";

const PORT = Number(process.env.PORT ?? 3000);

const dependencies = await loadRawData("data/raw");
createServer(trainApi((request) => prepareTrain(dependencies, request))).listen(PORT, () =>
  console.log(`Train API on http://localhost:${PORT}/api/trains/<train number>/<YYYY-MM-DD>`),
);
