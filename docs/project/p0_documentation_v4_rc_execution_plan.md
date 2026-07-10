# P0 Execution Plan: Dokumentation, v4-RC-Gate und Main-Sicherung

**Stand:** 2026-07-10

**Status:** abgeschlossen - v4 RC geprueft, nicht akzeptiert; direkter Main-Push freigegeben

**Autoritativ fuer:** Umfang, Reihenfolge, Gates und Abschlusskriterien des P0-Arbeitspakets

**Aktualisieren wenn:** sich Ticketumfang, Gate-Status, Integrationsweg oder bekannte Blocker aendern

**Supervisor-Prompt:** `docs/project/p0_documentation_v4_rc_supervisor_prompt.md`

## Ziel und feste Entscheidungen

Das Arbeitspaket macht den lokalen v4-Stand gesichert, technisch und fachlich
geprueft sowie fuer KI-Agenten eindeutig dokumentiert. Das zentrale
Projektergebnis ist eine validierbare Building-Intelligence-Methodik. Der Viewer
ist das interne Forschungswerkzeug zur Entwicklung und Pruefung dieser Methodik.

Fest vereinbart:

- Der unveraenderte Ausgangsstand `cc4cffc` wird remote gesichert.
- Gearbeitet wird auf `codex/p0-docs-v4-rc-20260710`.
- Es gibt keinen PR und kein Review; am Ende wird direkt nach `origin/main`
  gepusht.
- Ein rotes oder inkonklusives RC-Gate stoppt Merge und Push nicht. Der Status
  darf dann aber nicht als akzeptiert bezeichnet werden.
- `differential_motion_flag` wird aus aktivem Code, aktuellen Schnittstellen und
  aktiver Dokumentation entfernt. Historische, eingefrorene Artefakte werden
  nicht umgeschrieben.
- Die acht bereits vorhandenen unversionierten PNG-Dateien im Repository-Root
  bleiben unangetastet und werden nicht committed.
- Kein Force-Push. Nicht sicher loesbare Git-Konflikte, fehlende Berechtigung
  oder Netzwerkausfall sind technische Push-Blocker.

## Abschluss

Das P0-Arbeitspaket wurde am 2026-07-10 fachlich und technisch abgeschlossen.
Der formale Status lautet **v4 RC geprueft, nicht akzeptiert**. Der vereinbarte
Integrationsvertrag bleibt wirksam: Dieser Status blockiert den direkten Push
nach `origin/main` nicht, darf aber nirgends als akzeptierter RC bezeichnet
werden.

Autoritative Gate-Evidenz:

- [`phase8_v4_rc_gate_results.md`](../pipelines/anomaly_local_v1/artifacts/phase8_v4_rc_gate_results.md)
- [`phase8_v4_rc_gate_results.json`](../pipelines/anomaly_local_v1/artifacts/phase8_v4_rc_gate_results.json)
- [`phase8_v4_rc_visual_audit.md`](../pipelines/anomaly_local_v1/artifacts/phase8_v4_rc_visual_audit.md)
- [`phase8_v4_rc_automated_smoke.md`](../pipelines/anomaly_local_v1/artifacts/phase8_v4_rc_automated_smoke.md)

Kurzentscheidung: Smoke, No-op-Paritaet und `cluster_kind`-/Foreign-Vertrag
sind gruen. Nicht akzeptiert wurde der RC wegen des weiterhin als `candidate`
bewerteten Falls `96637447` ohne neue visuelle Evidenz sowie des absoluten
Roof-Loss-Gates fuer `NSVF80S01` in `moosstrasse_bev`. Die fachliche
Nachbearbeitung steht ausschliesslich in
[`next_steps.md`](../pipelines/anomaly_local_v1/next_steps.md).

## Plan -> Phase -> Welle -> Ticket

### Phase P0-A: Sicherer Arbeitsstand

#### Welle A1

- **P0-A-W1-T1 – Remote-Referenz pruefen:** `origin` fetchen und feststellen,
  ob `origin/main` Vorfahr des lokalen `main` ist. Abweichungen dokumentieren,
  keine History umschreiben.
