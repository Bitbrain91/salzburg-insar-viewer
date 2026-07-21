/**
 * Single Source of Truth für alle im Silver-Ground-Truth-Explainer
 * angezeigten Zahlen, Label-Einträge und Benotungsregeln.
 *
 * Quellen (Stand 2026-07-20):
 * - `docs/pipelines/anomaly_local_v1/artifacts/reference_labels.json`
 *   (Korpus v4, updated 2026-07-08)
 * - `docs/pipelines/anomaly_local_v1/reference_labels.md`
 *   (Schema, Label-Semantik, Erhebungsregeln)
 * - `backend/app/ml/evaluation/phase7_clustering_experiments.py`
 *   (Benotung `check_reference_labels` + `_reference_label_state`, Z. 1468–1601)
 * - `backend/app/ml/evaluation/phase2_harness.py` (Pflicht-AOIs, Z. 57–73)
 * - `docs/pipelines/anomaly_local_v1/artifacts/phase8_v4_rc_gate_results.md`
 *   (v4-Release-Candidate-Gate, 2026-07-10)
 * - `docs/pipelines/anomaly_local_v1/next_steps.md` (P1-1/P1-2/P1-3)
 *
 * Regel: Komponenten zeigen ausschließlich Werte aus diesem Modul an — keine
 * Zahl wird in einer Komponente hartkodiert. Bei jeder Änderung von
 * `reference_labels.json` (`version`/`updated`), der Harness-Benotung oder der
 * Gate-Definitionen wird dieses Modul im selben Ticket nachgezogen.
 *
 * Die `evidenz`-Texte sind für die Anzeige gekürzt; der vollständige Wortlaut
 * steht in `reference_labels.json`.
 */

/* ------------------------------------------------------------------ */
/* Versionsmarker (reference_labels.json Kopf)                         */
/* ------------------------------------------------------------------ */

export const SILVER_CORPUS_VERSION = 4; // "version": 4
export const SILVER_CORPUS_UPDATED = "2026-07-08"; // "updated"
export const SILVER_LABELED_BY = "team_internal"; // "labeled_by" — NICHT expertenvalidiert

/** Kontext, warum es "Silver" statt "Gold" ist (reference_labels.md Kopf). */
export const GOLD_KONTEXT =
  "Experten-Labels von AUGMENTERRA sind kurzfristig nicht verfügbar " +
  "(Meeting-Nachtrag 2026-07-06). Die in Visual-Audits, Survivors-Scans und " +
  "User-Befunden bereits getroffenen punktgenauen Urteile werden deshalb " +
  "persistent und maschinenlesbar gemacht, damit Pipeline-Änderungen " +
  "automatisch benotbar werden.";

/* ------------------------------------------------------------------ */
/* Korpus-Aggregat (reference_labels.json, Zählung v4)                 */
/* ------------------------------------------------------------------ */

export const corpus = {
  punkte: 46,
  roof: 19,
  annex: 2,
  foreign: 10,
  unclear: 15,
  /**
   * 11 verschiedene building_ids, aber 10 physische Gebäude: der einzige
   * BEV-Eintrag `{A9A7E442-…}` ist der als eigener BEV-Footprint kartierte
   * Anbau des GBA-Gebäudes 96959851.
   */
  buildingIds: 11,
  gebaeudePhysisch: 10,
} as const;

/** Korpus-Entwicklung (reference_labels.md §Stand v2/v3/v4). */
export const korpusHistorie = [
  {
    version: 2,
    datum: "2026-07-06/07",
    gebaeude: 2,
    punkte: 20,
    notiz:
      "Erstbefüllung aus den Referenzfällen 96959851 und 96637447 (Moosstraße); " +
      "Kategorie annex ergänzt, zwei Punkte nach GE-3D-Befund von foreign auf annex revidiert.",
  },
  {
    version: 3,
    datum: "2026-07-07",
    gebaeude: 10,
    punkte: 44,
    notiz:
      "N1-Ausbau: +8 Gebäude / +24 Punkte, stratifiziert um Bad Gastein, Hanglagen und " +
      "TSX erweitert; 4 Roof-Referenzgebäude und 4 Verdachtsgebäude als unclear.",
  },
  {
    version: 4,
    datum: "2026-07-08",
    gebaeude: 10,
    punkte: 46,
    notiz:
      "P8-F annex/foreign-Fix: +2 foreign am BEV-Anbau {A9A7E442-…} (User-Befund: " +
      "Anti-Layover-Punkte waren fälschlich als annex etikettiert).",
  },
] as const;

/* ------------------------------------------------------------------ */
/* Label-Semantik und Erhebungsregeln (reference_labels.md)            */
/* ------------------------------------------------------------------ */

export type SilverLabel = "roof" | "annex" | "foreign" | "unclear";

export const labelSemantik: Record<
  SilverLabel,
  { titel: string; text: string; zielverhalten: string }
> = {
  roof: {
    titel: "roof — Hauptbaukörper",
    text:
      "Der Punkt stammt mit hoher Sicherheit vom Hauptbaukörper (Dach/Struktur).",
    zielverhalten: "Muss score-relevant bleiben dürfen — darf nicht verloren gehen.",
  },
  annex: {
    titel: "annex — baulich verbundener Anbau",
    text:
      "Der Punkt stammt von einem baulich verbundenen Gebäudeteil mit potenziell eigenem " +
      "Bewegungsregime (Anbau, angebaute Garage; typisch leichter, flacher gegründet, Blechdach). " +
      "Fachlich kein Fremdpunkt und kein Müll: differenzielle Bewegung an der Fuge ist ein " +
      "schadensrelevantes Signal.",
    zielverhalten:
      "Eigener Cluster bzw. explizite Trennung vom Hauptcluster + Differentialbewertung — " +
      "nicht Demotion oder Entfernung.",
  },
  foreign: {
    titel: "foreign — Fremdstruktur",
    text:
      "Der Punkt stammt mit hoher Sicherheit von einer eigenständigen Fremdstruktur " +
      "(Nachbargebäude, freistehender Carport) oder ist als erhöhter Reflektor des Baukörpers " +
      "physikalisch unplausibel (Anti-Layover).",
    zielverhalten: "Darf den Gebäudescore nicht prägen — Separation oder Ausschluss.",
  },
  unclear: {
    titel: "unclear — dokumentiert unklar",
    text:
      "Verdächtig, aber nicht bestätigt. Die ehrliche Restklasse: der Verdacht wird " +
      "festgehalten, ohne ein unbelegtes Urteil zu erzwingen.",
    zielverhalten: "Zählt in Metriken weder als Treffer noch als Fehler; nur gelistet.",
  },
};

