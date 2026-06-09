export type SmallNPoint = {
  id: string;
  x: number;
  y: number;
  velocity: number;
  acceleration: number;
  step: number;
  heightRank: number;
  coherence: number;
};

export type SmallNScenario = {
  id: string;
  title: string;
  shortLabel: string;
  question: string;
  takeaway: string;
  points: SmallNPoint[];
};

export type SmallNStep = {
  title: string;
  label: string;
  detail: string;
  why: string;
  variables: Array<{ name: string; meaning: string }>;
  interpretation: string;
  codeHint: string;
};

export const smallNSteps: SmallNStep[] = [
  {
    title: "Input-Gruppe",
    label: "Gebaeude x Track",
    detail:
      "Die Pipeline betrachtet eine lokale Track-Gruppe. Gate-excluded Punkte sind fuer Small-N nicht mehr im kept-Set.",
    why:
      "Small-N soll nur noch mit Punkten arbeiten, die die vorgelagerten Qualitaets-Gates ueberstanden haben. Ein ausgeschlossener Punkt kann weiterhin angezeigt werden, soll aber die Clusterentscheidung nicht mitpraegen.",
    variables: [
      { name: "building_id", meaning: "Gebaeude, dem der InSAR-Punkt aktuell zugeordnet ist." },
      { name: "track", meaning: "SAR-Aufnahmerichtung bzw. Orbit/Track. Ascending und descending werden nicht vermischt." },
      { name: "kept", meaning: "Punkte ohne Gate-Ausschluss. Nur diese Punkte gehen in Small-N ein." },
      { name: "gate_excluded", meaning: "Punkte mit zu wenig Daten, zu schlechter Qualitaet oder anderen harten Ausschlussgruenden." },
    ],
    interpretation:
      "Die erste wichtige Aussage ist also: Small-N ist keine Methode fuer alle Rohpunkte, sondern fuer die wenigen verwertbaren Punkte innerhalb eines Gebaeudes und Tracks.",
    codeHint: "building_track_groups[(building_id, track)] -> kept = not gate_excluded",
  },
  {
    title: "Branch-Entscheidung",
    label: "Punktanzahl",
    detail:
      "Die kept-Punktanzahl entscheidet: unter 3 keine Clusterung, 3 bis 5 Small-N, ab 6 HDBSCAN/OPTICS.",
    why:
      "Dichtebasierte Algorithmen brauchen eine gewisse Mindestzahl an Punkten, damit Nachbarschaft und Dichte ueberhaupt sinnvoll schaetzbar sind. Bei 3 bis 5 Punkten waere HDBSCAN schnell ueberinterpretiert, deshalb nutzt die Pipeline hier eine explizit konservative Sonderlogik.",
    variables: [
      { name: "n < 3", meaning: "Zu wenig Stuetzpunkte. Ergebnis wird insufficient_support statt Cluster." },
      { name: "3 <= n <= 5", meaning: "Small-N-Bereich. Es wird eine Ein-Cluster-Hypothese gegen lokale Ausreisser getestet." },
      { name: "n >= 6", meaning: "Dichte-Clusterung wird verwendet: HDBSCAN, oder OPTICS wenn HDBSCAN nicht verfuegbar ist." },
      { name: "kept_point_count_track", meaning: "Anzahl der verwertbaren Punkte fuer dieses Gebaeude in diesem Track." },
    ],
    interpretation:
      "Die Zahl der Punkte ist hier selbst eine Confidence-Information. Small-N heisst nicht: sicherer Cluster. Es heisst: vorsichtige Heuristik, weil fuer HDBSCAN zu wenig Punkte vorhanden sind.",
    codeHint: "<3 insufficient_support | 3-5 _apply_small_n_fallback | >=6 _apply_density_clustering",
  },
  {
    title: "Local-Deviation-Score",
    label: "Robuste Abweichung",
    detail:
      "Der Score vergleicht jeden Punkt robust mit der lokalen Gruppe: Bewegung, Beschleunigung, groesster Sprung in der LOS-Displacement-Zeitreihe, Radar-Geometrie, Hoehenrang und Kohärenz.",
    why:
      "Bei wenigen Punkten ist ein Durchschnitt sehr empfindlich. Deshalb wird robust mit Median und MAD gedacht: Ein Punkt wird danach bewertet, wie stark er relativ zur kleinen lokalen Gruppe auffaellt.",
    variables: [
      { name: "velocity -> velocity_z", meaning: "LOS-Bewegung des Punktes; velocity_z ist die robuste Abweichung von der lokalen Median-Geschwindigkeit." },
      { name: "acceleration -> acceleration_z", meaning: "Aenderung des Bewegungstrends; acceleration_z ist die robuste lokale Abweichung." },
      {
        name: "ts_primary_step_abs -> step_z",
        meaning:
          "Groesster absoluter Sprung zwischen zwei aufeinanderfolgenden LOS-Displacement-Werten. Das kommt aus insar_timeseries.displacement, nicht aus der Amplituden-Zeitreihe.",
      },
      { name: "along_look_offset_m -> along_z", meaning: "Raeumlicher Offset entlang der Radar-Blickrichtung; wird getrennt von cross_z bewertet." },
      { name: "cross_look_offset_m -> cross_z", meaning: "Raeumlicher Offset quer zur Radar-Blickrichtung; wird getrennt von along_z bewertet." },
      { name: "height_rank_in_building -> height_edge", meaning: "Relative Hoehenposition im Gebaeude; Randlagen werden auffaelliger." },
      { name: "coherence -> coherence_gap", meaning: "Signalqualitaet; niedrige Kohärenz erzeugt eine Kohärenzluecke." },
    ],
    interpretation:
      "Der finale Score ist der Maximalwert der Teilauffaelligkeiten. Ein einzelner sehr auffaelliger Aspekt kann also reichen, damit ein Punkt als riskant erscheint.",
    codeHint:
      "max(velocity_z/3.5, acceleration_z/3.5, step_z/3.0, along_z/4.0, cross_z/4.0, height_edge, coherence_gap)",
  },
  {
    title: "Threshold",
    label: "Core oder Noise",
    detail:
      "Im Repo ist der Default small_n_noise_threshold = 0.80. Scores darunter oder gleich werden Core, darueber Noise.",
    why:
      "Die Schwelle ist bewusst relativ tolerant: Bei nur 3 bis 5 Punkten soll nicht jede moderate Abweichung sofort als Noise gelten. Nur klar auffaellige Punkte werden aus dem angenommenen Kerncluster herausgenommen.",
    variables: [
      { name: "small_n_noise_threshold", meaning: "Default 0.80. Interpretiert als Grenze zwischen plausibler Kernzugehoerigkeit und Noise." },
      { name: "score <= threshold", meaning: "Punkt bleibt Core des angenommenen Small-N-Clusters." },
      { name: "score > threshold", meaning: "Punkt wird Noise, weil er lokal zu stark abweicht." },
      { name: "Core", meaning: "Punkt stuetzt die Ein-Cluster-Hypothese." },
      { name: "Noise", meaning: "Punkt passt nicht ausreichend zur lokalen Gruppe." },
    ],
    interpretation:
      "Ein Core-Punkt ist bei Small-N kein starker Beweis fuer ein echtes physisches Objekt. Es bedeutet nur: Unter dieser Heuristik ist er nicht auffaellig genug, um ausgeschlossen zu werden.",
    codeHint: "core_mask = scores <= noise_threshold",
  },
  {
    title: "Safety-Fallback",
    label: "Mindestens ein Core",
    detail:
      "Wenn alle Punkte ueber der Schwelle liegen, wird der Punkt mit dem niedrigsten Score trotzdem Core. Das verhindert einen komplett leeren Kerncluster.",
    why:
      "Ohne diesen Schutz koennte eine Small-N-Gruppe komplett zu Noise werden. Dann gaebe es keinen Referenzkern fuer Rollups und nachgelagerte Diagnosen. Die Pipeline erzwingt deshalb einen minimalen Kern, wenn auch mit schwacher Aussagekraft.",
    variables: [
      { name: "ranked", meaning: "Punkte sortiert nach Score, vom plausibelsten zum auffaelligsten." },
      { name: "ranked[:1]", meaning: "Der Punkt mit dem niedrigsten local_deviation_score." },
      { name: "forced core", meaning: "Technisch als Core markiert, obwohl er die Schwelle nicht bestanden hat." },
    ],
    interpretation:
      "Wenn der Safety-Fallback aktiv ist, sollte das Ergebnis fachlich als sehr unsicher gelten. Es ist eher ein Stabilitaetsmechanismus als ein belastbarer Clusterbefund.",
    codeHint: "if not any(core_mask): core_mask[ranked[:1]] = True",
  },
  {
    title: "Outputs",
    label: "Clusterfelder",
    detail:
      "Core bekommt cluster_0, Noise bekommt noise. Probability und Outlier-Score werden direkt aus dem Score abgeleitet.",
    why:
      "Die nachgelagerten Pipeline-Schritte brauchen dieselben Felder wie bei normalem Clustering: Cluster-ID, Rolle, Probability und Outlier-Score. Small-N fuellt diese Felder deshalb kompatibel, aber mit eigener Semantik.",
    variables: [
      { name: "cluster_0", meaning: "Der angenommene Kerncluster fuer die Small-N-Gruppe." },
      { name: "cluster_probability", meaning: "clip(1 - local_deviation_score, 0.05, 0.95). Hoher Score bedeutet niedrige Zugehoerigkeitswahrscheinlichkeit." },
      { name: "cluster_outlier_score", meaning: "clip(local_deviation_score, 0, 1). Wird spaeter in den Anomaly-Score eingerechnet." },
      { name: "small_n_fallback", meaning: "Flag, dass diese Werte nicht aus HDBSCAN stammen, sondern aus der Small-N-Heuristik." },
    ],
    interpretation:
      "Die Felder sehen technisch wie Clustering-Ergebnisse aus. Fachlich muss aber sichtbar bleiben, dass sie aus einer Heuristik fuer wenige Punkte stammen.",
    codeHint: "probability = clip(1-score, 0.05, 0.95); outlier_score = clip(score, 0, 1)",
  },
  {
    title: "Downstream",
    label: "Interpretation",
    detail:
      "Small-N bleibt eine konservative Low-Confidence-Heuristik. Die Labels fliessen in Rollups, Anomaly/Quality und Meeting-Befund ein.",
    why:
      "Das System muss auch fuer kleine Gebaeude oder wenige verwertbare InSAR-Punkte ein Ergebnis liefern. Gleichzeitig darf dieses Ergebnis nicht so behandelt werden wie ein stabiler HDBSCAN-Cluster mit mehr Stuetzpunkten.",
    variables: [
      { name: "cluster_count_track", meaning: "Anzahl der Core-Cluster im Track. Bei Small-N typischerweise 1, falls Core vorhanden." },
      { name: "noise_point_count_track", meaning: "Wie viele kept Punkte als Noise markiert wurden." },
      { name: "building_status=small_n", meaning: "Gebaeude-/Track-Befund mit kleinem Stichprobenumfang." },
      { name: "anomaly_score", meaning: "Nutzt unter anderem cluster_outlier_score und local_deviation_score." },
      { name: "quality_score", meaning: "Soll bei kleinem n und unsicherem Support vorsichtig interpretiert werden." },
    ],
    interpretation:
      "Die wichtigste Meeting-Aussage: Small-N ist sinnvoll als Guardrail, aber nicht als Nachweis. Fuer Entscheidungen braucht es Zusatzpruefungen wie ASC/DSC, Nachbarschaft, Dachgeometrie und manuelle Plausibilitaet.",
    codeHint: "small_n_fallback=true; building_status kann small_n werden",
  },
];

