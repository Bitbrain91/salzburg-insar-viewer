# Research Observation Register

**Stand:** 2026-07-27

**Status:** aktive Beobachtungs- und Klaerungswarteschlange

**Autoritativ fuer:** noch nicht entschiedene oder priorisierte Auffaelligkeiten aus Datenanalyse, Viewer-Nutzung, Experimenten, Experten- und KI-Gespraechen

**Aktualisieren wenn:** eine Beobachtung aufgenommen, triagiert, weitergeleitet, erklaert, verworfen oder abgeschlossen wird

## Zweck

Dieses Register bewahrt relevante Beobachtungen, bevor entschieden ist, ob
daraus Research, eine Methodikaenderung oder konkrete Arbeit entstehen soll.
Ein Eintrag ist deshalb ausdruecklich **keine** akzeptierte fachliche Aussage,
keine Priorisierung und kein Implementierungsauftrag.

Die Dokumentklassen bleiben getrennt:

- Observation Record: Was ist aufgefallen und welche Evidenz liegt vor?
- Research-Dokument: Was ergab eine systematische Untersuchung?
- Decision Record: Welche fachliche Entscheidung wurde getroffen?
- `next_steps.md`: Welche akzeptierte Arbeit ist priorisiert?
- Execution Plan: Wie wird eine beschlossene Aenderung umgesetzt?
- `methodik.md`: Wie funktioniert der akzeptierte aktive Stand?
- Iterations-/Integrationsreport: Was wurde geaendert und wie wirkte es?

## Register

| ID | Kurzbeschreibung | Bereich | Evidenz | Status | Weiterleitung |
|---|---|---|---|---|---|
| [`OBS-2026-001`](OBS-2026-001_bev-bauwerkskomplexe.md) | BEV zerlegt einen physisch zusammenwirkenden Gebaeudekomplex in mehrere angrenzende Bauwerksobjekte | Daten / Zuordnung / Viewer | stark; vier DB-verifizierte Referenzfaelle (2026-07-22) plus Meeting-Befund 2026-07-23: keine verlaessliche Teilungslogik erkennbar | weitergeleitet | `next_steps.md` P1-11 (Gebaeudedatenfusion); Richtungsentscheidung in den Meeting-Notes 2026-07-23 |
| [`OBS-2026-002`](OBS-2026-002_bev-median-maximalhoehe-foreign.md) | Unklare Klassifikation von Punkten zwischen BEV-Median- und Maximalhoehe | Daten / Zuordnung / Foreign-Klassifikation | aktive Methodik und Code zum Beobachtungszeitpunkt; fachliche Semantik offen | offen | noch keine |

## Statusmodell

- `neu`: aufgenommen, aber noch nicht auf Reproduzierbarkeit geprueft.
- `offen`: ausreichend konkret und belegt, fachliche Einordnung oder Handlung
  aber noch unentschieden.
- `in_klaerung`: Research, Datenpruefung oder Expertenklaerung laeuft.
- `zurueckgestellt`: relevant, unter den aktuellen Voraussetzungen aber nicht
  sinnvoll klaerbar.
- `weitergeleitet`: in Research, Decision Record, `next_steps.md`, Referenzkorpus
  oder Execution Plan uebernommen; das Ziel muss verlinkt sein.
- `erklaert`: Verhalten verstanden; kein weiterer Handlungsbedarf beschlossen.
- `verworfen`: Hypothese durch Evidenz widerlegt.
- `abgeschlossen`: Entscheidung und gegebenenfalls Folgearbeit abgeschlossen.

## Aufnahmevertrag

Eine neue Beobachtung erhaelt eine stabile ID `OBS-YYYY-NNN` und eine eigene
Markdown-Datei. Mindestens festhalten:

1. Beobachtung, Kontext und Datum;
2. Datenquelle, Gebiet, Dataset, Run und Modellstand, soweit vorhanden;
3. verifizierte Fakten getrennt von Hypothesen;
4. Relevanz und offene Fragen;
5. vorhandene Evidenz;
6. Triage- und Weiterleitungsstatus.

Observation Records sind kurze, dauerhafte Problembeschreibungen und keine
detaillierten Implementierungsanalysen oder vorweggenommenen Research-Plaene.
Sie beschreiben das Problem, den notwendigen Kontext und die verbleibende
Unklarheit. Loesungsrichtungen, Metriken und konkrete Klaerungsschritte nur
aufnehmen, wenn sie bereits Gegenstand einer dokumentierten Triage sind. Bei
der spaeteren Behandlung muss die Beobachtung gegen den dann aktuellen Code-,
Daten- und Modellstand neu verifiziert werden.

Gespraechsnotizen oder Screenshots duerfen Evidenz sein, sollen aber nicht die
einzige dauerhafte Beschreibung einer relevanten Beobachtung bleiben. Neue
Evidenz kann in einem Unterordner `assets/OBS-YYYY-NNN/` abgelegt und aus dem
Eintrag verlinkt werden.

## Triage-Prozess

Die Beobachtungen werden periodisch oder vor einer neuen Forschungsphase
gesichtet. Eine Triage beantwortet:

1. Ist der Befund reproduzierbar und vom aktiven Daten-/Modellstand abgegrenzt?
2. Ist das Verhalten bereits erklaert oder braucht es weitere Evidenz?
3. Ist eine systematische Research-Aufgabe, eine fachliche Entscheidung, ein
   Referenzfall oder priorisierte Arbeit erforderlich?
4. Welches autoritative Dokument ist das Ziel der Weiterleitung?

Bei einer Weiterleitung wird nicht der gesamte Eintrag kopiert. Das Zieldokument
enthaelt eine knappe lokale Einordnung und verlinkt auf den Observation Record.
Der Ursprung bleibt als historische Evidenz erhalten.

## Pflegegrenzen

- Beobachtungen nicht stillschweigend als aktive Methodik formulieren.
- `next_steps.md` nicht durch untriagierte Hinweise aufblasen.
- Hypothesen nie als verifizierte Fakten umschreiben.
- Abgeschlossene oder verworfene Eintraege nicht loeschen; Status, Begruendung
  und Zielverweise nachtragen.
