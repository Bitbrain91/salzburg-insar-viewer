/**
 * Zahlen- und Formel-Vertrag des Explainers „Entstehung der InSAR-Datenpunkte".
 *
 * Quellen der Wahrheit (Seitenzitate an jeder Konstante):
 * - TRE  = docs/research/external/TREALTAMIRA_handbook_2.2_20180604.pdf
 *          (Seitenzahlen = gedruckte Nummerierung „Page X of 70" = PDF-Seite − 1)
 * - AUG  = docs/research/external/AUGMENTERRA_InSAR_Handbook_v1_3.pdf
 *          (Seitenzahlen = gedruckte Nummerierung in der Fußzeile = PDF-Seite − 1)
 * - REPORT = Lieferreport ES2830A2S (data/Daten/SALZBURG_EXTENDED_TSX_T93_D_APR2020_ES2830A2S/)
 * - INVENTAR = docs/research/Datenanalyse_InSAR_Salzburg.md (Sentinel-Bestand Salzburg)
 *
 * Regeln:
 * - Keine dieser Zahlen wird in Komponenten hartkodiert; Diagramme rechnen
 *   live über die Funktionen unten (Muster: facts.ts / silverFacts.ts).
 * - Dokumentierte Quellen-Diskrepanzen werden NIE gemittelt, sondern über
 *   `FOOTNOTES` sichtbar gemacht.
 * - Didaktische Beispieldaten (Stadtszene, Streu-Offsets) sind deterministisch
 *   und als solche gekennzeichnet — kein Math.random() im Render.
 */

export type SensorId = "s1" | "tsx";

/** Geltungsbereich einer Aussage — Grundlage der ScopeBadge-Kennzeichnung. */
export type Scope = "allgemein" | "s1" | "tsx";

/** Quellen-Chips für Header und TechDetails. */
export const SOURCES = {
  tre: {
    kurz: "TRE Altamira Handbook 2.2 (2018)",
    datei: "TREALTAMIRA_handbook_2.2_20180604.pdf",
    rolle: "Detailquelle",
  },
  aug: {
    kurz: "AUGMENTERRA InSAR-Handbuch v1.3",
    datei: "AUGMENTERRA_InSAR_Handbook_v1_3.pdf",
    rolle: "Überblicksquelle",
  },
  report: {
    kurz: "TSX-Lieferreport ES2830A2S (2020)",
    datei: "SALZBURG_EXTENDED_TSX_T93_D_APR2020_ES2830A2S.pdf",
    rolle: "Salzburg-Realdaten TSX",
  },
  inventar: {
    kurz: "Datenanalyse InSAR Salzburg",
    datei: "docs/research/Datenanalyse_InSAR_Salzburg.md",
    rolle: "Salzburg-Realdaten Sentinel-1",
  },
} as const;

/* ------------------------------------------------------------------ */
/* Sensoren                                                            */
/* ------------------------------------------------------------------ */

export const sensors = {
  s1: {
    id: "s1" as const,
    name: "Sentinel-1",
    band: "C" as const,
    /** AUG S.7 f. „≈5,6 cm"; TRE Tab.8 S.56 nennt 5,93 → FOOTNOTES.s1Wavelength. */
    wavelengthCm: 5.6,
    /** IW-Modus: 5 m in Range × 20 m in Azimut (TRE Tab.8 S.56; AUG S.5 „20 x 5 m (IW Modus)"). */
    cellRangeM: 5,
    cellAzimuthM: 20,
    modeLabel: "IW (Interferometric Wide Swath)",
    /** AUG S.5: bis 6 Tage (2 Satelliten); seit Ausfall S-1B (Dez. 2021) 12 Tage. */
    revisitDaysOptions: [6, 12] as const,
    defaultRevisitDays: 12,
    /** Einfallswinkel-Spanne, AUG S.10 („bei Sentinel ca. 20–46°"). */
    thetaDegRange: [20, 46] as const,
  },
  tsx: {
    id: "tsx" as const,
    name: "TerraSAR-X",
    band: "X" as const,
    /** TRE Tab.8 S.56 und REPORT S.2: 3,11 cm. */
    wavelengthCm: 3.11,
    /** Stripmap: 3 × 3 m (TRE Tab.8 S.56) — der Modus der Salzburg-Daten (REPORT S.2, SM013). */
    cellRangeM: 3,
    cellAzimuthM: 3,
    modeLabel: "Stripmap",
    /** Weitere TSX-Modi (TRE Tab.8 S.56) — nur als Fußnote/Preset. High-Res Spotlight 1×1 m;
     *  Staring Spotlight 1 m (Range) × 0,25 m (Azimut) — KEINE 0,25×0,25-Zelle. */
    hiResM: 1,
    staringRangeM: 1,
    staringAzimuthM: 0.25,
    /** TRE Tab.8 S.56. */
    revisitDaysOptions: [11] as const,
    defaultRevisitDays: 11,
    /** Einfallswinkel-Spanne, AUG S.10 („TerraSAR-X 20–60°"). */
    thetaDegRange: [20, 60] as const,
  },
} as const;

export const sensorIds: SensorId[] = ["s1", "tsx"];

/* ------------------------------------------------------------------ */
/* Genauigkeiten (sensorspezifisch) und ihre Geltungsbedingungen        */
/* ------------------------------------------------------------------ */

