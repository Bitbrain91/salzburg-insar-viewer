# AI Supervisor Workflow

Stand: 2026-04-22

## Zweck

Dieses Repo verwendet fuer groessere oder research-lastige Arbeiten standardmaessig einen zweistufigen AI-Workflow:

1. Planungs-Session mit dem User
2. Umsetzungs-Session mit einem Supervisor und Subagents

Das Ziel ist:

- bessere Priorisierung vor der Implementierung,
- kleine, saubere Kontexte fuer die eigentliche Ausfuehrung,
- parallele Bearbeitung grosser Arbeitspakete,
- klare Verifikation und Nachbesserung statt "one-shot coding".
- einen Plan als steuerbare Zustandsmaschine fuer den Supervisor nutzbar zu machen.

## Wann dieser Workflow verwendet werden soll

Diesen Workflow bevorzugen bei:

- groesseren Features,
- mehrstufigen Refactors,
- research-lastigen Themen,
- Arbeiten ueber mehrere Module oder Schichten,
- Aufgaben mit klar teilbaren Workstreams.

Nicht noetig bei:

- kleinen Bugfixes,
- punktuellen Aenderungen in einer Datei,
- rein lokalen Anpassungen ohne relevante Architektur- oder Research-Fragen.

## Modell- und Delegationsprinzip

Es werden fuer diesen Workflow keine starren Agentenrollen fest verdrahtet.

Stattdessen gilt:

- Eine erste Session erarbeitet mit dem User den Plan.
- Eine zweite Session arbeitet mit einem Supervisor, der situationsabhaengig entscheidet, welche delegierten Agents noetig sind.
- Der Supervisor darf Analyse, Implementierung, Review oder Verifikation delegieren, ohne an feste Rollennamen gebunden zu sein.

Feste Repo-Regel fuer Supervisor-Sessions:

- Ticket-Arbeit wird an delegierte Agents vergeben.
- Der Supervisor bleibt bei Planung, Ticket-Schnitt, Reihenfolge, Gate-Pruefung, Integration, Fail-Handling und Statusfortschreibung.
- Der Supervisor soll Ticket-Implementierung nicht stillschweigend im Hauptthread selbst erledigen.
- Wenn ein Ticket `red` ist oder ein Agent operativ haengt, wird das ueber Fail-Regeln, Ersatz-Tickets oder neuen Delegationsschnitt behandelt, nicht durch stilles "Dann mache ich es schnell selbst" im Supervisor-Kontext.

Der Supervisor soll den Kontext klein halten und nur das zentralisieren, was wirklich zentralisiert werden muss:

- Priorisierung
- Schnitt der Teilaufgaben
- Koordination
- Integration
- Abschlussentscheidung

Delegierte Agents sollen ihre Arbeit moeglichst end-to-end innerhalb ihres Teilpakets erledigen:

- Analyse
- Implementierung
- eigene Verifikation
- gezielte Nachbesserung
- knappe Rueckmeldung an den Supervisor

## Modellstandard

Fuer diesen Workflow gilt als feste Repo-Vorgabe:

- alle delegierten Agents werden mit `gpt-5.5` gestartet
- reasoning effort ist `xhigh`
- keine Mini-, Nano- oder sonstigen kleineren/fasteren Varianten
- keine modellseitigen Downgrades
- falls `gpt-5.5` nicht verfuegbar ist, wird die Arbeit gestoppt und als
  Modell-Blocker gemeldet

Begruendung:

- der Workflow ist fuer groessere, research-lastige und mehrstufige Aufgaben gedacht
- der Supervisor soll sich auf hochwertige Rueckmeldungen der delegierten Agents verlassen koennen
- GPT-5.5 ist der feste Repo-Standard fuer wichtige allgemeine und code-lastige
  Agentenarbeit

## Steuerungsmodell

Fuer groessere Arbeiten verwendet dieses Repo das abstrakte Modell:

`Plan -> Phase -> Welle -> Ticket`

Die Hierarchie:

