export type ExplanationBlock = {
  title: string;
  paragraphs: string[];
};

export type QuestionSection = {
  id: string;
  eyebrow: string;
  question: string;
  shortAnswer: string;
  blocks: ExplanationBlock[];
  meetingMessage: string;
};

export type FeatureItem = {
  name: string;
  weight?: string;
  explanation: string;
  whyChosen: string;
  risk: string;
  recommendation: string;
};

export type FutureFeatureGroup = {
  title: string;
  explanation: string;
  examples: string[];
  howToGetIt: string;
};

export type AlgorithmCandidate = {
  name: string;
  usefulFor: string;
  strength: string;
  weakness: string;
  recommendation: string;
};

export const pageSummary = {
  title: "Clustering-Fragen für das Projektmeeting",
  subtitle:
    "Ausführliche, verständliche Antworten zu HDBSCAN, Small-N, Features, Gebäude-/Dachkontext, Graph-Clustering und Clusterqualität.",
  coreMessage:
    "HDBSCAN ist für euren Use Case ein plausibler Startpunkt, aber bei wenigen Punkten kein Wahrheitsgenerator. Der nächste fachlich saubere Schritt ist nicht blind ein anderer Algorithmus, sondern Confidence, Stabilitätstests, bessere Features und expliziter Gebäude-/Dachkontext.",
};

