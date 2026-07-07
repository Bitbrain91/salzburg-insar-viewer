# `anomaly_local_v1` Phase 8: BEV-Integration + Assignment-Hygiene 2

Stand: 2026-07-06
Status: geplant (Vorarbeiten erledigt, siehe "Startpunkt")
Kurzname: `phase8_bev_hygiene`

Dieser Plan buendelt die nach Phase 7 offenen Punkte (P7-N4, P7-N5, P7-N7,
Teile von P7-N3/N6) mit den Meeting-Beschluessen vom 2026-06-19 (BEV statt
GBA; Feature-Bewertung; Hanglagen-Research) und den Befunden vom 2026-07-06
(BEV-Recheck, BEV-vs-GBA-Validierung, TSX-Decision-Record).

## Rahmenbedingungen

- KEINE zeitliche SNT/TSX-Ueberlappung -> Bewegungsvergleiche bleiben
  qualitativ; die Motion-Ablation (Phase P8-E) wartet auf die
  Overlap-Datenlieferung.
- KEINE Experten-Labels kurzfristig -> Evaluation stuetzt sich auf den
  internen Label-Korpus (`reference_labels.md`), Referenzfaelle, Scorecards,
  Cross-Track (flach) und Visual-Audits mit Survivors-Pass.
- Zwei Research-Berichte (Features/Zeitreihen, Hanglage/Terrain) laufen;
  ihre Ergebnisse fliessen in P8-C bzw. das Hanglagen-Followup ein.

## Startpunkt (Vorarbeiten 2026-07-06, bereits committet/gelaufen)

