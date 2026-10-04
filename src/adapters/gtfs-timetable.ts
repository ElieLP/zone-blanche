import { readFile } from "node:fs/promises";
import { join } from "node:path";

export type TimetabledStop = { readonly name: string };

export type GtfsTimetable = {
  stopsOf(trainNumber: string, date: string): readonly TimetabledStop[] | undefined;
};

type Row = Record<string, string>;

export async function loadGtfsTimetable(directory: string): Promise<GtfsTimetable> {
  const [trips, calendarDates, stopTimes, stops] = await Promise.all(
    ["trips", "calendar_dates", "stop_times", "stops"].map((file) =>
      readCsv(join(directory, `${file}.txt`)),
    ),
  );
  const stopNames = new Map(stops!.map((s) => [s.stop_id, s.stop_name!]));

  return {
    stopsOf(trainNumber, date) {
      const gtfsDate = date.replaceAll("-", "");
      const runningServices = new Set(
        calendarDates!
          .filter((c) => c.date === gtfsDate && c.exception_type === "1")
          .map((c) => c.service_id),
      );
      const trip = trips!.find(
        (t) => t.trip_headsign === trainNumber && runningServices.has(t.service_id),
      );
      if (!trip) return undefined;
      return stopTimes!
        .filter((st) => st.trip_id === trip.trip_id)
        .sort((a, b) => Number(a.stop_sequence) - Number(b.stop_sequence))
        .map((st) => ({ name: stopNames.get(st.stop_id!)! }));
    },
  };
}

async function readCsv(path: string): Promise<Row[]> {
  const [header, ...lines] = (await readFile(path, "utf8")).trim().split(/\r?\n/);
  const columns = header!.split(",");
  return lines.map((line) => {
    const values = line.split(",");
    return Object.fromEntries(columns.map((column, i) => [column, values[i] ?? ""]));
  });
}