/** Erhebungsregeln (reference_labels.md §Regeln 1–5). */
export const erhebungsRegeln = [
  {
    nr: 1,
    kurz: "Nur mit dokumentierter Evidenz",
    text:
      "Nur Punkte mit dokumentierter Evidenz aufnehmen (Visual-Audit-Report, Survivors-Scan, " +
      "User-Befund, DB-Recheck) — keine Ad-hoc-Urteile.",
  },
  {
    nr: 2,
    kurz: "foreign nur bei Bestätigung",
    text:
      "foreign nur bei bestätigtem Befund oder harter physikalischer Unmöglichkeit " +
      "(Anti-Layover-Vorzeichen); sonst unclear.",
  },
  {
    nr: 3,
    kurz: "Quellen-stabile IDs",
    text:
      "Labels sind quellen-stabil formuliert (GBA-IDs); bei Umstellung auf BEV werden " +
      "building_ids per Max-Overlap-Mapping migriert, Punktcode und Track bleiben stabil.",
  },
  {
    nr: 4,
    kurz: "Stratifiziert erweitern",
    text:
      "Erweiterung stratifiziert nach Stichprobendesign: flach/Hang, viele/wenige Punkte, " +
      "Problemtypen. Ziel: 20–40 Gebäude.",
  },
  {
    nr: 5,
    kurz: "Datierte Commits",
    text:
      "Jede Erweiterung als eigener, datierter Commit; das updated-Feld im JSON wird mitgezogen.",
  },
] as const;

/**
 * Google-Earth-3D-Pflichtprüfung (reference_labels.md §Label-Semantik):
 * seit 2026-07-07 verpflichtend vor jeder foreign-Vergabe — Lehre aus Fall
 * 96959851 (als "unkartiertes Nebengebäude" gelabelt, tatsächlich baulich
 * verbundener Anbau). Entscheidend ist die bauliche Verbindung
 * (gemeinsame Wand/Giebel).
 */
export const GE3D_PFLICHT_SEIT = "2026-07-07";

/* ------------------------------------------------------------------ */
/* Der Korpus: alle 46 Label-Einträge (reference_labels.json v4)       */
/* ------------------------------------------------------------------ */

export type SilverDataset = "salzburg_snt" | "bad_gastein_snt" | "bad_gastein_tsx_paz";

export const datasetInfo: Record<SilverDataset, string> = {
  salzburg_snt: "Salzburg (Sentinel-1)",
  bad_gastein_snt: "Bad Gastein (Sentinel-1)",
  bad_gastein_tsx_paz: "Bad Gastein (TSX/PAZ)",
};

export type CorpusEntry = {
  buildingId: string;
  buildingSource: "gba" | "bev";
  datasetId: SilverDataset;
  track: number;
  pointCode: string;
  label: SilverLabel;
  /** Gekürzte Begründung; vollständiger Wortlaut in reference_labels.json. */
  evidenz: string;
  date: string;
};

/** Kurzporträts der Korpus-Gebäude für die Anzeige. */
export const corpusBuildingInfo: Record<string, { name: string; rolle: string }> = {
  "96959851": {
    name: "Moosstraße — Haus mit Anbau",
    rolle: "Anbau-Prüfstein: Ursprung der GE-3D-Pflichtprüfung und des Survivors-Scans",
  },
  "96637447": {
    name: "Moosstraße — Differential-Anker",
    rolle: "Multi-Cluster-/Differentialfall mit Anti-Layover-Cores; rotes RC-Kriterium",
  },
  "105022686": {
    name: "Bad Gastein — Talboden",
    rolle: "Roof-Retention-Referenz (flach, Zwei-Track SNT)",
  },
  "113309843": {
    name: "Bad Gastein — Hang (TSX)",
    rolle: "Roof-Retention-Referenz (Hang, TSX Track 70)",
  },
  "227901743": {
    name: "Bad Gastein — Hang (SNT)",
    rolle: "Roof-Retention-Referenz (Hang, Sentinel-1)",
  },
  "227901749": {
    name: "Bad Gastein — Hang, High-N",
    rolle: "Roof-Retention-Referenz (Hang, viele Punkte)",
  },
  "96856632": {
    name: "Salzburg — Villa mit Carport",
    rolle: "Verdachtsfall: Layover der Villa vs. Nebenstruktur nicht auflösbar → unclear",
  },
  "203343478": {
    name: "Salzburg — Gründerzeit-Block",
    rolle: "Versetzte nearest-Reihe, Quellstruktur im dichten Block nicht eindeutig → unclear",
  },
  "96637488": {
    name: "Salzburg — Villa mit Garten",
    rolle: "Punktreihe im Garten südlich des Grundrisses, keine bestätigte Fremdstruktur → unclear",
  },
  "113309836": {
    name: "Bad Gastein — Steilhang (TSX)",
    rolle: "Watch-Item: Punkte 13–15 m über den Dachankern, Layover-Korridor → unclear",
  },
  "{A9A7E442-BA31-41D0-8949-A120CB660943}": {
    name: "Moosstraße — BEV-Anbau-Footprint",
    rolle: "P8-F-Auslöser: Anti-Layover-Punkte, die fälschlich als annex etikettiert waren",
  },
};

