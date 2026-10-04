import type { SpeedSection } from "./rail-network";

type RawSpeedSection = {
  readonly v_max: string;
  readonly geo_shape: { readonly geometry: { readonly coordinates: [number, number][] } };
};

/** Parses the SNCF `vitesse-maximale-nominale-sur-ligne` JSON export. */
export function parseSpeedSections(raw: unknown): SpeedSection[] {
  if (!Array.isArray(raw)) throw new Error("Speed sections: expected an array");
  return raw.map((record: RawSpeedSection) => {
    const maxSpeedKmh = Number(record.v_max);
    if (!(maxSpeedKmh > 0)) throw new Error(`Speed sections: bad v_max ${record.v_max}`);
    return {
      maxSpeedKmh,
      track: record.geo_shape.geometry.coordinates.map(([longitude, latitude]) => ({
        latitude,
        longitude,
      })),
    };
  });
}
