# Journal

## 2026-10-04 — Scoping & data feasibility

### Product decisions
- Output: a line of the journey's stops, coloured by connectivity. Location of bad
  zones matters most; time is optional.
- Input: train number + date. Operator chosen by the user.
- 3-level scale: `Good` / `Weak` / `None`.
- France only, static (pre-trip), personal tool for now.

### Architecture decisions
- Hexagonal: pure domain `buildConnectivityLine`, two ports:
  `JourneyRepository` (train number, date → stops + route) and
  `CoverageSource` (route, operator → samples). Details in `domain.md`.
- Testing: acceptance tests with in-memory fakes of both ports; pure unit and
  property tests on the domain; contract tests on adapters using recorded fixtures.
- Walking skeleton first: one hardcoded route to check the data pipeline end to end.

### Data findings
- **ARCEP "Mon réseau mobile"** open data: <https://data.arcep.fr/mobile/>
  (doc per folder, `last/` = latest release).
  - `mesures_qualite_arcep/last/Metropole/2025_QoS_Metropole_data_transports.csv`
    (245 MB, `;`-separated, WGS84): field measurements taken on board trains.
    Key fields: `axis` (`tgv`, `intercites_ter`, `transiliens_rer`, …),
    `axis_name` (e.g. `TET PARIS - AMIENS`), `situation=INTRAIN`, `operator`,
    `protocole` (WEB, DLH, PING, STREAM…), success booleans,
    `latitude/longitude_start`, `techno_start`, `rsrp`.
  - Measurements are pass/fail per test → may map directly to the 3 levels
    (open decision 4).
  - Campaign once a year (2025: May–July), so data is up to 1 year old and
    sparse: points per test, not continuous.
  - `voix_transports.csv` (85 MB): voice/SMS tests, same format.
  - `mesures_crowdsourcing/`: third-party measurements; SNCF has been a partner
    in the past (worth checking). Ookla data: non-commercial use only.
  - `couvertures_theoriques/`: theoretical coverage per operator (gpkg),
    updated quarterly. Possible fallback where on-train measurements are missing.
- **SNCF API (Navitia)**: supports searching vehicle journeys by train number
  + date, with stop_times. Needs an API key; route geometry is still to be
  checked (fallback: OSM railways).
- **OSM railways**: track geometry plus `tunnel=yes`.

### Data profile (2025 on-train CSV)
- On board trains: 273k TGV points (44 lines), 193k Intercités/TER points (58 lines),
  64k Transilien/RER, 7k international TGV. Nearly all points have coordinates.
- TGV + Intercités/TER: only the `WEB` protocol (page load, success within 5s/10s),
  about 117k points per operator, balanced across the 4 operators.
- Density example: TGV Paris–Marseille has 10.6k points over about 750 km, i.e.
  about 3–4 points per km per operator. Enough to colour 1 km chunks.
- Candidate mapping to levels: loaded <5s → `Good`, <10s → `Weak`,
  failed → `None`.
- **Verdict: feasible** on the lines that were measured. Lines that weren't
  measured need a fallback.

### Decision: missing data → `Unknown`
- A 4th connectivity level, explicit in the type. No theoretical-coverage fallback.

### Journey data: SNCF GTFS (no API key needed)
- <https://eu.ftp.opendatasoft.com/sncf/plandata/Export_OpenData_SNCF_GTFS_NewTripId.zip>
  (5.6 MB zip, TGV + Intercités + TER, updated daily, covers about 6 months ahead).
- `trips.trip_headsign` = train number (18.6k numbers, 60k trips);
  `calendar_dates` = running days; `stop_times` + `stops` = ordered stops with
  coordinates.
- Verified: train 6111 on 2026-10-10 → Paris Gare de Lyon, Avignon TGV,
  Aix-en-Provence TGV, Marseille St-Charles.
- **No `shapes.txt`** → no track geometry. Navitia/API key not needed for now.

### Track geometry: candidates
- SNCF `formes-des-lignes-du-rfn` (ressources.data.sncf.com): 1638 line shapes
  of the national rail network, as GeoJSON. Route between stops = shortest path
  on a graph built from these shapes.
- OSM railways: fallback option.
- Tunnels: no SNCF dataset found. ARCEP measurements already show tunnels as
  failures, so B2 (tunnel override) is probably YAGNI.

### Next
- Prototype the route reconstruction (stops → path on the RFN graph). This is
  the riskiest remaining piece.

### Tooling
- NixOS: run tools through `nix-shell -p <pkg>` (jq, duckdb…). No python/node
  installed globally.
- The machine is aarch64 (Asahi): some packages aren't in the binary cache and
  get built from source (duckdb took about 12 min the first time; it's in the
  store now).

## 2026-10-04 — Stack & architecture decisions

### Decision: offline preparation + static web app
- Offline step (adapters) reads SNCF GTFS, the RFN line shapes and the ARCEP CSV,
  and writes compact JSON (routes, measurements matched to their position along
  each route).