/**
 * Geokodierungs-Präzision 1σ in Metern — TRE Tab.1 S.13 (identisch AUG
 * Tab.1 S.14, Ausnahme Ost-Wert S1 → FOOTNOTES.s1EastAccuracy).
 * Die Quellen nennen die Werte „precision" — im UI als „Präzision (1σ)"
 * ausweisen, nicht als „Genauigkeit". Gilt NUR unter `geoConditions`!
 */
export const geoAccuracy1Sigma = {
  tsx: { northM: 1, eastM: 3, heightM: 1.5 },
  s1: { northM: 8, eastM: 12, heightM: 8 },
} as const;

/** Geltungsbedingungen der GEOKODIERUNGS-Präzision: TRE Tab.1 S.13 (ohne Zeitspanne!). */
export const geoConditions = {
  maxRefDistanceKm: 1,
  minScenes: 30,
} as const;

/** Geltungsbedingungen der BEWEGUNGS-Präzision: TRE Tab.2 S.14–15 (zusätzlich ≥2 Jahre). */
export const rateConditions = {
  maxRefDistanceKm: 1,
  minScenes: 30,
  minTimespanYears: 2,
} as const;

/** Verschiebungs-Präzision (beide Sensoren): TRE Tab.2 S.14–15; AUG Tab.2 S.15. */
export const rateAccuracy = {
  sigmaRateMmPerYear: 1, // σ der mittleren Rate: < 1 mm/Jahr
  singleMeasurementMm: 5, // Einzelmessung: „im Mittel innerhalb ±5 mm" (TRE „average within 5 mm")
} as const;

/**
 * ZWEI verschiedene Kohärenz-Begriffe — nicht vermischen (TRE S.15 f.:
 * temporale Kohärenz „not to be confused with the interferogram coherence"):
 * - Interferogramm-Kohärenz: Qualität EINES Interferogramms; unter 0,5
 *   gilt es als unzuverlässig/Rauschen (TRE §11.2.2 S.60).
 * - Geliefertes Punkt-Attribut `coherence`: EIN Skalar je Messpunkt über
 *   den ganzen Stapel (temporale/Modell-Kohärenz); ab 0,7 zuverlässig
 *   (AUG Appendix S.24 f.).
 */
export const coherence = {
  interferogramUnreliableBelow: 0.5,
  attributeReliableAbove: 0.7,
} as const;

/** Mindest-Bildstapel gleicher Geometrie/Modus: TRE §2.1 S.10 („at least
 *  15-20 SAR images"); AUG S.13 („mindestens 15 bis 20 Bildern"). */
export const minScenesSameGeometry = { min: 15, max: 20 } as const;

/**
 * Einschwingzeit bis σ(Rate) < 1 mm/a — TRE Fig.5 S.15–16, SCHEMATISCH und
 * nur unter den Szenario-Annahmen der Abbildung gültig (`assumptions`).
 */
export const convergence = {
  tsx: { monthsToSigma1: [15, 18] as const, scenesApprox: 45 },
  s1: { monthsToSigma1: [19, 20] as const, scenesApprox: 50 },
  /** Annahmen der TRE-Fig.-5-Kurven — beim Anzeigen der Fenster mit nennen. */
  assumptions: {
    atmoNoiseMm2: 9,
    maxRefDistanceKm: 4,
    note: "volle zeitliche Aufnahmerate",
  },
} as const;

/**
 * Dokumentierte Quellen-Diskrepanzen — werden von SensorFaceoff/TechDetails
 * als Fußnoten gerendert, nie stillschweigend aufgelöst.
 */
export const FOOTNOTES = {
  s1Wavelength:
    "Wellenlänge Sentinel-1: AUGMENTERRA nennt ≈5,6 cm (S.7 f.), TRE Altamira 5,93 cm " +
    "(Tab.8 S.56). Der Explainer rechnet mit 5,6 cm — konsistent mit der λ/4-Grenze von " +
    "1,4 cm, die beide Handbücher für C-Band angeben.",
  s1EastAccuracy:
    "Ost-Präzision Sentinel-1: TRE Altamira Tab.1 S.13 nennt ±12 m, AUGMENTERRA Tab.1 " +
    "S.14 ±8 m. Der Explainer zeigt den konservativeren TRE-Wert.",
  tsxCellModes:
    "TerraSAR-X-Zellgröße ist modusabhängig: Stripmap 3×3 m (Salzburg-Modus), High-Res " +
    "Spotlight 1×1 m, Staring Spotlight 1 × 0,25 m in Range × Azimut (TRE Tab.8 S.56). " +
    "Nicht der Salzburger Modus.",
  s1Revisit:
    "6 Tage Wiederkehr galten mit beiden Satelliten (S-1A + S-1B); seit dem Ausfall von " +
    "S-1B im Dezember 2021 sind es 12 Tage (AUG S.5).",
  aliasingProse:
    "Beide Handbücher nennen im Fließtext an einer Stelle die halbe Wellenlänge als Grenze " +
    "(AUG S.17; TRE S.16 „below half a wavelength“) und an anderer λ/4 (AUG S.8 und Tab.3 " +
    "S.17; TRE S.17 f.). λ/2 beschreibt die maximale Wegänderung zwischen zwei Aufnahmen, " +
    "λ/4 den eindeutig vorzeichenbehafteten Bereich — der Explainer verwendet λ/4 als " +
    "Eindeutigkeitsgrenze je Intervall.",
  pseudoCells2d:
    "Rastergröße der 2D-Dekomposition: TRE §2.1.2 S.20 nennt „in general 100x100 m“, " +
    "AUGMENTERRA S.12 als Beispiel „z. B. 10 x 10 m“ — die Zellgröße ist " +
    "prozessierungsabhängig, keine Naturkonstante.",
  heightOfAmbiguity:
    "Die Mehrdeutigkeitshöhe hₐ = λ·R·sinθ / (2·Bn) und die dafür nötigen Größenordnungen " +
    "(Schrägentfernung ~600–750 km, didaktische Beispiel-Baselines) sind SAR-Standardwissen " +
    "über die beiden Projekt-Handbücher hinaus. Handbuch-belegt sind die Bausteine: Baselines " +
    "bis „hundreds of meters“ (TRE §9 S.50), Sentinel-1-Orbitalröhre unter 50 m (TRE §10 " +
    "S.55), Höhe „estimated from the phase values“ (TRE §2.1.1.1 S.12) und der " +
    "DEM-Restfehler-Term ε (TRE §11.3 S.61).",
  heightGeocodingCoupling:
    "Dass die Lagekoordinaten eines Messpunkts von dessen geschätzter Höhe abhängen, belegt " +
    "AUGMENTERRA S.14 („Die Lagekoordinaten jedes MP hängen von dessen SAR-Koordinaten und " +
    "dessen Höhe ab“). Die konkrete Faustformel Lageversatz ≈ ε / tan θ (zum Sensor hin) ist " +
    "Standardwissen über die Handbücher hinaus.",
  geoidOffset:
    "Das Attribut height bezieht sich auf das WGS-84-Ellipsoid (AUG Appendix S.23; TRE " +
    "Tab.3 S.28). Dass dieses Ellipsoid im Raum Salzburg rund 47 m unter dem " +
    "Meeresniveau-Nullpunkt (Geoid) liegt — height-Werte also ca. 47 m über der vertrauten " +
    "Meereshöhe —, ist Standardwissen (BEV-Geoidmodell) und steht nicht in den Handbüchern.",
} as const;

