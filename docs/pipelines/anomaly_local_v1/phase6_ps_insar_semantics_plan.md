# `anomaly_local_v1` Phase-6 PS-InSAR Semantics and Track Geometry Plan

Stand: 2026-04-28
Status: planned

## Ziel

Phase 6 verarbeitet die neue AUGMENTERRA-Rueckmeldung zur Track-Geometrie und zur
LOS-Vorzeichenkonvention. Gleichzeitig nutzt sie das TRE ALTAMIRA Handbook als
fachliche Referenz dafuer, wie die gelieferten PS-/SqueeSAR-InSAR-Punkte entstehen
und wie ihre Attribute in `anomaly_local_v1` interpretiert werden duerfen.

Der P5-Befund zur echten Satelliten-Blickrichtung wird damit nicht mehr als
`inconclusive` behandelt, sondern in einen konkreten Implementierungs- und
Evaluationsplan ueberfuehrt.

Kernfrage:

Sind unsere Annahmen ueber PS-InSAR-Punkte, Gate-Rules, Feature-Nutzung,
LOS-/Vertikalinterpretation, Reliability und Candidate-Areas fachlich konsistent mit
der neuen AUGMENTERRA-/TRE-ALTAMIRA-Quellenbasis?

Teilfrage zur Geometrie:

Soll `anomaly_local_v1` Candidate-Areas weiterhin nur grob Ost/West verschieben oder
auf einen echten 2D-Range-Vektor aus der bestaetigten Track-Geometrie umstellen?

## Ausgangsbasis

Verbindliche Basis:

- `P0` bis `P4` stehen auf `green`.
- `P5` ist als Audit abgeschlossen.
- Der alte statische Linktabellenpfad wurde nach `P5` entfernt; Punkt-Gebaeude-
  Zuordnung ist Aufgabe der dynamischen ML-Pipeline.
- Neue Track-Geometrie-Quelle:
  `docs/pipelines/anomaly_local_v1/ps_insar_semantics_decision.md`
- Neue externe Handbooks:
  - `docs/research/external/AUGMENTERRA_InSAR_Handbook_v1_3.pdf`
  - `docs/research/external/TREALTAMIRA_handbook_2.2_20180604.pdf`

Wichtig:

- `TREALTAMIRA_handbook_2.2_20180604.pdf` ist nicht nur Zusatzquelle fuer
  Track-Geometrie. Es ist die zentrale fachliche Referenz fuer die Entstehung und
  Bedeutung der PS-InSAR-Punkte und muss gegen die Pipeline-Semantik gespiegelt
  werden.

Neue AUGMENTERRA-Daten:

- `los = A` bedeutet Ascending.
- `los = D` bedeutet Descending.
- Track `44` ist Orbit Nummer `44`, Blickrichtung `81.4 deg`,
  Off-Nadir / Incidence `38.81 deg`.
- Track `95` ist Orbit Nummer `95`, Blickrichtung `281.5 deg`,
  Off-Nadir / Incidence `38.48 deg`.
- Negative `velocity` / `displacement` bedeuten LOS-Verlaengerung, also Bewegung weg
  vom Satelliten.
- Positive Werte bedeuten Bewegung hin zum Satelliten.

Aktueller Code-Stand:

- Pipeline-Candidate-Shift ist rein entlang UTM-X:
  - Track `44` / `A`: `-range_offset_m`
  - Track `95` / `D`: `+range_offset_m`
- ML-Kontext-API baut Candidate-Areas mit derselben X-only-Logik.
- UI-Kamera nutzt grobe Bearings `90` und `-90`.

## Nicht-Ziele

- Keine neue Terrain-/Aspect-Integration.
- Kein DTM-/DSM-Upgrade.
- Keine grosse Neukalibrierung von HDBSCAN, Reliability-Retuning oder
  Nachbarschaftsregeln in dieser Phase. Phase 6 darf aber dokumentierte, klar
  begrenzte Korrekturen oder Follow-up-Tickets vorschlagen, wenn die Handbooks
  fachliche Fehlannahmen in Gate-Rules, Feature-Nutzung oder Reliability zeigen.
- Keine Rueckkehr zu statischen `insar_to_gba`-/`insar_to_osm`-Linktabellen.
- Kein grossflaechiger UI-Refactor.
- Keine Datenregeneration ausser neuen ML-Live-Runs fuer die Pflicht-AOIs.

