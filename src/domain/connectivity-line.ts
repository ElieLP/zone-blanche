import type {
  ConnectivityLevel,
  ConnectivityLine,
  CoverageSample,
  Journey,
  Stretch,
} from "./model";

const CHUNK_KM = 1;

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
    return { fromKm, toKm, level: mostCommonOf(inside) };
  });
}

function mostCommonOf(samples: readonly CoverageSample[]): ConnectivityLevel {
  const counts = new Map<ConnectivityLevel, number>();
  for (const { level } of samples) counts.set(level, (counts.get(level) ?? 0) + 1);
  let mostCommon: ConnectivityLevel = "Unknown";
  let highest = 0;
  for (const [level, count] of counts) {
    if (count > highest) {
      mostCommon = level;
      highest = count;
    }
  }
  return mostCommon;
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