/* ------------------------------------------------------------------ */
/* Formeln — live in den Diagrammen ausgewertet                        */
/* ------------------------------------------------------------------ */

/** Wellenlänge in mm. */
export function wavelengthMm(sensor: SensorId): number {
  return sensors[sensor].wavelengthCm * 10;
}

/** Phasenverschiebung in rad: Δφ = (4π/λ)·ΔR — TRE §11.1 S.57. */
export function phaseFromDeltaRMm(deltaRMm: number, sensor: SensorId): number {
  return (4 * Math.PI * deltaRMm) / wavelengthMm(sensor);
}

/** Volle Phasenzyklen (Fringes) zu einer Wegänderung: 1 Fringe = λ/2 — TRE Fig.35 S.59. */
export function fringesFromDeltaRMm(deltaRMm: number, sensor: SensorId): number {
  return phaseFromDeltaRMm(deltaRMm, sensor) / (2 * Math.PI);
}

/** Wegänderung eines vollen Fringes: λ/2 in mm — TRE Fig.35 S.59. */
export function fringeSpacingMm(sensor: SensorId): number {
  return wavelengthMm(sensor) / 2;
}

/**
 * Eindeutigkeitsgrenze pro Aufnahme-Intervall: λ/4 in mm — TRE §2.1.1.3
 * S.16–17 (C-Band 14 mm); AUG §2.2.2 S.9 (S1 1,4 cm, TSX 0,8 cm).
 */
export function aliasingLimitMm(sensor: SensorId): number {
  return wavelengthMm(sensor) / 4;
}

/** Verschiebung pro Aufnahme-Intervall bei konstanter Rate. */
export function dispPerIntervalMm(velMmPerYear: number, revisitDays: number): number {
  return (velMmPerYear * revisitDays) / 365.25;
}

/**
 * Bewegt sich ein ISOLIERTES Einzelziel um λ/4 oder mehr pro Intervall, ist
 * die Messung dort mehrdeutig (Grenzfall inklusive — bei exakt λ/4 springt
 * die gewrappte Phase von +π auf −π). Kein universelles Messlimit: räumlich
 * korrelierte Bewegung ist bei ausreichender Punktdichte auch darüber
 * auflösbar (TRE S.17 „Measurement ambiguities can be resolved", Fig.7 S.18).
 */
export function isAliased(
  velMmPerYear: number,
  revisitDays: number,
  sensor: SensorId
): boolean {
  return Math.abs(dispPerIntervalMm(velMmPerYear, revisitDays)) >= aliasingLimitMm(sensor);
}

export type LosVersor = { e: number; n: number; v: number };

/**
 * Projektion einer Bodenbewegung (Ost/Nord/Vertikal, mm) auf die
 * Radar-Blicklinie (positiv = zum Satelliten) — TRE §2.1.2 S.19.
 */
export function losProjectionMm(
  motion: { e: number; n: number; u: number },
  versor: LosVersor
): number {
  return motion.e * versor.e + motion.n * versor.n + motion.u * versor.v;
}

export type SlantZone = "normal" | "foreshortening" | "layover" | "shadow";

/**
 * Klassifikation der Schrägsicht-Verzerrung — TRE §9.1 S.51–52.
 * Konvention: slopeDeg > 0 = Hang dem Radar zugewandt, < 0 = abgewandt.
 * - Layover: zugewandter Hang steiler als der Einfallswinkel θ
 * - Foreshortening: zugewandter Hang flacher als θ (gestaucht, hell) —
 *   der Effekt wächst mit der Neigung und ist nahe θ am stärksten
 * - Shadow: abgewandter Hang steiler als (90° − θ) — nicht beleuchtet
 *
 * IDEALISIERTES 1D-Range-Profil (Querschnitt in Blickrichtung): Die
 * Hang-Exposition relativ zur Blickrichtung und Verschattung durch
 * vorgelagertes Gelände sind nicht modelliert — real entsteht daraus eine
 * Sichtbarkeitskarte aus LOS + Topografie (TRE Fig.29 S.53).
 */
