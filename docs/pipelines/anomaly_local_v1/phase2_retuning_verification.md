# `anomaly_local_v1` Phase-2R Retuning Verification

Stand: 2026-04-24
Status: green

## Ergebnis

`P2R-W2-T1` ist mit echten neuen Live-Runs abgeschlossen.

Neue Pflicht-Runs:

- Mirabell: `33fb1821-3264-4fdd-8d5e-881222eb2ae7`
- Moosstrasse: `44b88a21-427d-4921-bcd0-ef9c6327fcab`
- Osthang-Stressbereich: `9c4bc346-529e-4ede-81bf-26ed651905b1`

Der Harness lief erfolgreich gegen diese Runs und hat `phase2_harness_results.json`,
`phase2_harness_summary.md` und `phase2_reference_cases.json` neu geschrieben.
Alle sieben Pflicht-Referenzgebaeude wurden gegen die neuen Artefakte geprueft; ihre
erwarteten Status (`ok`, `single_track_only`, `small_n`, `noise_dominated`,
`insufficient_support`) bleiben erhalten.

Die Retuning-Wirkung ist messbar:

- duenn gestuetzte `ok`-Faelle mit `building_reliability_score >= 0.75` sinken von `19/78`
  auf `5/62`
- gleichzeitig bleiben `0` `ok`-Faelle mit duennem Track-Support im `high`-Band; die
  restlichen `5` tragen `weak_secondary_track_flag=true` und werden auf `medium` gecappt
- `ok`-Faelle mit `track_agreement_score < 0.25` bleiben bei `20`, sind jetzt aber alle mit
  `agreement_tension_flag=true` markiert und liegen nur noch in `medium` (`14`) oder `low`
  (`6`)
- Moosstrasse behaelt `5` `ok`-Faelle mit `track_agreement_score < 0.10`; alle fuenf sind
  jetzt `low` und tragen die Penalty `very_low_track_agreement_band_cap`

`P2R` ist damit gruen. `P3` bleibt `planned` und startet nicht ohne neues User-Gate.

## Pflichtverifikation

| Check | Ergebnis | Evidenz |
| --- | --- | --- |
| `backend/.venv/bin/python -m compileall backend/app` | green | lief erfolgreich ueber `backend/app` inkl. `backend/app/ml/evaluation` |
| `backend/.venv/bin/python -m backend.app.ml.cli --pipeline anomaly_local_v1 --source gba --bbox 13.04027,47.80375,13.04387,47.80735` | green | neuer Mirabell-Run `33fb1821-3264-4fdd-8d5e-881222eb2ae7` |
| `backend/.venv/bin/python -m backend.app.ml.cli --pipeline anomaly_local_v1 --source gba --bbox 13.02714,47.79189,13.03074,47.79549` | green | neuer Moosstrasse-Run `44b88a21-427d-4921-bcd0-ef9c6327fcab` |
| `backend/.venv/bin/python -m backend.app.ml.cli --pipeline anomaly_local_v1 --source gba --bbox 13.0492,47.8036,13.0528,47.8054` | green | neuer Osthang-Run `9c4bc346-529e-4ede-81bf-26ed651905b1` |
| `backend/.venv/bin/python -m backend.app.ml.evaluation.phase2_harness` | green | erfolgreicher finaler Lauf mit den neuen Default-Run-IDs; Artefakte wurden auf `2026-04-24T10:12:48.415482+00:00` neu geschrieben |
| `cd frontend && npm run build` | green | Vite-Prod-Build erfolgreich; nur bestehende Chunk-Size-Warnung |

## Vorher/Nachher Referenzgebaeude

| Gebaeude | Vor P2R | Nach P2R | Bewertung |
| --- | --- | --- | --- |
| `548205` | `ok`, Reliability `0.98` (`high`), Agreement `1.00`, Main-Support `44:7 / 95:2`, Stability `monitor` | `ok`, Reliability `0.88` (`medium`), Agreement `1.00`, `weak_secondary_track_flag=true`, Penalties `weak_main_cluster_support` + `weak_secondary_track_band_cap`, Main-Support `44:7 / 95:2`, Stability `monitor` | green |
| `96637447` | `ok`, Reliability `0.76` (`high`), Agreement `0.90`, `differential_motion_flag=true`, Main-Support `44:3 / 95:12`, Stability `monitor` | `ok`, Reliability `0.76` (`high`), Agreement `0.90`, `differential_motion_flag=true`, keine Retuning-Penalty, Main-Support `44:3 / 95:12`, Stability `monitor` | green |
| `96637522` | `ok`, Reliability `0.52` (`medium`), Agreement `0.45`, `differential_motion_flag=true`, Main-Support `44:4 / 95:9`, Stability `monitor` | `ok`, Reliability `0.52` (`medium`), Agreement `0.45`, `differential_motion_flag=true`, keine Retuning-Penalty, Main-Support `44:4 / 95:9`, Stability `monitor` | green |
| `96637488` | `single_track_only`, Reliability `0.33` (`low`), Agreement `n/a`, Main-Support `44:4`, Stability `monitor` | `single_track_only`, Reliability `0.33` (`low`), Agreement `n/a`, Main-Support `44:4`, Stability `monitor` | green |
| `96959854` | `small_n`, Reliability `0.14` (`low`), Agreement `n/a`, Main-Support `95:2`, Stability `monitor` | `small_n`, Reliability `0.04` (`low`), Agreement `n/a`, Penalty `weak_main_cluster_support`, Main-Support `95:2`, Stability `monitor` | green |
| `96637551` | `noise_dominated`, Reliability `0.10` (`low`), Agreement `n/a`, Main-Support `95:2`, Stability `monitor` | `noise_dominated`, Reliability `0.00` (`low`), Agreement `n/a`, Penalty `weak_main_cluster_support`, Main-Support `95:2`, Stability `monitor` | green |
| `395674088` | `insufficient_support`, Reliability `n/a`, Agreement `n/a`, kein Main-Cluster, Stability `unstable` | `insufficient_support`, Reliability `n/a`, Agreement `n/a`, kein Main-Cluster, Stability `unstable` | green |

## Kalibrationszaehler

Vergleichsbasis aus `docs/pipelines/anomaly_local_v1/phase2_calibration.md`:

- Vor `P2R`: `19/78` `ok`/`high`-Faelle mit duennem Track-Support
- Vor `P2R`: `20` `ok`-Faelle mit `track_agreement_score < 0.25`
- Vor `P2R`: Moosstrasse hatte `5` `ok`-Faelle mit `track_agreement_score < 0.10`

Nach `P2R`:

- `ok`/`high` mit duennem Track-Support: `5/62` nach derselben Score-Definition
  (`building_reliability_score >= 0.75`); davon bleiben `0` im `high`-Band, weil alle
  `5` per `weak_secondary_track_band_cap` auf `medium` gecappt sind
- `ok` mit `track_agreement_score < 0.25`: weiter `20`; alle `20` tragen jetzt
  `agreement_tension_flag=true`, Bandverteilung `14 medium / 6 low`
- Moosstrasse `ok` mit `track_agreement_score < 0.10`: weiter `5`; alle `5` sind jetzt
  `low` und tragen `very_low_track_agreement_band_cap`

## Abschluss

Die `P2R`-Artefakte sind auf die neuen Live-Runs umgestellt.
Der Harness-Default zeigt jetzt auf dieselben drei Run-IDs wie diese Verifikation.
Weitere Arbeit an `P3` bleibt bewusst ausserhalb dieser Session und braucht ein neues
User-Gate.