- **P0-A-W1-T2 – Ausgangsstand sichern:** Remote-Backup-Branch
  `codex/pre-p0-cc4cffc` exakt auf `cc4cffc` erstellen und pushen.
- **P0-A-W1-T3 – Arbeitsbranch:** Branch
  `codex/p0-docs-v4-rc-20260710` vom lokalen `main` verwenden. Vorhandene
  unversionierte Root-PNGs bleiben ausserhalb jedes Staging-Vorgangs.
- **P0-A-W1-T4 – Claude-Code-MCP:** `.codex/config.toml` additiv um Claude Code
  mit Modell `fable`, Effort `xhigh`, Permission Mode `bypassPermissions` und
  `mcp serve` ergaenzen; bestehende MCP-Server unveraendert erhalten und
  `initialize`/`tools/list` verifizieren.

### Phase P0-B: Agententaugliche Dokumentationsstruktur

#### Welle B1

- **P0-B-W1-T1 – Living Document:**
  `docs/project/Projektziel_InSAR_Building_Intelligence.md` als autoritative
  Projektuebersicht ausbauen: Ziel, Rolle des Viewers, aktiver v4-Reifegrad,
  fachliche Aussagegrenzen, umgesetzt/intern geprueft/offen. Der Forschungsantrag
  bleibt nur knapper Ursprung; Produkttransfer ist kein aktueller Arbeitsstrang.
- **P0-B-W1-T2 – Dokumentrouting:** `docs/README.md` als Frage-zu-Quelle-Tabelle
  aufbauen. Jede Information hat genau eine aktive Source of Truth und einen
  Update-Trigger.
- **P0-B-W1-T3 – Agentenregeln:** `AGENTS.md` um Link-statt-Kopie,
  Dokumentationsimpact je Ticket, Pflichtmetadaten, Archivierung und
  Single-Source-Regeln ergaenzen.

#### Welle B2

- **P0-B-W2-T1 – Methodik:** Aktive Methodik auf BEV als Produktionsstandard,
  Salzburg und Bad Gastein, Modell v4, `annex`/`foreign`, `cluster_kind` und
  ausschliesslich `differential_motion_level` synchronisieren.
- **P0-B-W2-T2 – Statusdokumente:** Phase-8-Plan, Integrationsreport,
  `next_steps.md` und Root-README auf denselben Stand bringen. Historische
  Aussagen als historisch kennzeichnen statt sie rueckwirkend umzudeuten.
- **P0-B-W2-T3 – Drift-Gate:** Links pruefen und aktive Dokumentation nach
  veralteten Defaults, aktivem v3, veraltetem Phasenstatus und
  `differential_motion_flag` durchsuchen.

### Phase P0-C: Saubere v4-Schnittstellen und Semantik

#### Welle C1

- **P0-C-W1-T1 – Paritaetsaudit vor Entfernung:** Aktuelle v4-Baselines auf
  `flag=true/level=none`, `flag=false/level!=none` sowie fehlende Level-Daten
  pruefen und maschinenlesbar sichern.
- **P0-C-W1-T2 – Kanonische Differentialberechnung:** Signiertes Delta einmal
  berechnen, Betrag daraus ableiten und daraus `none`, `candidate`,
  `significant` oder `confirmed` bestimmen. Fremdcluster duerfen keine
  Differentialquelle sein.
- **P0-C-W1-T3 – Legacy-Entfernung:** `differential_motion_flag` aus aktivem
  Pipelinecode, Persistenzpfaden, Schemas, API/SQL/MVT, Frontend, Harness,
  Explainer und aktiver Dokumentation entfernen. Historische Runs ohne Level
  liefern `null` und werden als historischer Modellstand gekennzeichnet.

#### Welle C2

- **P0-C-W2-T1 – `cluster_kind`:** `standard | annex | foreign` an API-, MVT-
  und Frontendgrenzen bereitstellen. Ableitung zentral aus der Cluster-ID,
  Prioritaet `foreign` vor `annex`; keine neue Persistenzspalte.