export function slantMapping(slopeDeg: number, thetaDeg: number): SlantZone {
  if (slopeDeg > 0) {
    return slopeDeg > thetaDeg ? "layover" : "foreshortening";
  }
  if (slopeDeg < 0 && Math.abs(slopeDeg) > 90 - thetaDeg) return "shadow";
  return "normal";
}

export const slantZoneLabels: Record<SlantZone, string> = {
  normal: "normal abgebildet",
  foreshortening: "gestaucht (Foreshortening)",
  layover: "umgeklappt (Layover)",
  shadow: "Radarschatten",
};

/* ------------------------------------------------------------------ */
/* Höhenschätzung (Kap. 6): Ranging, Referenzfläche, Baseline-Stereo    */
/* ------------------------------------------------------------------ */

/**
 * Bausteine der Höhen-Entstehung (Diagramme 6.2/6.3).
 * Handbuch-belegt: Laufzeit ortet in Range, Antennenrichtung in Azimut
 * (TRE §7 S.47); Baselines bis „hundreds of meters" (TRE §9 S.50);
 * Sentinel-1-Orbitalröhre unter 50 m (TRE §10 S.55); Höhe wird aus den
 * Phasenwerten des Stapels geschätzt (TRE §2.1.1.1 S.12), der
 * DEM-Restfehler ε ist ein eigener Phasenterm (TRE §11.3 S.61).
 * STANDARDWISSEN (→ FOOTNOTES.heightOfAmbiguity): die Schrägentfernungen
 * sind Größenordnungswerte der SAR-Literatur, keine Handbuch-Zahlen.
 */
export const heightEstimation = {
  /** TRE §10 S.55: „orbital tube that is fixed lower than 50 meters". */
  s1OrbitalTubeMaxM: 50,
  /** STANDARDWISSEN: typische Schrägentfernung Sensor–Ziel, nur Größenordnung. */
  slantRangeKmApprox: { s1: 720, tsx: 620 } satisfies Record<SensorId, number>,
} as const;

/**
 * DIDAKTIK: deterministische Beispiel-Baselines (m) für den Stapel-Plot in
 * Diagramm 6.3 — keine Messdaten. „eng" entspricht der Sentinel-1-
 * Orbitalröhre (±50 m, TRE §10 S.55), „weit" dem generischen Rahmen
 * „bis einige hundert Meter" (TRE §9 S.50).
 */
export const baselinePresets = {
  eng: {
    label: "eng (Orbitalröhre ±50 m)",
    bnM: [-45, -33, -21, -9, 6, 18, 30, 42],
  },
  weit: {
    label: "weit (bis ±180 m)",
    bnM: [-180, -128, -76, -30, 24, 78, 130, 176],
  },
} as const;

export type BaselinePresetId = keyof typeof baselinePresets;

/** Mittlerer Einfallswinkel = Mitte der belegten Spanne (AUG S.10). */
export function thetaMidDeg(sensor: SensorId): number {
  const [lo, hi] = sensors[sensor].thetaDegRange;
  return (lo + hi) / 2;
}

/**
 * Mehrdeutigkeitshöhe hₐ = λ·R·sinθ / (2·|Bn|): Höhenunterschied je vollem
 * Phasenumlauf — das Höhen-Gegenstück zur λ/2-Fringe der Bewegung.
 * STANDARDWISSEN über die Handbücher hinaus (FOOTNOTES.heightOfAmbiguity).
 */
export function heightOfAmbiguityM(sensor: SensorId, bnM: number): number {
  const lambdaM = sensors[sensor].wavelengthCm / 100;
  const rM = heightEstimation.slantRangeKmApprox[sensor] * 1000;
  const theta = (thetaMidDeg(sensor) * Math.PI) / 180;
  return (lambdaM * rM * Math.sin(theta)) / (2 * Math.abs(bnM));
}

/**
 * Topografischer Phasenrest eines Höhenfehlers ε bei Baseline Bn:
 * φ = (4π/λ)·(Bn/(R·sinθ))·ε — der Term, den die Verarbeitung je Punkt über
 * den Stapel fittet (ε: TRE §11.3 S.61; Formel: Standardwissen).
 */
export function topoResidualPhaseRad(epsM: number, bnM: number, sensor: SensorId): number {
  const lambdaM = sensors[sensor].wavelengthCm / 100;
  const rM = heightEstimation.slantRangeKmApprox[sensor] * 1000;
  const theta = (thetaMidDeg(sensor) * Math.PI) / 180;
  return (4 * Math.PI * bnM * epsM) / (lambdaM * rM * Math.sin(theta));
}

/**
 * Lageversatz durch einen Höhenfehler: Δground ≈ ε / tan θ, zum Sensor hin.
 * Kopplung Höhe↔Lage: AUG S.14; Formel: Standardwissen
 * (FOOTNOTES.heightGeocodingCoupling).
 */
export function groundShiftFromHeightErrorM(epsM: number, thetaDeg: number): number {
  return epsM / Math.tan((thetaDeg * Math.PI) / 180);
}