export const corpusEntries: readonly CorpusEntry[] = [
  // --- 96959851 (Moosstraße, gba, salzburg_snt) ---------------------
  {
    buildingId: "96959851", buildingSource: "gba", datasetId: "salzburg_snt",
    track: 95, pointCode: "NTC3CYZ01", label: "annex",
    evidenz:
      "Blechdach-Struktur, zunächst als unkartiertes Nebengebäude gelesen. Revision per " +
      "Google-Earth-3D (2026-07-07): baulich verbundener Anbau am SW-Giebel → annex. " +
      "Zielverhalten: Trennung + Differentialbewertung, nicht Demotion.",
    date: "2026-07-07",
  },
  {
    buildingId: "96959851", buildingSource: "gba", datasetId: "salzburg_snt",
    track: 95, pointCode: "NTDA86J01", label: "annex",
    evidenz:
      "Höhenprofil 3,6 m unter dem Dach-Anker, stärkster Beweger. GE-3D-Revision: liegt im " +
      "Bereich des baulich verbundenen Anbaus (within BEV-Footprint A9A7E442) → annex.",
    date: "2026-07-07",
  },
  {
    buildingId: "96959851", buildingSource: "gba", datasetId: "salzburg_snt",
    track: 44, pointCode: "O2HC2XV01", label: "foreign",
    evidenz:
      "Anti-Layover: Versatz entgegen der Range-Richtung (range_dot −0.95), als Dachpunkt " +
      "physikalisch unplausibel; Survivors-Scan S6.",
    date: "2026-07-06",
  },
  {
    buildingId: "96959851", buildingSource: "gba", datasetId: "salzburg_snt",
    track: 95, pointCode: "NTF2IZV01", label: "roof",
    evidenz: "within-Punkt, im Survivors-Scan als covered_within bestätigt; Keep-Set P7-N5.",
    date: "2026-07-06",
  },
  {
    buildingId: "96959851", buildingSource: "gba", datasetId: "salzburg_snt",
    track: 95, pointCode: "NTG9E7F01", label: "roof",
    evidenz:
      "Keep-Set P7-N5; Höhenrang-Auffälligkeit im Scan als falsch-positiv bewertet " +
      "(User-Entscheidung 2026-06-12).",
    date: "2026-07-06",
  },
  {
    buildingId: "96959851", buildingSource: "gba", datasetId: "salzburg_snt",
    track: 44, pointCode: "O2CKM3N01", label: "roof",
    evidenz: "within-Zuordnung, covered_within im Survivors-Scan; t44-Hauptcluster-Kern.",
    date: "2026-07-06",
  },
  {
    buildingId: "96959851", buildingSource: "gba", datasetId: "salzburg_snt",
    track: 44, pointCode: "O2FJS4J01", label: "roof",
    evidenz: "within-Zuordnung, covered_within im Survivors-Scan; t44-Hauptcluster-Kern.",
    date: "2026-07-06",
  },
  {
    buildingId: "96959851", buildingSource: "gba", datasetId: "salzburg_snt",
    track: 95, pointCode: "NTEH3E401", label: "unclear",
    evidenz: "Noise, covered_geometry im Survivors-Scan; keine Bestätigung.",
    date: "2026-07-06",
  },
  {
    buildingId: "96959851", buildingSource: "gba", datasetId: "salzburg_snt",
    track: 95, pointCode: "NTFNYLN01", label: "unclear",
    evidenz: "within, aber Noise (Ausreißer 2,7 mm/a); Ursache nicht bestätigt.",
    date: "2026-07-06",
  },
  // --- 96637447 (Moosstraße, gba, salzburg_snt) ---------------------
  {
    buildingId: "96637447", buildingSource: "gba", datasetId: "salzburg_snt",
    track: 44, pointCode: "O37J5KI01", label: "foreign",
    evidenz: "Anti-Layover-t44-Core am Differential-Anker (Survivors-Scan S6, P7-N5).",
    date: "2026-07-06",
  },
  {
    buildingId: "96637447", buildingSource: "gba", datasetId: "salzburg_snt",
    track: 44, pointCode: "O384L6A01", label: "foreign",
    evidenz: "Anti-Layover-t44-Core am Differential-Anker (Survivors-Scan S6, P7-N5).",
    date: "2026-07-06",
  },
  {
    buildingId: "96637447", buildingSource: "gba", datasetId: "salzburg_snt",
    track: 44, pointCode: "O355F5A01", label: "foreign",
    evidenz: "Anti-Layover-t44-Core am Differential-Anker (Survivors-Scan S6, P7-N5).",
    date: "2026-07-06",
  },
  {
    buildingId: "96637447", buildingSource: "gba", datasetId: "salzburg_snt",
    track: 44, pointCode: "O36XPYO01", label: "foreign",
    evidenz: "Anti-Layover-t44-Core am Differential-Anker (Survivors-Scan S6, P7-N5).",
    date: "2026-07-06",
  },
  {
    buildingId: "96637447", buildingSource: "gba", datasetId: "salzburg_snt",
    track: 95, pointCode: "NSZL99801", label: "foreign",
    evidenz:
      "Anti-Layover + implizite Reflektorhöhe über Plausibilität (Survivors-Scan S6); " +
      "als Dachpunkt physikalisch unplausibel.",
    date: "2026-07-06",
  },
  {
    buildingId: "96637447", buildingSource: "gba", datasetId: "salzburg_snt",
    track: 95, pointCode: "NSZL99701", label: "foreign",
    evidenz: "Anti-Layover (Survivors-Scan S6); bereits Noise.",
    date: "2026-07-06",
  },
  {
    buildingId: "96637447", buildingSource: "gba", datasetId: "salzburg_snt",
    track: 95, pointCode: "NT06OUX01", label: "foreign",
    evidenz: "Anti-Layover (Survivors-Scan S6); bereits Noise.",
    date: "2026-07-06",
  },
  {
    buildingId: "96637447", buildingSource: "gba", datasetId: "salzburg_snt",
    track: 95, pointCode: "NSVF80S01", label: "roof",
    evidenz:
      "t95-Hauptcluster-Kern (directional_buffer, covered_geometry); echte Dachkerne sind " +
      "laut P7-N5 unverändert zu erhalten. Beim BEV-Lauf verloren → rotes RC-Kriterium.",
    date: "2026-07-06",
  },
  {
    buildingId: "96637447", buildingSource: "gba", datasetId: "salzburg_snt",
    track: 95, pointCode: "NSXSYFW01", label: "roof",
    evidenz: "t95-Hauptcluster-Kern (covered_geometry im Survivors-Scan); Keep-Set analog P7-N5.",
    date: "2026-07-06",
  },
  {
    buildingId: "96637447", buildingSource: "gba", datasetId: "salzburg_snt",
    track: 44, pointCode: "O33D4C101", label: "unclear",
    evidenz:
      "Implizite Reflektorhöhe verdächtig (Survivors-Scan), aber kein bestätigter " +
      "Fremdstruktur-Befund; Kandidat für Layover-Reichweiten-Check.",
    date: "2026-07-06",
  },
  {
    buildingId: "96637447", buildingSource: "gba", datasetId: "salzburg_snt",
    track: 44, pointCode: "O32ROQ901", label: "unclear",
    evidenz:
      "Implizite Reflektorhöhe verdächtig (Survivors-Scan), aber kein bestätigter " +
      "Fremdstruktur-Befund.",
    date: "2026-07-06",
  },
  // --- 105022686 (Bad Gastein flach, gba, bad_gastein_snt) ----------
  {
    buildingId: "105022686", buildingSource: "gba", datasetId: "bad_gastein_snt",
    track: 95, pointCode: "L4B171Q01", label: "roof",
    evidenz:
      "within+core+main-Kern, Distanz 0 m (auf dem Dach), quality 0.79; persistierter Run " +
      "f2c4a59e. Visual-Audit: plausibler Zwei-Track-Dachcluster.",
    date: "2026-07-07",
  },
  {
    buildingId: "105022686", buildingSource: "gba", datasetId: "bad_gastein_snt",
    track: 95, pointCode: "L498W8F01", label: "roof",
    evidenz: "within+core+main-Kern, Distanz 0 m, quality 0.78; Run f2c4a59e, Audit sauber.",
    date: "2026-07-07",
  },
  {
    buildingId: "105022686", buildingSource: "gba", datasetId: "bad_gastein_snt",
    track: 44, pointCode: "NCI03HM01", label: "roof",
    evidenz: "within+core+main-Kern, Distanz 0 m, quality 0.75; t44-Seite des Dachclusters.",
    date: "2026-07-07",
  },
  {
    buildingId: "105022686", buildingSource: "gba", datasetId: "bad_gastein_snt",
    track: 44, pointCode: "NCKDTWQ01", label: "roof",
    evidenz: "within+core+main-Kern, Distanz 0 m, quality 0.63; t44-Dachkern.",
    date: "2026-07-07",
  },
  // --- 113309843 (Bad Gastein Hang, gba, bad_gastein_tsx_paz) -------
  {
    buildingId: "113309843", buildingSource: "gba", datasetId: "bad_gastein_tsx_paz",
    track: 70, pointCode: "DQTI1RF", label: "roof",
    evidenz:
      "within+core+main-Kern, Distanz 0 m, quality 0.83; persistierter Run 51f54484. " +
      "TSX-Hangfall, Visual-Audit sauber.",
    date: "2026-07-07",
  },
  {
    buildingId: "113309843", buildingSource: "gba", datasetId: "bad_gastein_tsx_paz",
    track: 70, pointCode: "DQU3HD7", label: "roof",
    evidenz: "within+core+main-Kern, Distanz 0 m, quality 0.83; TSX-Dachkern am Hang.",
    date: "2026-07-07",
  },
  {
    buildingId: "113309843", buildingSource: "gba", datasetId: "bad_gastein_tsx_paz",
    track: 70, pointCode: "DQUOWZ0", label: "roof",
    evidenz: "within+core+main-Kern, Distanz 0 m, quality 0.82; TSX-Dachkern am Hang.",
    date: "2026-07-07",
  },
  // --- 227901743 (Bad Gastein Hang, gba, bad_gastein_snt) -----------
  {
    buildingId: "227901743", buildingSource: "gba", datasetId: "bad_gastein_snt",
    track: 44, pointCode: "NCF0XGY01", label: "roof",
    evidenz:
      "within+core+main-Kern, Distanz 0 m, quality 0.87; dichter t44-Dachkern nach echter " +
      "Dekontamination der südlichen off-Footprint-Gruppe.",
    date: "2026-07-07",
  },
  {
    buildingId: "227901743", buildingSource: "gba", datasetId: "bad_gastein_snt",
    track: 44, pointCode: "NCEFHV601", label: "roof",
    evidenz: "within+core+main-Kern, Distanz 0 m, quality 0.82; t44-Dachkern (Hang, SNT).",
    date: "2026-07-07",
  },
  {
    buildingId: "227901743", buildingSource: "gba", datasetId: "bad_gastein_snt",
    track: 95, pointCode: "L4L5KBR01", label: "roof",
    evidenz: "within+core+main-Kern, Distanz 0 m, quality 0.76; t95-Seite (Zwei-Track-Stützung).",
    date: "2026-07-07",
  },
  // --- 227901749 (Bad Gastein Hang High-N, gba, bad_gastein_snt) ----
  {
    buildingId: "227901749", buildingSource: "gba", datasetId: "bad_gastein_snt",
    track: 44, pointCode: "NCMRKC201", label: "roof",
    evidenz:
      "within+core+main-Kern, Distanz 0 m, quality 0.77; Run f2c4a59e. Gelabelt werden die " +
      "within-Dachkerne, nicht der historische Gebäudestatus.",
    date: "2026-07-07",
  },
  {
    buildingId: "227901749", buildingSource: "gba", datasetId: "bad_gastein_snt",
    track: 44, pointCode: "NCNCZXU01", label: "roof",
    evidenz: "within+core+main-Kern, Distanz 0 m, quality 0.77; t44-Dachkern (Hang, SNT).",
    date: "2026-07-07",
  },
  {
    buildingId: "227901749", buildingSource: "gba", datasetId: "bad_gastein_snt",
    track: 95, pointCode: "L4C829201", label: "roof",
    evidenz: "within+core+main-Kern, Distanz 0 m, quality 0.78; t95-Seite (Zwei-Track-Stützung).",
    date: "2026-07-07",
  },
  // --- 96856632 (Salzburg, gba, salzburg_snt) -----------------------
  {
    buildingId: "96856632", buildingSource: "gba", datasetId: "salzburg_snt",
    track: 44, pointCode: "O36XPYJ01", label: "unclear",
    evidenz:
      "nearest-Core 13,3 m vom Grundriss, implizite Reflektorhöhe über Plausibilität. GE-3D: " +
      "hohe Villa (Layover plausibel) und flacher SW-Carport — nicht auflösbar, kein " +
      "Anti-Layover → Regel 2 nicht erfüllt → unclear.",
    date: "2026-07-07",
  },
  {
    buildingId: "96856632", buildingSource: "gba", datasetId: "salzburg_snt",
    track: 44, pointCode: "O355F5701", label: "unclear",
    evidenz:
      "nearest-Core 10,1 m vom Grundriss, implizite Höhe 12,5 m über Plausibilität. GE-3D wie " +
      "O36XPYJ01: Villa-Layover vs. Carport nicht auflösbar → unclear.",
    date: "2026-07-07",
  },
  // --- 203343478 (Salzburg, gba, salzburg_snt) ----------------------
  {
    buildingId: "203343478", buildingSource: "gba", datasetId: "salzburg_snt",
    track: 95, pointCode: "NT946XL01", label: "unclear",
    evidenz:
      "Teil der versetzten nearest-Reihe (quer +8,2 m), die den kompletten Baseline-Hauptcluster " +
      "bildete — kein Punkt auf dem Dach. GE-3D: Quellstruktur im dichten Gründerzeit-Block " +
      "nicht eindeutig, kein Anti-Layover → unclear (definitiv nicht Dach, foreign nicht bestätigbar).",
    date: "2026-07-07",
  },
  {
    buildingId: "203343478", buildingSource: "gba", datasetId: "salzburg_snt",
    track: 95, pointCode: "NTC3CYH01", label: "unclear",
    evidenz: "Nachbarpunkt derselben quer+8,2-m-Reihe; off-Dach, Quellstruktur nicht eindeutig.",
    date: "2026-07-07",
  },
  {
    buildingId: "203343478", buildingSource: "gba", datasetId: "salzburg_snt",
    track: 95, pointCode: "NTAWHQX01", label: "unclear",
    evidenz: "Nachbarpunkt derselben Reihe; off-Dach, foreign nicht bestätigbar → unclear.",
    date: "2026-07-07",
  },
  // --- 96637488 (Salzburg, gba, salzburg_snt) -----------------------
  {
    buildingId: "96637488", buildingSource: "gba", datasetId: "salzburg_snt",
    track: 44, pointCode: "O2RGG8R01", label: "unclear",
    evidenz:
      "Teil der nearest-Reihe (quer −10,2 m) im Garten südlich des Grundrisses — kein Dachpunkt, " +
      "unter k2x korrekt demotiert. GE-3D: keine erkennbare eigenständige Struktur, kein " +
      "Anti-Layover → unclear.",
    date: "2026-07-07",
  },
  {
    buildingId: "96637488", buildingSource: "gba", datasetId: "salzburg_snt",
    track: 44, pointCode: "O2QV0MZ01", label: "unclear",
    evidenz: "Nachbarpunkt derselben Reihe; Gartenlage, keine bestätigte Fremdstruktur.",
    date: "2026-07-07",
  },
  {
    buildingId: "96637488", buildingSource: "gba", datasetId: "salzburg_snt",
    track: 44, pointCode: "O2Q9L1701", label: "unclear",
    evidenz: "Nachbarpunkt derselben Reihe; Gartenlage, keine bestätigte Fremdstruktur.",
    date: "2026-07-07",
  },
  // --- 113309836 (Bad Gastein Steilhang, gba, bad_gastein_tsx_paz) --
  {
    buildingId: "113309836", buildingSource: "gba", datasetId: "bad_gastein_tsx_paz",
    track: 70, pointCode: "DQU3HDL", label: "unclear",
    evidenz:
      "t70-Core 15 m über den Dachankern, einer der stärksten negativen Beweger (Watch-Item). " +
      "GE-3D: Steilhang mit Strukturen oberhalb bestätigt den Verdacht, aber Layover-Korridor " +
      "(geometrisch unentscheidbar), kein Anti-Layover → unclear.",
    date: "2026-07-07",
  },
  {
    buildingId: "113309836", buildingSource: "gba", datasetId: "bad_gastein_tsx_paz",
    track: 70, pointCode: "DQUOWZC", label: "unclear",
    evidenz: "t70-Core 13,7 m über Dachankern; Steilhang, Layover-Korridor → unclear.",
    date: "2026-07-07",
  },
  {
    buildingId: "113309836", buildingSource: "gba", datasetId: "bad_gastein_tsx_paz",
    track: 70, pointCode: "DQUOWZD", label: "unclear",
    evidenz: "t70-Core 14,3 m über Dachankern; Steilhang, Layover-Korridor → unclear.",
    date: "2026-07-07",
  },
  // --- {A9A7E442-…} (Moosstraße BEV-Anbau, bev, salzburg_snt) -------
  {
    buildingId: "{A9A7E442-BA31-41D0-8949-A120CB660943}", buildingSource: "bev",
    datasetId: "salzburg_snt",
    track: 44, pointCode: "O2G57QB01", label: "foreign",
    evidenz:
      "User-Befund 2026-07-08 (Auslöser P8-F): 8,54 m außerhalb des BEV-Anbau-Footprints auf " +
      "der Anti-Layover-Seite von t44. GE-3D + Footprint-Geometrie: offener Garten, keine " +
      "verbundene Struktur; plausible echte Quellen sind hohe Nachbargebäude. Zielverhalten: " +
      "foreign-Separation, nie annex.",
    date: "2026-07-08",
  },
  {
    buildingId: "{A9A7E442-BA31-41D0-8949-A120CB660943}", buildingSource: "bev",
    datasetId: "salzburg_snt",
    track: 44, pointCode: "O2GQNC301", label: "foreign",
    evidenz:
      "Grenzwertiger Zweitfall: 2,56 m außerhalb des BEV-Anbau-Footprints, Anti-Layover-Seite. " +
      "GE-3D: offener Garten östlich des Anbaus, keine verbundene Struktur an der Punktposition.",
    date: "2026-07-08",
  },
] as const;

