import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Position } from "./geo";

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

  return {
    stopsOf(trainNumber, date) {
      const gtfsDate = date.replaceAll("-", "");
      const runningServices = new Set(
        calendarDates
          .filter((c) => c.date === gtfsDate && c.exception_type === "1")
          .map((c) => c.service_id),
      );
      const trip = trips.find(
        (t) => t.trip_headsign === trainNumber && runningServices.has(t.service_id),
      );
      if (!trip) return undefined;
      return stopTimes
        .filter((st) => st.trip_id === trip.trip_id)
        .sort((a, b) => Number(a.stop_sequence) - Number(b.stop_sequence))
        .map((st) => stopById(st.stop_id));
    },
  };
}

/** Reads a plain CSV (no quoted fields) and keeps only the given columns. */
async function readCsv<Column extends string>(
  path: string,
  columns: readonly Column[],
): Promise<Record<Column, string>[]> {
  const [header = "", ...lines] = (await readFile(path, "utf8")).trim().split(/\r?\n/);
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
