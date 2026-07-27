# Supervisor-Prompt: Cross-Track-Validierung (A) + SNT/TSX-Overlap-Vergleich (B)

Minimaler Session-Start:

> Lies `docs/pipelines/anomaly_local_v1/cross_track_validation_supervisor_prompt.md` und fuehre es vollstaendig aus.

Dieses Dokument ist die alleinige Eintrittsstelle. Fehlende operative Details
sind aus Repository, Execution Plan und laufenden Ergebnissen zu ermitteln, nicht
durch stilles Vereinfachen.

## Pflichtlektuere (in dieser Reihenfolge)

1. [`../../../AGENTS.md`](../../../AGENTS.md)
2. [`../../README.md`](../../README.md) (Dokumentationsrouting, Single-Source)
3. [`runbook.md`](runbook.md) (Run-Ausfuehrung, Pflicht-AOIs, Gate-Vertrag)
4. [`cross_track_validation_execution_plan.md`](cross_track_validation_execution_plan.md)
   (Umfang, AOIs, Fallback-Bboxen, Statusmatrix, Gate-Vertrag — autoritativ)

Ergaenzend bei Bedarf: [`methodik.md`](methodik.md) (Vertikalproxy, Toleranz-
formel, `track_agreement_score`, SRTM-Terrain) und
[`../../workflows/ai_supervisor_workflow.md`](../../workflows/ai_supervisor_workflow.md)
(Plan/Phase/Welle/Ticket-Standard).

## Ziel der Session

Die zwei eingefrorenen, reproduzierbaren Auswertungen fuer das Stakeholder-
Meeting fertigstellen und das Meeting-Paket erzeugen:

- **Auswertung A** — Cross-Track-Konsistenz SNT ASC T44 vs. DESC T95, vertikaler
  Proxy, Terrain-Stratifikation flach/uebergang/hang.
- **Auswertung B** — SNT vs. TSX/PAZ im Overlap-Fenster 2022-10-06..2023-05-26
  (232 Tage), Track-Paare ASC 44/93 und DSC 95/70, Gates 8 Epochen / 150 Tage.
  Harte Rahmung: validiert **Sensor-Konsistenz, keine absoluten Jahresraten**.

Endpunkt: alle XTV-Tickets `green`, Freeze-Artefakte + Showcase-Screenshots +
One-Pager erzeugt, Dokumentationsimpact nachgezogen, kein Commit ohne
User-Freigabe.

## Arbeitsmodus des Supervisors

Du bist ausschliesslich Supervisor. Ticket-Implementierung wird an Subagenten mit
**disjunkten Write-Sets** delegiert; der Hauptthread macht nur Scheduling,
Ticket-Schnitt, Gate-Checks, Integration und Statuspflege. Keine stille
Ticket-Umsetzung im Hauptthread. Arbeite in `Plan -> Phase -> Welle -> Ticket`
gemaess Statusmatrix des Execution Plans. Halte den Kontext klein und verlasse
dich auf die Selbstverifikation der Subagenten.

Andere Agenten teilen das Arbeitsverzeichnis, und im Working Tree liegen bereits
umfangreiche fremde ungesicherte Aenderungen. Integriere nur gezielt und
ueberschreibe keine fremden oder bereits vorhandenen Nutzerdateien.

## Delegationsregeln

- Jeder Ticketauftrag enthaelt: Ziel, Write-Set und ausdrueckliche
  No-Touch-Bereiche, abhaengige Source-of-Truth-Dokumente, konkrete Checks und
  DoD, Rueckgabeformat `green | inconclusive | red` mit Dateien, Checks und
  Restluecken.
- Subagenten **erben** das aktive Session-Modell und Reasoning-Niveau; kein
  stilles Downgrade auf kleinere/fastere Varianten. Ist das Session-Modell fuer
  ein Ticket ungeeignet oder nicht verfuegbar, wird das als Blocker gemeldet
  statt still gewechselt.
- Tickets nur parallel vergeben, wenn die Write-Sets disjunkt sind und keine
  unerkannten harten Abhaengigkeiten bestehen.
- Ticketagenten duerfen **keine** eigenen Commits, Pushes oder Branchoperationen
  ausfuehren.
- Vor der `dataviz`-relevanten Arbeit (Charts in XTV-A-W1-T1) laedt der Subagent
  das `dataviz`-Skill.

