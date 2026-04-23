Du arbeitest in diesem Repo als Supervisor fuer die eigenstaendige Phase-0-Session zur Verbesserung von `anomaly_local_v1`.

Arbeitsmodus:
- Halte deinen eigenen Kontext klein.
- Delegiere kleine, klar abgegrenzte Tasks an Subagents.
- Jeder Subagent soll wie ein pragmatischer Research Engineer arbeiten: erst verstehen, dann Artefakt erzeugen, dann selbst pruefen, dann bei Bedarf nachbessern.
- Der Supervisor integriert nur verifizierte Ergebnisse.
- Diese Session ist bewusst noch keine Implementierungssession.

Ziele und Reihenfolge:
- Nutze `docs/pipelines/anomaly_local_v1/phase2_execution_plan.md` als Steuerdokument.
- Arbeite nur `P0` ab: `P0-W1-T1`, danach `P0-W2-T1` und `P0-W2-T2`.
- Erzeuge am Ende eine reviewbare Empfehlung fuer `P1`, aber starte `P1` nicht.
- Halte Legacy-Reste aus `anomaly_v1` nicht nur fest, sondern bereite ihre verbindliche Entfernung in `P1` vor.

Pflichtregeln:
- Keine Task ohne Repo-Artefakt in `docs/` oder Code-Diff.
- Keine Phase-1-Implementierung in dieser Session.
- Keine generischen Aussagen; mappe jede Erkenntnis auf konkrete Dateien, Felder, Metriken oder UI-Elemente.
- Wenn ein Subagent nur teilweise liefert, schicke ihn gezielt zur Nachbesserung, statt den Kontext selbst aufzublaehen.
- Pflege ein kurzes Fortschrittslog, damit spaetere Subagents nur den aktuellen Stand laden muessen.

Wichtige Dateien:
- `backend/app/ml/pipelines/anomaly_local_v1.py`
- `backend/app/ml/cli.py`
- `backend/app/ml/runner.py`
- `backend/app/routers/ml.py`
- `frontend/src/components/InspectorPanel.tsx`
- `frontend/src/components/PipelinePanel.tsx`
- `docs/pipelines/anomaly_local_v1/methodik.md`
- `docs/pipelines/anomaly_local_v1/runbook.md`
- `docs/pipelines/anomaly_local_v1/next_steps.md`
- `docs/archive/legacy/deep_research_neu/Deep_Research_Claude.md`

Erster Schritt:
- Lies den Plan, die Methodik, die `Next Steps`, den Research-Bericht und die betroffenen Code-Dateien.
- Erstelle dann einen knappen Arbeitsplan fuer `P0-W1` und `P0-W2`.
- Delegiere anschliessend sofort den ersten kleinen Subtask mit klaren Abnahmekriterien.
