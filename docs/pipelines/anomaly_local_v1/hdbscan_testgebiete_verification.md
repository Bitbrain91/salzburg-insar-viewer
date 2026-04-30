# `anomaly_local_v1` HDBSCAN-Testgebiete Verification

Datum: 2026-04-30, Europe/Vienna

## Ziel

Diese Verifikation prueft `anomaly_local_v1` auf den drei festen Testgebieten mit aktivem
HDBSCAN. Source of Truth fuer Parameter und Methodik ist der Code in
`backend/app/ml/pipelines/anomaly_local_v1.py`.

## Verwendete Umgebung

- Repo: `/home/wsl_user/repos/Co-Inno/Stadt_Salzburg/insar_viewer_app`
- Interpreter: `backend/.venv-wsl/bin/python`
- Python: `3.12.3`
- `hdbscan`: `0.8.42`
- DB: `postgresql://***:***@127.0.0.1:5432/***`
- MLflow: `http://127.0.0.1:5001`
- Docker-Services: `db` und `mlflow` liefen.

Vor den Runs wurde verifiziert:

```text
/home/wsl_user/repos/Co-Inno/Stadt_Salzburg/insar_viewer_app/backend/.venv-wsl/bin/python
hdbscan_importable yes
pipeline_hdbscan_is_not_none True
```

Damit war der OPTICS-Fallback nicht aktiv.

## Neue Live-Runs

Alle Runs wurden mit `source=gba` und ohne `--track` ausgefuehrt, also mit `track=None`.

| AOI | BBox | Run-ID | Status |
| --- | --- | --- | --- |
| Mirabell | `13.04027,47.80375,13.04387,47.80735` | `2c4cec7b-90b8-4436-b8a1-78264c9b2a9d` | `succeeded` |
| Moosstrasse | `13.02714,47.79189,13.03074,47.79549` | `ed351403-fb5e-454c-a264-1ee87a9f59ee` | `succeeded` |
| Osthang-Stressbereich | `13.0492,47.8036,13.0528,47.8054` | `5dc6641b-03f8-4042-aa7d-935f69c25d78` | `succeeded` |

## Aktuelle HDBSCAN-Parameter aus dem Code

Density-Clustering wird nur fuer `Gebaeude x Track`-Gruppen mit mindestens `6` behaltenen
Punkten genutzt.

- `min_cluster_size = max(2, min(8, ceil(0.2 * n)))`
- `min_samples = max(1, floor(min_cluster_size / 2))`
- `allow_single_cluster = True`
- `cluster_selection_method = "eom"`
- `metric = "euclidean"`

Feature-Matrix vor HDBSCAN:

| Feature | Gewicht |
| --- | ---: |
| `along_look_offset_m` | `1.10` |
| `cross_look_offset_m` | `1.00` |
| `height_rank_in_building` | `0.75` |
| `velocity` | `1.30` |
| `acceleration` | `0.90` |
| `coherence_penalty` | `0.80` |

Die Matrix wird mit `RobustScaler(quantile_range=(15, 85))` skaliert und danach mit den
Gewichten multipliziert.

Borderline-Noise-Reassignment:

- greift nach HDBSCAN/OPTICS, wenn mindestens ein Cluster existiert
- Cluster-Zentren sind Median-Zentren; Radius ist das 90%-Distanzperzentil mit Untergrenze `0.65`
- Noise-Punkte werden nur reassigned, wenn `local_deviation_score <= 0.75` und `coherence >= 0.45`
- zusaetzlich muss `best_distance <= radius * 1.35 + 0.35` gelten
- `nearest`-Punkte sind nur akzeptiert, wenn `distance_m <= 8.0` oder die Track-Gruppe `<= 12` Punkte hat
- reassigned Punkte bekommen mindestens `probability=0.35` und hoechstens `outlier_score=0.55`

Small-N-Abgrenzung:

- `< 3` behaltene Punkte: `insufficient_support`, keine Clusterung
- `3-5` behaltene Punkte: Small-N-Fallback mit Ein-Cluster-Hypothese und
  `small_n_noise_threshold=0.80`
- `>= 6` behaltene Punkte: HDBSCAN

## Kennzahlen je AOI

| AOI | Total | Zugeordnet | Kept | Gate-excluded | Noise | Noise/Kept | Buildings | Buildings mit Clustern | Multi-Cluster |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Mirabell | 1481 | 1353 | 1310 | 171 | 463 | 35.34% | 58 | 57 | 28 |
| Moosstrasse | 1692 | 1685 | 1601 | 91 | 447 | 27.92% | 147 | 145 | 71 |
| Osthang-Stressbereich | 616 | 613 | 583 | 33 | 140 | 24.01% | 47 | 47 | 27 |

Trackweise:

| AOI | Track | Total | Zugeordnet | Kept | Gate-excluded | Core | Noise | Noise/Kept | Nearest |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Mirabell | 44 | 700 | 632 | 613 | 87 | 369 | 225 | 36.70% | 210 |
| Mirabell | 95 | 781 | 721 | 697 | 84 | 443 | 238 | 34.15% | 207 |
| Moosstrasse | 44 | 754 | 750 | 713 | 41 | 452 | 198 | 27.77% | 315 |
| Moosstrasse | 95 | 938 | 935 | 888 | 50 | 589 | 249 | 28.04% | 344 |
| Osthang-Stressbereich | 44 | 289 | 288 | 274 | 15 | 196 | 65 | 23.72% | 105 |
| Osthang-Stressbereich | 95 | 327 | 325 | 309 | 18 | 222 | 75 | 24.27% | 104 |

Building-Status und Reliability:

| AOI | `ok` | `single_track_only` | `small_n` | `noise_dominated` | `insufficient_support` | high | medium | low | unknown |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Mirabell | 23 | 7 | 7 | 7 | 14 | 19 | 17 | 8 | 14 |
| Moosstrasse | 65 | 11 | 21 | 9 | 41 | 24 | 51 | 31 | 41 |
| Osthang-Stressbereich | 26 | 8 | 6 | 1 | 6 | 12 | 23 | 6 | 6 |

Cross-Track-Agreement:

| AOI | Buildings mit Agreement | Median Agreement | `< 0.25` | `< 0.10` |
| --- | ---: | ---: | ---: | ---: |
| Mirabell | 28 | 0.64 | 2 | 0 |
| Moosstrasse | 70 | 0.45 | 18 | 4 |
| Osthang-Stressbereich | 27 | 0.74 | 1 | 0 |

HDBSCAN-spezifische Gruppensignale:

| AOI | HDBSCAN-Gruppen | Small-N-Gruppen | Insufficient-Gruppen | Median HDBSCAN-Noise je Gruppe | HDBSCAN-Gruppen mit >50% Noise |
| --- | ---: | ---: | ---: | ---: | ---: |
| Mirabell | 62 | 19 | 23 | 25.00% | 16 |
| Moosstrasse | 118 | 70 | 79 | 22.22% | 24 |
| Osthang-Stressbereich | 42 | 30 | 16 | 16.67% | 7 |

Core-Cluster-Groessen:

| AOI | Core-Cluster | Core min/median/p90/max | Main-Support min/median/p90/max |
| --- | ---: | --- | --- |
| Mirabell | 82 | `1 / 7 / 20 / 88` | `2 / 8 / 21 / 88` |
| Moosstrasse | 196 | `1 / 4 / 10 / 25` | `2 / 5 / 10 / 25` |
| Osthang-Stressbereich | 78 | `1 / 4 / 10 / 30` | `2 / 4 / 10 / 30` |

## Auffaellige Faelle

Low-Agreement-Faelle:

- Mirabell: `803726800` mit Agreement `0.125`, `ok`, `medium`; `55219642` mit `0.170`, `ok`, `medium`.
- Moosstrasse: `18` Faelle `<0.25`, davon `4` `<0.10`. Die niedrigsten sind
  `98698986` (`0.001`, `ok`, `low`), `98698984` (`0.004`, `ok`, `low`),
  `632158001` (`0.078`, `noise_dominated`, `medium`) und `96955335` (`0.094`, `ok`, `low`).
- Osthang-Stressbereich: nur `54773363` unter `0.25` (`0.135`, `noise_dominated`, `medium`).

Gebaeude mit vielen `nearest`-Assignments:

- Mirabell: `324384` (`54/214`), `44331034` (`26/96`), `548206` (`25/106`),
  `548207` (`18/69`), `44331052` (`18/85`).
- Moosstrasse: `96955370` (`21/41`), `96639519` (`18/35`), `96639520` (`18/53`),
  `96959827` (`16/27`), `632158001` (`16/32`), `96637447` (`15/30`).
- Osthang-Stressbereich: `150506168` (`23/47`), `150547747` (`17/25`),
  `48955023` (`17/39`), `395354933` (`11/25`), `150547755` (`10/26`).

Osthang-Stressbereich:

- `54773363`: `noise_dominated`, Agreement `0.135`, `13/23` Noise, einziger Osthang-Fall
  mit Agreement `<0.25`.
- `395674088`: `insufficient_support`, `2` Punkte, beide `nearest`, `slope_mean_deg` bis `50.5`.
- `395674090`: `insufficient_support`, `3` kept Punkte, `slope_mean_deg` bis `43.6`.
- `150506168`: trotz Hang/Relief (`slope_mean_deg` bis `43.4`, `relief_range_m` bis `22.0`)
  `ok`, `high`, Agreement `0.880`; aber `23/47` Punkte sind `nearest`.
- `48955023`: `single_track_only`, `medium`, `17/39` nearest, Hang/Relief auffaellig
  (`39.9`, `27.0`).
- `395674089`: `ok`, `medium`, Agreement `0.984`, aber `7/9` nearest und Relief bis `81.0`.
- `48955015` und `54773352`: beide `ok`, `medium`, mit `differential_motion_flag=true`
  und jeweils `4` reliable Clustern.

## Vergleich mit Referenz-/Retuning-Ergebnissen

Der Default-Harness zeigt aktuell im Code auf die Run-IDs
`b5c20834-6b5d-4a8f-b2a7-90ce623c78f7`,
`fa27294d-a4f9-4ba8-97ef-5dafb4eb99e5` und
`71770d85-ec8c-4354-840a-545fa0b7c757`. Fuer diese Analyse wurde der Harness mit den
neuen Run-IDs parametrisiert und nur nach `/tmp` geschrieben:

- `/tmp/anomaly_local_v1_hdbscan_testgebiete_harness_results.json`
- `/tmp/anomaly_local_v1_hdbscan_testgebiete_harness_summary.md`
- `/tmp/anomaly_local_v1_hdbscan_testgebiete_reference_cases.json`

Die bestehenden Referenzartefakte unter `docs/pipelines/anomaly_local_v1/artifacts/` wurden
nicht ueberschrieben.

Vergleich zur vorhandenen `phase2_harness_summary.md`:

| AOI | Referenz-Statuscounts | Neue Statuscounts | Bewertung |
| --- | --- | --- | --- |
| Mirabell | `13 insufficient`, `7 noise`, `24 ok`, `6 single`, `8 small_n` | `14 insufficient`, `7 noise`, `23 ok`, `7 single`, `7 small_n` | sehr nah, ein `ok` wechselt auf `single_track_only` |
| Moosstrasse | `40 insufficient`, `10 noise`, `65 ok`, `12 single`, `20 small_n` | `41 insufficient`, `9 noise`, `65 ok`, `11 single`, `21 small_n` | sehr nah |
| Osthang | `6 insufficient`, `2 noise`, `24 ok`, `9 single`, `6 small_n` | `6 insufficient`, `1 noise`, `26 ok`, `8 single`, `6 small_n` | leicht besser im Stress-AOI |