export const questionSections: QuestionSection[] = [
  {
    id: "hdbscan-small-n",
    eyebrow: "HDBSCAN bei 6 bis 15 Punkten",
    question:
      "Ist HDBSCAN auch für wenige Punkte, also sechs bis 15 Punkte, für unseren Use Case geeignet, wenn man die richtigen Parameter trifft?",
    shortAnswer:
      "Eingeschränkt ja. HDBSCAN ist ab sechs Punkten brauchbar, aber bei 6 bis 15 Punkten sollte das Ergebnis immer als Plausibilitätsentscheidung mit Confidence behandelt werden, nicht als harter Beweis.",
    blocks: [
      {
        title: "Warum HDBSCAN trotzdem vertretbar ist",
        paragraphs: [
          "Euer Clustering läuft lokal pro Gebäude und Track. Dadurch muss HDBSCAN nicht die ganze Stadt strukturieren, sondern nur eine kleine Menge von InSAR-Punkten, die bereits einem Gebäude zugeordnet wurden. Das macht den Einsatz bei kleineren Punktzahlen eher vertretbar.",
          "HDBSCAN passt grundsätzlich gut, weil man vorher nicht wissen muss, ob ein Gebäude ein Cluster, zwei Cluster oder nur Noise enthält. Genau das ist bei InSAR sinnvoll: ein Dach kann eine Hauptstruktur bilden, ein Balkon kann ein zweites Bewegungsmuster zeigen, und einzelne Punkte können falsch zugeordnet oder gemischte Reflektoren sein.",
        ],
      },
      {
        title: "Warum die Aussage bei wenigen Punkten fragil bleibt",
        paragraphs: [
          "Dichtebasierte Verfahren leben davon, dass Dichte überhaupt messbar ist. Bei sechs Punkten ist eine Dichteaussage sehr grob. Ein einzelner zusätzlicher oder entfernter Punkt kann dann ändern, ob eine Gruppe als Cluster, Randpunkt oder Noise interpretiert wird.",
          "Die aktuellen Parameter sind bewusst permissiv: bei sechs Punkten reicht bereits eine sehr kleine Mindestclustergröße. Das verhindert, dass alles als Noise endet, erhöht aber auch die Gefahr, dass kleine zufällige Gruppen als Cluster erscheinen.",
        ],
      },
      {
        title: "Was man daraus praktisch machen sollte",
        paragraphs: [
          "Für Gebäude mit 6 bis 15 Punkten sollte HDBSCAN nicht alleine entscheiden. Das Ergebnis sollte zusätzlich über Stabilität geprüft werden: bleibt das Cluster ähnlich, wenn man einen Punkt entfernt, Parameter leicht ändert oder Geometriefeatures schwächer gewichtet?",
          "Wenn das Cluster stabil bleibt und fachlich plausibel ist, kann man es verwenden. Wenn es nur bei genau einer Einstellung existiert, sollte es low confidence sein.",
        ],
      },
    ],
    meetingMessage:
      "HDBSCAN ist für 6 bis 15 Punkte verwendbar, aber nur mit Confidence- und Stabilitätsbewertung. Es gibt keine Parametereinstellung, die aus wenigen Punkten automatisch robuste Evidenz macht.",
  },
  {
    id: "variable-density",
    eyebrow: "Unterschiedliche Dichte",
    question:
      "Ist es für unseren Use Case gut oder schlecht, dass HDBSCAN Cluster unterschiedlicher Dichte findet?",
    shortAnswer:
      "Überwiegend gut, weil InSAR-Punkte auf Gebäuden ungleichmäßig verteilt sind. Das Risiko ist, dass kleine dichte Nebenstrukturen stärker wirken als eine große, dünner besetzte Dachfläche.",
    blocks: [
      {
        title: "Konkretes Beispiel aus eurem Kontext",
        paragraphs: [
          "Angenommen ein großes Dach hat zehn Punkte mit ähnlicher Bewegung von etwa -3 mm/Jahr. Diese Punkte sind räumlich weit verteilt, weil das Dach groß ist. Zusätzlich gibt es vier Balkon- oder Randpunkte mit etwa -7 mm/Jahr, die räumlich dicht beieinander liegen.",
          "Ein Verfahren mit fixer Dichteerwartung könnte den Balkon als klaren Cluster erkennen und das Dach schlechter bewerten, weil das Dach dünner besetzt ist. HDBSCAN kann beide Situationen besser abbilden, weil es verschiedene Dichteskalen betrachtet.",
        ],
      },
      {
        title: "Warum das gut ist",
        paragraphs: [
          "InSAR-Messpunkte entstehen nicht gleichmäßig wie ein Messraster. Punktreflektoren sammeln sich an Kanten, Metallteilen, Dachstrukturen oder Fassadenelementen. Deshalb ist es realistisch, dass eine physikalisch relevante Struktur dichter oder dünner besetzt ist als eine andere.",
          "HDBSCAN kann deshalb ein dichtes Teilobjekt und eine lockere Hauptstruktur gleichzeitig erkennen, ohne vorher eine feste Clusterzahl zu verlangen.",
        ],
      },
      {
        title: "Warum es gefährlich sein kann",
        paragraphs: [
          "Wenn ein kleines Nebenobjekt sehr dicht ist und das eigentliche Dach nur wenige verteilte Punkte hat, kann das Nebenobjekt algorithmisch stabiler aussehen als die Hauptdachfläche.",
          "Deshalb braucht ihr Gebäude-/Dachkontext und Cluster-Confidence. Ein Cluster soll nicht nur mathematisch dicht sein, sondern auch objektlogisch plausibel: liegt es auf derselben Dachfläche, nahe an einer Kante, in LOS-Richtung eines Nachbargebäudes oder auf einem möglichen Nebenobjekt?",
        ],
      },
    ],
    meetingMessage:
      "Variable Dichte ist für InSAR-Gebäude grundsätzlich ein Vorteil. Sie muss aber durch Objektkontext kontrolliert werden, damit ein dichter Balkon nicht fälschlich wichtiger wirkt als ein großes Dach.",
  },
  {
    id: "roof-context",
    eyebrow: "Gebäude- und Dachkontext",
    question:
      "Wie kommt man überhaupt zu Informationen wie Dachkante, Balkon, Garten oder Nebengebäude?",
    shortAnswer:
      "Mit den aktuellen Daten kann man solche Objektklassen nicht sicher erkennen. Man kann aber Risikoindikatoren ableiten. Für echte semantische Einordnung braucht man zusätzliche Daten wie Orthofoto, LiDAR/DSM oder Dachflächenmodelle.",
    blocks: [
      {
        title: "Was man sofort aus vorhandenen Gebäudegeometrien ableiten kann",
        paragraphs: [
          "Aus Gebäudepolygonen kann man robuste Kontextfeatures berechnen: liegt der Punkt innerhalb des Gebäudes, wie weit ist er von der Gebäudekante entfernt, wie weit vom Gebäudezentrum, wie groß ist das Gebäude, und wie nah liegt das nächste Nachbargebäude?",
          "Damit erkennt man noch nicht sicher einen Balkon. Aber man erkennt Risiko: ein Punkt direkt an der Kante oder außerhalb im Buffer ist objektlogisch unsicherer als ein Punkt klar innerhalb der Dachfläche.",
        ],
      },
      {
        title: "Was Höhen- oder Oberflächenmodelle beitragen",
        paragraphs: [
          "Mit DSM/DOM oder LiDAR kann man prüfen, ob ein Punkt höhenmäßig zum Gebäude passt. Ein Punkt auf Dachhöhe ist plausibler für eine Dachstruktur als ein Punkt deutlich niedriger oder stark abweichend vom lokalen Dachniveau.",
          "Auch daraus wird noch keine perfekte Balkon-Erkennung. Es ist eher ein Plausibilitätssignal: Dachniveau, Kantenbereich, möglicher Anbau, niedrige Nebenstruktur oder unklare Zuordnung.",
        ],
      },
      {
        title: "Was man für echte Objektklassen braucht",
        paragraphs: [
          "Wenn man wirklich sagen will: dieser Punkt liegt auf Balkon, Garten, Nebengebäude oder Dachkante, braucht man zusätzliche semantische Daten. Realistisch wären Orthofotos, LiDAR-basierte Dachsegmente, Dachflächenmodelle, Gebäudeteile oder manuell gelabelte Beispiele.",
          "Ohne solche Daten sollte die Pipeline nicht behaupten, einen Balkon sicher erkannt zu haben. Sie sollte stattdessen sagen: dieser Punkt hat ein hohes Assignment- oder Mixed-Reflector-Risiko.",
        ],
      },
      {
        title: "Praktische Umsetzung als Risk Score",
        paragraphs: [
          "Ein erster sinnvoller Score wäre: assignment_risk = Kantenrisiko + Buffer-Zuordnung + Nähe zu Nachbargebäude in LOS-Richtung + Höhenabweichung + Bewegungsabweichung vom Hauptcluster.",
          "Das Ergebnis wäre kein semantisches Label wie Balkon, sondern eine belastbarere Aussage: Punkt ist objektlogisch sicher, unsicher oder wahrscheinlich gemischt/falsch zugeordnet.",
        ],
      },
    ],
    meetingMessage:
      "Balkon/Garten/Nebengebäude kann man aus den aktuellen Daten nicht sicher klassifizieren. Kurzfristig sollte man Risikoindikatoren berechnen; langfristig braucht man Orthofoto, LiDAR/DSM oder Dachsegmente.",
  },
  {
    id: "small-n",
    eyebrow: "Small-N-Methodik",
    question:
      "Ist die angewandte Small-N-Methodik vertretbar oder wäre eine andere Herangehensweise besser?",
    shortAnswer:
      "Als Fallback ist sie vertretbar. Sie sollte aber nicht wie echtes Clustering interpretiert werden, sondern als low-confidence Plausibilitätsheuristik.",
    blocks: [
      {
        title: "Was aktuell passiert",
        paragraphs: [
          "Bei drei bis fünf kept Punkten wird kein HDBSCAN verwendet. Stattdessen wird angenommen: diese wenigen Punkte könnten eine gemeinsame lokale Gebäudegruppe bilden. Dann wird geprüft, ob einzelne Punkte stark vom lokalen Muster abweichen.",
          "Das ist pragmatisch, weil man bei drei bis fünf Punkten keine stabile Dichtehierarchie erwarten kann. Ein HDBSCAN-Ergebnis wäre dort oft nur scheinbar mathematisch.",
        ],
      },
      {
        title: "Großes Dach mit fünf gleichmäßig verteilten Punkten",
        paragraphs: [
          "Wenn fünf Punkte gleichmäßig auf einem großen Dach verteilt sind und ähnliche Bewegung sowie gute Kohärenz haben, ist das nicht automatisch ein Problem. Gerade dann spricht die fachliche Interpretation eher für ein gemeinsames Dachsignal.",
          "Problematisch wird es, wenn einer der Punkte stark abweicht, nahe an einer Gebäudekante liegt, per Buffer zugeordnet wurde oder in LOS-Richtung ein Nachbargebäude liegt. Dann kann der Small-N-Fallback nicht sicher entscheiden, ob es ein echtes Teilobjekt, ein gemischter Reflektor oder ein Fehlerpunkt ist.",
        ],
      },
      {
        title: "Empfehlung",
        paragraphs: [
          "Die aktuelle Small-N-Methodik sollte beibehalten werden, aber das Ergebnis sollte klar anders heißen, zum Beispiel small_n_plausible_group statt normales Cluster.",
          "Zusätzlich sollte jedes Small-N-Ergebnis automatisch low confidence tragen und mit Objektkontext, Kohärenz, ASC/DSC-Konsistenz und Nachbarschaft geprüft werden.",
        ],
      },
    ],
    meetingMessage:
      "Small-N ist als Fallback okay, aber nicht als Beweis. Bei drei bis fünf Punkten sollte die Pipeline Plausibilität und Unsicherheit kommunizieren, nicht harte Clusterwahrheit.",
  },
  {
    id: "one-two-points",
    eyebrow: "Ein oder zwei Punkte",
    question: "Was passiert, wenn nur ein oder zwei Punkte vorhanden sind?",
    shortAnswer:
      "Dann gibt es keine belastbare Clusterentscheidung. Die Pipeline behandelt solche Fälle als insufficient_support.",
    blocks: [
      {
        title: "Warum ein Punkt kein Cluster sein kann",
        paragraphs: [
          "Ein einzelner Punkt kann ein wichtiges Signal sein, etwa wenn er stark sinkt und hohe Kohärenz hat. Aber er kann keine lokale Struktur beweisen, weil es keinen Vergleich innerhalb des Gebäudes gibt.",
          "Man kann also sagen: dieser Punkt ist auffällig. Man kann nicht sagen: es gibt ein Cluster oder eine Teilstruktur.",
        ],
      },
      {
        title: "Warum zwei Punkte noch kein stabiles Cluster sind",
        paragraphs: [
          "Zwei Punkte erlauben einen Paarvergleich: ähnliche Bewegung, ähnliche Höhe, ähnliche Zeitreihe. Aber zwei Punkte sind eine Verbindung, keine robuste Gruppe.",
          "Für die UI und Bewertung wäre es sinnvoll, solche Fälle als single_point_evidence oder pair_evidence zu zeigen, nicht als fehlgeschlagenes Clustering.",
        ],
      },
    ],
    meetingMessage:
      "Bei ein bis zwei Punkten sollte keine Clusterlogik erzwungen werden. Die Punkte können als Evidenz relevant sein, aber nicht als Strukturbeweis.",
  },
  {
    id: "height-los-coherence",
    eyebrow: "Höhe, LOS und Kohärenz",
    question:
      "Warum können Höhe, LOS-Bewegung und Kohärenz irreführend sein, obwohl sie fachlich sinnvoll wirken?",
    shortAnswer:
      "Alle drei sind wertvoll, aber sie messen nicht direkt das gewünschte Objekt. Höhe kann durch Layover falsch wirken, LOS ist keine vertikale Setzung, und Kohärenz beschreibt Messqualität, nicht automatisch Objektzugehörigkeit.",
    blocks: [
      {
        title: "Layover und schlechte Höheninformationen",
        paragraphs: [
          "Bei Layover fallen Reflektionen von Boden, Fassade und Dach in der Radarabbildung räumlich zusammen oder überlagern sich. Ein Punkt kann kartografisch auf oder nahe einem Gebäude liegen, sein Signal kann aber teilweise von einer anderen Struktur stammen.",
          "Wenn dann ein Höhenfeature verwendet wird, kann es so aussehen, als wäre der Punkt ein klarer Dachpunkt. Tatsächlich kann die Radarreflektion aber von Fassade, Kante oder einem benachbarten Objekt beeinflusst sein. Schlechte DSM-/Höhendaten verstärken dieses Risiko.",
        ],
      },
      {
        title: "LOS ist nicht automatisch vertikale Setzung",
        paragraphs: [
          "InSAR misst Bewegung entlang der Line of Sight, also entlang der Blickrichtung des Satelliten. Eine LOS-Geschwindigkeit ist deshalb eine Projektion der realen Bewegung, nicht direkt die vertikale Setzung.",
          "Im Code wird für spätere Rollups ein vertikaler Proxy verwendet: velocity geteilt durch cos(incidence_angle). In der eigentlichen Cluster-Matrix wird aber die LOS-velocity verwendet. Für Clustering innerhalb eines Tracks ist das vertretbar, für ASC/DSC-Vergleich sollte der vertikale Proxy stärker berücksichtigt werden.",
        ],
      },
      {
        title: "Kohärenz als Clustering-Feature",
        paragraphs: [
          "Ja, Kohärenz fließt aktuell direkt in die Clusterbildung ein. Es wird coherence_penalty = 1 - coherence berechnet und mit Gewicht 0.80 in die Cluster-Matrix aufgenommen.",
          "Das bedeutet: Punkte mit schlechter Kohärenz liegen im Feature-Raum weiter weg von Punkten mit guter Kohärenz und werden eher zu Randpunkten oder Noise. Zusätzlich gibt es vorher ein Gate für zu niedrige Kohärenz.",
          "Fachlich ist das nachvollziehbar, weil schlechte Messpunkte weniger stark Cluster bilden sollten. Das Risiko ist, dass Messqualität und physikalische Objektstruktur vermischt werden. Deshalb sollte man testen, ob Kohärenz besser als Clustering-Feature oder nur als nachgelagerte Confidence verwendet wird.",
        ],
      },
    ],
    meetingMessage:
      "Höhe, LOS und Kohärenz sind gute Signale, aber keine direkten Wahrheiten. Sie sollten mit Unsicherheitslogik und InSAR-Kontext verwendet werden.",
  },
  {
    id: "pca-embeddings",
    eyebrow: "PCA und Embeddings",
    question:
      "Ist es sinnvoll, Features mit PCA zu reduzieren oder in Embeddings umzuwandeln?",
    shortAnswer:
      "Ja, aber nicht lokal aus sechs bis 15 Punkten pro Gebäude. PCA oder Embeddings sollten global oder track-spezifisch gelernt und dann lokal angewendet werden.",
    blocks: [
      {
        title: "Warum lokale PCA problematisch wäre",
        paragraphs: [
          "Wenn ein Gebäude nur sechs bis 15 Punkte hat, ist das zu wenig, um dort stabil eine PCA zu lernen. Die Komponenten würden stark davon abhängen, welche wenigen Punkte gerade vorhanden sind.",
          "Das könnte so wirken, als würde PCA Struktur finden, obwohl sie nur die zufällige Streuung dieser kleinen Punktgruppe beschreibt.",
        ],
      },
      {
        title: "Wann PCA sinnvoll ist",
        paragraphs: [
          "PCA ist sinnvoll, wenn man viele korrelierte Features hat, zum Beispiel mehrere Trend-, Velocity-, Beschleunigungs- und Zeitreihenfeatures. Dann kann man global oder track-spezifisch robuste Komponenten lernen.",
          "Danach bekommt jeder Punkt PCA-Features, und diese können lokal pro Gebäude ins Clustering eingehen.",
        ],
      },
      {
        title: "Embeddings",
        paragraphs: [
          "Embeddings können vor allem für Zeitreihen interessant sein: ähnliche Bewegungsverläufe, Sprünge, saisonale Muster oder Rauschen könnten in einem kompakten Vektor repräsentiert werden.",
          "Aber Embeddings sind schwerer zu erklären. Deshalb sollten sie erst nach einer interpretierbaren Feature-Baseline getestet werden und immer gegen diese Baseline validiert werden.",
        ],
      },
    ],
    meetingMessage:
      "PCA und Embeddings sind Zukunftsthemen, aber sie lösen das Small-N-Problem nicht automatisch. Erst interpretierbare Zeitreihenfeatures, dann PCA, danach Embeddings als Experiment.",
  },
  {
    id: "algorithms",
    eyebrow: "Zukünftige Algorithmen",
    question:
      "Welche Clustering-Algorithmen sollte man künftig testen, besonders für wenige Datenpunkte?",
    shortAnswer:
      "Nicht ein einzelner Ersatzalgorithmus ist entscheidend, sondern ein Vergleich: HDBSCAN gegen OPTICS, agglomerative Verfahren, robuste Small-N-Modelle und einfache Graph-Clustering-Ansätze.",
    blocks: [
      {
        title: "Agglomerative Clustering",
        paragraphs: [
          "Agglomerative Clustering ist für wenige Punkte gut erklärbar, weil es zeigt, welche Punkte zuerst zusammengelegt werden. Die Clusteranzahl kann automatisch über einen Distanzschwellwert oder den größten Sprung im Dendrogramm bestimmt werden.",
          "Noise entsteht aber nicht automatisch. Man müsste nachgelagert Einzelpunkte, sehr kleine Gruppen oder Punkte mit großer Distanz zum Cluster-Medoid als Noise oder low confidence markieren.",
        ],
      },
      {
        title: "Graph-Clustering",
        paragraphs: [
          "Graph-Clustering ist für euren Use Case vielversprechend, weil man fachliche Beziehungen direkt modellieren kann. Knoten sind InSAR-Punkte. Kanten sagen: diese zwei Punkte sind wahrscheinlich Teil derselben physikalischen Struktur.",
          "Als erster Algorithmus wäre thresholded connected components sinnvoll: Punkte werden verbunden, wenn ihre Ähnlichkeit hoch genug ist; zusammenhängende Gruppen sind Cluster; isolierte Punkte sind Noise-Kandidaten.",
          "Wenn das bei größeren Gebäuden zu einfach ist, kann man später Leiden oder Louvain Community Detection testen. Graph Neural Networks würde ich aktuell nicht empfehlen, weil sie viele gelabelte Gebäudegraphen brauchen und für einzelne Gebäude mit wenigen Punkten überdimensioniert sind.",
        ],
      },
      {
        title: "Was Ähnlichkeitsdefinition bedeutet",
        paragraphs: [
          "Graph-Clustering braucht eine Regel, wann zwei Punkte ähnlich sind. Diese Regel kann Bewegungsähnlichkeit, Zeitreihenähnlichkeit, räumliche Plausibilität, ähnliche Höhe, Kohärenz und Assignment-Risiko kombinieren.",
          "Beispiel: zwei Punkte auf einem großen Dach sind weit auseinander, haben aber fast gleiche Velocity, ähnliche Zeitreihe, gute Kohärenz und passende Höhe. Dann sollte ihre Ähnlichkeit hoch sein. Zwei nahe Punkte mit völlig anderer Bewegung und hohem Nachbargebäude-Risiko sollten dagegen niedrige Ähnlichkeit haben.",
        ],
      },
    ],
    meetingMessage:
      "Für wenige Punkte ist ein einfacher erklärbarer Graph-Ansatz wahrscheinlich einer der sinnvollsten nächsten Tests. GNNs sind erst später realistisch, wenn viele gelabelte Beispiele existieren.",
  },
  {
    id: "quality",
    eyebrow: "Clusterqualität",
    question:
      "Wie kann man sinnvoll bewerten, ob ein Cluster gut oder schlecht ist?",
    shortAnswer:
      "Ein gutes Cluster ist nicht nur mathematisch dicht. Es muss stabil sein, bewegungslogisch zusammenpassen, objektlogisch plausibel sein und darf kein hohes InSAR-Assignment-Risiko haben.",
    blocks: [
      {
        title: "Mathematische Qualität",
        paragraphs: [
          "Man kann interne Metriken nutzen: Clustergröße, Noise-Anteil, HDBSCAN Membership Probability, Outlier Score, DBCV oder Distanz innerhalb und zwischen Clustern.",
          "Diese Metriken beantworten aber nur: sieht es im Feature-Raum sauber aus? Sie beantworten nicht automatisch: ist es ein echtes Gebäudeteil?",
        ],
      },
      {
        title: "Stabilität",
        paragraphs: [
          "Ein gutes Cluster sollte nicht verschwinden, wenn man einen Punkt entfernt, Parameter leicht ändert oder Featuregewichte moderat variiert.",
          "Gerade bei 6 bis 15 Punkten ist Stabilität oft wichtiger als eine einzelne Clusterklasse. Ein Cluster, das nur bei einer exakten Einstellung existiert, ist schwach.",
        ],
      },
      {
        title: "Objekt- und InSAR-Plausibilität",
        paragraphs: [
          "Zusätzlich braucht man fachliche Checks: liegen die Punkte plausibel auf demselben Gebäude oder Dachbereich, passen Bewegung und Zeitreihe zusammen, ist die Kohärenz ausreichend, gibt es Nachbargebäude in LOS-Richtung, und liegt ein Layover-/Mixed-Reflector-Risiko vor?",
          "Daraus sollte ein Cluster-Quality-Score entstehen, der mathematische Qualität, Stabilität, Bewegungskonsistenz, Zeitreihenkonsistenz und Objektkontext kombiniert.",
        ],
      },
    ],
    meetingMessage:
      "Clusterqualität muss mehrdimensional bewertet werden. Nur auf das Clusterlabel zu schauen reicht für InSAR-Gebäude nicht aus.",
  },
];