export const smallNGlossary = [
  {
    name: "kept Punkt",
    meaning:
      "Ein InSAR-Punkt, der nach den vorgelagerten Gates noch als verwertbar gilt. Nur kept Punkte bestimmen die Small-N-Entscheidung.",
  },
  {
    name: "local_deviation_score",
    meaning:
      "Score zwischen 0 und 1. 0 bedeutet lokal unauffaellig, 1 bedeutet stark abweichend. Im Diagramm wird er didaktisch vereinfacht berechnet.",
  },
  {
    name: "Core",
    meaning:
      "Punkt, der die Ein-Cluster-Hypothese stuetzt. Bei Small-N ist das eine vorsichtige Annahme, kein starker Beweis.",
  },
  {
    name: "Noise",
    meaning:
      "Punkt, der nicht ausreichend zur kleinen lokalen Gruppe passt und deshalb als Ausreisser behandelt wird.",
  },
  {
    name: "Probability",
    meaning:
      "Abgeleitete Zugehoerigkeitswahrscheinlichkeit: ungefaehr 1 minus Score, begrenzt auf 0.05 bis 0.95.",
  },
  {
    name: "Threshold 0.80",
    meaning:
      "Default-Grenze im Repo. Punkte mit Score <= 0.80 bleiben Core; Punkte darueber werden Noise.",
  },
];