Referenzfaelle aus dem temporaeren Harness:

- Stabil geblieben: `548204`, `96637447`, `96637522`, `96637488`, `96959854`,
  `96637551`, `395674088`.
- Auffaellig: `548205` wechselt von `ok` auf `single_track_only`.

Der Fall `548205` ist kein HDBSCAN-Parameterproblem: Track `95` hat im neuen Lauf nur `5`
kept Punkte und laeuft deshalb in den Small-N-Fallback, nicht in HDBSCAN. Dort bleiben nur
`1` Core-Punkt und `4` Noise-Punkte; der Track liefert deshalb keinen reliable Main-Cluster.
Track `44` bleibt stabil mit `7` Core-Punkten. Eine Aenderung von `min_cluster_size` oder
`min_samples` wuerde diesen Fall nicht direkt adressieren.

Gegenueber den in `phase2_retuning_verification.md` dokumentierten Retuning-Zielen bleibt die
Richtung plausibel: sehr niedrige Agreement-Faelle sind weiter sichtbar und werden ueber
Reliability-Bands/Penalties abgefangen; Moosstrasse hat im neuen Lauf `4` Buildings mit
Agreement `<0.10` statt der dort dokumentierten `5` `ok`-Faelle.

## HDBSCAN-Qualitaetsbewertung

Positive Signale:

- Keine AOI kippt in "fast alles Noise"; Noise/Kept liegt bei `35.34%`, `27.92%` und `24.01%`.
- HDBSCAN-Gruppen haben median nur `25.00%`, `22.22%` und `16.67%` Noise.
- Main-Cluster werden in der Regel nicht von 1-2 Punkten dominiert; medianer Main-Support liegt
  bei `8`, `5` und `4` Punkten.
- Cross-Track-Filterung verbessert die Median-Differenz in allen drei Runs:
  `0.033`, `0.191` und `0.193` mm/a.
- Der Osthang-Stressbereich zeigt erwartete Grenzfaelle, aber keine systematische
  Fehlklassifikation: nur ein Agreement-Fall `<0.25`, nur ein `noise_dominated` Building,
  und mehrere steile/reliefreiche Gebaeude bleiben plausibel `ok`.

Grenzsignale:

- Mirabell hat mit `35.34%` die hoechste Noise/Kept-Rate und mehrere grosse, nearest-lastige
  Gebaeude mit `noise_dominated`.
- Einzelne HDBSCAN-Gruppen haben >50% Noise, aber diese Faelle sind ueberwiegend
  nearest-lastig, klein oder bereits durch Building-Status/Agreement sichtbar.
- `548205` ist als Referenzfall fragil, wird aber durch die Small-N-Fallback-Grenze verursacht.

## Entscheidung

Keine HDBSCAN-Parameterjustierung in dieser Session.

Begruendung:

- Die neuen HDBSCAN-Live-Runs sind belastbar abgeschlossen und zeigen keine breite
  systematische HDBSCAN-Fehlkalibrierung.
- Die Gesamtverteilungen sind nahe an den vorhandenen Phase-2-Harness-Artefakten.
- Die kritischen Low-Agreement- und Stressfaelle werden sichtbar gemacht und nicht
  weggemittelt.
- Der wichtigste Referenzwechsel (`548205`) liegt unterhalb der HDBSCAN-Grenze und gehoert
  fachlich in eine separate Small-N-Fallback-/Referenzfall-Pruefung, nicht in ein globales
  HDBSCAN-Retuning.

Empfohlener naechster Schritt ohne Parameterwechsel: `548205` und die hohen
nearest/noise-Faelle als gezielte Small-N- und Assignment-Spotchecks vormerken.
