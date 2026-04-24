# `anomaly_local_v1` Phase-2 Harness

Stand: 2026-04-23
Status: `P2-W1-T1`

## Zweck

Der Phase-2-Harness schafft eine reproduzierbare Baseline fuer Kalibrierung, Expertenreview und spaetere Regressionen.

Er hat drei feste Aufgaben:

- Pflicht-AOIs aus dem Runbook in einer wiederverwendbaren Auswertung einfrieren
- dieselbe Building-/Cluster-Semantik wie `P1` fuer Vergleiche verwenden
- ein Bootstrap-Signal fuer kleine `n` und fragile `main_cluster` liefern

## Feste Basis

Pflicht-AOIs:

- Mirabell: Run `b816c7d9-97bd-4e4f-9f76-1bef4b02e077`
- Moosstrasse: Run `578684cf-67f3-4899-bf68-a48009451dd0`
- Osthang-Stressbereich: Run `93a50f3c-21d9-40fd-931a-12c12c2bd8a9`

Feste Referenzfaelle:

- `548205` als stabiler Standardfall
- `548204` als benachbarter Standardfall mit moderaterem Track-Agreement
- `96637447` als Multi-Cluster-/Differentialfall
- `96637522` als Differentialfall mit niedrigerem Agreement
- `96637488` als `single_track_only`
- `96959854` als `small_n`
- `96637551` als `noise_dominated`
- `395674088` als `insufficient_support`

## Metriken

Der Harness fuehrt drei Ebenen zusammen.

### Point-Ebene

- `assigned_points`
- `kept_points`
- `gate_excluded_points`
- `noise_points`
- `normal_points`, `suspect_points`, `outlier_points`

### Cluster-Ebene

- `cluster_count`
- `reliable_cluster_count`
- `multi_cluster_buildings`
- `differential_motion_buildings`
- `main_cluster`-basierte Mediane pro Track

### Building-Ebene

- `building_status`
- `building_motion_mm_a`
- `building_reliability_score`
- `building_reliability_band`
- `track_agreement_score`
- `main_cluster_track_44_id`, `main_cluster_track_95_id`

## Stability-Signal

Fuer jeden Referenzfall wird ein Bootstrap auf den Punktgeschwindigkeiten der jeweiligen `main_cluster` gerechnet.

Reproduzierbare Default-Parameter:

- `bootstrap_samples=500`
- `bootstrap_seed=17`

Abgeleitete Signale:

- Track-lokale Bootstrap-Medianverteilung pro `main_cluster`
- Building-Motion-Verteilung aus den gebootstrappten Track-Medianen
- Track-Agreement-Verteilung mit derselben `allowed_diff_mm_a`-Logik wie in `P1`
- heuristisches `stability_band`: `stable`, `monitor`, `unstable`

Ein Gebaeude bekommt dabei nur dann `stable`, wenn beide vorhandenen Track-Signale selbst stabil bleiben. Ein duenner oder fragiler `main_cluster` auf einem Track zieht das Gebaeude hoechstens auf `monitor`.

Das Signal ist bewusst ein Kalibrierungswerkzeug, kein produktives Endnutzerfeld.

## Nutzung

Aus dem Repo-Root:

```bash
backend/.venv/bin/python -m backend.app.ml.evaluation.phase2_harness
```

Optionale Ausgaben:

```bash
backend/.venv/bin/python -m backend.app.ml.evaluation.phase2_harness \
  --bootstrap-samples 800 \
  --json-out docs/pipelines/anomaly_local_v1/artifacts/phase2_harness_results.json \
  --markdown-out docs/pipelines/anomaly_local_v1/artifacts/phase2_harness_summary.md \
  --reference-cases-out docs/pipelines/anomaly_local_v1/artifacts/phase2_reference_cases.json
```

## Artefakte

Der Default-Lauf schreibt:

- `docs/pipelines/anomaly_local_v1/artifacts/phase2_harness_results.json`
- `docs/pipelines/anomaly_local_v1/artifacts/phase2_harness_summary.md`
- `docs/pipelines/anomaly_local_v1/artifacts/phase2_reference_cases.json`

## Hinweise

- Der Harness liest direkt aus PostGIS und verwendet keine zweite Ad-hoc-API-Semantik.
- Referenzfaelle sind fest eingefroren; spaetere Zusatz-AOIs duerfen diese Basis erweitern, aber nicht ersetzen.
- Die Bootstrap-Baender sind fuer kleine `n` absichtlich streng, damit `small_n` und `insufficient_support` nicht nachtraeglich gesundgerechnet werden.
