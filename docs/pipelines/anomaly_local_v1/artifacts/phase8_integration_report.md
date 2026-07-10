# Phase 8: Integrationsreport v4 (`k2xhf_diffv2`)

**Stand:** 2026-07-10

**Status:** v4 integriert; Release Candidate geprueft, nicht akzeptiert

**Autoritativ fuer:** Integrationsentscheidung, Evidenz und Lessons Learned des Phase-8-v4-Modellwechsels

**Aktualisieren wenn:** neue Evidenz die v4-Integrationsentscheidung korrigiert oder ein formaler Integrationsnachtrag erforderlich wird

**Aktives Modellset:** `local_hdbscan_rulegate_v4_k2xhf_diffv2`

**Phase-8-Plan:** [`../phase8_bev_hygiene_plan.md`](../phase8_bev_hygiene_plan.md)

**Aktive Methodik:** [`../methodik.md`](../methodik.md)

## Entscheidung

v4 ist der integrierte Forschungsstand. Die Version korrigiert die semantische
Fehlablage aus v3: technisch richtig erkannte Fremdpunkte werden nicht mehr in
einer allgemeinen Anbaukategorie gesammelt, sondern nach Evidenz als `annex`
oder `foreign` getrennt. Das P0-v4-Release-Candidate-Gate hat diesen Stand
end-to-end geprueft. Ergebnis: **v4 RC geprueft, nicht akzeptiert**. Das aendert
nicht rueckwirkend die Integrationsentscheidung, ist aber die verbindliche
aktuelle Freigabeaussage.

Autoritative RC-Evidenz:

- [`phase8_v4_rc_gate_results.md`](phase8_v4_rc_gate_results.md)
- [`phase8_v4_rc_gate_results.json`](phase8_v4_rc_gate_results.json)
- [`phase8_v4_rc_visual_audit.md`](phase8_v4_rc_visual_audit.md)
- [`phase8_v4_rc_automated_smoke.md`](phase8_v4_rc_automated_smoke.md)

Der RC bestaetigte 17 Smoke-Checks, 10/10 bitidentische No-op-AOIs, null
Paritaetsmismatches, null fehlende v4-Level sowie den
`cluster_kind`-/Foreign-Vertrag. Rot bleiben `96637447` (`candidate` statt
erwartetem `none`, ohne neue visuelle Evidenz) und das absolute Roof-Loss-Gate
fuer `NSVF80S01` in `moosstrasse_bev` (bekannter R9-Quell-Mismatch).

## Was v4 produktiv macht

### 1. BEV und Hoehenvertrag

- BEV ist Standard-Gebaeudequelle.
- BEV nutzt `height_max_m` (Fallback `height_m`) fuer Candidate Area und
  Layover-Reichweite sowie `height_median_m` (Fallback `height_m`) fuer
  Plausibilitaet.
- GBA bleibt Vergleichsquelle mit dem davor gueltigen Hoehenvertrag.

### 2. Component Separator

Kartierungsfreie Checks laufen nach der Quer-Versatz-Politik fuer alle
Zuordnungsmethoden:

- `a6_antilayover`: Versatz entgegen der physikalischen Layover-Richtung;
- `a7_reach`: implizite Reflektorhoehe gegen quellenabhaengige plausible Hoehe;
- `a8_heightprofile`: relatives einseitiges Hoehenband unter gestuetzten
  Dachankern.

Die v4-Evidenzklassen werden als `cluster_kind = standard | annex | foreign`
ausgegeben:

- `annex`: strukturell plausibler, kinematisch gestuetzter Anbaucluster; nie
  Main, aber moegliche Differentialquelle.
- `foreign`: Anti-Layover beziehungsweise im BEV-Kontext unplausible
  Reichweitenevidenz; nie Main, nie verlaesslicher Cluster und nie
  Differentialquelle.

### 3. Differenzielle Bewegung v2

Die aktive Semantik ist ausschliesslich
`none | candidate | significant | confirmed`. Signifikanz verlangt analytische
Unsicherheitspruefung und mindestens drei Punkte pro beteiligtem Cluster;
`confirmed` zusaetzlich eine gleichgerichtete zweite Geometrie. Saisonale und
Amplituden-Plausibilitaet koennen downgraden. Ein Reliability-Abzug von `0.15`
greift erst bei `significant` oder `confirmed`.

## Integrationsgates

### Baseline und Referenzfaelle

- No-op: 10/10 AOIs bitidentisch gegen die frischen v4-Baselines (sieben GBA,
  drei BEV); Kette in `phase7_baseline_summary.md`.
- 96959851: baulich verbundene Punkte getrennt im Anbaucluster,
  Hauptdachpunkte im Main, O2HC2XV01 nicht zugeordnet; Level bleibt
  `candidate`.
