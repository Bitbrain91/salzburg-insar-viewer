# `anomaly_local_v1` Phase-2 Calibration Note

Stand: 2026-04-23
Status: `P2-W2-T1` green

## Inputs

Die Kalibrationsnotiz basiert auf:

- `docs/pipelines/anomaly_local_v1/artifacts/phase2_harness_results.json`
- `docs/pipelines/anomaly_local_v1/artifacts/phase2_harness_summary.md`
- `docs/pipelines/anomaly_local_v1/artifacts/phase2_reference_cases.json`
- den festen AOI-Runs fuer Mirabell, Moosstrasse und den Osthang-Stressbereich

## Kurzfazit

`P1` ist fuer produktive Building-/Cluster-Semantik tragfaehig. Die Status-Grenzen fuer echte Grenzfaelle greifen, und der `differential_motion_flag` wirkt in den geprueften Faellen praezise genug.

Die wichtigste offene Nachsteuerung betrifft nicht die Grundlogik der Phase 1, sondern die Kalibrierung der Reliability gegen schwache Track-Stuetzen und sehr niedriges Cross-Track-Agreement.

## Befunde nach Ursache

### 1. Status-Grenzfaelle verhalten sich wie gewuenscht

Beobachtung:

- Osthang `395674088` bleibt `insufficient_support` und ist auch im Bootstrap `unstable`.
- Moosstrasse `96959854` (`small_n`) und `96637551` (`noise_dominated`) bleiben niedrig eingestuft und kippen nicht in scheinbar belastbare Gebaeudesignale.
- Auf Run-Ebene bleiben die Pflicht-AOIs plausibel verteilt:
  - Mirabell: `24 ok`, `8 small_n`, `13 insufficient_support`
  - Moosstrasse: `65 ok`, `20 small_n`, `40 insufficient_support`
  - Osthang: `24 ok`, `6 small_n`, `6 insufficient_support`

Bewertung:

- Keine sofortige Status- oder Threshold-Korrektur fuer `insufficient_support`, `small_n` oder `noise_dominated` noetig.

### 2. Differential Motion bleibt ein nuetzliches, seltenes Signal

Beobachtung:

- Ueber alle drei Pflicht-Runs werden nur `6` Gebaeude mit `differential_motion_flag=true` markiert.
- Der Ankerfall `96637447` in Moosstrasse bleibt auch im Harness plausibel:
  - `building_status=ok`
  - `building_reliability_score=0.76`
  - `track_agreement_score=0.90`
  - Bootstrap-Band `monitor`, aber ohne Widerspruch zum gesetzten Differential-Flag

Bewertung:

- Der Flag wirkt aktuell eher praezise als ueberempfindlich.
- Fuer die naechste Iteration ist keine direkte Schwellenabsenkung oder -anhebung noetig.

### 3. Reliability ist teils zu optimistisch bei duenner Track-Stuetze

Beobachtung:

- Im Harness faellt der Mirabell-Standardfall `548205` trotz `building_reliability_score=0.98` im Building-Stability-Signal auf `monitor`, weil der Track-95-`main_cluster` nur `2` Punkte traegt und track-lokal `unstable` ist.
- Dasselbe Muster taucht nicht nur im Ankerfall auf:
  - ueber die drei Pflicht-Runs gibt es `78` Gebaeude mit `building_status=ok` und `building_reliability_score >= 0.75`
  - davon haben `19` auf mindestens einem Track einen `main_cluster` mit weniger als `3` nicht ausgeschlossenen Punkten

Bewertung:

- Die aktuelle Reliability-Formel honoriert Agreement und Signalqualitaet stark genug, dass duenne Zweit-Track-Stuetzen gelegentlich zu hoch eingestuft werden.

Konkrete Nachsteuerung fuer die naechste Produktiteration:

- Reliability-Cap einfuehren: wenn ein vorhandener `main_cluster` auf einem Track `< 3` Punkte traegt, darf `building_reliability_band` hoechstens `medium` sein.
- Zusaetzlich numerische Penalty pruefen, Startvorschlag: `-0.10` auf `building_reliability_score`.
- Optionales Diagnosefeld `weak_secondary_track_flag` vorbereiten, damit UI und spaetere Evaluation dieselbe Ursache sehen.

### 4. `ok` deckt aktuell auch sehr schwaches Agreement ab

Beobachtung:

- Ueber die drei Pflicht-Runs gibt es `20` Gebaeude mit `building_status=ok` und `track_agreement_score < 0.25`.
- Davon liegen `5` sogar unter `0.10`, alle im Moosstrasse-Run.
- Beispiele:
  - `98698986`: `reliability=0.58`, `agreement=0.0008`
  - `98698984`: `reliability=0.63`, `agreement=0.0037`
  - `Austria_120230030_12751`: `reliability=0.58`, `agreement=0.0050`

Bewertung:

- Das ist kein harter Produktfehler, aber eine klare Kalibrationsluecke.
- `building_status=ok` darf fachlich bestehen bleiben, wenn die internen Cluster sonst sauber sind; die Reliability sollte in diesem Bereich aber deutlicher nach unten gezogen oder explizit als Spannungsfall markiert werden.

Konkrete Nachsteuerung fuer die naechste Produktiteration:

- Zusatz-Penalty fuer `track_agreement_score < 0.25`, Startvorschlag: `-0.10`.
- Optional `agreement_tension_flag` einfuehren, damit sehr schwaches Agreement nicht nur implizit in der Zahl steckt.
- Wenn `track_agreement_score < 0.10`, Band-Cap auf `low` pruefen, solange kein klarer Ein-Track-Fall vorliegt.

## Referenzfaelle aus dem Harness

Die feste Phase-2-Stichprobe deckt die relevanten Typen bereits gut ab:

- `548205`: stabiler Standardfall, aber duenner Zweit-Track
- `548204`: Standardfall mit brauchbarer, weniger extremer Agreement-Lage
- `96637447`: differenzieller Multi-Cluster-Anker
- `96637522`: differenzieller Fall mit deutlich niedrigerem Agreement
- `96637488`: `single_track_only`
- `96959854`: `small_n`
- `96637551`: `noise_dominated`
- `395674088`: `insufficient_support`

Diese Stichprobe ist ausreichend, um die zwei zentralen Kalibrationsthemen fuer die naechste Produktiteration gezielt zu retesten:

- hohe Reliability trotz duennem Main-Cluster auf einem Track
- `ok` trotz extrem schwachem Cross-Track-Agreement

## Ergebnis fuer Phase 3+

Empfohlene Reihenfolge fuer die naechsten inhaltlichen Folgetickets:

1. Reliability-Cap und/oder `weak_secondary_track_flag`
2. staerkere Agreement-Penalty oder `agreement_tension_flag`
3. danach erst Nachbarschafts-Kontext, damit neue Signale nicht auf einer schon bekannten Reliability-Luecke aufbauen

## Kein Sofort-Fix in `P2`

In `P2` wurde bewusst kein direktes Produkt-Retuning in Pipeline/UI vorgenommen.

Begruendung:

- die Abweichungen sind Kalibrationsfragen, keine offensichtlichen Defekte in der `P1`-Semantik
- der neue Harness liefert jetzt eine stabile Basis, um genau diese Nachsteuerungen in der naechsten Produktwelle kontrolliert gegen feste AOIs und feste Gebaeudefaelle zu pruefen
