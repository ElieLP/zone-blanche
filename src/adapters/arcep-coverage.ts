import type { CoverageSource } from "../application/ports";
import type { CoverageSample, Journey, Operator } from "../domain/model";
import type { ArcepMeasurement } from "./arcep-measurements";
import { coverageAlongTrack } from "./coverage-along-track";

/** Coverage measured by ARCEP on board trains, placed along the journey's track. */
export class ArcepCoverage implements CoverageSource {
  constructor(private readonly measurements: Iterable<ArcepMeasurement>) {}

  async samplesAlong(journey: Journey, operator: Operator): Promise<readonly CoverageSample[]> {
    return coverageAlongTrack(journey.track, this.measurements, operator);
  }
}
