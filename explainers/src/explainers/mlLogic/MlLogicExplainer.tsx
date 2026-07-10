import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  GitBranch,
  Layers3,
  MousePointerClick,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  XCircle,
} from "lucide-react";
import { Badge, Button, Card, Slider } from "@/components/ui";
import { cn } from "@/lib/utils";

type Layer = "assignment" | "point" | "cluster" | "building" | "interpretation";
type NodeId =
  | "run-points"
  | "candidate-search"
  | "best-building"
  | "grouping"
  | "local-features"
  | "gates"
  | "point-score"
  | "point-label"
  | "cluster-branch"
  | "insufficient-cluster"
  | "small-n-cluster"
  | "hdbscan-cluster"
  | "cluster-role"
  | "cluster-reliability"
  | "main-cluster"
  | "cross-track"
  | "building-status"
  | "building-reliability"
  | "read-result";

type FlowNode = {
  id: NodeId;
  layer: Layer;
  x: number;
  y: number;
  title: string;
  eyebrow: string;
  short: string;
  uiFields: string[];
  trust: string[];
  caution: string[];
  formula?: string;
  definitions?: Array<DefinitionItem>;
};

type DefinitionItem = {
  label: string;
  text: string;
  formula?: string;
  detail?: string;
  note?: string;
};

type FlowEdge = {
  from: NodeId;
  to: NodeId;
  label?: string;
};

type PointRole = "core" | "noise" | "insufficient_support";
type PointLabel = "normal" | "suspect" | "outlier";
type ClusterRole = "core" | "noise" | "weak_support" | "insufficient_support" | "excluded";
type BuildingStatus = "ok" | "single_track_only" | "small_n" | "noise_dominated" | "insufficient_support";
type ReliabilityBand = "high" | "medium" | "low" | null;
type DifferentialMotionLevel = "none" | "candidate" | "significant" | "confirmed";

type PointInputs = {
  clusterOutlier: number;
  localDeviation: number;
  rulePenalty: number;
  crossTrack: number;
  keptSupport: number;
  signalQuality: number;
  gateExcluded: boolean;
  role: PointRole;
};

type ClusterInputs = {
  role: ClusterRole;
  pointCount: number;
  medianCoherence: number;
  assignmentQuality: number;
};

type BuildingInputs = {
  keptCount: number;
  mainTracks: number;
  mainSupportTotal: number;
  noiseShare: number;
  signal: number;
  assignmentQuality: number;
  trackAgreement: number;
  differentialMotionLevel: DifferentialMotionLevel;
  weakMainCluster: boolean;
  weakSecondaryTrack: boolean;
};

type SimpleStageId = "assignment" | "cluster" | "building" | "result";

type SimpleStage = {
  id: SimpleStageId;
  step: string;
  title: string;
  headline: string;
  oneLiner: string;
  detail: string;
  fields: string[];
  green: string;
  yellow: string;
  red: string;
};

type Props = {
  onBack: () => void;
};

const NODE_WIDTH = 168;
const NODE_HEIGHT = 82;