export const currentFeatures: FeatureItem[] = [
  {
    name: "along_look_offset_m",
    weight: "1.10",
    explanation: "Lage des Punktes entlang der Radar-Sichtgeometrie relativ zum Gebäude.",
    whyChosen: "Besser als rohe XY-Koordinaten, weil InSAR stark von der Blickrichtung des Satelliten abhängt.",
    risk: "Große Dächer können dadurch intern weit gestreut wirken, obwohl sie eine gemeinsame Bewegung haben.",
    recommendation: "Geometriegewicht per Ablation testen und mit Dach-/Objektkontext ergänzen.",
  },
  {
    name: "cross_look_offset_m",
    weight: "1.00",
    explanation: "Lage quer zur Radar-Sichtgeometrie.",
    whyChosen: "Hilft, Dachbereiche, Kanten und potenzielle Nachbarobjekte räumlich zu trennen.",
    risk: "Kann große zusammenhängende Dachflächen künstlich splitten, wenn Bewegung sehr ähnlich ist.",
    recommendation: "Bei großen Dächern prüfen, ob Cluster nur wegen räumlicher Distanz zerfallen.",
  },
  {
    name: "height_rank_in_building",
    weight: "0.75",
    explanation: "Relative Höhenposition des Punktes innerhalb der Gebäudegruppe.",
    whyChosen: "Dach, Fassade, Bodenreflexion oder Nebengebäude können unterschiedliche Höhenlagen haben.",
    risk: "Layover oder schlechte Höhenmodelle können die reale Reflexionsquelle falsch erscheinen lassen.",
    recommendation: "Mit DSM-Qualität, Dachsegmenten und Layover-Risiko kombinieren.",
  },
  {
    name: "velocity",
    weight: "1.30",
    explanation: "Mittlere LOS-Bewegung des InSAR-Punktes.",
    whyChosen: "Zentrales physikalisches Signal für Setzung oder Hebung.",
    risk: "LOS ist eine Projektion und keine direkte vertikale Bewegung.",
    recommendation: "Für ASC/DSC-Vergleich vertikalen Proxy oder 2D/3D-Bewegungsmodell stärker nutzen.",
  },
  {
    name: "acceleration",
    weight: "0.90",
    explanation: "Änderung des Bewegungstrends.",
    whyChosen: "Unterscheidet konstante Bewegung von beschleunigter oder dynamischer Entwicklung.",
    risk: "Bei kurzen oder verrauschten Zeitreihen instabil.",
    recommendation: "Mit Residualstreuung, Sprungdetektion und Missingness absichern.",
  },
  {
    name: "coherence_penalty",
    weight: "0.80",
    explanation: "1 - Kohärenz; niedrige Kohärenz erhöht die Distanz im Feature-Raum.",
    whyChosen: "Messpunkte mit schlechter Qualität sollen weniger stark stabile Cluster bilden.",
    risk: "Messqualität und physikalische Objektstruktur können vermischt werden.",
    recommendation: "Vergleichen: Kohärenz als Clustering-Feature vs. nur als nachgelagerte Confidence.",
  },
];