/**
 * Geoid-Undulation Raum Salzburg: height-Werte (WGS-84-Ellipsoid, AUG S.23)
 * fallen rund 47 m HÖHER aus als Meereshöhen. STANDARDWISSEN, nur mit
 * Kennzeichnung rendern (FOOTNOTES.geoidOffset).
 */
export const geoidOffsetSalzburgM = 47;

/**
 * Die sechs Gründe, warum die Höhenzahl abweichen kann — Karten in Kap. 6.
 * `standardwissen: true` = Aussage geht über die Projekt-Handbücher hinaus
 * und wird im UI entsprechend markiert.
 */
export const heightErrorSources = [
  {
    key: "hStdev",
    label: "Schätz-Streuung der Höhe",
    text:
      "Die Höhe ist ein Fit-Ergebnis aus dem Bildstapel; seine Streuung liefert h_stdev. " +
      "Typisch ±1,5 m (TerraSAR-X) bzw. ±8 m (Sentinel-1) — und nur unter den " +
      "Geltungsbedingungen: unter 1 km vom Referenzpunkt, Stapel ab 30 Szenen.",
    quelle: "TRE Tab.1 S.13; AUG Tab.1 S.14",
    standardwissen: false,
  },
  {
    key: "processing",
    label: "Qualität hängt an Stapel und Abwicklung",
    text:
      "Das Fehlerbudget der Geolokalisierung hängt „strongly“ an der interferometrischen " +
      "Prozessierung: Szenenzahl, zeitliche Kontinuität und korrekte Phasenabwicklung " +
      "bestimmen, wie gut der Höhen-Fit wird.",
    quelle: "TRE §2.1.1.1 S.12",
    standardwissen: false,
  },
  {
    key: "phaseCenter",
    label: "Phasenzentrum ≠ sichtbares Objekt",
    text:
      "Die Höhe gehört zum Phasenzentrum des Echos — bei Double-Bounce liegt das am " +
      "Fassadenfuß statt am Dach, in Mischzellen irgendwo zwischen den Streuern " +
      "(Diagramm 6.4). Diese Unsicherheit hat keinen Tabellenwert.",
    quelle: "AUG S.10 (Mehrfachreflexionen); Details: Standardwissen",
    standardwissen: true,
  },
  {
    key: "anchor",
    label: "Absolute Verankerung am Referenzpunkt",
    text:
      "Wie alles ist auch die Höhe relativ zum Referenzpunkt geschätzt. Die Absolutlage des " +
      "gesamten Datensatzes wird mit Orthofotos/Passpunkten verfeinert und ist letztlich nur " +
      "per GNSS prüfbar — ein Fehler dort verschiebt alle Höhen gemeinsam.",
    quelle: "TRE §2.1.1.1 S.12",
    standardwissen: false,
  },
  {
    key: "groundShift",
    label: "Höhenfehler wird Lageversatz",
    text:
      "Die Lagekoordinaten hängen von der geschätzten Höhe ab: Ist die Höhe um ε falsch, " +
      "landet der Punkt um ε/tanθ versetzt auf der Karte (zum Sensor hin) — Höhen- und " +
      "Lagefehler sind gekoppelt (Diagramm 6.2).",
    quelle: "AUG S.14; Faustformel: Standardwissen",
    standardwissen: true,
  },
  {
    key: "ellipsoid",
    label: "Ellipsoidhöhe, nicht Meereshöhe",
    text:
      "height bezieht sich auf das WGS-84-Ellipsoid — eine Konvention, kein Fehler. In " +
      "Salzburg liegen die Werte dadurch rund 47 m über der vertrauten Meereshöhe: ein " +
      "Altstadt-Dach mit ~430 m ü. A. trägt ~477 m als height.",
    quelle: "AUG S.23; Salzburg-Offset: Standardwissen (BEV-Geoid)",
    standardwissen: true,
  },
] as const;

/* ------------------------------------------------------------------ */
/* Salzburg-Realdaten                                                  */
/* ------------------------------------------------------------------ */

/** TSX-Bestand Salzburg — REPORT S.2–8 (datensatzspezifisch, nicht allgemein). */
export const salzburgTsx = {
  track: 93,
  pass: "DSC" as const,
  mode: "Stripmap (SM013)",
  thetaDeg: 42.67,
  /** LOS-Versoren V/N/E — REPORT S.2: starke Vertikal-Sensitivität, N–S fast blind. */
  losVersor: { e: 0.665, n: -0.129, v: 0.735 } satisfies LosVersor,
  scenes: 102,
  discardedScenes: 8,
  period: "27.12.2011 – 19.04.2020",
  points: 923_017,
  areaKm2: 184.6,
  densityPerKm2: 5000,
  processing: "SqueeSAR (TRE Altamira)",
  refPoint: "BPR4NAS",
  refPointLonLat: [13.0509813, 47.7929968] as const,
} as const;

/**
 * Sentinel-1-Bestand Salzburg — INVENTAR §2.1 (datensatzspezifisch).
 * `points` = BEWEGUNGSDATEN (Stadt_Salzburg.gpkg, Layer 44/95) — die Punkte,
 * mit denen der Viewer arbeitet. Die größeren AMP-GPKGs (338.728/336.497)
 * sind Amplituden-ROHDATEN und werden hier bewusst getrennt geführt.
 */