## Phasen-DoD

Phase 6 ist `green`, wenn:

- die AUGMENTERRA-Antwort und beide Handbooks fachlich ausgewertet sind,
- das TRE ALTAMIRA Handbook gegen die aktive Pipeline-Semantik gespiegelt ist,
- Gate-Rules, `vertical_proxy`, `height`, `incidence_angle`, `coherence`,
  Zeitreihenfeatures, Beschleunigung, Saisonalitaet und Reliability explizit bewertet sind,
- der Track-Geometrie-Vertrag in Doku und Code zentralisiert ist,
- Candidate-Areas in Pipeline und ML-Kontext-API entweder bewusst bei X-only bleiben
  oder konsistent auf 2D-Range-Vektor umgestellt sind,
- LOS-Vorzeichenkonvention in Methodik/API/UI dokumentiert ist,
- Mirabell, Moosstrasse und Osthang mit neuen Runs oder bewusstem Dry-Run-Vergleich
  evaluiert wurden,
- Auswirkungen auf Referenzgebaeude, Zuordnungsmetriken und UI-Candidate-Areas
  dokumentiert sind,
- `backend/.venv/bin/python -m compileall backend/app` gruen ist,
- `cd frontend && npm run build` gruen ist, falls Frontend-Dateien geaendert wurden.

## Wellen

### Welle P6-W1

#### Ticket P6-W1-T1: PS-InSAR-/SqueeSAR-Quellen- und Handbook-Auswertung

- Ziel: AUGMENTERRA-Antwort und neue PDFs gegen den bestehenden Methodik- und P5-Stand
  auswerten, mit Schwerpunkt auf der fachlichen Entstehung und Interpretation der
  PS-/SqueeSAR-InSAR-Punkte.
- Artefakt:
  - `docs/pipelines/anomaly_local_v1/phase6_ps_insar_semantics_report.md`
- Write-Set:
  - `docs/pipelines/anomaly_local_v1/phase6_ps_insar_semantics_report.md`
  - optional Aktualisierung von `ps_insar_semantics_decision.md`
- Abhaengigkeiten: keine
- DoD:
  - AUGMENTERRA-Antwort ist strukturiert zusammengefasst.
  - Das TRE ALTAMIRA Handbook ist als primaere Fachquelle fuer PS-InSAR-Punkte
    ausgewertet.
  - Relevante Handbook-Aussagen zu LOS, SqueeSAR/PSI, Displacement, Velocity,
    Trend, Beschleunigung, Saisonalitaet, Kohaerenz, `height`, `incidence_angle`,
    Blickrichtung oder Geometrie sind extrahiert oder als nicht extrahierbar
    dokumentiert.
  - Offene Unklarheiten sind benannt.
  - Keine Code-Aenderung.
- Kritischer Pfad: ja
- Status: planned

#### Ticket P6-W1-T2: Pipeline-Semantik gegen PS-InSAR-Fachquelle spiegeln

- Ziel: pruefen, ob die aktive Pipeline die gelieferten PS-InSAR-Punkte fachlich
  angemessen interpretiert.
- Artefakt:
  - Abschnitt in `phase6_ps_insar_semantics_report.md`
- Write-Set:
  - `docs/pipelines/anomaly_local_v1/phase6_ps_insar_semantics_report.md`
- Abhaengigkeiten:
  - hard: `P6-W1-T1`
- DoD:
  - Gate-Rules sind gegen die Handbook-Aussagen bewertet:
    `min_valid_epochs`, `min_valid_epoch_ratio`, `coherence`-Schwelle und
    `nearest_assignment`-Penalty.
  - `vertical_proxy = velocity / cos(incidence_angle)` ist als pragmatische
    LOS-zu-Vertikal-Naeherung bewertet, inklusive Grenzen.
  - Nutzung von `height` und `incidence_angle` fuer Candidate-Areas und Features ist
    bewertet.
  - Nutzung von `coherence`, Amplitudenfeatures, Zeitreihenfeatures, Beschleunigung
    und Saisonalitaet ist bewertet.
  - Building-Level-Reliability und Retuning-Penalties sind daraufhin bewertet, ob
    sie defensiv genug mit PS-InSAR-Unsicherheiten umgehen.
  - Ergebnis ist eine Liste: `confirmed`, `needs_adjustment`, `defer/research`.
