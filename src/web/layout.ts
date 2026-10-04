import type { PreparedTrain } from "../application/prepare-train";
import type { Operator } from "../domain/model";

/** Where things sit along the line, from 0 at the first stop to 1 at the last. */
export type LineLayout = {
  readonly stops: readonly { readonly name: string; readonly at: number }[];
};

export function layOut(train: PreparedTrain, _operator: Operator): LineLayout {
  const lengthKm = train.stops.at(-1)?.atKm ?? 0;
  return { stops: train.stops.map(({ name, atKm }) => ({ name, at: atKm / lengthKm })) };
}
