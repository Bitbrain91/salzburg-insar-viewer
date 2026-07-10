# `anomaly_local_v1` Runbook

**Stand:** 2026-07-10

**Status:** aktives Runbook fuer Modellset `local_hdbscan_rulegate_v4_k2xhf_diffv2`

**Autoritativ fuer:** Ausfuehrung, Pflicht-AOIs und praktische Interpretation von Pipeline-Runs

**Aktualisieren wenn:** Start-Defaults, Pflicht-AOIs, Gates, UI-Pruefung oder aktive Ergebnissemantik aendert sich

## Zweck
Dieses Runbook beschreibt, wie `anomaly_local_v1` praktisch ausgefuehrt und interpretiert wird.

## Start
Die Pipeline wird im linken Panel gestartet: Tab `Auswertung`, Formular
`+ Neue Auswertung` (Verfahren fest `Lokale Anomalieanalyse v1`; optionales
Namensfeld, Dataset-/Track-Wahl, erweiterte Parameter einklappbar). Der Lauf
analysiert den aktuellen Kartenausschnitt und erscheint als Karte in
`Alle Auswertungen` (filterbar nach Gebiet/Sensor/Track/Status/Freitext);
Klick aktiviert ihn und oeffnet das Run-Detail im Inspector.

Jeder persistierte Run endet mit einem `ANALYZE ml_point_results`
(warn-only, Fehlschlag bricht den Run nicht ab), damit Tile- und
JSON-Abfragen fuer den neuen Run sofort frische Planer-Statistiken haben;
zusaetzlich traegt die Tabelle aggressive Autoanalyze-Reloptions
(`autovacuum_analyze_scale_factor=0.0`, `autovacuum_analyze_threshold=1000`)
als Backstop.

Empfohlene Start-Defaults:

- `source = bev`
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
- Nach Logik-Aenderungen an Assignment, Clustering, `main_cluster`, `differential_motion_level` oder Building-Score muss derselbe Stand auch auf dem `Osthang-Stressbereich` laufen.
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
- Building-Level-Score / `main_cluster` / `differential_motion_level`:
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
- getrennte Darstellung der Clusterarten `standard`, `annex` und `foreign`
- Differential-Level `none`, `candidate`, `significant` oder `confirmed`

## Building Cluster View
Im Inspector steuert die Sektion `Bewegungsmuster am Gebaeude`
(Gebaeude-Befund-Tab) die Clusteransicht:

- Kartenfokus (`Run | Gebaeude | Scoring | Cluster`)
- Track-Filter
- Icon-Toggles fuer Cluster-Huellen, gate-ausgeschlossene Punkte und Rauschen
- Sichtbarkeit je Cluster (Auge-Icon, `Nur dieses`, `Alle`, `Nur Hauptcluster`)

Interpretation:

- Track-Filter `alle`: Gesamtbild; einzelner Track: lokale Unterschiede trackweise pruefen
- Ausgeschlossene Punkte einblenden zeigt, welche Punkte schon vor der Clusterung rausgefallen sind
- Cluster-Huellen zeigen die raeumliche Gruppierung besser als reine Punktdarstellung
- Hover ueber eine Cluster-Karte hebt die zugehoerige Huelle auf der Karte hervor
- Fremdreflektor-, Noise- und ausgeschlossene Cluster stehen in der gedaempften
  Untergruppe `Nicht befundrelevant` und praegen den Gebaeudebefund nicht

### Aktuelle Punktrollen und Clusterarten in v4

- `cluster_kind=standard`: normaler Gebaeudecluster; ein belastbarer
  Standard-Core kann Main-Cluster werden.
- `cluster_kind=annex`: strukturell plausibler Anbaucluster; bleibt vom Main
  getrennt, kann bei ausreichender Stuetzung aber eine Differentialaussage
  tragen.
