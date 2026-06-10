# Phase 7 / Optimierungsphase 1 - Ausfuehrungsreport

Stand: 2026-06-10
Branch: `phase7-optimization`
Session: autonome Supervisor-Session (Claude, Schritte 1-4), beauftragt am
2026-06-10. Hinweis: Die "gpt-5.5"-Agentenregel des Plan-Dokuments stammt aus
dem externen Codex-Supervisor-Workflow und wurde fuer diese Session durch den
direkten User-Auftrag an die Claude-Session ersetzt; Subagent-Arbeit laeuft
ueber Claude-Subagents und wird vom Supervisor gegen die Ticket-DoD geprueft.

Massgebliche Spezifikation:
`docs/pipelines/anomaly_local_v1/phase7_clustering_optimization_plan.md`
(Stand 2026-06-10, Commit `ef25a74`).

## Ticketstatus-Uebersicht

| Ticket | Titel | Status |
| --- | --- | --- |
| P7-A-W1-T5 | OPTICS-Runtime-Fallback entfernen | green |
| P7-A-W1-T6 | GBA-Hoehen-Audit | green |
| P7-A-W1-T1 | Baseline einfrieren | green |
| P7-A-W1-T2 | Research-Matrix | green |
| P7-A-W1-T3 | AOI-Katalog | green |
| P7-A-W1-T4 | Referenzfaelle | green |
| P7-B-W2-T0 | Deep-Links + Track-Farben | green |
| P7-B-W1-T1..T4 | Harness/Scorecard/Konfidenz/HR | green |
| P7-B-W2-T1 | Visual-Audit-Workflow | green |
| P7-E-W1-T3 | Run-Transparenz (vorgezogen) | green |
| P7-C-W1-T1..T5 | Experimente Schritt 3/4 | planned |

---

## P7-A-W1-T5: OPTICS-Runtime-Fallback entfernen (green)

Ziel: deterministische Pipeline-Semantik; `hdbscan` als harte Dependency
(User-Auftrag 2026-06-10, "niemals als Runtime-Fallback").

Aenderungen:

- `backend/app/ml/pipelines/anomaly_local_v1.py`:
  - `from sklearn.cluster import OPTICS` entfernt.
  - `try/except ImportError -> hdbscan = None` ersetzt durch harten
    `ImportError` mit Erklaertext (Paketname, Ticket, Datum).
  - In `_apply_density_clustering` den `if hdbscan is not None / else
    OPTICS`-Zweig durch den unbedingten HDBSCAN-Pfad ersetzt; Parameter
    unveraendert (`min_cluster_size=max(2, min(8, ceil(0.2*n)))`,
    `min_samples=floor(mcs/2)`, `eom`, `allow_single_cluster=True`,
    `metric=euclidean`).
- `docs/pipelines/anomaly_local_v1/methodik.md`: hdbscan als harte
  Dependency dokumentiert, Begruendung der Entfernung, Verweis auf
  OPTICS als explizite Harness-Variante.

Belegrun (Mirabell `13.04027,47.80375,13.04387,47.80735`, salzburg_snt):

- Run A (vor Aenderung): `488aa8d0-4697-4906-b0a8-27c8ab7eff1c`
- Run B (nach Aenderung): `7beb8be8-f3af-449b-acb7-e41e6a3edd85`
- Vergleich: alle 17 `ml_run_metrics` identisch; Punktebene
  (`code x track`: `cluster_id`, `label`): `0` von `1481` Punkten abweichend.
- Zusatzbefund Determinismus: Run A reproduziert exakt die Kennzahlen des
  Verifikationsruns `2c4cec7b` vom 2026-04-29 (gleiche Datenbasis).

`MODEL_SET_VERSION` bleibt `local_hdbscan_rulegate_v1`: Im Referenz-Environment
(hdbscan 0.8.42 installiert) aendert sich kein Ergebnis; entfernt wurde nur
ein environment-abhaengiger stiller Semantikwechsel (Ausnahme von der
"keine produktiven Aenderungen vor P7-E"-Regel ist im Plan dokumentiert).