export const salzburgS1 = {
  asc: {
    track: 44,
    points: 247_388,
    epochs: 90,
    period: "05.04.2022 – 20.03.2025",
    blick: "aufsteigend, blickt von Westen",
  },
  dsc: {
    track: 95,
    points: 303_376,
    epochs: 88,
    period: "09.04.2022 – 24.03.2025",
    blick: "absteigend, blickt von Osten",
  },
  /** Amplituden-Rohdaten (ASC_T44_AMP/ASC_T95_AMP) — andere Rolle, nicht die Viewer-Punkte. */
  ampPoints: { asc: 338_728, dsc: 336_497 },
} as const;

/**
 * Generische LOS-Versoren für das Projektions-Labor — DIDAKTIK: gespiegelter
 * Salzburg-TSX-Versor (REPORT S.2) als plausible ASC/DSC-Paarung; die kleine
 * N-Komponente ist gerade der Punkt („N–S fast blind", TRE §2.1.2 S.19).
 */
export const genericLosVersors: Record<"asc" | "dsc", LosVersor> = {
  asc: { e: -0.665, n: -0.129, v: 0.735 },
  dsc: { e: 0.665, n: -0.129, v: 0.735 },
};

/* ------------------------------------------------------------------ */
/* Punkt-Attribute der gelieferten Daten                                */
/* ------------------------------------------------------------------ */

/** Attribute je Messpunkt — AUG Appendix §7 S.24–25. */
export const pointAttributes = [
  {
    key: "height / h_stdev",
    label: "Höhe + Standardabweichung",
    text:
      "Höhe des Streuzentrums über dem Ellipsoid (WGS84), aus der InSAR-Analyse geschätzt — " +
      "kein Laserscan-Wert. h_stdev beziffert die Unsicherheit.",
    einheit: "m",
  },
  {
    key: "vel / v_stdev",
    label: "Geschwindigkeit + Standardabweichung",
    text:
      "Mittlere Bewegungsrate entlang der Blicklinie (LOS). Positiv = zum Satelliten. " +
      "Kein 3D-Vektor — nur die eine gemessene Komponente.",
    einheit: "mm/Jahr",
  },
  {
    key: "coherence",
    label: "Kohärenz",
    text:
      "Modell-/Signalstabilität 0–1 über den ganzen Bildstapel; ab 0,7 gilt der Punkt in " +
      "der Lieferung als zuverlässig.",
    einheit: "0–1",
  },
  {
    key: "eff_area",
    label: "Effektive Fläche",
    text:
      "Fläche, über die ein Distributed Scatterer mittelt. Persistent Scatterer haben " +
      "eff_area = 0 — ihr Signal stammt von einem punktförmigen Reflektor.",
    einheit: "m²",
  },
  {
    key: "dYYYYMMDD",
    label: "Zeitreihe",
    text:
      "Kumulative Verschiebung je Aufnahmedatum relativ zur ersten Szene — eine Spalte pro " +
      "Aufnahme, zusammen die komplette Bewegungsgeschichte des Punkts.",
    einheit: "mm",
  },
] as const;

/* ------------------------------------------------------------------ */
/* Phasen-Bestandteile (PhaseBudgetMixer, Kap. 3)                       */
/* ------------------------------------------------------------------ */

/** Bestandteile der interferometrischen Phase — TRE §11.2.1 S.59, §11.3 S.61, §11.5 S.64. */
export const phaseComponents = [
  {
    key: "deformation",
    label: "Bodenbewegung",
    text: "Das Nutzsignal: Wegänderung Sensor–Ziel zwischen den Aufnahmen.",
    entfernung: "bleibt — das ist die Messgröße",
    entfernbar: false,
  },
  {
    key: "topo",
    label: "Topografie (Blickwinkel-Anteil)",
    text:
      "Zwei Aufnahmen entstehen nie von exakt derselben Orbitposition (Baseline). Durch den " +
      "kleinen Versatz „sieht“ das Radar die Geländehöhe als Phasenanteil — auch wenn sich " +
      "nichts bewegt hat. Dieser Anteil wird mit einem bekannten Höhenmodell (DEM) berechnet " +
      "und subtrahiert.",
    entfernung: "Höhenmodell (DEM) wird subtrahiert",
    entfernbar: true,
  },
  {
    key: "demError",
    label: "Höhenmodell-Restfehler ε",
    text:
      "Das Höhenmodell ist selbst nicht perfekt: Wo es von der echten Höhe des Streuers " +
      "abweicht, bleibt ein Restanteil ε in der Phase. Er wird im Bildstapel je Punkt " +
      "mitgeschätzt und entfernt (TRE §11.3 S.61).",
    entfernung: "im Bildstapel je Punkt mitgeschätzt",
    entfernbar: true,
  },
  {
    key: "atmo",
    label: "Atmosphäre (APS)",
    text:
      "Feuchte Luftschichten verzögern das Signal. Räumlich glatt, aber von Aufnahme zu " +
      "Aufnahme zufällig — deshalb im Bildstapel schätzbar und entfernbar.",
    entfernung: "Multi-Interferogramm-Stapel (PSI/SqueeSAR)",
    entfernbar: true,
  },
  {
    key: "noise",
    label: "Rauschen / Dekorrelation",
    text:
      "Veränderte Streuer (Vegetation!), Aufnahmegeometrie, Thermik. Als Phasen-Term nicht " +
      "schätzbar — die Verarbeitung vermeidet es über die Punktauswahl und reduziert es bei " +
      "Distributed Scatterern durch Raum-Zeit-Filterung (TRE §11.6 S.66); ein Rest bleibt " +
      "in Zeitreihe und Qualitätsmaßen.",
    entfernung: "Punktauswahl + DS-Filterung (Rest bleibt)",
    entfernbar: false,
  },
] as const;

