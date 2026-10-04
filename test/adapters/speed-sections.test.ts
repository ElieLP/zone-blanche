import { describe, expect, it } from "vitest";
import { parseSpeedSections } from "../../src/adapters/speed-sections";

describe("SNCF speed sections", () => {
  it("reads the max speed and the track, coordinates being [longitude, latitude]", () => {
    const raw = [
      {
        code_ligne: "752000",
        v_max: "300",
        geo_shape: {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: [
              [4.84, 46.14],
              [4.85, 46.11],
            ],
          },
          properties: {},
        },
      },
    ];

    expect(parseSpeedSections(raw)).toEqual([
      {
        maxSpeedKmh: 300,
        track: [
          { latitude: 46.14, longitude: 4.84 },
          { latitude: 46.11, longitude: 4.85 },
        ],
      },
    ]);
  });
});
