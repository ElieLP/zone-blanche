import type { CoverageSource, JourneyRepository } from "../../src/application/ports";
import type {
  ConnectivityLevel,
  CoverageSample,
  Journey,
  Operator,
  Stop,
} from "../../src/domain/model";

export class InMemoryJourneyRepository implements JourneyRepository {
  private readonly journeys = new Map<string, Journey>();

  add(trainNumber: string, date: string, journey: Journey): this {
    this.journeys.set(`${trainNumber}|${date}`, journey);
    return this;
  }

  async find(trainNumber: string, date: string): Promise<Journey | undefined> {
    return this.journeys.get(`${trainNumber}|${date}`);
  }
}

export class InMemoryCoverageSource implements CoverageSource {
  constructor(private readonly samples: Partial<Record<Operator, readonly CoverageSample[]>>) {}

  async samplesAlong(_journey: Journey, operator: Operator): Promise<readonly CoverageSample[]> {
    return this.samples[operator] ?? [];
  }
}

export function journeyThrough(...stops: Stop[]): Journey {
  return { stops, lengthKm: stops.at(-1)?.atKm ?? 0 };
}

export function stop(name: string, atKm: number): Stop {
  return { name, atKm };
}

type Zone = { fromKm: number; toKm: number; level: ConnectivityLevel };

/** One sample in the middle of every kilometre, `elsewhere` outside the zones. */
export function samplesAlong(
  lengthKm: number,
  { elsewhere, zones }: { elsewhere: ConnectivityLevel; zones: Zone[] },
): CoverageSample[] {
  return Array.from({ length: lengthKm }, (_, km) => {
    const atKm = km + 0.5;
    const zone = zones.find((z) => z.fromKm <= atKm && atKm < z.toKm);
    return { atKm, level: zone?.level ?? elsewhere };
  });
}