/* ------------------------------------------------------------------ */
/* Benotung: Ist-Zustand × Soll-Label -> Verdict                       */
/* (phase7_clustering_experiments.py, _reference_label_state Z. 1468   */
/*  + check_reference_labels Z. 1515–1601)                             */
/* ------------------------------------------------------------------ */

/**
 * Möglicher Ist-Zustand eines gelabelten Punkts in einem Pipeline-Lauf
 * (_reference_label_state): gate-ausgeschlossene Punkte sind `excluded`;
 * foreign_suspect wird VOR annex_suspect geprüft (P8-F) — ein als Fremdpunkt
 * separierter Punkt darf nie als annex gewertet werden.
 */
export type PointState =
  | "main_core"
  | "core"
  | "annex"
  | "foreign_separated"
  | "weak_support"
  | "noise"
  | "excluded";

export const pointStateInfo: Record<PointState, { label: string; text: string }> = {
  main_core: {
    label: "Kern im Hauptcluster",
    text: "Der Punkt ist Core-Mitglied des Hauptclusters und prägt die Gebäudebewertung.",
  },
  core: {
    label: "Kern im Nebencluster",
    text: "Core-Mitglied eines Standard-Nebenclusters (nicht Hauptcluster).",
  },
  annex: {
    label: "Anbau-Cluster",
    text: "Der Punkt wurde als Bauteil/Anbau getrennt (annex_suspect).",
  },
  foreign_separated: {
    label: "Als Fremdpunkt separiert",
    text: "Der Punkt wurde als Fremdreflektor separiert (foreign_suspect).",
  },
  weak_support: {
    label: "Schwache Stützung",
    text: "Zu wenig konsistente Stützung; fließt nicht in Bewertung und Differential ein.",
  },
  noise: {
    label: "Noise",
    text: "Vom Clustering als Ausreißer markiert.",
  },
  excluded: {
    label: "Gate-Ausschluss",
    text: "An den harten Qualitätsgates gescheitert (z. B. zu wenige Epochen, niedrige Kohärenz).",
  },
};