const flowNodes: FlowNode[] = [
  {
    id: "run-points",
    layer: "assignment",
    x: 36,
    y: 80,
    title: "Run-Punkte",
    eyebrow: "1. BBox",
    short: "Zuerst werden alle InSAR-Punkte im Run-Gebiet geladen. Noch ist kein Gebaeude-Kontext entschieden.",
    uiFields: ["bbox", "track", "code", "velocity", "coherence"],
    trust: ["Der Startpunkt ist punktzentriert: jeder InSAR-Punkt wird einzeln betrachtet."],
    caution: ["Hier wird noch nicht pro Gebaeude analysiert."],
  },
  {
    id: "candidate-search",
    layer: "assignment",
    x: 244,
    y: 80,
    title: "Kandidaten",
    eyebrow: "2. SQL-Lateral",
    short: "Fuer jeden Punkt werden moegliche Gebaeude-Kandidaten gesucht: within, directional_buffer, nearest.",
    uiFields: ["assignment_method", "distance_m", "range_offset_m", "buffer_m"],
    trust: ["within ist am staerksten, directional_buffer bildet Radar-/Layover-Geometrie ab."],
    caution: ["nearest ist nur Fallback und wird spaeter kritisch bewertet."],
    formula: "within -> directional_buffer -> nearest <= max_distance_m",
    definitions: [
      {
        label: "within",
        text: "Das ist die staerkste Zuordnung: Der Punkt liegt direkt im Gebaeudepolygon.",
        formula: "ST_Covers(building, point)",
        detail: "Diese Methode bekommt Prioritaet 0 und gewinnt damit vor Buffer- oder nearest-Kandidaten.",
      },
      {
        label: "directional_buffer",
        text: "Punkt liegt in einem richtungsabhaengigen Radar-/Layover-Buffer um das Gebaeude; Prioritaet 1.",
      },
      {
        label: "nearest",
        text: "Das ist nur der Fallback: Der Punkt liegt nicht im Gebaeude und nicht im Radar-Buffer, aber noch in der Naehe.",
        formula: "distance_m <= max_distance_m",
        detail: "Aktuell ist max_distance_m 15 m. nearest bekommt Prioritaet 2 und ist deshalb die schwaechste Zuordnung.",
      },
      {
        label: "max_distance_m",
        text: "Maximal erlaubter Abstand fuer nearest-Kandidaten. Punkte ausserhalb bekommen keinen nearest-Kandidaten.",
      },
    ],
  },
  {
    id: "best-building",
    layer: "assignment",
    x: 452,
    y: 80,
    title: "Bestes Gebaeude",
    eyebrow: "3. LIMIT 1",
    short: "Pro Punkt wird genau ein bestes Gebaeude gespeichert: erst nach Prioritaet, dann nach Distanz.",
    uiFields: ["building_id", "building_source", "assignment_method", "distance_m"],
    trust: ["Ein Punkt hat danach hoechstens eine building_id im Run-Ergebnis."],
    caution: ["Bei exakt gleich guten Kandidaten gibt es aktuell keinen expliziten Tie-Breaker nach building_id."],
    formula: "ORDER BY priority, distance_m NULLS LAST LIMIT 1",
    definitions: [
      {
        label: "priority",
        text: "Die Prioritaet entscheidet zuerst, welche Zuordnungsmethode fachlich besser ist.",
        formula: "within = 0, directional_buffer = 1, nearest = 2",
        detail: "Kleiner ist besser. Deshalb gewinnt ein within-Kandidat auch dann vor nearest, wenn nearest etwas naeher liegt.",
      },
      {
        label: "distance_m",
        text: "Abstand vom Punkt zum Gebaeude. Wird erst nach priority genutzt; kuerzere Distanz gewinnt.",
      },
      {
        label: "NULLS LAST",
        text: "Falls eine Distanz fehlt, wird dieser Kandidat in der Distanzsortierung nach hinten gestellt.",
      },
      {
        label: "LIMIT 1",
        text: "Am Ende bekommt ein Punkt nur ein Gebaeude im Run-Ergebnis.",
        formula: "ORDER BY priority, distance_m NULLS LAST LIMIT 1",
        detail: "Auch wenn intern mehrere Gebaeude-Kandidaten gefunden wurden, wird nur der beste Kandidat gespeichert.",
      },
    ],
  },
  {
    id: "grouping",
    layer: "point",
    x: 660,
    y: 80,
    title: "Gruppieren",
    eyebrow: "4. Gebaeude x Track",
    short: "Erst nach der Zuordnung werden Punkte nach building_id und track gruppiert.",
    uiFields: ["building_id", "track", "track_point_count", "building_context"],
    trust: ["Ab hier wird die Analyse lokal und gebaeudezentriert."],
    caution: ["Falsche Zuordnung am Anfang kann alle folgenden lokalen Aussagen beeinflussen."],
  },
  {
    id: "local-features",
    layer: "point",
    x: 868,
    y: 80,
    title: "Lokale Features",
    eyebrow: "4b. vor Gates",
    short: "Vor den Hard Gates werden lokale Gebaeude+Track-Features berechnet, darunter local_deviation_score.",
    uiFields: [
      "local_deviation_score",
      "along_look_offset_m",
      "cross_look_offset_m",
      "height_rank_in_building",
      "step_support",
      "local_density",
    ],
    trust: ["Die Gate-Regeln und spaetere Scores koennen dadurch lokale Punktmuster beruecksichtigen."],
    caution: ["Diese Features werden fuer alle zugeordneten Punkte berechnet; erst danach entscheidet das Gate, welche Punkte kept bleiben."],
    formula: "_compute_building_group_features() vor _apply_gate_rules()",
    definitions: [
      {
        label: "Reihenfolge",
        text: "Dieser Schritt liegt technisch zwischen Gruppierung und Hard Gates.",
        formula:
          "1) Punkte nach building_id + track gruppieren\n2) lokale Features berechnen\n3) Hard Gates anwenden",
        detail: "Das ist wichtig, weil local_deviation_score und andere lokale Kontextwerte bereits existieren, bevor Punkte ausgeschlossen oder behalten werden.",
      },
      {
        label: "Was wird berechnet?",
        text: "Die Pipeline berechnet lokale Lage-, Hoehen-, Dichte- und Zeitreihen-Features pro Punkt.",
        formula:
          "along_look_offset_m      = Versatz des Punktes parallel zur Satellitenblickrichtung\ncross_look_offset_m      = Versatz quer zur Satellitenblickrichtung\nheight_rank_in_building  = Hoehenrang innerhalb Gebaeude+Track, 0 niedrigster bis 1 hoechster Punkt\nlocal_density            = wie dicht der Punkt bei seinen lokalen Nachbarn liegt\nstep_support             = ob ein grosser Zeitreihen-Sprung von anderen Punkten gestuetzt wird\nlocal_deviation_score    = Gesamtwert: wie stark der Punkt lokal aus dem Muster faellt",
        detail: "Diese Werte beziehen sich auf die lokale Gruppe building_id + track und sind deshalb gebaeudezentriert. along/cross beschreiben die Lage relativ zum Gebaeudezentrum und zur Radar-Blickrichtung. height_rank nutzt die vorhandenen Punkthoehen, nicht zwingend echtes Dach oder Fundament. local_density ist hoch, wenn die naechsten Punkte raeumlich nahe liegen. step_support ist 1.0, wenn kein grosser Sprung vorliegt, oder hoch, wenn andere Punkte einen aehnlichen Sprung zur gleichen Zeit zeigen. local_deviation_score fasst Bewegungs-, Sprung-, Lage-, Hoehenrand- und Kohaerenzauffaelligkeiten als Maximalwert zusammen.",
      },
      {
        label: "Dichte und Sprung-Support",
        text: "Diese zwei Werte beantworten zwei einfache Fragen: Liegt der Punkt raeumlich bei anderen Punkten? Und wird ein grosser Zeitreihen-Sprung von Nachbarpunkten bestaetigt?",
        formula:
          "local_density = exp(-(mean_distance_to_nearest_points / 6.0))\nWertebereich 0 bis 1 - 0 isoliert, 1 sehr nah an anderen Punkten\n\nstep_support = matching_neighbour_steps / possible_neighbours\nWertebereich 0 bis 1 - 0 ungestuetzter Sprung, 1 gut gestuetzter oder kein grosser Sprung",
        detail:
          "local_density ist ein reines Nachbarschaftssignal. Die Pipeline sucht bis zu drei naechste Punkte in derselben Gebaeude+Track-Gruppe und nimmt deren mittlere Distanz. Je kleiner diese Distanz ist, desto dichter liegt der Punkt im lokalen Punktfeld.\n\nstep_support wird nur wichtig, wenn der Punkt einen grossen Sprung in der Zeitreihe hat. Hat er keinen grossen Sprung, setzt die Pipeline den Wert auf 1.0. Hat er einen grossen Sprung, wird gezaehlt, wie viele andere Punkte ebenfalls einen grossen Sprung mit gleicher Richtung und fast gleichem Zeitpunkt zeigen.\n\nPraktisch heisst das: Ein einzelner Punkt mit grossem Sprung und ohne Nachbarbestaetigung ist fachlich schwach. Mehrere Punkte mit aehnlichem Sprung sind plausibler.",
        note: "Score-Wirkung: step_support fliesst indirekt ein. Ein grosser Sprung mit step_support < 0.25 erzeugt die Penalty unsupported_step und erhoeht damit rule_penalty. local_density wird aktuell nur als Kontext-/Erklaerungswert berechnet und nicht direkt in einen Score eingerechnet.",
      },
      {
        label: "local_deviation_score",
        text: "local_deviation_score ist der lokale Ausreisserwert: Er sagt, wie stark dieser Punkt vom Muster der anderen Punkte desselben Gebaeudes und Tracks abweicht.",
        formula:
          "local_deviation_score = max(\n  velocity_z/3.5,\n  acceleration_z/3.5,\n  step_z/3.0,\n  along_z/4.0,\n  cross_z/4.0,\n  height_edge,\n  coherence_gap\n)",
        detail:
          "Die Pipeline vergleicht den Punkt mit seiner lokalen Gruppe building_id + track. Sie fragt zum Beispiel: Ist seine Geschwindigkeit ungewoehnlich? Ist seine Beschleunigung ungewoehnlich? Hat er einen ungewoehnlich grossen Zeitreihen-Sprung? Liegt er raeumlich deutlich anders als die Gruppe? Sitzt er sehr stark am oberen oder unteren Hoehenrand? Ist seine Kohaerenz schwach?\n\nFuer mehrere dieser Fragen wird ein robuster Z-Score berechnet: Abstand vom Gruppen-Median geteilt durch robuste Streuung. Danach wird nicht gemittelt. Der groesste Teilwert gewinnt.\n\nPraktisch heisst das: Schon ein klar auffaelliger Grund kann den local_deviation_score hoch machen. Ein niedriger Wert bedeutet dagegen: Der Punkt passt lokal zu den anderen Punkten dieses Gebaeudes und Tracks.",
      },
    ],
  },
  {
    id: "gates",
    layer: "point",
    x: 1076,
    y: 80,
    title: "Hard Gates",
    eyebrow: "5. Ausschluss",
    short: "Schlechte Zeitreihen, niedrige Kohaerenz oder unplausible nearest-Punkte fallen raus.",
    uiFields: ["gate_excluded", "gate_reasons", "kept_for_scoring"],
    trust: ["Kept Punkte haben Mindestdatenqualitaet und duerfen die naechsten Schritte stuetzen."],
    caution: ["Gate-excluded Punkte bleiben sichtbar, praegen aber weder Cluster noch Motion-Score."],
    formula: "gate_excluded = any(gate_reasons); kept_for_scoring = !gate_excluded",
    definitions: [
      {
        label: "Was ist ein Hard Gate?",
        text: "Ein Hard Gate ist eine harte Ja/Nein-Pruefung vor dem Clustering: Schon ein echter Gate-Grund reicht, damit der Punkt nicht weiter als Stuetzpunkt verwendet wird.",
        formula:
          "wenn gate_reasons leer: kept_for_scoring = true\nwenn gate_reasons nicht leer: gate_excluded = true",
        detail:
          "Die Hard Gates pruefen nicht, ob ein Punkt inhaltlich spannend ist, sondern ob seine Datenbasis ueberhaupt tragfaehig genug fuer Cluster, Hauptcluster und Gebaeudebewegung ist. Ein ausgeschlossener Punkt bleibt im Tool sichtbar, wird aber nicht geclustert und zaehlt nicht als kept Punkt.",
      },
      {
        label: "Allgemeine Ausschlussgruende",
        text: "Zuerst prueft die Pipeline fuer jeden zugeordneten Punkt Mindestdatenqualitaet und Gebaeudezuordnung.",
        formula:
          "no_building_assignment wenn building_id fehlt\n\ntoo_few_valid_epochs wenn valid_epoch_count < 24\n\ntoo_sparse_timeseries wenn valid_epoch_ratio < 0.50\n\nlow_coherence wenn coherence < max(0.45, coherence_p05_track)",
        detail:
          "no_building_assignment bedeutet: Der Punkt konnte keinem Gebaeude zugeordnet werden. too_few_valid_epochs bedeutet: Es gibt zu wenige gueltige Zeitpunkte in der Zeitreihe. too_sparse_timeseries bedeutet: Der Anteil gueltiger Messzeitpunkte ist zu niedrig. low_coherence bedeutet: Das InSAR-Signal ist zu schwach im Vergleich zur festen Untergrenze 0.45 oder zum unteren Track-Niveau.",
      },
      {
        label: "nearest-Sonderpruefung",
        text: "Nearest-Punkte bekommen nach den Basis-Gates eine Zusatzpruefung, weil sie nur ueber den Naechste-Gebaeude-Fallback zugeordnet wurden.",
        formula:
          "nearest_no_geometric_anchor wenn keine within/directional-Anker existieren\n\nnearest_crosslook_unknown wenn cross_look_offset_m fehlt\n\nnearest_crosslook_outlier wenn abs(cross_look_offset_m) > limit",
        detail:
          "Die Pipeline sucht in derselben Gebaeude+Track-Gruppe zuerst gute Ankerpunkte, also kept Punkte mit within oder directional_buffer. Aus deren Quer-Versatz zur Radar-Blickrichtung wird eine lokale Toleranz gelernt. Ein nearest-Punkt darf stark entlang der Blickrichtung versetzt sein, weil das Radarprojektion sein kann. Quer zur Blickrichtung ist ein grosser Versatz aber fachlich kritischer.",
      },
      {
        label: "nearest-Toleranz",
        text: "Die Toleranz fuer nearest-Punkte wird lokal aus den guten Ankerpunkten desselben Gebaeudes und Tracks abgeleitet.",
        formula:
          "limit = median(abs(cross_anchor))\n  + 3 * 1.4826 * MAD(abs(cross_anchor))\n  + 3 m\n  + sqrt(eff_area)",
        detail:
          "median und MAD machen die Toleranz robust gegen einzelne Ausreisser. Die zusaetzlichen 3 m sind eine Geocoding-Marge. sqrt(eff_area) macht die Toleranz fuer groessere Punktflaechen etwas breiter. Wenn kein Anker existiert, fehlt die geometrische Referenz und der nearest-Punkt wird ausgeschlossen.",
      },
      {
        label: "Folge fuer die Pipeline",
        text: "Gate-excluded Punkte bleiben lesbar, aber sie duerfen die nachfolgenden aggregierten Ergebnisse nicht stuetzen.",
        formula:
          "gate_excluded -> kein Clustering\n\ngate_excluded -> nicht im kept_count\n\ngate_excluded -> cluster_role = excluded\n\ngate_excluded -> anomaly_score mindestens 0.90",
        detail:
          "Das ist der wichtigste Unterschied zu rule_penalty: Hard Gates passieren vor dem Clustering und nehmen Punkte aus der Stuetzmenge heraus. Rule-Penalties kommen spaeter und bewerten kept Punkte nur vorsichtiger.",
      },
    ],
  },
  {
    id: "cluster-branch",
    layer: "cluster",
    x: 244,
    y: 330,
    title: "Algorithmuswahl",
    eyebrow: "6. kept count",
    short: "Nach den Hard Gates entscheidet nur die Anzahl der kept Punkte je Gebaeude+Track, welcher Clusterpfad benutzt wird.",
    uiFields: ["kept_point_count_track", "excluded_point_count_track", "small_n_fallback"],
    trust: ["Die Auswahl ist transparent: <3, 3-5 oder ab 6 kept Punkte."],
    caution: ["Gate-excluded Punkte zaehlen nicht fuer die Algorithmuswahl und werden nicht geclustert."],
    definitions: [
      {
        label: "Gruppe",
        text: "Geclustert werden nur kept Punkte innerhalb derselben building_id + track Gruppe. Gate-excluded Punkte werden nicht geclustert.",
      },
      {
        label: "<3 kept",
        text: "Weniger als 3 kept Punkte gehen in den insufficient_support-Pfad.",
      },
      {
        label: "3-5 kept",
        text: "Drei bis fuenf kept Punkte gehen in den Small-N-Fallback.",
      },
      {
        label: "ab 6 kept",
        text: "Ab sechs kept Punkten laeuft HDBSCAN auf einem mehrdimensionalen Feature-Vektor.",
      },
    ],
  },
  {
    id: "insufficient-cluster",
    layer: "cluster",
    x: 452,
    y: 190,
    title: "<3 kept",
    eyebrow: "kein Clustering",
    short: "Bei 1 oder 2 kept Punkten wird kein Clusteralgorithmus ausgefuehrt.",
    uiFields: ["cluster_role", "cluster_id", "cluster_probability", "cluster_outlier_score"],
    trust: ["Die Punkte bleiben sichtbar und werden nicht geloescht."],
    caution: ["Auch zwei sehr aehnliche Punkte oder ein Einzelpunkt mit hoher Kohaerenz erzeugen keinen core-Cluster."],
    formula: "wenn kept_count < 3: cluster_role = insufficient_support",
    definitions: [
      {
        label: "kept_count",
        text: "Anzahl der Punkte derselben building_id + track Gruppe, die die Hard Gates ueberlebt haben.",
      },
      {
        label: "insufficient_support",
        text: "Bewusster Status fuer zu wenig lokale Evidenz. Es gibt keinen belastbaren Cluster und keinen Cluster-Vertrauensscore.",
      },
      {
        label: "cluster_outlier_score",
        text: "Wird hoechstens aus local_deviation_score uebernommen. Das ist ein Warnsignal, kein Clusterbefund.",
      },
      {
        label: "Folge",
        text: "Der spaetere Punkt-Score wird bei insufficient_support gedeckelt; das Punktlabel bleibt suspect.",
      },
    ],
  },
  {
    id: "small-n-cluster",
    layer: "cluster",
    x: 452,
    y: 330,
    title: "Small-N",
    eyebrow: "3-5 kept",
    short: "Bei 3-5 kept Punkten wird kein HDBSCAN genutzt, sondern ein vorsichtiger Fallback.",
    uiFields: ["small_n_fallback", "local_deviation_score", "velocity", "velocity_std"],
    trust: ["Small-N-core ist moeglich, wenn mindestens zwei Punkte velocity-konsistent sind."],
    caution: ["Wenn die Konsistenz fehlt, entsteht weak_support statt eines kuenstlichen Core-Clusters."],
    formula:
      "consistent = abs(velocity - median_velocity) <= max(1 mm/a, 2*velocity_std); core wenn local_deviation <= threshold",
    definitions: [
      {
        label: "Featurebasis",
        text: "Small-N nutzt keine HDBSCAN-Punktwolke, sondern eine vorsichtige Regelentscheidung mit wenigen Punkten.",
        formula:
          "1) Konsistenz-Check:\n   velocity, velocity_std\n\n2) Local-deviation-Check:\n   velocity_z, acceleration_z, step_z,\n   along_z, cross_z, height_edge, coherence_gap",
        detail: "Diese Werte sind also Entscheidungsfeatures des Fallbacks. Sie werden nicht wie bei HDBSCAN gemeinsam in einem Dichte-Feature-Raum geclustert.",
      },
      {
        label: "Velocity-Konsistenz",
        text: "Mindestens 2 Punkte muessen nahe am Median der Geschwindigkeiten liegen. Sonst bekommen alle kept Punkte weak_support.",
      },
      {
        label: "local_deviation",
        text: "local_deviation misst, ob ein Punkt innerhalb seiner Gebaeude+Track-Gruppe lokal aus dem Rahmen faellt.",
        formula:
          "feature_z = abs(value - median_group) / scale_group\nscale_group = max(1.4826*MAD_group, minimum_scale)\n\nlocal_deviation_score = max(\n  velocity_z/3.5,\n  acceleration_z/3.5,\n  step_z/3.0,\n  along_z/4.0,\n  cross_z/4.0,\n  height_edge,\n  coherence_gap\n)",
        detail: "Die Idee entspricht einem Z-Score: Abweichung geteilt durch Streuung. Klassisch waere z = (Wert - Mittelwert) / Standardabweichung. Die Pipeline nutzt robuster: absolute Abweichung vom Median, skaliert mit MAD. minimum_scale ist 0.5, beim Zeitreihen-Sprung 0.75.",
        note: "Wichtig: Es ist der groesste Teilwert, kein Mittelwert. Ein einzelner stark auffaelliger Beitrag kann den Punkt auffaellig machen.",
      },
      {
        label: "Teilwerte",
        text: "Die Teilwerte sagen, worin der Punkt lokal auffaellig sein kann.",
        formula:
          "velocity_z      = Bewegungsrate weicht ab\nacceleration_z  = Beschleunigung weicht ab\nstep_z          = Zeitreihen-Sprung weicht ab\nalong_z         = Lage parallel zur Blickrichtung weicht ab\ncross_z         = Lage quer zur Blickrichtung weicht ab\nheight_edge     = Punkt liegt stark am Hoehenrand\ncoherence_gap   = Kohaerenz ist niedrig",
        detail: "Der groesste dieser Teilwerte wird zum local_deviation_score.",
      },
      {
        label: "step_z / height_edge / coherence_gap",
        text: "Diese drei Teilwerte erklaeren spezielle Auffaelligkeiten: Sprung in der Zeitreihe, Randlage in der Hoehe und schwache Kohaerenz.",
        formula:
          "step_z = abs(ts_primary_step_abs - median_step_group) / scale_step\nscale_step = max(1.4826*MAD_step_group, 0.75)\n\nheight_rank_in_building = height_sort_index / (valid_height_count - 1)\nheight_edge = abs(height_rank_in_building - 0.5) * 1.4\n\ncoherence_gap = max(0, (0.65 - coherence) / 0.65)",
        detail: "step_z steigt, wenn der groesste einzelne Zeitreihen-Sprung eines Punktes untypisch fuer die lokale Gruppe ist. Fuer height_rank werden die Punkte derselben Gebaeude+Track-Gruppe nach point.height sortiert: niedrigster gueltiger Punkt = 0, hoechster gueltiger Punkt = 1. Fehlen genug Hoehenwerte, wird neutral 0.5 verwendet. height_edge ist 0 in der mittleren Hoehenlage und steigt Richtung unterer/oberer Rand. coherence_gap ist 0 ab coherence 0.65 und steigt darunter.",
      },
      {
        label: "small_n_noise_threshold",
        text: "Schwelle fuer local_deviation_score. Aktuell 0.80: darunter oder gleich core, darueber noise.",
      },
      {
        label: "cluster_outlier_score",
        text: "Im Small-N-Fallback gibt es keinen echten Dichte-Outlier aus HDBSCAN.",
        formula: "cluster_outlier_score = clamp(local_deviation_score, 0, 1)",
        detail: "Wenn die Kleingruppe gar nicht velocity-konsistent ist, wird weak_support gesetzt und der Outlier-Wert mindestens auf 0.50 gehoben.",
      },
      {
        label: "Fallback-Regel",
        text: "Falls nach der Schwelle kein Punkt core waere, wird der beste Punkt als core gesetzt, damit die konsistente Kleingruppe nicht komplett verworfen wird.",
      },
    ],
  },
  {
    id: "hdbscan-cluster",
    layer: "cluster",
    x: 452,
    y: 470,
    title: "HDBSCAN",
    eyebrow: "ab 6 kept",
    short: "Bei mindestens 6 kept Punkten wird lokale Dichte im Feature-Raum geclustert.",
    uiFields: ["cluster_probability", "cluster_outlier_score", "cluster_member_count"],
    trust: ["Core entsteht aus lokaler Dichte im robust skalierten Feature-Raum."],
    caution: ["HDBSCAN-noise stuetzt keinen Hauptcluster, kann aber als Punkt sichtbar bleiben."],
    formula:
      "features = robust_scale([along, cross, height_rank, velocity, acceleration, coherence_penalty]) * weights",
    definitions: [
      {
        label: "Feature-Vektor",
        text: "HDBSCAN betrachtet Punkte nicht nur nach Geschwindigkeit, sondern als lokales Muster aus Lage, Hoehe, Bewegung und Signalqualitaet.",
        formula:
          "along_look_offset_m      = Lage parallel zur Satellitenblickrichtung\ncross_look_offset_m      = Lage quer zur Satellitenblickrichtung\nheight_rank_in_building  = Hoehenrang im Gebaeude+Track: 0 niedrigster, 1 hoechster Punkt\nvelocity                 = LOS-Bewegungsrate in mm/a\nacceleration             = Aenderung der LOS-Bewegungsrate\ncoherence_penalty        = 1 - coherence",
        detail: "Diese sechs Werte bilden gemeinsam den HDBSCAN-Feature-Raum. Erst werden sie robust skaliert, dann mit den Gewichten multipliziert. Dadurch koennen Punkte zusammenfallen, wenn sie raeumlich und dynamisch aehnlich sind, nicht nur wenn sie denselben velocity-Wert haben.",
      },
      {
        label: "Skalierung",
        text: "Die Skalierung bringt alle sechs Features auf eine vergleichbare Groessenordnung, bevor HDBSCAN Distanzen berechnet.",
        formula:
          "scaled_feature = (value - median_feature) / (Q85_feature - Q15_feature)\nweighted_feature = scaled_feature * feature_weight",
        detail: "Q15 und Q85 sind das 15%- und 85%-Quantil des jeweiligen Features innerhalb der aktuellen kept Punkte. Dadurch zaehlt die zentrale Streuung der Gruppe, waehrend extreme Einzelwerte weniger stark dominieren als bei Mittelwert/Standardabweichung.",
      },
      {
        label: "Gewichte",
        text: "Die Gewichte sagen, welche Features beim Clustering staerker zaehlen.",
        formula:
          "velocity = 1.30\nalong = 1.10\ncross = 1.00\nacceleration = 0.90\ncoherence_penalty = 0.80\nheight_rank = 0.75",
        detail: "Velocity ist am staerksten gewichtet, Hoehenrang am schwaechsten. Alle Features werden vorher robust skaliert.",
      },
      {
        label: "Rollen",
        text: "Die Rolle kommt aus dem HDBSCAN-Label: Clusterzugehoerige Punkte werden core, Ausreisser werden noise.",
        formula: "label >= 0 -> core; label = -1 -> noise",
        detail: "Noise-Punkte bekommen einen cluster_outlier_score von mindestens 0.75 und stuetzen keinen Hauptcluster.",
      },
      {
        label: "cluster_outlier_score",
        text: "HDBSCAN liefert pro Punkt einen Outlier-Score aus der Dichte-Struktur.",
        formula: "cluster_outlier_score = normalise(model.outlier_scores_)",
        detail: "Die Pipeline skaliert die HDBSCAN-Rohwerte pro Gruppe auf 0 bis 1. Borderline-noise, der nachtraeglich einem Cluster zugeordnet wird, wird auf hoechstens 0.55 abgesenkt.",
      },
      {
        label: "Borderline noise",
        text: "Noise kann nachtraeglich core werden, wenn Abstand zum naechsten Cluster, Kohaerenz, lokale Abweichung und Zuordnung plausibel sind.",
      },
    ],
  },
  {
    id: "cluster-role",
    layer: "cluster",
    x: 660,
    y: 330,
    title: "Clusterrolle",
    eyebrow: "core / noise / weak",
    short: "Die Algorithmuspfade liefern am Ende die Rolle, mit der der Punkt weiter bewertet wird.",
    uiFields: ["cluster_role", "cluster_id", "small_n_fallback"],
    trust: ["core ist die einzige Rolle, die einen Hauptcluster stuetzen kann."],
    caution: ["noise, weak_support, insufficient_support und excluded bleiben sichtbar, stuetzen aber keinen Hauptcluster."],
    definitions: [
      {
        label: "core",
        text: "Punkt gehoert zu einem verwertbaren lokalen Muster. Nur core kann in Cluster-Vertrauen und Hauptcluster eingehen.",
      },
      {
        label: "noise",
        text: "Punkt passt nicht ausreichend zum lokalen Muster. Er bleibt sichtbar, stuetzt aber keinen Hauptcluster.",
      },
      {
        label: "weak_support",
        text: "Small-N-Gruppe war nicht velocity-konsistent genug fuer einen ehrlichen core/noise-Befund.",
      },
      {
        label: "insufficient_support",
        text: "Weniger als 3 kept Punkte. Zu wenig lokale Evidenz fuer eine Clusterentscheidung.",
      },
      {
        label: "excluded",
        text: "Hard-Gate-Punkt. Nicht Teil der Clusterung und kein Score-Beitrag.",
      },
    ],
  },
  {
    id: "cluster-reliability",
    layer: "cluster",
    x: 868,
    y: 330,
    title: "Cluster-Vertrauen",
    eyebrow: "Support + Signal",
    short: "Nur Core-Cluster bekommen diesen Score aus Punktanzahl, Kohaerenz und Zuordnungsqualitaet.",
    uiFields: ["cluster_reliability_score", "point_count", "median_coherence"],
    trust: [
      "Ein core-Cluster mit mindestens 2 Punkten kann als verwertbar gelten.",
      "Wenn Small-N-Fallback einen core-Cluster erzeugt, nutzt er dieselbe Score-Formel.",
    ],
    caution: [
      "noise, excluded, weak_support und insufficient_support bekommen keinen Cluster-Vertrauensscore.",
      "Ein 1-Punkt-core kann rechnerisch einen Score haben, ist aber nicht reliable_core und wird nicht Hauptcluster.",
    ],
    formula: "wenn cluster_role = core: score = 0.45*support + 0.35*coherence + 0.20*assignment; sonst: null",
    definitions: [
      {
        label: "Geltungsbereich",
        text: "Der Cluster-Vertrauensscore wird nur fuer fachlich verwertbare Core-Cluster berechnet.",
        formula: "cluster_role = core -> score; sonst cluster_reliability_score = null",
        detail: "Fuer noise, weak_support, insufficient_support oder excluded bleibt der Score leer.",
      },
      {
        label: "Small-N-Fallback",
        text: "Bei 3-5 kept Punkten kann der Fallback einen core-Cluster erzeugen. Dann wird dieselbe Formel genutzt wie bei HDBSCAN-core.",
      },
      {
        label: "<3 kept Punkte",
        text: "Bei weniger als 3 kept Punkten reicht die Datenbasis nicht fuer Cluster-Vertrauen.",
        formula: "kept_count < 3 -> cluster_role = insufficient_support",
        detail: "Dann gibt es keinen Cluster-Vertrauensscore.",
      },
      {
        label: "Support",
        text: "Support misst, ob der Cluster von genug Punkten getragen wird.",
        formula: "support = min(point_count / 4, 1)",
        detail: "Ab 4 Punkten ist diese Komponente voll. Ein 2-Punkte-Cluster kann also gut aussehen, hat aber weniger Support.",
      },
      {
        label: "Coherence",
        text: "Coherence beschreibt hier die typische Signalqualitaet des Clusters.",
        formula: "coherence = median(coherence der Clusterpunkte)",
        detail: "Einzelpunktwerte werden zum Cluster-Median verdichtet, damit einzelne schwache oder starke Punkte nicht allein dominieren.",
      },
      {
        label: "Assignment",
        text: "Assignment misst, ob die Clusterpunkte geometrisch sauber zum Gebaeude passen.",
        formula: "assignment = count(assignment_method != nearest) / point_count",
        detail: "within und directional_buffer zaehlen als gute Zuordnung. nearest senkt den Wert.",
      },
    ],
  },
  {
    id: "main-cluster",
    layer: "cluster",
    x: 1076,
    y: 330,
    title: "Hauptcluster",
    eyebrow: "pro Track",
    short: "Der wichtigste verwertbare Cluster je Track traegt die Track-Bewegung.",
    uiFields: ["is_main_cluster", "cluster_rank", "main_cluster_by_track", "main_cluster_id"],
    trust: ["Mehr Punkte, hoehere Kohaerenz und plausibler Hoehenrang machen den Main-Cluster wahrscheinlicher."],
    caution: ["Ein grosser nearest-lastiger Cluster kann fachlich trotzdem kritisch sein."],
    formula:
      "main_cluster = best reliable_core per track, sorted by support, coherence, height_rank",
    definitions: [
      {
        label: "Grundidee",
        text: "Pro Gebaeude und Track wird genau ein Hauptcluster gesucht, der die Track-Bewegung repraesentiert.",
        detail: "Nicht jeder Cluster darf Hauptcluster werden. Die Pipeline betrachtet dafuer nur verlaessliche Core-Cluster.",
      },
      {
        label: "reliable_core",
        text: "Ein Cluster ist erst dann Kandidat fuer den Hauptcluster, wenn er core ist und von mindestens zwei Punkten getragen wird.",
        formula: "reliable_core = cluster_role = core AND point_count >= 2",
        detail: "Ein einzelner core-Punkt kann zwar rechnerisch einen Cluster-Score haben, wird aber nicht Hauptcluster.",
      },
      {
        label: "Auswahlregel",
        text: "Wenn mehrere reliable_core-Cluster im selben Track existieren, gewinnt der fachlich staerkste Kandidat.",
        formula: "ORDER BY point_count DESC, median_coherence DESC, median_height_rank DESC, cluster_id ASC",
        detail: "Zuerst zaehlt also Support, danach Signalqualitaet, danach ein plausibler Hoehenrang. Die Cluster-ID ist nur der letzte stabile Tie-Breaker.",
      },
      {
        label: "is_main_cluster",
        text: "Der Gewinner bekommt die Markierung als Hauptcluster und liefert die Bewegung fuer diesen Track.",
        formula: "is_main_cluster = cluster_id == main_cluster_id",
        detail: "Seine median_vertical_proxy_mm_a wird danach als track_motion_mm_a im Rollup verwendet.",
      },
      {
        label: "cluster_rank",
        text: "cluster_rank ist die Anzeige-Reihenfolge der Cluster innerhalb des Tracks.",
        detail: "Der Hauptcluster steht auf Rang 1. Danach werden die restlichen Cluster nach Rolle, Punktanzahl, Kohaerenz, Hoehenrang und Cluster-ID sortiert.",
      },
      {
        label: "Kein Hauptcluster",
        text: "Wenn ein Track keinen reliable_core-Cluster hat, bleibt main_cluster_id leer.",
        detail: "Dieser Track liefert dann keine Track-Bewegung. Das kann spaeter den Gebaeudestatus Richtung insufficient_support oder single_track_only schieben.",
      },
    ],
  },
  {
    id: "cross-track",
    layer: "building",
    x: 868,
    y: 500,
    title: "Track-Vergleich",
    eyebrow: "ASC / DSC",
    short: "Die Hauptcluster der Tracks werden ueber einen vertikalen Proxy verglichen.",
    uiFields: ["track_agreement_score", "diff_after_mm_a", "full_support"],
    trust: ["Hohe Track-Uebereinstimmung ist ein starkes Vertrauenssignal."],
    caution: ["In Hanglagen oder bei horizontaler Bewegung ist Cross-Track kein Ground Truth."],
    formula: "agreement = exp(-(abs(motion44-motion95) / allowed_diff))",
    definitions: [
      {
        label: "motion44 / motion95",
        text: "Das sind die Track-Bewegungen, die miteinander verglichen werden.",
        formula: "motion = median(vertical_proxy im Hauptcluster)",
        detail: "Track 44 und Track 95 liefern je einen Wert, sofern beide einen Hauptcluster haben.",
      },
      {
        label: "Vertikaler Proxy",
        text: "Der vertikale Proxy ist eine naeherungsweise Umrechnung der LOS-Geschwindigkeit in eine vertikale Bewegung.",
        formula: "vertical_proxy = velocity / max(cos(incidence_angle), 0.30)",
        detail: "Fehlt der Inzidenzwinkel, nutzt die Pipeline den Default des Tracks.",
      },
      {
        label: "Warum 0.30?",
        text: "Die 0.30 ist eine Schutzuntergrenze fuer den Nenner, keine fachliche Schwelle. Sie verhindert unrealistisch grosse Proxy-Werte, wenn cos(incidence_angle) sehr klein oder der Winkel fehlerhaft ist.",
      },
      {
        label: "Warum Proxy?",
        text: "InSAR misst LOS-Bewegung entlang der Blickrichtung. Der Proxy projiziert diese LOS-Geschwindigkeit naeherungsweise auf eine vertikale Bewegung.",
      },
      {
        label: "abs(...)",
        text: "Diese Differenz zeigt, wie weit die beiden Track-Aussagen auseinanderliegen.",
        formula: "diff = abs(motion44 - motion95)",
        detail: "Je kleiner die Differenz, desto besser die Uebereinstimmung.",
      },
      {
        label: "allowed_diff",
        text: "allowed_diff ist die erlaubte Toleranz, bevor Track-Unterschiede stark bestraft werden.",
        formula: "allowed_diff = 1.0 + 0.15 * slope_mean",
        detail: "Steilere Lage erlaubt mehr Differenz, weil die Interpretation dort unsicherer sein kann.",
      },
      {
        label: "exp",
        text: "Die Exponentialfunktion wandelt die Differenz in einen gut lesbaren Score um.",
        formula: "agreement = exp(-(diff / allowed_diff))",
        detail: "1 bedeutet sehr gute Track-Uebereinstimmung. Je groesser die Differenz relativ zur Toleranz ist, desto naeher faellt der Score Richtung 0.",
      },
    ],
  },
  {
    id: "building-status",
    layer: "building",
    x: 452,
    y: 640,
    title: "Gebaeudestatus",
    eyebrow: "7. Rollup",
    short:
      "Der Gebaeudestatus zeigt, wie gut die Datenbasis fuer dieses Gebaeude ist. Er sagt, ob der Gebaeudescore belastbar ist oder mit Vorsicht gelesen werden muss.",
    uiFields: [
      "building_status",
      "kept_point_count",
      "noise_point_count",
      "reliable_cluster_count",
      "main_cluster_by_track",
    ],
    trust: [
      "ok bedeutet: genug kept Punkte, mindestens ein Main-Cluster, nicht noise-dominiert, genug Main-Cluster-Support und mehr als ein Track.",
    ],
    caution: [
      "Die Status-Regeln laufen in fester Reihenfolge. Der erste Treffer gewinnt und bestimmt, wie vorsichtig der Gebaeude-Score gelesen werden muss.",
    ],
    formula:
      "status = insufficient_support | noise_dominated | small_n | single_track_only | ok",
    definitions: [
      {
        label: "insufficient_support",
        text: "Wenn weniger als 3 behaltene Punkte vorhanden sind oder kein Track einen Hauptcluster hat. Dann gibt es keine belastbare Gebaeudeaussage.",
      },
      {
        label: "noise_dominated",
        text: "Wenn mehr als die Haelfte der behaltenen Punkte als noise klassifiziert ist. Es gibt dann zwar Daten, aber das Muster wird von Ausreissern dominiert.",
      },
      {
        label: "small_n",
        text: "Wenn die Summe der Punkte in den Hauptclustern ueber alle Tracks kleiner als 4 ist. Das Signal ist vorhanden, aber die Basis ist sehr klein.",
      },
      {
        label: "single_track_only",
        text: "Wenn genau ein Track einen Hauptcluster liefert. Der Gebaeudewert kann nuetzlich sein, aber es fehlt die Gegenpruefung durch den zweiten Track.",
      },
      {
        label: "ok",
        text: "Wenn keine der Vorsichtsregeln greift: ausreichend Support, Hauptcluster vorhanden, nicht noise-dominiert, genug Main-Cluster-Support und Track-Basis nicht nur einseitig.",
      },
      {
        label: "main_tracks",
        text: "Tracks, fuer die ein Hauptcluster bestimmt werden konnte. Grundlage ist der beste verlaessliche Core-Cluster pro Track.",
      },
      {
        label: "main_cluster_support_total",
        text: "Summe der Punktanzahl in den Hauptclustern aller Tracks. Dieser Wert entscheidet, ob der Status small_n wird.",
      },
      {
        label: "Reihenfolge",
        text: "Die Pipeline prueft zuerst insufficient_support, dann noise_dominated, dann small_n, dann single_track_only, zuletzt ok. Spaetere Regeln werden nicht mehr geprueft, wenn vorher schon eine zutrifft.",
      },
    ],
  },
  {
    id: "building-reliability",
    layer: "building",
    x: 660,
    y: 640,
    title: "Gebaeude-Score",
    eyebrow: "high / medium / low",
    short: "Der Reliability-Score verdichtet Support, Signal, Assignment und Track-Uebereinstimmung.",
    uiFields: ["building_reliability_score", "building_reliability_band", "reliability_penalties"],
    trust: ["high ab 0.75, medium ab 0.45, low darunter."],
    caution: ["Penalties und Band-Caps koennen einen rechnerisch guten Score begrenzen."],
    formula:
      "score = 0.35*support + 0.25*signal + 0.20*assignment + 0.20*agreement - penalties",
    definitions: [
      {
        label: "support",
        text: "Support beschreibt, wie stark der Gebaeudewert durch Punkte in den Hauptclustern getragen wird.",
        formula: "support = min(main_cluster_support_total / 6, 1)",
        detail: "Ab 6 Punkten in den Hauptclustern ist diese Komponente voll.",
      },
      {
        label: "signal",
        text: "Im Gebaeude-Score ist das die mittlere Main-Cluster-Kohaerenz: Die Pipeline nimmt je Track die median_coherence des Hauptclusters als main_cluster_signal und mittelt diese Werte.",
      },
      {
        label: "coherence / Kohaerenz",
        text: "Wert von 0 bis 1 fuer die Qualitaet des InSAR-Signals. Hoch bedeutet: die Zeitreihe ist phasenstabiler und damit als Bewegungssignal verlaesslicher. Niedrig bedeutet: eher Rauschen, Dekorrelation oder schlechte Messbasis.",
      },
      {
        label: "Nicht verwechseln",
        text: "Beim Punkt-Score gibt es zusaetzlich eine Punkt-Signalqualitaet aus 70% coherence und 30% Amplitudenstabilitaet. Beim Gebaeude-Score ist signal aktuell im Kern die Kohaerenz der Hauptcluster.",
        note: "Merke: Gleiches Wort, aber unterschiedliche Ebene.",
      },
      {
        label: "assignment",
        text: "Assignment beschreibt, wie sauber die Punkte eines Hauptclusters dem Gebaeude zugeordnet wurden.",
        formula: "assignment_cluster = count(assignment_method != nearest) / point_count",
        detail: "Viele within- oder directional_buffer-Zuordnungen sind gut, viele nearest-Zuordnungen machen den Cluster unsicherer. Im Gebaeude-Score wird der Mittelwert der Hauptcluster-Werte verwendet.",
      },
      {
        label: "agreement",
        text: "Agreement beschreibt, wie gut die beiden Track-Aussagen zum Gebaeude zusammenpassen.",
        formula: "agreement = exp(-(abs(motion44 - motion95) / allowed_diff))",
        detail: "allowed_diff = 1.0 + 0.15 * slope_mean. Fehlt ein echter ASC/DSC-Vergleich, nutzt der Gebaeude-Score neutral 0.5.",
      },
      {
        label: "penalties",
        text: "Penalties sind gezielte Abzuege, wenn der rechnerische Score zu optimistisch waere.",
        formula:
          "single_track_only = -0.15\nmain_cluster_support_total < 4 = -0.10\nnoise_dominated = -0.15\ndifferential_motion_level in (significant, confirmed) = -0.15\nweak_main_cluster_support = -0.10\nlow_track_agreement = -0.10",
        detail: "Die Abzuege werden nach den positiven Komponenten vom Score abgezogen und danach auf den Bereich 0 bis 1 begrenzt. Ein reiner candidate-Befund bleibt sichtbar, verursacht aber noch keinen Reliability-Abzug.",
      },
      {
        label: "differential_motion_level",
        text: "Das Differential-Level beschreibt die Evidenzstaerke fuer unterschiedliche Bewegungen verlaesslicher Cluster innerhalb eines Gebaeudes.",
        formula:
          "none = kein Kandidat\ncandidate = Delta ueber Schwelle\nsignificant = statistisch abgesichert, n >= 3 je Cluster\nconfirmed = significant und durch zweiten Track gleichsigniert bestaetigt",
        detail: "candidate ist ein sichtbarer Pruefhinweis ohne Reliability-Penalty. Erst significant und confirmed ziehen 0.15 vom Gebaeude-Score ab.",
      },
      {
        label: "Band-Caps",
        text: "Band-Caps begrenzen die sichtbare Vertrauensklasse, auch wenn der numerische Score hoeher waere.",
        formula:
          "weak_secondary_track -> max medium\ntrack_agreement < 0.10 -> max low",
        detail: "Das ist kein zusaetzlicher Score-Abzug, sondern eine Obergrenze fuer das Band high / medium / low.",
        note: "Wichtig: Ein Band-Cap veraendert die Klasse, nicht die Formelkomponenten selbst.",
      },
    ],
  },
  {
    id: "point-score",
    layer: "point",
    x: 868,
    y: 640,
    title: "Punkt-Score",
    eyebrow: "8. Nach Rollup",
    short: "Wird erst nach Clustering, Hauptcluster und Gebaeude-/Track-Rollup berechnet.",
    uiFields: ["anomaly_score", "quality_score", "detector_scores", "explain_top_features"],
    trust: ["Nutzt Clusterrolle, Cluster-Outlier, Cross-Track, Kept-Support und Signalqualitaet."],
    caution: ["Beeinflusst Cluster, Hauptcluster und Gebaeude-Score nicht rueckwirkend."],
    formula:
      "quality = 0.45*(1-anomaly) + 0.25*cross_track + 0.20*kept_support + 0.10*signal",
    definitions: [
      {
        label: "anomaly",
        text: "Anomaly ist der Auffaelligkeitswert des einzelnen Punktes: Je hoeher der Wert, desto weniger passt der Punkt zum lokalen Gebaeude-/Track-Muster.",
        formula: "anomaly = 0.60*cluster_outlier + 0.25*local_deviation + 0.15*rule_penalty",
        detail: "Der Wert liegt zwischen 0 und 1. 0 bedeutet unauffaellig, 1 bedeutet stark auffaellig. Im Quality-Score wird deshalb 1 - anomaly verwendet: wenig Auffaelligkeit erhoeht die Punktqualitaet.",
        note: "Merke: anomaly ist eine Warnstufe. Der finale Punktwert ist quality_score.",
      },
      {
        label: "cluster_outlier",
        text: "cluster_outlier zeigt, wie stark ein Punkt aus Sicht des Clusterings abseits seines lokalen Musters liegt.",
        formula:
          "HDBSCAN: normalise(model.outlier_scores_)\nSmall-N konsistent: local_deviation_score\nSmall-N inkonsistent: mindestens 0.50\n<3 kept: max(existing, local_deviation_score)\nHDBSCAN-noise: mindestens 0.75\nGate-excluded: mindestens 1.00",
        detail: "Bei HDBSCAN kommt der Rohwert aus der Dichte-Struktur: Punkte am Rand oder ausserhalb stabiler Dichte bekommen hoehere Outlier-Scores. Die Pipeline normalisiert diese Werte pro Gruppe auf 0 bis 1. Bei Small-N gibt es keine echte Dichte-Clusterung, deshalb dient local_deviation_score als Ersatz.",
        note: "Lesart: 0 bedeutet clusterkonform, 1 bedeutet stark ausreisserverdaechtig.",
      },
      {
        label: "local_deviation",
        text: "Dieser Teil fragt: Weicht der Punkt innerhalb derselben Gebaeude+Track-Gruppe lokal auffaellig vom Umfeld ab?",
        formula:
          "feature_z = abs(value - median_group) / scale_group\nscale_group = max(1.4826*MAD_group, minimum_scale)\n\nlocal_deviation_score = max(\n  velocity_z/3.5,\n  acceleration_z/3.5,\n  step_z/3.0,\n  along_z/4.0,\n  cross_z/4.0,\n  height_edge,\n  coherence_gap\n)",
        detail: "Klassisch waere z = (Wert - Mittelwert) / Standardabweichung. Hier nutzt die Pipeline robuste Z-Werte: Abstand zum Median der lokalen Gebaeude+Track-Gruppe geteilt durch eine MAD-basierte Streuung. height_edge steigt, wenn der Punkt stark am Hoehenrand liegt. coherence_gap steigt, wenn coherence unter 0.65 faellt.",
        note: "Lesart: 0 bedeutet lokal unauffaellig, 1 bedeutet lokal stark auffaellig.",
      },
      {
        label: "step_z / height_edge / coherence_gap",
        text: "Diese drei Begriffe sind Teilwerte innerhalb von local_deviation.",
        formula:
          "step_z = abs(ts_primary_step_abs - median_step_group) / scale_step\nscale_step = max(1.4826*MAD_step_group, 0.75)\n\nheight_rank_in_building = height_sort_index / (valid_height_count - 1)\nheight_edge = abs(height_rank_in_building - 0.5) * 1.4\n\ncoherence_gap = max(0, (0.65 - coherence) / 0.65)",
        detail: "step_z beschreibt einen untypischen einzelnen Sprung in der InSAR-Zeitreihe. Fuer height_rank werden die Punkte derselben Gebaeude+Track-Gruppe nach point.height sortiert: niedrigster gueltiger Punkt = 0, hoechster gueltiger Punkt = 1. Das ist also relativ zu den vorhandenen Punkten, nicht zwingend das absolute Gebaeudedach oder Fundament. Fehlen genug Hoehenwerte, wird neutral 0.5 verwendet. coherence_gap beschreibt fehlende Signalqualitaet: ab coherence 0.65 ist er 0, darunter steigt er an.",
      },
      {
        label: "rule_penalty",
        text: "Dieser Teil sammelt regelbasierte Warnungen, die nicht direkt aus dem Clusterlabel kommen.",
        formula: "unsupported_step wenn ts_primary_step_abs > step_p90 und step_support < 0.25",
        detail: "Beispiele sind nearest-Zuordnung, hohe velocity-Unsicherheit, instabile Amplitude, schwacher lokaler Support oder schlechte Cross-Track-Uebereinstimmung. Der schwache lokale Support kommt konkret ueber step_support: Wenn ein Punkt einen grossen Zeitreihen-Sprung hat und kaum Nachbarpunkte denselben Sprung bestaetigen, steigt rule_penalty. local_density ist hier kein direkter Faktor.",
      },
      {
        label: "Sonderfaelle",
        text: "Noise und Gate-excluded Punkte bekommen bewusst eine hohe Auffaelligkeit, auch wenn einzelne Teilwerte niedriger waeren.",
        formula: "noise -> anomaly >= 0.80; gate_excluded -> anomaly >= 0.90",
        detail: "Damit kann ein Punkt mit schlechter Datenbasis nicht durch andere positive Komponenten zu vertrauenswuerdig wirken.",
      },
      {
        label: "cross_track",
        text: "Track-Uebereinstimmung des Gebaeudes. Fehlt sie, nutzt die Pipeline neutral 0.50.",
      },
      {
        label: "kept_support",
        text: "Anteil der Punkte in derselben Gebaeude+Track-Gruppe, die die Hard Gates ueberlebt haben.",
      },
      {
        label: "signal",
        text: "Signal beschreibt beim Punkt, wie brauchbar die einzelne InSAR-Zeitreihe wirkt.",
        formula: "signal = 0.70 * coherence + 0.30 * amp_quality",
        detail: "Das ist punktbezogen und nicht identisch mit dem Gebaeude-signal, das die Main-Cluster-Kohaerenz mittelt.",
      },
      {
        label: "1-anomaly",
        text: "Umkehrung der Auffaelligkeit: wenig Anomalie erhoeht die Punktqualitaet.",
      },
    ],
  },
  {
    id: "point-label",
    layer: "point",
    x: 1076,
    y: 640,
    title: "Punktlabel",
    eyebrow: "9. normal / suspect / outlier",
    short: "Das Label ist die lesbare Klasse des Punktes.",
    uiFields: ["label", "quality_score", "cluster_role", "cluster_probability", "gate_excluded"],
    trust: ["normal bedeutet: quality_score ist hoch genug und keine harte Rollenregel hat das Label ueberschrieben."],
    caution: ["suspect ist keine Bestaetigung, sondern ein vorsichtiger Zwischenzustand. outlier kann direkt aus noise oder gate_excluded kommen."],
    formula:
      "normal wenn quality_score >= 0.70; outlier wenn quality_score < 0.40; sonst suspect",
    definitions: [
      {
        label: "normal",
        text: "Der Punkt wirkt im lokalen Kontext unauffaellig und hat genug Qualitaet.",
        formula: "quality_score >= 0.70",
        detail: "Dieses Label gibt es nur, wenn keine harte Sonderregel greift. Ein noise-Punkt wird also nicht normal, auch wenn einzelne Score-Komponenten gut aussehen.",
      },
      {
        label: "suspect",
        text: "Der Punkt ist nicht klar normal, aber auch nicht hart outlier.",
        formula: "0.40 <= quality_score < 0.70",
        detail: "suspect ist ein Zwischenzustand. Bei cluster_role = insufficient_support wird das Label bewusst auf suspect gesetzt und quality_score maximal auf 0.65 gedeckelt.",
      },
      {
        label: "outlier",
        text: "Der Punkt ist auffaellig genug, um als Ausreisser gelesen zu werden.",
        formula: "quality_score < 0.40",
        detail: "Zusatzregel: cluster_role = noise setzt das Label direkt auf outlier. Gate-excluded Punkte werden ebenfalls outlier und bekommen nur eine stark gedeckelte Qualitaet.",
      },
      {
        label: "Reihenfolge",
        text: "Zuerst wird quality_score berechnet, danach wird das lesbare Label gesetzt.",
        formula:
          "gate_excluded -> outlier\ninsufficient_support -> suspect\nnoise -> outlier\nsonst: quality_score-Schwellen",
        detail: "Das Punktlabel ist nachgelagert: Es beeinflusst Cluster, Hauptcluster und Gebaeude-Score nicht rueckwirkend.",
      },
    ],
  },
  {
    id: "read-result",
    layer: "interpretation",
    x: 1076,
    y: 760,
    title: "Befund lesen",
    eyebrow: "10. Entscheidung",
    short: "Vertrauen entsteht nur, wenn Punkt-, Cluster- und Gebaeudeebene zusammenpassen.",
    uiFields: [
      "building_motion_mm_a",
      "building_status",
      "building_reliability_band",
      "label_counts",
      "top_points",
      "differential_motion_level",
    ],
    trust: [
      "Starker Befund: building_status ok, Reliability high/medium, beide Tracks stuetzen den Hauptcluster, wenige outlier/noise Punkte und keine harten Warnungen.",
    ],
    caution: [
      "Der Gebaeudewert ist ein datengetriebener InSAR-Hinweis, keine zertifizierte Bauwerksdiagnose. Kritische Befunde brauchen Plausibilisierung im Kontext.",
    ],
    definitions: [
      {
        label: "Was wird gelesen?",
        text: "Der Befund ist die gemeinsame Interpretation von Gebaeudestatus, Gebaeude-Score, Track-Vergleich, Clustern und Punktlabels.",
        detail: "Nicht ein einzelnes Feld entscheidet allein. Ein guter Gebaeude-Score ist stark, wenn die darunterliegenden Punkte und Cluster dieselbe Geschichte erzaehlen.",
      },
      {
        label: "building_motion_mm_a",
        text: "Das ist die zusammengefasste Bewegungsrate des Gebaeudes.",
        formula: "building_motion_mm_a = mean(track_motion_mm_a der vorhandenen Hauptcluster)",
        detail: "Die Track-Bewegungen stammen aus den Hauptclustern. Wenn nur ein Track einen Hauptcluster hat, ist der Wert einseitiger und sollte vorsichtiger gelesen werden.",
      },
      {
        label: "label_counts",
        text: "label_counts zeigt, wie die Punkte im Gebaeude verteilt sind: normal, suspect und outlier.",
        detail: "Viele normale Punkte stuetzen den Befund. Viele suspect oder outlier Punkte bedeuten: Der Gebaeudewert kann noch existieren, aber die Punktlage ist uneinheitlich oder auffaellig.",
      },
      {
        label: "top_points",
        text: "top_points sind die wichtigsten oder auffaelligsten Punkte, die man beim Lesen zuerst ansehen sollte.",
        detail: "Sie helfen zu verstehen, ob ein Gebaeudewert von mehreren plausiblen Punkten getragen wird oder ob einzelne auffaellige Punkte die Interpretation dominieren.",
      },
      {
        label: "Harte Warnungen",
        text: "Bestimmte Flags machen den Befund vorsichtiger, auch wenn einzelne Scores gut aussehen.",
        formula:
          "candidate -> pruefpflichtiger Hinweis ohne Penalty\nsignificant -> statistisch abgesicherter Befund mit Penalty\nconfirmed -> durch zweiten Track bestaetigter Befund mit Penalty\nsingle_track_only/noise_dominated/insufficient_support -> eingeschraenkte Aussagebasis",
        detail: "Auch ein hohes Differential-Level ist kein automatischer Beweis fuer einen Schaden am Bauwerk. Es kennzeichnet die Staerke der InSAR-Evidenz und die notwendige fachliche Pruefung.",
      },
      {
        label: "Praktische Lesereihenfolge",
        text: "Eine robuste Interpretation geht von grob nach fein.",
        formula:
          "1) Gebaeudestatus pruefen\n2) Reliability-Band lesen\n3) ASC/DSC-Trackvergleich ansehen\n4) Hauptcluster und Support pruefen\n5) Punktlabels und top_points kontrollieren\n6) Warnflags beruecksichtigen",
        detail: "Wenn diese Ebenen zusammenpassen, ist der Befund gut lesbar. Wenn sie sich widersprechen, sollte der Wert als Hinweis und nicht als gesicherte Aussage behandelt werden.",
      },
    ],
  },
];

