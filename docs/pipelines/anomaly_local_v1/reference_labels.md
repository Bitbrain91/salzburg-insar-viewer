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
| `label` | `roof` \| `foreign` \| `unclear` |
| `evidence` | Kurzbegruendung + Quelle (Artefakt/Befund) |
| `labeled_by` | `team_internal` (nicht expertenvalidiert!) |
| `date` | Label-Datum |

## Label-Semantik

- **roof**: Punkt stammt mit hoher Sicherheit vom Zielgebaeude
  (Dach/Struktur des Baukoerpers). Muss score-relevant bleiben duerfen.
- **foreign**: Punkt stammt mit hoher Sicherheit von einer Fremdstruktur
  (Nachbargebaeude, Nebengebaeude, Carport) oder ist als Dachpunkt
  physikalisch unplausibel (Anti-Layover). Darf den Score nicht praegen.
- **unclear**: dokumentiert verdaechtig, aber nicht bestaetigt. Zaehlt in
  Metriken weder als Treffer noch als Fehler.

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
- `unclear` -> nicht gewertet, aber im Report gelistet.

Kennzahlen: Precision/Recall/F1 der Fremdpunkt-Erkennung + Anzahl
verlorener roof-Punkte. Integration als Scorecard-Block ist phase8-Ticket.

## Stand der Erstbefuellung (2026-07-06)

2 Gebaeude, 20 gelabelte Punkte (6 roof, 10 foreign, 4 unclear) aus den
dokumentierten Referenzfaellen 96959851 (Moosstrasse, unkartiertes
Nebengebaeude; BEV-Recheck `artifacts/bev_footprint_recheck_96959851.md`)
und 96637447 (Moosstrasse, Differential-Anker mit Anti-Layover-Cores).
Quellen: `artifacts/phase7_survivors_scan_s6.{md,json}`, Visual-Audit v2,
User-Befunde 2026-06-10/11/12, P7-N5 (`next_steps.md`).
