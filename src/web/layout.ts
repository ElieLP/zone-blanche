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
  /** Distance marks between the first and the last stop. */
  readonly ticks: readonly { readonly km: number; readonly at: number }[];
};

const TICK_STEPS_KM = [5, 10, 25, 50, 100, 200];
const MAX_TICKS = 15;

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
    ticks: ticksAlong(lengthKm).map((km) => ({ km, at: at(km) })),
  };
}

function ticksAlong(lengthKm: number): number[] {
  const step = TICK_STEPS_KM.find((km) => lengthKm / km <= MAX_TICKS) ?? TICK_STEPS_KM.at(-1)!;
  const ticks: number[] = [];
  for (let km = step; km < lengthKm; km += step) ticks.push(km);
  return ticks;
}
