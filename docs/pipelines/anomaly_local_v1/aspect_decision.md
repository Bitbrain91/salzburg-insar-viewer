# `anomaly_local_v1` Aspect-Entscheidung

Stand: 2026-04-25
Ticket: `P4-W2-T1`
Status: decided

## Kurzentscheidung

Entscheidung: `defer`

`Aspect` wird in `anomaly_local_v1` vorerst **nicht** als neuer Kontextvertrag, nicht als
Diagnosefeld und nicht als Toleranzlogik integriert.

Explizit fuer dieses Ticket:

- **keine Code-Aenderung**
- **keine Terrain-Map-Aenderung**
- **keine Terrain-Datenregeneration**

Der bereits vorhandene Punkt-Level-Wert `aspect_deg` bleibt unveraenderter Status quo im
allgemeinen Terrain-Kontext. Er wird durch diese Entscheidung aber **nicht** zu einem neuen
fachlichen Vertrag von `anomaly_local_v1`.

## Grundlage fuer die Entscheidung

Die Entscheidung folgt direkt aus `terrain_decision.md` und dem heutigen Repo-Vertrag:

1. `P4-W1-T1` hat festgehalten, dass der bestehende `SRTM`-Kontext fuer den unveraenderten
   `P3`/`P4`-Status quo, die slope-basierte Harness-Toleranz und die bestehende
   Terrain-/Relief-Karte reicht, aber **nicht** fuer neue Aspect- oder hoehenbasierte
   Terrain-Logik.
2. Auf Punkt-Level existiert `aspect_deg` in `insar_point_terrain`.
3. Auf Building-Level existiert aktuell **kein** Aspect-Vertrag:
   `building_terrain_context` enthaelt nur
   `terrain_elevation_mean/min/max_m`, `slope_mean_deg`, `slope_max_deg` und `relief_range_m`.
4. Die produktive Pipeline `backend/app/ml/pipelines/anomaly_local_v1.py` nutzt auf
   Building-Level nur `slope_mean_deg`, `slope_max_deg` und `relief_range_m`.
5. Der Harness `backend/app/ml/evaluation/phase2_harness.py` leitet
   `allowed_diff_mm_a = 1.0 + 0.15 * slope_mean_deg` ab; `Aspect` geht dort nicht ein.
6. Die API-/Schema-/Frontend-Vertraege spiegeln denselben Stand:
   Punkt-Aspect ist sichtbar, Building-Aspect nicht.

Damit gibt es heute keinen belastbaren Building- oder Cross-Track-Vertrag, an den eine
Aspect-Regel fachlich sauber anschliessen koennte.

## Begruendung fuer `defer`

### 1. Die Terrainbasis ist fuer neue Aspect-Logik nicht belastbar genug

`terrain_decision.md` bewertet den heutigen `SRTM`-Stack als groben `DSM`-Kontext mit lokaler
Rasterweite von rund `25.82 m`. Fuer gebaeudenahe oder hangorientierte Aspect-Logik ist das zu
grob und fachlich am falschen Modell:

- `DSM` mischt Terrain mit Daechern und Vegetation.
- Gerade in urbanen und steilen Bereichen kann `Aspect` dadurch systematisch kippen.
- Der kritische AOI `Osthang-Stressbereich` ist genau der Fall, in dem ein grobes
  `DSM`-Aspect besonders regressionsanfaellig waere.

Die W1-Entscheidung war deshalb bereits: neue Aspect-Logik erst nach Upgrade auf ein
hochaufloesendes `DTM`, bevorzugt `BEV ALS-DTM 1 m`.

### 2. Der aktuelle Datenvertrag hat keine Building-Level-Aspect-Semantik

Die heutige Datenkette liefert `Aspect` nur punktweise. Fuer `anomaly_local_v1` waere aber
mindestens eine belastbare Building- oder Cluster-Semantik noetig, weil Pipeline und Harness auf
dieser Ebene entscheiden.

Diese Semantik fehlt derzeit vollstaendig:

- keine Spalte in `building_terrain_context`
- keine Aggregation in `pipeline/prepare_terrain.py`
- keine Felder in `backend/app/schemas.py` fuer Building-Aspect
- keine Nutzung in Pipeline, Harness oder Building-Inspector

Ohne neuen Vertrag waere jede Aspect-Nutzung implizit, inkonsistent und schwer erklaerbar.

### 3. Building-Aspect ist fachlich kein triviales Mittelwert-Problem

Selbst bei besserer Terrainbasis waere `Aspect` kein Skalar wie `slope_mean_deg`.
Hangrichtung ist eine zirkulaere Groesse. Ein arithmetischer Mittelwert von z. B.
`5 deg` und `355 deg` ist fachlich falsch.

Bevor `Aspect` in `anomaly_local_v1` eingehen kann, braucht es deshalb zuerst eine explizite
Aggregationsentscheidung, z. B. ueber:

- dominante bzw. zirkulare mittlere Exposition
- Streuung / Resultantstaerke
- Anteil valider, nicht-flacher Rasterzellen

Solange diese Semantik nicht festgelegt ist, waeren Formel und Schwellwerte Scheingenauigkeit.

### 4. Es gibt derzeit keine belastbare Regel fuer Diagnose oder Toleranz

Fuer die Optionen `diagnostic_only` oder `tolerance_logic` muesste dokumentiert werden,
welche Regel mit welchen Schwellen gelten soll. Das ist heute nicht belastbar ableitbar:

- Der bestehende Cross-Track-Puffer ist explizit slope-basiert und bereits im Harness verankert.
- Es gibt im Repo keinen empirisch belegten Zusammenhang zwischen `Aspect` und einer stabilen
  Anpassung von `allowed_diff_mm_a`.
- Eine neue Aspect-Regel wuerde direkt in die sensiblen AOIs `Mirabell`, `Moosstrasse` und
  besonders `Osthang-Stressbereich` eingreifen, ohne dass dafuer eine DTM-basierte
  Verifikationsgrundlage vorliegt.
- `P3`-Nachbarschaftsdiagnosen sollen unveraendert bleiben; Aspect darf hier nichts verdeckt
  umlabeln oder falsch erklaeren.

Darum ist die konservative Default-Entscheidung aus `terrain_decision.md` hier die richtige:
`Aspect = defer`.

### 5. `context_only` wird bewusst nicht als P4-Entscheidung gezogen

`context_only` klingt auf den ersten Blick naheliegend, weil Punkt-Aspect bereits im Inspector
sichtbar ist. Fuer `P4-W2-T1` waere das aber die falsche Entscheidung:

- Der Punktwert existiert bereits als generischer Terrain-Metadatenpunkt und braucht keine neue
  `P4`-Freigabe.
- Eine explizite `anomaly_local_v1`-Kontextentscheidung auf Aspect-Basis wuerde faktisch einen
  neuen Vertrag auf Pipeline-/API-/UI-Ebene signalisieren.
- Genau dieser Vertrag ist auf der heutigen `SRTM`-Basis fachlich nicht gerechtfertigt.

Der saubere Zustand ist daher nicht `context_only`, sondern `defer`: kein neuer Aspect-Vertrag,
bis die Terrainbasis und die Aggregationssemantik stimmen.

## Konsequenz fuer `anomaly_local_v1`

Bis zu einer neuen Terrainbasis bleibt der produktive Vertrag unveraendert:

- Terrain geht weiterhin nur ueber `slope_mean_deg`, `slope_max_deg` und `relief_range_m` ein.
- Die bestehende Harness-Toleranz bleibt `allowed_diff_mm_a = 1.0 + 0.15 * slope_mean_deg`.
- Es gibt keine neue Aspect-abhaengige Diagnose, kein neues Gate und keine neue
  Reliability-/Label-Logik.
- Die bestehende Terrain-/Relief-Karte bleibt unveraendert.
- `P3`-Nachbarschaftslogik bleibt unveraendert.

Explizite Nicht-Aenderung fuer dieses Ticket:

- keine Backend-Aenderung
- keine SQL-Migration
- keine API-/Schema-Aenderung
- keine Frontend-Aenderung
- keine Regeneration von Terrain-Parquets oder Rasterdaten

## Spaeter noetiger Datenvertrag auf hoher Ebene

Falls `Aspect` spaeter erneut bewertet wird, ist vorher mindestens dieser Zielvertrag noetig:

1. **Terrain-Upgrade**
   - neue Terrainbasis auf `DTM 1 m`, bevorzugt `BEV ALS-DTM 1 m`
   - klare Dokumentation von Quelle, Aufloesung und Reproduzierbarkeit

2. **Hoehenbezugskonzept**
   - dokumentierter Bezug zwischen Punkt-`height` und Terrain-Hoehenbezug
   - auch wenn eine reine Aspect-Regel nicht direkt mit absoluten Hoehendifferenzen arbeitet,
     ist laut `terrain_decision.md` dieselbe fachliche Freigabe fuer neue Terrain-Logik noetig

3. **Building-Level-Aspect-Vertrag**
   - DTM-basierte Aggregation auf Building-Level oder in einem Nachfolgekontext
   - keine arithmetische Mittelung, sondern zirkulare Semantik
   - mindestens:
     - ein dominanter oder zirkular gemittelter Aspect-Wert
     - ein Mass fuer Streuung / Eindeutigkeit der Exposition
     - ein Guete- oder Validitaetsanteil fuer flache bzw. unklare Flaechen

4. **Erst danach Regelentscheidung**
   - erst auf dieser Basis neu entscheiden zwischen `diagnostic_only` und
     `tolerance_logic`
   - Formel und Schwellen nicht vorab festlegen

## Spaetere Verifikation, falls Aspect wieder geoeffnet wird

Bei einer spaeteren Re-Entry-Entscheidung sind mindestens noetig:

1. DTM-basierte Regeneration des Terrain-Kontexts.
2. Expliziter Vorher/Nachher-Vergleich fuer `Mirabell`, `Moosstrasse` und
   `Osthang-Stressbereich`.
3. Nachweis, dass `P3`-Referenzstatus und bestehende slope-basierte Erklaerbarkeit nicht
   regressieren.
4. Falls `tolerance_logic` erwogen wird: dokumentierter Effekt auf `allowed_diff_mm_a`,
   Building-Status und Explainability-Artefakte im Harness.

## Abschluss

Die Entscheidung fuer `P4-W2-T1` lautet `defer`.

Begruendung in einem Satz: Der heutige `SRTM`-basierte Aspect ist als punktweiser Metawert
vorhanden, aber ohne `DTM 1 m`-Upgrade, Hoehenbezugskonzept und zirkularen Building-Vertrag
nicht belastbar genug fuer eine neue `anomaly_local_v1`-Integration.
