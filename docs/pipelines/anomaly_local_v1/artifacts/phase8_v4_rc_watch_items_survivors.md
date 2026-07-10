# Phase 8 v4 RC - Survivors-/Watch-Item-Pass

Stand: 2026-07-10T10:43:33.807384Z

Status: **green**
Modus: read-only gegen die in `phase7_clustering_experiments.AOIS`
gepinnten v4-Baseline-Runs; keine Re-Baseline und keine DB-Aenderung.

## Gate-Ergebnis

- 5 aktive Differentialbewertungen in den Zielbeobachtungen
- 0 Differentialquellen mit `cluster_kind=foreign`
- 0 Evidenzcluster mit `foreign_suspect`
- 0 nicht-Core-Evidenzcluster
- 0 Foreign-Cluster als Main
- 0 Foreign-Cluster mit einer anderen Rolle als `weak_support`

**Damit ist das zentrale Gate gruen: Kein Foreign-Cluster praegt eine
Differentialbewertung.** Alle aktiven Evidenzcluster sind `annex`, Rolle
`core`, nicht Main und ohne `anti_layover` in ihrer eigenen
Separationsevidenz.

## Uebersicht

`238100082` liegt in zwei gepinnten Baselines und wird daher zweimal
ausgewiesen. Labels sind die persistierten Pipeline-Labels
`normal/suspect/outlier`, keine unabhaengige Ground Truth.

| Gebaeude | AOI / Run | Tracks | Kind-Punkte standard/annex/foreign | Rollen core/weak/noise/excluded | Level | Evidenzcluster | Delta / Sigma | Befund |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 238100082 | bg_flat_01_snt / `ce87a736` | 44/95 | 22 / 1 / 1 | 14 / 2 / 5 / 3 | none | - | - | Semantische Seitencluster vorhanden, aber keine aktive Differentialbewertung |
| 238100082 | bg_flat_01_tsx / `438ba411` | 70/93 | 167 / 4 / 9 | 114 / 9 / 44 / 13 | candidate | `t70:annex_0` | +1.53 / 1.55 | Hoehenband-Anbaukandidat; 9 Foreign-Punkte bleiben weak/non-main |
| 96637447 | moosstrasse / `c1297b3e` | 44/95 | 21 / 2 / 7 | 19 / 7 / 3 / 1 | candidate | `t44:annex_0` | +2.69 / 1.686 | Reach-Anbaukandidat; sieben Anti-/Reach-Foreign-Punkte sauber getrennt |
| 96639519 | moosstrasse / `c1297b3e` | 44/95 | 31 / 3 / 1 | 15 / 1 / 3 / 16 | candidate | `t44:annex_0` | -2.18 / 1.386 | Reach+Velocity-Growth-Anbaukandidat; ein Anti-Layover-Foreign separat |
| 96955335 | moosstrasse / `c1297b3e` | 44/95 | 9 / 4 / 4 | 10 / 5 / 0 / 2 | significant | `t95:annex_0` | -3.96 / 1.244 | Statistisch signifikant; Evidenz aus dreipunktigem Reach+Growth-Annex |
| 96959851 | moosstrasse / `c1297b3e` | 44/95 | 10 / 2 / 1 | 6 / 1 / 2 / 4 | candidate | `t95:annex_0` | -1.98 / 0.916 | Bekannter Anbau bleibt annex; `small_n_guard`; Anti-Punkt O2HC2XV01 bleibt foreign |

## Einzelfaelle

### 238100082

- SNT: Level `none`. t44-Foreign `NBO8F8J01` (`anti_layover`) und
  t95-`annex_weak` `L5189OC01` (`reach_height_excess`) sind beide
  `weak_support` und nicht Main.
- TSX: Evidenzcluster `238100082:t70:annex_0`, vier `suspect`-Punkte,
  ausschliesslich `height_outlier`, Delta +1.53 mm/a. Die Foreign-Cluster
  t70/t93 enthalten neun Punkte, sind durchgehend `weak_support` und nicht
  Main. Das passt zum dokumentierten Hoehenband-Watch-Item.

### 96637447

- Evidenz: `t44:annex_0`, zwei Punkte `O32ROQ901/O33D4C101`,
  `reach_height_excess`, Delta +2.69 mm/a.
- Sieben Foreign-Punkte liegen getrennt in t44/t95-`:foreign`, darunter die
  bekannten Anti-Layover-Punkte O355F5A01, O36XPYO01, O37J5KI01 und
  O384L6A01. Keiner ist Main oder Differentialquelle.

### 96639519

- Evidenz: `t44:annex_0`, drei Punkte, `reach_height_excess` plus
  `annex_velocity_growth`, Delta -2.18 mm/a.
- `O2VMHGP01` bleibt als einzelner Anti-Layover-Punkt in `:foreign` /
  `weak_support`.

### 96955335

- Einziger `significant`-Fall im Zielset: `t95:annex_0`, drei Punkte,
  Delta -3.96 mm/a, Sigma 1.244, keine Downgrades.
- Vier Foreign-Punkte in t44/t95 sind weak/non-main. Das signifikante Signal
  stammt ausschliesslich aus Reach+Velocity-Growth-Annex-Evidenz.

### 96959851

- Der bekannte baulich verbundene Anbau bleibt als `t95:annex_0` mit
  NTC3CYZ01/NTDA86J01 erhalten; Delta -1.98 mm/a, Level `candidate` wegen
  `small_n_guard`.
- O2HC2XV01 bleibt als Anti-Layover-Fremdpunkt in `t44:foreign`,
  `weak_support`, nicht Main und nicht Differentialquelle.

## Lesart

Der v4-Evidenzklassen-Fix haelt in allen fuenf Watch-Items: Annex-Signale
bleiben fuer Differentialbewegung nutzbar, waehrend Foreign-Cluster weder
Main noch Differentialquelle werden. Der Pass bewertet die physische
Richtigkeit der neuen Watch-Items nicht abschliessend; insbesondere
238100082 und 96955335 bleiben fachliche Visual-Audit-Faelle.

Maschinenlesbare Cluster-, Rollen-, Label- und Punktcode-Details stehen in
`phase8_v4_rc_watch_items_survivors.json`.