- `Plan`: strategischer Vertrag fuer Scope, Reihenfolge, Entscheidungen und Gesamt-DoD
- `Phase`: inhaltliche Einheit mit eigenem Delta und eigener Phasen-DoD
- `Welle`: Concurrency-Bucket; alles in derselben Welle darf parallel laufen
- `Ticket`: atomare Arbeitseinheit fuer einen delegierten Agent

Diese Struktur kodiert gleichzeitig:

- Zeit: `Plan -> Phase -> Welle`
- Nebenlaeufigkeit: `Welle -> Ticket`

Der Supervisor liest den Plan nicht als Fliesstext, sondern als Scheduler-Eingabe.

## Was direkt uebernommen werden kann

Das von dir beschriebene Supervisor-Modell passt grundsaetzlich sehr gut auch fuer Research-lastige Arbeit in diesem Repo.

Unveraendert uebernehmbar sind:

- die Hierarchie `Plan -> Phase -> Welle -> Ticket`
- der Supervisor als Scheduler + Merge-/Gate-Knoten
- Wellen als topologischer Schnitt durch den Dependency-Graph
- isolierte Ausfuehrung delegierter Agents
- Fail-Handling entlang des kritischen Pfads

## Was fuer Research angepasst werden muss

Die Struktur bleibt gleich, aber einige Begriffe brauchen fuer Research eine andere Auspraegung.

### 1. Ticket-DoD bleibt binaer, aber nicht nur testbasiert

Bei Research-Tickets ist die DoD oft nicht "Unit-Tests gruen", sondern:

- gefordertes Artefakt existiert
- die zentralen Aussagen sind mit Code, Daten, Dokumenten oder Quellen belegt
- Widersprueche oder Unsicherheiten sind explizit benannt
- eine klare Empfehlung oder Entscheidungsvorlage ist vorhanden
- Downstream-Auswirkungen sind genannt

Die DoD bleibt also binaer, aber der Gruen-Zustand misst Vollstaendigkeit und Nachvollziehbarkeit, nicht absolute Wahrheit.

### 2. Abhaengigkeiten muessen in `hart` und `weich` getrennt werden

In Softwareentwicklung reicht oft "parallel" oder "seriell". In Research nicht immer.

Deshalb braucht ein Ticket fuer diesen Workflow:

- `hard dependency`: ohne dieses Ergebnis darf Downstream nicht starten
- `soft dependency`: Downstream darf unter dokumentierter Annahme starten

So bleibt der Plan ausfuehrbar, ohne dass Research an jeder offenen Frage komplett serialisiert wird.

### 3. `inconclusive` ist ein eigener Ausgang

Research-Tickets scheitern nicht nur gruen/rot.

Deshalb wird fuer diesen Workflow zusaetzlich ein dritter Ausgang gebraucht:

- `green`: DoD erfuellt
- `red`: Ticket fehlgeschlagen
- `inconclusive`: Ticket sauber bearbeitet, aber Ergebnis ist nicht stark genug fuer die urspruengliche Entscheidung

`inconclusive` fuehrt nicht automatisch zu Chaos, sondern zu einer Supervisor-Entscheidung:

- Follow-up-Ticket erzeugen
- Annahme im Plan fixieren
- Pfad stoppen, wenn das Ticket auf dem kritischen Pfad liegt

### 4. Der Supervisor bleibt schlank, aber nicht blind

Auch im Research-Setup soll der Supervisor nicht jedes Detail selbst nachpruefen.

Er soll sich primaer auf Rueckmeldungen und Gates der delegierten Agents verlassen und nur pruefen:

- ist die DoD formal erfuellt
- ist das Artefakt anschlussfaehig
- kollidiert es mit bestehenden Entscheidungen
- ist ein weiterer Plan-Schritt freigeschaltet

### 5. Wellen bleiben topologisch, nicht kalendarisch

Auch fuer Research gilt:

- eine Welle ist kein Sprint
- eine Welle ist der naechste zulaessige Parallel-Schnitt

Eine Research-Welle darf also nur Tickets enthalten, deren harte Abhaengigkeiten erfuellt sind und die nicht gegenseitig voneinander abhaengen.

