# `anomaly_local_v1` Runbook

## Zweck
Dieses Runbook beschreibt, wie `anomaly_local_v1` praktisch ausgefuehrt und interpretiert wird.

## Start
Die Pipeline ist im linken Panel als `Anomaly Local v1 (Building Clusters)` verfuegbar.

Empfohlene Start-Defaults:

- `source = gba`
- `track = all`
- `buffer_multiplier = 1.0`
- `min_buffer_m = 3.0`
- `default_height_m = 12.0`
- `max_distance_m = 15.0`

## Empfohlene Test-AOIs
### AOI A: Mirabell
`[13.04027, 47.80375, 13.04387, 47.80735]`

Zweck:

- flacher Kontrollbereich
- guter Vergleich fuer stabile Gebaeude

### AOI B: Moosstrasse
`[13.02714, 47.79189, 13.03074, 47.79549]`

Zweck:

- fachlich relevanter Praxisbereich aus dem Meeting
- gemischte Gebaeudestrukturen

### AOI C: Osthang-Stressbereich
`[13.0492, 47.8036, 13.0528, 47.8054]`

Zweck:

- gezielter Stress-AOI mit steiler Hanglage und hohem Relief
- sinnvoll fuer Assignment-, Cluster- und Cross-Track-Stabilitaet unter schwierigerer Topografie
- kompakt genug fuer wiederholte Entwicklungslaeufe, aber deutlich haerter als Mirabell

Auswahlgrund:

- datenbasierte Auswahl vom `2026-04-22`
- `51` Gebaeude im Ausschnitt, davon `10` mit `slope_mean_deg >= 30`
- `616` InSAR-Punkte im Ausschnitt (`289` Track `44`, `327` Track `95`)
- `max_slope = 58.79`
- Explorationslauf zeigte `31` Multi-Cluster-Gebaeude und negative `cross_track_improvement`, also echten Stress fuer die Pipeline

## AOI-Teststrategie
Die Entwicklung und Verifikation soll nicht mit beliebigen Kartenausschnitten passieren, sondern mit drei festen AOIs plus gezielten Spot-Checks:

### Schleife 1: schneller Entwicklungs-Check
- Nutze immer zuerst einen der festen AOIs aus diesem Runbook.
- Bevorzuge fuer fruehe Logik- und UI-Aenderungen zunaechst `Mirabell`.
- Ziel:
  - schneller End-to-End-Lauf
  - reproduzierbare Vorher/Nachher-Vergleiche
  - minimale Supervisor-/Subagent-Kontextlast

### Schleife 2: fachlicher Gegencheck
- Nach jedem relevanten Eingriff in Assignment, Clustering, Building-Score oder Cross-Track-Logik muss derselbe Stand auch auf `Moosstrasse` geprueft werden.
- Ziel:
  - pruefen, ob die Aenderung nicht nur im flachen Kontrollbereich funktioniert
  - gemischte Gebaeudestrukturen und unruhigere lokale Situationen mitnehmen

### Schleife 3: gezielter Stress-Check
- Nach Logik-Aenderungen an Assignment, Clustering, `main_cluster`, `differential_motion_flag` oder Building-Score muss derselbe Stand auch auf dem `Osthang-Stressbereich` laufen.
- Ziel:
  - Topografie- und Relief-Stress sichtbar machen
  - echte Grenzfaelle fuer Multi-Cluster und Cross-Track-Spannungen pruefen
  - vermeiden, dass die Pipeline nur auf flacheren oder mittleren Standardfaellen gut aussieht

### Schleife 4: Ticket-spezifische Spot-Checks
- Innerhalb der festen AOIs werden gezielt repraesentative Gebaeude oder Teilbereiche betrachtet.
- Diese Spot-Checks sollen immer mindestens folgende Falltypen abdecken:
  - plausibler Standardfall
  - Multi-Cluster-Fall
  - Small-n- oder `insufficient_support`-Fall
  - Fall mit auffaellig vielen `nearest`-Assignments oder hoher Noise-Rate

## Verbindliche Regel fuer Entwicklung und Tests
- Keine groesseren Codeaenderungen nur gegen eine grosse freie Stadt-BBox entwickeln.
- Erst `Mirabell`, dann `Moosstrasse`, dann `Osthang-Stressbereich`.
- Erst wenn die fuer den Ticket-Typ relevanten AOIs plausibel bleiben, darf ein Stand als integrationsreif gelten.
- Iterationen im `docs/pipelines/anomaly_local_v1/iterations.md` immer mit expliziter AOI dokumentieren.