- Kritischer Pfad: ja
- Status: planned

#### Ticket P6-W1-T3: Geometrie-Delta und Implementierungsdesign

- Ziel: genau festlegen, wie 2D-Range-Vektoren in Pipeline/API/UI eingefuehrt werden,
  ohne Semantik zu duplizieren.
- Artefakt:
  - Abschnitt in `phase6_ps_insar_semantics_report.md`
- Write-Set:
  - `docs/pipelines/anomaly_local_v1/phase6_ps_insar_semantics_report.md`
- Abhaengigkeiten:
  - hard: `P6-W1-T1`
  - hard: `P6-W1-T2`
- DoD:
  - Track-Geometriekonstanten sind als Zielvertrag definiert.
  - Sensor-/Near-Range-Richtung ist aus Blickrichtung abgeleitet.
  - Vektorformel ist dokumentiert:
    `dx = sin(bearing_rad)`, `dy = cos(bearing_rad)`.
  - Betroffene Dateien und API-Felder sind aufgelistet.
  - Entscheidung ist getroffen: `implement_2d_vector`, `dry_run_only` oder
    `defer`.
- Kritischer Pfad: ja
- Status: planned

### Welle P6-W2

#### Ticket P6-W2-T1: Backend 2D-Range-Vektor fuer Candidate-Areas

- Ziel: falls `P6-W1-T3` `implement_2d_vector` freigibt, Pipeline und Kontext-API
  konsistent auf 2D-Shift umstellen.
- Artefakt:
  - Backend-Delta
- Write-Set:
  - `backend/app/ml/pipelines/anomaly_local_v1.py`
  - `backend/app/routers/ml.py`
  - optional `backend/app/schemas.py`, falls neue Felder sichtbar werden
- Abhaengigkeiten:
  - hard: `P6-W1-T3`
- DoD:
  - Track-Geometrie wird zentral oder klar lokal konsistent definiert.
  - Pipeline-Candidate-Shift nutzt `dx * range_offset_m`, `dy * range_offset_m`.
  - ML-Kontext-API baut Candidate-Areas mit derselben Vektorlogik.
  - Persistierte/ausgegebene Metadaten enthalten bei Bedarf Look-Azimut,
    Sensor-Azimut und Shift-Komponenten.
  - `compileall backend/app` ist gruen.
- Kritischer Pfad: bedingt
- Status: planned

#### Ticket P6-W2-T2: UI-Kamera und Track-Geometrie-Anzeige

- Ziel: UI-Aussagen zu Track 44/95 an die bestaetigte Geometrie anpassen, ohne die
  Karte missverstaendlich zu drehen.
- Artefakt:
  - Frontend-Delta, falls noetig
- Write-Set:
  - `frontend/src/lib/cameraModes.ts`
  - `frontend/src/components/LayerPanel.tsx`
  - optional `frontend/src/components/MapView.tsx`
- Abhaengigkeiten:
  - hard: `P6-W1-T3`
- DoD:
  - UI unterscheidet grobe Ost-/West-Blickrichtung und genaue Winkel sauber.
  - Kamera-Bearings werden nur geaendert, wenn die MapLibre-Bearing-Semantik
    gegen Screenshots plausibilisiert wird.
  - Frontend-Build ist gruen, falls Frontend-Dateien geaendert wurden.
- Kritischer Pfad: nein
- Status: planned

#### Ticket P6-W2-T3: LOS-Vorzeichenkonvention dokumentieren und pruefen

- Ziel: sicherstellen, dass `negative = weg vom Satelliten` und
  `positive = hin zum Satelliten` in Methodik, UI und Schwellen konsistent ist.
- Artefakt:
  - Doku-/Test-/kleines Code-Delta nach Bedarf
- Write-Set:
  - `docs/pipelines/anomaly_local_v1/methodik.md`
  - optional `backend/app/routers/api.py`
  - optional Frontend-Dateien, falls UI-Hilfetexte angepasst werden
- Abhaengigkeiten:
  - hard: `P6-W1-T1`
  - hard: `P6-W1-T2`
- DoD:
  - Vorzeichenkonvention ist dokumentiert.
  - Bestehende Velocity-Thresholds `negative = subsidence`, `positive = uplift`
    sind explizit bewertet.
  - `vertical_proxy = velocity / cos(incidence_angle)` ist gegen die Konvention
    geprueft.
