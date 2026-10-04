import { join } from "node:path";
import type { Position } from "../domain/model";
import { readLines } from "./lines";

export type TimetabledStop = { readonly name: string; readonly position: Position };

export type GtfsTimetable = {
  stopsOf(trainNumber: string, date: string): readonly TimetabledStop[] | undefined;
};

export async function loadGtfsTimetable(directory: string): Promise<GtfsTimetable> {
  const file = (name: string) => join(directory, `${name}.txt`);
  const stopsById = new Map<string, TimetabledStop>();
  for await (const s of readCsv(file("stops"), ["stop_id", "stop_name", "stop_lat", "stop_lon"])) {
    stopsById.set(s.stop_id, {
      name: s.stop_name,
      position: { latitude: Number(s.stop_lat), longitude: Number(s.stop_lon) },
    });
  }
  const stopById = (id: string): TimetabledStop => {
    const stop = stopsById.get(id);
    if (!stop) throw new Error(`Unknown GTFS stop ${id}`);
    return stop;
  };

  // Indexed while reading, keeping no string read from stop_times (the biggest file):
  // V8 keeps the text a substring was cut from as long as the substring is kept.
  const tripsById = new Map<string, Trip>();
  const tripsByTrainNumber = new Map<string, Trip[]>();
  for await (const { trip_id, service_id, trip_headsign } of readCsv(file("trips"), [
    "trip_id",
    "service_id",
    "trip_headsign",
  ])) {
    const trip: Trip = { serviceId: service_id, calls: [] };
    tripsById.set(trip_id, trip);
    const sameNumber = tripsByTrainNumber.get(trip_headsign);
    if (sameNumber) sameNumber.push(trip);
    else tripsByTrainNumber.set(trip_headsign, [trip]);
  }
  for await (const { trip_id, stop_id, stop_sequence } of readCsv(file("stop_times"), [
    "trip_id",
    "stop_id",
    "stop_sequence",
  ])) {
    tripsById
      .get(trip_id)
      ?.calls.push({ sequence: Number(stop_sequence), stop: stopById(stop_id) });
  }
  for (const trip of tripsById.values()) trip.calls.sort((a, b) => a.sequence - b.sequence);
  const runningDates = new Map<string, Set<string>>();
  for await (const { service_id, date, exception_type } of readCsv(file("calendar_dates"), [
    "service_id",
    "date",
    "exception_type",
  ])) {
    if (exception_type !== "1") continue;
    const dates = runningDates.get(service_id) ?? new Set();
    runningDates.set(service_id, dates.add(date));
  }

  return {
    stopsOf(trainNumber, date) {
      const gtfsDate = date.replaceAll("-", "");
      const trip = tripsByTrainNumber
        .get(trainNumber)
        ?.find((t) => runningDates.get(t.serviceId)?.has(gtfsDate));
      return trip?.calls.map((call) => call.stop);
    },
  };
}

type Trip = {
  readonly serviceId: string;
  readonly calls: { readonly sequence: number; readonly stop: TimetabledStop }[];
};

/** Reads a plain CSV (no quoted fields) one row at a time, keeping only the given columns. */
async function* readCsv<Column extends string>(
  path: string,
  columns: readonly Column[],
): AsyncGenerator<Record<Column, string>> {
  let indexes: (readonly [Column, number])[] | undefined;
  for await (const line of readLines(path)) {
    if (!indexes) {
      const names = line.split(",");
      indexes = columns.map((column) => {
        const index = names.indexOf(column);
        if (index < 0) throw new Error(`Missing column ${column} in ${path}`);
        return [column, index] as const;
      });
      continue;
    }
    const values = line.split(",");
    yield Object.fromEntries(
      indexes.map(([column, index]) => [column, values[index] ?? ""]),
    ) as Record<Column, string>;
  }
}
