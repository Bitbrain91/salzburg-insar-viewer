# Phase 7 - Visual-Audit-Workflow und erste Audits (P7-B-W2-T1)

Stand: 2026-06-10

## Workflow (reproduzierbar)

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
5. Punkt-Verifikation: API
   `GET /api/ml/runs/<run>/buildings/gba/<id>/points?area_id=<area>`
   liefert die Punkte; per Web-Mercator auf den Screenshot projizieren
   (deterministische Annotation, Skript im Report dokumentiert). Das macht
   die Beurteilung unabhaengig von Render-Groessen.
6. Label aus dem festen Labelset vergeben (siehe
   `phase7_visual_audit_cases.json`), Bewertung in 2-4 Saetzen, Eintrag in
   die JSON, Screenshots unter `artifacts/phase7_visual_*.png`.

Eskalation: Ist Frontend/Playwright blockiert, wird der betroffene Fall
`inconclusive` mit konkretem Blocker dokumentiert - niemals aus dem
Gedaechtnis gelabelt.

## Durchgefuehrte Audits (Schritt 1, Baseline)

| Fall | Gebaeude | Labels | Kernbefund |
| --- | --- | --- | --- |
| audit_548205_baseline | 548205 | plausible_main_roof_cluster, offset_expected_due_to_sar_geometry | Struktur plausibel, `single_track_only` ehrlich |
| audit_96856632_nearest_main | 96856632 | ambiguous_visual, offset_expected_due_to_sar_geometry, possible_carport_merge, needs_human_review | Main-Cluster 3/3 nearest ~9.7 m WSW; Richtung == t44-Range; Anbau-Hypothese nicht ausschliessbar; Anker fuer P7-C-W1-T5 |
| audit_105022686_bg_flat_hr | 105022686 | plausible_main_roof_cluster | Zwei-Track-Cores auf dem Dach; HR-Kopplung bestaetigt |

Details, Deep-Links und Screenshotpfade: `phase7_visual_audit_cases.json`.

## Grenzen

- Audits skalieren nicht auf alle Gebaeude; sie sind qualitative Evidence.
- Nadir-Orthofoto zeigt keine Hoehen; Hoehenfragen brauchen die
  3D-Zweitansicht oder `height_above_ground_m` (P7-C-W1-T5/A3).
- Die 12-Fall-Shortlist-Audits gehoeren zu `P7-D-W1-T3` (Schritt 6, nicht
  Teil dieser Session).
