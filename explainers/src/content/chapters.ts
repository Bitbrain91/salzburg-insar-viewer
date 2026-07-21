/**
 * Kapitelregister der Pipeline-Reise. Die IDs sind zugleich die
 * Hash-Anker (#zuordnung, #cluster, ...) für Deep-Links und Scroll-Spy.
 */
export type ChapterId =
  | "einfuehrung"
  | "zuordnung"
  | "qualitaet"
  | "trennung"
  | "cluster"
  | "bewertung"
  | "bewegung"
  | "differenzial"
  | "zuverlaessigkeit"
  | "befund";

/**
 * Generisch über die Kapitel-ID, damit weitere Explainer (z. B. die
 * Silver-Ground-Truth-Reise in `silverChapters.ts`) dasselbe Meta-Format und
 * dieselben Layout-/Nav-Komponenten verwenden können.
 */
export type ChapterMeta<Id extends string = string> = {
  id: Id;
  nummer: number;
  eyebrow: string;
  titel: string;
  kurz: string;
  lead: string;
};

export const chapters: ChapterMeta<ChapterId>[] = [
  {
    id: "einfuehrung",
    nummer: 0,
    eyebrow: "Start",
    titel: "Was diese Seite erklärt — und was InSAR kann (und nicht kann)",
    kurz: "Einführung",
    lead:
      "Der Viewer bewertet Gebäude auf Basis von Radar-Messpunkten aus dem All. " +
      "Diese Seite zeigt Schritt für Schritt, wie aus tausenden Einzelpunkten ein " +
      "nachvollziehbarer Gebäudebefund wird — und wo die Grenzen der Methode liegen.",
  },
  {
    id: "zuordnung",
    nummer: 1,
    eyebrow: "Station 1",
    titel: "Welche Punkte gehören zu diesem Gebäude?",
    kurz: "Zuordnung",
    lead:
      "Radar-Messpunkte landen wegen der Schrägsicht des Satelliten selten exakt auf dem Dach. " +
      "Die Pipeline sucht deshalb je Gebäude und Blickrichtung in einer physikalisch begründeten " +
      "Kandidatenfläche — nicht einfach im Umkreis.",
  },
  {
    id: "qualitaet",
    nummer: 2,
    eyebrow: "Station 2",
    titel: "Welchen Punkten kann man trauen?",
    kurz: "Qualität",
    lead:
      "Bevor irgendetwas bewertet wird, müssen Punkte harte Grundregeln bestehen: genug Messungen, " +
      "stabile Zeitreihe, ausreichende Signalqualität. Aussortierte Punkte verschwinden nicht — " +
      "sie bleiben mit Begründung sichtbar.",
  },
  {
    id: "trennung",
    nummer: 3,
    eyebrow: "Station 3",
    titel: "Hauptdach, Anbau — oder gar nicht dieses Gebäude?",
    kurz: "Trennung",
    lead:
      "Nicht jeder Punkt nahe einem Gebäude gehört auch dazu. Drei physikalische Prüfungen erkennen " +
      "Punkte, die zu einem Anbau gehören oder von einem Fremdobjekt stammen — damit sie das " +
      "Gebäudeurteil nicht verfälschen.",
  },
  {
    id: "cluster",
    nummer: 4,
    eyebrow: "Station 4",
    titel: "Welche Punkte bewegen sich gemeinsam?",
    kurz: "Cluster",
    lead:
      "Punkte, die sich räumlich und im Bewegungsverhalten ähneln, werden zu Gruppen (Clustern) " +
      "zusammengefasst. Je weniger Punkte vorhanden sind, desto vorsichtiger wird die Pipeline — " +
      "sie erfindet keine Gruppen.",
  },
  {
    id: "bewertung",
    nummer: 5,
    eyebrow: "Station 5",
    titel: "Wie gut ist jeder Punkt, wie verlässlich jede Gruppe?",
    kurz: "Bewertung",
    lead:
      "Jeder Punkt bekommt einen Anomalie- und einen Qualitätswert, jede Gruppe eine Verlässlichkeit. " +
      "Daraus entstehen die Ampel-Labels im Viewer — und die Wahl des Hauptclusters, der das Gebäude " +
      "repräsentiert.",
  },
  {
    id: "bewegung",
    nummer: 6,
    eyebrow: "Station 6",
    titel: "Wie bewegt sich das Gebäude — und sagen beide Blickrichtungen dasselbe?",
    kurz: "Bewegung",
    lead:
      "Die robuste Bewegung des Hauptclusters wird in eine vertikale Näherung umgerechnet und " +
      "zwischen aufsteigender und absteigender Satellitenbahn verglichen. Stimmen beide überein, " +
      "steigt das Vertrauen.",
  },
  {
    id: "differenzial",
    nummer: 7,
    eyebrow: "Station 7",
    titel: "Bewegt sich ein Gebäudeteil anders als der Rest?",
    kurz: "Differenzial",
    lead:
      "Wenn eine zweite Punktgruppe am selben Gebäude eine deutlich andere Bewegung zeigt, prüft die " +
      "Pipeline in vier Stufen, wie belastbar dieser Unterschied ist: keine, Kandidat, signifikant, " +
      "bestätigt.",
  },
  {
    id: "zuverlaessigkeit",
    nummer: 8,
    eyebrow: "Station 8",
    titel: "Wie sicher ist der Gesamtbefund?",
    kurz: "Zuverlässigkeit",
    lead:
      "Am Ende fasst ein Zuverlässigkeitswert zusammen, wie gut Stützung, Signal, Zuordnung und " +
      "Track-Übereinstimmung sind — abzüglich klar benannter Schwächen. Jeder Abzug ist im Viewer " +
      "nachlesbar.",
  },
  {
    id: "befund",
    nummer: 9,
    eyebrow: "Ziel",
    titel: "Den Befund im Viewer richtig lesen",
    kurz: "Befund lesen",
    lead:
      "Alle Stationen zusammen ergeben den Befund, den der Viewer anzeigt. Hier steht, wie die " +
      "einzelnen Elemente zu verstehen sind — und welche Aussagen die Plattform bewusst nicht trifft.",
  },
];

export const chapterById: Record<ChapterId, ChapterMeta<ChapterId>> = Object.fromEntries(
  chapters.map((chapter) => [chapter.id, chapter])
) as Record<ChapterId, ChapterMeta<ChapterId>>;
