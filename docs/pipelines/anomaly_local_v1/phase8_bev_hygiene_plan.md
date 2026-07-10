# `anomaly_local_v1` Phase 8: BEV und Assignment-Hygiene

**Stand:** 2026-07-10

**Status:** teilweise abgeschlossen; v4 integriert, RC geprueft und nicht akzeptiert

**Autoritativ fuer:** Ticketstatus, Abhaengigkeiten und Restumfang von Phase 8

**Aktualisieren wenn:** ein Phase-8-Ticket abgeschlossen, verworfen, neu geschnitten oder extern entblockt wird

## Ziel und aktueller Endpunkt

Phase 8 hat den Wechsel zu BEV als Standard-Gebaeudequelle mit einer zweiten
Stufe der Assignment-Hygiene verbunden. Aktiver Endpunkt ist
`local_hdbscan_rulegate_v4_k2xhf_diffv2`:

- quellenabhaengige BEV-Hoehen fuer Buffer und Plausibilitaet;
- kartierungsfreie Trennung von Hauptbau, Anbau und Fremdreflektor;
- `cluster_kind = standard | annex | foreign`;
- differenzielle Bewegung als `none | candidate | significant | confirmed`;
- Reinheitsgates, Punkt-Pins, Label-Metriken, Visual Audit und Survivors-Pass.

Der detaillierte Entscheidungs- und Gate-Verlauf steht im
[`phase8_integration_report.md`](artifacts/phase8_integration_report.md). Die
aktive Modelllogik steht ausschliesslich in [`methodik.md`](methodik.md).

Der formale RC-Lauf ist abgeschlossen und wegen zwei roten Befunden nicht
akzeptiert. Details:
[`phase8_v4_rc_gate_results.md`](artifacts/phase8_v4_rc_gate_results.md),
[`phase8_v4_rc_gate_results.json`](artifacts/phase8_v4_rc_gate_results.json) und
[`phase8_v4_rc_visual_audit.md`](artifacts/phase8_v4_rc_visual_audit.md).

## Rahmenbedingungen

- Es gibt keine ausreichende zeitliche SNT/TSX-Ueberlappung fuer eine belastbare
  Motion-Ablation. P8-E-W2 bleibt extern blockiert.
- Es gibt noch keine unabhaengige Experten-Ground-Truth. Die Evaluation nutzt
  internen Label-Korpus, Referenzfaelle, Scorecards, flache Cross-Track-Faelle
  und Visual Audits.
- Der 1-m-DGM/DOM-Datenstand ist vorbereitet, aber nicht produktiv abgeleitet,
  geladen oder re-baselined.

## Statusmatrix

| Ticket | Ergebnis | Status | Evidenz / Restpunkt |
|---|---|---|---|
| P8-A-W1-T1 Hoehen-Mapping | BEV nutzt `height_max_m` fuer Candidate Area und `height_median_m` fuer Plausibilitaet; Fallback jeweils `height_m` | erledigt | aktive Methodik und v4-Pipeline |
| P8-A-W1-T2 GBA->BEV-Referenzmapping | Referenzfaelle koennen BEV-Gebaeuden zugeordnet werden | erledigt | `artifacts/phase7_reference_cases.json` |
| P8-A-W1-T3 BEV-Abdeckungs-Audit | Abdeckung und Footprint-Unterschiede dokumentiert | erledigt | `artifacts/phase8_bev_coverage_audit.md` |
| P8-A-W2-T1 BEV als Standard | BEV ist Produktiv-/UI-Default; v4-Baselinekette enthaelt sieben GBA- und drei BEV-AOIs | teilweise erledigt | weitere BEV-Pflichtfaelle, besonders Bad Gastein, bleiben offen |
| P8-B-W1-T1 Anti-Layover | laeuft fuer alle Zuordnungsmethoden; v4 routet Evidenz nach `foreign` | erledigt | v4-Scorecard und Punkt-Pins |
| P8-B-W1-T2 Layover-Reichweite | quellenabhaengiger Reichweitencheck integriert | erledigt | bei GBA Annex-Evidenz, bei BEV unplausible Reichweite Foreign-Evidenz |
| P8-B-W1-T3 Polygon-aware Cross-Look-Excess | als eigener polygonbewusster Ersatz der Zentroidlogik vorgesehen | offen | braucht gezielte lange/breite Footprint-Gegenbeispiele |
| P8-B-W1-T4 Checks fuer alle Zuordnungsarten | Component Separator laeuft auch fuer `within` und `directional_buffer` | erledigt | v4-Referenzpins |
| P8-B-W2-T1 Komposit `k2xh` | Bauteil-Trenner integriert und spaeter durch v4-Evidenzklassen korrigiert | erledigt | Integrationsreport v3/v4 |
| P8-B-W2-T2 Visual Audit + Survivors-Pass | fuer die Integrationsshortlist durchgefuehrt | erledigt | Phase-7-/Phase-8-Audit-Artefakte; neue v4-Watch-Items bleiben offen |
| P8-B-W2-T3 Integration | v4 ist aktives Modellset | erledigt | `MODEL_SET_VERSION` und v4-Baselines |
| P8-B-W2-T4 Differential Motion v2 | Level, Evidenz, Mindeststuetzung und Downgrades integriert | erledigt | 96959851 bleibt Kandidat; Fremdcluster sind keine Quelle |
| P8-C-W1 Feature-Achsen/Ablation | Research-Berichte liegen vor; kontrollierte Injection-/Ablationsmatrix fehlt | offen | keine produktive Feature-Aenderung ohne Gates |
| P8-D-W1-T1 Label-Korpus-Ausbau | v4-Stand: zehn Gebaeude, 46 Punkte | teilweise erledigt | auf 20-40 stratifizierte Gebaeude und unabhaengige Gegenlabels erweitern |
| P8-D-W1-T2 Label-Metriken | automatischer Scorecard-Block inklusive Reinheitsgates | erledigt | bei jeder neuen semantischen Kategorie erweitern |
| P8-E-W1 Motion-Ablationsdesign/Tooling | Bad-Gastein-SNT/TSX-Vergleich vorhanden, aber noch gebietsspezifisch | teilweise erledigt | auf beliebige gebiets-/datasetkompatible Paare generalisieren |
| P8-E-W2 Motion-Ablation | belastbare Overlap-Daten fehlen | extern blockiert | erst nach Datenlieferung re-baselinen und auswerten |
| P8-F Annex/Foreign-Korrektur | getrennte Evidenzklassen, `foreign`-Routing, Reinheitsgates und v4-Re-Baseline | erledigt | RC bestaetigt Paritaet und Reinheit; rote Folgepunkte sind 96637447 und R9 |
| P8-RC Release-Candidate-Gate | Smoke, 10/10 No-op, Paritaet und Visual Audit ausgefuehrt | geprueft, nicht akzeptiert | autoritative Gate-Artefakte; zwei rote Befunde |
| P8-RC Harness-Performance | Geometrie-Extras um semantikgleiche indexierbare BBox ergaenzt | erledigt | sieben Quellen-/AOI-Kombinationen, null Kandidatenausschluss, EXPLAIN-Kosten ca. 24,5x niedriger |

