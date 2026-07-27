# Dokumentationsrouting

**Stand:** 2026-07-15

**Status:** aktive Einstiegs- und Routingseite

**Autoritativ fuer:** Ablage, Zustaendigkeit und Navigation der Repository-Dokumentation

**Aktualisieren wenn:** eine Source of Truth, Dokumentklasse oder Ablageregel hinzukommt, umbenannt oder abgeloest wird

Diese Seite ist der erste Einstieg fuer Menschen und KI-Agenten. Sie benennt
fuer jede wiederkehrende Frage genau **eine aktive Source of Truth**. Andere
Dokumente verlinken auf diese Quelle und wiederholen ihren aktuellen Inhalt
nicht.

## Frage -> autoritatives Dokument -> Update-Trigger

| Frage | Autoritatives Dokument | Aktualisieren wenn |
|---|---|---|
| Was ist das zentrale Projektergebnis, welche Rolle hat der Viewer und was ist heute fachlich aussagbar? | [`project/Projektziel_InSAR_Building_Intelligence.md`](project/Projektziel_InSAR_Building_Intelligence.md) | Zielbild, aktiver Reifegrad, Aussagegrenze oder priorisierte offene Forschung aendert sich |
| Wie funktioniert die aktive `anomaly_local_v1`-Modelllogik? | [`pipelines/anomaly_local_v1/methodik.md`](pipelines/anomaly_local_v1/methodik.md) | Features, Regeln, Cluster-/Differentialsemantik, Modell- oder Datenquellenvertrag aendert sich |
| Wie werden Runs ausgefuehrt und welche Pflicht-AOIs/Gates gelten? | [`pipelines/anomaly_local_v1/runbook.md`](pipelines/anomaly_local_v1/runbook.md) | Befehle, AOI-Katalog, Gate-Vertrag oder Betriebsablauf aendert sich |
| Welche Forschungsarbeiten sind als Naechstes offen? | [`pipelines/anomaly_local_v1/next_steps.md`](pipelines/anomaly_local_v1/next_steps.md) | ein Punkt umgesetzt, verworfen, neu priorisiert oder durch Evidenz blockiert wird |
| Was ist in Phase 8 erledigt, teilweise erledigt oder offen? | [`pipelines/anomaly_local_v1/phase8_bev_hygiene_plan.md`](pipelines/anomaly_local_v1/phase8_bev_hygiene_plan.md) | sich Ticketstatus oder Abhaengigkeit der Phase aendert |
| Welche v3/v4-Entscheidungen und Gates fuehrten zum integrierten Stand? | [`pipelines/anomaly_local_v1/artifacts/phase8_integration_report.md`](pipelines/anomaly_local_v1/artifacts/phase8_integration_report.md) | ein Integrationsnachtrag oder eine Korrektur der Evidenz erforderlich ist |
| Welche Modelliteration geschah wann und warum? | [`pipelines/anomaly_local_v1/iterations.md`](pipelines/anomaly_local_v1/iterations.md) | ein Experiment oder produktiver Modellwechsel abgeschlossen ist |
| Welche internen Referenzlabels gelten? | [`pipelines/anomaly_local_v1/reference_labels.md`](pipelines/anomaly_local_v1/reference_labels.md) | Labels, Evidenz, Version oder Einsatz im Harness aendert sich |
| Welche Auffaelligkeiten wurden beobachtet, aber noch nicht als Arbeit priorisiert oder fachlich entschieden? | [`research/observations/README.md`](research/observations/README.md) | eine Beobachtung aufgenommen, triagiert, weitergeleitet oder abgeschlossen wird |
| Wie werden Projekt- und Stakeholder-Meetings vorbereitet, dokumentiert und nachverfolgt? | [`meetings/README.md`](meetings/README.md) | ein Meeting angelegt, durchgefuehrt oder nachdokumentiert wird oder sich die Konvention aendert |
| Wie wird das Repository installiert, gestartet und technisch bedient? | [`../README.md`](../README.md) | Architektur, Datenquellen, Setup, CLI oder Laufzeitkonfiguration aendert sich |
| Wie arbeiten Supervisor und Subagenten? | [`workflows/ai_supervisor_workflow.md`](workflows/ai_supervisor_workflow.md) | der repo-weite AI-Arbeitsvertrag aendert sich |
| Wo stehen verbindliche Regeln fuer alle Repository-Agenten? | [`../AGENTS.md`](../AGENTS.md) | Coding-, Git-, Daten- oder Dokumentationsregeln aendern sich |
| Was ist Umfang und Gate-Vertrag des aktuellen P0-Pakets? | [`project/p0_documentation_v4_rc_execution_plan.md`](project/p0_documentation_v4_rc_execution_plan.md) | Umfang, Gate-Status, Integrationsweg oder Blocker aendert sich |
| Was ist Umfang, Stand und Evidenz der Stakeholder-Evaluation Cross-Track/SNT-TSX (XTV)? | [`pipelines/anomaly_local_v1/cross_track_validation_execution_plan.md`](pipelines/anomaly_local_v1/cross_track_validation_execution_plan.md) | ein XTV-Ticket abgeschlossen, verworfen oder neu geschnitten wird, sich AOIs, Fallback-Bboxen oder Gates aendern oder die Run-Registry neue Extended-Runs erhaelt |

