# Phase 7 - Kandidaten-Shortlist (P7-D-W1-T1)

Stand: 2026-06-10 (Session 2, nach Vorarbeiten V1-V4 und Schritt 5).
Maximal 3 Kandidaten + Baseline; jedes Delta ist klein, isoliert
erklaerbar und ohne unerklaerte Effektvermischung.

## Baseline

`noop` = Produktionsverhalten (HDBSCAN eom, mcs-Fraction 0.2/Cap 8/Floor 2,
min_samples=half, Assignment-Kette within -> directional_buffer -> nearest,
Small-N-Pseudo-Core, Borderline-Reassignment an). Punktidentisch zu den
persistierten Baseline-Runs (fortlaufend per --verify-noop belegt).

## Kandidaten

### K2x = a5_crosslook + smalln_strict (HAUPTKANDIDAT)

- Delta 1 (a5_crosslook): nearest-Punkte werden demotiert (sichtbar, aber
  ohne Cluster-/Score-Beitrag), wenn ihr |cross_look_offset_m| die
  selbstkalibrierte Gebaeude-x-Track-Toleranz ueberschreitet
  (median + 3*1.4826*MAD der within/directional-Anker + 3 m + sqrt(eff_area));
  ohne geometrische Anker werden alle nearest demotiert.
  Physikalische Begruendung: Laengs-Versatz kann Radarprojektion sein,
  Quer-Versatz nicht (Fall 96959851, bestaetigt).
- Delta 2 (smalln_strict): Small-N-Gruppen ohne Velocity-Konsistenz werden
  ehrlicher `weak_support` statt Pseudo-Core.
- Evidenz: candidate_green (phase7_scorecard_candidates); loest den
  bestaetigten Carport-Fall normativ (ok MIT sauberem Cluster); vermeidet
  den a1-Aufblaeh-Effekt (Hangfaelle bleiben noise_dominated); Cross-Track
  bg_flat_01_snt 0.6646 vs Baseline 0.5619; Demotionsvolumen deutlich
  unter a1 (moosstrasse 360 vs 613).
- Offener Audit-Punkt: vereinzelte noise_dominated->ok-Aufwertungen in TSX
  (audit-pflichtig, P7-D-W1-T3).

### K1 = smalln_strict (konservative Option)

- Nur Delta 2. Kleinster Eingriff, candidate_green seit Schritt 4,
  14/14 Referenzfaelle ohne Toleranz-Bedarf. Loest die
  Fremdpunkt-Problematik NICHT (96959851 bleibt kontaminiert-ok).

### K3 = a3_height (Alternative)

- Nur Hoehen-Delta: nearest mit Bodenobjekt-Hoehenprofil
  (height - terrain < p25(within) - 2 m) werden demotiert.
- candidate_green (mit CLAIM_RANK-Toleranz); minimale Ehrlichkeitskosten;
  loest 96959851 (-> single_track_only), aber nicht die Faelle ohne
  Hoehensignal (96856632 bleibt unveraendert); abhaengig von der
  GBA-/Terrain-Hoehenqualitaet (Hoehen-Audit P7-A-W1-T6).

## Explizit verworfen

- `k2 = a1_demote + smalln_strict`: candidate_red - pauschale Demotion
  veraendert das kept-Set so stark, dass mcs-Fraction/RobustScaler
  Cluster aufblaehen und Hang-Gebaeude kosmetisch auf ok springen
  (54773363, 238057563; Einzelfall-Untersuchung in V1). Der a1-Kern
  ("nearest ohne Begruendung praegen den Score nicht") lebt in k2x
  selektiv und ohne den Nebeneffekt weiter.
- Alle 12 Parameter-/Feature-Achsen auf k2x-Basis (V4): 11 red,
  1 wirkungslos -> Parameter sind nicht der Engpass.
- Alle 10 OPTICS-Varianten (S5-T1): no_alt_gain.
- leaf/spatial fuer High-N/TSX (S5-T2): realer TSX-Effekt, aber
  SNT-Degradation + Wegfall der noise_dominated-Diagnoseklasse ->
  Folgephase (regime-konditional).

## Naechste Schritte (P7-D-W1-T2/T3)

1. Volle Scorecard (Cross-Track, HR, Konfidenz; flach/Hang getrennt).
2. Persistierung aller drei Kandidaten auf allen 7 AOIs (P7-V2-Pfad);
   Run-IDs in phase7_persisted_runs.json.
3. Visual-Audit >= 12 Faelle Baseline vs. Kandidat (inkl. der
   audit-pflichtigen TSX-Aufwertungen unter k2x).
