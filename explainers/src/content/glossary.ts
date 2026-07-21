/**
 * Glossar der Fachbegriffe — adaptiert aus dem Viewer-Glossar
 * (`frontend/src/lib/attributeMetadata.ts`) und der aktiven Methodik
 * (`docs/pipelines/anomaly_local_v1/methodik.md`).
 */
export type GlossaryEntry = {
  begriff: string;
  text: string;
  einheit?: string;
  viewerHinweis?: string;
};

export const glossary = {
  insar: {
    begriff: "InSAR",
    text:
      "Satellitengestützte Radar-Interferometrie: Aus wiederholten Radaraufnahmen werden " +
      "millimetergenaue Bewegungen stabiler Reflektoren (z. B. Dächer, Fassaden) abgeleitet.",
  },
  los: {
    begriff: "Blickrichtung (LOS)",
    text:
      "Line of Sight: InSAR misst Bewegung entlang der Radar-Blicklinie, nicht direkt vertikal. " +
      "Positive Werte bedeuten Bewegung zum Satelliten, negative weg vom Satelliten.",
    einheit: "mm/Jahr",
  },
  track: {
    begriff: "Track",
    text:
      "Wiederholte Satellitenbahn. In Salzburg blickt Track 44 aufsteigend (ASC) von Westen, " +
      "Track 95 absteigend (DSC) von Osten — dasselbe Gebäude wird aus zwei Richtungen gesehen.",
  },
  layover: {
    begriff: "Layover",
    text:
      "Radar-Projektionseffekt: Hohe Objekte werden in der Radargeometrie zum Satelliten hin " +
      "verschoben abgebildet. Dachpunkte erscheinen deshalb oft neben dem Gebäudegrundriss.",
  },
  verticalProxy: {
    begriff: "Vertikal-Proxy",
    text:
      "Vorzeichenbewahrende Näherung der vertikalen Bewegung aus LOS-Geschwindigkeit und " +
      "Einfallswinkel. Keine echte 3D- oder 2D-Dekomposition.",
    einheit: "mm/Jahr",
  },
  incidence: {
    begriff: "Einfallswinkel",
    text:
      "Winkel zwischen Radar-Blickrichtung und der Senkrechten. Bestimmt, wie stark hohe Gebäude " +
      "in der Radargeometrie verschoben werden — und wie LOS-Bewegung in die vertikale Näherung " +
      "umgerechnet wird.",
    einheit: "Grad",
  },
  coherence: {
    begriff: "Kohärenz",
    text:
      "Signal- und Modellstabilität im Bereich 0–1. Höhere Werte bedeuten in dieser Verarbeitung " +
      "robustere Punktzeitreihen.",
    einheit: "0–1",
  },
  velocity: {
    begriff: "Geschwindigkeit",
    text:
      "Mittlere Bewegung entlang der Radar-Blicklinie. Positive Werte bedeuten Bewegung zum " +
      "Satelliten, negative Werte weg vom Satelliten.",
    einheit: "mm/Jahr",
  },
  epoche: {
    begriff: "Epoche",
    text:
      "Ein einzelner Aufnahmezeitpunkt des Satelliten. Die Bewegungszeitreihe eines Punkts besteht " +
      "aus vielen Epochen über mehrere Jahre.",
  },
  candidateArea: {
    begriff: "Candidate Area",
    text:
      "Richtungssensitive Suchfläche je Gebäude und Track: der Grundriss plus seine entlang der " +
      "Radar-Blickrichtung verschobene Kopie. Sie modelliert, wohin Dachpunkte durch Layover " +
      "projiziert werden.",
  },
  assignmentMethod: {
    begriff: "Zuordnungsmethode",
    text:
      "Wie ein Punkt seinem Gebäude zugeordnet wurde: within (im Grundriss), directional_buffer " +
      "(in der Candidate Area) oder nearest (Nächster-Nachbar-Fallback). Die Methode bleibt am " +
      "Punkt sichtbar.",
  },
  gateReasons: {
    begriff: "Gate-Gründe",
    text:
      "Liste der harten Ausschlussgründe eines Punkts, zum Beispiel fehlende Gebäudezuordnung, " +
      "zu wenige Epochen oder niedrige Kohärenz. Ausgeschlossene Punkte bleiben sichtbar.",
  },
  madToleranz: {
    begriff: "Median/MAD-Toleranz",
    text:
      "Robuste Statistik: Der Median ist der mittlere Wert, die MAD (Median Absolute Deviation) " +
      "das robuste Streumass. Toleranzen aus Median + Vielfachem der MAD sind unempfindlich " +
      "gegen einzelne Ausreißer.",
  },
  clusterKind: {
    begriff: "Cluster-Typ",
    text:
      "Semantischer Cluster-Typ: standard für reguläre Gebäudecluster, annex für getrennte " +
      "Bauteile oder Anbauten und foreign für separierte Fremdreflektoren.",
    viewerHinweis: "Im Viewer: Standardcluster, Bauteil / Anbau, Fremdreflektor.",
  },
  clusterRole: {
    begriff: "Cluster-Rolle",
    text:
      "Rolle des Punkts im lokalen Cluster: core (belastbares Mitglied), weak_support (schwache " +
      "Stützung, fließt nicht in Bewertung und Differential ein), noise (Ausreißer), excluded " +
      "(Gate-Ausschluss) oder insufficient_support (zu wenige Punkte).",
  },
  hdbscan: {
    begriff: "HDBSCAN",
    text:
      "Dichtebasiertes Clusterverfahren: findet Gruppen ähnlicher Punkte ohne vorgegebene " +
      "Clusteranzahl und markiert nicht zuordenbare Punkte ehrlich als Noise.",
  },
  mainCluster: {
    begriff: "Hauptcluster",
    text:
      "Der belastbarste Standardcluster eines Gebäudes je Track — er trägt die Bewegungsbewertung. " +
      "Anbau- und Fremdcluster können nie Hauptcluster werden.",
  },
  anomalyScore: {
    begriff: "Anomaliewert",
    text:
      "Auffälligkeit des Punkts im Bereich 0–1. Höher bedeutet auffälliger; der Wert kombiniert " +
      "Cluster-Ausreißer, lokale Abweichung und fachliche Regel-Abzüge.",
    einheit: "0–1",
  },
  qualityScore: {
    begriff: "Qualitätswert",
    text:
      "Punktqualität im Bereich 0–1. Höher bedeutet belastbarer; er kombiniert Anomalie, " +
      "Track-Konsistenz, lokalen Support und Signalqualität.",
    einheit: "0–1",
  },
  trackAgreement: {
    begriff: "Track-Übereinstimmung",
    text:
      "Gebäudeweite Übereinstimmung zwischen den Hauptclustern der verfügbaren Tracks (0–1). " +
      "Ein Plausibilitätsindikator, kein Beweis.",
    einheit: "0–1",
  },
  differentialLevel: {
    begriff: "Differenzielle Bewegung (Stufe)",
    text:
      "Vierstufige Bewertung: keine, Kandidat (Unterschied überschreitet die Schwelle), signifikant " +
      "(Unterschied größer als 2 Sigma) oder bestätigt (zweite Blickrichtung bestätigt das " +
      "Vorzeichen). Ein leerer Wert kennzeichnet einen historischen Modellstand ohne Level.",
  },
  sigma: {
    begriff: "Sigma (Standardfehler)",
    text:
      "Statistische Unsicherheit des Bewegungsunterschieds. Ein Unterschied gilt erst als " +
      "signifikant, wenn er mindestens doppelt so groß ist wie seine eigene Unsicherheit.",
    einheit: "mm/Jahr",
  },
  reliabilityScore: {
    begriff: "Zuverlässigkeitswert",
    text:
      "Internes Evidenzmaß 0–1 für den Gebäudebefund, gebildet aus Stützung, Signalqualität, " +
      "Zuordnungsqualität und Track-Übereinstimmung abzüglich benannter Schwächen. Keine " +
      "Schadenswahrscheinlichkeit.",
    einheit: "0–1",
  },
  bev: {
    begriff: "BEV-Gebäude",
    text:
      "Amtliche Gebäudegrundrisse des Bundesamts für Eich- und Vermessungswesen — die " +
      "Standard-Gebäudequelle der Pipeline. BEV kartiert Anbauten als eigene Grundrisse.",
  },
  gba: {
    begriff: "GBA-Gebäude",
    text:
      "Global Building Atlas: globale, automatisch abgeleitete Gebäudegrundrisse als " +
      "Vergleichsquelle. Höhen sind teils gesättigt und werden rechnerisch korrigiert; Anbauten " +
      "sind oft nicht einzeln kartiert.",
  },
  ascDsc: {
    begriff: "ASC / DSC",
    text:
      "Aufsteigende (ascending) und absteigende (descending) Satellitenbahn. Zwei unabhängige " +
      "Blickrichtungen auf dasselbe Gebäude — ihr Vergleich ist die wichtigste Plausibilitätsprüfung.",
  },
  smallN: {
    begriff: "Small-N",
    text:
      "Situation mit sehr wenigen verwertbaren Punkten (3–5) an einem Gebäude × Track. Statt " +
      "HDBSCAN greift ein konservativer Fallback, der Konsistenz verlangt statt Gruppen zu erfinden.",
  },
  keptPoints: {
    begriff: "Behaltene Punkte (kept)",
    text:
      "Punkte, die alle Qualitätsgates bestanden haben und in Clustering und Bewertung einfliessen. " +
      "Das Gegenteil ist gate_excluded.",
  },
  // --- Begriffe des Silver-Ground-Truth-Explainers -------------------
  silverGroundTruth: {
    begriff: "Silver Ground Truth",
    text:
      "Der interne, maschinenlesbare Referenzlabel-Korpus des Projekts: punktgenaue Urteile aus " +
      "Visual Audits, Survivors-Scans und User-Befunden. „Silver“, weil vom Projektteam erhoben " +
      "und nicht unabhängig expertenvalidiert.",
  },
  goldStandard: {
    begriff: "Gold-Standard",
    text:
      "Unabhängig erhobene, expertenvalidierte Referenzwahrheit mit echten Holdout-Fällen. Für " +
      "dieses Projekt das Ziel — kurzfristig nicht verfügbar, deshalb intern die Silver Ground Truth.",
  },
  referenzlabel: {
    begriff: "Referenzlabel",
    text:
      "Ein dokumentiertes Urteil über einen einzelnen InSAR-Punkt (roof, annex, foreign oder " +
      "unclear) samt Evidenz, Datum und Quelle. Eine Zeile im Korpus reference_labels.json.",
  },
  visualAudit: {
    begriff: "Visual Audit",
    text:
      "Manuelle Bildprüfung eines Falls: Karten-Screenshot mit eingezeichneten Punktrollen " +
      "(Kern, Noise, ausgeschlossen), gegen Orthofoto und Google Earth gelesen. Liefert Evidenz " +
      "für Labels und prüft Modelländerungen visuell.",
  },
  survivorsScan: {
    begriff: "Survivors-Scan",
    text:
      "Automatische Gegenprüfung der ÜBERLEBENDEN Punkte außerhalb des Gebäudegrundrisses: Ist " +
      "jeder verbliebene Punkt physikalisch erklärbar (Layover-Reichweite, Höhe, Richtung)? " +
      "Entstanden aus der Lehre, dass es nicht reicht zu fragen, ob bekannte Kontamination weg ist.",
  },
  harness: {
    begriff: "Harness",
    text:
      "Das Test- und Auswertegeschirr der Pipeline: feste Test-Gebiete, eingefrorene " +
      "Vergleichsläufe, Label-Benotung und Scorecards. Es macht Modelländerungen reproduzierbar " +
      "prüfbar, ohne die Produktionsdaten anzufassen.",
  },
  aoi: {
    begriff: "AOI",
    text:
      "Area of Interest: ein festes Testgebiet mit definierter Bounding Box. Die Pflicht-AOIs " +
      "(u. a. Mirabell, Moosstraße, Osthang) werden bei jeder Modellprüfung in fester Reihenfolge " +
      "ausgewertet.",
  },
  noopBaseline: {
    begriff: "No-op-Baseline",
    text:
      "Eingefrorener Vergleichslauf: Der Harness muss einen persistierten Lauf ohne Änderung " +
      "bitidentisch reproduzieren (0 Differenzen), bevor eine Modelländerung bewertet wird. " +
      "Baselines dürfen nie neu geschrieben werden, um eine Regression zu verdecken.",
  },
  scorecard: {
    begriff: "Scorecard",
    text:
      "Automatischer Prüfbericht eines Experiments: Label-Metriken, Referenzfall-Status und " +
      "Gate-Ergebnisse mit einem Gesamturteil (grün/rot/inconclusive). Grundlage für " +
      "Integrationsentscheidungen.",
  },
  rcGate: {
    begriff: "Release-Candidate-Gate",
    text:
      "Gesammelte Abschlussprüfung vor der fachlichen Akzeptanz eines Modellstands: Parität, " +
      "No-op, Reinheits- und Fachkriterien. Ein einziges rotes Kriterium hält das Gate auf — " +
      "beim v4-Stand blieb es deshalb bei „geprüft, nicht akzeptiert“.",
  },
  referenzfall: {
    begriff: "Referenzfall",
    text:
      "Ein festes Gebäude mit dokumentiert erwartetem Ergebnis (Status, teils maschinell " +
      "gepinnte Punkt-Erwartungen). Jeder Lauf wird automatisch gegen diese Erwartungen geprüft — " +
      "fachliche Urteile existieren nie nur als Prosa.",
  },
  holdout: {
    begriff: "Holdout",
    text:
      "Zurückgehaltene Fälle oder Gebiete, die nie zum Einstellen des Modells verwendet werden. " +
      "Nur an ihnen lässt sich echte Generalisierung messen. Der Silver-Korpus hat noch keine " +
      "Holdouts — ein zentraler Grund, warum er „Silver“ und nicht „Gold“ ist.",
  },
} as const;

export type GlossaryKey = keyof typeof glossary;