Mindestpruefungen: `compileall` gruen, Pipeline-Import gruen,
hdbscan `0.8.42` via `importlib.metadata`, `git diff --check` sauber.

Kommandos:

```bash
backend/.venv-wsl/bin/python -m backend.app.ml.cli \
  --pipeline anomaly_local_v1 --area-id salzburg --dataset-id salzburg_snt \
  --source gba --bbox 13.04027,47.80375,13.04387,47.80735
# Vergleich: ml_run_metrics beider Runs + JOIN ml_point_results auf (code, track)
```

---

## P7-A-W1-T6: GBA-Hoehen-Audit (green)

Artefakt: `artifacts/phase7_gba_height_audit.md` (alle Queries enthalten).

Kernergebnisse:

- Kein Loader-Fehler: Rohdaten-GeoJSON enthaelt die niedrigen Hoehen samt
  Schaetzvarianz `var`; GBA-Hoehenmodell unterschaetzt systematisch
  (Median-Ratio GBA/OSM `0.735` ueber 673 oeffentliche OSM-Hoehen) und
  saettigt bei hohen Gebaeuden (Dom 78 -> 27.4 m).
- Bad-Gastein-OSM-Gegenprobe nicht moeglich: `osm_buildings` hat fuer
  `bad_gastein` 0 Zeilen (nie geladen).
- NEU/EHRLICH (Wirkungsquantifizierung, Run `488aa8d0`): Eine
  Hoehenkorrektur `h/0.735` holt nur `10/210` (T44) bzw. `14/207` (T95)
  nearest-Punkte in die Candidate-Area (~5-7 %). Dominante nearest-Ursache
  ist seitlicher Versatz (laterale Slack 2 m vs. Geokodierung 8-12 m) bzw.
  echte Fremdobjekte - NICHT die Range-Laenge. Die fruehere Hypothese
  "Hoehenfehler erklaert einen relevanten Teil der nearest-Quote" ist damit
  fuer Mirabell widerlegt; primaerer Hebel bleibt die Assignment-Hygiene
  (`P7-C-W1-T5`, v. a. Demotion).
- Empfehlung: O1 (InSAR-selbstkalibrierte Hoehe) fuer das
  `height_above_ground_m`-Feature; O3 (globaler Kalibrierfaktor + var) nur
  als Experimentvariante mit geringer Erwartung; O2 (OSM) als
  Validierungsquelle; keine produktive Aenderung in P7-A.

---

## P7-A-W1-T1: Baseline einfrieren (green)

Artefakt: `artifacts/phase7_baseline_summary.md`. Sieben frische Runs auf dem
bereinigten Code (nach T5), alle `succeeded`:

| Label | run_id |
| --- | --- |
| mirabell_snt | `c23cd637-3251-45bb-a95e-e2aa88abe6de` |
| moosstrasse_snt | `15cee7d1-1f0c-44b2-a6e2-ecb633841db0` |
| osthang_snt | `74c1481e-f2c7-4938-a4ac-8022e1fe2799` |
| bg_flat_01_snt | `ff2217a1-098d-4126-a89a-c3c9b9c148e5` |
| bg_slope_01_snt | `633325ef-409f-4a9e-a160-c9bc8394e574` |
| bg_flat_01_tsx | `97672f6e-f06e-43d8-b279-1dddecc21300` |
| bg_slope_01_tsx | `60a3899f-118a-4856-b40a-379939449e8a` |

Wichtigste Befunde (Details und Abweichungs-Interpretation im Artefakt):

- Mirabell reproduziert exakt den April-Referenzrun -> drift-freie Baseline.
- Kohaerenz-Gate in den urbanen BG-AOIs nur ~4-6 % (datasetweit 17-24 %);
  Scorecard-Erwartungen werden AOI-, nicht dataset-kalibriert.
- bg_flat_01/SNT hat ein gesundes 6-12-Regime (36 %); Small-N-Dominanz gilt
  v. a. fuer bg_slope (66 % unter 6 Punkten).
- TSX-Runs bestaetigen `full_support=0`/`agreement=None` (44/95-Hardcode).
- `bg_slope_01_snt` Agreement-Median `0.187` = erwarteter Hang-Stress.
- nearest-Quoten 33-45 % der zugeordneten Punkte.