## Standardablauf

### Phase A: Planungs-Session

Die erste Session erzeugt einen belastbaren Plan.

Pflichtinhalte:

- Problemdefinition
- Zielbild
- Scope
- Non-Goals
- Abhaengigkeiten
- vorgeschlagene Reihenfolge
- sinnvolle Buendelung von Themen
- Verifikationsstrategie

Pflichtartefakte:

1. `docs/<topic>_execution_plan.md`
2. `docs/<topic>_supervisor_prompt.md`

Optional:

- `docs/<topic>_decision_log.md`
- `docs/<topic>_research_matrix.md`

## Single-File Entry Standard

Fuer Supervisor-Sessions gilt in diesem Repo zusaetzlich:

- Das `*_supervisor_prompt.md` ist die alleinige Eintrittsstelle fuer die neue Session.
- Der User soll im Normalfall nur noch sinngemaess schreiben muessen:
  - `Lies docs/<...>_supervisor_prompt.md und fuehre es vollstaendig aus.`
- Alles Operative muss im Dokument selbst enthalten sein:
  - Ziel der Session
  - Scope
  - Pflichtdateien
  - Startpunkt
  - Stop-Kriterium
  - Modellvorgaben
  - Delegationsregeln
  - erwartete Artefakte
  - Non-Goals

Konsequenz:

- kein zusaetzlicher Meta-Prompt soll noetig sein
- kein zweites Startdokument soll noetig sein
- ein separates `*_supervisor_startprompt.md` ist hoechstens eine Komfortkopie fuer Menschen, aber nicht notwendig fuer die Ausfuehrung
- wenn `*_supervisor_prompt.md` ohne Zusatzprompt nicht ausfuehrbar ist, ist das Dokument unvollstaendig

### Phase B: Supervisor-Session

Die zweite Session setzt den Plan operativ um.

Pflichtschritte:

1. relevante Plan-Dateien lesen
2. kurze lokale Synthese schreiben
3. Phasen, Wellen und Tickets als operativen Graph lesen
4. naechste zulaessige Welle bestimmen
5. pro Ticket einen delegierten Agent in isolierter Umgebung starten
6. Rueckgaben und Ticket-Gates pruefen
7. bei `green`: integrieren und Status fortschreiben
8. bei `red` oder `inconclusive`: Fail-Regel anwenden
9. naechste Welle freischalten oder Phase abschliessen
10. Ergebnis und Restrisiken dokumentieren

Zusaetzliche Dauerregel:

- In der Supervisor-Session ist der Hauptthread nicht der primaere Ort fuer Ticket-Implementierung.
- Wenn Code-, Doku- oder Analysearbeit als Ticket definiert ist, soll diese Arbeit von delegierten Agents im zugewiesenen Write-Set erledigt werden.
- Hauptthread-Arbeit bleibt auf Scheduler-, Gate-, Integrations- und Abschlussaufgaben beschraenkt, ausser der Plan oder der User definiert explizit eine andere Ausnahme.

## Standardstruktur fuer den Execution Plan

Ein `*_execution_plan.md` sollte mindestens diese Abschnitte enthalten:

1. Ziel
2. Ausgangslage
3. Leitprinzipien
4. Scope / Nicht in Scope
5. Entscheidungen
6. Phasen
7. Wellen pro Phase
8. Tickets pro Welle
9. Abhaengigkeiten
10. Fail-Regeln
11. Status
12. Verifikation / Exit-Kriterien

Jedes Ticket sollte moeglichst diese Felder haben:

- Ziel
- Scope
- Artefakt
- DoD
- Abhaengigkeiten (`hard` / `soft`)
- Write-Set
- Status

## Standardstruktur fuer Tickets

Ein Ticket ist in diesem Workflow die atomare delegierbare Einheit.

Ein gutes Ticket:

- passt in eine Session
- hat einen abgeschlossenen Scope
- hat eine binaere DoD
- deklariert ehrliche Abhaengigkeiten
- hat ein moeglichst klares Write-Set
- erzeugt genau ein anschlussfaehiges Artefakt oder Delta