## Empfohlene Nutzung pro Aenderungstyp
- UI-/API-Aenderung:
  - zuerst `Mirabell`
  - danach punktueller Gegencheck in `Moosstrasse`
  - `Osthang-Stressbereich` nur dann, wenn die Darstellung cluster- oder building-level-kritische Signale betrifft
- Assignment-/Buffer-/Cluster-Logik:
  - immer `Mirabell`, `Moosstrasse` und `Osthang-Stressbereich`
  - zusaetzlich Spot-Check auf mindestens einem Gebaeude pro AOI
- Building-Level-Score / `main_cluster` / `differential_motion_flag`:
  - alle drei festen AOIs
  - dokumentierter Vorher/Nachher-Vergleich
- Evaluation / Calibration:
  - alle drei festen AOIs als Pflichtbasis
  - spaeter erweiterbar um weitere AOIs, aber nicht als Ersatz fuer diese Basis

## Was in der UI sichtbar sein soll
### Auf Gesamtkarte
- Punkte nach Clusterfarbe, Qualitaet oder Label
- Gebaeude nach aggregierten Scores

### Bei selektiertem Gebaeude
- schwarzer Gebaeudeumriss
- blaue/orange Kandidatenflaechen fuer `ASC` und `DSC`
- Cluster-Huellen
- farbige Kernpunkte
- rote Noise-Punkte
- graue Gate-ausgeschlossene Punkte

## Building Cluster View
Im Inspector gibt es fuer `anomaly_local_v1` drei Steuerungen:

- `Track filter`
- `Show gate-excluded points`
- `Show cluster hulls`

Interpretation:

- `ASC + DSC`: Gesamtbild
- `ASC only` oder `DSC only`: lokale Unterschiede trackweise pruefen
- `Show gate-excluded points`: zeigt, welche Punkte schon vor der Clusterung rausgefallen sind
- `Show cluster hulls`: zeigt die raeumliche Gruppierung besser als reine Punktdarstellung

## Woran gute Ergebnisse erkennbar sind
- Punkte eines Gebaeudes liegen ueberwiegend in 1-2 plausiblen lokalen Clustern.
- Rote Noise-Punkte liegen eher an Randbereichen oder reflektieren Nachbarstrukturen.
- Graue Gate-Punkte erklaeren sich durch niedrige Kohärenz oder schwache Zeitreihen.
- `ASC` und `DSC` liefern nach dem lokalen Filtern aehnlichere Bewegungsschaetzungen.

## Woran schlechte Ergebnisse erkennbar sind
- Fast alle Punkte eines Gebaeudes werden Noise.
- Kandidatenflaechen sind offensichtlich zu gross oder zu klein.
- Viele Punkte kommen nur ueber `nearest`.
- Die Clusterung trennt sichtbare Teilstrukturen gar nicht oder zerschneidet sie unplausibel.

## Troubleshooting
### `insufficient_support`
Bedeutung:

- Nach Gates blieben weniger als 3 Punkte uebrig.

Was pruefen:

- Track einzeln ansehen
- Gate-ausgeschlossene Punkte einblenden
- Kohaerenz und Zeitreihenabdeckung im Punkt-Inspector pruefen

### Nur ein Track vorhanden
Bedeutung:

- keine Cross-Track-Validierung moeglich

Was pruefen:

- lokale Clusterstabilitaet
- Signalqualitaet
- Assignment-Methode

### Sehr hohe Noise-Rate
Was pruefen:

- ist der Buffer zu klein
- liegt das Gebaeude in komplexer Topografie
- existieren mehrere echte Teilcluster

### Kandidatenflaeche wirkt falsch
Was pruefen:

- Gebaeudehoehe im GBA
- Track-Filter im Inspector
- ob die meisten Punkte ueber `directional_buffer` oder nur ueber `nearest` kommen

## Phase-1-Interpretationsregel
Die Pipeline liefert in Phase 1 keine endgueltige Wahrheit, sondern eine lokale, visuell pruefbare Hypothese:

- Welche Punkte gehoeren wahrscheinlich zum Gebaeude
- welche davon bilden konsistente Teilgruppen
- welche Punkte sollten fuer ein spaeteres Gebaeude-Scoring eher nicht verwendet werden
