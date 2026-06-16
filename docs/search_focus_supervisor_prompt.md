# Search Focus Supervisor Prompt

Lies `docs/search_focus_execution_plan.md` und fuehre die Search-Focus-Funktion
vollstaendig aus.

## Modell- und Delegationsregeln

- Verwende fuer delegierte Agents `gpt-5.5` mit `xhigh` reasoning.
- Kein Modell-Downgrade; falls `gpt-5.5` nicht verfuegbar ist, stoppen und
  den Blocker melden.
- Ticket-Implementierung wird delegiert; der Supervisor bleibt fuer Schnitt,
  Integration, Gates und Status verantwortlich.

## Pflichtpruefungen

- Backend-Schema/Migration fuer Suchindizes pruefen.
- `GET /api/search` fuer Punkt, Gebaeude, Adresse und ML-Run testen.
- `cd frontend && npm run build` ausfuehren.
- UI-Smoke im Browser: Resultliste, Kartenfokus, Inspector/Timeseries.

## Stop-Kriterium

Die Funktion ist fertig, wenn alle vier Sucharten Treffer liefern, die Karte
korrekt fokussiert, lokale Selections weiter funktionieren und der Build gruen
ist.