- Kritischer Pfad: ja
- Status: planned

### Welle P6-W3

#### Ticket P6-W3-T1: AOI-Reruns und Harness-Vergleich

- Ziel: Auswirkungen der Geometrieaenderung gegen die Pflicht-AOIs messen.
- Artefakt:
  - aktualisierte Harness-Artefakte oder separater Vergleichsbericht
  - Abschnitt in `phase6_ps_insar_semantics_report.md`
- Write-Set:
  - `docs/pipelines/anomaly_local_v1/phase6_ps_insar_semantics_report.md`
  - optional `docs/pipelines/anomaly_local_v1/artifacts/phase6_*`
  - optional `backend/app/ml/evaluation/phase2_harness.py`, falls Vergleichsfelder
    ergaenzt werden
- Abhaengigkeiten:
  - hard: `P6-W2-T1`, falls implementiert
  - hard: `P6-W2-T3`
- DoD:
  - Mirabell, Moosstrasse und Osthang wurden mit neuen Runs oder einem
    reproduzierbaren Dry-Run-Vergleich geprueft.
  - Zentrale Metriken sind alt/neu verglichen:
    `assigned_points`, `directional_buffer`, `nearest`, `kept_points`,
    `building_status_counts`, Referenzgebaeude.
  - Falls P6-W1-T2 fachliche Anpassungen nur als Follow-up empfiehlt, ist geprueft,
    ob diese Empfehlungen die aktuelle Geometrieentscheidung blockieren oder nicht.
  - Candidate-Area-Geometrien fuer mindestens ein Gebaeude pro AOI sind visuell
    oder per Bounds/Vektor dokumentiert.
  - P2R-/P3-Referenzfaelle bleiben erklaerbar oder Regressionen sind benannt.
- Kritischer Pfad: ja
- Status: planned

#### Ticket P6-W3-T2: UI- und Screenshot-Verifikation

- Ziel: falls UI oder Candidate-Area-Geometrien geaendert wurden, echte Browser-
  Verifikation durchfuehren.
- Artefakt:
  - Screenshots unter `docs/pipelines/anomaly_local_v1/artifacts/phase6_*`
  - Abschnitt in `phase6_ps_insar_semantics_report.md`
- Write-Set:
  - `docs/pipelines/anomaly_local_v1/artifacts/phase6_*`
  - `docs/pipelines/anomaly_local_v1/phase6_ps_insar_semantics_report.md`
- Abhaengigkeiten:
  - hard: `P6-W2-T1` oder `P6-W2-T2`
- DoD:
  - Frontend und Backend laufen lokal.
  - Candidate-Areas, Trackfilter und Kameramodi sind in mindestens Mirabell geprueft.
  - Screenshots belegen die neue Geometrie oder dokumentieren, warum keine UI-Aenderung
    noetig war.
- Kritischer Pfad: bedingt
- Status: planned

### Welle P6-W4

#### Ticket P6-W4-T1: Abschlussentscheidung und Planfortschreibung

- Ziel: entscheiden, ob die 2D-Geometrie produktiv bleibt und alle Folgeartefakte
  aktualisieren.
- Artefakt:
  - finaler `phase6_ps_insar_semantics_report.md`
- Write-Set:
  - `docs/pipelines/anomaly_local_v1/phase6_ps_insar_semantics_report.md`
  - `docs/pipelines/anomaly_local_v1/phase2_execution_plan.md`
  - optional `docs/pipelines/anomaly_local_v1/iterations.md`
- Abhaengigkeiten:
  - hard: `P6-W3-T1`
  - soft: `P6-W3-T2`
- DoD:
  - Entscheidung `keep_2d_vector`, `rollback_to_x_only` oder `defer_after_dry_run`
    ist explizit getroffen.
  - Geaenderte Runs, Artefakte und Restrisiken sind dokumentiert.
  - Weitere Arbeit an SqueeSAR-/Handbook-Methodik ist als eigenes Follow-up
    abgegrenzt, falls noetig.
- Kritischer Pfad: ja
- Status: planned

## Supervisor-Schnitt

Single-File-Entry fuer die naechste Supervisor-Session:

- `docs/pipelines/anomaly_local_v1/phase6_ps_insar_semantics_supervisor_prompt.md`

`P6` startet erst nach explizitem User-Gate.
