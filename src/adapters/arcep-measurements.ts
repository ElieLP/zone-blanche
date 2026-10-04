import type { ConnectivityLevel, Operator } from "../domain/model";
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
  return lines.map((line) => {
    const values = line.split(";");
    const field = (name: string) => values[names.indexOf(name)] ?? "";
    return {
      operator: field("operator") as Operator,
      position: {
        latitude: Number(field("latitude_start")),
        longitude: Number(field("longitude_start")),
      },
      level: "Good",
    };
  });
}