- 96637447: vier Anti-Layover-Cores gefangen und echte Dachkerne erhalten;
  der reproduzierte RC-Stand bleibt dennoch `candidate` statt erwartetem
  `none`. Ohne neue visuelle Evidenz ist dies ein roter fachlicher Befund.
- v4-Label-Korpus: zehn Gebaeude/46 Punkte, Foreign 10/10 erkannt, Annex 2/2
  getrennt. Das absolute Gate meldet `NSVF80S01` in `moosstrasse_bev` als
  Roof-Loss. Der bekannte BEV/GBA-Doppel-Grading-Fall R9 erklaert die
  Quelleninkonsistenz, neutralisiert das rote Gate aber nicht.

### Semantische Reinheit

- `foreign_in_annex=0`
- `annex_in_foreign=0`
- keine Differentialaussage aus Foreign-Clustern oder Clustern mit
  Anti-Layover-Punkten
- Referenzfaelle enthalten maschinelle Punkt-Pins statt nur Prosaerwartungen

Die Vergleichsvariante `sepcls_strict` (nur Hoehenausreisser als Anbau) ist
bewusst rot: Sie zerbricht den durch Google-Earth-3D-Evidenz gestuetzten
Anbaufall 96959851. Dieser Gegenversuch stuetzt die v4-Regel
`anti_foreign` statt einer pauschal strengeren Trennung.

## Wirkung der Korrektur

- 21 statt 50 aktive Differentialbewertungen ueber die zehn Baselines.
- 32 Schein-Differentials an Fremdpunkt-Clustern entfallen, darunter drei zuvor
  signifikante Befunde mit Reliability-Wirkung.
- Kein aktiver Befund haengt an einem `foreign`-Cluster oder Anti-Layover-Punkt.
- 96959851 bleibt als strukturell gestuetzter Anbaufall `candidate`.

## Ausloeser und Lessons Learned

Ausloeser war ein Viewer-Befund am BEV-Lauf `85953608`, Gebaeude
`{A9A7E442-...}`: Die t44-Punkte O2G57QB01 und O2GQNC301 lagen auf der
Anti-Layover-Seite, waren technisch erkannt, aber in v3 trotzdem als Anbau
etikettiert. Die Detektion war richtig, die Ergebnissemantik falsch.

Warum v3-Gates das nicht erkannten:

1. Die alte Label-Metrik wertete „Foreign erkannt, aber als Annex abgelegt“ als
   Erfolg.
2. Referenzfaelle pinnten ueberwiegend Gebaeudestatus statt konkreter
   Punkt-/Kategorienerwartungen.
3. Es fehlte eine Kompositionsstatistik der neuen Kategorie.

Verbindliche Folgerung:

- Jede neue semantische Kategorie erhaelt ab Tag 1 eine
  Reinheits-/Kompositionsmetrik.
- Fehlablage zwischen Kategorien ist ein eigener Failure State.
- Kritische Erwartungen werden als maschinelle Punkt-Pins gefuehrt.
- Visual Audit und Survivors-Pass bleiben Pflicht, auch bei gruenen
  aggregierten Scorecards.

## RC-Folgepunkte

Die priorisierte Beschreibung steht ausschliesslich in
[`../next_steps.md`](../next_steps.md): fachliche Klaerung von `96637447`,
quellenspezifische Reference Labels fuer R9 und Point-MVT-Performance. Der
Smoke beobachtete fuer ein korrektes Point-MVT rund 57,6 s Antwortzeit.

Der Harness-Flaschenhals in der Geometrie-Extras-Abfrage wurde ohne
Semantikaenderung indexierbar gemacht: Eine konservative BBox-Vorbedingung
schliesst in sieben eindeutigen Quellen-/AOI-Kombinationen keinen Kandidaten
aus; das exakte Geography-`ST_DWithin` und die Sortierung bleiben bestehen.
Die EXPLAIN-Gesamtkosten im BEV-Moosstrasse-Fall sanken um etwa Faktor 24,5.
Diese Optimierung wirkt auf kuenftige Harness-Laeufe und loest nicht
automatisch die Point-MVT-Warnung.

## Historischer v3-Stand

`local_hdbscan_rulegate_v3_k2xh_diffv2` integrierte erstmals den
Bauteil-Trenner und das Differential-Level. Alle Separation Candidates liefen
damals in eine gemeinsame Anbaukategorie. Je nach AOI bestanden 65-86 % dieser
Cluster jedoch aus Fremdpunktfaellen; dadurch entstanden 14 Kandidaten und drei
signifikante Scheinbefunde. v4 ersetzt diese Semantik vollstaendig.

Die zugehoerigen v3-Baselines, Scorecards und Screenshots bleiben eingefrorene
historische Artefakte. Sie werden nicht auf v4-Begriffe umgeschrieben.