export const futureFeatureGroups: FutureFeatureGroup[] = [
  {
    title: "Zeitreihenfeatures",
    explanation:
      "Die volle Zeitreihe enthält mehr Information als nur Velocity und Acceleration. Ähnliche mittlere Bewegung kann trotzdem unterschiedliche Bewegungsformen verdecken.",
    examples: [
      "Residualstreuung um den Trend",
      "Sprungstärke und Sprungzeitpunkt",
      "saisonale Amplitude",
      "Monotonie der Bewegung",
      "Missingness-Muster",
      "Zeitreihenähnlichkeit zu anderen Punkten im Gebäude",
    ],
    howToGetIt:
      "Aus den vorhandenen displacement_values pro Punkt berechnen; zunächst interpretierbar, später optional PCA oder Embeddings.",
  },
  {
    title: "Gebäude- und Dachkontext",
    explanation:
      "Diese Features helfen zu unterscheiden, ob ein Punkt objektlogisch zum gleichen Dachbereich gehört oder eher eine unsichere Rand-/Nachbarstruktur ist.",
    examples: [
      "Abstand zur Gebäudekante",
      "innerhalb Polygon vs. Buffer-Zuordnung",
      "Abstand zu Nachbargebäuden",
      "Gebäudegröße und Dachausdehnung",
      "Dachsegment oder Dachfläche, falls verfügbar",
      "relative Höhe zum lokalen Dachniveau",
    ],
    howToGetIt:
      "Kurzfristig aus Gebäudepolygonen und vorhandenen Höhen ableiten; langfristig Orthofoto, LiDAR/DSM oder Dachflächenmodelle ergänzen.",
  },
  {
    title: "InSAR-spezifische Risiken",
    explanation:
      "Ein InSAR-Punkt ist nicht automatisch ein sauberer Punkt auf einem Dach. Er kann PS, DS oder ein gemischter Reflektor sein.",
    examples: [
      "ASC/DSC-Konsistenz",
      "LOS-Richtung und Nachbargebäude in Blickrichtung",
      "Layover-Risiko",
      "Foreshortening-/Shadowing-Risiko",
      "Amplitudenstabilität",
      "Mixed-Reflector-Risiko",
    ],
    howToGetIt:
      "Aus Track-Geometrie, Gebäudeumgebung, Höhenmodell, Amplitudenzeitreihe und Cross-Track-Vergleich ableiten.",
  },
];

