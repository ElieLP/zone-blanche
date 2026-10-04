import type {
  ConnectivityLevel,
  ConnectivityLine,
  CoverageSample,
  Journey,
  Stretch,
} from "./model";

const CHUNK_KM = 1;

type MeasuredLevel = Exclude<ConnectivityLevel, "Unknown">;

const SEVERITY: Record<MeasuredLevel, number> = { Good: 0, Weak: 1, None: 2 };

export function buildConnectivityLine(
  journey: Journey,
  samples: readonly CoverageSample[],
): ConnectivityLine {
  return { stops: journey.stops, stretches: merge(chunksOf(journey, samples)) };
}

function chunksOf(journey: Journey, samples: readonly CoverageSample[]): Stretch[] {
  const count = Math.ceil(journey.lengthKm / CHUNK_KM);
  return Array.from({ length: count }, (_, i) => {
    const fromKm = i * CHUNK_KM;
    const toKm = Math.min(fromKm + CHUNK_KM, journey.lengthKm);
    const inside = samples.filter((s) => fromKm <= s.atKm && s.atKm < toKm);
    return { fromKm, toKm, level: worstOf(inside) };
  });
}

function worstOf(samples: readonly CoverageSample[]): ConnectivityLevel {
  return samples
    .map((s) => s.level)
    .filter((level): level is MeasuredLevel => level !== "Unknown")
    .reduce<ConnectivityLevel>(
      (worst, level) =>
        worst === "Unknown" || SEVERITY[level] > SEVERITY[worst] ? level : worst,
      "Unknown",
    );
}

function merge(chunks: readonly Stretch[]): Stretch[] {
  return chunks.reduce<Stretch[]>((stretches, chunk) => {
    const last = stretches.at(-1);
    if (last?.level === chunk.level) {
      stretches[stretches.length - 1] = { ...last, toKm: chunk.toKm };
    } else {
      stretches.push(chunk);
    }
    return stretches;
  }, []);
}
