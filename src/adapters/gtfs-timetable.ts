import { linesOf } from "./lines";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Position } from "../domain/model";

export type TimetabledStop = { readonly name: string; readonly position: Position };

export type GtfsTimetable = {
  stopsOf(trainNumber: string, date: string): readonly TimetabledStop[] | undefined;
};

export async function loadGtfsTimetable(directory: string): Promise<GtfsTimetable> {
  const file = (name: string) => join(directory, `${name}.txt`);
  const [trips, calendarDates, stopTimes, stops] = await Promise.all([
    readCsv(file("trips"), ["trip_id", "service_id", "trip_headsign"]),
    readCsv(file("calendar_dates"), ["service_id", "date", "exception_type"]),
    readCsv(file("stop_times"), ["trip_id", "stop_id", "stop_sequence"]),
    readCsv(file("stops"), ["stop_id", "stop_name", "stop_lat", "stop_lon"]),
  ]);
  const stopsById = new Map<string, TimetabledStop>(
    stops.map((s) => [
      s.stop_id,
      {
        name: s.stop_name,
        position: { latitude: Number(s.stop_lat), longitude: Number(s.stop_lon) },
      },
    ]),
  );
  const stopById = (id: string): TimetabledStop => {
    const stop = stopsById.get(id);
    if (!stop) throw new Error(`Unknown GTFS stop ${id}`);
    return stop;
  };

  // Indexed once, keeping no string read from stop_times (the biggest file): V8 keeps a
  // whole file in memory as long as any substring of it is kept.
  const tripsById = new Map<string, Trip>();
  const tripsByTrainNumber = new Map<string, Trip[]>();
  for (const { trip_id, service_id, trip_headsign } of trips) {
    const trip: Trip = { serviceId: service_id, calls: [] };
    tripsById.set(trip_id, trip);
    const sameNumber = tripsByTrainNumber.get(trip_headsign);
    if (sameNumber) sameNumber.push(trip);
    else tripsByTrainNumber.set(trip_headsign, [trip]);
  }
  for (const { trip_id, stop_id, stop_sequence } of stopTimes) {
    tripsById
      .get(trip_id)
      ?.calls.push({ sequence: Number(stop_sequence), stop: stopById(stop_id) });
  }
  for (const trip of tripsById.values()) trip.calls.sort((a, b) => a.sequence - b.sequence);
  const runningDates = new Map<string, Set<string>>();
  for (const { service_id, date, exception_type } of calendarDates) {
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

/** Reads a plain CSV (no quoted fields) and keeps only the given columns. */
async function readCsv<Column extends string>(
  path: string,
  columns: readonly Column[],
): Promise<Record<Column, string>[]> {
  const [header = "", ...lines] = linesOf(await readFile(path, "utf8"));
  const names = header.split(",");
  const indexes = columns.map((column) => {
    const index = names.indexOf(column);
    if (index < 0) throw new Error(`Missing column ${column} in ${path}`);
    return [column, index] as const;
  });
  return lines.map((line) => {
    const values = line.split(",");
    return Object.fromEntries(
      indexes.map(([column, index]) => [column, values[index] ?? ""]),
    ) as Record<Column, string>;
  });
}