const flowEdges: FlowEdge[] = [
  { from: "run-points", to: "candidate-search", label: "pro Punkt" },
  { from: "candidate-search", to: "best-building", label: "priorisieren" },
  { from: "best-building", to: "grouping", label: "building_id" },
  { from: "grouping", to: "local-features", label: "building+track" },
  { from: "local-features", to: "gates", label: "Features" },
  { from: "gates", to: "cluster-branch", label: "kept Punkte" },
  { from: "cluster-branch", to: "insufficient-cluster", label: "<3" },
  { from: "cluster-branch", to: "small-n-cluster", label: "3-5" },
  { from: "cluster-branch", to: "hdbscan-cluster", label: ">=6" },
  { from: "insufficient-cluster", to: "cluster-role", label: "insufficient" },
  { from: "small-n-cluster", to: "cluster-role", label: "core/noise/weak" },
  { from: "hdbscan-cluster", to: "cluster-role", label: "core/noise" },
  { from: "cluster-role", to: "cluster-reliability", label: "core?" },
  { from: "cluster-reliability", to: "main-cluster", label: "verwertbar" },
  { from: "main-cluster", to: "cross-track", label: "Track motion" },
  { from: "main-cluster", to: "building-status", label: "Support" },
  { from: "cross-track", to: "building-reliability", label: "Agreement" },
  { from: "building-status", to: "building-reliability", label: "Penalty" },
  { from: "building-reliability", to: "point-score", label: "Kontext fuer Score" },
  { from: "point-score", to: "point-label", label: "Schwellen" },
  { from: "point-label", to: "read-result", label: "Befund" },
];

