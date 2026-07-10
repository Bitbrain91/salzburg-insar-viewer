# Phase 8 v4 RC – Gate-Ergebnis

**Stand:** 2026-07-10

**Status:** **ROT**

**Entscheidung:** **v4 RC geprüft, nicht akzeptiert**
**Push-Blocker:** nein; der rote RC-Befund muss beim Push ausdrücklich mitgeführt werden.

Maschinenlesbare Evidenz:
[`phase8_v4_rc_gate_results.json`](phase8_v4_rc_gate_results.json)

## Gesamtbefund

Technische Parität, aktive Verträge, historische Kompatibilität, No-op-Identität
und `cluster_kind`-Reinheit sind grün. Die RC-Akzeptanz bleibt dennoch rot, weil
zwei harte P0-Fachkriterien verletzt sind:

1. Gebäude `96637447` bleibt ohne neue fokussierte visuelle Evidenz ein
   `candidate` mit `+2,69 mm/a`; der Fall ist fachlich **unklar**.
2. Der aktuelle No-op weist einen absoluten Dachpunktverlust aus:
   `moosstrasse_bev`, Punkt `NSVF80S01`, Track 95, Referenzgebäude `96637447`,
   Zustand `excluded`, Verdict `roof_lost`.

## Einzel-Gates

| Gate | Status | Evidenz |
|---|---|---|
| Persistierte v4-Parität | grün | 10 Runs, 23.278 Punkte, 870 Rollups; 0 Flag-/Level-Mismatches, 0 fehlende/ungültige Level, 0 Proxy-Evidenzfehler |
| Vor-Level-Kompatibilität | grün | 82 persistierte Runs: 20 Level-Runs, 62 Vor-Level-Runs; Vor-Level wird als `null`, nicht als `none`, ausgegeben |
| Automatisierter Vertrags-Smoke | grün | 17/17 Service-, Import-, OpenAPI-, JSON- und MVT-Checks grün; 0 Writes/Rebaselines/neue Runs |
| 10-AOI-No-op | grün | 10/10 AOIs bitidentisch; 23.278 Punkte; `only_db=0`, `only_harness=0`, `differing=0` |
| Differential-Verteilung | grün | unverändert: `none=849`, `candidate=17`, `significant=4`, `confirmed=0`, fehlend `0` |
| Clusterarten-Reinheit | grün | `foreign_in_annex=0`, `annex_in_foreign=0`, `foreign_in_main=0` |
| Historische v3-UI-Semantik | grün | Annex sichtbar als damalige v3-Klassifikation ohne v4-Bestätigung |
| Visuelle Akzeptanz `96637447` | **rot** | Candidate `+2,69 mm/a` ohne neue prüfbare Nahansicht der zwei Annexpunkte |
| BEV-Dachpunkterhalt | **rot** | `roof_lost=1`: `NSVF80S01`, Track 95, Gebäude `96637447`, `moosstrasse_bev` |

## No-op und Referenzlabels

Der Harness ist für alle zehn GBA-/BEV-AOI-Kombinationen punktidentisch zu den
persistierten v4-Baselines. Die 82 ausgewerteten Referenzlabels ergeben:

- `foreign_caught=20`
- `annex_separated=2`
- `annex_merged=2`
- `unclear=30`
- `foreign_in_annex=0`, `annex_in_foreign=0`, `foreign_in_main=0`
- `roof_lost=1`

`annex_merged=2` bleibt transparent sichtbar, ist laut bestehender Scorecard
aber kein automatisches Reinheits-Fail und zeigt wegen der No-op-Identität keine
neue Drift. Der absolute Roof-Loss ist dagegen ein hartes rotes P0-Kriterium.

## Visueller Audit

Der vollständige Fallaudit mit Screenshots steht in
[`phase8_v4_rc_visual_audit.md`](phase8_v4_rc_visual_audit.md). Die Ergebnisse:

| Fall | `cluster_kind` / Level | Einordnung |
|---|---|---|
| Mirabell `324384` | Plausibilitätsanker; 214 Punkte, 6/2 Cluster | bestätigt |
| Osthang `150506168` | Plausibilitätsanker; 47 Punkte, 6/2 Cluster | bestätigt |
| `96959851` | `annex_0`, candidate `-1,98`, `small_n_guard`; foreign nur `weak_support` | bestätigt |
| `96637447` | `annex_0`, candidate `+2,69`; foreign nur `weak_support` | **unklar / rot** |
| `96639519` | `annex_0`, candidate `-2,18`; foreign korrekt getrennt | bestätigt |
| `96955335` | `annex_0`, significant `-3,96`; keine unabhängige Bewegungsbestätigung | bewusst toleriert |
| `238100082` SNT | Level `none`; foreign und `annex_weak` nur `weak_support` | bestätigt |
| `238100082` TSX | `annex_0`, candidate `+1,53`; foreign nur `weak_support` | bewusst toleriert |

Es wurde kein Fall als „korrigiert“ eingestuft.

## Warnungen und Nacharbeit

- Der Punkt-MVT-Vertrag ist korrekt, benötigte im Smoke aber `57,6 s`. Mangels
  definiertem Grenzwert ist das kein RC-Vertragsfehler, aber ein eigenes
  Performance-Folgeticket.
- Der Evaluations-Harness erhielt eine semantikgleiche indexierbare
  BBox-Vorbedingung vor dem unveränderten exakten 60-m-Geography-Gate. Sie
  schließt in sieben geprüften AOI-/Quellenkombinationen keinen Kandidaten aus
  und senkt die BEV-Moos-Plan-Kosten etwa um Faktor `24,5`. Das betrifft nicht
  die MVT-Latenzwarnung.
- Für R9 muss das GBA-/BEV-Referenzgrading quellenspezifisch gefiltert und der
  Fall `NSVF80S01` anschließend erneut bewertet werden. Bis dahin gibt es keine
  stillschweigende Ausnahme.
- Für `96637447` ist eine fokussierte Nahansicht mit sichtbaren Annexpunkten und
  eine explizite Domänenentscheidung erforderlich.

## Entscheidung

**v4 RC geprüft, nicht akzeptiert.** Technische Green-Gates und 10/10-No-op
reichen nicht aus, solange `96637447` visuell ungeklärt und der BEV-Roof-Loss
nicht aufgelöst sind. Der Befund verhindert laut Supervisor-Vorgabe nicht den
Push, wohl aber die fachliche RC-Akzeptanz.
