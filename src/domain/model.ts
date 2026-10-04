export const OPERATORS = ["Orange", "SFR", "Bouygues", "Free"] as const;

export type Operator = (typeof OPERATORS)[number];

export type Position = { readonly latitude: number; readonly longitude: number };

export type ConnectivityLevel = "Good" | "Weak" | "None" | "Unknown";

export type Stop = { readonly name: string; readonly atKm: number };

export type Journey = {
  readonly stops: readonly Stop[];
  readonly lengthKm: number;
  /** Positions the train follows from the first stop to the last. */
  readonly track: readonly Position[];
};

export type CoverageSample = {
  readonly atKm: number;
  readonly level: ConnectivityLevel;
};

export type Stretch = {
  readonly fromKm: number;
  readonly toKm: number;
  readonly level: ConnectivityLevel;
};

export type ConnectivityLine = {
  readonly stops: readonly Stop[];
  readonly stretches: readonly Stretch[];
};
