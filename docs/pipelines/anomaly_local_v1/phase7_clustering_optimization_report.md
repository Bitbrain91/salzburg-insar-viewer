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
| P7-C-W1-T1 | HDBSCAN-Sweep | green (alle Varianten red) |
| P7-C-W1-T2 | Feature-Ablation | green (alle Varianten red) |
| P7-C-W1-T3 | Small-N-Alternativen | green (smalln_strict = candidate_green) |
| P7-C-W1-T4 | Reassignment-Audit | green (Reassignment behalten) |
| P7-C-W1-T5 | Assignment-Hygiene | green (a1 fachlich stark, Verdikt-Limitation dokumentiert) |

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

---

## Schritt 4: Assignment-Hygiene, Small-N, Reassignment, Main-Cluster-Wahl (P7-C-W1-T3/T4/T5) - green

Artefakte: `artifacts/phase7_experiment_s4.json` plus Scorecard-Generation
S4 (`phase7_scorecard.{json,md}`). 7 Varianten x 7 AOIs, HR-Gegenprobe
unter `a1_demote`, Main-Choice-Audit, Reassignment-Zaehler.

### Verdikte

| Variante | Verdikt | Kernzahlen (moos / bg_flat_snt / bg_slope_snt) |
| --- | --- | --- |
| `smalln_strict` | **candidate_green** | 14/14 Referenzfaelle ok; xtrack 0.441/0.593/0.187 (moos+flach leicht besser); Kosten ~0 |
| `a1_demote` | candidate_red (s. Limitation) | nearest-Mains 34/40/14 -> **0/0/0**; bg_flat xtrack **0.562 -> 0.696**; HR-Match **1.0** (64 gekoppelt); Kosten: ok 65->47 / 42->25 / 16->13 |
| `a3_height` | candidate_red (s. Limitation) | selektiv (108 Demotionen moos): nearest-Mains 30/28/10; bg_flat xtrack 0.644; Kosten minimal (ok 63/41/15) |
| `a2_dist5` | candidate_red | grobes Werkzeug: xtrack moos faellt auf 0.391 |
| `a4_osm` | candidate_inconclusive | 0 Demotionen in allen AOIs - OSM-Veto greift hier nicht |
| `no_reassign` | candidate_red | Reassignment HILFT: ohne es faellt xtrack (moos 0.403) und ok-Status sinken |

### Schluesselfaelle

- Carport-Verdachtsfall `96856632`: noop `small_n` -> unter `a1_demote`
  `insufficient_support` - der 3/3-nearest-Main-Cluster praegt den
  Motion-Score nicht mehr (Soll-Verhalten des Asymmetrie-Prinzips).
- `548205` bleibt unter allen Politiken stabil `single_track_only`.
- Main-Choice-Audit (Diagnose): in Moosstrasse wuerden 2 von 5
  Multi-Cluster-Gruppen unter within-share-first einen anderen Main-Cluster
  waehlen - Wahlkriterium bleibt relevante Schritt-6-Achse.
- Reassignment-Aktivitaet: bg_flat_01_tsx rettet 2141 Punkte (davon 251
  nearest, 1399 im >50-Regime) - im High-N-Regime sehr aktiv; fuer die
  High-N-Strategie (Schritt 5) als Diagnose notiert.

### Wichtige Verdikt-Limitation (dokumentiert, fuer Schritt 6 zu beheben)

Die automatischen Referenzfall-Erwartungen sind auf der KONTAMINIERTEN
Baseline kalibriert ("Status bleibt wie heute"). Hygiene-Politiken
verletzen sie konstruktionsbedingt NACH UNTEN (ok -> single_track_only,
small_n -> insufficient_support), was kein Weichspuelen ist, sondern der
beabsichtigte Ehrlichkeitseffekt. Fuer Schritt 6 muessen die Erwartungen
policy-bewusst formuliert werden (erwartete Statusmengen je
Kandidatenklasse; Differential-Erhalt strukturell statt status-basiert
pruefen). Die fachliche Bewertung von `a1_demote` stuetzt sich daher auf
die Aggregate (nearest-Mains 0, bg_flat-xtrack +0.13, HR 1.0), nicht auf
das automatische Verdikt.

