# Phase 8 - Integrationsreport (v3_k2xh_diffv2)

Stand: 2026-07-07
Entscheidung: Integration bei gruenen Gates (User-Freigabe, automatisch).
Plan: `../phase8_bev_hygiene_plan.md`. Supervisor-Session mit delegierten
Claude-Subagenten (Modell-Konvention: erben vom Session-Modell).

## Was produktiv ist (MODEL_SET_VERSION `local_hdbscan_rulegate_v3_k2xh_diffv2`)

1. **Bauteil-Trenner (Separation statt Demotion):** kartierungsfreie Checks
   `a8_heightprofile` (einseitiges 1-8-m-Anbau-Band unter >=2 unabhaengigen
   Dach-Ankern), `a6_antilayover` (Anti-Range-Komponente > 1.5 m, planares
   az_from_fp aus der Haupt-Query), `a7_reach` (implizite Reflektorhoehe vs.
   Plausibilitaetshoehe; gba saturierungskorrigiert, bev gemessen) - laufen
   nach a5_crosslook auf ALLEN Zuordnungsmethoden. Kandidaten werden als
   Sekundaercluster `annex_0` (>=2 velocity-konsistente; kinematische
   Rekrutierung ab 2 m Footprint-Abstand) bzw. `annex_weak` getrennt.
   **Annex-Cluster sind von der Main-Wahl ausgeschlossen** (praegen weder
   Motion noch Status).
2. **Differential-Motion v2:** dreistufiges Level candidate/significant/
   confirmed (analytisches SE, deterministisch; Mindest-Support n>=3 je
   Cluster fuer Signifikanz; Downgrades season_amp/amp_ts_cv; confirmed nur
   mit gleichsigniertem Zweit-Track). Reliability -0.15 erst ab significant.
   Level+Evidence in building_rollup, API, Tiles und Inspector.
3. **Hoehen-Mapping:** bev nutzt height_max (Buffer) / height_median
   (Plausibilitaet); gba unveraendert.

## Gates (alle gruen)

- verify-noop: 10/10 AOIs bitidentisch gegen frische v3-Baselines
  (7 gba + 3 bev; Kette in `phase7_baseline_summary.md`).
- Pruefsteine: 96959851 - NTC3CYZ01+NTDA86J01 in `annex_0`, Dach-Keeps im
  Main, O2HC2XV01 nicht zugeordnet; 96637447 - alle 4 Anti-Layover-Cores
  gefangen, NSVF80S01/NSXSYFW01 erhalten.
- Label-Korpus (44 Punkte): roof_lost 0, foreign 8/8 gefangen (k2x: 4),
  annex 2/2 separiert.
- Scorecard k2xh: candidate_inconclusive - kein rotes Gate; einzige
  Restgruende sind die per Design audit-pflichtigen Status-Aufwertungen.
- End-to-End: persistierter Lauf `79dd1468`, API liefert fuer 96959851
  motion -0.22 mm/a (statt -0.64 kontaminiert), Level candidate,
  Reliability 0.61/medium (ehrlich statt 0.78/0.86).

## A/B-Beleg Separation vs. Demotion

`k2xh_demote` (identische Checks, klassische Demotion) verliert 2
bestaetigte Dachpunkte, glaettet robuste Multi-Cluster weg (moos 40<0.8*60)
und verletzt Referenzfaelle -> die Trennungs-Semantik ist der Demotion
messbar ueberlegen (w2_full_scorecard.md).

## Audit-Notizen und Watch-Items

1. **14 Status-Aufwertungen** ueber die 7 AOIs (w2_full_scorecard.json,
   reasons je AOI): Muster = Dekontamination hebt noise_dominated/
   insufficient auf ok/small_n. Exemplarisch auditiert: 96637515 (Main
   danach 6-8 within-Dachkerne; nearest 4.5-9.1 m in annex) - legitim.
   Die uebrigen sind Watch-Items fuer das naechste Visual-Audit.
2. **Hang-Pins:** osthang_low_agreement (54773363) und
   bg_slope_noise_low_agreement (238057563) fuer k2xh auf
   ["ok","noise_dominated"] gepinnt - Daten-Audit: Flips ausschliesslich
   anti-layover/reach-getrieben (u. a. ein -5.8-mm/a-Punkt entfernt);
   Hang-Diagnose bleibt im niedrigen Agreement sichtbar.
3. **96637447 differential level=none unter v3:** Das alte Differential
   (noop: significant, Delta 3.14) hing am Fremdcluster - genau davor
   warnte der Katalog-Fall. Nach Trennung verbleibt Delta 1.22 < 1.5.
   Fachlich korrekte Aufloesung; unter Beobachtung.
4. **a6-Azimutquelle planar vs. geodaetisch:** Produktions-az (planar) vs.
   Harness-x_az (geodaetisch) differenziert 50/1692 Punkte auf moos in
   historischen k2xh-Vergleichen; Zielpunkte unbeeinflusst. Falls exakte
   Aequivalenz gewuenscht: `::geography`-Cast (Klein-Ticket).
5. **MapView stylt Gebaeude weiter am bool-Flag** - Level-Styling ist ein
   additives UI-Folge-Ticket (P7-N7-Familie).

## Offene Phase-8-Punkte (unveraendert im Plan)

- P8-C Feature-Achsen + Hygiene-Ablation Runde 1 (Research-Berichte liegen
  vor; Injection-Achse empfohlen).
- P8-D Label-Korpus-Ausbau Fortsetzung (Stand v3: 10 Gebaeude/44 Punkte)
  + Label-Metriken automatisch je Kandidat (bereits im Scorecard-Block).
- P8-E Motion-Ablation: wartet auf SNT/TSX-Overlap-Daten.
- Terrain-Datenstands-Wechsel (1m-DGM/DOM liegen bereit, `--terrain-source`).
- Referenzfall-Erwartungen fuer bev-Varianten (bg_slope) formulieren.