const layerLabels: Record<Layer, string> = {
  assignment: "Zuordnung",
  point: "Punkt",
  cluster: "Cluster",
  building: "Gebaeude",
  interpretation: "Lesen",
};

const layerColors: Record<Layer, { fill: string; border: string; muted: string }> = {
  assignment: { fill: "#edf1e5", border: "#5f7d2f", muted: "#dfe9cf" },
  point: { fill: "#e5f3ef", border: "#087f73", muted: "#d1ebe5" },
  cluster: { fill: "#e8f0f7", border: "#3172a8", muted: "#d8e7f2" },
  building: { fill: "#f5ecd7", border: "#b26b1d", muted: "#efe0bf" },
  interpretation: { fill: "#eee8f4", border: "#6b55a3", muted: "#e2d8ee" },
};

const simpleStages: SimpleStage[] = [
  {
    id: "assignment",
    step: "1",
    title: "Punkt zuordnen",
    headline: "Zu welchem Gebaeude gehoert dieser Punkt?",
    oneLiner: "Die Pipeline sucht zuerst fuer jeden Punkt das beste Gebaeude.",
    detail:
      "Der Start ist punktzentriert. Fuer jeden InSAR-Punkt werden Gebaeude-Kandidaten gesucht. Die Reihenfolge ist within, dann directional_buffer, dann nearest. Danach wird genau ein bestes Gebaeude gespeichert.",
    fields: ["building_id", "assignment_method", "distance_m", "buffer_m"],
    green: "within oder plausibler directional_buffer",
    yellow: "nearest, aber geometrisch plausibel",
    red: "kein Gebaeude oder nearest ohne gute Geometrie",
  },
  {
    id: "cluster",
    step: "2",
    title: "Gruppieren und pruefen",
    headline: "Welche Punkte bleiben fuer dieses Gebaeude uebrig?",
    oneLiner: "Erst wird nach Gebaeude + Track gruppiert, dann werden lokale Features berechnet, danach greifen die Hard Gates.",
    detail:
      "Nach der Zuordnung wird die Analyse gebaeudezentriert. Die Pipeline gruppiert nach building_id und track, berechnet lokale Features wie local_deviation_score und schliesst erst danach Punkte mit harten Gate-Gruenden aus.",
    fields: ["gate_reasons", "kept_for_scoring", "track_point_count", "building_context"],
    green: "genug kept Punkte mit guter Zeitreihe und Kohaerenz",
    yellow: "wenige kept Punkte oder schwacher Support",
    red: "zu viele Gate-Ausschluesse",
  },
  {
    id: "building",
    step: "3",
    title: "Cluster und Gebaeude",
    headline: "Gibt es einen tragfaehigen Hauptcluster?",
    oneLiner: "Nur kept Punkte werden geclustert; daraus entstehen Hauptcluster und Gebaeudescore.",
    detail:
      "Die Pipeline waehlt zuerst nach kept Punktanzahl: <3 insufficient_support, 3-5 Small-N, ab 6 HDBSCAN. Ein Cluster ist glaubwuerdig, wenn mehrere kept Punkte zusammenpassen, gute Kohaerenz haben und sauber zugeordnet sind. Der Hauptcluster je Track traegt danach die Track- und Gebaeudeaussage. Punktlabels werden dafuer noch nicht gebraucht.",
    fields: ["cluster_role", "main_cluster_by_track", "building_status", "building_reliability_band"],
    green: "core-Hauptcluster, Status ok, high oder gutes medium",
    yellow: "single_track_only, small_n oder weak_support",
    red: "noise_dominated oder insufficient_support",
  },
  {
    id: "result",
    step: "4",
    title: "Befund lesen",
    headline: "Was darf ich am Ende wirklich sagen?",
    oneLiner: "Erst nach dem Rollup werden Punkt-Score und Punktlabel als Lesesignal berechnet.",
    detail:
      "Ein guter Gebaeudescore allein reicht nicht. Der Befund ist stark, wenn die Punkt-zu-Gebaeude-Zuordnung plausibel ist, die stuetzenden Cluster passen und die nachgelagerten Punktlabels keine harte Warnung zeigen. Die Punktlabels erklaeren den Befund, sie erzeugen den Gebaeude-Score aber nicht.",
    fields: ["building_motion_mm_a", "reliability_penalties", "label_counts", "top_points"],
    green: "belastbare Tendenz: als Hinweis nutzbar",
    yellow: "weiter pruefen: Luftbild, Trackfilter, Gate-Punkte",
    red: "nicht als Gebaeudeaussage verwenden",
  },
];

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function pct(value: number) {
  return clamp(value / 100);
}