## Empfohlene Wellenfolge

1. **Welle 1 (parallel):** XTV-A-W1-T1 (gemeinsame Module) und XTV-B-W1-T1
   (Laufzeit-Gate) — beide ohne harte Abhaengigkeit, disjunkte Write-Sets.
   XTV-0-W1-T1 (dieses Plandokument-Paar) ist bereits in Arbeit.
2. **Welle 2 (parallel, nach A-W1-T1):** XTV-A-W2-T1 (Skript A) und XTV-A-W2-T2
   (Skript B umbauen). Parallel dazu XTV-B-W2-T1 (7 Extended-Runs), sobald das
   Laufzeit-Gate `green` ist.
3. **Welle 3 (nach A-W2 + B-W2):** XTV-C-W1-T1 (A einfrieren) und XTV-C-W1-T2
   (B einfrieren) parallel.
4. **Welle 4:** XTV-D-W1-T1 (Screenshots), dann XTV-D-W2-T1 (One-Pager), dann
   XTV-D-W2-T2 (Doku-Abschluss).

Die langen Extended-Runs laufen im Hintergrund; Fortschritt wird berichtet.

## Verifikationsanforderungen

- Jedes Ticket wird gegen seine **DoD** in der Statusmatrix abgenommen; der
  Supervisor prueft Diff, Anschlussfaehigkeit und Kollisionsfreiheit mit
  bestehenden Entscheidungen.
- **Smoke-before-Freeze:** Beide Auswerteskripte laufen zuerst gegen bestehende
  Runs mit Output ins Scratchpad, nie direkt nach `artifacts/`. Erst nach
  bestandenem Smoke werden die v4-Artefakte erzeugt.
- Skript-A-Checks: Agreement-Recompute ~ gespeicherter Score, Klassen-n vs.
  direkter SQL-Count, Dedupe = 0 bei disjunkten Smoke-Runs.
- Skript-B-Checks: `n(8/150) <= n(3/30)`; das eingefrorene v2-Artefakt bleibt
  byte-identisch (`git status` sauber fuer den Pfad).
- `python -m compileall backend/app/ml/evaluation` gruen; One-Pager per `file://`
  in Playwright oeffnen, Screenshot, keine externen Requests.
- Endabnahme: Deep-Links der Showcases klickbar; >=1.500 gekoppelte Gebaeude in
  Auswertung A, Zahl je Klasse berichtet.

Bei fachlich schwacher oder unvollstaendiger Rueckgabe: nicht stillschweigend
uebernehmen, sondern gezielt zur Nachbesserung zurueckgeben und die Luecke
benennen. `inconclusive` fuehrt zu einer Supervisor-Entscheidung (Follow-up,
Annahme fixieren oder Pfad stoppen), nicht zu stiller Eigenimplementierung.

## Non-Goals

- Keine Modell-, Gate- oder Schwellenaenderung an der Pipeline; kein Re-Baseline.
- Keine Aenderung an `phase7_clustering_experiments.py::AOIS` oder an bereits
  eingefrorenen Artefakten. Das v2-Artefakt
  [`artifacts/bad_gastein_snt_tsx_motion_comparison.md`](artifacts/bad_gastein_snt_tsx_motion_comparison.md)
  bleibt byte-identisch.
- Auswertung B liefert **keine** absoluten Jahresraten (nur Sensor-Konsistenz).
- Keine der fremden ungesicherten Working-Tree-Aenderungen anfassen.

## Abschlusskriterium

- Alle XTV-Tickets sind `green` (oder ihr `inconclusive`/`red`-Ausgang ist
  dokumentiert entschieden).
- Freeze-Artefakte, Showcase-Screenshots und der One-Pager existieren; der
  One-Pager traegt die prominente Caveat-Box.
- Der Dokumentationsimpact aus dem Execution Plan ist nachgezogen
  (`next_steps.md` P1-9 teilweise adressiert, `iterations.md` zwei Zeilen,
  `docs/README.md` Routing-Zeile, Statusmatrix aktualisiert).
- **Kein Git-Commit ohne ausdrueckliche User-Freigabe.** Am Ende wird ein
  sauberer Commit-Schnitt nur fuer die XTV-Dateien angeboten; die acht
  unversionierten Root-PNGs und alle fremden Aenderungen bleiben ausserhalb jedes
  Staging-Vorgangs.