### Empfehlungs-Shortlist fuer Schritte 5/6

1. `K1 = smalln_strict`: sofort kandidatenfaehig (green), klein, ehrlich.
2. `K2 = a1_demote + smalln_strict`: fachlich staerkster Kandidat;
   Voraussetzungen: policy-bewusste Referenzerwartungen, UI-Kennzeichnung
   demotierter Punkte, Differential-Erhalt-Pruefung, Sweep-Re-Run auf
   hygienisierter Baseline.
3. `K3 = a3_height (+ smalln_strict)`: guenstige Alternative mit minimalen
   Ehrlichkeitskosten, falls K2 zu teuer erscheint.
4. Reassignment unveraendert BEHALTEN (no_reassign verschlechtert).
5. `a4_osm` zurueckstellen (kein messbarer Effekt in den AOIs).

### Nachtrag UI-Komfort (User-Auftrag 2026-06-10, nach Schritt 4)

Zwei kleine Viewer-Erweiterungen fuer die manuelle visuelle Analyse:

- Kamera-Modus "Senkrecht von oben (Nadir)" im Perspektive-Dropdown
  (`cameraModes.ts`: `NADIR_CAMERA_PRESET`; Rotation/Pitch gesperrt wie bei
  den LOS-Presets, Pan/Zoom frei). Zusaetzlich Deep-Link-Parameter
  `camera=default|nadir|track:<dataset>:<track>`.
- Auto-Fokus auf die Run-Area: Bei Auswahl eines Runs in "Letzte
  Auswertungen" fliegt die Karte auf dessen BBox (MapView-Effekt auf
  Run-Detail-`bbox`; Mount-Guard, damit Deep-Link-/Gebaeude-Auto-Fit
  Vorrang behalten; aktuelle Perspektive bleibt erhalten).

Playwright-verifiziert: Nadir-Hash ohne Pitch/Bearing, Run-Klick BG
(`#17.06/47.119949/13.140031` = bg_slope_01) und zurueck nach Salzburg
(Osthang), Deep-Link-Regression unveraendert, `?camera=nadir` laedt
direkt senkrecht.

### DoD-Abweichung (ehrlich ausgewiesen)

Das "Visual-Audit vorher/nachher" fuer den nearest-heavy Fall ist
datenseitig belegt (96856632-Statuswechsel, Punktrollen im S4-JSON), aber
nicht als Viewer-Screenshot der a1-Variante - Offline-Varianten sind keine
persistierten Runs. Der After-Screenshot folgt in Schritt 6, sobald der
Kandidat als getaggter Run persistiert wird.

---

# Session 2: Vorarbeiten V1-V4 + Schritte 5-6 (beauftragt 2026-06-10)

User-Auftrag: drei Vorarbeiten (policy-bewusste Erwartungen,
Kandidaten-Persistenz, hygienischer Re-Sweep) + Schritt 5 + Schritt 6
vollstaendig; Anpassung: P7-C-W2-T3 (weitere Algorithmusfamilien ausser
OPTICS) entfaellt und wandert in eine spaetere Optimierungsphase.
Zusaetzlich aus der User-Diskussion: Offline-Ergebnisse muessen im Viewer
sichtbar werden (Persistenz als getaggte Runs).

## V1: Policy-bewusste Referenzfall-Erwartungen (green, Commit 7e477f1)

Problem aus Schritt 4: Erwartungen waren baseline-kalibriert; Hygiene-
Politiken wurden fuer beabsichtigte Ehrlichkeits-Downgrades automatisch
candidate_red. Umsetzung:

