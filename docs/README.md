# Docs Overview

Dieser Ordner ist nach Themen statt nach Einzeldateien organisiert. Neue Doku sollte moeglichst in die passende Unterstruktur gelegt werden statt direkt in `docs/`.

## Struktur

- `docs/workflows/`
  - repo-weite Arbeitsweisen, z. B. der AI-Supervisor-Workflow
- `docs/pipelines/`
  - pipeline-spezifische Methodik, Plaene, Runbooks und Supervisor-Artefakte
  - aktueller Fokus: `docs/pipelines/anomaly_local_v1/`
- `docs/research/`
  - fachliche Analyse, externe Grundlagen und Rohdaten-Auswertung
- `docs/project/`
  - Projektziele, Antraege und uebergeordnete Produktdokumente
- `docs/architecture/`
  - Diagramme und Systemdarstellungen
- `docs/archive/legacy/`
  - alte oder ersetzte Doku, die nicht mehr aktiver Arbeitsstand ist

## Wichtige Einstiege

- Workflow-Standard: `docs/workflows/ai_supervisor_workflow.md`
- Aktueller Umsetzungsplan fuer `anomaly_local_v1`: `docs/pipelines/anomaly_local_v1/phase2_execution_plan.md`
- Supervisor-Startprompt fuer `anomaly_local_v1`: `docs/pipelines/anomaly_local_v1/supervisor_prompt.md`
- Runbook mit festen Test-AOIs: `docs/pipelines/anomaly_local_v1/runbook.md`
- Fachliche Methodik der aktiven Pipeline: `docs/pipelines/anomaly_local_v1/methodik.md`
- Rohdatenanalyse: `docs/research/Datenanalyse_InSAR_Salzburg.md`

## Ablageregeln

- Neue pipeline-spezifische Dokumente unter `docs/pipelines/<pipeline_name>/`.
- Neue supervisorbezogene Artefakte immer neben dem zugehoerigen Pipeline-Plan ablegen.
- Externe oder abgeloeste Dokumente nicht loeschen, sondern nach `docs/archive/legacy/` verschieben.
- Diagramme nach Moeglichkeit in den thematisch passenden Unterordner legen, z. B. `docs/architecture/` oder `docs/pipelines/<pipeline_name>/diagrams/`.
- Root-Dateien direkt unter `docs/` nur fuer Uebersichten wie diese `README.md`.
