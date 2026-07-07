# Referenzlabel-Korpus (interne "Silver Ground Truth")

Stand: 2026-07-06
Daten: `artifacts/reference_labels.json`
Kontext: Experten-Labels von AUGMENTERRA sind kurzfristig nicht verfuegbar
(Meeting-Nachtrag 2026-07-06). Die in Visual-Audits, Survivors-Scans und
User-Befunden bereits getroffenen punktgenauen Urteile werden deshalb
persistent und maschinenlesbar gemacht, damit Pipeline-Aenderungen
automatisch benotbar werden (Precision/Recall auf der Zuordnungsseite).

## Schema

Eine Zeile pro gelabeltem Punkt in `artifacts/reference_labels.json`:

| Feld | Bedeutung |
| --- | --- |
| `building_id` | Gebaeude-ID der Quell-Zuordnung (aktuell GBA-IDs) |
| `building_source` | Quelle der building_id (`gba`) |
| `dataset_id` | z. B. `salzburg_snt` |
| `track` | Track-Nummer |
| `point_code` | InSAR-Punktcode |
| `label` | `roof` \| `annex` \| `foreign` \| `unclear` |
| `evidence` | Kurzbegruendung + Quelle (Artefakt/Befund; bei foreign/annex/unclear-aus-Verdacht mit GE-3D-Datum + Screenshot `artifacts/label_evidence/ge_<building_id>.png`) |
| `labeled_by` | `team_internal` (nicht expertenvalidiert!) |
| `date` | Label-Datum |

## Label-Semantik

- **roof**: Punkt stammt mit hoher Sicherheit vom Hauptbaukoerper
  (Dach/Struktur). Muss score-relevant bleiben duerfen.
- **annex** (seit 2026-07-07): Punkt stammt von einem BAULICH VERBUNDENEN
  Gebaeudeteil mit potenziell eigenem Bewegungsregime (Anbau, angebaute
  Garage/Werkstatt; typisch leichter, flacher gegruendet, Blechdach).
  Fachlich KEIN Fremdpunkt und KEIN Muell: differenzielle Bewegung
  zwischen Hauptbau und Anbau ist ein schadensrelevantes Signal
  (Rissrisiko an der Fuge; vgl. `next_steps.md` §2). Zielverhalten:
  eigener Cluster bzw. explizite Trennung vom Main-Cluster +
  differential_motion-Bewertung — NICHT Demotion/Entfernung.
- **foreign**: Punkt stammt mit hoher Sicherheit von einer eigenstaendigen
  Fremdstruktur (Nachbargebaeude, freistehender Carport) oder ist als
  erhoehter Reflektor des Baukoerpers physikalisch unplausibel
  (Anti-Layover). Darf den Score nicht praegen.
- **unclear**: dokumentiert verdaechtig, aber nicht bestaetigt. Zaehlt in
  Metriken weder als Treffer noch als Fehler.

Abgrenzung annex vs. foreign: entscheidend ist die bauliche Verbindung
(gemeinsame Wand/Giebel) — per Google-Earth-3D/Orthofoto pruefen. Der
3D-Blick ist seit 2026-07-07 PFLICHTSCHRITT vor jeder foreign-Vergabe
(Lehre aus Fall 96959851: als "unkartiertes Nebengebaeude" gelabelt,
tatsaechlich baulich verbundener Anbau).

**Einsatz-Konvention Google-Earth-3D (User-Entscheidung 2026-07-07):**
grundsaetzlich verwenden, wo sinnvoll — verpflichtend beim Labeling
(foreign/annex-Abgrenzung), empfohlen zur Analyse unklarer Ergebnisse
(Watch-Items, Visual-Audit-Faelle, ueberraschende Statuswechsel). NICHT
als Standard fuer jede Gebaeudebewertung (manuell, skaliert nicht auf
62k+ Gebaeude). Skalierbare Struktur-Proxys fuer die Flaeche: BEV-Attribute
(Footprint-Teile, AGWR-Funktion) und kuenftig das nDSM aus dem 1m-ALS
DOM-DGM (erkennt niedrigere angebaute Bauteile automatisch; siehe
`../../research/2026-07_hanglagen_terrain_research.md`).

## Regeln

1. Nur Punkte mit dokumentierter Evidenz aufnehmen (Visual-Audit-Report,
   Survivors-Scan, User-Befund, DB-Recheck) — keine Ad-hoc-Urteile.
2. `foreign` nur bei bestaetigtem Befund oder harter physikalischer
   Unmoeglichkeit (Anti-Layover-Vorzeichen); sonst `unclear`.
3. Labels sind quellen-stabil formuliert (GBA-IDs); bei Umstellung auf BEV
   werden building_ids per max-overlap-Mapping migriert, `point_code`/`track`
   bleiben stabil.
4. Erweiterung stratifiziert nach Stichprobendesign `next_steps.md` §6:
   flach/Hang, viele/wenige Punkte, Problemtypen. Ziel: 20-40 Gebaeude.