- **P0-C-W2-T2 – UI-Korrekturen:** TypeScript-`null`/`undefined`-Fehler sowie
  BEV/GBA-Hinweis korrigieren. `annex` und `foreign` erhalten unterscheidbare
  Farben, Labels, Tooltips und Legende. Die UI verwendet nur das Level.
- **P0-C-W2-T3 – Explainer:** Erklaerlogik auf v4 ausrichten; Reliability-Abzug
  von `0.15` nur ab `significant`, nicht fuer einen blossen Kandidaten.

### Phase P0-D: v4-Release-Candidate-Gate

#### Welle D1 – automatisierte Gates

- Frontend: dauerhaftes `typecheck`-Script, `npm run typecheck`, Vite-Build.
- Explainer: Typecheck und Build.
- Backend: Syntax, Imports, Pipeline-Registry und API-Schemas.
- Laufzeit: PostGIS, Backend, Frontend und MLflow starten; Health-, API- und
  MVT-Vertraege pruefen.
- Harness: alle zehn gepinnten v4-AOIs gegen die eingefrorenen No-op-Baselines;
  Referenz-, Label- und Reinheitsgates mit `foreign_in_annex=0`,
  `annex_in_foreign=0`, keinen Roof-Verlusten und keiner unerlaeuterten
  Rollen-/Label-Drift.
- Differential-Gate: Level-Verteilung pruefen; `96959851` bleibt ein
  Annex-basierter Kandidat, `96637447` bleibt vorbehaltlich neuer visueller
  Evidenz `none`; kein `foreign`-Cluster ist Differentialquelle. Vor-Level-Runs
  werden gezaehlt. Keine Re-Baseline zum Verdecken von Abweichungen.

#### Welle D2 – Visual Audit

- Kontrollgebiete Mirabell, Moosstrasse und Osthang pruefen.
- Watch-Items `96637447`, `96639519`, `96955335` und `238100082` mit Main-,
  Annex-, Foreign-, Noise- und Weak-Support-Punkten pruefen.
- Survivors-Pass explizit auf Punkte anwenden, die im Hauptcluster verbleiben.
- Pro Fall Geometrie, `cluster_kind`, Differential-Level, Evidenzcluster und die
  Entscheidung `bestaetigt`, `korrigiert`, `bewusst toleriert` oder `unklar`
  dokumentieren.
- Neue Screenshots nur als `phase8_v4_rc_*` unter den Pipeline-Artefakten
  ablegen. Markdown-Bericht, Gate-JSON und `iterations.md` aktualisieren.

## Gate- und Integrationsvertrag

RC-Status:

- **v4 RC akzeptiert:** alle vereinbarten Kriterien sind erfuellt.
- **v4 RC geprueft, nicht akzeptiert:** mindestens ein Kriterium ist rot.
- **v4 RC inkonklusiv:** Daten oder Audit lassen keine abschliessende Bewertung
  zu.

Alle drei Status werden integriert und gepusht. Der Abschluss erfolgt in
thematischen Commits. Unmittelbar vor der Integration wird `origin` erneut
gefetcht. Neue Remote-Commits werden ohne History-Umschreibung eingearbeitet und
betroffene Checks wiederholt. Anschliessend wird lokal nach `main` integriert und
direkt auf `origin/main` gepusht.

## Definition of Done

- Backup-Branch ist remote vorhanden; Ausgangs- und Abschluss-Commit sind
  dokumentiert.
- Aktive Dokumentation ist eindeutig geroutet, widerspruchsfrei und frei von
  `differential_motion_flag`.
- Aktiver Code und aktuelle Schnittstellen verwenden nur
  `differential_motion_level`; `cluster_kind` ist durchgaengig sichtbar.
- Automatisierte Gates und Visual Audit sind reproduzierbar protokolliert.
- RC-Bericht nennt den nicht akzeptierten Status, beide roten Punkte und die
  MVT-Performancewarnung.
- Die fachliche Umsetzung ist abgeschlossen; Commit und direkter Push erfolgen
  im abschliessenden Supervisor-Integrationsschritt ohne Root-PNGs.
