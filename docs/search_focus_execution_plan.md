# Search Focus Execution Plan

## Ziel

Der InSAR Viewer erhaelt eine globale Suche fuer Punkt-IDs, Gebaeude-IDs,
ML-Run-IDs und Adressen. Suchtreffer sollen direkt die Karte fokussieren und,
wo moeglich, die vorhandene Auswahl- und Inspector-Logik wiederverwenden.

## Umsetzung

- Backend: `GET /api/search` liefert einheitliche Treffer mit `center`,
  optionaler `bbox`, optionaler `selection` und ML-Run-Identitaet.
- Lokale Suche: PostGIS-Tabellen `insar_points`, `gba_buildings`,
  `osm_buildings`, `ml_runs`; OSM-Adressen ueber `addr:*`-Tags.
- Externer Fallback: Nominatim nur nach expliziter Suche, serverseitig,
  mit User-Agent, Cache und 1 Request/Sekunde Throttle.
- Frontend: `SearchBox` im Karten-Overlay; Trefferliste fokussiert Karte,
  setzt `selection` oder `activeRunId` und markiert externe Adressen.

## Verifikation

- Backend-Curl-Smokes fuer Punkt, Gebaeude, Adresse und ML-Run.
- Frontend-Build mit `npm run build`.
- Browser-Smoke: Suche ausfuehren, Treffer anklicken, Karte/Inspector pruefen.
