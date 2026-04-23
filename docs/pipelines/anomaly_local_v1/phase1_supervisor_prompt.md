# Supervisor Prompt fuer die Phase-1-Session

Der folgende Prompt ist fuer die eigenstaendige `P1`-Session gedacht. Er ist auf den Plan in `docs/pipelines/anomaly_local_v1/phase2_execution_plan.md` und die Phase-0-Artefakte abgestimmt.

## Minimaler Session-Start

Fuer eine neue Session reicht dieser Einzeiler:

`Lies docs/pipelines/anomaly_local_v1/phase1_supervisor_prompt.md und fuehre es vollstaendig aus.`

```text
Arbeite in diesem Repo als Supervisor fuer die Phase-1-Session der Weiterentwicklung von `anomaly_local_v1`.

Ziel:
Setze in dieser Session nur `P1` aus `docs/pipelines/anomaly_local_v1/phase2_execution_plan.md` autonom um.
Behandle den Plan nicht als freie Beschreibung, sondern als Scheduler-Eingabe im Modell:

`Plan -> Phase -> Welle -> Ticket`

Diese Prompt-Datei ist die operative Freigabe fuer `P1`.
Wenn du diese Datei ausfuehrst, gilt das User-Review-Gate zwischen `P0` und `P1` als erfuellt.

Arbeitsmodus:

- Nutze Subagents aktiv und strikt; halte den Supervisor-Kontext klein.
- Delegiere alle Ticket-Arbeiten an Subagents.
- Der Supervisor ist Scheduler, Gatekeeper und Integrator, nicht der primaere Implementierer.
- Starte alle delegierten Agents mit `gpt-5.4` und reasoning effort `xhigh`.
- Keine Mini-, Nano- oder sonstigen kleineren Modelle.
- Die bereits implementierte Gelaendekarte bleibt unveraendert; keine Terrain-Map-Refactors oder UI-Neuaufbauten in diesem Run.
- Verlange von jedem delegierten Agent, dass er seine Ticket-DoD selbst prueft, bei Bedarf selbst nachbessert und dann mit einem klaren Ticket-Status zurueckmeldet.
- Die in `phase2_research_matrix.md` und `phase2_decision_log.md` eingefrorenen `P0`-Entscheidungen sind fuer `P1` verbindlich; fuehre keine neue Semantikdiskussion im Hauptthread.

Pflichtlektuere zu Beginn:

- `docs/pipelines/anomaly_local_v1/phase2_execution_plan.md`
- `docs/pipelines/anomaly_local_v1/phase2_research_matrix.md`
- `docs/pipelines/anomaly_local_v1/phase2_decision_log.md`
- `docs/pipelines/anomaly_local_v1/runbook.md`
- `docs/pipelines/anomaly_local_v1/methodik.md`
- `backend/app/ml/pipelines/anomaly_local_v1.py`
- `backend/app/routers/ml.py`
- `backend/app/schemas.py`
- `frontend/src/components/InspectorPanel.tsx`
- `frontend/src/components/MapView.tsx`
- `frontend/src/components/PipelinePanel.tsx`
- `frontend/src/hooks/useApi.ts`

Verbindliche Supervisor-Regeln:

1. Lies zuerst den Status des Plans und bestimme die naechste zulaessige Welle.
2. Wenn `P1` noch auf `review_gate` steht, setze es beim Start dieser Session auf `in_progress`.
3. Starte mit `P1-W1-T1`.
4. Arbeite anschliessend streng wellenweise innerhalb von `P1`.
5. Starte pro Ticket genau einen delegierten Agent in isolierter Umgebung.
6. Gib jedem Agent nur:
   - Ticket-ID
   - Ziel
   - Scope
   - DoD
   - Abhaengigkeiten
   - Write-Set
   - relevante Dateien
   - die fuer das Ticket relevanten `P0`-Entscheidungen aus `phase2_decision_log.md`
7. Verlange von jedem Agent am Ende:
   - Ticket-Status: `green`, `red` oder `inconclusive`
   - geaenderte Dateien
   - DoD-Evidenz
   - lokale Verifikation
   - offene Risiken
8. Vertraue primaer auf die Ticket-Gates und die Verifikation der delegierten Agents.
9. Pruefe Rueckgaben vor allem auf Integrations-, Anschluss- und Plausibilitaetsebene.
10. Wenn ein Ticket `red` oder `inconclusive` ist, wende die Fail-Regeln aus dem Plan an.
11. Integriere nur `green`-Tickets.
12. Loese ein `red`-Ticket nicht stillschweigend im Hauptthread selbst.
13. Wenn ein delegierter Agent operativ haengt oder ohne Write-Set-Delta zurueckkommt, zaehlt das nicht als erledigtes Ticket; erzeuge stattdessen ein Ersatz-Ticket oder wende die Fail-Regel an.
14. Hauptthread-Arbeit ist auf Folgendes begrenzt:
   - Planstatus lesen und fortschreiben
   - Agenten starten
   - Rueckgaben pruefen
   - `green` integrieren
   - Phasenabschluss dokumentieren
15. Erfinde keine neue Reihenfolge, solange der Plan nicht explizit geaendert werden muss.
16. Gehe nach `P1` nicht selbststaendig in `P2`; stoppe fuer ein neues User-Gate.

Praktischer Ablauf:

1. Plan und `P0`-Freeze lesen
2. `P1` auf `in_progress` setzen
3. `P1-W1-T1` an einen Agent delegieren
4. auf Rueckgabe warten
5. Ticket-Gate lesen
6. bei `green`: integrieren und `P1-W2` freischalten
7. in `P1-W2` zwei Agents parallel starten:
   - `P1-W2-T1`
   - `P1-W2-T2`
8. `P1-W2-T2` darf wegen soft dependency auf `P1-W2-T1` parallel starten, muss aber strikt gegen den `P0`-Datenvertrag arbeiten und etwaige Mismatches als Risiko melden
9. nach beiden `green`: `P1-W3-T1` delegieren
10. nach `P1-W3-T1`: `P1` sauber abschliessen und fuer `P2` stoppen

Startpunkt fuer diese Session:

- Beginne mit `P1-W1-T1`.
- Wenn `P1-W1-T1` gruen ist, arbeite mit `P1-W2`.
- Wenn `P1-W2-T1` und `P1-W2-T2` beide gruen sind, arbeite mit `P1-W3-T1`.
- Stoppe nach `P1`, auch wenn `P2` danach theoretisch freigeschaltet waere.

Wichtige `P0`-Entscheidungen, die in `P1` verbindlich sind:

- `main_cluster` ist pro `Gebaeude x Track` explizit zu markieren.
- `differential_motion_flag` ist Teil der V1-Zielsemantik.
- `building_motion_mm_a`, `building_reliability_score` und `building_reliability_band` sind die primaeren Building-Felder.
- `ml_point_results` bleibt fuer `P1` Source of Truth; derive-first ist der Default.
- Bestehende Diagnosefelder duerfen bleiben, aber nicht mehr die primaere lokale Gebaeude-Semantik tragen.

Erwartete Artefakte ueber die ganze Session:

- Code-Delta fuer `P1-W1-T1`
- Code-Delta fuer `P1-W2-T1`
- Code-Delta fuer `P1-W2-T2`
- Verifikationsartefakt aus `P1-W3-T1`
- aktualisierter Planstatus fuer `P1`
- knappe, reviewbare Phase-1-Abschlussnotiz mit Restrisiken

Ticket-DoD-Hinweis:

- Bei Implementierungs-Tickets ist `green` nicht "Code compiliert vielleicht", sondern:
  - geforderte Semantik ist im Write-Set umgesetzt
  - lokale Verifikation wurde ausgefuehrt
  - bekannte Restrisiken sind explizit markiert
  - das Ergebnis ist an den `P0`-Vertrag anschlussfaehig
- Reine Vorschlaege, TODO-Listen oder Hauptthread-Nacharbeit ohne Subagent-Delta sind bei Implementierungs-Tickets kein `green`.

Abschlusskriterium:

Stoppe nicht vor Abschluss von `P1`.
Die Session endet, wenn `P1` sauber abgearbeitet ist, der Planstatus fortgeschrieben wurde und `P2` nicht ohne neues User-Gate gestartet wird.
```

## Empfohlene Nutzung

1. Neue Session im Repo starten.
2. Nur dies eingeben:
   `Lies docs/pipelines/anomaly_local_v1/phase1_supervisor_prompt.md und fuehre es vollstaendig aus.`
3. Den Supervisor autonom `P1` abarbeiten lassen.

## Erwartung an den Supervisor

Der Supervisor soll:

- den Plan als Zustandsmaschine lesen,
- `P0` als eingefrorene Entscheidungsbasis behandeln,
- die naechste Welle bestimmen,
- Tickets sauber delegieren,
- sich auf verifizierte Rueckmeldungen der delegierten Agents stuetzen,
- nur `green` integrieren,
- den Plan-Status laufend fortschreiben,
- und die Session mit einer reviewbaren Phase-1-Zwischenstufe abschliessen.
