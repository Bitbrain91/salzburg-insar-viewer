# Amplituden-Recon: Bad-Gastein-Datenstand + Signatur-Test Fall 96959851

Stand: 2026-06-12 (Nachtrag zu Phase 7; Auftrag: Verifikation + Kurz-Analyse)

## 1. Datenstand Bad-Gastein-Amplituden (SNT t44/t95) - VERIFIZIERT

Integration durch parallele Session (areas_manifest `amplitude_path` +
`prepare_insar.py` + PostGIS-Load; GPKGs `austria_snt_t44_a_amp.gpkg` /
`austria_snt_t95_d_amp.gpkg`). DB-Verifikation 2026-06-12:

| Tabelle | area/dataset | Track | Umfang |
| --- | --- | --- | --- |
| insar_amplitude_timeseries | bad_gastein/bad_gastein_snt | t44 | 17 046 036 Zeilen, 185 283 Punkte |
| insar_amplitude_timeseries | bad_gastein/bad_gastein_snt | t95 | 13 487 490 Zeilen, 149 861 Punkte |
| insar_points.amp_mean | bad_gastein/bad_gastein_snt | t44 | 80 289 / 127 384 Punkte (63.0 %) |
| insar_points.amp_mean | bad_gastein/bad_gastein_snt | t95 | 64 115 / 119 973 Punkte (53.4 %) |

- Teilabdeckung ist ERWARTET: die Amplituden-Exports decken den
  Talkorridor ab (README). Track 22 und TSX/PAZ (t70/t93) ohne Amplituden.
- Referenz Salzburg (seit Januar): t44 99.8 %, t95 80.0 %.

### Konsequenz: Re-Baseline der BG-AOIs (Pflicht-Erstschritt naechste Mini-Phase)

Die Pipeline nutzt Amplituden produktiv (`amp_ts_cv`-Gate
`unstable_amplitude`, `amp_quality` im Scoring, `amplitude_available`).
Die persistierten v2_k2x-Baselines der BG-AOIs entstanden OHNE
Amplituden-Input; frische BG-Laeufe weichen jetzt ab. `--verify-noop`
bricht auf bg_* daher ERWARTUNGSGEMAESS, bis neue Baselines persistiert
sind (Datenstands-Wechsel dokumentieren; alte Baselines als legacy
behalten). Salzburg unbetroffen. Details: next_steps.md P7-N6.

## 2. Signatur-Test am Referenzfall 96959851 (Salzburg, Moosstrasse)

Hypothese: Das unkartierte Nebengebaeude hat ein Blechdach (starker
Reflektor) -> seine Punkte muessten als hohe, stabile Amplituden
auffallen und Amplitude koennte als Fremdstruktur-Indikator dienen.

Messung (amp_mean-Perzentil innerhalb der Moosstrassen-AOI pro Track,
n=758 t44 / n=939 t95; cv = amp_std/amp_mean; Rohzeitreihen-Mittel in
Klammern, AOI-weiter TS-Durchschnitt ~1.6):

| Punkt | Track | Einordnung | amp-Perzentil | cv | TS-avg |
| --- | --- | --- | --- | --- | --- |
| NTDA86J01 | t95 | VERDACHT Nebengebaeude (core) | 88 % | 0.39 | 2.65 |
| NTG9E7F01 | t95 | Dach directional core | 55 % | 0.39 | - |
| NTF2IZV01 | t95 | Dach within core | 17 % | 0.58 | 1.02 |
| NTC3CYZ01 | t95 | VERDACHT Nebengebaeude (core) | 7 % | 0.44 | 0.88 |
| O2CKM3N01 | t44 | Dach within core | 57 % | 0.51 | 1.30 |
| O2HC2XV01 | t44 | BEWIESEN Nebengebaeude (noise) | 20 % | 0.46 | 0.93 |
| O2FJS4J01 | t44 | Dach within core | 33 % | 0.43 | 1.30 |

**Ergebnis: Hypothese am Pruefstein NICHT bestaetigt.** Die zwei
Nebengebaeude-Verdachtspunkte tragen ENTGEGENGESETZTE Signaturen
(NTDA86J01 hell, 88. Perzentil; NTC3CYZ01 dunkel, 7. Perzentil), der
bewiesene Fremdpunkt O2HC2XV01 ist ebenfalls dunkel (20.). Es gibt keine
Trennung Dach- vs. Fremdstruktur-Punkte ueber amp_mean. Physikalisch
plausibel: Blechdach-Rueckstreuung ist stark orientierungsabhaengig -
dieselbe Struktur kann gleichzeitig helle Specular-/Corner-Returns und
dunkle stabile Scatterer tragen.

## 3. Empfehlungen fuer die Mini-Phase (P7-N5/P7-N6)

1. **Amplitude NICHT als eigenstaendiges Hygiene-Signal einplanen** - der
   einzige Pruefstein mit Ground-Truth widerlegt die einfache
   "hell = Fremdstruktur"-Heuristik. Primaer bleiben die kartierungsfreien
   Geometrie-/Hoehen-Checks (Anti-Layover, Layover-Reichweite, a3/k2xh).
2. **Sekundaer testenswert:** Amplitude als Gewichts-/Kontextfeature
   (z. B. amp_ts_cv-stabile helle Punkte als staerkere Anker; Amplituden-
   KONSISTENZ innerhalb eines Clusters als Kohaesionsmerkmal). Erwartung
   konservativ halten; Scorecard entscheidet.
3. **BG-spezifisch:** Nach Re-Baseline pruefen, wie viele BG-Gebaeude durch
   das jetzt aktive `unstable_amplitude`-Gate/`amp_quality` Status oder
   Score aendern (Talkorridor 53-63 % Abdeckung; Punkte ohne Amplitude
   behalten `amplitude_available=false`-Pfad) - das ist der eigentliche
   sofortige Effekt der Amplituden-Integration, nicht ein neues Feature.

Reproduktion: SQL-Schnipsel dieser Analyse in der Session-Historie;
Punktrollen aus Run 4a58de67 (k2x moosstrasse), Fallkontext in
`phase7_reference_cases.json` (residual_contamination).
