# `anomaly_local_v1` Phase-2R Retuning Verification

Stand: 2026-04-24
Status: inconclusive

## Ergebnis

`P2R-W2-T1` konnte lokal nicht abgeschlossen werden, weil PostGIS aus dieser WSL-Session nicht erreichbar war.

Sowohl der erste Pflicht-Live-Run als auch der Harness-Rerun scheiterten vor der fachlichen Auswertung mit `ConnectionRefusedError` gegen `127.0.0.1:5432`.

Damit gibt es fuer `P2R` aktuell keine neuen Run-IDs und keine neuen Harness-Artefakte.
Die vorhandenen Artefakte in `docs/pipelines/anomaly_local_v1/artifacts/` bleiben die gueltige `P2`-Baseline.

## Pflichtverifikation

| Check | Ergebnis | Evidenz |
| --- | --- | --- |
| `backend/.venv/bin/python -m compileall backend/app` | green | lief erfolgreich ueber `backend/app` inkl. `backend/app/ml/evaluation` |
| `backend/.venv/bin/python -m backend.app.ml.evaluation.phase2_harness` | red | DB-Verbindung auf `127.0.0.1:5432` wurde verweigert |
| `backend/.venv/bin/python -m backend.app.ml.cli --pipeline anomaly_local_v1 --source gba --bbox 13.04027,47.80375,13.04387,47.80735` | red | derselbe `ConnectionRefusedError` vor Run-Erzeugung |
| `cd frontend && npm run build` | green | Vite-Prod-Build erfolgreich; nur bestehende Chunk-Size-Warnung |

Die beiden weiteren Pflicht-AOIs (`Moosstrasse`, `Osthang-Stressbereich`) wurden nach dem ersten fehlgeschlagenen CLI-Lauf nicht erneut gestartet, weil derselbe lokale DB-Blocker bereits vor der BBox-spezifischen Arbeit greift.

## Run-Stand

- `P2`-Baseline-Runs im vorhandenen Harness:
  - Mirabell: `b816c7d9-97bd-4e4f-9f76-1bef4b02e077`
  - Moosstrasse: `578684cf-67f3-4899-bf68-a48009451dd0`
  - Osthang-Stressbereich: `93a50f3c-21d9-40fd-931a-12c12c2bd8a9`
- Neue `P2R`-Run-IDs: keine, weil keine Live-Runs erzeugt werden konnten.
- Folge fuer den Harness: die Default-Konstanten bleiben auf der `P2`-Baseline. Fuer den entblockten Rerun kann der Harness jetzt neue IDs per CLI uebernehmen:

```bash
backend/.venv/bin/python -m backend.app.ml.evaluation.phase2_harness \
  --mirabell-run-id <RUN_ID> \
  --moosstrasse-run-id <RUN_ID> \
  --osthang-run-id <RUN_ID>
```

## Vorher/Nachher Referenzgebaeude

Die Vorher-Werte stammen aus `docs/pipelines/anomaly_local_v1/artifacts/phase2_reference_cases.json`.
Nachher-Werte sind bis zur Wiederherstellung der DB-Verbindung nicht verifizierbar, weil alte `P2`-Runs die Retuning-Felder nicht enthalten.

| Gebaeude | Vor P2R | Nach P2R | Status |
| --- | --- | --- | --- |
| `548205` | `ok`, Reliability `0.98` (`high`), Agreement `1.00`, Main-Support `44:7 / 95:2`, Stability `monitor` | nicht verifiziert | blocked |
| `96637447` | `ok`, Reliability `0.76` (`high`), Agreement `0.90`, `differential_motion_flag=true`, Main-Support `44:3 / 95:12`, Stability `monitor` | nicht verifiziert | blocked |
| `96637522` | `ok`, Reliability `0.52` (`medium`), Agreement `0.45`, `differential_motion_flag=true`, Main-Support `44:4 / 95:9`, Stability `monitor` | nicht verifiziert | blocked |
| `96637488` | `single_track_only`, Reliability `0.33` (`low`), Agreement `n/a`, Main-Support `44:4`, Stability `monitor` | nicht verifiziert | blocked |
| `96959854` | `small_n`, Reliability `0.14` (`low`), Agreement `n/a`, Main-Support `95:2`, Stability `monitor` | nicht verifiziert | blocked |
| `96637551` | `noise_dominated`, Reliability `0.10` (`low`), Agreement `n/a`, Main-Support `95:2`, Stability `monitor` | nicht verifiziert | blocked |
| `395674088` | `insufficient_support`, Reliability `n/a`, Agreement `n/a`, kein Main-Cluster, Stability `unstable` | nicht verifiziert | blocked |

## Kalibrationszaehler

Vergleichsbasis aus `docs/pipelines/anomaly_local_v1/phase2_calibration.md`:

- Vor `P2R`: `19/78` `ok`/`high`-Faelle mit duennem Track-Support
- Vor `P2R`: `20` `ok`-Faelle mit `track_agreement_score < 0.25`
- Vor `P2R`: Moosstrasse hatte `5` `ok`-Faelle mit `track_agreement_score < 0.10`

Nach `P2R`:

- `ok`/`high` mit duennem Track-Support: nicht messbar
- `ok` mit `track_agreement_score < 0.25`: nicht messbar
- Moosstrasse `ok` mit `track_agreement_score < 0.10`: nicht messbar

## Blocker und naechster Schritt

Harter Blocker:

- lokale DB fuer `backend.app.ml.cli` und `backend.app.ml.evaluation.phase2_harness` aus WSL nicht erreichbar (`127.0.0.1:5432`)
- `docker` ist in dieser WSL-Distribution nicht verfuegbar; ein Start von `docker compose up -d` war deshalb lokal nicht moeglich

Naechster Schritt nach Entblockung:

1. PostGIS fuer diese WSL-Session erreichbar machen.
2. Die drei Pflicht-Live-Runs fuer Mirabell, Moosstrasse und Osthang-Stressbereich erzeugen.
3. Neue Run-IDs in den Harness geben und `phase2_harness_results.json`, `phase2_harness_summary.md` und `phase2_reference_cases.json` neu schreiben.
4. Diese Notiz mit echten Nachher-Werten und finaler `P2R`-Bewertung abschliessen.
