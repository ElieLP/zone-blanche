import type { ConnectivityLine, Operator } from "../domain/model";
import type { CoverageSource, JourneyRepository } from "./ports";

export type Dependencies = {
  readonly journeys: JourneyRepository;
  readonly coverage: CoverageSource;
};

export type ConnectivityRequest = {
  readonly trainNumber: string;
  readonly date: string;
  readonly operator: Operator;
};

export async function checkConnectivity(
  _dependencies: Dependencies,
  _request: ConnectivityRequest,
): Promise<ConnectivityLine> {
  throw new Error("not implemented");
}
