# Zone blanche

Mobile coverage along a French train journey: enter a train number and a date,
see the line of its stops coloured by connectivity (Good / Weak / None /
Unknown) for Orange, SFR, Bouygues and Free.

## Run it

```sh
nix-shell                  # or any shell with Node 24, curl and unzip
npm install
scripts/download-data.sh   # ~250 MB of open data into data/raw/
npm run serve              # train API on :3000 (loads the data once, ~3 s)
npm run dev                # the page, forwarding /api to the train API
```

In production, `npm run build` then `npm run serve` answers both the page and
the API on one port (`PORT`, 3000 by default).

`npm test` runs the tests; `npm run typecheck` and `npm run lint` check the rest.

## How it works

The train's stops come from the SNCF timetable, its track from the SNCF Réseau
line network, and its connectivity from ARCEP's on-board measurements within
1 km of the track: each 1 km chunk takes the majority level of its
measurements. More in [`docs/domain.md`](docs/domain.md) and
[`docs/journal.md`](docs/journal.md).

## Data sources and licences

| Data | Producer | Licence |
|---|---|---|
| [Mon réseau mobile, QoS measurements in transport](https://www.data.gouv.fr/datasets/monreseaumobile/) | ARCEP | [Licence Ouverte / Open Licence](https://www.etalab.gouv.fr/licence-ouverte-open-licence/) |
| [Horaires SNCF (GTFS)](https://www.data.gouv.fr/datasets/horaires-sncf/) | SNCF Voyageurs | [ODbL](https://opendatacommons.org/licenses/odbl/) |
| [Vitesse maximale nominale sur ligne](https://www.data.gouv.fr/datasets/vitesse-maximale-nominale-sur-ligne/) | SNCF Réseau | [ODbL](https://opendatacommons.org/licenses/odbl/) |

The raw data is not in this repository (`scripts/download-data.sh` fetches it).
The small extracts in `test/adapters/fixtures/` stay under their source
licence: the ARCEP extract under the Licence Ouverte, the SNCF extracts under
the ODbL. Connectivity lines served by the train API are derived from these
sources, under the same terms.

## Licence

The code is under the [MIT licence](LICENSE). The data keeps its own licences,
listed above.
