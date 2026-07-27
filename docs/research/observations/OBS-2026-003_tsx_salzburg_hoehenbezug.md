# OBS-2026-003: Salzburg-TSX-Lieferung 2020 mit abweichendem Hoehenbezug

**Beobachtet:** 2026-07-27

**Status:** offen

**Entscheidungsstand:** unentschieden

**Bereich:** Daten / Hoehenbezug / Vertikaldatum

**Ursprung:** Nutzerhinweis (Erinnerung an unterschiedliche Hoehenangaben je
Lieferung) mit anschliessender PostGIS-Verifikation

**Evidenzstaerke:** stark (DB-verifiziert, raeumlich eng gegengeprueft)

**Dringlichkeit:** noch nicht bewertet; relevant fuer P1-7/P1-11
(DGM/DOM-Abgleich), bevor absolute Hoehen quellenuebergreifend verglichen
werden

## Beobachtung

Beide verbindlichen Handbuecher legen die Punkthoehen auf das
WGS-84-Ellipsoid fest (AUGMENTERRA v1.3 S. 23; TRE Altamira 2.2 S. 28/36).
Die empirische Pruefung gegen den SRTM-Terrainkontext (orthometrisch,
EGM96) zeigt jedoch, dass **eine Lieferung abweicht**: Die
Salzburg-TSX-Lieferung `SALZBURG_EXTENDED_TSX_T93_D_APR2020_ES2830A2S`
(TRE Altamira, Reportdatum 2020-09-15) liegt im SRTM-Rahmen, nicht im
Ellipsoid-Rahmen.

## Verifizierte Fakten (PostGIS, 2026-07-27)

Median von `insar_points.height - insar_point_terrain.terrain_elevation_m`
je Dataset/Track (SRTM = orthometrisch; ellipsoidische Hoehen muessten im
Raum Salzburg ~47 m darueber liegen):

| Dataset | Track | n | Median-Differenz |
|---|---|---:|---:|
| salzburg_snt | 44 | 247.388 | +47,4 m |
| salzburg_snt | 95 | 303.376 | +46,3 m |
| **salzburg_tsx_t93_d** | **93** | **923.017** | **-0,4 m** |
| bad_gastein_snt | 22 | 78.226 | +52,5 m |
| bad_gastein_snt | 44 | 127.384 | +48,7 m |
| bad_gastein_snt | 95 | 119.973 | +49,4 m |
| bad_gastein_tsx_paz | 70 | 288.146 | +51,8 m |
| bad_gastein_tsx_paz | 93 | 512.017 | +49,6 m |

Gegenprobe im engen Mirabell-Ausschnitt (`13.040,47.803,13.046,47.808`),
also identische Lokation fuer beide Sensoren:

| Dataset | Track | n | p10 | Median | p90 |
|---|---|---:|---:|---:|---:|
| salzburg_snt | 44 | 2.279 | +35,8 | +47,3 | +59,1 |
| salzburg_snt | 95 | 2.532 | +34,7 | +45,4 | +56,5 |
| salzburg_tsx_t93_d | 93 | 3.504 | -10,0 | -0,9 | +11,5 |

Die absoluten TSX-Hoehen (Median 431,4 m) entsprechen der orthometrischen
Gelaendehoehe der Stadt Salzburg; die SNT-Hoehen (Median ~474 m) liegen um
die Geoid-Undulation darueber. Ein Abdeckungs- oder Auswahlartefakt ist
durch die enge Gegenprobe ausgeschlossen.

Weitere Befunde:

1. Der Lieferreport `ES2830A2S.pdf` nennt nur "WGS 1984" als
   Koordinatenreferenz und macht **keine** explizite Vertikaldatum-Angabe;
   die `.prj` ist rein horizontal (GEOGCS).
2. Die neuere Bad-Gastein-TSX/PAZ-Lieferung ist dagegen konsistent
   ellipsoidisch wie alle SNT-Lieferungen.

## Hypothesen (nicht entschieden)

- Die 2020er-Lieferung referenziert die Hoehen auf das im Processing
  verwendete Gelaendemodell bzw. auf orthometrische Hoehen (EGM96 oder
  aehnlich), abweichend vom Handbuch-Standard.
- Moeglich ist auch eine nachtraegliche Umrechnung vor der Lieferung.
- Welche weiteren (insbesondere aeltere) Lieferungen betroffen sind, ist
  unbekannt.

## Warum relevant?

- Quellenuebergreifende absolute Hoehenvergleiche (InSAR-Punkt vs.
  BEV-Hoehe vs. 1-m-DGM/DOM, geplant in P1-11) sind ohne
  lieferungsspezifische Vertikaldatum-Behandlung um ~47 m verfaelscht.
- Hoehenabhaengige Logik der Pipeline (z. B. `height_rank_in_building`,
  Hoehenprofil-Checks) arbeitet innerhalb einer Lieferung relativ und ist
  davon nicht unmittelbar betroffen; gemischte Nutzung mehrerer
  Lieferungen desselben Gebiets waere es sehr wohl.
- Die Handbuecher sind als Source of Truth fuer diesen Punkt nicht
  hinreichend; der Explainer-Faktenvertrag (`insarFacts.ts`) kennzeichnet
  Hoehen derzeit pauschal als ellipsoidisch und braucht bei Bestaetigung
  eine Fussnote (dokumentierte Quellen-Diskrepanz, nicht mitteln).

## Offene Fragen

1. Auf welches Vertikaldatum referenziert die 2020er-Salzburg-TSX-Lieferung
   tatsaechlich (EGM96, Processing-DEM, anderes)?
2. Sind weitere Lieferungen betroffen? Gibt es eine AUGMENTERRA-/TRE-Angabe
   je Lieferung?
3. Soll die Pipeline einen expliziten `height_datum`-Vermerk je Dataset
   fuehren?

## Naechster sinnvoller Klaerungsschritt

Frage an AUGMENTERRA beim Meeting 2026-09-24 (Themenspeicher im
[`Meeting-Plan`](../../meetings/2026-09-24_augmenterra_meeting_plan.md)),
mit dieser Tabelle als Evidenz. Danach entscheiden, ob ein
`height_datum`-Feld je Dataset eingefuehrt wird.

## Triage und Weiterleitung

- Triage: noch offen
- `next_steps.md`: Hinweis im P1-7-Standblock (Vertikaldatum)
- Research-Dokument: noch keines
- Decision Record: noch keiner
- Execution Plan: keiner
- aktive Methodik: unveraendert
