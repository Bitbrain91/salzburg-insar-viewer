# BEV-Gebaeudequelle: Verarbeitungskonzept fuer die ML-Pipeline

Stand: 2026-07-06
Status: Konzept (Meeting-Auftrag 2026-06-19: "sauberes Verarbeitungskonzept,
wie die BEV-Werte in der ML-Pipeline verwendet werden sollen")
Kontext: GBA-Hoehen systematisch ~27 % zu niedrig (GBA-Hoehen-Audit,
`artifacts/phase7_gba_height_audit.md`); BEV DLM-Bauwerke seit Migration 009
importiert (Salzburg 71.565, Bad Gastein 4.152; ALS-gemessene Hoehen).

## 1. Ist-Zustand (Code, Stand Commit "BEV-Bauwerke als Gebaeudequelle")

- `BUILDING_SOURCE_SPECS` in `anomaly_local_v1.py`:
  `"bev": ("bev_buildings", "bev_id", "height_m")` — die Pipeline nutzt bei
  `--source bev` die Spalte `height_m`.
- `height_m` stammt aus `pipeline/prepare_buildings.py`
  (`HOEHE_OBJEKT_MEDIAN`, Fallback `HOEHE_OBJEKT_MAX`) und ist in beiden
  Gebieten zu 100 % befuellt -> der `default_height_m`-Fallback (12 m)
  greift bei BEV nie.
- Verfuegbare weitere Hoehen: `height_median_m`, `height_max_m` (beide
  100 %), `height_eaves_m` (Salzburg 52 %, Bad Gastein 0 % -> als
  Pipeline-Input NICHT tragfaehig), `ground_min/median/max_m`,
  `height_quality` ('measured' u. a.), `als_date`, `flight_year`.
- UI-Default der Pipeline steht auf `bev`; Harness/Baselines bleiben
  `gba`-gepinnt (siehe Commit "Harness: Gebaeudequelle aus AOI-Spec pinnen").

## 2. Hoehen-Mapping (Empfehlung)

Verschiedene Checks brauchen verschiedene Hoehen:

| Verwendung | Empfohlene Hoehe | Begruendung |
| --- | --- | --- |
| Directional Buffer / Candidate Area (`range_offset = h * tan(inc)`) | `height_max_m` | Layover-Versatz wird vom hoechsten Reflektor bestimmt (Dachfirst, Aufbauten). Median unterschaetzt die Candidate Area bei Steildaechern. |
| Layover-Reichweiten-Check (implizite Reflektorhoehe vs. plausibel) | `height_max_m` + Marge | Check fragt "welche Hoehe waere NOETIG" — obere Schranke noetig; mit gemessenen BEV-Hoehen entfaellt die GBA-Saturierungs-Heuristik (h/0.735). |
| Hoehenplausibilitaet / Hoehenprofil-Features (`height_rank`, kuenftig `height_above_ground_m`) | `height_median_m` + `ground_median_m` | robuste Lagebeschreibung des Baukoerpers; ground_* liefert erstmals einen gebaeudescharfen Bodenbezug. |
| Diagnose/Anzeige | alle (Inspector zeigt median/max/eaves/ground) | bereits umgesetzt. |

Konsequenz fuer den Code (phase8-Ticket, NICHT in diesem Stand umgesetzt):
`BUILDING_SOURCE_SPECS` von einer einzelnen Hoehenspalte auf ein
Hoehen-Mapping erweitern (`buffer_height_expr`, `plausibility_height_expr`),
Default fuer bev: `COALESCE(height_max_m, height_m)` fuer Buffer,
`COALESCE(height_median_m, height_m)` fuer Plausibilitaet. Fuer gba/osm
bleiben beide Ausdruecke identisch zur heutigen Spalte (keine
Baseline-Drift fuer gba-Runs).

## 3. Fallback-Kette der Gebaeudequellen

Prioritaet je Gebiet (aus Meeting 2026-06-19 + `next_steps.md` §Datenquellen):

1. **BEV DLM-Bauwerke** (Oesterreich; gemessene Hoehen, amtliche Footprints,
   kartiert auch Nebengebaeude — Beleg: `artifacts/bev_footprint_recheck_96959851.md`).
2. **GBA** als globaler Fallback; Hoehen mit Korrekturfaktor 1/0.735 aus dem
   Hoehen-Audit, gekennzeichnet als `height_quality='estimated_corrected'`.
3. **Default-Hoehe** (12 m) nur, wenn keine Quelle belastbar.
4. **OSM**: Validierungs-/Zusatzquelle (osm_foreign-Checks), nicht primaere
   Pipeline-Quelle.

Die Fallback-Kette gilt PRO GEBAEUDE erst nach einer Quellen-Normalisierung
(Abschnitt 4); bis dahin gilt sie pro Run ueber `--source`.

## 4. Normalisiertes Quellen-Schema (Zielbild, phase8)

Wie im Meeting-Plan §10.2 skizziert, sollen Gebaeudequellen in ein
priorisiertes Schema zusammengefuehrt werden, damit die Pipeline nicht nur
eine Hoehe kennt, sondern auch deren Belastbarkeit:

- `footprint_source` (bev|gba|osm), `height_source`
- `height_buffer_m`, `height_plausibility_m`, `ground_median_m`
- `height_quality` (measured | estimated_corrected | default)
- `source_date` (BEV: `als_date`/`flight_year`), `positional_accuracy`
- `source_priority`

## 5. Bekannte Eigenheiten / Risiken der BEV-Quelle

1. **Footprint-Verschmelzung:** BEV-Polygone fassen Haupthaus + Anbauten
   teils zu einem Bauwerk zusammen (Fall 96959851: 323 m2 vs. GBA 230 m2).
   Folge: weniger nearest-Kontamination, aber Kontamination wandert IN das
   Gebaeude -> Multi-Cluster-/Differential-Motion-Handling wird wichtiger
   (next_steps §2). Validierungslauf: `artifacts/bev_gba_reference_case_comparison.md`.
2. **ID-Systemwechsel:** `bev_id` sind GUIDs; Referenzfaelle/Baselines sind
   GBA-ID-gekeyt. Migration nur mit Mapping (max-overlap `ST_Intersection`,
   Query im phase8-Plan) und bewusstem Re-Baseline.
3. **`height_eaves_m` unvollstaendig** (BG 0 %) — nicht als Pipeline-Input
   verwenden.
4. **Aktualitaet:** `als_date`/`flight_year` variieren; bei Abriss/Neubau
   koennen Footprints veralten — `source_date` im Schema mitfuehren.

## 6. Offene Punkte

- [ ] phase8-Ticket: Hoehen-Mapping (Abschnitt 2) implementieren + im
      Harness als Achse validieren (Pruefsteine 96959851, 96637447,
      113309836; Scorecard gegen gba-Baseline).
- [ ] Entscheidung Produktions-Default bev nach Review der
      Referenzfall-Validierung.
- [ ] Quellen-Normalisierung (Abschnitt 4) als eigenes Datenmodell-Ticket.
- [ ] BEV-Abdeckungsluecken quantifizieren (Anteil InSAR-Punkte ohne
      BEV-Kandidat vs. GBA-Kandidat je AOI).