/* ------------------------------------------------------------------ */
/* Referenzpunkt (REF)                                                  */
/* ------------------------------------------------------------------ */

/**
 * Referenzpunkt-Fakten — TRE S.11–12 und S.62; AUG S.7 und S.18.
 * Es gibt genau EINEN Referenzpunkt je Verarbeitung/Bildstapel; alle
 * Messpunkte beziehen sich auf diesen einen (AUG S.7: „Alle Messpunkte
 * werden … auf einen stabilen Referenzpunkt bezogen"). Eine „Anzahl pro
 * Fläche" gibt es deshalb nicht — Salzburg-TSX: einer auf 184,6 km².
 */
export const referencePoint = {
  onePerStack: true,
  /** TRE S.12: „selected for its radar properties and motion behaviour". */
  auswahlKriterien: [
    "Geringes Phasenrauschen in ALLEN Szenen des Stapels (stabiler Radarstreuer)",
    "Keine Ratenänderungen im Zeitraum — weder nichtlineare noch zyklische Bewegung",
  ],
  auswahlDurch:
    "Der Prozessor wählt den REF aus den Messpunkten des Stapels; die Wahl ist " +
    "„imagery-dependent“ — ändert sich der Stapel (Szenenzahl/Zeitraum), kann ein " +
    "anderer Messpunkt zum REF werden (TRE S.12).",
  cornerReflector:
    "Wo keine natürlichen Persistent Scatterer existieren, werden künstliche " +
    "Corner-Reflektoren installiert, um stabile Referenzpunkte zu schaffen (AUG S.18); " +
    "Schnee, Eis oder Vegetation können deren Funktion beeinträchtigen.",
  regionalTrend:
    "Der REF kann selbst einen linearen Regionaltrend enthalten; erkennbar nur durch " +
    "eine unabhängige Messtechnik wie ein GPS-/GNSS-Netz (TRE S.12).",
} as const;

/**
 * Distanz-Bänder zum REF — die Quellen belegen BÄNDER, keinen Gradienten
 * (kein mm/a-pro-km-Wert). Mechanismus: Atmosphären-Restfehler sind nur
 * räumlich glatt; mit der Distanz wachsen die Unterschiede (TRE S.14:
 * „as in traditional geodetic networks, measurement precision decreases
 * as distance from reference point increases" = AUG S.15).
 */
export const refDistanceBands = [
  {
    label: "< 1 km",
    kmMax: 1,
    aussage:
      "Hier gelten die dokumentierten Präzisionen: σ(Rate) < 1 mm/a, Einzelmessung im " +
      "Mittel innerhalb ±5 mm (TRE Tab.1–2, S.13–15).",
  },
  {
    label: "1–4 km",
    kmMax: 4,
    aussage:
      "Bereich der Fig.-5-Atmosphärenstudie: Präzision nimmt mit der Distanz ab, bleibt " +
      "aber quantifizierbar (TRE S.15).",
  },
  {
    label: "> 4 km",
    kmMax: null,
    aussage:
      "Laut TRE S.15 wird die Atmosphären-Statistik hier „more complex to be " +
      "quantitatively described“ — keine einfache Quantifizierung mehr.",
  },
] as const;

/** Saisonale Effekte (Schnee) — AUG S.6, S.8 und Tab.3 S.17. */
export const seasonalEffects = {
  schneeStreutDiffus:
    "Oberflächen wie Vegetation, Boden, Schnee oder Wasser streuen die Wellen diffus (AUG S.6).",
  winterluecken:
    "„Winterliche Schneebedeckung führt oft zu monatelangen Unterbrechungen“ (AUG S.8); " +
    "die Datenlücken verhindern Anschlussmessungen (AUG Tab.3 S.17).",
} as const;

/* ------------------------------------------------------------------ */
/* Didaktische Beispieldaten (deterministisch, keine Quellen-Zahlen)    */
/* ------------------------------------------------------------------ */

export type CitySceneVerdict = "ps" | "ds" | "none";

/**
 * Objekte der PS/DS-Stadtszene (Kap. 4). Die Reihen sind DIDAKTISCHE
 * Beispielwerte für die Echo-Stabilität über die Aufnahmen — keine Messdaten
 * und keine Größe der Lieferung (das gelieferte Attribut `coherence` ist EIN
 * Skalar je Punkt; `meanCoherence` steht hier dafür). PS/DS-Physik: TRE §2.1
 * S.10, §11.6 S.65–66.
 */