- `CLAIM_RANK`-Abstufungstoleranz (ok=3 > single_track_only=2 >
  small_n/noise_dominated=1 > insufficient_support=0): Hygiene-Politiken
  (assignment_policy!=a0 oder smalln_mode!=baseline) duerfen Anspruch
  senken, NIE erhoehen (Asymmetrie-Prinzip maschinell).
- `policy_expectations` je Referenzfall in phase7_reference_cases.json
  (Aufloesung: experiment_id > assignment_policy > smalln_<mode>);
  4 Pins datenbasiert gesetzt: 96959851 (a1 -> insufficient_support,
  a3 -> single_track_only), 96856632, 203343478, 238100070.
- Robuste Multi-Cluster-Zaehlung (`multi_cluster_buildings_robust`:
  nearest-dominierte Cluster zaehlen nicht); Multi-Cluster-Guardrail fuer
  Policy-Experimente auf die robuste Zaehlung umgestellt. Wirkung:
  mirabell robust 26->26, osthang 22->21 (kein Fehlalarm mehr) bei
  strikter Zaehlung 28->22/27->16.
- CLI `--scorecard-baseline`/`--scorecard-out` fuer k2-relative Scorecards.

Einzelfall-Untersuchungen vor dem Pinnen (Punktrollen-Level):

- 238100070 (bg_flat): small_n -> single_track_only unter a1 ist LEGITIM
  (t44 bestand aus 2/2 nearest ohne Geometrie-Begruendung; echter
  t95-Kern within+directional traegt allein). Gepinnt.
- 54773363 (osthang) + 238057563 (bg_slope): noise_dominated -> ok unter
  a1 ist NICHT vertrauenswuerdig: Re-Clustering-Nebeneffekt nach Demotion
  (mcs-Fraction/RobustScaler auf reduziertem kept-Set; Cluster blaehen von
  11 auf 18 Kerne, Velocity-Spanne -0.7..+2.2 mm/a; t44/t95-Tension bleibt).
  ABSICHTLICH nicht gepinnt - a1/a2 tragen diese zwei Fails zu Recht weiter.

Validierung (alle 7 AOIs, noop punktidentisch auf allen): a3_height
candidate_green, smalln_strict candidate_green, a4_osm inconclusive,
no_reassign bleibt candidate_red, a1_demote bleibt candidate_red NUR noch
wegen der zwei substanziellen Hang-Aufwertungen (5 Checks via Toleranz,
4 via Pins gedeckt). Artefakte: phase7_experiment_s4_policyaware.json,
phase7_scorecard.{json,md} regeneriert.

Fachliche Konsequenz: Der a1-Nebeneffekt (Cluster-Aufblaehen durch
veraendertes Skalierungs-Set) ist ein echtes Risiko fuer K2 und staerkt
die Motivation fuer die selektive Quer-Versatz-Politik (V3/k2x).

## V2: Kandidaten-Persistenz als getaggte Runs + UI-Badge (green, Commit 52e1d6b)

Antwort auf den User-Schmerzpunkt "Offline-Ergebnisse sind im Viewer
unsichtbar":

- Harness-CLI `--persist`: voller Produktionspfad je (AOI, Experiment)
  (create_run_record -> ExperimentPipeline.run() [geerbter Produktionspfad
  inkl. _persist_results] -> assign_building_colors -> Metrics-Upsert ->
  Statusuebergaenge nach runner.py-Muster), ohne MLflow. Vollstaendige
  Konfiguration in ml_runs.params: experiment_id, experiment_config,
  phase7_aoi, phase7_baseline_run. Registry phase7_persisted_runs.json.
- Run-Liste: `params->>'experiment_id'` in fetch_runs/MLRunSummary;
  violettes Experiment-Badge im PipelinePanel; Run-Detail liefert
  experiment_id ebenfalls. Transparenz-Panel zeigte experiment_id schon
  (P7-E-W1-T3) - jetzt inkl. experiment_config sichtbar.