## Dokumentklassen

- `docs/project/`: aktives Zielbild, Projektkontext und repo-weite
  Execution Plans. Der Forschungsantrag ist Ursprungsdokument, nicht operativer
  Status.
- `docs/pipelines/<pipeline>/`: aktive Methodik, Runbook, offene Arbeit,
  phasenspezifische Plaene und Supervisor-Prompts.
- `docs/pipelines/<pipeline>/artifacts/`: eingefrorene Run-, Gate-, Scorecard-
  und Audit-Evidenz. Artefakte dokumentieren ihren damaligen Stand und sind
  nicht automatisch aktuelle Methodik.
- `docs/research/`: fachliche Analysen und externe Grundlagen. Research wird
  erst durch eine dokumentierte Entscheidung Teil der aktiven Methodik.
- `docs/research/observations/`: vorgelagerte Beobachtungs- und
  Klaerungswarteschlange. Ein Eintrag dokumentiert eine Auffaelligkeit, aber
  weder eine akzeptierte Methodikaussage noch bereits priorisierte Arbeit.
- `docs/meetings/`: Meeting-Vorbereitung und -Ergebnisse. Der Plan des
  naechsten Meetings ist bis zum Termin ein lebendes Arbeitsdokument, danach
  eingefrorene Evidenz; Beschluesse werden in die gerouteten Sources of Truth
  weitergeleitet (Konvention: [`meetings/README.md`](meetings/README.md)).
- `docs/workflows/`: repo-weite Arbeitsprozesse.
- `docs/architecture/`: Systemdiagramme und Architekturentscheidungen.
- `docs/archive/`: abgeloeste narrative Dokumente, die aus
  Nachvollziehbarkeitsgruenden erhalten bleiben.

### Historische Pipeline-Dokumente

Die Dateien mit Praefix `phase1_` bis `phase7_` unter
`docs/pipelines/anomaly_local_v1/` sowie ihre zugehoerigen Supervisor-Prompts,
Verification-/Calibration-/Decision- und Harness-Berichte dokumentieren den
damaligen Modell- und Schnittstellenstand. Sie sind **eingefrorene historische
Evidenz**, auch wenn sie aus Linkstabilitaetsgruenden noch neben den aktiven
Pipeline-Dokumenten liegen. Darin vorkommende alte Feldnamen, Defaults und
Bewertungsregeln duerfen nicht als aktueller Vertrag gelesen und nicht
rueckwirkend umgeschrieben werden.

Aktive Sources of Truth in diesem Ordner sind ausschliesslich die oben
gerouteten Dokumente `methodik.md`, `runbook.md`, `next_steps.md`, der aktuelle
Phase-8-Status, `iterations.md` und `reference_labels.md`. Die aktiven Diagramme
`diagrams/pipeline.drawio` und `diagrams/pipeline_simple.drawio` folgen der
aktuellen Methodik; Dateien mit `.deprecated.drawio` sind historisch.

## Pflegevertrag fuer KI-Agenten

1. Vor einer Aenderung die Frage in der Routing-Tabelle suchen und die dort
   genannte Source of Truth lesen.
2. Aktuelle Information nur dort pflegen. In anderen Dokumenten einen Link plus
   lokalen Kontext setzen, keine zweite Status- oder Methodikbeschreibung.
3. Im Ticket den `Dokumentationsimpact` benennen. Aenderungen an Code, Schema,
   Modell, Defaults, Datenstand oder Gates muessen im selben Ticket in der
   autoritativen Doku nachvollzogen werden.
4. Zentrale aktive Dokumente tragen `Stand`, `Status`, `Autoritativ fuer` und
   `Aktualisieren wenn`; abgeloeste Dokumente zusaetzlich `Abgeloest durch`.
5. Historische Plaene, Reports, Baselines und Audit-Artefakte nicht rueckwirkend
   auf aktuelle Semantik umschreiben. Als historisch/eingefroren kennzeichnen
   oder narrative Dokumente nach `docs/archive/` verschieben.
6. Vor Abschluss Links pruefen und aktive Dokumente auf veraltete Feldnamen,
   Modellversionen, Defaults und Phasenstatus durchsuchen.

## Ablageregeln

- Pipeline-spezifische Dokumente unter `docs/pipelines/<pipeline_name>/`.
- Supervisor-Prompt direkt neben den zugehoerigen Plan; repo-weite
  P0-/Projektplaene unter `docs/project/`.
- Neue Gate-, Screenshot- und Laufartefakte unter dem zugehoerigen
  `artifacts/`-Ordner mit phasen- und versionsspezifischem Namen.
- Noch unentschiedene Forschungsbeobachtungen unter
  `docs/research/observations/`; erst nach Triage in Research, Decision Record,
  `next_steps.md` oder einen Execution Plan weiterleiten.
- Root-Dateien direkt unter `docs/` nur fuer echte Querschnittseinstiege.
- Ersetzte narrative Dokumente nicht loeschen, sondern mit Verweis auf den
  Nachfolger archivieren.