function reliabilityBand(score: number | null): ReliabilityBand {
  if (score === null) return null;
  if (score >= 0.75) return "high";
  if (score >= 0.45) return "medium";
  return "low";
}

function capBand(band: ReliabilityBand, cap: ReliabilityBand): ReliabilityBand {
  if (band === null || cap === null) return band;
  const order: Record<Exclude<ReliabilityBand, null>, number> = { low: 0, medium: 1, high: 2 };
  return order[band] <= order[cap] ? band : cap;
}

function formatScore(value: number | null) {
  return value === null ? "-" : value.toFixed(2);
}

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

function pointResult(input: PointInputs) {
  const clusterOutlier = pct(input.clusterOutlier);
  const localDeviation = pct(input.localDeviation);
  const rulePenalty = pct(input.rulePenalty);
  const signal = pct(input.signalQuality);
  let anomaly: number;
  let quality: number;
  let label: PointLabel;

  if (input.gateExcluded) {
    anomaly = Math.max(0.9, 0.6 * clusterOutlier + 0.25 * localDeviation + 0.15);
    quality = Math.min(0.15, 0.45 * (1 - anomaly) + 0.1 * signal);
    label = "outlier";
  } else {
    anomaly = clamp(0.6 * clusterOutlier + 0.25 * localDeviation + 0.15 * rulePenalty);
    if (input.role === "noise") anomaly = Math.max(anomaly, 0.8);
    quality = clamp(
      0.45 * (1 - anomaly) +
        0.25 * pct(input.crossTrack) +
        0.2 * pct(input.keptSupport) +
        0.1 * signal
    );
    if (input.role === "insufficient_support") {
      quality = Math.min(quality, 0.65);
      label = "suspect";
    } else if (input.role === "noise") {
      label = "outlier";
    } else if (quality >= 0.7) {
      label = "normal";
    } else if (quality < 0.4) {
      label = "outlier";
    } else {
      label = "suspect";
    }
  }

  return { anomaly, quality, label };
}

