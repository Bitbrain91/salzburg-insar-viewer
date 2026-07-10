# Phase 8 v4 RC: automatisierter Service- und Vertrags-Smoke

**Stand:** 2026-07-10 12:54 CEST

**Status:** green

**Autoritativ fuer:** read-only Service-, Import-, OpenAPI-, JSON- und MVT-Smoke des P0-v4-RC

**Aktualisieren wenn:** derselbe RC-Snapshot erneut geprueft wird oder sich ein hier getesteter Vertrag aendert

Maschinenlesbare Evidenz:
[`phase8_v4_rc_automated_smoke.json`](phase8_v4_rc_automated_smoke.json)

## Ergebnis

Alle funktionalen Smoke-Vertraege sind gruen. Es wurden keine ML-Runs
gestartet, keine Baselines veraendert und keine Datenbank-Schreiboperationen
ausgefuehrt.

Ein Warnhinweis bleibt: Der Punkt-MVT-Request lieferte zwar HTTP 200 und den
korrekten v4-Vertrag, benoetigte beim Test aber rund 57,6 Sekunden. Fuer diesen
Smoke war kein Performance-Grenzwert definiert; der Befund ist deshalb keine
rote Vertragsverletzung.

## Gepruefter Snapshot

- v4-Run: `b4514e21-6643-410d-8daa-a870485e5150`
- Modell: `local_hdbscan_rulegate_v4_k2xhf_diffv2`
- Gebiet/Dataset: `salzburg` / `salzburg_snt`
- BEV-Gebaeude: `{CB6475BD-5BC6-4C43-85A1-5BF8D306AF0F}`
- Foreign-Punkt: `O2BDQW501`, Track 44
- Historischer Nullable-Test: Run
  `f2c4a59e-a4b1-46e1-ae8c-bf699e6f84ef`, Modell
  `local_hdbscan_rulegate_v2_k2x`, GBA-Gebaeude `143823101`

## Service-Smoke

| Dienst | Ergebnis | Evidenz |
|---|---|---|
| PostGIS | green | Container up; PostGIS 3.4; 81 Runs, 192.223 Punktresultate, 75.717 BEV-Gebaeude |
| MLflow | green | Container up; `GET /health` -> 200 `OK` |
| Backend | green | `GET /api/health` -> 200 `{"status":"ok"}` |
| Frontend | green | `GET http://127.0.0.1:3000` -> 200 HTML |

Der Backend-Root liefert erwartungsgemaess 404; der definierte Health-Vertrag
ist `/api/health`.

## Registry, Imports und OpenAPI

- Registry importiert erfolgreich und listet ausschliesslich
  `anomaly_local_v1`.
- Aktive Modellversion ist `local_hdbscan_rulegate_v4_k2xhf_diffv2`.
- Zentrale `cluster_kind`-Ableitung liefert `standard`, `annex`, `foreign`.
- OpenAPI: 200, `application/json`, 52.068 Bytes.
- `cluster_kind` ist in Punkt-, Building-Point- und Cluster-Schemas als Enum
  `standard | annex | foreign` vorhanden.
- `differential_motion_level` ist in Building- und Visualization-Summary als
  nullable Enum `none | candidate | significant | confirmed` definiert.
- `differential_motion_flag` kommt in OpenAPI nicht vor.
- Quellscan ueber 78 aktive Python-/TypeScript-Dateien in `backend/app`,
  `frontend/src` und `explainers/src`: null Treffer fuer das entfernte Feld.

## JSON-Vertraege

| Vertrag | Ergebnis | Kernevidenz |
|---|---|---|
| Punktanalyse | green | HTTP 200/`ready`; `cluster_kind=foreign`, Rolle `weak_support`, Level `none`, kein Legacy-Feld |
| Gebaeudeanalyse | green | HTTP 200; v4-Modell, Clusterarten `standard` und `foreign`, Level `none`, kein Legacy-Feld |
| Building-Points GeoJSON | green | zwei Features; `cluster_kind` und Level vorhanden, kein Legacy-Feld |
| Building-Context | green | HTTP 200; Summary-Level `none`, kein Legacy-Feld |
| Historischer v2-Run | green | HTTP 200; `differential_motion_level=null`, kein Legacy-Feld, Clusterart `standard` |

Der historische v2-Test belegt die vereinbarte Semantik: Ein Run ohne
persistiertes Level wird nicht zu `none` umgedeutet, sondern als `null`
ausgegeben.

## MVT-Vertraege

Tile `z14/x8784/y5709` des v4-Runs:

- Punkt-MVT: HTTP 200, `application/x-protobuf`, 236.118 Bytes;
  `cluster_kind` und `differential_motion_level` als Keys sowie `foreign` und
  `annex` als Werte vorhanden; kein Legacy-Key.
- Building-MVT: HTTP 200, `application/x-protobuf`, 33.460 Bytes;
  `differential_motion_level` vorhanden, kein Legacy-Key. `cluster_kind` wird
  im aggregierten Gebaeude-Tile erwartungsgemaess nicht ausgegeben; es ist ein
  Punkt-/Clustervertrag.

## Historische Persistenz

175.915 von 192.223 persistierten Punktresultaten enthalten im eingefrorenen
`meta.building_rollup` noch das alte Bool-Feld; 44.584 enthalten bereits das
Level. Das ist kein aktiver Fallback: Code, OpenAPI, JSON und MVT lesen oder
exponieren das entfernte Feld nicht. Historische Daten wurden gemaess Plan nicht
umgeschrieben.

## Claude-Code-MCP

Der persistente Block in `.codex/config.toml` wurde per `tomllib` geparst und
exakt geprueft:

- Command `/home/wsl_user/.local/bin/claude`
- Modell `fable`
- Effort `xhigh`
- Permission Mode `bypassPermissions`
- Subcommand `mcp serve`
- Startup-Timeout 60 Sekunden
- Claude Code `2.1.206`; `mcp serve --help` Exit 0

## Bewertung

**RC-Smoke: green.** Keine rote Vertrags- oder Serviceabweichung. Die hohe
Punkt-MVT-Latenz bleibt als Performance-Warnung fuer ein eigenes Folgeticket
sichtbar.
