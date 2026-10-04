import type { CoverageSample, Journey, Operator } from "../domain/model";

export interface JourneyRepository {
  find(trainNumber: string, date: string): Promise<Journey | undefined>;
}

export interface CoverageSource {
  samplesAlong(journey: Journey, operator: Operator): Promise<readonly CoverageSample[]>;
}