export const algorithmCandidates: AlgorithmCandidate[] = [
  {
    name: "HDBSCAN",
    usefulFor: "Lokales Clustering ab etwa sechs Punkten, wenn Noise und variable Clusterzahl wichtig sind.",
    strength: "Keine feste Clusterzahl, Noise explizit, variable Dichten möglich.",
    weakness: "Bei 6 bis 15 Punkten fragil; Dichte ist dann nur begrenzt belastbar.",
    recommendation: "Beibehalten, aber mit Confidence, Stabilität und Feature-Ablation absichern.",
  },
  {
    name: "OPTICS",
    usefulFor: "Vergleich zu HDBSCAN und Analyse von Reachability-Strukturen.",
    strength: "Ebenfalls dichtebasiert, hilfreich für Sensitivitätsvergleich.",
    weakness: "Bei Small-N nicht automatisch stabiler als HDBSCAN.",
    recommendation: "Als Benchmark verwenden, nicht als garantierten Ersatz.",
  },
  {
    name: "Agglomerative Clustering",
    usefulFor: "Sehr kleine Gruppen, weil die Hierarchie gut erklärbar ist.",
    strength: "Funktioniert auch bei wenigen Punkten und zeigt, welche Punkte zuerst zusammengehören.",
    weakness: "Noise muss zusätzlich über Distanz, Einzelgruppen oder Medoid-Abweichung definiert werden.",
    recommendation: "Als Small-N-Vergleich testen, mit automatischem Dendrogramm-Cut.",
  },
  {
    name: "Thresholded Graph / Connected Components",
    usefulFor: "Small-N und Gebäudeobjekte, wenn fachliche Ähnlichkeit wichtiger ist als Dichte.",
    strength: "Sehr erklärbar; weit entfernte Dachpunkte können verbunden bleiben, wenn Bewegung/Zeitreihe ähnlich sind.",
    weakness: "Die Ähnlichkeitsformel und Schwellen müssen kalibriert werden.",
    recommendation: "Wichtigster nächster Kandidat für wenige Punkte.",
  },
  {
    name: "Leiden oder Louvain",
    usefulFor: "Größere Gebäudegraphen mit mehreren möglichen Teilstrukturen.",
    strength: "Findet Communities in gewichteten Graphen ohne feste Clusterzahl im klassischen Sinn.",
    weakness: "Für fünf Punkte oft überdimensioniert; Resolution-Parameter nötig.",
    recommendation: "Nach einfachem Graph-Ansatz testen.",
  },
  {
    name: "Graph Neural Networks",
    usefulFor: "Später, wenn viele gelabelte Gebäudegraphen vorhanden sind.",
    strength: "Kann komplexe Beziehungen lernen.",
    weakness: "Nicht sinnvoll für einzelne Gebäude mit wenigen Punkten; braucht viele Trainingsbeispiele und Labels.",
    recommendation: "Aktuell nicht priorisieren.",
  },
];
