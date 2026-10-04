#!/bin/sh
# Downloads the raw open data the preparation step reads, into data/raw/.
set -eu
raw="$(dirname "$0")/../data/raw"
mkdir -p "$raw"
cd "$raw"

curl -fL -o sncf-gtfs.zip \
  https://eu.ftp.opendatasoft.com/sncf/plandata/Export_OpenData_SNCF_GTFS_NewTripId.zip
rm -rf gtfs && mkdir gtfs && unzip -q -o sncf-gtfs.zip -d gtfs

curl -fL -o speed-sections.json \
  "https://ressources.data.sncf.com/api/explore/v2.1/catalog/datasets/vitesse-maximale-nominale-sur-ligne/exports/json"

curl -fL -o arcep-qos-transports.csv \
  https://data.arcep.fr/mobile/mesures_qualite_arcep/last/Metropole/2025_QoS_Metropole_data_transports.csv
