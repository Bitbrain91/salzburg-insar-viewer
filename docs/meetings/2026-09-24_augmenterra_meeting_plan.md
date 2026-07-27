# Meeting-Plan: AUGMENTERRA-Jour-fixe (2026-09-24)

**Stand:** 2026-07-27
**Status:** in Vorbereitung
**Meeting:** 2026-09-24
**Teilnehmerkreis:** Projektteam SP-AI + AUGMENTERRA (inkl. der fuer die Bewegungszerlegung zustaendigen Personen)

## 1. Ziel fuer das Meeting

1. Wien-Datenlieferung im Detail klaeren und die Integration eintakten.
2. Hanglagen-Methodik: unseren 2D-Zerlegungsansatz mit der
   AUGMENTERRA-Parallelentwicklung abgleichen.
3. Ergebnisse der Gebaeudedatenfusion-Vorarbeiten zeigen und Feedback holen.

## 2. Follow-ups aus dem letzten Meeting

| Punkt | Stand seither | Was klaeren |
|---|---|---|
| Wien-Datensatz (~Ende August zugesagt) | — | Lieferstatus; genaue Zeitraeume, Tracks/Geometrien, Formate; 3D-Gebaeudemodell (Format/Lizenz, z. B. LoD2/CityGML); In-situ-Daten; Datenschutzauflagen |
| Server/Hosting (Rueckmeldung Entwickler) | — | Entscheidung AUGMENTERRA-Server / FH / eigener Server; Admin-Zugriff |
| Gebaeudedatenfusion (Arbeitsauftrag aus Beschluss 5) | Vorarbeiten laufen (siehe `next_steps.md` P1-11) | Zwischenergebnis DOM/DGM-Abgleich, Hoehen-Hypothese BEV |

## 3. Themenbloecke

### Hanglage und 2D-Zerlegung (vertagt vom 23.07.)

Kernfrage an AUGMENTERRA: Rechnet ihr pro Gebaeude mit einer oder mit
beiden Blickrichtungen - und prueft ihr ein Residuum? Darauf aufbauend
Vorschlag: beide Verfahren (hangabwaerts-projizierte Skalierung vs. freie
Zerlegung aus zwei Blickrichtungen) auf denselben Bad-Gastein-Gebaeuden
rechnen und die Residuenverteilung vergleichen. Bad Gastein bleibt das
primaere Hanglagen-Testgebiet; Pruefstrategie ohne lange hochaufloesende
Referenz siehe `next_steps.md` P1-8.

### Wien-Onboarding

Erst nach Lieferdetails planbar; Ziel ist ein eigener Execution Plan
(Erfolgskriterien vor dem ersten Lauf, Holdout-Disziplin, siehe
`next_steps.md` P1-13).

## 4. Agenda-Vorschlag

wird beim Agenda-Schnitt kurz vor dem Termin erstellt

## 5. Mitbringsel und Demos

- Zwischenstand Gebaeudedatenfusion (P1-11), sofern vorhanden
- ggf. aktualisierte Vertrauens-/Ergebnis-Uebersicht

## 6. Themenspeicher

- Label-Stichprobe 10-15 Gebaeude durch AUGMENTERRA (aus Plan 23.07.,
  Thema 2; nicht behandelt, Prioritaet gesunken durch Wien-Ground-Truth)
- Hoehensystem der gelieferten Punkthoehen (blockiert Vertikaldatum-Klaerung
  in P1-7)
- Differentialfall `96637447` (Vor-Ort-Wissen?)
- Track 22 Ost: Datenabdeckung, Lieferoptionen
- Tool-Zugang fuer AUGMENTERRA / Expertenlabel-Erfassung im Viewer
  (aus Plan 23.07., Thema 5)

## 7. Quellen im Repo

- Ergebnisse letztes Meeting:
  [`2026-07-23_augmenterra_meeting_notes.md`](2026-07-23_augmenterra_meeting_notes.md)
- Offene Forschung: [`next_steps.md`](../pipelines/anomaly_local_v1/next_steps.md)
- Gebaeudequellen-Beobachtung:
  [`OBS-2026-001`](../research/observations/OBS-2026-001_bev-bauwerkskomplexe.md)