- `cluster_kind=foreign`: Fremdreflektor-Evidenz; nie Main-Cluster und nie
  Quelle einer Differentialaussage.
- `cluster_role` bleibt davon getrennt und beschreibt `core`, `noise`,
  `weak_support`, `excluded` oder `insufficient_support`.
- `differential_motion_level` ist `none`, `candidate`, `significant` oder
  `confirmed`. Bei Runs vor Einfuehrung des Levels liefert die API `null`; das
  bedeutet **historischer Modellstand ohne Level**, nicht `none`.

### Weiterhin relevante Punktrollen/-gruende seit v2

- `nearest`-Punkte koennen zusaetzlich zu den klassischen Gates demotiert
  sein (gate-excluded, grau). Gruende im Inspector:
  - `nearest_crosslook_outlier`: Quer-Versatz zur Blickrichtung
    ueberschreitet die selbstkalibrierte Gebaeude-x-Track-Toleranz
    (Fremdobjekt-Verdacht, vgl. Referenzfall 96959851).
  - `nearest_no_geometric_anchor`: das Gebaeude hat auf diesem Track
    keine within-/directional-Punkte; nearest allein darf keine
    Aussage tragen (Asymmetrie-Prinzip).
  - `nearest_crosslook_unknown`: Quer-Versatz nicht berechenbar.
- Small-N-Gruppen ohne Velocity-Konsistenz erscheinen als
  `weak_support` (orange in den Audit-Annotationen, Wahrscheinlichkeit
  0.30) statt eines kuenstlichen Kern-Clusters; konsistente
  2-Punkt-Cluster bleiben legitim.
- Interpretationsfolge: Status-Abstufungen gegenueber Laeufen vor
  v2_k2x (z. B. ok -> single_track_only/insufficient_support) sind in
  der Regel beabsichtigte Ehrlichkeit, kein Datenverlust. Vergleich
  Alt/Neu: Legacy-Baselines siehe `legacy_baseline_run` im
  Phase-7-Harness bzw. phase7_clustering_optimization_report.md.
- Experiment-Runs aus dem Phase-7-Harness tragen ein violettes Badge
  in "Alle Auswertungen"; ihre vollstaendige Konfiguration steht im
  Run-Detail des Inspectors unter "Konfiguration"
  (params.experiment_config).
- **Historischer v2-Befund (2026-06-12, Fall 96959851):** Die damalige
  a5-Politik prueft nur den QUER-Versatz zur Blickrichtung.
  Fremdstrukturen, die LAENGS der Blickachse liegen - insbesondere
  unkartierte Objekte, die weder in GBA noch in OSM existieren
  (z. B. Nebengebaeude/Blechdaecher) - bleiben unentdeckt und koennen
  als Cores den Motion-Score praegen. Ueberlebende Punkte ausserhalb
  des Footprints daher nie unbesehen als Dachpunkte lesen:
  Survivors-Pass (`phase7_survivors_scan.py`) + Luftbild-Pruefung,
  siehe `artifacts/phase7_visual_audit_report.md` (Workflow v2).
  v4 adressiert diesen Befund mit der getrennten Annex-/Foreign-Evidenz und
  kartierungsfreien Anti-Layover-/Reichweiten-/Hoehenprofilchecks. Der Fall
  bleibt ein verpflichtendes Gegenbeispiel im Harness.

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

- Gebaeudehoehe der im Run gespeicherten Quelle (Standard: BEV)
- Track-Filter im Inspector
- ob die meisten Punkte ueber `directional_buffer` oder nur ueber `nearest` kommen

## Forschungs-Interpretationsregel
Die Pipeline liefert keine endgueltige Wahrheit, sondern eine lokale, visuell
pruefbare Hypothese:

- Welche Punkte gehoeren wahrscheinlich zum Gebaeude
- welche davon bilden konsistente Teilgruppen
- welche Punkte sollten fuer ein spaeteres Gebaeude-Scoring eher nicht verwendet werden
