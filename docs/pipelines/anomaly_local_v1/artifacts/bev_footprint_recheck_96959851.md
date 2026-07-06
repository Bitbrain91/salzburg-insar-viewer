# BEV-Footprint-Recheck: Fall 96959851 (unkartiertes Nebengebaeude)

Stand: 2026-07-06
Kontext: Referenzfall `moosstrasse_carport_merge_confirmed`
(`phase7_reference_cases.json`, Fall-Index 18), Fehlerklasse
`residual_contamination` durch unkartierte Struktur (Blechdach-Nebengebaeude,
fehlt in GBA und OSM; siehe P7-N5 in `../next_steps.md`).

## Befund

Nach dem Import der BEV-DLM-Bauwerke (Migration 009, Datenstand
`DLM_8000_BAUWERK_20260323.gpkg`) wurde geprueft, ob die bekannten
Kontaminationspunkte des Falls von einem BEV-Footprint abgedeckt sind.

**Ergebnis: Alle drei Kontaminationspunkte liegen in bzw. unmittelbar an
demselben BEV-Footprint — die fuer GBA/OSM "unkartierte" Struktur ist in BEV
kartiert, mit ALS-gemessenen Hoehen.**

| Punkt | Track | Rolle unter k2x (gba) | BEV-Footprint | ST_Covers | Abstand |
| --- | --- | --- | --- | --- | --- |
| NTC3CYZ01 | 95 | core, score-relevant (`implied_height_excess`) | {A9A7E442-BA31-41D0-8949-A120CB660943} | nein | 1.2 m |
| NTDA86J01 | 95 | core (Hoehenprofil-Verdacht) | {A9A7E442-BA31-41D0-8949-A120CB660943} | ja | 0.0 m |
| O2HC2XV01 | 44 | noise (`anti_layover`) | {A9A7E442-BA31-41D0-8949-A120CB660943} | ja | 0.0 m |

BEV-Footprint-Attribute:

| Attribut | Wert |
| --- | --- |
| bev_id | {A9A7E442-BA31-41D0-8949-A120CB660943} |
| footprint_area_m2 | 323.3 (GBA 96959851: 230.0) |
| height_m (Median) | 4.4 |
| height_max_m | 6.1 |
| height_eaves_m | 2.8 |
| height_quality | measured |
| agwr_object_number | 968039 |

Distanzen der Punkte zum GBA-Footprint 96959851 zum Vergleich:
NTC3CYZ01 8.1 m, NTDA86J01 4.0 m, O2HC2XV01 3.1 m (alle ausserhalb).

## Verwendete Queries (Reproduktion)

```sql
-- Punkte gegen naechsten BEV-Footprint
WITH pts AS (
  SELECT code, geom FROM insar_points
  WHERE area_id='salzburg' AND code IN ('NTC3CYZ01','NTDA86J01','O2HC2XV01')
)
SELECT p.code, b.bev_id, ST_Covers(b.geom, p.geom) AS within,
       round(b.height_m::numeric,1), round(b.height_max_m::numeric,1),
       round(b.height_eaves_m::numeric,1), b.height_quality
FROM pts p
CROSS JOIN LATERAL (
  SELECT * FROM bev_buildings b
  WHERE b.area_id='salzburg' ORDER BY b.geom <-> p.geom LIMIT 1
) b ORDER BY p.code;
```

## Interpretation und Konsequenzen

1. **Die Fehlerklasse "unkartierte Struktur" ist fuer diesen Fall primaer ein
   Datenvollstaendigkeits-Problem.** BEV kartiert das Nebengebaeude; unter
   `--source bev` werden die Punkte `within`/`directional` desselben
   (groesseren) Footprints statt `nearest`-Kandidaten.
2. **Das loest die Kontamination nicht automatisch, es verschiebt sie:**
   Der BEV-Footprint verschmilzt Haupthaus und Nebengebaeude zu einem
   Polygon. Die Punkte des Nebengebaeudes werden damit legitime
   Gebaeudepunkte des (BEV-)Gebaeudes; ob sie den Motion-Score praegen
   duerfen, ist dann eine Multi-Cluster-/Differential-Motion-Frage, keine
   nearest-Hygiene-Frage mehr. Ein "sauberer" Main-Cluster unter BEV darf
   NICHT als Dekontamination gelesen werden (siehe
   `bev_gba_reference_case_comparison.md`).
3. **Kartierungsfreie Checks bleiben notwendig** (Anti-Layover,
   Layover-Reichweite): auch BEV ist nicht vollstaendig, und die gemessenen
   BEV-Hoehen (height_max 6.1 m statt GBA 3.6 m) machen den
   Layover-Reichweiten-Check erst richtig scharf.
4. **Referenzfall-Katalog:** Fall 18 erhaelt einen datierten NACHTRAG
   (BEV-Abdeckung); die GBA-basierte Erwartung bleibt fuer gba-Runs gueltig.

Verwandte Artefakte: `phase7_survivors_scan_s6.md`,
`phase7_reference_cases.json`, `../tsx_structural_reference_decision.md`,
`../bev_building_source_concept.md`.