- BEV-Quelle end-to-end integriert (`--source bev`, UI-Layer, Detail-API);
  Harness/Baselines bleiben gba-gepinnt (Commit "Harness: Gebaeudequelle
  aus AOI-Spec pinnen").
- BEV-Recheck 96959851: Nebengebaeude in BEV kartiert
  (`artifacts/bev_footprint_recheck_96959851.md`).
- BEV-vs-GBA-Validierungslaeufe mit Metriken gegen den Label-Korpus
  (`artifacts/bev_gba_reference_case_comparison.md`). Kernbefunde:
  foreign-Recall 4/10 -> 6/10, aber 1 roof-Verlust, 2 Anti-Layover-Cores im
  Main, differential_flag-Kipp, Schein-Dekontamination (Reliability steigt
  bei unveraendert kontaminierter Motion).
- TSX-Entscheidung: kein Punkt-Overlay-Support-Score; P7-N3 gekoppelt an
  `artifacts/hr_offset_recon.md` (`tsx_structural_reference_decision.md`).
- Label-Korpus v1 (20 Punkte, 2 Gebaeude) als `artifacts/reference_labels.json`.
- BEV-Konzept mit Hoehen-Mapping-Empfehlung
  (`bev_building_source_concept.md`).

## Zielbild

1. Die Pipeline nutzt BEV-Footprints und -Hoehen korrekt (Hoehen-Mapping,
   Quellen-Metadaten), ohne die unter GBA kalibrierte Hygiene zu verlieren.
2. Kartierungsfreie physikalische Checks (Anti-Layover, Layover-Reichweite)
   fangen Fremdreflektoren UNABHAENGIG von der Zuordnungsmethode — auch
   within/directional-Punkte verschmolzener BEV-Footprints.
3. Der Label-Korpus macht Hygiene-Fortschritt quantitativ (Precision/
   Recall/F1 + roof-Verluste als Scorecard-Block).
4. Multi-Cluster-/Differential-Semantik uebersteht den Footprint-Wechsel
   (Fall 96637447: differential_flag darf nicht kippen).

## Evaluationsstrategie

Bestehende Schichten (Scorecards vs. eingefrorene Baselines, Referenzfaelle,
Cross-Track flach, Visual-Audit v2 mit Survivors-Pass, HR-Gebaeude-Guardrail)
PLUS neu:

- Label-Korpus-Metriken pro Kandidat (siehe `reference_labels.md`,
  Abschnitt "Verwendung in der Evaluation").
- BEV-vs-GBA-Paarlaeufe auf den Pflicht-AOIs als eigene Vergleichsachse.

Pruefsteine (Pflicht-Gegenbeispiele fuer jeden Kandidaten):

- 96959851: NTC3CYZ01 + NTDA86J01 muessen demotiert werden, OHNE
  NTF2IZV01/NTG9E7F01 zu verlieren; O2HC2XV01 darf nicht zugeordnet bleiben.
- 96637447: alle 4 Anti-Layover-t44-Cores raus; Differential-Semantik und
  echte Dachkerne (NSVF80S01, NSXSYFW01) unveraendert. Unter BEV zusaetzlich:
  NSVF80S01 darf NICHT excluded sein (aktueller bev-Lauf verliert ihn).
- 113309836: Statuswechsel nur mit menschlich geprueftem Motion-Pfad
  (P7-N4-Watch bleibt offen; BEV-Kontext -0.27 -> -0.59 dokumentiert).

## Plan -> Phase -> Welle -> Ticket

### Phase P8-A: BEV produktionsreif machen

Welle W1 (parallelisierbar, disjunkte Write-Sets):

- **P8-A-W1-T1 Hoehen-Mapping**: `BUILDING_SOURCE_SPECS` auf getrennte
  Ausdruecke erweitern (`buffer_height`: bev `COALESCE(height_max_m, height_m)`,
  `plausibility_height`: bev `COALESCE(height_median_m, height_m)`; gba/osm
  unveraendert identisch zur heutigen Spalte). DoD: gba-Noop bleibt
  punktidentisch (verify-noop gruen auf allen 7 AOIs); bev-Laeufe nutzen
  height_max fuer Candidate Area (Stichproben-SQL auf 113309836: Buffer
  aus 14.9 m).
- **P8-A-W1-T2 Referenzfall-ID-Mapping**: max-overlap-Mapping GBA->BEV als
  wiederverwendbare Query/Funktion + `bev_building_id`-Feld in
  `phase7_reference_cases.json` (nur additiv). DoD: alle Katalog-Faelle
  gemappt oder explizit `no_bev_match`.
- **P8-A-W1-T3 BEV-Abdeckungs-Audit**: Anteil InSAR-Punkte mit
  BEV-Kandidat vs. GBA-Kandidat je Pflicht-AOI + Gebietsstatistik
  (Footprint-Anzahl, Flaechenverteilung, Verschmelzungsgrad BEV:GBA).
  DoD: Artefakt `artifacts/phase8_bev_coverage_audit.md`.

Welle W2 (nach W1):

- **P8-A-W2-T1 Vollzug Produktions-Default BEV** (User-Entscheidung
  2026-07-07: BEV IST der Standard; die Entscheidung ist gefallen, dieses
  Ticket ist der technische Vollzug): BEV-Baselines einfrieren (AOIS
  erhaelt `source: "bev"`-Varianten, gba-Baselines bleiben als legacy),
  Referenzfall-Erwartungen fuer bev formulieren (Fall 18: Erwartung wird
  Multi-Cluster/Differential statt nearest-Demotion). DoD: neue
  Baseline-Runs + verify-noop gruen auf den bev-AOIS-Varianten +
  Decision-Log-Eintrag.

### Phase P8-B: Assignment-Hygiene 2 (kartierungsfrei)

Vorbild: Vorsortier-Versionen existieren im Survivors-Scan-Tooling
(`phase7_survivors_scan.py`) und sind am Fall validiert.

Welle W1:

- **P8-B-W1-T1 Anti-Layover-Check als Pipeline-Politik**: Punkte ausserhalb
  des Footprints mit Versatz ENTGEGEN range_dx/dy (Anti-Komponente >
  Geocoding-Toleranz) demotieren. Harness-Achse `a6_antilayover`.
  DoD: Pruefsteine; Label-Korpus-Metriken; Scorecard vs. Baseline.
- **P8-B-W1-T2 Layover-Reichweiten-Check**: implizite Reflektorhoehe
  `d_fp/tan(inc)` gegen plausible Hoehe (bev height_max + Marge; gba
  h/0.735 + Marge). Achse `a7_reach`. DoD: faengt NTC3CYZ01-Typ
  (10.2 m noetig vs. 6.1 m BEV-max) ohne roof-Verluste.
- **P8-B-W1-T3 Polygon-aware Cross-Look-Excess**: `cross_excess_m` gegen
  die Polygon-Projektionsspanne statt Zentroid; Zentroid-Offset bleibt
  Diagnose. Achse `a5p_polyaware`. DoD: lange/breite Testfaelle; keine
  falschen Demotions am Gebaeuderand; bekannte Fremdpunkte bleiben gefangen.
- **P8-B-W1-T4 Wichtig — Checks auch fuer within/directional**: T1/T2
  duerfen nicht auf nearest beschraenkt sein (BEV-Befund: Fremdpunkte sind
  dort within!). DoD: NTC3CYZ01/NTDA86J01 werden im bev-Lauf demotiert.

Welle W2:

- **P8-B-W2-T1 Komposit `k2xh`**: a5_crosslook + Hoehenprofil + smalln_strict
  + beste Achsen aus W1; voller Kandidaten-Sweep + Scorecards.
- **P8-B-W2-T2 Visual-Audit + Survivors-Pass** der Shortlist (Pflicht v2).
- **P8-B-W2-T3 Entscheidung/Integration** analog P7-E (nur bei gruenen
  Guardrails; sonst dokumentiertes no_integrate).

### Phase P8-C: Feature-Achsen + Hygiene-Ablation (nach Research-Bericht 1)

- **P8-C-W1-T1 Amplituden-Achsen**: amp_mean-Rang im Gebaeudekontext,
  Amplituden-Konsistenz pro Cluster, amp_ts_cv als Anker-Gewicht
  (Hypothese Blechdach-Indikator, P7-N6). Nur Harness, keine Produktion.
- **P8-C-W1-T2 Zeitreihen-Achsen**: Kandidaten aus dem Research-Bericht
  (docs/research/), z. B. Form-/Distanzmasse fuer kurze, unregelmaessige
  Reihen. Nur Harness.
- **P8-C-W1-T3 Hygiene-Ablation Runde 1**: Achsen einzeln vs. Komposit
  gegen Label-Korpus + Scorecards + Pruefsteine; Ergebnis als
  `artifacts/phase8_ablation_round1.md`. Endgueltiges Feature-Pruning
  bewusst NICHT hier (wartet auf Motion-Referenz, P8-E).

### Phase P8-D: Label-Korpus-Ausbau

- **P8-D-W1-T1**: Korpus auf 20-40 Gebaeude erweitern (stratifiziert nach
  `next_steps.md` §6: flach/Hang, viele/wenige Punkte, Problemtypen;
  BG-Faelle einschliessen). Jede Erweiterung mit Evidenz + Datum.
- **P8-D-W1-T2**: Label-Metriken als Scorecard-Block im Harness
  (automatisch pro Kandidat).

### Phase P8-E: Motion-Ablation (WARTET auf Overlap-Daten)

- **P8-E-W1-T1 Design-Doc**: Metriken (Overlap-Fenster-Slopes, Bias/MAE/
  Sign-Agreement je Filtergruppe wie im BG-Vergleich), AOI-Set inkl.
  Salzburg, Akzeptanzkriterien. Kann sofort geschrieben werden.
- **P8-E-W1-T2 Harness-Generalisierung**: `bad_gastein_motion_compare.py`
  auf Salzburg/beliebige Dataset-Paare parametrisieren (geometrie-gematcht
  DESC<->DESC; Salzburg-TSX single-track beachten).
- **P8-E-W2 (bei Datenlieferung)**: Re-Baseline (Datenstands-Wechsel), volle
  Ablationsmatrix, Feature-Pruning, ggf. TSX-Aufwertungs-Review (P7-N4).

### Offen uebernommen aus P7 (unveraendert)

- P7-N1 (alternative Clusterer) — verschoben, braucht benannten Schwachpunkt.
- P7-N2 (regime-konditionale High-N-/TSX-Strategie) — braucht P7-N3-Ersatz
  bzw. hr_offset_recon-Ergebnis.
- P7-N7 (Kartensignatur demotierter Punkte) — klein, additiv, jederzeit.
- Track-22-Ost-Diagnose (Datenthema).

## Abhaengigkeiten

- P8-B-W2 braucht P8-B-W1; P8-A-W2 braucht P8-A-W1 und P8-B-W1-Ergebnis.
- P8-C braucht Research-Bericht 1 (soft) und P8-B-W1-Achsen (hard).
- P8-E-W2 braucht externe Overlap-Daten (hard, extern).
- Hanglagen-Methodik (2D-Dekomposition etc.) haengt am Research-Bericht 2
  und wird nach dessen Vorliegen als eigene Phase geplant.

## Pflichtartefakte

- Scorecards je Kandidat, Label-Korpus-Metriken, Visual-Audit-Report,
  Survivors-Scan, Decision-Log-Eintraege, iterations.md-Zeilen pro Lauf.

## Anhang: Reproduktions-SQL (BEV-vs-GBA-Punktvergleich)

```sql
SELECT CASE run_id WHEN '<RUN_GBA>'::uuid THEN 'gba' ELSE 'bev' END AS src,
       code, track, building_id, label,
       meta->'visual_context'->>'assignment_method' AS assign,
       meta->'cluster'->>'cluster_role'             AS role,
       (meta->'cluster'->>'is_main_cluster')        AS main
FROM ml_point_results
WHERE run_id IN ('<RUN_GBA>'::uuid, '<RUN_BEV>'::uuid)
  AND code = ANY(SELECT jsonb_array_elements_text(...))  -- Label-Korpus-Codes
ORDER BY code, src;
```

GBA->BEV-ID-Mapping:

```sql
SELECT b.bev_id FROM gba_buildings g
JOIN bev_buildings b ON b.area_id = g.area_id AND ST_Intersects(b.geom, g.geom)
WHERE g.gba_id = $1
ORDER BY ST_Area(ST_Intersection(b.geom, g.geom)::geography) DESC LIMIT 1;
```
