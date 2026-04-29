# Supervisor Prompt fuer die Phase-0-Session

Hinweis:
`P0` ist inzwischen vorbereitet. Fuer die naechste Umsetzungs-Session von `P1` ist jetzt `docs/pipelines/anomaly_local_v1/phase1_supervisor_prompt.md` der richtige Single-File-Entry.

Der folgende Prompt ist fuer die eigenstaendige `P0`-Session gedacht. Er ist auf den Plan in `docs/pipelines/anomaly_local_v1/phase2_execution_plan.md` abgestimmt.

## Minimaler Session-Start

Fuer eine neue Session reicht dieser Einzeiler:

`Lies docs/pipelines/anomaly_local_v1/supervisor_prompt.md und fuehre es vollstaendig aus.`

```text
Arbeite in diesem Repo als Supervisor fuer die Phase-0-Session der Weiterentwicklung von `anomaly_local_v1`.

Ziel:
Setze in dieser Session nur `P0` aus `docs/pipelines/anomaly_local_v1/phase2_execution_plan.md` autonom um.
Behandle den Plan nicht als freie Beschreibung, sondern als Scheduler-Eingabe im Modell:

`Plan -> Phase -> Welle -> Ticket`

Arbeitsmodus:

- Nutze Subagents aktiv, aber halte den Supervisor-Kontext klein.
- Delegiere situationsabhaengig; du bist nicht an feste Rollennamen gebunden.
- Starte alle delegierten Agents mit `gpt-5.5` und reasoning effort `xhigh`.
- Keine Mini-, Nano- oder sonstigen kleineren Modelle.
- Falls `gpt-5.5` nicht verfuegbar ist, stoppe und melde den Modell-Blocker; kein Fallback auf kleinere Modelle.
- Die bereits implementierte Gelaendekarte bleibt unveraendert; keine Terrain-Map-Refactors oder UI-Neuaufbauten in diesem Run.
- Verlange von jedem delegierten Agent, dass er seine Ticket-DoD selbst prueft, bei Bedarf selbst nachbessert und dann mit einem klaren Ticket-Status zurueckmeldet.
- Diese Session ist ein Analyse-/Design-Gate; sie soll Vorschlaege fuer `P1` erzeugen, aber keine Phase-1-Implementierung starten.
- Legacy-Reste aus `anomaly_v1` sollen nicht als Dauerzustand konserviert werden; `P0` muss ihren Removal-Schnitt fuer `P1` explizit festziehen.

Pflichtlektuere zu Beginn:

- `docs/pipelines/anomaly_local_v1/phase2_execution_plan.md`
- `docs/pipelines/anomaly_local_v1/next_steps.md`
- `docs/pipelines/anomaly_local_v1/methodik.md`
- `docs/pipelines/anomaly_local_v1/deep_research_report.md`
- `backend/app/ml/pipelines/anomaly_local_v1.py`
- `backend/app/routers/ml.py`
- `frontend/src/components/InspectorPanel.tsx`
- `frontend/src/components/MapView.tsx`
- `frontend/src/components/PipelinePanel.tsx`

Verbindliche Supervisor-Regeln:

1. Lies zuerst den Status des Plans und bestimme die naechste zulaessige Welle.
2. Wenn noch keine Tickets abgeschlossen sind, starte mit `P0-W1-T1`.
3. Arbeite anschliessend streng wellenweise innerhalb von `P0`.
4. Starte pro Ticket genau einen delegierten Agent in isolierter Umgebung.
5. Gib jedem Agent nur:
   - Ticket-ID
   - Ziel
   - Scope
   - DoD
   - Abhaengigkeiten
   - Write-Set
   - relevante Dateien
6. Verlange von jedem Agent am Ende:
   - Ticket-Status: `green`, `red` oder `inconclusive`
   - geaenderte Dateien
   - DoD-Evidenz
   - offene Risiken
7. Vertraue primaer auf die Ticket-Gates und die Verifikation der delegierten Agents.
8. Pruefe Rueckgaben vor allem auf Integrations-, Anschluss- und Plausibilitaetsebene.
9. Wenn ein Ticket `red` oder `inconclusive` ist, wende die Fail-Regeln aus dem Plan an.
10. Integriere nur `green`-Tickets.
11. Aktualisiere nach jeder abgeschlossenen Welle den Plan-Status.
12. Erfinde keine neue Reihenfolge, solange der Plan nicht explizit geaendert werden muss.
13. Gehe nach `P0` nicht selbststaendig in `P1`; stoppe fuer ein User-Review-Gate.

Praktischer Ablauf:

1. Plan lesen
2. naechste Welle bestimmen
3. pro Ticket der Welle einen Agent starten
4. auf Rueckgaben warten
5. Ticket-Gates lesen
6. `green` integrieren und Status fortschreiben
7. `red` oder `inconclusive` per Fail-Regel behandeln
8. naechste Welle freischalten

Startpunkt fuer diese Session:

- Beginne mit `P0-W1-T1`.
- Wenn `P0-W1-T1` gruen ist, arbeite mit `P0-W2`.
- Stoppe nach `P0`, auch wenn Phase 1 danach theoretisch freigeschaltet waere.

Erwartete Artefakte ueber die ganze Session:

- `docs/pipelines/anomaly_local_v1/phase2_research_matrix.md`
- optional `docs/pipelines/anomaly_local_v1/phase2_decision_log.md`
- aktualisierter Planstatus fuer `P0`
- knappe, reviewbare Empfehlung fuer den Start von `P1`

Ticket-DoD-Hinweis:

- Bei Research-/Design-Tickets ist `green` nicht "ich habe nachgedacht", sondern:
  - Artefakt existiert
  - Aussagen sind belegt
  - Empfehlungen sind explizit
  - Restunsicherheiten sind markiert

Abschlusskriterium:

Stoppe nicht vor Abschluss von `P0`.
Die Session endet, wenn `P0` sauber abgearbeitet ist und der User die daraus abgeleiteten Vorschlaege vor `P1` reviewen kann.
```

## Empfohlene Nutzung

1. Neue Session im Repo starten.
2. Nur dies eingeben:
   `Lies docs/pipelines/anomaly_local_v1/supervisor_prompt.md und fuehre es vollstaendig aus.`
3. Den Supervisor autonom `P0` ausarbeiten lassen.

## Erwartung an den Supervisor

Der Supervisor soll:

- den Plan als Zustandsmaschine lesen,
- die naechste Welle bestimmen,
- Tickets sauber delegieren,
- sich auf verifizierte Rueckmeldungen der delegierten Agents stuetzen,
- nur `green` integrieren,
- den Plan-Status laufend fortschreiben,
- und die Session mit einer reviewbaren Phase-0-Zwischenstufe abschliessen.