export type LabelVerdict =
  | "roof_kept"
  | "roof_lost"
  | "foreign_in_main"
  | "foreign_in_annex"
  | "foreign_caught"
  | "foreign_in_secondary_core"
  | "annex_merged"
  | "annex_in_foreign"
  | "annex_separated"
  | "annex_demoted"
  | "unclear_not_scored";

/**
 * Benotung eines gelabelten Punkts, 1:1 wie `check_reference_labels`
 * (phase7_clustering_experiments.py Z. 1546–1596):
 * - roof: verloren (excluded/noise/annex/foreign_separated) -> roof_lost.
 * - foreign: im Hauptcluster -> foreign_in_main; im annex -> foreign_in_annex
 *   (P8-F: semantische Fehlablage, vorher fälschlich als Erfolg gezählt);
 *   demotiert/separiert -> foreign_caught; sonst -> foreign_in_secondary_core.
 * - annex: im Hauptcluster -> annex_merged; als foreign separiert ->
 *   annex_in_foreign; im annex-Cluster -> annex_separated; sonst annex_demoted.
 * - unclear: nicht gewertet.
 */
export function gradeReferenceLabel(label: SilverLabel, state: PointState): LabelVerdict {
  if (label === "roof") {
    return state === "excluded" || state === "noise" || state === "annex" ||
      state === "foreign_separated"
      ? "roof_lost"
      : "roof_kept";
  }
  if (label === "foreign") {
    if (state === "main_core") return "foreign_in_main";
    if (state === "annex") return "foreign_in_annex";
    if (
      state === "excluded" || state === "noise" || state === "weak_support" ||
      state === "foreign_separated"
    ) {
      return "foreign_caught";
    }
    return "foreign_in_secondary_core";
  }
  if (label === "annex") {
    if (state === "main_core") return "annex_merged";
    if (state === "foreign_separated") return "annex_in_foreign";
    if (state === "annex") return "annex_separated";
    return "annex_demoted";
  }
  return "unclear_not_scored";
}