- BEWEIS: persistierter noop-Run `41f57f63-6344-42b7-8120-e45d0ed17397`
  (Mirabell) ist punktidentisch zur Baseline `c23cd637` (1481/1481 Punkte,
  0 Differenzen, Vergleich auf cluster_id/role/label); Status succeeded,
  Metriken vorhanden, Farben gesetzt. Screenshots:
  phase7_v2_runlist_badge.png, phase7_v2_transparency_panel.png.
- Damit ist die Schritt-4-DoD-Abweichung (kein After-Screenshot moeglich)
  strukturell behoben; die After-Screenshots folgen im Visual-Audit der
  Shortlist (P7-D-W1-T3).

## V3: a5_crosslook + Kandidaten-Registry k1/k2/k3/k2x (green)

Neue Quer-Versatz-Politik `a5_crosslook` (motiviert durch den bestaetigten
Fall 96959851): nearest-Punkte werden nur demotiert, wenn ihr
|cross_look_offset_m| die selbstkalibrierte Toleranz des Gebaeude x Track
ueberschreitet; ohne geometrische Anker werden alle nearest demotiert.

Designiteration (ehrlich dokumentiert): Erste Fassung mit
p95(|cross| der within/directional-Anker) SCHEITERTE am Primaerfall -
die Candidate-Area hatte selbst einen Fremdpunkt als directional gefangen
(Anker bei +13 m vergiftete das p95). Fix: robuste Statistik
limit = median + 3*1.4826*MAD + 3 m Geocoding-Marge + sqrt(eff_area).
Danach am Fall 96959851: genau die drei cross+13m-nearest demotiert
(nearest_crosslook_outlier), der vergiftete directional-Punkt faellt ohne
deren Verstaerkung von selbst zu Noise, t95-Main = 4 cross-konsistente
Punkte (-0.9 m) -> Status ok MIT sauberem Cluster (als
policy_expectations-Pin "a5_crosslook: ok" verankert).

Kompositions-Helper `_variant()` + Kandidaten-Registry:
k1=smalln_strict, k2=a1_demote+smalln_strict, k3=a3_height,
k2x=a5_crosslook+smalln_strict.

Lauf ueber alle 7 AOIs (noop punktidentisch; Artefakte
phase7_experiment_candidates_v.json, phase7_scorecard_candidates.{json,md}):

| Kandidat | Verdikt | 54773363/238057563 (Hang-Risiko) | 96959851 | 203343478 |
| --- | --- | --- | --- | --- |
| k1 | green | noise_dominated (ehrlich) | ok (unveraendert kontaminiert) | single_track_only |
| k2 | RED | ok/ok (Aufblaeh-Effekt!) | insufficient_support | insufficient_support |
| k3 | green | noise_dominated | single_track_only | noise_dominated |
| k2x | green | noise_dominated (ehrlich) | ok MIT sauberem Cluster | insufficient_support |

Kernbefund: k2x vermeidet den a1-Aufblaeh-Nebeneffekt (selektive Demotion
laesst mcs/Scaler-Basis weitgehend stabil), liefert beim bestaetigten
Carport-Fall das normative Zielverhalten (Fremdgruppe raus, echte
Dachaussage bleibt) und nimmt beim Cross-Track den Grossteil des
a1-Gewinns mit (bg_flat_01_snt: noop 0.5619, k2x 0.6646, k2 0.6956).
a5-Demotionsvolumen deutlich unter a1 (z. B. moosstrasse 360 von 613
nearest-Punkten). k2 ist damit als Hauptkandidat entthront; k2x
uebernimmt, k1 bleibt konservative Option, k3 Alternative.

## V4: Hygienischer Re-Sweep auf k2x-Basis (green)

Plan-Abweichung (begruendet): Der Plan sah die Sweep-Wiederholung auf
K2-Basis vor; nach dem V3-Befund (k2 candidate_red wegen
Aufblaeh-Nebeneffekt) laeuft der Re-Sweep auf der Basis des fuehrenden
Kandidaten k2x. Scorecard-Baseline: k2x (via --scorecard-baseline).