---

## P7-A-W1-T2: Research-Matrix (green)

Artefakt: `artifacts/phase7_research_matrix.md` (Subagent-erstellt,
Supervisor-geprueft). Handbook-Regeln mit Seitenreferenzen (AUG 8 Zeilen,
TRE 11 Zeilen), 3 verifizierte Webquellen, 10 lokale Datenbefunde,
12 konsolidierte Pflichtregeln, Abschnitt zu bewussten Abweichungen
(EGMS ATBD durch TRE 2.1.2 gedeckt; Prediction Strength bei Small-N nicht
anwendbar; AUG-vs-TRE-Toleranzdifferenz dokumentiert).

---

## P7-A-W1-T3 + T4: AOI-Katalog und Referenzfaelle (green)

Artefakte: `artifacts/phase7_aoi_catalog.json` (6 AOIs inkl. Reserve
`bg_flat_02`; je AOI Tracks, Punktzahlen, DS-Anteile, Terrain,
Beobachtungsfenster; `temporal_overlap_days=232` SNT vs TSX;
`track22_points=0` ueberall) und `artifacts/phase7_reference_cases.json`
(18 Faelle).

Neu datenbasiert gefunden:

- Carport-/nearest-Verdachtsfaelle: 9 Core-Cluster in Moosstrasse mit
  >=80 % nearest-Anteil und 5.5-9.7 m mittlerer Distanz, 8 davon als
  MAIN-Cluster - exakt das vom User beobachtete Muster. Primaerfall
  `96856632` (t44, 3/3 nearest, 9.7 m), Zweitfall `203343478`
  (t95, 6/6 nearest). Visuelle Bestaetigung im Visual-Audit.
- HR-Kopplungsfaelle bg_flat_01: `105022686` (ok in SNT 43 kept UND TSX
  264 kept) als primaerer Kopplungsanker; `105022685` als
  Divergenzfall (SNT noise_dominated vs TSX ok).
- Hang-Stress-Anker bg_slope_01: `238057563` (Agreement 0.188),
  `113309853` (ok trotz 0.229).

---

## P7-B-W2-T0: Viewer-Deep-Links und Track-Farben (green)

Implementiert (3 Dateien plus Parameterdoku):

- `frontend/src/lib/urlState.ts` (neu): Query-Parameter `area`, `run`,
  `building` (`gba:<id>`/`osm:<id>`), `mlview`, `track` (`all` oder
  `<dataset>:<track>`), `hulls`, `excluded`, `mlpoints`, `mlbuildings`,
  `gba`, `osm`, `rawtracks` (blendet die rohen InSAR-Track-Layer fuer
  Audit-Ansichten aus), `basemap`, `pitch`, `bearing`. Synchrones
  `useAppStore.setState` VOR dem ersten Render (kein fitBounds-/
  Selection-Reset-Race); ungueltige Werte werden still ignoriert.
- `frontend/src/main.tsx`: Bootstrap-Aufruf vor `createRoot`.
- `frontend/src/components/MapView.tsx`: einmaliger Auto-Fit auf die
  Gebaeudegeometrie, wenn `building` gesetzt und kein Kamera-Hash vorhanden
  ist - erzwingt Nadir (`pitch=0`, `bearing=0`), Override via
  `pitch`/`bearing`-Parameter; Candidate-Area-Farben ergaenzt fuer Tracks
  22 (violett), 70 (dunkelrot), 93 (tuerkis).

Verifikation (Playwright, Frontend-Dev-Server + `npm run build` gruen):

- Deep-Link `/?area=salzburg&run=c23cd637...&building=gba:548205&mlview=
  cluster&hulls=1&rawtracks=0&basemap=satellite` stellt OHNE Klick die
  Focus-View her: Satellitenbild, GBA-Umriss, Candidate-Areas, Inspector
  mit Gebaeuderollup (`single_track_only`); Auto-Fit setzte die Kamera auf
  `#18/47.806837/13.043029` (Nadir).
