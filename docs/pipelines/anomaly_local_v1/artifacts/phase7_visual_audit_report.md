# Phase 7 - Visual-Audit-Workflow und Audits (P7-B-W2-T1, v2 seit 2026-06-12)

Stand: 2026-06-12 (v2: Survivors-Pass verbindlich; Anlass siehe Lessons Learned)

## Workflow (reproduzierbar, v2)

1. Fall aus `phase7_visual_audit_cases.json` bzw. `phase7_reference_cases.json`
   waehlen; jeder Fall traegt einen vollstaendigen Deep-Link.
2. Deep-Link oeffnen (Frontend :3000, Backend :8000). Parameter-Schema siehe
   `P7-B-W2-T0`; Pflicht fuer Audits: `rawtracks=0`, `basemap=satellite`,
   `hulls=1`, `mlview=cluster`.
3. Kamera-Standard: Nadir (Auto-Fit erzwingt `pitch=0`, Nord oben). Fuer
   Detailblick expliziten Hash anhaengen (z. B. `#19/<lat>/<lon>`), fuer
   Hoehenfragen `pitch=55&gba=1` als dokumentierte Zweitansicht.
   Baseline-/Kandidaten-Vergleich desselben Falls IMMER mit identischem Hash.
4. Screenshot (Playwright `browser_take_screenshot`).
5. Annotation (Pflichtstandard seit v2): `phase7_visual_audit.py` mit
   `--codes` (Punkt-Codes), `--footprints` (ALLE GBA-Umrisse im Ausschnitt,
   Ziel hervorgehoben - macht sichtbar, wo KEIN kartiertes Objekt liegt) und
   bei Detailfragen `--crop auto` (gezoomter Beleg-Ausschnitt). Projektion
   deterministisch in Web-Mercator; unabhaengig von Render-Groessen.
6. Diff-Pass (bisheriger Kern): Was wurde gegenueber der Baseline entfernt/
   abgestuft - ist JEDE Aenderung begruendet?
7. **Survivors-Pass (Pflicht seit v2):** `phase7_survivors_scan.py` auf den
   Kandidaten-Run. Das Tool sortiert jeden ueberlebenden Punkt (core/
   weak_support/noise, nicht gate-ausgeschlossen) ausserhalb des Footprints
   vor: `anti_layover` (Punkt entgegen der Range-Verschiebungsrichtung -
   physikalisch nicht dacherklaerbar), `implied_height_excess`
   (d_fp/tan(inc) ueber GBA-Hoehe/0.735 + 3 m), `height_outlier`
   (Median+3*MAD der within-Anker, relativ). Fuer jeden `suspicious`-Punkt
   die Leitfrage am Luftbild beantworten: **"Welche real sichtbare Struktur
   liegt unter diesem Punkt - und kann sie die Reflexion erklaeren?"**
   Urteil pro Punkt: `gedeckt` / `verdaechtig` / `fremd`.
8. Label aus dem festen Labelset vergeben (inkl. `unmapped_structure_merge`
   fuer Strukturen, die in GBA UND OSM fehlen), Bewertung in 2-4 Saetzen,
   Eintrag in die JSON (punktbezogene Befunde in `assessment_addendum`),
   Screenshots unter `artifacts/phase7_visual_*.png`.
9. Eskalation: `verdaechtig`-Punkte gehen in die Experten-Gegenlabeling-
   Liste; bei Hoehen-/Strukturfragen Google-Maps-3D als Zweitquelle nutzen
   (zeigt Hoehenstruktur, die das Nadir-Orthofoto nicht zeigt - so wurde
   das Nebengebaeude 96959851 identifiziert). Ist Frontend/Playwright
   blockiert, wird der Fall `inconclusive` mit konkretem Blocker
   dokumentiert - niemals aus dem Gedaechtnis gelabelt.

## Lessons Learned 2026-06-12 (Fall 96959851)

Der User wies nach (Luftbild + Google-Maps-3D), dass nach der k2x-Demotion
der +13m-Quergruppe ZWEI weitere Fremdpunkte als t95-Cores ueberlebten -
Returns eines **unkartieren Nebengebaeudes mit Blechdach** (weder GBA noch
OSM). Drei Methodikfehler des damaligen Audits, die v2 adressiert:

1. **Zirkulaeres Pruefkriterium:** Das Nachher-Bild wurde gegen
   "Cross-Konsistenz" geprueft - dieselbe Achse, die die a5-Politik selbst
   nutzt. Unabhaengiges Kriterium ist das Luftbild (welche Struktur liegt
   unter dem Punkt), nicht die Politik-Geometrie. -> Schritt 7, Leitfrage.
