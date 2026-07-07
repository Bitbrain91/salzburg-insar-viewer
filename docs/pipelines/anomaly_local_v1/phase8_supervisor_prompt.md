# Phase 8 Supervisor Prompt (`phase8_bev_hygiene`)

Lies `docs/pipelines/anomaly_local_v1/phase8_bev_hygiene_plan.md` und fuehre
den Plan vollstaendig aus (Phasen P8-A bis P8-D; P8-E nur W1-T1/T2 — W2
wartet auf externe Overlap-Daten und wird NICHT gestartet).

## Ziel der Session

BEV-Gebaeudedaten produktionsreif in `anomaly_local_v1` integrieren
(Hoehen-Mapping, ID-Migration, Abdeckungs-Audit) und die kartierungsfreie
Assignment-Hygiene 2 (Anti-Layover, Layover-Reichweite, polygon-aware
Cross-Look, Komposit k2xh) als Harness-Kandidaten bauen, evaluieren und bei
gruenen Guardrails integrieren.

## Arbeitsmodus

- Arbeite als Supervisor, nicht als stiller Ticket-Implementierer.
- Ticket-Arbeit wird an Subagents delegiert; Write-Sets disjunkt halten.
- Delegierte Agents erben das aktuelle Session-Modell und dessen Reasoning-
  Stufe, sofern nicht explizit anders vorgegeben (Konvention 2026-07-07).
- Keine stillen Modell-Downgrades; bei Nichtverfuegbarkeit Blocker melden.
- Starte die naechste Welle automatisch, sobald das interne Gate gruen ist.
- Keine destruktiven Git-Kommandos; keine fremden Aenderungen revertieren.
- Schwere DB-Laeufe strikt sequenziell (ein Lauf zur Zeit).

## Pflichtlektuere

- `AGENTS.md`, `docs/workflows/ai_supervisor_workflow.md`
- `docs/pipelines/anomaly_local_v1/phase8_bev_hygiene_plan.md` (der Plan)
- `docs/pipelines/anomaly_local_v1/bev_building_source_concept.md`
- `docs/pipelines/anomaly_local_v1/reference_labels.md` (+ `artifacts/reference_labels.json`)
- `docs/pipelines/anomaly_local_v1/artifacts/bev_gba_reference_case_comparison.md`
- `docs/pipelines/anomaly_local_v1/artifacts/bev_footprint_recheck_96959851.md`
- `docs/pipelines/anomaly_local_v1/tsx_structural_reference_decision.md`
- `docs/pipelines/anomaly_local_v1/next_steps.md` (P7-N4/N5/N7)
- Code-Einstiegspunkte:
  - `backend/app/ml/pipelines/anomaly_local_v1.py` (`BUILDING_SOURCE_SPECS`,
    `_fetch_inputs`, `_apply_crosslook_policy`, `_apply_gate_rules`)
  - `backend/app/ml/evaluation/phase7_clustering_experiments.py` (AOIS,
    EXPERIMENTS, fetch_aoi_inputs — Quelle ist aus der AOI-Spec gepinnt!)
  - `backend/app/ml/evaluation/phase7_survivors_scan.py` (validierte
    Vorsortier-Versionen der neuen Checks)
  - `backend/app/ml/track_geometry.py` (range_dx/dy)

## Harte Gates

- gba-Noop bleibt auf allen 7 AOIs punktidentisch (`--verify-noop`), solange
  die Baselines gba-basiert sind.
- Pruefsteine aus dem Plan (96959851, 96637447, 113309836) sind fuer jeden
  Kandidaten Pflicht — inkl. der BEV-Varianten (Fremdpunkte sind dort
  within/directional!).
- Label-Korpus-Metriken pro Kandidat berichten (foreign gefangen, roof
  verloren); roof-Verluste > 0 sind ein rotes Gate.
- Keine Produktions-Integration ohne Visual-Audit v2 mit Survivors-Pass.
- Jeder Lauf bekommt eine `iterations.md`-Zeile; Artefakte nach
  `docs/pipelines/anomaly_local_v1/artifacts/`.

## Empfohlene erste Delegationen

1. Pipeline-Agent: P8-A-W1-T1 (Hoehen-Mapping) + P8-B-W1-T1/T2 (Checks).
2. Daten/Audit-Agent: P8-A-W1-T2 (ID-Mapping) + P8-A-W1-T3 (Abdeckung).
3. Harness-Agent: Achsen-Registrierung, Scorecard-Erweiterung um
   Label-Korpus-Block (P8-D-W1-T2).
