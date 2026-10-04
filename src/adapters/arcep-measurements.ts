import { OPERATORS, type ConnectivityLevel, type Operator, type Position } from "../domain/model";

export type ArcepMeasurement = {
  readonly operator: Operator;
  readonly position: Position;
  readonly level: Exclude<ConnectivityLevel, "Unknown">;
};

const COLUMNS = [
  "situation",
  "operator",
  "latitude_start",
  "longitude_start",
  "loaded_in_less_5_secondes",
  "loaded_in_less_10_secondes",
] as const;
type Column = (typeof COLUMNS)[number];

/** Reads ARCEP "Mon réseau mobile" QoS transport data: `;`-separated, no quoted fields. */
export function parseArcepMeasurements(csv: string): ArcepMeasurement[] {
  const [header = "", ...lines] = csv.trim().split(/\r?\n/);
  const names = header.split(";");
  const indexes = new Map(
    COLUMNS.map((column) => {
      const index = names.indexOf(column);
      if (index < 0) throw new Error(`Missing column ${column}`);
      return [column, index];
    }),
  );
  return lines.flatMap((line) => {
    const values = line.split(";");
    const field = (column: Column) => values[indexes.get(column) ?? -1] ?? "";
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