2. **Nur Demotierte geprueft, nicht Ueberlebende:** Gefragt wurde "ist die
   bekannte Kontamination weg?" statt "ist alles Verbleibende
   gerechtfertigt?" (Asymmetrie-Prinzip verlangt die zweite Frage).
   -> Survivors-Pass als Pflichtschritt.
3. **Annotation ohne Codes/Nachbarstrukturen:** Ohne Punkt-Codes und ohne
   Footprint-Overlay liest sich "4-8 m oestlich der Kante" bei 9-px-Kreisen
   leicht als "Dach-Ostkante". -> `--codes --footprints --crop` Pflicht.

Strukturelle Einsicht: **Footprint-/OSM-basierte Checks koennen unkartierte
Strukturen PRINZIPIELL nicht fangen** - es helfen nur kartierungsfreie
Plausibilitaetschecks (Layover-Richtung, Layover-Reichweite, Hoehenprofil;
P7-N5) und menschliche Luftbild-/3D-Pruefung. Experten-Gegenlabeling ist
dadurch nicht ersetzbar, sondern wird gezielter eingesetzt.

## Durchgefuehrte Audits (Schritt 1, Baseline)

| Fall | Gebaeude | Labels | Kernbefund |
| --- | --- | --- | --- |
| audit_548205_baseline | 548205 | plausible_main_roof_cluster, offset_expected_due_to_sar_geometry | Struktur plausibel, `single_track_only` ehrlich |
| audit_96856632_nearest_main | 96856632 | ambiguous_visual, offset_expected_due_to_sar_geometry, possible_carport_merge, needs_human_review | Main-Cluster 3/3 nearest ~9.7 m WSW; Richtung == t44-Range; Anbau-Hypothese nicht ausschliessbar; Anker fuer P7-C-W1-T5 |
| audit_105022686_bg_flat_hr | 105022686 | plausible_main_roof_cluster | Zwei-Track-Cores auf dem Dach; HR-Kopplung bestaetigt |
| audit_96959851_unmapped_outbuilding_user | 96959851 | unmapped_structure_merge, possible_outbuilding_as_main | User-Befund 2026-06-11: unkartiertes Blechdach-Nebengebaeude traegt 3 Punkte (2 davon t95-Cores); Fall unter k2x nur teilgeloest |

## Survivors-Scan 2026-06-12 (rueckwirkend, alle 14 S6-Faelle)

Artefakte: `phase7_survivors_scan_s6.{json,md}`. 63 vorsortierte Flags;
9 Faelle mit score-relevanten Flags visuell re-gecheckt. Befunde mit
Konsequenz (Details als `assessment_addendum` in der Fall-JSON):

| Fall | Befund |
| --- | --- |
| 96959851 | Restkontamination bestaetigt (siehe Lessons Learned); Pruefstein fuer P7-N5 |
| 96637447 | 4 anti-layover-t44-Cores an der Ostkante: cluster_3-Vorbehalt geometrisch belegt; needs_human_review |
| 96856632 | Hypothese B (Nebenstruktur) quantifiziert: h_impl 12.5-16.6 m ohne t44-Hoehenanker |
| 113309836 | Watch-Item verschaerft: 3 negative-mover-Cores +13.7-15 m ueber Dachanker (Verdachtsmechanismus Vorzeichenwechsel) |
| uebrige | gedeckt (Hang-Traufe, Innenstadt-Hoehenspanne, GBA-Saettigungs-Diagnostik) bzw. nur Noise-Flags |

## Grenzen

- Audits skalieren nicht auf alle Gebaeude; sie sind qualitative Evidence.
  Der Survivors-Scan skaliert als VORSORTIERUNG, ersetzt aber kein Urteil.
- Nadir-Orthofoto zeigt keine Hoehen; Hoehenfragen brauchen die
  3D-Zweitansicht (Google-Maps-3D bewaehrt) oder `height_above_ground_m`
  (P7-C-W1-T5/A3).
- Der Scan nutzt die GBA-Hoehe fuer die Reichweiten-Plausibilitaet; bei
  stark gesaettigten Hoehen grosser Gebaeude (z. B. 105022686) sind
  `implied_height_excess`-Flags Hoehenfehler-Diagnostik, keine
  Fremdpunkt-Beweise.