## Verbindliche v4-Gegenbeispiele

- **96959851:** Die baulich verbundenen Punkte NTC3CYZ01/NTDA86J01 muessen
  getrennt vom Main als `annex` erhalten bleiben; Hauptdachpunkte bleiben im
  Main, O2HC2XV01 nicht. Differential-Level erwartet: `candidate`.
- **96637447:** Anti-Layover-/Foreign-Punkte duerfen keine
  Differentialaussage tragen; echte Dachkerne bleiben erhalten. Im RC blieb
  das Level ohne neue visuelle Evidenz `candidate` statt des erwarteten `none`;
  der Fall ist deshalb rot und fachlich neu zu entscheiden.
- **113309836:** Status- oder Vorzeichenwechsel nur mit geprueftem Motion-Pfad;
  bleibt Watch-Item fuer TSX-/Motion-Aufwertungen.
- **v4-Reinheit:** `foreign_in_annex=0`, `annex_in_foreign=0`; keine neue
  semantische Kategorie ohne Kompositionsstatistik und maschinelle Punkt-Pins.

## Offene Phase-8-Arbeit

Die Priorisierung und fachliche Beschreibung dieser Punkte steht in
[`next_steps.md`](next_steps.md); hier wird nur ihr Phase-8-Status gefuehrt:

1. `96637447` fachlich klaeren und die Level-Erwartung maschinell pinnen.
2. R9 beheben: Referenzlabels/Punkt-Pins nach `building_source` trennen und das
   absolute Roof-Loss-Gate fuer `NSVF80S01` erneut auswerten.
3. Point-MVT-Latenz aus dem Smoke (rund 57,6 s) separat profilieren.
4. Polygon-aware Cross-Look-Excess gegen lange, breite und unregelmaessige
   Footprints evaluieren.
5. Feature-Achsen aus Zeitreihen-/Terrain-Research per Injection und Ablation
   testen, ohne voreilige Produktionsintegration.
6. Label-Korpus stratifiziert erweitern und eine unabhaengige Gegenpruefung
   etablieren.
7. Motion-Vergleichstooling generalisieren; volle Ablation bleibt bis zur
   Overlap-Datenlieferung blockiert.
8. 1-m-DGM/DOM als ausdruecklichen Datenstandswechsel verarbeiten und alle
   betroffenen Baselines neu aufbauen.

## Gate-Vertrag

Jede weitere Integration braucht:

- No-op-Vergleich gegen den passenden eingefrorenen Daten-/Modellstand;
- Referenzfall- und Punkt-Pin-Gates;
- Label-, Reinheits- und Roof-Loss-Metriken;
- Visual Audit plus Survivors-Pass;
- eindeutige Entscheidung `green`, `red` oder `inconclusive` mit Eintrag in
  [`iterations.md`](iterations.md).

Historische v3-Experimente und ihre damalige Begrifflichkeit bleiben in den
eingefrorenen Artefakten erhalten. Sie beschreiben nicht die aktive Methodik.