5. Jede Erweiterung als eigener, datierter Commit; `updated` im JSON
   mitziehen.

## Verwendung in der Evaluation

Fuer einen Kandidaten-Lauf gilt pro gelabeltem Punkt:

- `foreign` und score-relevant (core im Main-Cluster) -> False Negative
  der Hygiene.
- `foreign` und demotiert/noise/excluded -> True Positive.
- `roof` und demotiert/verloren -> False Positive (zu aggressiv).
- `annex` und core im MAIN-Cluster -> Fehler, WENN sich das
  Anbau-Verhalten kinematisch vom Hauptbau unterscheidet (wie im Fall
  96959851: Anbau -0.9/-1.7 mm/a vs. Hauptdach +0.1/+0.4). Bewegen sich
  beide Teile gleich, ist ein gemeinsamer Cluster statistisch korrekt
  (mehr Stuetzung, robusterer Median) und KEIN Fehler — dann ist nur ein
  struktureller Hinweis gewuenscht (Bauteil-Mix-Flag), damit spaeteres
  Auseinanderlaufen gezielt beobachtet wird. Prinzip: **Cluster folgen dem
  Verhalten, Flags folgen der Struktur.**
- `annex` in eigenem Cluster (nicht Main) mit differential-Bewertung ->
  korrekt (Ideal bei abweichendem Verhalten). `annex` demotiert/excluded
  -> suboptimal (Signal verloren), aber besser als kinematisch
  abweichend im Main verschmolzen; separat ausweisen.
- `unclear` -> nicht gewertet, aber im Report gelistet.

Kennzahlen: Precision/Recall/F1 der Fremdpunkt-Erkennung + Anzahl
verlorener roof-Punkte. Integration als Scorecard-Block ist phase8-Ticket.

## Stand der Erstbefuellung (2026-07-06, revidiert 2026-07-07)

2 Gebaeude, 20 gelabelte Punkte (6 roof, 2 annex, 8 foreign, 4 unclear) aus den
dokumentierten Referenzfaellen 96959851 (Moosstrasse, unkartiertes
Nebengebaeude; BEV-Recheck `artifacts/bev_footprint_recheck_96959851.md`)
und 96637447 (Moosstrasse, Differential-Anker mit Anti-Layover-Cores).
Quellen: `artifacts/phase7_survivors_scan_s6.{md,json}`, Visual-Audit v2,
User-Befunde 2026-06-10/11/12, P7-N5 (`next_steps.md`).

## Stand nach Korpus-Ausbau v3 (2026-07-07, N1)

10 Gebaeude, 44 gelabelte Punkte (19 roof, 2 annex, 8 foreign, 15 unclear).
+8 Gebaeude / +24 Punkte gegenueber v2. GE-Screenshots aller Verdachtsfaelle
unter `artifacts/label_evidence/ge_<building_id>.png` (GE-3D-Pflichtcheck
2026-07-07). Stratifikation bewusst um Bad Gastein / Hang / TSX erweitert
(v2 war reines Salzburg-SNT):

- **4 Roof-Gebaeude** (within+core+main-Kerne aus persistierten 2026-07-06-Runs,
  dist 0 m auf dem Dach): `105022686` (bg_flat, Zwei-Track SNT, Run f2c4a59e),
  `113309843` (Hang, TSX t70, Run 51f54484), `227901743` (Hang, SNT, Run
  f2c4a59e), `227901749` (Hang, SNT, High-N, Run f2c4a59e). Zweck:
  Roof-Retention-Referenz (v2 war foreign-lastig; k2x-Risiko ist Ueber-Demotion
  echter Dachpunkte).
- **4 Verdachts-Gebaeude als `unclear`** mit GE-3D-Pflichtcheck: `96856632`,
  `203343478`, `96637488` (salzburg_snt), `113309836` (bad_gastein_tsx_paz).
  KEINE neuen `foreign`/`annex`: kein Kandidat erreichte die Regel-2-Schwelle
  (bestaetigte Freistehend-Lage ODER Anti-Layover). Alle vier haben
  layover-konforme oder undecidable Geometrie (kein Anti-Layover); die
  versetzten nearest-Reihen (203343478 cross +8.2 m; 96637488 cross -10.2 m im
  Garten) sind definitiv off-Dach, aber die Quell-Struktur ist im dichten Block
  / Garten nicht als eigenstaendig bestaetigbar. 96856632: Villa-Layover vs.
  SW-Carport nicht aufloesbar. 113309836: Steilhang-ueber-Dach-Verdacht in GE-3D
  physikalisch bestaetigt, aber Layover-Korridor (unentscheidbar) -> Watch-Item
  bleibt `unclear`. Alle vier gehen auf die Experten-Gegenlabeling-Liste.

Ausgelassen ggue. Seed-Vorschlag: `238100070` (nur 1 within+core+main,
noise_dominated -> zu schwach als Roof-Quelle), `548205` (nicht in den
persistierten 2026-07-06-Runs vorhanden).