export type VerdictTone = "good" | "warning" | "bad" | "neutral";

/**
 * Bewertung der Verdicts (reference_labels.md §Verwendung + Scorecard-Gates
 * phase7_clustering_experiments.py Z. 1727–1793). `rotesGate` markiert
 * Verdicts, die eine Scorecard sofort auf Rot stellen.
 */
export const verdictInfo: Record<
  LabelVerdict,
  { label: string; ton: VerdictTone; rotesGate: boolean; text: string }
> = {
  roof_kept: {
    label: "Dachpunkt erhalten",
    ton: "good", rotesGate: false,
    text: "Der gelabelte Dachpunkt bleibt score-relevant — genau so soll es sein.",
  },
  roof_lost: {
    label: "Dachpunkt verloren",
    ton: "bad", rotesGate: true,
    text:
      "Ein bestätigter Dachpunkt wurde ausgeschlossen, zu Noise oder in einen Anbau-/" +
      "Fremdcluster verschoben — die Hygiene war zu aggressiv (absolutes Roof-Loss-Gate).",
  },
  foreign_in_main: {
    label: "Fremdpunkt im Hauptcluster",
    ton: "bad", rotesGate: true,
    text: "Ein bestätigter Fremdpunkt prägt die Gebäudebewertung — Kontamination.",
  },
  foreign_in_annex: {
    label: "Fremdpunkt als Anbau etikettiert",
    ton: "bad", rotesGate: true,
    text:
      "Das annex-Etikett behauptet „baulich verbundener Teil dieses Gebäudes“ — für einen " +
      "Fremdpunkt eine semantische Fehlaussage, auch wenn er den Score nicht prägt. Vor P8-F " +
      "wurde dieser Fall fälschlich als Erfolg gezählt.",
  },
  foreign_caught: {
    label: "Fremdpunkt gefangen",
    ton: "good", rotesGate: false,
    text: "Der Fremdpunkt wurde separiert, demotiert oder ausgeschlossen — korrekt.",
  },
  foreign_in_secondary_core: {
    label: "Fremdpunkt im Nebencluster",
    ton: "warning", rotesGate: false,
    text: "Der Fremdpunkt sitzt in einem Standard-Nebencluster — nicht ideal, prägt aber nicht den Hauptbefund.",
  },
  annex_merged: {
    label: "Anbau im Hauptcluster verschmolzen",
    ton: "warning", rotesGate: false,
    text:
      "Fehler, wenn sich der Anbau kinematisch anders verhält als der Hauptbau; bewegen sich " +
      "beide gleich, ist der gemeinsame Cluster statistisch korrekt (Prinzip: Cluster folgen " +
      "dem Verhalten, Flags folgen der Struktur).",
  },
  annex_in_foreign: {
    label: "Anbau als Fremdpunkt separiert",
    ton: "bad", rotesGate: true,
    text:
      "Ein echter, baulich verbundener Anbau-Punkt wurde als Fremdreflektor aussortiert — " +
      "das schadensrelevante Differentialsignal geht verloren.",
  },
  annex_separated: {
    label: "Anbau korrekt getrennt",
    ton: "good", rotesGate: false,
    text: "Eigener Anbau-Cluster mit Differentialbewertung — das Ideal bei abweichendem Verhalten.",
  },
  annex_demoted: {
    label: "Anbau demotiert",
    ton: "warning", rotesGate: false,
    text:
      "Signal verloren (suboptimal), aber besser als kinematisch abweichend im Hauptcluster " +
      "verschmolzen.",
  },
  unclear_not_scored: {
    label: "Nicht gewertet",
    ton: "neutral", rotesGate: false,
    text: "unclear-Labels zählen weder als Treffer noch als Fehler; sie werden nur gelistet.",
  },
};