- Static web app: loads the JSON, runs the pure domain, draws the line.
  No backend, no runtime API calls.

### Decision: TypeScript everywhere
- One language and one toolchain; domain types written once and used by both
  the offline step and the web app.
- Offline step: Node scripts. Geo work (snap to line, distance along it,
  shortest path) with turf.js or written by hand.
- Web app: Vite + plain TS + SVG, no UI framework.
- Tests: Vitest (unit + acceptance), fast-check (property tests, e.g. C4),
  Stryker (mutation testing).
- Environment: `shell.nix` with `nodejs`.
- Python rejected: better geo libraries, but a second language and duplicated
  domain types.

### Walking skeleton plan
1. `shell.nix` + TS project + Vitest.
2. Failing acceptance test from `domain.md` with in-memory fakes of both ports.
3. Make it pass with the pure domain, then real adapters one at a time,
   starting with route reconstruction for train 6111.

## 2026-10-04 — GTFS adapter, first contact with real data

- One train number = many GTFS trips (train 6111: 12 trips, one per service
  period). The date picks the trip through `calendar_dates` (`exception_type=1`).
- Stop names come raw from GTFS, e.g. `Paris Gare de Lyon Hall 1 - 2`. Fine for
  now; shorter display names can wait.
- The feed has no quoted fields and no BOM, so a plain comma split is enough.
- Gap confirmed: GTFS gives stop coordinates, not positions along the track.
  The domain's `Stop.atKm` needs route reconstruction (RFN shapes) first.

## 2026-10-04 — Route reconstruction spike (train 6111)

- RFN line shapes (`formes-des-lignes-du-rfn`): 787 operating lines, one
  `LineString` each, but they don't share vertices at junctions, so a raw graph
  falls apart into hundreds of components.
- Fix: keep each shape exact and link every section end to the nearest vertex
  of another section within **200 m**. Rounding coordinates to a grid also
  connects things, but can invent junctions where lines cross on bridges.
- **Shortest distance is the wrong rule**: Paris→Avignon took the classic line
  along the Rhône (207 km on 830000), which is shorter than the LGV around Lyon.
  Trains minimise *time*.
- Better source: `vitesse-maximale-nominale-sur-ligne` (2373 sections, each with
  its own `LineString` and `v_max`). Weight = length / v_max.
- Result for 6111: Paris→Avignon 657 km (608 km on LGV 752000), →Aix 75 km,
  →Marseille 19 km; **750 km in total**, which matches the real line.
- Decision: build the route graph from the speed sections, route by travel time,
  200 m end-linking. Stops snap to the nearest vertex.

## 2026-10-04 — Route reconstruction, test-driven

- `buildRailNetwork(speedSections).routeThrough(stopPositions)` gives the
  route length, each stop's km and the track followed. Unit tests on tiny
  synthetic networks; contract tests on real data for train 6111.
- Real-data surprises:
  - The first fixture (40 km around the straight Paris→Avignon line) dropped
    the middle of the LGV, which bends ~90 km east near Mâcon. The corridor
    now goes through Mâcon and Lyon.
  - Total km can't tell LGV from classic line (657 vs 654 km to Avignon). The
    contract test checks the track passes Lyon Saint-Exupéry instead.
  - Linear scans took 13 s on 43k vertices; a binary heap plus a 0.01° grid
    index for junctions brought it under 0.1 s.
- Next: a `JourneyRepository` adapter combining GTFS stops and the rail network
  into a domain `Journey`, then project ARCEP measurements onto the track.

## 2026-10-04 — Journey repository, ARCEP spike

- `SncfJourneys` (GTFS + rail network) implements `JourneyRepository`: 6111 on
  2026-10-10 gives Paris 0, Avignon ≈ 657, Aix ≈ 732, Marseille ≈ 750 km.
- ARCEP spike on `2025_QoS_Metropole_data_transports.csv` (919k rows), points
  within 1 km of the 6111 track:
  - TGV axis only has `protocole=WEB`. The four operators are measured at the
    same points (one rig, four SIMs): ~16k samples each along 6111, from 12
    axes sharing the line (Paris–Lyon, Paris–Marseille, Paris–Grenoble…),
    31 days in May–July 2025.
  - Distance to the track: median 100 m, p99 875 m.
  - `loaded_in_less_5_secondes` / `_10_` map straight to 3 levels:
    1|1 Good, 0|1 Weak, 0|0 None. Orange: 74 % Good, 15 % Weak, 11 % None.
  - Density: median 19 samples per km per operator; 694 of 751 km have at
    least one, the gaps are isolated single kilometres.
  - **Worst wins is unusable at this density**: Orange becomes None on 567 of
    694 km (one failed page load in 19 is enough). Majority gives 643 Good,
    26 Weak, 25 None. Open decision 2 needs revisiting.

## 2026-10-04 — Majority rule, ARCEP adapter, first real end-to-end line

