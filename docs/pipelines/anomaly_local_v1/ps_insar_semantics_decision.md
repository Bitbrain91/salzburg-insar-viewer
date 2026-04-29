# `anomaly_local_v1` PS-InSAR-Semantik- und Track-Geometrie-Entscheidung

Stand: 2026-04-28
Status: decided from AUGMENTERRA response; implementation follow-up required

## Zweck

Dieses Dokument ersetzt den `P5-W2-T2`-Status `inconclusive` fuer die echte
Track-/LOS-/Blickrichtungssemantik durch eine auditierbare Projektentscheidung auf
Basis der AUGMENTERRA-Rueckmeldung vom 2026-04-28.

Die Entscheidung betrifft:

- Track-Identifikation
- Ascending-/Descending-Semantik
- Radar-Blickrichtung bzw. Range-Richtung
- Einfallswinkel / Off-Nadir-Winkel
- Vorzeichenkonvention von `velocity` und `displacement`
- Konsequenzen fuer Candidate-Areas, UI-Kameramodi und Dokumentation

## Quelle

Primaere Projektquelle:

- AUGMENTERRA-Antwort auf Monday vom 2026-04-28, vom User in dieser Codex-Session
  bereitgestellt.

Neue externe Referenzdateien im Repo:

- `docs/research/external/AUGMENTERRA_InSAR_Handbook_v1_3.pdf`
- `docs/research/external/TREALTAMIRA_handbook_2.2_20180604.pdf`

Hinweis: Die PDFs sind als fachliche Folgequelle vorhanden. Diese Entscheidung basiert
zunaechst auf der konkreten AUGMENTERRA-Antwort. Die naechste Supervisor-Session soll
die beiden Handbooks separat auswerten. Das TRE ALTAMIRA Handbook ist dabei besonders
wichtig, weil es erklaert, wie PS-InSAR/SqueeSAR-Punkte entstehen und wie Attribute
wie `velocity`, `displacement`, `coherence`, `height`, `incidence_angle`,
Beschleunigung und Saisonalitaet fachlich interpretiert werden duerfen.

## Verbindliche Track-Geometrie

| Track | Datenfeld | Bedeutung | Blickrichtung | Off-Nadir / Incidence |
| ---: | --- | --- | ---: | ---: |
| `44` | `los = A` | Ascending; Sentinel-1 Orbit Nummer `44` | `81.4 deg` | `38.81 deg` |
| `95` | `los = D` | Descending; Sentinel-1 Orbit Nummer `95` | `281.5 deg` | `38.48 deg` |

Interpretation fuer dieses Repo:

- Die genannten Blickrichtungen sind als horizontale Radar-Blickrichtung bzw.
  Range-Richtung in Grad zu behandeln.
- `81.4 deg` ist nahezu ostwaerts.
- `281.5 deg` ist nahezu westwaerts.
- Die aktuelle UI-Aussage `Track 44 -> Blick nach Osten` und
  `Track 95 -> Blick nach Westen` ist damit fachlich bestaetigt, aber nur grob.

## Sensor-/Near-Range-Seite

Die Candidate-Area fuer erhoehte Scatterer soll zur Sensor-/Near-Range-Seite
erweitert werden, also gegen die Blickrichtung.

Aus der AUGMENTERRA-Blickrichtung folgt fuer den sensorseitigen Ground-Range-Vektor:

| Track | Blickrichtung | Sensor-/Near-Range-Richtung | Einheitsvektor `dx, dy` in metrischem CRS |
| ---: | ---: | ---: | --- |
| `44` | `81.4 deg` | `261.4 deg` | `dx=-0.9888`, `dy=-0.1495` |
| `95` | `281.5 deg` | `101.5 deg` | `dx=0.9799`, `dy=-0.1994` |

Konvention fuer die Vektoren:

- Winkel sind Bearings in Grad, im Uhrzeigersinn von Norden.
- Fuer metrische Koordinaten gilt:
  - `dx = sin(bearing_rad)`
  - `dy = cos(bearing_rad)`
- Der aktuelle Code nutzt nur `dx = -1/+1`, `dy = 0`.

