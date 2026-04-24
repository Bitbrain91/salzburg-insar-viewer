# `anomaly_local_v1` Phase-2 KI-Vergleichsprotokoll

Stand: 2026-04-23
Status: `P2-W1-T3`

## Ziel

Dieses Protokoll macht den autonomen Zweitmeinungs-Vergleich reproduzierbar und maschinenlesbar.

Es dient nicht dazu, die Pipeline zu ersetzen. Es soll nur dieselben Building-/Cluster-Faelle mit einer separaten agentischen Beurteilung spiegeln und Diskrepanzen sichtbar machen.

## Eingabe

Die KI bekommt pro Fall genau einen strukturierten Input nach:

- `docs/pipelines/anomaly_local_v1/phase2_ai_input_schema.json`

Quelle fuer reale Faelle:

- `docs/pipelines/anomaly_local_v1/artifacts/phase2_reference_cases.json`

Ein Input-Case umfasst mindestens:

- Kontext: `case_id`, AOI, Run-ID, Gebaeude-ID, Bounding Box
- Terrain-Kontext
- `building_analysis`
- `cluster_summaries`
- Punktliste mit Rollen, Labels und Gate-Informationen
- Bootstrap-/Stability-Signal

## Erwartete Ausgabe

Die KI muss eine strukturierte Antwort nach:

- `docs/pipelines/anomaly_local_v1/phase2_ai_output_schema.json`

liefern.

Pflichtfelder:

- `predicted_status`
- `predicted_reliability_band`
- `main_cluster_track_44_id`
- `main_cluster_track_95_id`
- `differential_motion_judgement`
- `confidence`
- `rationale`
- `calibration_flags`

## Vergleichsmetriken

Die Phase-2-Auswertung vergleicht mindestens:

- Status-Uebereinstimmung
- Uebereinstimmung der `main_cluster`-IDs
- Uebereinstimmung beim `differential_motion_flag`
- Abweichung bei der Reliability-Band-Einschaetzung
- qualitative Diskrepanzgruennde aus `calibration_flags`

## Fallauswahl

Die Pflichtbasis fuer den KI-Vergleich ist identisch mit dem Expertenpaket:

- Mirabell `548205`
- Mirabell `548204`
- Moosstrasse `96637447`
- Moosstrasse `96637522`
- Moosstrasse `96637488`
- Moosstrasse `96959854`
- Moosstrasse `96637551`
- Osthang `395674088`

Diese Faelle decken die fuer `P2` relevanten Situationen ab:

- Standardfall
- Differentialfall
- Ein-Track-Fall
- Small-n
- Noise-dominierter Fall
- insuffiziente Unterstuetzung

## Vergleichsregeln

- Die KI soll auf derselben `P1`-Semantik urteilen, nicht auf alternativer Bewegungsdefinition.
- `avg_quality_score`, `avg_anomaly_score` und andere Diagnosefelder duerfen zur Begruendung genutzt werden, aber nie als primaere Building-Semantik.
- Wenn Bootstrap und Pipeline stark auseinanderlaufen, soll die KI das als Kalibrationshinweis markieren, nicht still ueberschreiben.

## Durchfuehrung

1. `phase2_reference_cases.json` in Input-Cases nach Input-Schema ueberfuehren
2. Pro `case_id` genau eine strukturierte KI-Antwort speichern
3. Antwort gegen Pipeline-Felder und Harness-Signale vergleichen
4. Diskrepanzen in `phase2_calibration.md` nach Ursache gruppieren
