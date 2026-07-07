# Decision Record: TSX/PAZ als Strukturreferenz — Umfang und Grenzen

Stand: 2026-07-06
Status: entschieden (Punkt-Overlay verworfen; Gebaeude-Guardrail bestaetigt;
Patch-Ebene an Offset-Vorversuch gekoppelt)
Kontext: Meeting 2026-06-19 (SNT=Ziel, TSX=Referenz; keine zeitliche
SNT/TSX-Ueberlappung, Overlap-Daten werden organisiert), P7-N3.

## Entscheidung

1. **Ein punktbasierter "TSX-Support-Score" (rohes Karten-Overlay von
   SNT-Punkten gegen TSX-Punkte) wird NICHT gebaut.**
2. Der bestehende gebaeudegekoppelte Strukturvergleich
   (`hr_structural_compare` im Phase-7-Harness) bleibt als
   Regressions-Guardrail bestehen.
3. Die Verfeinerung auf Cluster-/Patch-Ebene (P7-N3) wird an das Ergebnis
   des Offset-Vorversuchs (`artifacts/hr_offset_recon.md`) gekoppelt:
   Go nur, wenn die gemessene Offset-Streuung Sub-Gebaeude-Aufloesung
   plausibel zulaesst.
4. Der Bewegungsvergleich SNT vs. TSX bleibt bis zur Lieferung zeitlich
   ueberlappender Daten qualitativ (Vorzeichen), wie im Harness verankert.

## Begruendung

### Geokodierungs-Praezision (TRE-ALTAMIRA-Handbook 2.2, Tab. 1, S. 13)

Die Lagekoordinate eines Messpunkts wird aus SAR-Koordinaten plus der aus
der Phase GESCHAETZTEN Punkthoehe rekonstruiert; Hoehenfehler wird zu
horizontalem Lagefehler. Praezision (1 Sigma, MP < 1 km vom REF):

| Richtung | Sentinel-1 (C-Band) | TSX/PAZ (X-Band) |
| --- | --- | --- |
| Nord | +/- 8 m | +/- 1 m |
| Ost | +/- 12 m (AUGMENTERRA-Handbuch: +/- 8 m) | +/- 3 m |
| Vertikal | +/- 8 m | +/- 1.5 m |

Die SNT-Positionsunsicherheit ist damit in der Groessenordnung eines
Gebaeudes. Sub-Gebaeude-Patch-Matching wuerde primaer Geokodierungsrauschen
messen, nicht Clusterstruktur. Die Harness-Toleranzen (SNT 12 m + TSX 3 m
+ sqrt(eff_area) fuer DS) entsprechen exakt diesen Handbuchwerten — und
erklaeren, warum die Gebaeude-Metrik bei match_rate 1.0 saettigt.

### Konzeptionelle Grenze: Fremdreflektoren

Die dominante Fehlerklasse der Pipeline sind REALE starke Fremdreflektoren
(Blechdaecher, Carports, Nebengebaeude — Falle 96959851, 96637447). Diese
sieht TSX genauso (bei hoeherer Aufloesung sogar besser). Ein Support-Score
wuerde solche Kontamination BESTAETIGEN statt aufdecken: TSX-Support
unterscheidet "echter Reflektor vs. Artefakt", nicht "gehoert zum Gebaeude
vs. Nachbarstruktur". Nachtrag: Fall 96959851 ist durch BEV-Footprints an
der Wurzel adressiert (`artifacts/bev_footprint_recheck_96959851.md`).

### Weitere Handbuch-Constraints