Konsequenz:

- Die bestehende Ost-/West-Implementierung ist als erste Naeherung plausibel.
- Sie ignoriert aber eine suedliche Komponente von ca. `15%` bei Track `44` und
  ca. `20%` bei Track `95`.
- Bei einem `range_offset_m` von `30 m` entspricht das etwa `4.5 m` bzw. `6.0 m`
  Nord-/Sued-Abweichung.
- Eine Folgephase soll deshalb pruefen, ob `ST_Translate(..., dx * offset, dy * offset)`
  die Punkt-Gebaeude-Zuordnung verbessert oder relevante Regressionen erzeugt.

## LOS-Vorzeichenkonvention

AUGMENTERRA bestaetigt:

- negative Werte entsprechen einer Verlaengerung der LOS, also Bewegung weg vom
  Satelliten
- positive Werte entsprechen Bewegung hin zum Satelliten

Konsequenz fuer das Repo:

- Die bestehende UI-/API-Semantik `negative Werte = Setzung/Subsidence`,
  `positive Werte = Hebung/Uplift` ist fuer die uebliche vertikale Interpretation
  plausibel.
- Die bestehende Formel `vertical_proxy = velocity / cos(incidence_angle)` erhaelt
  das Vorzeichen. Sie muss nicht automatisch geaendert werden, soll aber in Phase 6
  explizit gegen die Vorzeichenkonvention dokumentiert und getestet werden.

## Betroffene aktuelle Stellen

Backend:

- `backend/app/ml/pipelines/anomaly_local_v1.py`
  - aktueller Candidate-Shift:
    `ST_Translate(b.geom_utm, b.shift_sign * b.range_offset_m, 0.0)`
  - aktuelle Signatur:
    `track 44 / los A -> -x`, sonst `+x`
- `backend/app/routers/ml.py`
  - Visualisierungskontext baut Candidate-Areas ebenfalls mit reinem X-Shift:
    `CASE WHEN track = 44 THEN -range_offset_m ELSE range_offset_m END`
- `backend/app/routers/api.py`
  - Track-Konfiguration `44/A`, `95/D`

Frontend:

- `frontend/src/lib/cameraModes.ts`
  - aktuelle Kamera-Bearings `90` und `-90`
  - koennen auf `81.4` und `281.5` evaluiert werden, falls MapLibre-Bearing-Semantik
    im Kontext der gewuenschten Ansicht sauber bestaetigt ist
- `frontend/src/components/LayerPanel.tsx`
  - Hilfetext zu Ost-/West-Blickrichtung

Dokumentation:

- `docs/pipelines/anomaly_local_v1/methodik.md`
- `docs/pipelines/anomaly_local_v1/phase5_data_correctness_report.md`
- `docs/pipelines/anomaly_local_v1/artifacts/phase5_P5-W2-T2.md`
- `docs/pipelines/anomaly_local_v1/artifacts/phase5_P5-W3-T1.md`

## Folgeentscheidung

Die naechste sinnvolle Phase ist
`P6: PS-InSAR Semantics and Track Geometry Evaluation`.

Ziel:

- erst Quellenabgleich mit Handbooks, inklusive PS-InSAR-Punktsemantik
- dann Pipeline-Annahmen zu Gate-Rules, Features, `vertical_proxy`, `height`,
  `incidence_angle`, `coherence`, Zeitreihenfeatures und Reliability bewerten
- dann minimaler 2D-Range-Vektor im Backend und ML-Kontext
- dann AOI-Reruns gegen Mirabell, Moosstrasse und Osthang
- danach Entscheidung, ob der 2D-Vektor produktiv bleibt oder die Ost-/West-Naeherung
  fuer V1 ausreichend ist

Kein Sofortschluss:

- Die neue Geometrie soll nicht still direkt in die Pipeline gemerged werden, ohne
  Referenz-AOI-Vergleich.
- Die Auswirkungen auf Punktzuordnung, `building_status`, Reliability,
  Nachbarschaftsdiagnostik und UI-Candidate-Areas muessen gemessen werden.
