# Cross-Track-Validierung (A) + SNT/TSX-Overlap-Vergleich (B) — Execution Plan

**Stand:** 2026-07-15

**Status:** abgeschlossen (2026-07-15) - alle 10 Tickets green; Artefakte eingefroren, Meeting-One-Pager erstellt

**Autoritativ fuer:** Umfang, AOIs, Gate-Vertrag und Ticketstatus des XTV-Arbeitspakets

**Aktualisieren wenn:** ein XTV-Ticket abgeschlossen, verworfen oder neu geschnitten wird, sich AOIs, Fallback-Bboxen oder Gates aendern oder die Run-Registry neue Extended-Runs erhaelt

**Supervisor-Prompt:** [`cross_track_validation_supervisor_prompt.md`](cross_track_validation_supervisor_prompt.md)

## Ziel und Rahmenbedingungen

Fuer ein Stakeholder-Meeting entstehen zwei eingefrorene, reproduzierbare
Auswertungen auf Basis der bestehenden `anomaly_local_v1`-Pipeline. Beide sind
eine **reine Auswerteschicht** ueber dem integrierten Modellstand
`local_hdbscan_rulegate_v4_k2xhf_diffv2`: keine Modell-, Gate- oder
Schwellenaenderung, kein Re-Baseline, keine neue Persistenzspalte. Alle neuen
Runs laufen mit `--source bev` (Produktionsstandard). Die fachliche Logik, die
Ergebnissemantik, die Proxy- und Toleranzformeln bleiben unveraendert; dieses
Dokument wiederholt sie nicht, sondern verweist auf die aktive
[`methodik.md`](methodik.md) (Vertikalproxy `velocity / cos(incidence)`,
Toleranzformel `allowed_diff_mm_a = 1.0 + 0.15 * slope_mean_deg`,
`track_agreement_score`, SRTM-Terrainkontext) und das
[`runbook.md`](runbook.md) (Run-Ausfuehrung, Pflicht-AOIs, Gate-Vertrag).

### Auswertung A — Cross-Track-Konsistenz (SNT, ASC T44 vs. DESC T95)

Ueber die gekoppelten Gebaeude beider Blickrichtungen wird der vertikale Proxy
von ASC T44 und DESC T95 verglichen, stratifiziert nach Terrain-Klassen aus
`building_terrain_context.slope_mean_deg` (SRTM):

- `flach` < 5 Grad
- `uebergang` 5–15 Grad
- `hang` > 15 Grad
- `unbekannt` bei fehlendem Slope-Wert

Vergleichsgroesse ist der vertikale Proxy mit Clamp `max(cos(inc), 0.30)` gegen
flache Einfallswinkel; die Toleranz je Gebaeude ist die bestehende
hangabhaengige Formel aus [`methodik.md`](methodik.md). Fachliche Botschaft:
flach = Uebereinstimmung, Hang = systematische Divergenz, was eine spaetere
2D-Dekomposition motiviert.

### Auswertung B — SNT vs. TSX/PAZ im Overlap-Fenster (Bad Gastein)

Quantitative **Sensor-Konsistenz-Validierung** im Ueberlappungsfenster
**2022-10-06 bis 2023-05-26 (232 Tage)**. Geometrie-gematchte Track-Paare
ASC 44 gegen ASC 93 und DSC 95 gegen DSC 70, ausschliesslich auf Gebaeudeebene,
gleiche Terrain-Stratifikation wie Auswertung A. Verschaerfte Overlap-Gates:
mindestens **8 Epochen** und mindestens **150 Tage Spanne** je Zeitreihe. Dazu
eine Changed-Building-Audit-Liste der divergentesten Faelle fuer die manuelle
GE-3D-Pruefung.