export const smallNScenarios: SmallNScenario[] = [
  {
    id: "plausible",
    title: "Plausible 4 Punkte",
    shortLabel: "4 plausible",
    question: "Was passiert, wenn alle Punkte lokal aehnlich sind?",
    takeaway: "Alle Punkte bleiben Core. Das Ergebnis ist plausibel, aber wegen n=4 trotzdem low confidence.",
    points: [
      { id: "P1", x: 210, y: 135, velocity: -2.1, acceleration: 0.05, step: 1.0, heightRank: 0.52, coherence: 0.84 },
      { id: "P2", x: 285, y: 125, velocity: -2.3, acceleration: 0.03, step: 1.1, heightRank: 0.49, coherence: 0.86 },
      { id: "P3", x: 250, y: 205, velocity: -2.0, acceleration: 0.04, step: 1.2, heightRank: 0.57, coherence: 0.82 },
      { id: "P4", x: 335, y: 190, velocity: -2.4, acceleration: 0.07, step: 1.0, heightRank: 0.46, coherence: 0.80 },
    ],
  },
  {
    id: "one-outlier",
    title: "Ein abweichender Punkt",
    shortLabel: "1 Noise",
    question: "Wie trennt Small-N einen auffaelligen Punkt?",
    takeaway: "Der stark abweichende Punkt wird Noise, die restlichen Punkte bilden den angenommenen Kerncluster.",
    points: [
      { id: "C1", x: 205, y: 145, velocity: -1.7, acceleration: 0.02, step: 0.8, heightRank: 0.50, coherence: 0.86 },
      { id: "C2", x: 270, y: 125, velocity: -1.8, acceleration: 0.03, step: 0.9, heightRank: 0.54, coherence: 0.85 },
      { id: "C3", x: 235, y: 215, velocity: -1.6, acceleration: 0.04, step: 0.8, heightRank: 0.47, coherence: 0.83 },
      { id: "N1", x: 520, y: 250, velocity: -7.2, acceleration: 0.65, step: 6.2, heightRank: 0.91, coherence: 0.48 },
    ],
  },
  {
    id: "large-roof",
    title: "Grosses Dach, raeumlich weit",
    shortLabel: "Grosses Dach",
    question: "Kann Geometrie bei wenigen Punkten zu viel Gewicht bekommen?",
    takeaway:
      "Ja. Bei Small-N ist eine raeumlich grosse Dachflaeche besonders unsicher, auch wenn die Bewegung aehnlich ist.",
    points: [
      { id: "R1", x: 115, y: 120, velocity: -3.0, acceleration: 0.08, step: 1.4, heightRank: 0.50, coherence: 0.82 },
      { id: "R2", x: 275, y: 145, velocity: -3.1, acceleration: 0.09, step: 1.5, heightRank: 0.55, coherence: 0.80 },
      { id: "R3", x: 450, y: 190, velocity: -2.9, acceleration: 0.10, step: 1.3, heightRank: 0.58, coherence: 0.81 },
      { id: "R4", x: 610, y: 230, velocity: -3.2, acceleration: 0.08, step: 1.4, heightRank: 0.52, coherence: 0.79 },
    ],
  },
  {
    id: "all-high",
    title: "Alle Punkte auffaellig",
    shortLabel: "Safety",
    question: "Was passiert, wenn alle Scores ueber der Schwelle liegen?",
    takeaway:
      "Der Safety-Fallback markiert den besten Punkt trotzdem als Core. Das ist technisch stabil, aber fachlich sehr schwach.",
    points: [
      { id: "A1", x: 145, y: 125, velocity: -6.4, acceleration: 0.70, step: 5.4, heightRank: 0.90, coherence: 0.45 },
      { id: "A2", x: 275, y: 255, velocity: 2.8, acceleration: -0.55, step: 4.9, heightRank: 0.12, coherence: 0.42 },
      { id: "A3", x: 455, y: 115, velocity: -8.1, acceleration: 0.85, step: 6.8, heightRank: 0.96, coherence: 0.40 },
      { id: "A4", x: 570, y: 280, velocity: 3.1, acceleration: -0.70, step: 5.7, heightRank: 0.08, coherence: 0.38 },
    ],
  },
  {
    id: "insufficient",
    title: "Nur 2 Punkte",
    shortLabel: "<3",
    question: "Warum wird hier nicht geclustert?",
    takeaway: "Unter 3 kept Punkten setzt die Pipeline insufficient_support. Ein Cluster waere Scheingenauigkeit.",
    points: [
      { id: "I1", x: 245, y: 150, velocity: -2.2, acceleration: 0.04, step: 1.0, heightRank: 0.52, coherence: 0.84 },
      { id: "I2", x: 420, y: 235, velocity: -2.6, acceleration: 0.06, step: 1.3, heightRank: 0.55, coherence: 0.80 },
    ],
  },
  {
    id: "hdbscan-boundary",
    title: "6 Punkte",
    shortLabel: ">=6",
    question: "Wann endet Small-N?",
    takeaway: "Ab 6 kept Punkten laeuft die Dichte-Clusterung. Small-N ist nur der Zwischenbereich 3 bis 5.",
    points: [
      { id: "H1", x: 180, y: 135, velocity: -2.0, acceleration: 0.04, step: 0.9, heightRank: 0.50, coherence: 0.86 },
      { id: "H2", x: 245, y: 120, velocity: -2.1, acceleration: 0.05, step: 0.9, heightRank: 0.53, coherence: 0.84 },
      { id: "H3", x: 220, y: 205, velocity: -1.9, acceleration: 0.03, step: 1.0, heightRank: 0.49, coherence: 0.83 },
      { id: "H4", x: 455, y: 200, velocity: -4.2, acceleration: 0.22, step: 2.4, heightRank: 0.63, coherence: 0.73 },
      { id: "H5", x: 520, y: 220, velocity: -4.0, acceleration: 0.20, step: 2.1, heightRank: 0.66, coherence: 0.75 },
      { id: "H6", x: 490, y: 285, velocity: -4.4, acceleration: 0.26, step: 2.6, heightRank: 0.62, coherence: 0.72 },
    ],
  },
];
