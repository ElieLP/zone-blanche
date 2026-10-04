import { buildConnectivityLine } from "../domain/connectivity-line";
import { OPERATORS, type Operator, type Stop, type Stretch } from "../domain/model";
import type { Dependencies } from "./check-connectivity";

export type TrainRequest = { readonly trainNumber: string; readonly date: string };

/** What the webapp needs to show a train for any operator. */
export type PreparedTrain = TrainRequest & {
  readonly stops: readonly Stop[];
  readonly stretches: Readonly<Record<Operator, readonly Stretch[]>>;
};

export async function prepareTrain(
  { journeys, coverage }: Dependencies,
  { trainNumber, date }: TrainRequest,
): Promise<PreparedTrain> {
  const journey = await journeys.find(trainNumber, date);
  if (!journey) throw new Error(`No journey for train ${trainNumber} on ${date}`);
  const stretches = Object.fromEntries(
    await Promise.all(
      OPERATORS.map(async (operator) => {
        const samples = await coverage.samplesAlong(journey, operator);
        return [operator, buildConnectivityLine(journey, samples).stretches] as const;
      }),
    ),
  ) as Record<Operator, readonly Stretch[]>;
  return { trainNumber, date, stops: journey.stops, stretches };
}
