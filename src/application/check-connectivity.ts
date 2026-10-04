import { buildConnectivityLine } from "../domain/connectivity-line";
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
  { journeys, coverage }: Dependencies,
  { trainNumber, date, operator }: ConnectivityRequest,
): Promise<ConnectivityLine> {
  const journey = await journeys.find(trainNumber, date);
  if (!journey) throw new Error(`No journey for train ${trainNumber} on ${date}`);
  const samples = await coverage.samplesAlong(journey, operator);
  return buildConnectivityLine(journey, samples);
}