export const POINT_STATES: readonly PointState[] = [
  "main_core", "core", "annex", "foreign_separated", "weak_support", "noise", "excluded",
];

export const SILVER_LABELS: readonly SilverLabel[] = ["roof", "annex", "foreign", "unclear"];

/* ------------------------------------------------------------------ */
/* Harness: Pflicht-AOIs, Referenzfälle, No-op-Baselines               */
/* ------------------------------------------------------------------ */

/** Feste Pflicht-AOIs (phase2_harness.py FIXED_AOI_RUNS Z. 57–73). */
export const fixedAois = [
  {
    name: "Mirabell",
    kurz: "Flacher Kontrollbereich",
    bbox: [13.04027, 47.80375, 13.04387, 47.80735],
  },
  {
    name: "Moosstraße",
    kurz: "Fachlich relevanter Praxisbereich",
    bbox: [13.02714, 47.79189, 13.03074, 47.79549],
  },
  {
    name: "Osthang-Stressbereich",
    kurz: "Steilhang-/Relief-Stress",
    bbox: [13.0492, 47.8036, 13.0528, 47.8054],
  },
] as const;

/**
 * Referenzfall-Katalog (phase7_reference_cases.json): feste Gebäude mit
 * erwartetem Status; 2 Fälle tragen zusätzlich maschinelle Punkt-Pins
 * (`point_expectations` mit `only_sources`), gegen die jeder Lauf geprüft
 * wird — fachliche Punkt-Erwartungen existieren nie mehr nur als Prosa.
 */
export const referenceCases = {
  anzahl: 20,
  mitPunktPins: 2,
  gepinntePunkte: 7,
} as const;

/**
 * No-op-Verifikation beim v4-Stand (phase8_v4_rc_gate_results.md):
 * der Harness reproduziert alle persistierten Baseline-Läufe bitidentisch.
 */
export const noopV4 = {
  aois: 10,
  punkte: 23278,
  rollups: 870,
  differenzen: 0,
} as const;

/* ------------------------------------------------------------------ */
/* v4-Release-Candidate-Gate (phase8_v4_rc_gate_results.md, 2026-07-10)*/
/* ------------------------------------------------------------------ */

export const rcGateV4 = {
  datum: "2026-07-10",
  ergebnis: "geprüft, nicht akzeptiert" as const,
  gruen: [
    "Persistierte v4-Parität: 10 Runs, 23.278 Punkte, 870 Rollups, 0 Mismatches",
    "10-AOI-No-op bitidentisch (only_db=0, only_harness=0, differing=0)",
    "Differential-Verteilung unverändert",
    "Clusterarten-Reinheit: foreign_in_annex=0, annex_in_foreign=0, foreign_in_main=0",
  ],
  rot: [
    "Differentialfall 96637447 bleibt ohne neue Nahansicht candidate (+2,69 mm/a) — fachlich unklar",
    "BEV-Dachpunkterhalt: roof_lost=1 (NSVF80S01, Track 95, Gebäude 96637447, moosstrasse_bev)",
  ],
  differentialVerteilung: { none: 849, candidate: 17, significant: 4, confirmed: 0 },
  /** 46 Korpus-Punkte ergeben 82 Auswertungen, weil Labels je passender AOI/Quelle (gba+bev) mehrfach geprüft werden. */
  labelAuswertungen: 82,
} as const;

/* ------------------------------------------------------------------ */
/* Story-Fälle (iterations.md, reference_labels.md, RC-Gate)           */
/* ------------------------------------------------------------------ */

export type StoryCase = {
  id: string;
  titel: string;
  ort: string;
  /** ton: fachliche Bewertung des jeweiligen Zustands für die Anzeige. */
  vorher: { label: string; folge: string; ton: "good" | "warning" | "bad" };
  nachher: { label: string; folge: string; ton: "good" | "warning" | "bad" };
  lehre: string;
};

