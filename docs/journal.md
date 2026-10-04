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
