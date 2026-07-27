# Meetings: Vorbereitung, Durchfuehrung und Nachdokumentation

**Stand:** 2026-07-27

**Status:** aktive Einstiegs- und Indexseite

**Autoritativ fuer:** Konvention, Lebenszyklus und Index der Projekt- und Stakeholder-Meetings (insbesondere das monatliche AUGMENTERRA-Jour-fixe)

**Aktualisieren wenn:** ein Meeting angelegt, durchgefuehrt oder nachdokumentiert wird oder sich die Konvention aendert

## Zweck

`docs/meetings/` ist der eine Ort fuer Meeting-Vorbereitung und
Meeting-Ergebnisse. Themen, die zwischen zwei Meetings anfallen, werden hier
im jeweils naechsten Plan-Dokument gesammelt statt in losen Notizen. Nach dem
Meeting werden Beschluesse in die gerouteten Sources of Truth weitergeleitet;
die Meeting-Dokumente selbst frieren als Evidenz ein.

## Dateikonvention

Pro Meeting entsteht ein Dokumentenpaar:

- `YYYY-MM-DD_<thema>_meeting_plan.md` — Vorbereitung und Agenda
- `YYYY-MM-DD_<thema>_meeting_notes.md` — Ergebnisse und Weiterleitung

Fuer das monatliche AUGMENTERRA-Jour-fixe ist `<thema> = augmenterra`.

## Lebenszyklus

1. **Vorbereitung (lebendes Dokument).** Direkt nach einem Meeting wird der
   Plan fuer den naechsten Termin angelegt (Status `in Vorbereitung`). Ueber
   den Monat sammeln sich dort neue Themen im Abschnitt `Themenspeicher`;
   kurz vor dem Termin wird daraus die priorisierte Agenda geschnitten.
2. **Durchfuehrung.** Der Plan ist die Agenda-Grundlage. Nach dem Meeting
   erhaelt er den Status `eingefroren (durchgefuehrt)` und wird nicht mehr
   umgeschrieben.
3. **Nachdokumentation.** Die Notes halten Beschluesse, offene Punkte und
   vereinbarte Lieferungen fest (nachdokumentieren ist zulaessig, mit
   `Stand`-Datum wie bei `2026-06-19_ml_pipeline_meeting_notes.md`). Danach
   folgt die Weiterleitung (siehe unten); abschliessend Status
   `eingefroren (nachdokumentiert)`.

## Verhaeltnis zu den Sources of Truth

Meeting-Dokumente sind Evidenz, keine Zweitpflege von Status oder Methodik
(siehe [`Dokumentationsrouting`](../README.md)). Es gilt:

- Plaene und Notes duerfen aktuelle Kennzahlen und Modellstaende **zitieren**
  (mit Datum), aber nicht fortschreiben; sie verlinken auf die autoritativen
  Dokumente.
- Beschluesse werden im Rahmen der Nachdokumentation in die zustaendigen
  Dokumente uebertragen (Weiterleitungs-Checkliste in den Notes):
  - Modell-, Methodik- oder Prioritaetsentscheidungen ->
    [`next_steps.md`](../pipelines/anomaly_local_v1/next_steps.md),
    betroffene Execution Plans oder das
    [`Projektziel`](../project/Projektziel_InSAR_Building_Intelligence.md)
  - neue, noch unentschiedene Auffaelligkeiten ->
    [`docs/research/observations/`](../research/observations/README.md)
  - vereinbarte Datenlieferungen und externe Blocker -> als Startbedingung
    beim betroffenen Backlog-Punkt in `next_steps.md`
- Erst wenn die Weiterleitung erledigt ist, gilt das Meeting als
  nachdokumentiert; die Index-Zeile unten wird im selben Schritt gepflegt.

## Meeting-Index

| Datum | Thema | Plan | Notes | Status |
|---|---|---|---|---|
| 2026-09-24 | AUGMENTERRA-Jour-fixe | [`Plan`](2026-09-24_augmenterra_meeting_plan.md) | — | in Vorbereitung |
| 2026-07-23 | AUGMENTERRA-Jour-fixe | [`Plan`](2026-07-23_augmenterra_meeting_plan.md) | [`Notes`](2026-07-23_augmenterra_meeting_notes.md) | eingefroren (nachdokumentiert) |
| 2026-06-19 | ML-Pipeline (SP-AI / AP3) | [`Plan`](2026-06-19_ml_pipeline_meeting_plan.md) | [`Notes`](2026-06-19_ml_pipeline_meeting_notes.md) | eingefroren (nachdokumentiert) |

## Vorlage: Plan

```markdown
# Meeting-Plan: <Thema> (<YYYY-MM-DD>)

**Stand:** <Datum der letzten Bearbeitung>
**Status:** in Vorbereitung | eingefroren (durchgefuehrt)
**Meeting:** <YYYY-MM-DD>, <Dauer/Ort falls bekannt>
**Teilnehmerkreis:** <...>

## 1. Ziel fuer das Meeting
## 2. Follow-ups aus dem letzten Meeting
<Tabelle: Punkt | Stand seither | Was klaeren>
## 3. Themenbloecke
<je Block: Kontext (mit Quellen-Links), Kernbotschaft, offene Fragen>
## 4. Agenda-Vorschlag
## 5. Mitbringsel und Demos
## 6. Themenspeicher
<unpriorisierte Kandidaten; wird beim Agenda-Schnitt geleert oder vertagt>
## 7. Quellen im Repo
```

## Vorlage: Notes

```markdown
# Meeting-Ergebnisse: <Thema> (<YYYY-MM-DD>)

**Stand:** <Datum der Nachdokumentation>
**Status:** in Nachdokumentation | eingefroren (nachdokumentiert)
**Teilnehmerkreis:** <...>
**Vorbereitung:** `<...>_meeting_plan.md`

## 1. Beschluesse
## 2. Vereinbarte Lieferungen und externe Zusagen
<wer liefert was bis wann>
## 3. Offene Punkte und vertagte Themen
<vertagte Themen in den Themenspeicher des naechsten Plans uebertragen>
## 4. Weiterleitungs-Checkliste (Dokumentationsimpact)
- [ ] Beschluesse in `next_steps.md` / Execution Plans / Projektziel
- [ ] Beobachtungen nach `docs/research/observations/`
- [ ] Lieferungen/Blocker als Startbedingungen vermerkt
- [ ] naechsten Meeting-Plan angelegt (inkl. Themenspeicher)
- [ ] Meeting-Index in `docs/meetings/README.md` aktualisiert
```
