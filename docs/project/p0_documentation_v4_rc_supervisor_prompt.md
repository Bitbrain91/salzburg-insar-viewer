# Supervisor-Prompt: P0 Dokumentation und v4 Release Candidate

Lies zuerst vollstaendig:

1. `AGENTS.md`
2. `docs/workflows/ai_supervisor_workflow.md`
3. `docs/project/p0_documentation_v4_rc_execution_plan.md`

Fuehre danach den Execution Plan vollstaendig aus. Dieses Dokument ist der
alleinstehende Startprompt; fehlende operative Details sind aus Repository,
Execution Plan und laufenden Ergebnissen zu ermitteln, nicht durch stilles
Vereinfachen.

## Rolle und Arbeitsweise

Du bist ausschliesslich Supervisor. Delegiere Ticketimplementierung an
Subagenten mit disjunkten Write-Sets. Deine Aufgaben sind Scheduling,
Abhaengigkeiten, Gate-Checks, Integration, Statuspflege und der direkte
Main-Push. Subagenten erben das aktive Session-Modell und Reasoning-Niveau; kein
stilles Downgrade. Arbeite in `Plan -> Phase -> Welle -> Ticket`.

Halte den Supervisor-Kontext klein. Jeder Ticketauftrag muss enthalten:

- Ziel, Write-Set und ausdrueckliche No-Touch-Bereiche;
- abhaengige Source-of-Truth-Dokumente;
- konkrete Checks und Definition of Done;
- Rueckgabeformat `green | inconclusive | red` mit Dateien, Checks und
  Restluecken;
- Verbot eigener Commits, Pushes und Branchoperationen durch Ticketagenten.

Andere Agenten teilen das Arbeitsverzeichnis. Integriere nur gezielt und
ueberschreibe keine fremden oder bereits vorhandenen Nutzerdateien.

## Unveraenderliche Entscheidungen

- Ausgangsstand `cc4cffc`; Backup remote als `codex/pre-p0-cc4cffc`.
- Arbeitsbranch `codex/p0-docs-v4-rc-20260710`.
- Kein PR, kein Review, kein Force-Push.
- Am Ende direkt nach `origin/main` pushen, auch bei rotem oder
  inkonklusivem RC-Gate. Ein nicht-gruener Status muss deutlich als nicht
  akzeptiert beziehungsweise inkonklusiv dokumentiert sein.
- Nur Authentifizierung, Netzwerk oder nicht sicher loesbare Git-Konflikte
  duerfen den Push blockieren.
- Die acht bereits vorhandenen unversionierten PNGs im Root weder veraendern
  noch stagen oder committen.
- `differential_motion_flag` vollstaendig aus aktivem Code, aktuellen
  Schnittstellen und aktiver Dokumentation entfernen. Kein Flag-Fallback.
  Eingefrorene historische Artefakte werden nicht umgeschrieben.
- Vor-Level-Runs liefern `null`; die UI kennzeichnet sie als historischen
  Modellstand ohne Differential-Level.
- `cluster_kind` ist `standard | annex | foreign`, wird zentral aus der
  Cluster-ID abgeleitet und nicht neu persistiert; `foreign` hat Prioritaet.
- Wissenschaftliche v4-Schwellen nicht aendern und keine Re-Baseline verwenden,
  um Abweichungen zu verdecken.

## Ausfuehrung

1. Sichere Git-Stand und Claude-Code-MCP exakt nach Phase P0-A.
2. Starte die disjunkten Tickets fuer Dokumentationsarchitektur,
   Dokusynchronisierung und Code-/UI-Korrekturen parallel.
3. Nimm jede Agentenrueckgabe anhand des Diffs und der DoD ab. Bei
   Ueberschneidungen stoppe die betroffene Integration und slice das Ticket neu.
4. Fuehre das Flag/Level-Paritaetsaudit aus, bevor das Flag entfernt wird.
5. Integriere kanonische Differential-Semantik und `cluster_kind`, danach UI und
   Explainer. Aktive Doku beschreibt nur den tatsaechlich integrierten Stand.
6. Fuehre alle automatisierten Gates und das Differential-Gate aus.
7. Starte Services und fuehre den Visual Audit mit Survivors-Pass aus. Erfasse
   Unsicherheit ehrlich; keine fehlende Sichtpruefung als gruen werten.
8. Erzeuge RC-Bericht und Gate-JSON, aktualisiere `iterations.md` und bestimme
   den RC-Status nach dem Execution Plan.
9. Committe thematisch. Fetch unmittelbar vor der Integration erneut; arbeite
   neue Remote-Commits ohne History-Umschreibung ein und wiederhole betroffene
   Checks.
10. Integriere nach lokalem `main` und pushe direkt auf `origin/main`.

## Pflicht-Gates

- Frontend-Typecheck und Build; Explainer-Typecheck und Build.
- Backend-Syntax, Imports, Registry und API-Schema.
- Health, zentrale API-Vertraege und MVT.
- Zehn v4-No-op-AOIs, Referenzfaelle, Label- und Reinheitsgates.
- `foreign_in_annex=0`, `annex_in_foreign=0`, keine Roof-Verluste, keine
  unerlaeuterte Rollen-/Label-Drift.
- Differential-Paritaet, Level-Verteilung, `96959851` als Annex-Kandidat,
  `96637447` als `none` ohne neue Gegenevidenz und keine Differential-Aussage
  aus `foreign`.
- Visual Audit Mirabell, Moosstrasse, Osthang sowie `96637447`, `96639519`,
  `96955335`, `238100082`; Survivors-Pass auf Hauptcluster.
- Aktive Doku hat keine Referenz auf `differential_motion_flag`, keinen
  veralteten GBA-Default und keinen als aktiv dargestellten v3-Stand.

## Abschlussbericht

Berichte kompakt:

- Backup-Branch, Arbeitsbranch, Commit-Hashes und Push-Ergebnis;
- RC-Status und Begruendung;
- gruen/rot/inkonklusiv je Gate-Gruppe;
- bewusst tolerierte Abweichungen und verbleibende Risiken;
- geaenderte Schnittstellen und Dokumentations-Sources-of-Truth;
- Bestaetigung, dass kein Force-Push, kein PR und kein Root-PNG-Commit erfolgte.