export const storyCases: readonly StoryCase[] = [
  {
    id: "96959851",
    titel: "Der Anbau, der ein Nebengebäude sein sollte",
    ort: "Moosstraße, Salzburg (Punkte NTC3CYZ01 / NTDA86J01)",
    vorher: {
      ton: "bad",
      label: "foreign (unkartiertes Nebengebäude)",
      folge:
        "Die Blechdach-Punkte galten als Fremdreflektoren und verfälschten zuvor den " +
        "Bewegungswert des Hauptclusters (−0,64 statt +0,1/+0,4 mm/a).",
    },
    nachher: {
      ton: "good",
      label: "annex (baulich verbundener Anbau)",
      folge:
        "Google-Earth-3D zeigte die gemeinsame Wand am SW-Giebel: eigener Anbau-Cluster mit " +
        "Differentialbewertung statt Entfernung.",
    },
    lehre:
      "Seitdem ist die Google-Earth-3D-Prüfung Pflichtschritt vor jeder foreign-Vergabe — und " +
      "der Survivors-Scan fragt nicht mehr nur „ist die bekannte Kontamination weg?“, sondern " +
      "„ist alles Verbleibende gerechtfertigt?“.",
  },
  {
    id: "A9A7E442",
    titel: "Die Fremdpunkte, die als Anbau durchgingen",
    ort: "Moosstraße, BEV-Anbau-Footprint (Punkte O2G57QB01 / O2GQNC301, Track 44)",
    vorher: {
      ton: "bad",
      label: "annex_0-Cluster (v3)",
      folge:
        "Punkte auf der Anti-Layover-Seite — physikalisch unmöglich als Dachreflektoren — " +
        "wurden als Anbau etikettiert; die Alt-Metrik zählte das sogar als Erfolg.",
    },
    nachher: {
      ton: "good",
      label: "foreign (v4, P8-F)",
      folge:
        "GE-3D + Footprint-Geometrie: offener Garten, keine verbundene Struktur. " +
        "foreign_in_annex und annex_in_foreign wurden eigene rote Gates.",
    },
    lehre:
      "Eine neue semantische Kategorie braucht vom ersten Tag an eigene Reinheitsmetriken und " +
      "maschinelle Punkt-Pins — sonst bleibt die Fehlablage unsichtbar.",
  },
  {
    id: "NSVF80S01",
    titel: "Der Dachpunkt, den der BEV-Lauf verlor",
    ort: "Moosstraße, Gebäude 96637447 (Punkt NSVF80S01, Track 95)",
    vorher: {
      ton: "good",
      label: "roof — t95-Hauptcluster-Kern (gba-Lauf)",
      folge: "Bestätigter Dachkern, laut Keep-Set unverändert zu erhalten.",
    },
    nachher: {
      ton: "bad",
      label: "excluded im BEV-Lauf → roof_lost",
      folge:
        "Der BEV-Footprint schneidet den Gebäudekomplex anders als GBA; der echte Dachpunkt " +
        "fällt heraus und setzt das absolute Roof-Loss-Gate auf Rot (RC-Kriterium).",
    },
    lehre:
      "Label-Bewertung muss die Gebäudequelle explizit berücksichtigen (offener R9-Fall: " +
      "quellenspezifisches Grading).",
  },
  {
    id: "96637447",
    titel: "Der Differentialfall ohne Beweisfoto",
    ort: "Moosstraße, Gebäude 96637447",
    vorher: {
      ton: "good",
      label: "Differential-Anker mit Anti-Layover-Cores",
      folge:
        "Sieben Fremdpunkte wurden gefangen, zwei echte Dachkerne erhalten — der Fall trug " +
        "jahrelang die Multi-Cluster-Referenz.",
    },
    nachher: {
      ton: "bad",
      label: "candidate +2,69 mm/a im v4-RC",
      folge:
        "Ohne neue fokussierte Nahansicht der zwei Annex-Punkte bleibt das Level candidate, " +
        "obwohl none erwartet war — das RC-Gate blieb Rot (v4 geprüft, nicht akzeptiert).",
    },
    lehre:
      "Ein rotes Gate wird fachlich geklärt und die Erwartung maschinell gepinnt — keine " +
      "Schwelle wird verändert, nur damit ein Gate grün wird.",
  },
] as const;

/* ------------------------------------------------------------------ */
/* Grenzen und Ausbau (next_steps.md P1-1/P1-2/P1-3)                   */
/* ------------------------------------------------------------------ */

export const ausbau = {
  zielGebaeude: "20–40",
  schritte: [
    {
      id: "P1-1",
      titel: "Label-Korpus stratifiziert erweitern",
      text:
        "Von 10 auf 20–40 Gebäude: Salzburg und Bad Gastein, flach und Hang, Small-N und " +
        "High-N, alle Clusterarten, SNT und TSX/PAZ. Jedes Label mit Quelle, Evidenz, Datum, " +
        "Modell-/Datenstand und unclear-Option; BEV/GBA-Grading quellenspezifisch.",
    },
    {
      id: "P1-2",
      titel: "Unabhängige Gegenprüfung",
      text:
        "Domänenexperten labeln eine unabhängige Teilstichprobe; Inter-Rater-Abweichungen " +
        "bleiben erhalten; echte Holdout-Gebäude und mindestens ein Holdout-Gebiet, die nie " +
        "zum Parametertuning verwendet werden; Precision/Recall/F1 berichten.",
    },
    {
      id: "P1-3",
      titel: "Zuverlässigkeit kalibrieren",
      text:
        "Der interne Zuverlässigkeitswert wird erst nach Kalibrierung gegen Experten-/" +
        "Holdout-Evidenz als mehr als ein Evidenzmaß kommuniziert — bis dahin keine " +
        "prozentualen Schadens- oder Trefferwahrscheinlichkeiten.",
    },
  ],
} as const;

/** Gegenüberstellung für das Kapitel „Grenzen": heute (Silver) vs. Ziel (Gold). */
export const silverVsGold = [
  {
    aspekt: "Wer labelt?",
    silver: "Projektteam (team_internal), gestützt auf dokumentierte Evidenz",
    gold: "Unabhängige Domänenexperten mit Inter-Rater-Kontrolle",
  },
  {
    aspekt: "Umfang",
    silver: "10 Gebäude / 46 Punkte, bewusst um Problemfälle herum aufgebaut",
    gold: "20–40 stratifizierte Gebäude inkl. unauffälliger Normalfälle",
  },
  {
    aspekt: "Unabhängigkeit",
    silver: "Dieselben Fälle prägen auch die Modellentwicklung (kein Holdout)",
    gold: "Echte Holdout-Gebäude und mindestens ein Holdout-Gebiet ohne Tuning-Kontakt",
  },
  {
    aspekt: "Aussagekraft",
    silver: "Regressionsschutz und Benotung von Modelländerungen",
    gold: "Belastbare Precision/Recall/F1 und kalibrierte Zuverlässigkeitsaussagen",
  },
] as const;