- Mit explizitem Hash `#19/...` respektiert der Viewer die Hash-Kamera
  (kein Auto-Fit) - Belegscreenshots:
  `artifacts/phase7_visual_548205_t0proof_overview.png`,
  `artifacts/phase7_visual_548205_t0proof_z19.png`.
- Ohne Parameter ist das Default-Verhalten unveraendert (Standard-Kamera
  `#12/47.8/13.05/-10/45`, keine Selektion, keine Konsolen-Fehler).

---

## Schritt 1: Mini-Visual-Audit (3 Faelle, green)

Artefakt: `artifacts/phase7_visual_audit_cases.json` (Labels, Deep-Links,
Screenshots, Bewertungen). Methode: Deep-Link-Nadir-Screenshot plus
deterministische Punkt-Annotation (API-Punkte via Web-Mercator auf den
Screenshot projiziert).

1. `548205` (Mirabell): plausibel, `single_track_only` ehrlich angezeigt;
   keine visuelle Fehlzuordnung.
2. `96856632` (Moosstrasse, nearest-Main-Verdacht): Die 3 nearest-Punkte des
   Main-Clusters liegen an der WSW-Kante - die Richtung passt EXAKT zur
   t44-Range-Verschiebung (261.4 deg). Damit ist der Fall AMBIVALENT:
   verschobene echte Dachpunkte (zu kurze Candidate-Area wegen
   GBA-Hoehenunterschaetzung) ODER Returns einer kleinen SW-Nebenstruktur.
   In beiden Faellen definieren geometrisch unbegruendete Punkte den
   Motion-Score -> Primaerfall fuer den A1-vs-Hoehenkorrektur-Kreuztest in
   `P7-C-W1-T5`. Labels: ambiguous_visual, offset_expected_due_to_sar_
   geometry, possible_carport_merge, needs_human_review.
3. `105022686` (bg_flat_01): gesunder Zwei-Track-Fall, Cores beider Tracks
   klar auf dem Dach; als HR-Kopplungsanker visuell bestaetigt;
   interleaved Dach-Noise als False-Noise-Pruefkandidaten notiert.

Damit ist Schritt 1 vollstaendig: T5, T6, T1, T2, T3, T4, T0 und
Mini-Audit sind green.

---

## Schritt 2: Mess-Werkzeug (P7-B-W1-T1..T4, P7-B-W2-T1, P7-E-W1-T3) - green

Harness: `backend/app/ml/evaluation/phase7_clustering_experiments.py`.
Architektur: `ExperimentPipeline` subclasst die Produktionspipeline; die
No-op-Variante nutzt den EXAKTEN Produktionspfad. AOI-Inputs werden einmal
geholt (Pipeline-SQL plus `height_std`, `acceleration_std`, `s_amp_std`,
`s_phs_std`, `season_phs`, `eff_area`), Varianten re-clustern offline
in-memory; volle CLI-Runs nur fuer Baselines.

Determinismus-Beweis (haerter als gefordert): No-op ist auf ALLEN 7
Pflicht-AOIs punktidentisch zu den persistierten Baseline-Runs
(`noop_identical=True`; Mirabell 1481/1481 Punkte, 0 Abweichungen).

Module und zentrale Baseline-Befunde
(`artifacts/phase7_experiment_noop_baseline.json`,
`artifacts/phase7_scorecard.{json,md}`):

- Harness-Cross-Track (dataset-agnostisch, `cross_track_source=
  harness_computed`, Paartyp `opposite_geometry`): Mirabell 0.650
  (== Pipeline-Wert -> Querverifikation), Moosstrasse 0.440, Osthang 0.850,
  bg_flat_01_snt 0.562, bg_slope_01_snt 0.187 und ERSTMALS TSX:
  bg_flat_01_tsx 0.527, bg_slope_01_tsx 0.086 (extremer ASC/DSC-Stress am
  Gasteiner Hang; vorher pipeline-bedingt NULL).
- HR-Strukturmodul (building-gekoppelt, Toleranz SNT 12 m + TSX 3 m +
  sqrt(eff_area) bei DS, Bewegung nur qualitativ,
  `temporal_overlap_days=232`): bg_flat_01 SNT vs TSX: 81 Gebaeude
  gekoppelt, `hr_main_region_match_rate = 0.983` - die raeumliche
  SNT-Clusterstruktur im Flach-AOI ist nahezu durchgaengig TSX-gestuetzt.
