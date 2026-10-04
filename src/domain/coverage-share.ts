import type { ConnectivityLevel, Stretch } from "./model";

/** The part of the journey, from 0 to 1, spent at each connectivity level. */
export type CoverageShare = Readonly<Record<ConnectivityLevel, number>>;

export function coverageShare(stretches: readonly Stretch[]): CoverageShare {
  const km = { Good: 0, Weak: 0, None: 0, Unknown: 0 };
  for (const { fromKm, toKm, level } of stretches) km[level] += toKm - fromKm;
  const lengthKm = km.Good + km.Weak + km.None + km.Unknown;
  return {
    Good: km.Good / lengthKm,
    Weak: km.Weak / lengthKm,
    None: km.None / lengthKm,
    Unknown: km.Unknown / lengthKm,
  };
}