## Standardstruktur fuer den Supervisor Prompt

Ein `*_supervisor_prompt.md` sollte mindestens enthalten:

1. klares Ziel der Session
2. Pflichtlektuere
3. Arbeitsmodus des Supervisors
4. Regeln fuer Delegation
5. erste empfohlene Subagent-Delegationen
6. Verifikationsanforderungen
7. Abschlusskriterium
8. eine Zeile fuer den minimalen Session-Start

## Regeln fuer Task-Schnitt und Delegation

### Allgemein

- Der Supervisor behaelt Synthese, Priorisierung und Integration.
- Teilaufgaben muessen klein, klar und material sein.
- Tasks nur dann parallel vergeben, wenn die Write-Sets disjunkt sind.
- Nicht dieselbe offene Frage gleichzeitig an mehrere delegierte Agents vergeben.
- Delegierte Agents sollen ihre Teilaufgabe moeglichst selbst verifizieren und bei Bedarf selbst nachjustieren, bevor sie an den Supervisor zurueckmelden.
- Tickets einer Welle duerfen keine unerkannten harten Abhaengigkeiten untereinander haben.

### Datei- und Modulbesitz

Bevorzugte Schnittlogik:

- Backend pipeline/logik
- Backend API/schema/sql
- Frontend UI/state/hooks
- Research/evaluation/verification

### Nachbesserung

Wenn eine Rueckgabe fachlich schwach oder unvollstaendig ist:

- nicht stillschweigend uebernehmen,
- gezielt zur Nachbesserung zurueckgeben,
- die Luecke explizit benennen.

## Verifikation als Pflichtteil

Jede groessere Supervisor-Session soll am Ende nicht nur Aenderungen, sondern auch Verifikation liefern.

Wichtig:

- Die ausfuehrliche technische Verifikation soll primaer in den delegierten Agents stattfinden.
- Der Supervisor soll auf diese Rueckmeldungen aufbauen koennen, statt jede Detailpruefung selbst erneut durchzufuehren.
- Der Supervisor macht am Ende vor allem Plausibilisierung, Integrationspruefung und Abschlussbewertung.

## Fail-Regeln

Fail-Handling wird als Graph-Operation verstanden.

Wenn ein Ticket `red` oder `inconclusive` wird:

- Blatt-Ticket ohne Downstream:
  markieren, dokumentieren, Phase weiterlaufen lassen, spaeter sammeln

- Ticket auf kritischem Pfad:
  Supervisor stoppt oder erzeugt bewusst ein neues Ersatz-/Entscheidungsticket

- Ticket mit nur weichen Downstream-Abhaengigkeiten:
  Supervisor kann mit dokumentierter Annahme weiterfahren, muss das aber im Plan festhalten

Mindestens:

- welche Aenderungen gemacht wurden
- welche Checks gelaufen sind
- welche Bereiche nur smoke-getestet wurden
- welche Risiken offen bleiben

Wenn moeglich:

- Vorher/Nachher-Vergleich
- repraesentative Beispielobjekte oder AOIs
- API- oder UI-Sichtpruefung

## Dateinamenskonvention

Fuer neue groessere Themen bevorzugt:

- `docs/<topic>_execution_plan.md`
- `docs/<topic>_supervisor_prompt.md`

Beispiel:

- `docs/pipelines/anomaly_local_v1/phase2_execution_plan.md`
- `docs/pipelines/anomaly_local_v1/supervisor_prompt.md`

`<topic>` sollte kurz, stabil und repo-spezifisch sein.

## Repo-Regel

Fuer kuenftige groessere Arbeiten ist dieses Vorgehen der bevorzugte Standard:

`Planungs-Session -> Plan als Plan/Phase/Welle/Ticket im Repo -> neue Supervisor-Session -> Wellenweise Delegation -> Integration -> Verifikation`

Wenn der User ausdruecklich dieses Vorgehen wuenscht, soll der Agent es aktiv anwenden statt direkt in eine grosse Einzel-Session zu kippen.