function clusterResult(input: ClusterInputs) {
  if (input.role !== "core") {
    return {
      reliableCore: false,
      score: null,
      support: Math.min(input.pointCount / 4, 1),
    };
  }
  const support = Math.min(input.pointCount / 4, 1);
  const score = clamp(0.45 * support + 0.35 * pct(input.medianCoherence) + 0.2 * pct(input.assignmentQuality));
  return {
    reliableCore: input.pointCount >= 2,
    score,
    support,
  };
}

function buildingStatus(input: BuildingInputs): BuildingStatus {
  if (input.keptCount < 3 || input.mainTracks === 0) return "insufficient_support";
  if (input.noiseShare > 50) return "noise_dominated";
  if (input.mainSupportTotal < 4) return "small_n";
  if (input.mainTracks === 1) return "single_track_only";
  return "ok";
}

function buildingResult(input: BuildingInputs) {
  const status = buildingStatus(input);
  if (status === "insufficient_support") {
    return {
      status,
      score: null,
      band: null as ReliabilityBand,
      penalties: ["kein belastbarer Hauptcluster oder weniger als 3 kept Punkte"],
    };
  }

  const penalties: string[] = [];
  const support = Math.min(input.mainSupportTotal / 6, 1);
  const agreement = input.mainTracks >= 2 ? pct(input.trackAgreement) : 0.5;
  let penaltyTotal = 0;

  if (input.mainTracks === 1) {
    penaltyTotal += 0.15;
    penalties.push("single_track_only: -0.15");
  }
  if (input.mainSupportTotal < 4) {
    penaltyTotal += 0.1;
    penalties.push("main_cluster_support < 4: -0.10");
  }
  if (input.noiseShare > 50) {
    penaltyTotal += 0.15;
    penalties.push("noise_dominated: -0.15");
  }
  if (
    input.differentialMotionLevel === "significant" ||
    input.differentialMotionLevel === "confirmed"
  ) {
    penaltyTotal += 0.15;
    penalties.push(`differential_motion_${input.differentialMotionLevel}: -0.15`);
  }
  if (input.weakMainCluster) {
    penaltyTotal += 0.1;
    penalties.push("weak_main_cluster_support: -0.10");
  }
  if (input.mainTracks >= 2 && input.trackAgreement < 25) {
    penaltyTotal += 0.1;
    penalties.push("low_track_agreement: -0.10");
  }

  let score = clamp(
    0.35 * support +
      0.25 * pct(input.signal) +
      0.2 * pct(input.assignmentQuality) +
      0.2 * agreement -
      penaltyTotal
  );
  let band = reliabilityBand(score);
  if (input.weakSecondaryTrack) {
    band = capBand(band, "medium");
    penalties.push("schwacher Sekundaertrack: Band maximal medium");
  }
  if (status === "ok" && input.mainTracks >= 2 && input.trackAgreement < 10) {
    band = capBand(band, "low");
    penalties.push("sehr niedrige Track-Uebereinstimmung: Band maximal low");
  }

  return { status, score, band, penalties };
}

function badgeVariantForLabel(label: string) {
  if (label === "normal" || label === "high" || label === "ok" || label === "core") return "default";
  if (label === "outlier" || label === "low" || label === "noise_dominated" || label === "insufficient_support") {
    return "destructive";
  }
  return "secondary";
}

function nodeById(id: NodeId) {
  return flowNodes.find((node) => node.id === id) ?? flowNodes[0];
}

function ControlRow({
  label,
  value,
  min = 0,
  max = 100,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex justify-between text-xs font-bold uppercase tracking-wide text-muted-foreground">
        <span>{label}</span>
        <span>{max === 100 ? formatPercent(value) : value}</span>
      </span>
      <Slider min={min} max={max} value={[value]} onValueChange={([next]) => onChange(next)} />
    </label>
  );
}

function ToggleButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md border px-3 py-2 text-left text-xs font-bold transition-colors",
        active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary hover:border-primary"
      )}
    >
      {children}
    </button>
  );
}

function splitFormulaLine(line: string) {
  const trimmed = line.trim();
  const operators = ["->", ">=", "<=", "=", "<", ">"];
  for (const operator of operators) {
    const index = trimmed.indexOf(operator);
    if (index > 0) {
      return {
        left: trimmed.slice(0, index).trim(),
        operator,
        right: trimmed.slice(index + operator.length).trim(),
      };
    }
  }
  const colonIndex = trimmed.indexOf(":");
  if (colonIndex > 0 && colonIndex <= 28) {
    return {
      left: trimmed.slice(0, colonIndex).trim(),
      operator: ":",
      right: trimmed.slice(colonIndex + 1).trim(),
    };
  }
  return null;
}

function FormulaLine({ line }: { line: string }) {
  const leadingSpaces = line.match(/^\s*/)?.[0].length ?? 0;
  const indentRem = Math.min(leadingSpaces * 0.18, 1.5);
  const trimmed = line.trim();
  if (!trimmed) return null;

  const looksLikeHeader = trimmed.endsWith(":") && !/[=<>]/.test(trimmed);
  if (looksLikeHeader) {
    return (
      <div style={{ paddingLeft: `${indentRem}rem` }} className="pt-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        {trimmed}
      </div>
    );
  }

  const parts = splitFormulaLine(trimmed);
  if (parts) {
    return (
      <div
        style={{ marginLeft: `${indentRem}rem` }}
        className="grid min-w-0 grid-cols-[minmax(0,0.9fr)_auto_minmax(0,1.35fr)] items-start gap-2 rounded-md bg-background/70 px-2 py-1.5 font-mono text-[11px] leading-snug"
      >
        <span className="break-words font-semibold text-foreground">{parts.left}</span>
        <span className="rounded bg-primary/10 px-1 font-bold text-primary">{parts.operator}</span>
        <span className="break-words text-muted-foreground">{parts.right}</span>
      </div>
    );
  }

  return (
    <div
      style={{ marginLeft: `${indentRem}rem` }}
      className="min-w-0 rounded-md bg-background/70 px-2 py-1.5 font-mono text-[11px] leading-snug text-foreground"
    >
      <span className="whitespace-pre-wrap break-words">{trimmed}</span>
    </div>
  );
}

