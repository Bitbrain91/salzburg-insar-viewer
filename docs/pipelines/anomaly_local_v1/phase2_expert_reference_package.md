# `anomaly_local_v1` Phase-2 Experten-Referenzpaket

Stand: 2026-04-23
Status: `P2-W1-T2`

## Ziel

Dieses Paket definiert die exportierbare Stichprobe fuer externe Fachlabels, insbesondere fuer AUGMENTERRA oder spaetere interne Reviewrunden.

## Review-Stichprobe

Die erste feste Review-Stichprobe umfasst acht Gebaeudefaelle:

- Mirabell `548205`: stabiler Standardfall
- Mirabell `548204`: benachbarter Standardfall
- Moosstrasse `96637447`: Multi-Cluster mit `differential_motion_flag=true`
- Moosstrasse `96637522`: Differentialfall mit niedrigerem Track-Agreement
- Moosstrasse `96637488`: `single_track_only`
- Moosstrasse `96959854`: `small_n`
- Moosstrasse `96637551`: `noise_dominated`
- Osthang-Stressbereich `395674088`: `insufficient_support`

Die Stichprobe deckt damit explizit ab:

- sauberer Standardfall
- interner Differentialfall
- Ein-Track-Fall
- Small-n-Grenzfall
- Noise-dominierter Fall
- insuffiziente Unterstuetzung

## Datenpaket

Das exportierbare JSON-Paket liegt unter:

- `docs/pipelines/anomaly_local_v1/artifacts/phase2_reference_cases.json`

Jeder Case enthaelt mindestens:

- `case_id`, `aoi`, `run_id`, `building_id`, `case_type`
- Bounding Box und Gebaeudehoehe
- Terrain-Kontext
- `building_analysis`
- `cluster_summaries`
- Punktliste mit `cluster_role`, `label`, `quality_score`, `anomaly_score`, `gate_excluded`, `assignment_method`
- Bootstrap-/Stability-Signal

## Bewertungsrubrik fuer Experten

Pro Fall sollen mindestens diese Fragen beantwortet werden:

1. Ist der ausgewaehlte `main_cluster` je Track fachlich plausibel?
2. Ist `building_motion_mm_a` als primaerer Gebaeudewert nachvollziehbar?
3. Ist `building_status` passend oder ueber-/unterreaktiv?
4. Ist `building_reliability_score` fuer den Fall zu hoch, passend oder zu niedrig?
5. Ist `differential_motion_flag` fachlich gerechtfertigt?

Empfohlene Antwortfelder:

- `main_cluster_judgement`: `correct`, `questionable`, `incorrect`
- `building_motion_judgement`: `usable`, `needs_review`, `misleading`
- `status_judgement`: `correct`, `too_strict`, `too_lenient`
- `reliability_judgement`: `too_high`, `about_right`, `too_low`
- `differential_motion_judgement`: `correct`, `missed`, `spurious`, `n/a`
- `comment`: Freitext

## Exportweg

Der aktuelle Exportweg ist dateibasiert:

1. Harness laufen lassen
2. `phase2_reference_cases.json` an die Review-Runde geben
3. Rueckmeldungen in tabellarischer Form oder JSON nach demselben `case_id` zurueckfuehren

Fuer einen spaeteren externen Versand koennen bei Bedarf noch Screenshots, GeoJSON oder statische Kartenansichten pro `case_id` ergaenzt werden. Das ist fuer `P2` kein Blocker.
