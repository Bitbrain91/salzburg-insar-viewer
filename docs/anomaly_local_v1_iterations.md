# `anomaly_local_v1` Iterationslog

## Zweck
Kompakte Mitschrift fuer Phase 1. Pro Lauf nur die wesentliche Aenderung, die Motivation und die beobachtete Wirkung dokumentieren.

## Vorlage
| Datum | AOI | Aenderung | Warum | Metrischer Effekt | Visuelle Beobachtung |
|---|---|---|---|---|---|
| 2026-03-18 | Initial | Erste Implementierung `anomaly_local_v1` | Ersatz des globalen Modells durch lokale Gebaeude-Clusterung | offen | offen |
| 2026-03-18 | Mirabell `[13.04027,47.80375,13.04387,47.80735]` | Erster echter End-to-End-Lauf auf Live-PostGIS | Pipeline und Building-Visualisierung gegen reale Daten pruefen | `noise_points=776`, `outlier_points=953`, `median_cross_track_diff_after=0.8334` bei `1481` Punkten; zu aggressiv | Beispielgebaeude `324384` war klar ueberrauscht, viele nah am Gebaeude liegende Punkte wurden trotzdem als Noise markiert |
| 2026-03-18 | Mirabell `[13.04027,47.80375,13.04387,47.80735]` | Borderline-Noise-Reassignment in der lokalen Clusterung ergaenzt | Zu viele plausible Punkte fielen als HDBSCAN-Noise aus der Wertung | `noise_points 776 -> 470`, `outlier_points 953 -> 646`, `normal_points 412 -> 679`, `full_cross_track_points 477 -> 783`, `median_cross_track_diff_after 0.8334 -> 0.7652` | Bei Gebaeude `324384` wurde die Kernstruktur deutlich plausibler: Track 44 `10 -> 46` Core-Punkte, Track 95 `56 -> 92` Core-Punkte |
| 2026-03-18 | Mirabell + Moosstrasse | Building-Visualisierungs-API gegen echte Runs gehaertet | Die neue Gebaeudeansicht ist Phase-1-Muss; Endpunkte muessen stabil echte FeatureCollections liefern | Router-Fixes: fehlende Imports und robuste JSON-Geometrie-Normalisierung; Endpunkte `/buildings/...`, `/points`, `/context` liefern fuer Runs `7ad56274-...` und `e07b51e0-...` jeweils `200 OK` | Fuer `324384` und `96639520` sind Gebaeudepolygon, Kandidatenflaechen, Cluster-Huellen und Punktrollen (`core/noise/excluded`) separat sichtbar und auswertbar |
| 2026-03-19 | Mirabell `[13.04027,47.80375,13.04387,47.80735]` | Richtungsbuffer von Blickrichtung auf sensorseitige Ground-Range-Richtung korrigiert (`ASC -> Westen`, `DSC -> Osten`) | Layover verschiebt erhoehte Scatterer zur Sensor-/Near-Range-Seite, nicht in Blickrichtung | Neuer Run `26b45d86-...`: `cross_track_improvement -0.0623 -> -0.0052`, `assigned_points 1352 -> 1353`, `kept_points 1309 -> 1310`; gleichzeitig `normal_points 679 -> 655`, `suspect_points 156 -> 179`, `full_cross_track_points 783 -> 759` | Geometrie jetzt fachlich konsistent; bei Gebaeude `324384` verschiebt sich die ASC-Kandidatenflaeche westlich und die DSC-Flaeche oestlich. Die Punktzuordnung bleibt plausibel, der globale Metrikgewinn ist gemischt statt eindeutig |

## Hinweise
- Nur eine kompakte Zeile pro Iteration.
- Immer mit AOI referenzieren.
- Parametertuning, Feature-Aenderungen und Gate-Anpassungen getrennt dokumentieren.
- Bei visuellen Effekten immer notieren, ob Noise, Cluster oder Gebaeudezuordnung plausibler wurden.