- **Verschiedene LOS nicht direkt vergleichbar** (TRE §2.1.2: "measurements
  obtained from different LOS cannot be directly compared") — Vergleiche nur
  geometrie-gematcht (ASC<->ASC, DESC<->DESC), wie im Motion-Compare-Harness
  bereits umgesetzt.
- **Referenzpunkt je Datensatz imagery-abhaengig** — systematische Versaetze
  zwischen Lieferungen sind eingebaut und muessen als Offset behandelt werden.
- **Band-Unterschiede** (C 5.6 cm vs. X 3.1 cm): unterschiedliche
  Reflektor-Populationen; fehlender TSX-Support beweist nicht, dass ein
  SNT-Punkt falsch ist.
- **Salzburg-TSX ist single-track descending (t93)** — der aufsteigende
  SNT-Track 44 ist in Salzburg strukturell nicht gegenpruefbar.
- Handbuch-Diskrepanzen (bei AUGMENTERRA rueckzufragen): SNT-Ost-Praezision
  +/- 12 m (TRE) vs. +/- 8 m (AUGMENTERRA); 2D-Dekompositions-Raster
  100x100 m (TRE) vs. 10x10 m (AUGMENTERRA).

## Was TSX als Referenz weiterhin leistet

1. Gebaeude-Level-Strukturvergleich als Regressions-Guardrail (vorhanden).
2. Unabhaengige Zweitmeinung auf Gebaeudeebene: TSX-Runs derselben AOIs
   (Status/Clusterstruktur-Vergleich nach eigenem Pipeline-Lauf).
3. Nach Lieferung ueberlappender Daten: quantitative Bewegungsreferenz
   (Overlap-Fenster-Slopes; Harness `bad_gastein_motion_compare.py` ist die
   Vorlage, auf Salzburg generalisierbar).

## Offset-Vorversuch (Go/No-Go fuer P7-N3)

`backend/app/ml/evaluation/hr_offset_recon.py` misst ueber gekoppelte
Gebaeude (5 AOI-Paare, Salzburg + Bad Gastein) die Verteilung der Abstaende
SNT-Main-Cluster-Zentroid <-> TSX-Cores bzw. TSX-Main-Zentroid.

Entscheidungskriterium: Liegt der Median der Zentroid-Abstaende in der
Groessenordnung der Geokodierungs-Toleranz (~8-15 m), ist Patch-Matching
als Metrik nicht diskriminativ -> No-Go fuer P7-N3 in der geplanten Form;
Alternative bleibt der Gebaeude-Level-Guardrail. Ergebnis-Nachtrag folgt
hier nach dem Lauf.

## Ergebnis-Nachtrag (2026-07-07, hr_offset_recon gelaufen)

240 gekoppelte Gebaeude ueber 5 AOI-Paare (Salzburg: mirabell/moosstrasse/
osthang mit salzburg_tsx_t93_d; Bad Gastein: bg_flat_01/bg_slope_01),
Details `artifacts/hr_offset_recon.md`:

| Metrik (gepoolt) | Median | p75 | p90 | Anteil <= 15 m |
| --- | ---: | ---: | ---: | ---: |
| SNT-Main-Zentroid <-> TSX-Main-Zentroid | 6.35 m | 9.15 m | 12.93 m | 95 % |
| SNT-Main-Zentroid <-> naechster TSX-Core | 2.43 m | 4.74 m | 6.94 m | 98 % |

**Entscheidung: NO-GO fuer Sub-Gebaeude-Patch-Matching (P7-N3 in der
geplanten Form).** Die Zentroid-Distanzen liegen mit Median ~6 m und p90
~13 m genau in der Groessenordnung der SNT-Geokodierungs-Praezision
(+/- 8-12 m 1 Sigma) und sind ueber flach/Hang nahezu identisch (5.4-7.1 m
je Paar) — ein Patch-Matching wuerde primaer Geokodierungsrauschen messen
und Kandidaten nicht diskriminieren. Die Handbuch-Prognose ist damit
empirisch bestaetigt.

Was stattdessen bleibt:

1. Gebaeude-Level-Guardrail unveraendert (min_offset-Median 2.4 m, 98 %
   <= 15 m: TSX-Struktursupport auf Gebaeudeebene ist nahezu universell —
   erklaert die Saettigung der match_rate bei 1.0).
2. Optionales GROBES Divergenz-Flag: Gebaeude mit Main-Zentroid-Distanz
   > ~13 m (p90) als `hr_divergent` fuer Visual-Audit-Priorisierung —
   schwaches Signal, kein Kandidaten-Diskriminator.
3. P7-N2 (regime-konditionale TSX-Strategie) verliert damit seine
   geplante feine Verifikationsbasis und braucht eine andere Evidenz
   (z. B. Injection-Tests, siehe Feature-Research-Bericht).

## Quellen

- `docs/research/external/TREALTAMIRA_handbook_2.2_20180604.pdf` (S. 13-14,
  20-22, 29, 52-57)
- `docs/research/external/AUGMENTERRA_InSAR_Handbook_v1_3.pdf` (S. 8-16, 24-25)
- `backend/app/ml/evaluation/phase7_clustering_experiments.py`
  (`hr_structural_compare`, `SNT_GEOCODE_TOL_M`, `TSX_GEOCODE_TOL_M`)
- `docs/meetings/2026-06-19_ml_pipeline_meeting_notes.md`