**Harte Rahmung (User-Entscheidung „Variante 1"):** Auswertung B validiert die
**Sensor-Konsistenz** zwischen SNT und TSX/PAZ. Sie liefert **keine absoluten
Jahresraten** — das Overlap-Fenster umfasst nur einen Winter, Saisoneffekte sind
nicht ausgemittelt. Dieser Satz steht als Framing hart in Methodik-, Interpreta-
tions- und Onepager-Text sowie in der Caveat-Box des Meeting-Pakets.

## Leitprinzipien und feste Entscheidungen

- Reine Auswerteschicht ueber `local_hdbscan_rulegate_v4_k2xhf_diffv2`; keine
  Aenderung an Modell, Gates, Schwellen oder Baselines.
- Alle neuen Runs `--source bev`; SNT-Runs ohne `--track`, damit alle Tracks in
  einem Run liegen und Cross-Track-Rollups entstehen.
- SNT/TSX-Kopplung ueber identische BEV-GUIDs; Vergleich immer auf Gebaeudeebene
  ueber `ml_point_results.meta->'building_rollup'`.
- „Kremsstein" = Bad Gastein; die BG-SNT-Runs bedienen sowohl Auswertung A als
  auch Auswertung B.
- Bestehende GBA-Baselines dienen nur den Smokes, nie den eingefrorenen
  Artefakten (Quellen-Konsistenz: die Freeze-Artefakte sind durchgaengig BEV).
- Kein Git-Commit ohne User-Freigabe; im Working Tree liegen umfangreiche fremde
  ungesicherte Aenderungen, die nicht angefasst werden.

## AOI-Katalog

Fuenf Extended-AOIs. Salzburg-SNT-Runs bedienen Auswertung A; die beiden
Bad-Gastein-AOIs liefern SNT und TSX/PAZ fuer Auswertung B (und die BG-SNT-Seite
zusaetzlich fuer Auswertung A). Alle Runs `--source bev`, ohne `--track`.

| AOI | Bbox (`lon_min,lat_min,lon_max,lat_max`) | Dataset(s) | BEV-Gebaeude | Punkte |
|---|---|---|---|---|
| sbg_flat_ext_01 (Mirabell/Andraeviertel) | `13.030,47.800,13.046,47.812` | salzburg_snt | 1402 | ~25k |
| sbg_flat_ext_02 (Moosstrasse-Ebene) | `13.018,47.785,13.036,47.798` | salzburg_snt | 1877 | ~22k |
| sbg_hang_ext_01 (Kapuzinerberg/Buerglstein) | `13.045,47.799,13.060,47.810` | salzburg_snt | 1269 | ~17k |
| bg_flat_ext_01 (Gasteiner Talboden) | `13.125,47.095,13.145,47.115` | bad_gastein_snt + bad_gastein_tsx_paz | 689 | ~9k / ~52k |
| bg_slope_ext_01 (Bad Gastein Hang N/O) | `13.130,47.112,13.150,47.128` | bad_gastein_snt + bad_gastein_tsx_paz | 765 | ~8,5k / ~46k |

### Fallback-Bboxen

Vordeklariert fuer den Fall, dass das Laufzeit-Gate (siehe Gate-Vertrag)
ueberschritten wird. Grundstrategie: **Lat-Halbierung je Box** (zwei Teilruns
ueber die noerdliche und suedliche Haelfte, danach im Rollup vereinigt). Fuer die
beiden Bad-Gastein-AOIs in **Auswertung B** wird stattdessen die vordeklarierte
**geschrumpfte Box** bevorzugt (kein Split, damit die SNT/TSX-Kopplung ein
einziger konsistenter Ausschnitt bleibt).

| AOI | Fallback (Lat-Halbierung: Sued / Nord) | Bevorzugt fuer Auswertung B (geschrumpft) |
|---|---|---|
| sbg_flat_ext_01 | `13.030,47.800,13.046,47.806` / `13.030,47.806,13.046,47.812` | — |
| sbg_flat_ext_02 | `13.018,47.785,13.036,47.7915` / `13.018,47.7915,13.036,47.798` | — |
| sbg_hang_ext_01 | `13.045,47.799,13.060,47.8045` / `13.045,47.8045,13.060,47.810` | — |
| bg_flat_ext_01 | `13.125,47.095,13.145,47.105` / `13.125,47.105,13.145,47.115` | `13.125,47.103,13.145,47.115` |
| bg_slope_ext_01 | `13.130,47.112,13.150,47.120` / `13.130,47.120,13.150,47.128` | `13.130,47.112,13.150,47.122` |

## Run-Registry

Alle XTV-Run-IDs, Labels, Bboxen, Laufzeiten und Zaehlungen werden maschinen-
lesbar in [`artifacts/cross_track_validation_runs.json`](artifacts/cross_track_validation_runs.json)
gefuehrt (angelegt von Ticket XTV-B-W1-T1, gefuellt von XTV-B-W2-T1). Diese
Datei ist die autoritative Quelle der verwendeten Runs; die Freeze-Artefakte und
der One-Pager zitieren aus ihr.

Label-Schema: `xtv_<aoi>_<datasetkurz>_bev_v4` (Dataset-Kurz `snt` bzw. `tsx`),
gesetzt nach dem Run via `PATCH /api/ml/runs/{id}` `{"label": ...}`. Erwartete
sieben Extended-Runs:

| Label | AOI | Dataset | Bedient |
|---|---|---|---|
| `xtv_sbg_flat_ext_01_snt_bev_v4` | sbg_flat_ext_01 | salzburg_snt | A |
| `xtv_sbg_flat_ext_02_snt_bev_v4` | sbg_flat_ext_02 | salzburg_snt | A |
| `xtv_sbg_hang_ext_01_snt_bev_v4` | sbg_hang_ext_01 | salzburg_snt | A |
| `xtv_bg_flat_ext_01_snt_bev_v4` | bg_flat_ext_01 | bad_gastein_snt | A + B |
| `xtv_bg_flat_ext_01_tsx_bev_v4` | bg_flat_ext_01 | bad_gastein_tsx_paz | B |
| `xtv_bg_slope_ext_01_snt_bev_v4` | bg_slope_ext_01 | bad_gastein_snt | A + B |
| `xtv_bg_slope_ext_01_tsx_bev_v4` | bg_slope_ext_01 | bad_gastein_tsx_paz | B |

## Statusmatrix

Die Abhaengigkeiten sind als `hart` (Downstream darf ohne dieses Ergebnis nicht
starten) und `weich` (Start unter dokumentierter Annahme zulaessig) gefuehrt.
Ausgang je Ticket `green | inconclusive | red` gemaess
[`ai_supervisor_workflow.md`](../../workflows/ai_supervisor_workflow.md). Der
Ticketschnitt folgt dem genehmigten Gesamtplan; Phase C ist in T1 (Auswertung A
einfrieren) und T2 (Auswertung B einfrieren) aufgeteilt.

| Ticket | Ziel | Artefakt (Write-Set) | DoD | Abhaengigkeiten | Status |
|---|---|---|---|---|---|
| XTV-0-W1-T1 | Execution Plan + Supervisor-Prompt schreiben | `cross_track_validation_execution_plan.md`, `cross_track_validation_supervisor_prompt.md` | Beide Dokumente mit Pflicht-Kopf vorhanden; AOI-Tabelle, Fallbacks, Statusmatrix, Gate-Vertrag enthalten; alle relativen Links existieren | – | green (2026-07-15) |
| XTV-A-W1-T1 | Gemeinsame Auswertemodule | `backend/app/ml/evaluation/terrain_classes.py`, `backend/app/ml/evaluation/eval_charts.py`, `backend/requirements.txt` | `classify_slope()` + `allowed_cross_track_diff_mm_a()` zentral; Chart-Funktionen schreiben PNG+SVG mit deutschen Labels; `matplotlib>=3.9,<4` ergaenzt; `compileall` gruen | – | green (2026-07-15) |
| XTV-A-W2-T1 | Skript A: Cross-Track-Konsistenz | `backend/app/ml/evaluation/cross_track_consistency.py` | CLI mit `--run NAME=RUN_ID`-Paaren, Filtergruppen inkl. `strict`, Metriken je Gruppe x Klasse, Dedupe, Showcase-Autoauswahl mit Deep-Links; Smoke-Checks gruen | XTV-A-W1-T1 (hart) | green (2026-07-15; Smokes GBA+BEV ohne Warnungen, Dedupe 0) |
| XTV-A-W2-T2 | Skript B: `bad_gastein_motion_compare.py` umbauen | `backend/app/ml/evaluation/bad_gastein_motion_compare.py` | Punkte 1–11 des Gesamtplans (u.a. `--source bev`, v4-Pin, Gates 8/150, Terrain via `terrain_classes`, `--output-json`, Audit-Sektion, `..._v4.md`-Default); v2-Artefakt byte-identisch; Smoke-Checks gruen | XTV-A-W1-T1 (hart) | green (2026-07-15; GBA-Kopplung identisch zu v2: 81/60; Gates verdrahtet, im 232-Tage-Fenster nicht bindend) |
| XTV-B-W1-T1 | Laufzeit-Gate | `artifacts/cross_track_validation_runs.json` (neu) | 2 kleine BEV-Runs (SNT + TSX) auf bg_flat-Bbox mit Zeitmessung; pts/s und Projektion dokumentiert; Go/No-Go gegen ~4 h/Run entschieden; Gate-Runs als BEV-Smoke-Input verfuegbar | – (parallel zu Phase A-W2) | green (2026-07-15; GO, max. Projektion ~20 min/Run; Hinweis: `--reload`-Race, Endstatus erst nach Prozess-Exit bewerten) |
| XTV-B-W2-T1 | 7 Extended-Runs + Labels + Registry | DB-Runs, `artifacts/cross_track_validation_runs.json` | Alle sieben Runs `--source bev` erfolgreich; Labels nach Schema gesetzt; Registry mit IDs, Bboxen, Zeiten, Zaehlungen gefuellt | XTV-B-W1-T1 (hart) | green (2026-07-15; 7/7 succeeded, 6.886 Rollups; Runs 2-7 in 3 parallelen Bahnen, Run 1 solo; work_mem temporaer 256MB, zurueckgesetzt) |
| XTV-C-W1-T1 | Auswertung A einfrieren | `artifacts/cross_track_consistency_v4.{md,json}` + Charts (PNG+SVG) | Report mit `Stand`-Zeile, `## Verwendete Runs`, Methodik-Block; >=1.500 gekoppelte Gebaeude, Zahl je Klasse berichtet; Deep-Links klickbar | XTV-A-W2-T1 (hart), XTV-B-W2-T1 (hart) | green (2026-07-15; n=1858 gekoppelt, strict 1727; flach konsistent (Median-Delta 0.70, Spearman +0.17) vs. hang divergent (1.22, Spearman -0.31); Interpretation nach Re-Freeze mit Roh-/Rangmetriken als Leitdiskriminatoren) |
| XTV-C-W1-T2 | Auswertung B einfrieren | `artifacts/bad_gastein_snt_tsx_motion_comparison_v4.{md,json}` + Charts | Gates 8/150 aktiv und dokumentiert; Audit-Liste enthalten; Framing-Satz gesetzt; v2-Artefakt unveraendert | XTV-A-W2-T2 (hart), XTV-B-W2-T1 (hart) | green (2026-07-15; 604+641 gekoppelte BEV-Gebaeude; Befund: Sensoren korrelieren am Hang (Spearman bis 0.69), auf flach Rauschen um Null; Gates binden im 232-Tage-Fenster nicht; Kurzfenster-MAE 4-7 mm/a) |
| XTV-D-W1-T1 | Playwright-Showcase-Screenshots | `artifacts/xtv_showcase_<aoi>_<building_id>.png` | 3–4 Showcases (flach uebereinstimmend, Hang divergent, Top-Audit-B) ueber Deep-Links, 1600x1000; Fallback dokumentiert | XTV-C-W1-T1, XTV-C-W1-T2 (hart) | green (2026-07-15; 4 Screenshots + Manifest; Hinweis: Deep-Links benoetigen Kamera-Hash, Auto-Fit ohne Hash greift nicht; Audit-Fall zeigt Kurz-/Langfenster-Divergenz -22.4 vs -1.0 mm/a) |
| XTV-D-W2-T1 | Meeting-One-Pager | `backend/app/ml/evaluation/meeting_onepager.py`, `artifacts/stakeholder_onepager_2026-07.html` | Selbstaendiges deutsches HTML ohne CDN; beide Botschaften mit Metrik-Kacheln; prominente Caveat-Box; Run-Tabelle; keine externen Requests | XTV-D-W1-T1 (hart) | green (2026-07-15; 1,39 MB, deterministischer Build, 0 externe Requests, Zahlen datengetrieben aus den v4-JSONs) |
| XTV-D-W2-T2 | Doku-Abschluss | `next_steps.md`, `iterations.md`, `docs/README.md`, Statusmatrix hier | Dokumentationsimpact (unten) vollstaendig nachgezogen; Links geprueft | XTV-C (hart), XTV-D-W2-T1 (weich) | green (2026-07-15; P1-9 teilweise adressiert, P1-8-Evidenzhinweis, 2 iterations-Zeilen, Routing-Zeile, Drift-Fix im Projektziel-Dokument) |

## Gate-Vertrag

1. **Laufzeit-Gate:** Jeder Extended-Run soll `<= ~4 h` bleiben. Das
   Laufzeit-Gate (XTV-B-W1-T1) misst pts/s an zwei kleinen BEV-Runs und
   projiziert die grossen Runs. Ueberschreitet die Projektion die Grenze, greifen
   die vordeklarierten Fallback-Bboxen (Lat-Halbierung, bzw. geschrumpfte Box fuer
   Auswertung B). Die Entscheidung wird in der Run-Registry dokumentiert; ein
   User-Check-in ist nicht noetig, weil das Kriterium definiert ist.
2. **Smoke-before-Freeze:** Beide Skripte laufen zuerst gegen **bestehende**
   Runs mit Output ins Scratchpad, **nie** direkt nach `artifacts/`. Erst nach
   bestandenem Smoke werden die v4-Artefakte erzeugt. Skript A smoked gegen
   GBA-Baselines und vorhandene BEV-Runs; Skript B mit gelockerten Gates gegen
   die Bestands-SNT/TSX-Runs (Strukturvergleich mit dem eingefrorenen
   v2-Artefakt), danach BEV-Smoke mit den Gate-Runs.
3. **Eingefrorenes v2-Artefakt:**
   [`artifacts/bad_gastein_snt_tsx_motion_comparison.md`](artifacts/bad_gastein_snt_tsx_motion_comparison.md)
   bleibt **byte-identisch**. Alle neuen Outputs von Auswertung B heissen
   `..._v4.*`. `git status` muss fuer den v2-Pfad nach allen Arbeiten sauber
   sein.
4. **Eingefrorene Flaechen unveraendert:** `phase7_clustering_experiments.py::AOIS`
   und alle bereits eingefrorenen Artefakte bleiben unangetastet. Kein
   Re-Baseline, keine Schwellen- oder Gate-Aenderung an der Pipeline.

## Dokumentationsimpact des Gesamtpakets

Nach dem Single-Source-Prinzip aus [`../../README.md`](../../README.md) wird
aktueller Status nur in der jeweils autoritativen Quelle gepflegt; andere
Dokumente verlinken. Der Abschluss (Ticket XTV-D-W2-T2) zieht nach:

- [`next_steps.md`](next_steps.md): P1-9 (SNT/TSX-Motion-Ablation) von „blockiert"
  auf **teilweise adressiert** setzen; der Rest-Blocker (belastbare absolute
  Jahresraten aus ausreichend ueberlappenden Referenzdaten) bleibt bestehen.
- [`iterations.md`](iterations.md): zwei Zeilen im Tabellenformat (je eine fuer
  Auswertung A und B) mit AOI, Aenderung, Motivation und beobachtetem Effekt.
- [`../../README.md`](../../README.md): eine Routing-Zeile auf diesen Execution
  Plan (Execution Plans werden geroutet, Artefakte nicht).
- Diese **Statusmatrix**: fortlaufend je Ticketabschluss aktualisieren.
- Optional: Notiz in [`phase8_bev_hygiene_plan.md`](phase8_bev_hygiene_plan.md)
  (P8-E-W1 Motion-Vergleichstooling generalisiert), sofern der Abschluss dies
  belegt.

Die eingefrorenen Artefakte dokumentieren ihren damaligen Stand und werden nicht
rueckwirkend umgeschrieben.
