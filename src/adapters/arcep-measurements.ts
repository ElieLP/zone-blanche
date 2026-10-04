import { OPERATORS, type ConnectivityLevel, type Operator } from "../domain/model";
import type { Position } from "./geo";

export type ArcepMeasurement = {
  readonly operator: Operator;
  readonly position: Position;
  readonly level: Exclude<ConnectivityLevel, "Unknown">;
};

/** Reads ARCEP "Mon réseau mobile" QoS transport data: `;`-separated, no quoted fields. */
export function parseArcepMeasurements(csv: string): ArcepMeasurement[] {
  const [header = "", ...lines] = csv.trim().split(/\r?\n/);
  const names = header.split(";");
  return lines.flatMap((line) => {
    const values = line.split(";");
    const field = (name: string) => values[names.indexOf(name)] ?? "";
    if (field("situation") !== "INTRAIN") return [];
    return {
      operator: operatorOf(field("operator")),
      position: {
        latitude: Number(field("latitude_start")),
        longitude: Number(field("longitude_start")),
      },
      level: levelOf(field("loaded_in_less_5_secondes"), field("loaded_in_less_10_secondes")),
    };
  });
}

function operatorOf(name: string): Operator {
  const operator = OPERATORS.find((o) => o === name);
  if (!operator) throw new Error(`Unknown operator ${name}`);
  return operator;
}

/** Decision 4: under 5 s is Good, under 10 s is Weak, slower or failed is None. */
function levelOf(loadedIn5s: string, loadedIn10s: string): ArcepMeasurement["level"] {
  if (loadedIn5s === "1") return "Good";
  if (loadedIn10s === "1") return "Weak";
  return "None";
}
