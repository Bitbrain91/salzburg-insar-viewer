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