- Konfidenzmodul (Nebensignal; velocity_std-Jitter alle n, LOO ab n>=4,
  Bootstrap ab n>=8; Seeds deterministisch aus Experiment/Gebaeude/Track):
  Referenzfall `150506168:t44` (nearest-heavy, Status ok/high) faellt mit
  Jitter-Jaccard 0.58 in `unstable` - das bestaetigt den Verdachtsfall
  quantitativ. Baseline-Banding mit dokumentiertem Cap von 60 Gruppen je
  AOI (kein silent cap).
- Scorecard-Generator: maschinenpruefbare Referenzfall-Erwartungen je
  Falltyp, harte Gates (Multi-Cluster-Erhalt, keine Small-N-Befoerderung,
  nearest-Main darf nicht steigen, Noise-Senkung allein zaehlt nicht),
  Verdikte `candidate_green/red/inconclusive`. Baseline: alle
  Referenzfaelle ok.
- Visual-Audit-Workflow formalisiert
  (`artifacts/phase7_visual_audit_report.md`): Deep-Link-Schema,
  Kamera-Standard, deterministische Punkt-Annotation, Labelset,
  Eskalationsregel.
- Run-Transparenz (User-Pflicht): Run-Detail liefert jetzt
  `pipeline_version` und `bbox`; PipelinePanel zeigt Run-ID,
  Pipeline@Version, Gebiet/Dataset/Track, BBox, Status, Zeitstempel,
  MLflow-Run, Experiment-ID und alle Parameter
  (Beleg: `artifacts/phase7_run_transparency_proof.png`).

---

## Schritt 3: HDBSCAN-Sweep und Feature-Ablation (P7-C-W1-T1/T2) - green

12 isolierte Varianten auf allen 7 Pflicht-AOIs
(`artifacts/phase7_experiment_sweep_s3.json`, Scorecard-Verdikte in
`artifacts/phase7_scorecard.{json,md}` der Sweep-Generation):

Sweep: `ms_equal` (Bibliotheks-Default), `leaf`, `no_single`, `mcs_03`,
`mcs_floor3`, `eps_05`. Ablation: `feat_vel_lo`, `feat_no_accel`,
`feat_spatial_hi`, `feat_ts`, `feat_hstd`, `feat_no_coh`.

ERGEBNIS: ALLE 12 Varianten sind `candidate_red`. Das ist ein belastbares,
inhaltlich wichtiges Resultat, kein Misserfolg des Harness:

1. Dominanter Fail-Grund ist fast ueberall der nearest-Main-Guardrail
   ("mehr nearest-dominierte Main-Cluster"): Jede Umsortierung der Cluster
   laesst bei 33-45 % unbegruendeten nearest-Punkten haeufiger
   Fremd-Cluster zum Main-Cluster werden. DIE KLUSTERPARAMETER SIND NICHT
   DER ENGPASS - DIE ASSIGNMENT-HYGIENE IST ES. Das bestaetigt die
   Schritt-4-Priorisierung datenbasiert.
2. Noise-Senkungen kommen durchgehend mit Cross-Track-Verschlechterung
   ("kein Gewinn") - die Regel "niedrigere Noise-Rate allein ist kein
   Erfolg" greift messbar (z. B. `leaf`, `no_single`).
3. Referenzfall-Verletzungen zeigen die erwarteten Fehlmodi:
   `ms_equal` (konservativer) kippt `548204` zu noise_dominated;
   `leaf` waescht noise_dominated-Diagnosen zu "ok" weich
   (`54773363`, `238057563`, `227901749`) - exakt das Weichspuelen, das
   die Scorecard verhindern soll.
4. Konsequenz/Empfehlung: Die produktive HDBSCAN-Parametrierung ist unter
   der aktuellen Scorecard lokal optimal. Ein erneuter Sweep lohnt erst auf
   einer hygienisierten Baseline (nach `P7-C-W1-T5`-Entscheidung) - als
   kombinierter Kandidat in Schritt 6 (nicht Teil dieser Session).
