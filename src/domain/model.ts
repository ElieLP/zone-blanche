export type Operator = "Orange" | "SFR" | "Bouygues" | "Free";

export type ConnectivityLevel = "Good" | "Weak" | "None" | "Unknown";

export type Stop = { readonly name: string; readonly atKm: number };

export type Journey = {
  readonly stops: readonly Stop[];
  readonly lengthKm: number;
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