export const citySceneObjects = [
  {
    id: "dachkante",
    label: "Gebäude-Dachkante",
    verdict: "ps" as CitySceneVerdict,
    meanCoherence: 0.92,
    coherenceSeries: [0.93, 0.91, 0.94, 0.9, 0.92, 0.93, 0.91, 0.94, 0.92, 0.9, 0.93, 0.92],
    effAreaM2: 0,
    begruendung:
      "Kante aus Mauerwerk und Blech wirkt als Winkelreflektor: starkes, über Jahre " +
      "identisches Echo — klassischer Persistent Scatterer.",
  },
  {
    id: "laterne",
    label: "Laternenmast",
    verdict: "ps" as CitySceneVerdict,
    meanCoherence: 0.84,
    coherenceSeries: [0.85, 0.83, 0.86, 0.82, 0.84, 0.85, 0.83, 0.85, 0.84, 0.82, 0.86, 0.84],
    effAreaM2: 0,
    begruendung:
      "Metallmast mit stabiler Geometrie — punktförmiges, dauerhaftes Echo trotz kleiner " +
      "Fläche (Beispiel aus TRE §11.5: Masten, lineare Strukturen).",
  },
  {
    id: "felswand",
    label: "Felswand",
    verdict: "ps" as CitySceneVerdict,
    meanCoherence: 0.78,
    coherenceSeries: [0.8, 0.77, 0.79, 0.76, 0.78, 0.8, 0.77, 0.79, 0.78, 0.76, 0.79, 0.78],
    effAreaM2: 0,
    begruendung: "Nackter Fels streut stark und verändert sich kaum — stabiler Reflektor.",
  },
  {
    id: "parkplatz",
    label: "Asphalt-Parkplatz",
    verdict: "ds" as CitySceneVerdict,
    meanCoherence: 0.62,
    coherenceSeries: [0.66, 0.6, 0.64, 0.58, 0.63, 0.65, 0.59, 0.62, 0.64, 0.6, 0.63, 0.61],
    effAreaM2: 480,
    begruendung:
      "Homogene, unbewachsene Fläche: jede einzelne Zelle ist zu schwach, aber die " +
      "Mittelung über die Fläche ergibt ein brauchbares Signal — Distributed Scatterer.",
  },
  {
    id: "wiese",
    label: "Wiese",
    verdict: "none" as CitySceneVerdict,
    meanCoherence: 0.28,
    coherenceSeries: [0.45, 0.3, 0.22, 0.38, 0.18, 0.32, 0.25, 0.4, 0.2, 0.28, 0.15, 0.24],
    effAreaM2: 0,
    begruendung:
      "Gras wächst, wird gemäht, wird nass: die Streuer ändern sich zwischen den Aufnahmen " +
      "ständig — Dekorrelation, kein Messpunkt (TRE §11.2.2: Vegetation als Hauptursache).",
  },
  {
    id: "wald",
    label: "Wald",
    verdict: "none" as CitySceneVerdict,
    meanCoherence: 0.18,
    coherenceSeries: [0.25, 0.15, 0.2, 0.12, 0.22, 0.16, 0.1, 0.24, 0.14, 0.19, 0.11, 0.2],
    effAreaM2: 0,
    begruendung:
      "Blätter und Äste bewegen sich mit dem Wind und wachsen: für X- und C-Band meist zu " +
      "instabil — im dichten Wald entstehen kaum Punkte. L-Band kann Laub teilweise " +
      "durchdringen (TRE §11.2.2 S.60).",
  },
  {
    id: "wasser",
    label: "Wasserfläche",
    verdict: "none" as CitySceneVerdict,
    meanCoherence: 0.05,
    coherenceSeries: [0.08, 0.04, 0.06, 0.03, 0.07, 0.05, 0.04, 0.06, 0.05, 0.03, 0.06, 0.04],
    effAreaM2: 0,
    begruendung:
      "Glattes Wasser spiegelt das Signal vom Sensor weg, bewegtes Wasser ist nie zweimal " +
      "gleich — grundsätzlich keine InSAR-Punkte über Wasser (TRE §2.1 S.10).",
  },
] as const;

/**
 * Deterministische, normierte Streu-Offsets (~Standardnormal-Paare) für die
 * Geolokalisierungs-Streuwolke (Kap. 6): dieselben „Ziehungen" für beide
 * Sensoren, skaliert mit geoAccuracy1Sigma — DIDAKTIK, keine Messdaten.
 */
export const scatterUnitOffsets: ReadonlyArray<{ x: number; y: number }> = [
  { x: 0.23, y: -0.61 },
  { x: -0.85, y: 0.34 },
  { x: 1.42, y: 0.18 },
  { x: -0.31, y: -1.12 },
  { x: 0.67, y: 0.92 },
  { x: -1.24, y: -0.27 },
  { x: 0.08, y: 0.51 },
  { x: 0.94, y: -0.88 },
  { x: -0.52, y: 1.35 },
  { x: 1.78, y: -0.42 },
  { x: -0.15, y: -0.73 },
  { x: 0.41, y: 1.61 },
  { x: -1.63, y: 0.58 },
  { x: 0.76, y: -0.19 },
  { x: -0.44, y: -1.48 },
  { x: 1.12, y: 0.66 },
  { x: -0.92, y: -0.55 },
  { x: 0.29, y: 1.05 },
  { x: -2.05, y: 0.12 },
  { x: 0.58, y: -1.27 },
  { x: -0.68, y: 0.81 },
  { x: 1.31, y: 1.22 },
  { x: -0.21, y: -0.34 },
  { x: 0.87, y: 0.44 },
] as const;

/* ------------------------------------------------------------------ */
/* Zeitstrahl (nur belegte Zeitspannen)                                 */
/* ------------------------------------------------------------------ */

/** Belegte Zeitspannen für den Kap.-8-Zeitstrahl — bewusst nur Quellen-Daten. */
export const timeline = [
  {
    label: "ERS-Archiv (C-Band)",
    von: 1992,
    bis: 2011,
    scope: "allgemein" as Scope,
    quelle: "TRE S.55–56: Archivdaten seit 1992",
  },
  {
    label: "Salzburg TSX Track 93",
    von: 2011,
    bis: 2020,
    scope: "tsx" as Scope,
    quelle: "REPORT S.3–7: 27.12.2011–19.04.2020",
  },
  {
    label: "Salzburg Sentinel-1 T44/T95",
    von: 2022,
    bis: 2025,
    scope: "s1" as Scope,
    quelle: "INVENTAR: 05.04.2022–24.03.2025",
  },
] as const;