Alle 12 Schritt-3-Achsen als k2x-Komposita auf allen 7 AOIs
(phase7_experiment_sweep_hygienic.json, phase7_scorecard_hygienic.{json,md}):

- 11/12 candidate_red. Dominanter Fail erneut der Hygiene-Guardrail
  (mehr nearest-dominierte Main-Cluster: die Achsen mischen die Cluster so
  um, dass die von a5 bewusst BEHALTENEN nearest-Punkte haeufiger Mains
  dominieren); mehrere Achsen reaktivieren ausserdem den
  Aufblaeh-Effekt (osthang_low_agreement/bg_slope noise->ok).
- k2x_floor3 candidate_inconclusive mit Cross-Track-Delta -0.0001
  (wirkungslos).
- Durchschnittliche Cross-Track-Deltas aller Achsen im Rauschband
  (-0.03..+0.01).

Fazit: "Clustering-Parameter sind nicht der Engpass" gilt AUCH auf
bereinigter Basis. Kein Achsen-Komposit qualifiziert sich; k2x geht
unveraendert in die Kandidatenphase. Nebenprodukt: Werkzeug
`backend/app/ml/evaluation/phase7_visual_audit.py` (DB-getriebene
PIL-Annotation in Web-Mercator) fuer P7-D-W1-T3 vorbereitet und am
Referenzfall 96959851 gegen das Schritt-1-Audit validiert.

## Schritt 5 / P7-C-W2-T1: OPTICS-Vergleich (green, Ergebnis: no_alt_gain)

User-Sequenz eingehalten: OPTICS erst NACH abgeschlossenem HDBSCAN-Sweep,
als explizit waehlbare Variante (kein Fallback). ExperimentConfig um
OPTICS-Achsen erweitert (optics_cluster_method xi|dbscan, optics_xi,
optics_eps; xi=0.05-Hardcode abgeloest); identische Feature-Matrix,
identische Scorecard. 10 Varianten (xi 0.03/0.05/0.10, ms_equal,
dbscan-Extraktion eps=0.5 - jeweils auf Produktions- UND k2x-Basis),
alle 7 AOIs, noop punktidentisch. Artefakte:
phase7_candidate_optics.json, phase7_scorecard_optics.{json,md}.

ERGEBNIS: alle 10 OPTICS-Varianten candidate_red - konsistentes Muster:

- Noise-Raten sinken deutlich (mirabell 0.22-0.28 vs 0.35) und mirabell-
  xtrack steigt (bis 0.7585) - aber moosstrasse-xtrack kollabiert
  (0.34-0.35 vs 0.44) und bg_flat faellt unter die k2x-Referenz
  (bestes OPTICS 0.5981 vs k2x 0.6646). Die Scorecard-Regel
  "Noise sinkt, aber Cross-Track verschlechtert -> kein Gewinn" feuert
  durchgaengig: xi-Extraktion bildet grosszuegigere Cluster und
  produziert genau die kosmetische Verbesserung, gegen die das
  Messwerkzeug gebaut wurde.
- Konsistente Referenzfall-Fails ueber fast alle Varianten:
  bg_flat_small_n, bg_slope_noise_low_agreement, bg_tsx_high_n_noise
  (Aufwertungen diagnostischer Faelle) plus mehr nearest-dominierte
  Main-Cluster.

ENTSCHEIDUNG T1: no_alt_gain. HDBSCAN (eom, produktive Parameter) bleibt
der Clusterer; OPTICS wird nicht weiterverfolgt. Damit ist auch die
Schritt-5-Reihenfolge abgeschlossen: weitere Algorithmusfamilien
(P7-C-W2-T3) sind per User-Entscheidung 2026-06-10 in eine spaetere
Optimierungsphase verschoben (siehe next_steps.md).
