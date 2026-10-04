# Domain: Mobile Network on Train

## Goal

A personal mini webapp that shows, for a given train journey, which parts of the
itinerary will have mobile network issues.

## Requirements

- **Main output**: a line showing each stop, coloured by connectivity along the
  itinerary. The *location* of bad connectivity matters most; times are optional
  (users can work out the hour from the location).
- **Input**: train number + date.
- **Operator-specific**: the user picks their operator.
- **Scale**: 3 levels (`Good` / `Weak` / `None`), plus `Unknown` where there is no data.
- **Scope**: France only for now.
- **Static**: planning before the trip, no live tracking.
- **Audience**: personal tool for now; publishing may come later.

## 1. Ubiquitous language

| Term | Meaning |
|---|---|
| **Train number** | Commercial number, e.g. `6611`. A value type, not a bare string. |
| **Journey** | One train number running on one date. |
| **Stop** | A station the journey calls at, with its position. Stops are ordered. |
| **Route** | The track geometry the journey follows from the first stop to the last. |
| **Operator** | Orange, SFR, Bouygues or Free. A closed set. |
| **Connectivity level** | `Good`, `Weak`, `None`, or `Unknown` (no measurement). |
| **Stretch** | A continuous part of the route where the connectivity level doesn't change. |
| **Connectivity line** | The result: stops in order, with coloured stretches between and across them. |

## 2. Architecture (hexagonal)

```
              ┌───────────────────── Domain (pure) ─────────────────────┐
 UI ──────▶   │  buildConnectivityLine(journey, coverage, operator)     │
 (adapter)    │     → ConnectivityLine                                  │
              └─────────────────────────────────────────────────────────┘
                     ▲                                ▲
          JourneyRepository port            CoverageSource port
      (trainNumber, date) → Journey     (route, operator) → samples
                     ▲                                ▲
            SNCF / Navitia adapter           ARCEP open-data adapter
            (+ OSM for geometry?)            (+ OSM tunnels?)
```

- **Domain:** pure functions with no I/O, so it's fully unit-testable.
- **Ports:** two of them, both owned by us. These are the only things we mock or fake.
- **Adapters:** fetching and parsing external data. They turn raw input into
  domain types at the boundary.

### Candidate data sources

- **ARCEP "Mon réseau mobile" open data**: coverage per operator, plus
  measurements taken on board trains (TGV, Intercités, TER).
- **OpenStreetMap railways**: track geometry and `tunnel=yes` tags.
- **SNCF / Navitia API**: journeys, timetables, stops.

## 3. Key behaviours

### A. Find the journey (application layer + JourneyRepository)
- A1. Given a train number and date, return its stops in order, with the route.
- A2. Reject a train number that doesn't exist.
- A3. Reject a train that doesn't run on that date.
- A4. Handle a journey that leaves France (see open decision 5).

### B. Classify coverage (domain)
- B1. A raw measurement maps to `Good`, `Weak` or `None` using fixed thresholds.
- B2. A tunnel always forces `None`, whatever the measurement says.

### C. Project coverage onto the route (domain, the core of the app)
- C1. Cut the route into fixed-length chunks (e.g. 1 km) and give each chunk a
  level from the samples near it.
- C2. If several samples fall in one chunk, apply one rule to choose its level
  (proposed: **worst wins**).
- C3. Merge consecutive chunks with the same level into one stretch.
- C4. Stretches cover the whole route with no gaps or overlaps. This is an
  invariant, a good fit for a property-based test.

### D. Place stretches relative to stops (domain)
- D1. Each stretch knows where it starts and ends as a distance from the origin.
- D2. A stretch can run past a stop, e.g. a dead zone that starts before Mâcon
  and ends after it.
- D3. Each stop has a position along the line, so you can read things like
  "bad from just after Dijon to halfway to Mâcon".

### E. Render (UI adapter, kept thin)
- E1. Draw a horizontal or vertical line with stop markers and coloured stretches.
- E2. Show the chosen operator and journey in the header.

## 4. Testing strategy

| Layer | Test type | Doubles |
|---|---|---|
| Acceptance (outer loop) | Ask for a train, date and operator, then check the connectivity line | In-memory fakes for both ports |
| Domain (B, C, D) | Unit tests plus property-based tests for C4 | None, it's pure |
| Adapters | Contract tests against recorded real responses (fixtures) | None, use real parsing on saved payloads |
| UI | One or two rendering smoke tests | Fake application service |

Example acceptance scenario:

```gherkin
Scenario: a dead zone between two stops is shown on the line
  Given train 6611 on 2026-10-10 stops at Paris, Dijon, Lyon
  And Orange has no coverage between km 120 and km 135
  When I check train 6611 on 2026-10-10 for Orange
  Then the line shows stops Paris, Dijon, Lyon in that order
  And there is a "None" stretch from km 120 to km 135, between Paris and Dijon
  And the rest of the line is "Good"
```

## 5. Open decisions

1. ~~**Missing data**~~ **Decided**: 4th level `Unknown` (explicit in the type, never
   null). No guessing, no theoretical-coverage fallback for now.
2. **Aggregation**: is "worst wins" inside a chunk the right rule?
3. **Display scale**: space stops in proportion to distance (accurate) or
   evenly (easier to read)?
4. **Thresholds**: if ARCEP on-train data is already classified, use its scale
   directly; B1 then becomes a simple mapping in the adapter rather than a
   domain rule. Check the actual datasets first.
5. **Cross-border trains** (e.g. Paris to Milan): reject them, or show only the
   French part?