function FormulaBox({ children, compact = false }: { children: string; compact?: boolean }) {
  const groups = children
    .trim()
    .split(/\n\s*\n/)
    .map((group) => group.split("\n").filter((line) => line.trim().length > 0))
    .filter((group) => group.length > 0);

  return (
    <div
      className={cn(
        "min-w-0 max-w-full rounded-lg border border-border bg-secondary/80",
        compact ? "p-2" : "p-3"
      )}
    >
      <div className={cn("grid", compact ? "gap-1.5" : "gap-2")}>
        {groups.map((group, groupIndex) => (
          <div
            key={`${groupIndex}-${group.join("|")}`}
            className={cn(groupIndex > 0 && "border-t border-border/70 pt-2")}
          >
            <div className="grid gap-1.5">
              {group.map((line, lineIndex) => (
                <FormulaLine key={`${lineIndex}-${line}`} line={line} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function splitSentences(text: string) {
  return text
    .split(/(?<=[.!?])\s+(?=[A-ZÄÖÜ0-9])/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function InlineExplanation({ text }: { text: string }) {
  const tokenPattern =
    /(`[^`]+`|\b[a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z0-9_]+)?\b|\b\d+(?:\.\d+)?\b|Q\d+\b)/g;
  const parts = text.split(tokenPattern).filter((part) => part.length > 0);

  return (
    <>
      {parts.map((part, index) => {
        const token = part.replace(/^`|`$/g, "");
        const isCode =
          part.startsWith("`") ||
          part.includes("_") ||
          part.includes(".") ||
          /^Q\d+$/.test(part) ||
          /^\d+(?:\.\d+)?$/.test(part);
        if (!isCode) return <span key={`${part}-${index}`}>{part}</span>;
        return (
          <code key={`${part}-${index}`} className="rounded bg-background px-1 py-0.5 font-mono text-[11px] font-semibold text-foreground">
            {token}
          </code>
        );
      })}
    </>
  );
}

function ExplanationText({ text }: { text: string }) {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const firstParagraph = paragraphs[0] ?? "";
  const remainingParagraphs = paragraphs.slice(1);
  const firstSentences = splitSentences(firstParagraph);
  const lead = firstSentences[0] ?? firstParagraph;
  const bullets = [...firstSentences.slice(1), ...remainingParagraphs.flatMap(splitSentences)];

  return (
    <div className="mt-3 rounded-md border-l-2 border-primary/35 bg-background/65 p-3">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Erklaerung</p>
      <p className="text-sm leading-relaxed text-foreground">
        <InlineExplanation text={lead} />
      </p>
      {bullets.length ? (
        <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-muted-foreground">
          {bullets.map((sentence) => (
            <li key={sentence} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
              <span>
                <InlineExplanation text={sentence} />
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function hasDefinitionDetails(definition: DefinitionItem) {
  return Boolean(definition.formula || definition.detail || definition.note);
}

function DefinitionCard({
  definition,
  expanded,
  onToggle,
}: {
  definition: DefinitionItem;
  expanded: boolean;
  onToggle: () => void;
}) {
  const hasMore = hasDefinitionDetails(definition);

  return (
    <div className={cn("rounded-lg border border-border bg-secondary/80 p-4", expanded && "border-primary/35 bg-secondary")}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-bold text-foreground">{definition.label}</p>
          <p className="mt-2 text-sm font-medium leading-relaxed text-foreground">{definition.text}</p>
        </div>

        {hasMore ? (
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            title={expanded ? "Details einklappen" : "Details ausklappen"}
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        ) : null}
      </div>

      {hasMore ? (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="mt-3 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-primary hover:underline"
        >
          {expanded ? "Weniger anzeigen" : "Formel und Details anzeigen"}
        </button>
      ) : null}

      {expanded && hasMore ? (
        <div>
          {definition.formula ? (
            <div className="mt-3">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Formel</p>
              <FormulaBox compact>{definition.formula}</FormulaBox>
            </div>
          ) : null}

          {definition.detail ? (
            <ExplanationText text={definition.detail} />
          ) : null}

          {definition.note ? (
            <p className="mt-3 text-xs italic leading-relaxed text-muted-foreground">{definition.note}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function MiniMetric({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: React.ReactNode;
  tone?: "neutral" | "good" | "warn" | "bad";
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-3",
        tone === "good" && "border-primary/25 bg-primary/10",
        tone === "warn" && "border-[#b26b1d]/30 bg-[#f5ecd7]",
        tone === "bad" && "border-destructive/25 bg-destructive/10",
        tone === "neutral" && "border-border bg-secondary"
      )}
    >
      <p className="section-title">{label}</p>
      <p className="font-mono text-lg font-bold">{value}</p>
    </div>
  );
}

function SimpleOverviewDiagram() {
  const [activeStageId, setActiveStageId] = useState<SimpleStageId>("assignment");
  const activeStage = simpleStages.find((stage) => stage.id === activeStageId) ?? simpleStages[0];

  return (
    <section className="overflow-hidden rounded-[28px] border border-[#d9ddd7] bg-[#fbfbf8] p-5 shadow-sm md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[#12312c] px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
            <MousePointerClick className="h-4 w-4" />
            Schnellueberblick
          </div>
          <h2 className="mt-4 max-w-4xl text-3xl font-bold leading-tight tracking-tight text-[#10201d] md:text-5xl">
            Erst Punkte einem Gebaeude zuordnen. Dann lokal analysieren.
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-[#52615d] md:text-lg">
            Dieses Diagramm ist fuer eine kurze Vorstellung gedacht. Standardansicht: die vier Schritte. Bei
            Rueckfragen klickst du einen Schritt an und zeigst die Ampel darunter.
          </p>
        </div>
        <div className="rounded-lg bg-[#e7f2ee] px-4 py-3 text-sm font-bold text-[#0f5c53]">
          Merksatz: Erst punktzentriert, danach gebaeudezentriert.
        </div>
      </div>

      <div className="mt-7 grid gap-3 md:grid-cols-4">
        {simpleStages.map((stage, index) => {
          const active = stage.id === activeStage.id;
          return (
            <button
              key={stage.id}
              type="button"
              onClick={() => setActiveStageId(stage.id)}
              className={cn(
                "relative min-h-[190px] rounded-lg border p-4 text-left transition-all",
                active
                  ? "border-[#0f766e] bg-[#0f766e] text-white shadow-lg"
                  : "border-[#d9ddd7] bg-white text-[#10201d] hover:border-[#0f766e]"
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold",
                  active ? "bg-white text-[#0f766e]" : "bg-[#e7f2ee] text-[#0f766e]"
                )}
              >
                {stage.step}
              </div>
              <p className={cn("mt-5 text-xs font-bold uppercase tracking-wide", active ? "text-white/75" : "text-[#6a7773]")}>
                {stage.title}
              </p>
              <h3 className="mt-2 text-xl font-bold leading-tight">{stage.headline}</h3>
              <p className={cn("mt-3 text-sm leading-relaxed", active ? "text-white/85" : "text-[#52615d]")}>
                {stage.oneLiner}
              </p>
              {index < simpleStages.length - 1 ? (
                <div className="absolute -right-4 top-1/2 z-10 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-[#d9ddd7] bg-[#fbfbf8] text-[#52615d] md:flex">
                  <ArrowRight className="h-4 w-4" />
                </div>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        <div className="rounded-lg border border-[#d9ddd7] bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-[#6a7773]">Ausgewaehlter Schritt</p>
          <h3 className="mt-2 text-2xl font-bold text-[#10201d]">{activeStage.title}</h3>
          <p className="mt-3 text-sm leading-relaxed text-[#52615d]">{activeStage.detail}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {activeStage.fields.map((field) => (
              <span key={field} className="rounded-full bg-[#eef2ef] px-3 py-1 font-mono text-xs font-bold text-[#33413d]">
                {field}
              </span>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-[#9bc9b5] bg-[#e5f6ee] p-4">
            <CheckCircle2 className="h-6 w-6 text-[#087f5b]" />
            <p className="mt-3 text-sm font-bold uppercase tracking-wide text-[#087f5b]">Gruen</p>
            <p className="mt-2 text-sm leading-relaxed text-[#12312c]">{activeStage.green}</p>
          </div>
          <div className="rounded-lg border border-[#e4c06d] bg-[#fff4d6] p-4">
            <AlertTriangle className="h-6 w-6 text-[#9b6217]" />
            <p className="mt-3 text-sm font-bold uppercase tracking-wide text-[#9b6217]">Gelb</p>
            <p className="mt-2 text-sm leading-relaxed text-[#3c2b12]">{activeStage.yellow}</p>
          </div>
          <div className="rounded-lg border border-[#e4a19b] bg-[#fde9e6] p-4">
            <XCircle className="h-6 w-6 text-[#b42318]" />
            <p className="mt-3 text-sm font-bold uppercase tracking-wide text-[#b42318]">Rot</p>
            <p className="mt-2 text-sm leading-relaxed text-[#3b1712]">{activeStage.red}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function FlowDiagram({
  activeNodeId,
  onSelect,
}: {
  activeNodeId: NodeId;
  onSelect: (nodeId: NodeId) => void;
}) {
  return (
    <svg viewBox="0 0 1280 860" className="h-auto w-full max-w-full rounded-lg border border-border bg-[#f8f7ef]">
      <defs>
        <marker id="flow-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#6f7a73" />
        </marker>
      </defs>

      <g>
        <text x="36" y="34" className="fill-muted-foreground text-[12px] font-bold uppercase tracking-wide">
          Punktzentrierte Zuordnung
        </text>
        <text x="660" y="34" className="fill-muted-foreground text-[12px] font-bold uppercase tracking-wide">
          Gebaeudezentrierte Punktpruefung
        </text>
        <text x="244" y="172" className="fill-muted-foreground text-[12px] font-bold uppercase tracking-wide">
          Cluster-Ebene: Algorithmuswahl nach kept Punkten
        </text>
        <text x="452" y="610" className="fill-muted-foreground text-[12px] font-bold uppercase tracking-wide">
          Gebaeude-Ebene: Rollup
        </text>
        <text x="868" y="610" className="fill-muted-foreground text-[12px] font-bold uppercase tracking-wide">
          Nachgelagerte Punktbewertung
        </text>
      </g>

      {flowEdges.map((edge) => {
        const from = nodeById(edge.from);
        const to = nodeById(edge.to);
        const sameColumn = Math.abs(from.x - to.x) < 4 && to.y > from.y;
        const reverseBranch = to.x < from.x && to.y > from.y;
        let labelX: number;
        let labelY: number;
        let path: string;

        if (sameColumn) {
          const fromX = from.x + NODE_WIDTH / 2;
          const fromY = from.y + NODE_HEIGHT;
          const toX = to.x + NODE_WIDTH / 2;
          const toY = to.y;
          labelX = fromX + 48;
          labelY = (fromY + toY) / 2 - 4;
          path = `M ${fromX} ${fromY} C ${fromX} ${fromY + 28}, ${toX} ${toY - 28}, ${toX} ${toY - 8}`;
        } else if (reverseBranch) {
          const fromX = from.x + NODE_WIDTH / 2;
          const fromY = from.y + NODE_HEIGHT;
          const toX = to.x + NODE_WIDTH / 2;
          const toY = to.y;
          const midY = (fromY + toY) / 2;
          labelX = (fromX + toX) / 2;
          labelY = midY - 8;
          path = `M ${fromX} ${fromY} C ${fromX} ${midY}, ${toX} ${midY}, ${toX} ${toY - 8}`;
        } else {
          const fromX = from.x + NODE_WIDTH;
          const fromY = from.y + NODE_HEIGHT / 2;
          const toX = to.x;
          const toY = to.y + NODE_HEIGHT / 2;
          const midX = (fromX + toX) / 2;
          labelX = midX;
          labelY = (fromY + toY) / 2 - 8;
          path = `M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX - 8} ${toY}`;
        }
        const active = edge.from === activeNodeId || edge.to === activeNodeId;
        const horizontalGap = to.x - (from.x + NODE_WIDTH);
        const showLabel = Boolean(edge.label) && (sameColumn || reverseBranch || horizontalGap >= 78);
        return (
          <g key={`${edge.from}-${edge.to}`}>
            <path
              d={path}
              fill="none"
              stroke={active ? "#087f73" : "#95a09a"}
              strokeWidth={active ? 3 : 2}
              markerEnd="url(#flow-arrow)"
              opacity={active ? 1 : 0.62}
            />
            {showLabel && edge.label && (
              <text
                x={labelX}
                y={labelY}
                textAnchor="middle"
                className="fill-muted-foreground text-[10px] font-bold"
              >
                {edge.label}
              </text>
            )}
          </g>
        );
      })}

      {flowNodes.map((node) => {
        const colors = layerColors[node.layer];
        const active = node.id === activeNodeId;
        return (
          <g
            key={node.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(node.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") onSelect(node.id);
            }}
            className="cursor-pointer"
          >
            <rect
              x={node.x}
              y={node.y}
              width={NODE_WIDTH}
              height={NODE_HEIGHT}
              rx={8}
              fill={active ? colors.muted : colors.fill}
              stroke={active ? colors.border : "#c8d0ca"}
              strokeWidth={active ? 4 : 2}
            />
            <text x={node.x + 14} y={node.y + 22} className="fill-muted-foreground text-[10px] font-bold uppercase tracking-wide">
              {node.eyebrow}
            </text>
            <text x={node.x + 14} y={node.y + 44} className="fill-foreground text-[17px] font-bold">
              {node.title}
            </text>
            <text x={node.x + 14} y={node.y + 66} className="fill-muted-foreground text-[11px]">
              {layerLabels[node.layer]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function NodeDetail({ node }: { node: FlowNode }) {
  const [expandedByNode, setExpandedByNode] = useState<Record<string, string[]>>({});
  const expandedLabels = useMemo(() => new Set(expandedByNode[node.id] ?? []), [expandedByNode, node.id]);
  const expandableDefinitions = useMemo(
    () => (node.definitions ?? []).filter(hasDefinitionDetails).map((definition) => definition.label),
    [node.definitions]
  );
  const allExpanded = expandableDefinitions.length > 0 && expandableDefinitions.every((label) => expandedLabels.has(label));

  function setExpandedLabels(labels: string[]) {
    setExpandedByNode((current) => ({ ...current, [node.id]: labels }));
  }

  function toggleDefinition(label: string) {
    setExpandedByNode((current) => {
      const currentLabels = new Set(current[node.id] ?? []);
      if (currentLabels.has(label)) {
        currentLabels.delete(label);
      } else {
        currentLabels.add(label);
      }
      return { ...current, [node.id]: Array.from(currentLabels) };
    });
  }

  return (
    <Card className="min-w-0 overflow-hidden p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="section-title">{node.eyebrow}</p>
          <h2 className="text-2xl font-bold">{node.title}</h2>
        </div>
        <Badge variant="secondary">{layerLabels[node.layer]}</Badge>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{node.short}</p>

      {node.formula ? (
        <div className="mt-4">
          <p className="section-title">Formel / Kernregel</p>
          <FormulaBox>{node.formula}</FormulaBox>
        </div>
      ) : null}

      {node.definitions ? (
        <div className="mt-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="section-title">{node.formula ? "Begriffe in der Formel" : "Entscheidungslogik"}</p>
            {expandableDefinitions.length ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setExpandedLabels(expandableDefinitions)}
                  disabled={allExpanded}
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-bold text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                  Alles ausklappen
                </button>
                <button
                  type="button"
                  onClick={() => setExpandedLabels([])}
                  disabled={!expandedLabels.size}
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-bold text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                  Alles einklappen
                </button>
              </div>
            ) : null}
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {node.definitions.map((definition) => (
              <DefinitionCard
                key={definition.label}
                definition={definition}
                expanded={expandedLabels.has(definition.label)}
                onToggle={() => toggleDefinition(definition.label)}
              />
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-4">
        <p className="section-title">Im Tool sichtbare Felder</p>
        <div className="flex flex-wrap gap-2">
          {node.uiFields.map((field) => (
            <Badge key={field} variant="secondary" className="font-mono">
              {field}
            </Badge>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-primary/25 bg-primary/10 p-3">
          <p className="section-title">Vertrauen steigt, wenn</p>
          <ul className="space-y-2 text-sm leading-relaxed">
            {node.trust.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-[#b26b1d]/30 bg-[#f5ecd7] p-3">
          <p className="section-title">Vorsicht bei</p>
          <ul className="space-y-2 text-sm leading-relaxed">
            {node.caution.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}

function PointCalculator() {
  const [input, setInput] = useState<PointInputs>({
    clusterOutlier: 18,
    localDeviation: 22,
    rulePenalty: 12,
    crossTrack: 82,
    keptSupport: 92,
    signalQuality: 84,
    gateExcluded: false,
    role: "core",
  });
  const result = pointResult(input);

  function update<K extends keyof PointInputs>(key: K, value: PointInputs[K]) {
    setInput((current) => ({ ...current, [key]: value }));
  }

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-2">
        <SlidersHorizontal className="h-5 w-5 text-primary" />
        <div className="min-w-0">
          <p className="section-title">Live-Rechner</p>
          <h3 className="text-xl font-bold">Punktlabel</h3>
        </div>
      </div>
      <div className="mb-4 rounded-lg border border-border bg-secondary p-3 text-sm leading-relaxed text-muted-foreground">
        Bezieht sich auf <span className="font-bold text-foreground">einen einzelnen InSAR-Punkt</span>, nachdem
        dieser bereits einem Gebaeude zugeordnet wurde. Die Regler sind vereinfachte Stellvertreter fuer die
        Punktbewertung im Kontext <span className="font-mono text-foreground">building_id + track</span>; sie zeigen
        keine echten Run-Daten.
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
        <div className="grid gap-4 md:grid-cols-2">
          <ControlRow label="Cluster-Ausreisser" value={input.clusterOutlier} onChange={(value) => update("clusterOutlier", value)} />
          <ControlRow label="Lokale Abweichung" value={input.localDeviation} onChange={(value) => update("localDeviation", value)} />
          <ControlRow label="Regel-Penalty" value={input.rulePenalty} onChange={(value) => update("rulePenalty", value)} />
          <ControlRow label="Cross-Track" value={input.crossTrack} onChange={(value) => update("crossTrack", value)} />
          <ControlRow label="Kept-Support" value={input.keptSupport} onChange={(value) => update("keptSupport", value)} />
          <ControlRow label="Signalqualitaet" value={input.signalQuality} onChange={(value) => update("signalQuality", value)} />
        </div>

        <div className="space-y-4">
          <div>
            <p className="section-title">Clusterrolle</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {(["core", "noise", "insufficient_support"] as const).map((role) => (
                <ToggleButton key={role} active={input.role === role} onClick={() => update("role", role)}>
                  {role}
                </ToggleButton>
              ))}
            </div>
          </div>
          <ToggleButton active={input.gateExcluded} onClick={() => update("gateExcluded", !input.gateExcluded)}>
            Gate-excluded {input.gateExcluded ? "ja" : "nein"}
          </ToggleButton>
          <div className="grid gap-2 sm:grid-cols-3">
            <MiniMetric label="Anomalie" value={formatScore(result.anomaly)} tone={result.anomaly >= 0.7 ? "bad" : "neutral"} />
            <MiniMetric label="Qualitaet" value={formatScore(result.quality)} tone={result.quality >= 0.7 ? "good" : result.quality < 0.4 ? "bad" : "warn"} />
            <MiniMetric label="Label" value={result.label} tone={result.label === "normal" ? "good" : result.label === "outlier" ? "bad" : "warn"} />
          </div>
        </div>
      </div>
    </Card>
  );
}

function ClusterCalculator() {
  const [input, setInput] = useState<ClusterInputs>({
    role: "core",
    pointCount: 4,
    medianCoherence: 82,
    assignmentQuality: 80,
  });
  const result = clusterResult(input);

  function update<K extends keyof ClusterInputs>(key: K, value: ClusterInputs[K]) {
    setInput((current) => ({ ...current, [key]: value }));
  }

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-2">
        <Layers3 className="h-5 w-5 text-primary" />
        <div>
          <p className="section-title">Live-Rechner</p>
          <h3 className="text-xl font-bold">Cluster-Verlaesslichkeit</h3>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
        <div className="grid gap-4 md:grid-cols-3">
          <ControlRow label="Punktanzahl" min={1} max={10} value={input.pointCount} onChange={(value) => update("pointCount", value)} />
          <ControlRow label="Median-Kohaerenz" value={input.medianCoherence} onChange={(value) => update("medianCoherence", value)} />
          <ControlRow label="Zuordnungsqualitaet" value={input.assignmentQuality} onChange={(value) => update("assignmentQuality", value)} />
        </div>
        <div className="space-y-4">
          <div>
            <p className="section-title">Clusterrolle</p>
            <div className="grid grid-cols-2 gap-2">
              {(["core", "noise", "weak_support", "insufficient_support", "excluded"] as const).map((role) => (
                <ToggleButton key={role} active={input.role === role} onClick={() => update("role", role)}>
                  {role}
                </ToggleButton>
              ))}
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <MiniMetric label="Support" value={formatScore(result.support)} />
            <MiniMetric label="Score" value={formatScore(result.score)} tone={result.score !== null && result.score >= 0.65 ? "good" : "neutral"} />
            <MiniMetric
              label="Verwertbar"
              value={result.reliableCore ? "ja" : "nein"}
              tone={result.reliableCore ? "good" : "warn"}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}

function BuildingCalculator() {
  const [input, setInput] = useState<BuildingInputs>({
    keptCount: 9,
    mainTracks: 2,
    mainSupportTotal: 7,
    noiseShare: 12,
    signal: 82,
    assignmentQuality: 84,
    trackAgreement: 78,
    differentialMotionLevel: "none",
    weakMainCluster: false,
    weakSecondaryTrack: false,
  });
  const result = buildingResult(input);

  function update<K extends keyof BuildingInputs>(key: K, value: BuildingInputs[K]) {
    setInput((current) => ({ ...current, [key]: value }));
  }

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-primary" />
        <div>
          <p className="section-title">Live-Rechner</p>
          <h3 className="text-xl font-bold">Gebaeudestatus und Reliability</h3>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="grid gap-4 md:grid-cols-2">
          <ControlRow label="Kept Punkte" min={0} max={20} value={input.keptCount} onChange={(value) => update("keptCount", value)} />
          <ControlRow label="Tracks mit Main-Cluster" min={0} max={2} value={input.mainTracks} onChange={(value) => update("mainTracks", value)} />
          <ControlRow label="Main-Support gesamt" min={0} max={14} value={input.mainSupportTotal} onChange={(value) => update("mainSupportTotal", value)} />
          <ControlRow label="Noise-Anteil" value={input.noiseShare} onChange={(value) => update("noiseShare", value)} />
          <ControlRow label="Main-Kohaerenz" value={input.signal} onChange={(value) => update("signal", value)} />
          <ControlRow label="Assignment" value={input.assignmentQuality} onChange={(value) => update("assignmentQuality", value)} />
          <ControlRow label="Track-Uebereinstimmung" value={input.trackAgreement} onChange={(value) => update("trackAgreement", value)} />
        </div>

        <div className="space-y-4">
          <div className="grid gap-2">
            <ToggleButton
              active={input.differentialMotionLevel !== "none"}
              onClick={() => {
                const levels: DifferentialMotionLevel[] = [
                  "none",
                  "candidate",
                  "significant",
                  "confirmed",
                ];
                const nextIndex =
                  (levels.indexOf(input.differentialMotionLevel) + 1) % levels.length;
                update("differentialMotionLevel", levels[nextIndex]);
              }}
            >
              Differential-Level: {input.differentialMotionLevel}
            </ToggleButton>
            <ToggleButton active={input.weakMainCluster} onClick={() => update("weakMainCluster", !input.weakMainCluster)}>
              Schwacher Hauptcluster {input.weakMainCluster ? "ja" : "nein"}
            </ToggleButton>
            <ToggleButton active={input.weakSecondaryTrack} onClick={() => update("weakSecondaryTrack", !input.weakSecondaryTrack)}>
              Schwacher Sekundaertrack {input.weakSecondaryTrack ? "ja" : "nein"}
            </ToggleButton>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <MiniMetric label="Status" value={result.status} tone={result.status === "ok" ? "good" : result.status === "insufficient_support" ? "bad" : "warn"} />
            <MiniMetric label="Score" value={formatScore(result.score)} tone={result.score !== null && result.score >= 0.75 ? "good" : result.score !== null && result.score < 0.45 ? "bad" : "warn"} />
            <MiniMetric label="Band" value={result.band ?? "-"} tone={result.band === "high" ? "good" : result.band === "low" ? "bad" : "warn"} />
          </div>
          <div className="rounded-lg border border-border bg-secondary p-3">
            <p className="section-title">Ausgeloeste Abwertungen</p>
            {result.penalties.length ? (
              <ul className="space-y-1 text-sm leading-relaxed">
                {result.penalties.map((penalty) => (
                  <li key={penalty}>{penalty}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Keine Penalty aktiv.</p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function ReadingChecklist() {
  const rows = [
    {
      level: "Zuordnung",
      good: "within oder plausibler directional_buffer; ein eindeutiges bestes Gebaeude",
      weak: "nearest-Fallback, kein Gebaeude, geometrisch unplausibler Quer-Versatz",
    },
    {
      level: "Punkt",
      good: "normal, quality >= 0.70, core, keine Gate-Gruende",
      weak: "suspect, noise, insufficient_support, gate_excluded",
    },
    {
      level: "Cluster",
      good: "core, mindestens 2 Punkte, gute Kohaerenz, wenig nearest",
      weak: "weak_support, noise, excluded, 1 Punkt, nearest-dominiert",
    },
    {
      level: "Gebaeude",
      good: "ok, high/medium, beide Tracks, niedrige Noise-Rate",
      weak: "single_track_only, small_n, noise_dominated, insufficient_support",
    },
  ];
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <div>
          <p className="section-title">Leseregel</p>
          <h3 className="text-xl font-bold">Wann dem Ergebnis vertrauen?</h3>
        </div>
      </div>
      <div className="grid gap-3">
        {rows.map((row) => (
          <div key={row.level} className="grid gap-3 rounded-lg border border-border bg-secondary p-3 md:grid-cols-[120px_1fr_1fr]">
            <p className="font-bold">{row.level}</p>
            <p className="text-sm leading-relaxed">
              <span className="font-bold text-primary">Gut:</span> {row.good}
            </p>
            <p className="text-sm leading-relaxed">
              <span className="font-bold text-[#9b5316]">Vorsicht:</span> {row.weak}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        Zusatzsignal aus Experimenten: <span className="font-mono">stable / monitor / unstable</span> stammt aus
        Sensitivitaets- und Harness-Auswertungen. Das ist hilfreich fuer Entwicklung und Plausibilisierung, aber
        nicht das normale produktive UI-Label der Pipeline.
      </p>
    </Card>
  );
}

export default function MlLogicExplainer({ onBack }: Props) {
  const [activeNodeId, setActiveNodeId] = useState<NodeId>("point-score");
  const [activeLayer, setActiveLayer] = useState<Layer | "all">("all");
  const activeNode = useMemo(() => nodeById(activeNodeId), [activeNodeId]);
  const visibleNodes = activeLayer === "all" ? flowNodes : flowNodes.filter((node) => node.layer === activeLayer);

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <Button onClick={onBack} variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4" />
              Zur Uebersicht
            </Button>
            <Badge variant="secondary">anomaly_local_v1 · Punkt zu Gebaeude, dann Gebaeude x Track</Badge>
          </div>
          <p className="section-title">Interaktives Entscheidungsdiagramm</p>
          <h1 className="max-w-5xl text-3xl font-bold tracking-tight md:text-5xl">
            Wie die ML-Pipeline Vertrauen in Punkte, Cluster und Gebaeude aufbaut
          </h1>
          <p className="mt-4 max-w-4xl text-sm leading-relaxed text-muted-foreground md:text-base">
            Diese Ansicht uebersetzt die produktive Backend-Logik in eine klickbare Hierarchie. Jeder Knoten zeigt,
            welche Felder im Tool sichtbar sind, wann Vertrauen steigt und wann der Befund fachlich vorsichtig
            gelesen werden muss.
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-border bg-secondary p-3">
              <p className="section-title">Zuordnung</p>
              <p className="text-sm leading-relaxed">Jeder Punkt waehlt zuerst genau ein bestes Gebaeude.</p>
            </div>
            <div className="rounded-lg border border-border bg-secondary p-3">
              <p className="section-title">Gruppierung</p>
              <p className="text-sm leading-relaxed">Danach werden Punkte nach Gebaeude und Track lokal geprueft.</p>
            </div>
            <div className="rounded-lg border border-border bg-secondary p-3">
              <p className="section-title">Rollup</p>
              <p className="text-sm leading-relaxed">
                Nur kept Punkte bilden Cluster, Hauptcluster und Gebaeudescore. Punktlabel kommen danach.
              </p>
            </div>
          </div>
        </header>

        <SimpleOverviewDiagram />

        <section className="grid min-w-0 gap-4 lg:grid-cols-[260px_1fr]">
          <Card className="p-4 lg:sticky lg:top-4 lg:self-start">
            <div className="mb-4 flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-primary" />
              <div>
                <p className="section-title">Navigation</p>
                <h2 className="font-bold">Ebenen und Knoten</h2>
              </div>
            </div>
            <div className="mb-4 grid grid-cols-2 gap-2">
              {(["all", "assignment", "point", "cluster", "building", "interpretation"] as const).map((layer) => (
                <ToggleButton key={layer} active={activeLayer === layer} onClick={() => setActiveLayer(layer)}>
                  {layer === "all" ? "Alle" : layerLabels[layer]}
                </ToggleButton>
              ))}
            </div>
            <div className="space-y-2">
              {visibleNodes.map((node) => (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => setActiveNodeId(node.id)}
                  className={cn(
                    "w-full rounded-lg border px-3 py-2 text-left transition-colors",
                    node.id === activeNodeId
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-secondary hover:border-primary"
                  )}
                >
                  <span className="block text-[11px] font-bold uppercase tracking-wide opacity-80">{node.eyebrow}</span>
                  <span className="block font-bold">{node.title}</span>
                </button>
              ))}
            </div>
          </Card>

          <div className="grid min-w-0 gap-4">
            <Card className="min-w-0 overflow-hidden p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="section-title">Klickbares Flow-Diagramm</p>
                  <h2 className="text-2xl font-bold">Von Punktzuordnung zu Gebaeudebefund</h2>
                </div>
                <Button onClick={() => setActiveNodeId("point-score")} variant="outline" size="sm">
                  <RotateCcw className="h-4 w-4" />
                  Fokus zuruecksetzen
                </Button>
              </div>
              <div className="mb-4 rounded-lg border border-[#087f73]/25 bg-[#e5f3ef] p-3 text-sm leading-relaxed text-[#23413c]">
                Zeitregel: Lokale Features werden vor den Hard Gates berechnet. Danach wird mit den kept Punkten
                geclustert; Punkt-Score und Punktlabel kommen erst nach dem Gebaeude-/Track-Rollup.
              </div>
              <FlowDiagram activeNodeId={activeNodeId} onSelect={setActiveNodeId} />
            </Card>

            <NodeDetail node={activeNode} />
          </div>
        </section>

        <section className="grid gap-4">
          <PointCalculator />
          <ClusterCalculator />
          <BuildingCalculator />
        </section>

        <ReadingChecklist />
      </div>
    </main>
  );
}
