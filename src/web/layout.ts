import type { PreparedTrain } from "../application/prepare-train";
import type { ConnectivityLevel, Operator } from "../domain/model";

/** Where things sit along the line, from 0 at the first stop to 1 at the last. */
export type LineLayout = {
  readonly stops: readonly { readonly name: string; readonly at: number }[];
  readonly stretches: readonly {
    readonly from: number;
    readonly to: number;
    readonly level: ConnectivityLevel;
  }[];
};

export function layOut(train: PreparedTrain, operator: Operator): LineLayout {
  const lengthKm = train.stops.at(-1)?.atKm ?? 0;
  const at = (km: number) => km / lengthKm;
  return {
    stops: train.stops.map(({ name, atKm }) => ({ name, at: at(atKm) })),
    stretches: train.stretches[operator].map(({ fromKm, toKm, level }) => ({
      from: at(fromKm),
      to: at(toKm),
      level,
    })),
  };
}
