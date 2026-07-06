# Meeting-Ergebnisse: InSAR Viewer und ML-Pipeline (2026-06-19)

Stand: 2026-07-06 (nachdokumentiert)
Teilnehmerkreis: Projektteam SP-AI / AP3
Vorbereitung: `2026-06-19_ml_pipeline_meeting_plan.md`

## 1. Kernproblem: Fehlende Ground Truth

Grundsaetzliche Einigkeit: Die groesste Herausforderung ist das Fehlen einer
Ground Truth, also eines Soll-Werts, auf den hin optimiert werden kann. Die
zwei entscheidendsten Faktoren, um sich einer Ground Truth anzunaehern:

1. Vergleich mit den hochaufloesenden Daten (TSX/PAZ).
2. Cross-Track-Vergleich pro Gebaeude (aufsteigender vs. absteigender Track
   desselben Satelliten).

Nachtrag 2026-07-06: Experten-Labels von AUGMENTERRA sind kurzfristig nicht
verfuegbar; die Planung erfolgt vorerst ohne diese Daten. Ersatzstrategie:
interner Referenzlabel-Korpus (siehe `../pipelines/anomaly_local_v1/reference_labels.md`).

## 2. Beschluss: SNT als Ziel, TSX/PAZ als Referenz

Die Pipeline-Ergebnisse der SNT-Daten werden mit denen der hochaufloesenden
TSX/PAZ-Daten verglichen. Dafuer wurden die TSX/PAZ-Daten fuer die gesamte
Stadt Salzburg integriert (`salzburg_tsx_t93_d`, Track 93 descending,
923.017 Punkte). Logik: Der Algorithmus soll auf den SNT-Daten funktionieren
(ueberall verfuegbar), waehrend TSX als Referenz dient, um zu pruefen, ob die
SNT-Daten korrekt bewertet werden.

**Wichtige Einschraenkung:** Zurzeit gibt es (fast) keine ueberschneidenden
Zeitraeume zwischen SNT- und TSX-Daten; ein Bewegungsvergleich ist damit kaum
moeglich. Ueberlappende Datenlieferungen werden noch organisiert. Bis dahin
traegt nur der raeumlich-strukturelle Vergleich (siehe Decision Record
`../pipelines/anomaly_local_v1/tsx_structural_reference_decision.md`).

## 3. Punkt-zu-Gebaeude-Zuordnung

Die Zuordnung am Beginn der ML-Pipeline funktioniert bereits gut, kann aber
weiter verbessert werden. Entsprechende Verbesserungen sind geplant
(Anti-Layover-Check, Layover-Reichweiten-Check, polygon-aware Cross-Look;
siehe `../pipelines/anomaly_local_v1/next_steps.md` P7-N5 und Phase-8-Plan).

## 4. Gebaeudehoehen: BEV statt Global Building Atlas

Feststellung: Die Hoehenangaben im GBA sind sehr ungenau (Median-Ratio
GBA/OSM 0.735, systematische Unterschaetzung ~27 Prozent). Wo verfuegbar,
sollen genauere Daten verwendet werden. Mit dem Import der BEV-Gebaeudedaten
(DLM-Bauwerke, ALS-gemessene Hoehen) ist die Grundlage geschaffen.

Offen: ein sauberes Verarbeitungskonzept, wie die BEV-Werte in der
ML-Pipeline verwendet werden sollen (welche Hoehe steuert Candidate Area und
Hoehenpruefungen, Fallback-Kette, Quellen-Metadaten). Siehe
`../pipelines/anomaly_local_v1/bev_building_source_concept.md`.

## 5. Feature-Satz bewerten und erweitern

Der Feature-Satz soll bewertet und erweitert werden, um herauszufinden,
welche Features der Pipeline tatsaechlich etwas bringen. Hoffnung liegt
insbesondere auf den Zeitreihen-Amplitudenwerten und der Bewegungszeitreihe.
Denkbar ist eine Ablationsstudie mit verschiedenen Features.

Dafuer ist ein eigener Research-Task notwendig bzw. hilfreich:

- Gibt es aktuelle Studien, die bestimmte Attribute als hilfreich einstufen?
- Wie vergleicht man Zeitreihen miteinander (z. B. fuers Clustering) —
  was ist State of the Art?

Sequenzierungs-Entscheidung (Nachgang, 2026-07-06): Features werden JETZT als
schaltbare Harness-Achsen vorbereitet/integriert; die Hygiene-/Struktur-
Ablation laeuft mit den vorhandenen Evaluationsschichten (Referenzfaelle,
Scorecards, Cross-Track flach, Visual-Audit). Die Bewegungsgenauigkeits-
Ablation und das endgueltige Aussortieren von Features warten auf die
zeitlich ueberlappenden SNT/TSX-Daten.

## 6. Problem Hanglage

Die aktuelle Pipeline versagt bei Gebaeuden in Hanglage, weil auf- und
absteigender Track dort nicht uebereinstimmen — Gebaeude in Hanglage haben
keinen rein vertikalen Versatz. Das laesst sich voraussichtlich mit guten
externen Daten zur Hanglage ausgleichen.

Research-Task noetig:

- Welche Daten gibt es dafuer (hochaufloesende DTM/DSM)?
- Verfuegbarkeit: nur Stadt Salzburg, Salzburg + Bad Gastein,
  oesterreichweit, global?
- Wie lassen sie sich am besten in die ML-Pipeline integrieren
  (2D-Dekomposition, Downslope-Projektion, aspect-abhaengige
  Toleranz/Konfidenz)?

## 7. Uebergeordnetes Ziel (bestaetigt)

Eine verlaessliche Bewertung inkl. Konfidenz pro Gebaeude abgeben koennen
(Bewegungsscore, differentielle Bewegung, ...).

## 8. Abgeleitete Arbeitspakete (Stand 2026-07-06)

| Thema | Artefakt/Ort |
| --- | --- |
| BEV-Verarbeitungskonzept | `../pipelines/anomaly_local_v1/bev_building_source_concept.md` |
| BEV-Referenzfall-Validierung | `../pipelines/anomaly_local_v1/artifacts/bev_gba_reference_case_comparison.md` |
| TSX-Referenz-Entscheidung | `../pipelines/anomaly_local_v1/tsx_structural_reference_decision.md` |
| TSX-Offset-Vorversuch (P7-N3 Go/No-Go) | `../pipelines/anomaly_local_v1/artifacts/hr_offset_recon.md` |
| Referenzlabel-Korpus | `../pipelines/anomaly_local_v1/reference_labels.md` |
| Research Features/Zeitreihen | `../research/` (Bericht) |
| Research Hanglage/Terrain | `../research/` (Bericht) |
| Folgephase | `../pipelines/anomaly_local_v1/phase8_bev_hygiene_plan.md` |