- Decision 2: **majority wins** in a kilometre, a tie goes to the worse level.
- ARCEP adapter: `parseArcepMeasurements` (in-train rows only, fails fast on an
  unknown operator or a missing column) and `coverageAlongTrack` (projects each
  measurement onto the track segments, drops those more than 1 km away).
  - Snapping to the nearest track point wasn't enough: the 6111 track has 103
    gaps over 1 km between points, up to 2.9 km.
- Decision 4 applied as the candidate: under 5 s Good, under 10 s Weak, else
  None. Still to confirm.
- `Journey` now carries its track; `Position` moved into the domain model.
- First line from real data, 6111 Orange, fixture = the "TGV PARIS - MARSEILLE"
  axis only (~3.5 samples/km): Good 447 km, Weak 111, None 92, Unknown 100, in
  **436 stretches**. Too fragmented to read.
  - The spike with all 12 axes sharing the line (~19 samples/km) gave 643 Good,
    26 Weak, 25 None: the preparation step should use every TGV axis near the
    track, not only the train's own.
  - Projection is brute force (measurements × segments): ~0.8 s for 10k rows,
    fine offline. Optimise only if the preparation step gets slow.
- Next: the offline preparation script (full GTFS + speed sections + ARCEP →
  JSON per train), then the SVG page. Open: decision 3 (display scale), and
  whether 1 km chunks are too fine for a readable line.

## 2026-10-04 — Walking skeleton end to end

- `scripts/download-data.sh` fetches the raw data into `data/raw/` (ignored).
- `npm run prepare-train -- 6111 2026-10-10` writes
  `public/data/6111-2026-10-10.json` (ignored, regenerate): the stops and the
  stretches of all four operators (`prepareTrain`).
- Full data, every in-train measurement within 1 km of the track:

  | 6111 | Good | Weak | None | Unknown | stretches |
  |---|---|---|---|---|---|
  | Orange | 679 km | 38 | 30 | 3 | 124 |
  | SFR | 601 | 20 | 128 | 1 | 154 |
  | Bouygues | 582 | 27 | 140 | 1 | 160 |
  | Free | 648 | 33 | 68 | 1 | 132 |

- First run took 343 s (every measurement in France against every track
  segment); a grid index of segments brought it to 1.2 s, same output.
- Webapp (Vite, plain TS): form pre-filled with 6111, vertical SVG line, stops
  spaced by distance (decision 3, provisional). Checked with a headless
  Chromium screenshot.
- Seen on the page: 1 km blips are thin lines, hard to see; between Paris and
  Avignon (657 km, no stop) nothing tells where a bad zone is.
- Next: make bad zones readable (landmarks or km ticks, minimum stretch
  length?), a UI smoke test, Stryker.

## 2026-10-04 — Trains prepared on demand

- Raw data is 100+ MB: too much for the browser, so a backend it is.
- `npm run serve` loads the raw data once (~3 s), then
  `GET /api/trains/<number>/<YYYY-MM-DD>` prepares any train (~1 s):
  200 JSON, 404 if it does not run (or bad path), 500 if preparing fails.
- `npm run dev` forwards `/api` to it. The offline CLI and `public/data` are gone.
- Checked on real data: 6111 identical to the CLI output; 3645
  (Paris Austerlitz → Toulouse line) now shows.
- Next: serve the built page from the same server (one thing to deploy), then
  hosting. ~1 s per request is fine for now; cache if it matters.

## 2026-10-04 — UI/UX pass

- No default train; the date defaults to today (injected, so tests stay
  deterministic). "Preparing train…" while the API works (~1 s).
- Operators are cards: switching redraws instantly (no reload), and each card
  shows its coverage share (mini bar + "% good"), to compare at a glance.
- Distance marks along the line (5…200 km step, ≤ 15 marks) locate bad zones
  between distant stops.
- Restyle: header, form card, dark theme; chart capped at its natural width so
  text stays readable on a phone. Checked by headless Chromium screenshots
  (6111, 3645, light/dark, 390 px).
- Next: shareable URL (train/date/operator in the query string)?

## 2026-10-04 — Memory below 512 MB

- Goal: fit free or tiny hosting tiers (512 MB). Before: 1.2 GB peak, 850 MB steady.
- Findings (heap snapshots):
  - `split(/\r?\n/)` on a file left the whole file referenced by V8's last
    regex match: the 246 MB ARCEP CSV lived as long as the server.
  - Substrings keep their whole source text alive: GTFS rows kept the 85 MB
    `stop_times.txt` in memory.
- Fixes: files read line by line; timetable indexed by train number at load
  (no stop_times string kept; no full scan per request); ARCEP measurements as
  number columns; heap capped at 256 MB (`npm run serve`).
- After: ~190 MB of live heap, peak 490 MB, steady 350–430 MB; load ~3.5 s,
  ~1 s per train, same output.
- Watch: a bigger yearly ARCEP file could exceed the 256 MB cap (the API then
  fails at startup, loudly).
