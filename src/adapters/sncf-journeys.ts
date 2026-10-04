import type { JourneyRepository } from "../application/ports";
import type { Journey } from "../domain/model";
import type { GtfsTimetable } from "./gtfs-timetable";
import type { RailNetwork } from "./rail-network";

/** Journeys from the SNCF timetable, measured along the SNCF rail network. */
export class SncfJourneys implements JourneyRepository {
  constructor(
    private readonly timetable: GtfsTimetable,
    private readonly network: RailNetwork,
  ) {}

  async find(trainNumber: string, date: string): Promise<Journey | undefined> {
    const stops = this.timetable.stopsOf(trainNumber, date);
    if (!stops) return undefined;
    const route = this.network.routeThrough(stops.map((s) => s.position));
    return {
      stops: stops.map((s, i) => ({ name: s.name, atKm: route.stopsAtKm[i] ?? 0 })),
      lengthKm: route.lengthKm,
    };
  }
}
