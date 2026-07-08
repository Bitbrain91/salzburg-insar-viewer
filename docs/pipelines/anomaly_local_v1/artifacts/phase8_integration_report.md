# Phase 8 - Integrationsreport (v3_k2xh_diffv2)

> **NACHTRAG P8-F (2026-07-08): v4_k2xhf_diffv2 ist produktiv.**
> Der v3-Bauteil-Trenner routete ALLE separation_candidates in
> annex-Cluster - auch anti_layover-Fremdpunkte (User-Befund {A9A7E442}
> t44). 65-86 % der annex-Cluster waren Fremdpunkt-Faelle; 14 candidate-
> und 3 significant-Differentials hingen daran. Fix: Evidenzklassen-
> Routing `separation_classes="anti_foreign"` (anti -> `:foreign`/
> weak_support, bev-Kontext auch reach; Rekrutierung nur annex-Klasse),
> Gate-Nachschaerfung (foreign_in_annex/annex_in_foreign rote Gates,
> maschinelle Punkt-Pins, separation_composition-Statistik), Korpus v4,
> Re-Baseline aller 10 AOIs. Details: Abschnitt "P8-F" unten und
> `phase7_scorecard_sepcls.md`. Die restlichen v3-Abschnitte bleiben als
> historischer Stand erhalten.

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

## P8-F (2026-07-08): annex/foreign-Evidenzklassen-Fix (v4_k2xhf_diffv2)

Ausloeser: User-Befund im Viewer - bev-Lauf 85953608, Gebaeude
{A9A7E442-...}: die t44-Punkte O2G57QB01 (8.54 m ausserhalb) und
O2GQNC301 (2.56 m) lagen auf der Anti-Layover-Seite von t44 und waren
trotzdem als `:t44:annex_0` etikettiert. Die Checks hatten korrekt
gefeuert; der Fehler war die EINE Auffang-Kategorie "annex" fuer alle
separation_candidates.

**Warum die v3-Gates das nicht sahen (Lessons Learned):**
1. Die Label-Metrik zaehlte foreign-im-annex als `foreign_caught`
   (Erfolg) - die semantische Fehlablage wurde metrisch belohnt.
2. Referenzfaelle pinnten nur Gebaeude-STATUS; die Anbau-Erwartung des
   Flaggschiffs existierte nur als Prosa.
3. Es gab keine Kompositions-Statistik der annex-Cluster (65-86 % ohne
   Struktur-Evidenz blieben unsichtbar).
   Konsequenz als Regel: Jede neue semantische Ergebnis-Kategorie bekommt
   ab Tag 1 (a) eine Reinheits-/Kompositions-Statistik im Scorecard,
   (b) Fehlablage-zwischen-Kategorien als eigenen Failure-State,
   (c) maschinell gepinnte Punkt-Erwartungen statt Prosa.

**Fix (produktiv):** `separation_classes="anti_foreign"` in
`_assign_side_group`: anti_layover-Kandidaten -> ein `:foreign`-Cluster
je Gebaeude x Track (cluster_role weak_support, flags foreign_suspect;
nie Main, nie Differential-Quelle, kein reliable_cluster_count, kein
Hull). Im bev-Kontext zusaetzlich reach_height_excess -> foreign (BEV
kartiert Anbauten als eigene Footprints - die unkartierter-Anbau-Ausrede
des gba-Kontexts existiert dort nicht). Die annex-Klasse (height_outlier,
gba-reach) laeuft unveraendert durch Rekrutierung + Konsistenz; die
kinematische Rekrutierung startet damit nie mehr an Fremd-Seeds
(Zirkularitaets-Fall {C34B199D}: 1 Anti-Seed hatte 3 Punkte in ein
Schein-annex rekrutiert).

**Design-Absicherung:** Vergleichsvariante `sepcls_strict` (nur
height_outlier bleibt annex) laeuft dauerhaft im Harness und ist wie
vorhergesagt ROT (annex_in_foreign=1: sie zerbricht den GE-3D-bestaetigten
Flaggschiff-Anbau 96959851, dessen Evidenz reach-only+growth ist) -
maschinell dokumentierter Beleg fuer die anti_foreign-Regel.

**Gates (phase7_scorecard_sepcls.md):** sepcls_foreign
candidate_inconclusive, refcases_ok=True (inkl. neuer Punkt-Pins fuer
Flaggschiff-gba und bev-Fall moosstrasse_bev_foreign_separation);
foreign_in_annex=0, annex_in_foreign=0, foreign 10/10 (Korpus v4, +2
foreign mit GE-3D-Beleg ge_A9A7E442_t44_foreign.png), annex 2/2,
roof_lost ohne Regression (1 vorbestehender bev-Doppel-Grading-Fall
NSVF80S01, R9). verify-noop 10/10 gegen frische v4-Baselines
(Kette in phase7_baseline_summary.md).

**Differential-Bereinigung:** 21 statt 50 aktive Bewertungen ueber die
10 Baselines; 32 Schein-Differentials an Fremdpunkt-Clustern entfallen
(darunter 3 significant mit -0.15-Reliability-Wirkung); 0 Bewertungen
haengen an foreign-Clustern oder Clustern mit anti-Punkten; Flaggschiff
96959851 bleibt candidate. NEU/verstaerkt (strukturell evidenziert,
Watch-Items fuers naechste Visual-Audit): 96637447 t44 (reach-only,
11.8-12.8 m), 96639519 t44 (reach+growth), 96955335 (candidate->
significant, t95 reach+growth), 238100082 t70 (Hoehenband on-footprint -
plausibelster echter Neu-Fund). Audit {C34B199D}: small_n ->
single_track_only = legitime Dekontamination.

**Offene P8-F-Folge-Punkte:**
- Watch-Items oben beim naechsten Visual-Audit pruefen (insb. die
  reach-only-gba-Differentials >10 m).
- R9 Label-Doppel-Grading gba/bev (gleiche dataset_id): building_source-
  Filter fuer Label-Grading als Klein-Ticket.
- UI: `cluster_kind`-Feld (annex/foreign visuell unterscheidbar) +
  MlLogicExplainer-Kapitel Bauteil-Trenner/foreign.
- Optionaler a9-Check "Nachbar-Footprint am Punkt" (BEV-Topologie als
  Evidenzquelle fuer annex/foreign in Grenzfaellen).

## Offene Phase-8-Punkte (unveraendert im Plan)

- P8-C Feature-Achsen + Hygiene-Ablation Runde 1 (Research-Berichte liegen
  vor; Injection-Achse empfohlen).
- P8-D Label-Korpus-Ausbau Fortsetzung (Stand v4: 10 Gebaeude/46 Punkte)
  + Label-Metriken automatisch je Kandidat (bereits im Scorecard-Block).
- P8-E Motion-Ablation: wartet auf SNT/TSX-Overlap-Daten.
- Terrain-Datenstands-Wechsel (1m-DGM/DOM liegen bereit, `--terrain-source`).
- Referenzfall-Erwartungen fuer bev-Varianten (bg_slope) formulieren
  (moosstrasse_bev hat seit P8-F einen eigenen Fall mit Punkt-Pins).
